/* ================= 工具 ================= */

/* JSONP 请求（单号识别接口用；file:// 直接打开也能跨域） */
function jsonp(url, params, timeout = 12000) {
  return new Promise((resolve, reject) => {
    const cb = '__jp' + Math.random().toString(36).slice(2);
    const script = document.createElement('script');
    const timer = setTimeout(() => { cleanup(); reject({ type: 'network' }); }, timeout);
    function cleanup() { clearTimeout(timer); delete window[cb]; script.remove(); }
    window[cb] = data => { cleanup(); resolve(data); };
    params.callback = cb;
    script.src = url + '?' + Object.entries(params)
      .map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');
    script.onerror = () => { cleanup(); reject({ type: 'network' }); };
    document.head.appendChild(script);
  });
}

/* ================= 快递100 =================
 * 流程：autoComNum（免费 JSONP）识别快递公司
 *      → 官方实时查询接口（经 Cloudflare Worker 代理转发）查轨迹
 */
async function query(number) {
  const { customer, key, proxyUrl, autoUrl } = CONFIG.kuaidi100;
  if (!customer || customer.includes('填') || !key || key.includes('填')) {
    throw { type: 'config', msg: '请先在 config.js 里填入快递100的 customer 和 key' };
  }
  if (!proxyUrl || proxyUrl.includes('填')) {
    throw { type: 'config', msg: '请先在 config.js 里填入你的 Worker 代理地址（见 README）' };
  }

  /* 1. 自动识别快递公司 */
  const auto = await jsonp(autoUrl, { text: number });
  const first = auto.auto && auto.auto[0];
  if (!first || !first.comCode) {
    throw { type: 'unknown', msg: `认不出单号 ${number} 是哪家快递，请检查后重试` };
  }

  /* 2. 查物流轨迹（sign = MD5(param + key + customer) 大写） */
  const param = JSON.stringify({ com: first.comCode, num: number });
  const sign = md5(param + key + customer).toUpperCase();
  const body = 'customer=' + encodeURIComponent(customer) +
               '&sign=' + sign +
               '&param=' + encodeURIComponent(param);

  let res;
  try {
    const resp = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    if (!resp.ok) {
      throw { type: 'api', msg: `代理地址没部署对（返回 ${resp.status}），请检查 config.js 里的 proxyUrl` };
    }
    res = await resp.json();
  } catch (e) {
    if (e && e.msg) throw e;
    throw { type: 'network' };
  }

  if (res.status !== '200') {
    throw { type: 'api', msg: humanK100Error(res, number) };
  }
  const list = (res.data || []).slice()
    .sort((a, b) => new Date(b.time) - new Date(a.time));
  if (!list.length) {
    throw { type: 'empty', msg: `单号 ${number} 还没有物流信息，可能刚发货` };
  }
  return {
    company: first.name || first.comCode,
    latest: { time: list[0].time, status: list[0].context },
    signed: res.state === '3' || res.ischeck === '1'
  };
}

function humanK100Error(res, number) {
  const msg = String(res.message || '');
  if (/量|上限|超出|quota/i.test(msg)) return '今日免费查询次数用完了，明天会自动恢复';
  if (/key|授权|签名|认证|customer/i.test(msg)) return 'API 配置好像不对，请检查 config.js 里的 customer 和 key';
  if (/不存在|无效|不正确|查不到/.test(msg)) return `单号 ${number} 查不到，请确认单号是否正确`;
  return `单号 ${number} 查询失败，请稍后重试`;
}

function humanError(e, number) {
  if (e && e.msg) return e.msg;
  if (e && e.type === 'network') return '网络不太顺，稍后会自动重试';
  return `单号 ${number} 查询失败，请稍后重试`;
}

/* ================= 数据 ================= */

let items = load();

function load() {
  try { return JSON.parse(localStorage.getItem(CONFIG.storageKey)) || []; }
  catch (e) { return []; }
}

function save() {
  localStorage.setItem(CONFIG.storageKey, JSON.stringify(items));
}

/* ================= 界面 ================= */

const $ = id => document.getElementById(id);

