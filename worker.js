/* Cloudflare Worker：快递100 查询接口转发代理
 * 部署方法见 README.md。本文件不会被页面直接引用，内容粘贴到 Cloudflare 即可。
 * 只做转发 + 加跨域头，不记录任何数据。
 */
export default {
  async fetch(request) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    if (request.method !== 'POST') {
      return new Response('ok', { headers: corsHeaders });
    }
    const upstream = await fetch('https://poll.kuaidi100.com/poll/query.do', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: await request.text()
    });
    return new Response(await upstream.text(), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
};
