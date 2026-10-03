# 快递追踪

极简快递追踪工具：粘贴一次，自动追踪，有更新才提醒。
纯 HTML + CSS + JS，无框架、无登录、无广告，数据只存在浏览器 localStorage。

## 使用

双击 `index.html` 在浏览器打开即可（无需服务器）。

1. 把快递单号粘进输入框（多个单号一行一个），点「开始追踪」
2. 之后每 2 小时自动查一次（间隔在 `config.js` 里改 `refreshMinutes`）
3. 只有出现新的物流节点才弹浏览器通知；已签收自动归入「已签收」并停止刷新

## 配置（一次性，共 3 个值）

用的是 **快递100 官方「实时快递查询」接口**，个人开发者免费 **100 次/天**。
官方接口不允许浏览器直接跨域调用，所以需要一个免费的 Cloudflare Worker 做转发
（纯转发、不存数据，自己部署自己用）。

### 第 1 步：申请快递100 免费 Key（约 3 分钟）

1. 打开 https://api.kuaidi100.com ，注册账号
2. 按提示完成认证（个人开发者即可）
3. 进入管理后台的「实时快递查询」接口页，领取免费额度（100 次/天）
4. 在后台找到你的两项信息：
   - **customer**（公司编号 / 客户编号）
   - **key**（授权码）

### 第 2 步：部署免费代理（约 5 分钟，二选一）

**方式 A：和页面一起部署到 Cloudflare Pages（推荐，一次部署全搞定）**

1. 把整个 `kuaidi-tracker` 文件夹（含 `functions/proxy.js`）上传到 Cloudflare Pages
2. 部署完成后，代理地址就是 `https://你的项目.pages.dev/proxy`
3. 页面地址和代理地址同源，手机打开同一个网址即可使用

**方式 B：单独部署 Cloudflare Worker**

1. 打开 https://www.cloudflare.com 注册免费账号
2. 左侧菜单 **Workers 和 Pages** → **Create** → **Create Worker**，名字随意 → **Deploy**
3. 点 **Edit code**，把项目里 `worker.js` 的全部内容粘贴进去（替换默认代码）→ **Deploy**
4. 复制你的 Worker 地址，形如 `https://xxx.你的账号.workers.dev`

> 注意：Pages 项目根地址（如 `https://xxx.pages.dev/`）只是静态网页，**不能**直接当 proxyUrl 用，
> 必须带 `/proxy` 后缀（方式 A）或使用 Worker 地址（方式 B）。

> Worker 免费额度 10 万次请求/天，远够用。它只把请求转发给快递100，不留任何数据。

### 第 3 步：填配置

打开 `config.js`，填入三个值：

```js
customer: '你的customer',
key: '你的key',
proxyUrl: 'https://xxx.你的账号.workers.dev',
```

完成。刷新间隔默认 2 小时；100 次/天的额度大约够 8 个单号同时追踪，单号更多可把 `refreshMinutes` 调大。

> 安全提示：个人免费 key 额度很小，放在本地 config.js 里风险可以忽略；
> 如果要把页面挂到公网给别人用，建议把 key 移到 Worker 代码里，页面只传单号。

## 在手机上用

`file://` 在手机浏览器里打不开本地文件，需要一个网址。最简单的方式：

- 把本文件夹传到任意静态托管（GitHub Pages、Gitee Pages、Vercel、对象存储静态网站均可），得到一个 https 网址
- 手机浏览器打开该网址：
  - **安卓 Chrome**：菜单 →「添加到主屏幕」
  - **iPhone Safari**：分享按钮 →「添加到主屏幕」
- 之后从桌面图标打开，体验接近原生 App

页面已内置移动端适配和 Web App 元信息，无需额外配置。

## 想让它在后台也能提醒

当前实现靠浏览器页面里的定时器，**页面关了就停了**。要后台提醒，按效果从弱到强：

1. **最省事**：让页面保持打开（电脑上锁屏没关系；手机上切后台一般也能跑一阵，但系统随时可能冻结）
2. **PWA + Service Worker**：把页面挂到 https 后，注册一个 Service Worker，
   手机浏览器即使没打开页面，也能通过 Periodic Background Sync（安卓 Chrome）定时查并弹通知；
   iOS 16.4+ 的 PWA 支持 Web Push，但需要服务器配合推送
3. **完整方案**：一台常开机的设备（电脑/树莓派/NAS）跑个小脚本定时查 API，
   用 Bark（iOS）或 Server酱/Telegram Bot 推送，彻底不依赖浏览器

## 异常提示说明

API 额度用完、网络错误、单号识别失败都会在页面顶部给出一句话提示，
网络错误会自动等下一轮重试，不会反复打扰。
