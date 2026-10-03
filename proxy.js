/* Cloudflare Pages Function：快递100 查询接口转发代理
 * 随 Pages 项目一起部署后，地址为 https://你的项目.pages.dev/proxy
 * 只做转发，不记录任何数据。
 */
export async function onRequestPost(context) {
  const upstream = await fetch('https://poll.kuaidi100.com/poll/query.do', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: await context.request.text()
  });
  return new Response(await upstream.text(), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
