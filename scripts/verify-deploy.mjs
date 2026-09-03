// scripts/verify-deploy.mjs · 部署后一键验证（零依赖 · Node 原生）
// 用法：node scripts/verify-deploy.mjs [baseUrl]
//   baseUrl 默认 http://localhost:8787
// 验证项：首页 / 健康检查 / 统计 API / 搜索索引 / 静态资源

import http from 'node:http'

const BASE = process.argv[2] || 'http://localhost:8787'
const base = new URL(BASE)

function req(path, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(path, base)
    const opts = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 10000,
    }
    const req = http.request(opts, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf-8'),
        })
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    if (options.body) req.write(options.body)
    req.end()
  })
}

let pass = 0, fail = 0
function check(name, fn) {
  return fn()
    .then(() => { pass++; console.log('  ✅ ' + name) })
    .catch((e) => { fail++; console.error('  ❌ ' + name + ': ' + e.message) })
}

async function main() {
  console.log('🔍 部署验证：' + BASE)
  console.log('')

  // 1. 首页
  await check('首页 200 + HTML', async () => {
    const r = await req('/')
    if (r.status !== 200) throw new Error('status ' + r.status)
    if (!r.body.includes('<html')) throw new Error('非 HTML 响应')
    if (!r.body.includes('白驹')) throw new Error('页面内容异常')
  })

  // 2. 健康检查
  await check('healthz 健康检查', async () => {
    const r = await req('/healthz')
    if (r.status !== 200) throw new Error('status ' + r.status)
    const j = JSON.parse(r.body)
    if (j.status !== 'ok') throw new Error('status != ok')
  })

  // 3. 统计 API（A6）
  await check('统计 API · summary', async () => {
    const r = await req('/api/stats/summary')
    if (r.status !== 200) throw new Error('status ' + r.status)
    const j = JSON.parse(r.body)
    if (!j.ok) throw new Error('ok != true')
  })

  await check('统计 API · hot 热榜', async () => {
    const r = await req('/api/stats/hot?n=5')
    if (r.status !== 200) throw new Error('status ' + r.status)
    const j = JSON.parse(r.body)
    if (!j.ok || !Array.isArray(j.data)) throw new Error('返回格式错误')
  })

  await check('统计 API · view 上报', async () => {
    const r = await req('/api/stats/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/verify-deploy', title: '部署验证页' }),
    })
    if (r.status !== 200) throw new Error('status ' + r.status)
    const j = JSON.parse(r.body)
    if (!j.ok) throw new Error('ok != true')
  })

  // 4. 静态资源
  await check('静态资源 · theme-cloud.css', async () => {
    const r = await req('/theme-cloud.css')
    if (r.status !== 200) throw new Error('status ' + r.status)
    if (!r.headers['content-type'].includes('text/css')) throw new Error('Content-Type 错误')
  })

  await check('静态资源 · stats.js', async () => {
    const r = await req('/stats.js')
    if (r.status !== 200) throw new Error('status ' + r.status)
    if (!r.headers['content-type'].includes('javascript')) throw new Error('Content-Type 错误')
  })

  // 5. 搜索索引
  await check('搜索索引 · search-index.js', async () => {
    const r = await req('/data/search-index.js')
    if (r.status !== 200) throw new Error('status ' + r.status)
    if (!r.body.includes('SEARCH_INDEX')) throw new Error('索引数据缺失')
  })

  // 6. CORS 头
  await check('CORS · 统计 API 有 Access-Control-Allow-Origin', async () => {
    const r = await req('/api/stats/summary')
    if (!r.headers['access-control-allow-origin']) throw new Error('缺少 CORS 头')
  })

  // 7. 404
  await check('404 页面', async () => {
    const r = await req('/this-page-does-not-exist-12345')
    if (r.status !== 404) throw new Error('status ' + r.status + '（期望 404）')
  })

  console.log('')
  console.log('📊 结果：' + pass + ' 通过 / ' + fail + ' 失败')
  if (fail > 0) {
    console.error('❌ 部署验证未通过，请检查上述失败项')
    process.exit(1)
  } else {
    console.log('✅ 全部通过，部署正常！')
  }
}

main().catch((e) => {
  console.error('💥 验证脚本异常：' + e.message)
  process.exit(1)
})
