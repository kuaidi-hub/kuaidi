/* ============================================================
 * 接口配置 —— 所有需要替换的东西都在这一个文件里
 *
 * 服务商：快递100 官方「实时快递查询」接口
 *   个人开发者免费 100 次/天，足够日常追踪使用。
 *   1) 到 https://api.kuaidi100.com 注册并认证，拿到 customer 和 key
 *   2) 按 README.md 部署一个免费的 Cloudflare Worker 代理（5 分钟）
 *      （官方接口不允许浏览器直接跨域调用，代理只做转发，不存数据）
 * ============================================================ */
const CONFIG = {
  kuaidi100: {
    customer: 'CE45566CAF131B0ED207D9D1FBAD88CB',      // 快递100 后台的「公司编号/客户编号」
    key: 'tCYAlOXg1476',                // 快递100 后台的「授权码」
    proxyUrl: 'https://k100-proxy.379408131.workers.dev/',     // 形如 https://k100.你的名字.workers.dev
    autoUrl: 'https://www.kuaidi100.com/autonumber/autoComNum'  // 单号识别（免费，无需改）
  },

  refreshMinutes: 120,               // 自动刷新间隔（分钟）
  storageKey: 'kuaidi_tracker_v1'    // localStorage 键名
};