function fmtTime(t) {
  const d = new Date(t);
  if (isNaN(d)) return t || '';
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function showHint(text) {
  $('hint').textContent = text;
  $('hint').hidden = !text;
}

function render() {
  const active = items.filter(i => !i.signed);
  const signed = items.filter(i => i.signed);
  $('trackingEmpty').hidden = active.length > 0;
  $('signedEmpty').hidden = signed.length > 0;
  $('trackingList').innerHTML = '';
  $('signedList').innerHTML = '';
  active.forEach(i => $('trackingList').appendChild(renderItem(i)));
  signed.forEach(i => $('signedList').appendChild(renderItem(i)));
}

function renderItem(item) {
  const li = document.createElement('li');

  const row = document.createElement('div');
  row.className = 'row1';
  const left = document.createElement('span');
  const company = document.createElement('span');
  company.className = 'company';
  company.textContent = item.company;
  const no = document.createElement('span');
  no.className = 'no';
  no.textContent = '····' + item.number.slice(-4);
  left.append(company, no);
  const del = document.createElement('button');
  del.className = 'del';
  del.title = '删除';
  del.textContent = '×';
  del.onclick = () => {
    items = items.filter(i => i.number !== item.number);
    save(); render();
  };
  row.append(left, del);

  const status = document.createElement('div');
  status.className = 'status';
  status.textContent = item.latestText;

  const time = document.createElement('div');
  time.className = 'time';
  time.textContent = `${fmtTime(item.latestTime)} · 上次更新 ${fmtTime(item.updatedAt)}`;

  li.append(row, status, time);
  return li;
}

/* ================= 通知 ================= */

function askNotifyPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function notify(item) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  new Notification(`${item.company} ····${item.number.slice(-4)}`, {
    body: item.latestText
  });
}

/* ================= 核心逻辑 ================= */

async function addNumbers() {
  const raw = $('numbers').value;
  const nums = [...new Set(
    raw.split(/\s+/).map(s => s.trim()).filter(s => /^[0-9A-Za-z]{8,}$/.test(s))
  )].filter(n => !items.some(i => i.number === n));

  if (!nums.length) {
    showHint(raw.trim() ? '没有可添加的新单号（重复或格式不对）' : '请先粘贴快递单号');
    return;
  }

  askNotifyPermission();
  $('addBtn').disabled = true;
  showHint('识别查询中…');

  const errors = [];
  for (const n of nums) {
    try {
      const r = await query(n);
      items.unshift({
        number: n,
        company: r.company,
        latestTime: r.latest.time,
        latestText: r.latest.status,
        traceKey: r.latest.time + '|' + r.latest.status,
        updatedAt: new Date().toISOString(),
        signed: r.signed
      });
    } catch (e) {
      errors.push(humanError(e, n));
      if (e.type === 'config') break; // 配置没好就别继续浪费请求了
    }
  }

  save(); render();
  $('numbers').value = '';
  $('addBtn').disabled = false;
  showHint([...new Set(errors)].join('；'));
}

async function refreshAll() {
  if (!navigator.onLine) return;
  const active = items.filter(i => !i.signed);
  if (!active.length) return;

  let quotaGone = false;
  for (const item of active) {
    try {
      const r = await query(item.number);
      const key = r.latest.time + '|' + r.latest.status;
      const changed = key !== item.traceKey;
      item.company = r.company;
      item.latestTime = r.latest.time;
      item.latestText = r.latest.status;
      item.traceKey = key;
      item.updatedAt = new Date().toISOString();
      item.signed = r.signed;
      if (changed) notify(item);          /* 有更新才提醒 */
    } catch (e) {
      if (e.type === 'api' && /次数/.test(e.msg || '')) quotaGone = true;
      /* 网络错误静默跳过，等下一轮 */
    }
  }
  save(); render();
  if (quotaGone) showHint('今日免费查询次数用完了，明天会自动恢复');
}

/* ================= 启动 ================= */

$('addBtn').onclick = addNumbers;
render();
setTimeout(refreshAll, 3000);                          /* 打开页面后先刷一次 */
setInterval(refreshAll, CONFIG.refreshMinutes * 60000); /* 之后定时刷 */
