// AI 创作纪元 · 本地静态服务 + AI 代理（含 SSE 流式透传）
// 运行：node server.mjs → http://localhost:8787
// /api/proxy 支持 POST（聊天/生图/生视频）与 GET（任务轮询），可透传 SSE 流式输出
import http from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { extname, join, normalize, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// 加载 .env（开发期用，可选）。生产部署直接在环境设环境变量即可。
// .env 已加入 .gitignore，不入库；切勿把含真实密钥的 .env 提交到仓库。
function loadEnv() {
  try {
    const p = fileURLToPath(new URL('./.env', import.meta.url))
    if (!existsSync(p)) return
    const txt = readFileSync(p, 'utf-8')
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
      if (!m) continue
      const k = m[1], v = m[2].replace(/^["']|["']$/g, '')
      if (!(k in process.env)) process.env[k] = v
    }
  } catch (e) { /* .env 可选，忽略 */ }
}
loadEnv()

const PORT = process.env.PORT || 8787
// 密钥仅来自环境变量 / .env（服务端持有，绝不下发前端）：
//   ZHIPU_API_KEY     -> 智谱免费模型（glm-4.7-flash，最优先，0 成本）
//   DEEPSEEK_API_KEY -> 白驹对话 / 代理 deepseek
//   ARK_API_KEY      -> 代理方舟（生图 / 生视频）
// 本地开发：复制 .env.example 为 .env 填入；生产：在部署环境设真实环境变量。
const ZHIPU_KEY = process.env.ZHIPU_API_KEY || ''
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || ''
const ARK_KEY = process.env.ARK_API_KEY || ''

const ALLOWED_UPSTREAMS = [
  'api.deepseek.com',
  'open.bigmodel.cn',
  'ark.cn-beijing.volces.com',
  'ark.cn-south-1.volces.com',
  'ark.cn-north-1.volces.com',
  'ark.ap-southeast-1.volces.com',
  'api.xiaomimimo.com',
  'token-plan-cn.xiaomimimo.com',
  'localhost',
  '127.0.0.1',
]

// ==================== 轻量访问统计（A6） ====================
// 零依赖 · 内存聚合 + 定时落盘 · 隐私友好（不存 IP / 完整 UA）
const STATS_FILE = join(fileURLToPath(new URL('.', import.meta.url)), 'data', 'server-stats.json')
const STATS_SAVE_INTERVAL = 60_000 // 每 60 秒落盘一次
const STATS_MAX_DAYS = 30 // 最多保留 30 天明细
const RATE_LIMIT_WINDOW = 1000 // 1 秒窗口
const RATE_LIMIT_MAX = 5 // 单 IP 每秒最多 5 次统计上报

let stats = {
  totalViews: 0,
  byPath: {}, // { "/path": { count, title, lastVisit } }
  byDay: {},  // { "YYYY-MM-DD": { "/path": count } }
  referrers: {}, // { "domain": count }
  updatedAt: 0,
}

// 启动时加载历史数据
function loadStats() {
  try {
    if (existsSync(STATS_FILE)) {
      const raw = readFileSync(STATS_FILE, 'utf-8')
      const loaded = JSON.parse(raw)
      stats = { ...stats, ...loaded }
      // 清理超期日数据
      const days = Object.keys(stats.byDay || {}).sort()
      if (days.length > STATS_MAX_DAYS) {
        const toRemove = days.slice(0, days.length - STATS_MAX_DAYS)
        for (const d of toRemove) delete stats.byDay[d]
      }
      console.log('  统计数据: ' + stats.totalViews + ' 次访问 · ' + Object.keys(stats.byPath).length + ' 页')
    }
  } catch (e) {
    console.warn('  统计加载失败（将从零开始）: ' + e.message)
  }
}

// 定时落盘
function saveStats() {
  try {
    stats.updatedAt = Date.now()
    mkdirSync(dirname(STATS_FILE), { recursive: true })
    writeFile(STATS_FILE, JSON.stringify(stats, null, 0), 'utf-8').catch(() => {})
  } catch (e) { /* 落盘失败不影响服务 */ }
}

// 限流：ip -> { count, resetAt }
const rateLimitMap = new Map()
function checkRateLimit(ip) {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (entry && entry.resetAt > now) {
    if (entry.count >= RATE_LIMIT_MAX) return false
    entry.count++
  } else {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
  }
  return true
}

// 获取今天日期键
function todayKey() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

// 归一化路径（去 query/hash，去首尾斜杠统一）
function normPath(p) {
  try {
    const u = new URL(p, 'http://localhost')
    let path = u.pathname
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)
    return path
  } catch (e) { return String(p).split(/[?#]/)[0] }
}

// 提取 referrer 域名
function refDomain(ref) {
  if (!ref) return '(direct)'
  try {
    const u = new URL(ref)
    return u.hostname
  } catch (e) { return '(unknown)' }
}

// 记录一次访问
function recordView(path, title, referrer) {
  const p = normPath(path)
  const day = todayKey()

  stats.totalViews++
  if (!stats.byPath[p]) stats.byPath[p] = { count: 0, title: '' }
  stats.byPath[p].count++
  if (title && !stats.byPath[p].title) stats.byPath[p].title = String(title).slice(0, 200)
  stats.byPath[p].lastVisit = Date.now()

  if (!stats.byDay[day]) stats.byDay[day] = {}
  stats.byDay[day][p] = (stats.byDay[day][p] || 0) + 1

  const rd = refDomain(referrer)
  stats.referrers[rd] = (stats.referrers[rd] || 0) + 1
}

// 获取热榜
function getHot(n) {
  const list = Object.keys(stats.byPath)
    .filter(p => p !== '/' && stats.byPath[p].count > 0)
    .map(p => ({ path: p, count: stats.byPath[p].count, title: stats.byPath[p].title || p }))
  list.sort((a, b) => b.count - a.count)
  return list.slice(0, n || 10)
}

// 获取统计摘要
function getStatsSummary() {
  const pages = Object.keys(stats.byPath).length
  const day = todayKey()
  const todayViews = stats.byDay[day]
    ? Object.values(stats.byDay[day]).reduce((s, v) => s + v, 0)
    : 0
  const topRefs = Object.entries(stats.referrers)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([domain, count]) => ({ domain, count }))
  return {
    totalViews: stats.totalViews,
    totalPages: pages,
    todayViews,
    updatedAt: stats.updatedAt,
    topReferrers: topRefs,
  }
}

// 启动时加载 + 定时落盘
loadStats()
setInterval(saveStats, STATS_SAVE_INTERVAL)

// 优雅关闭时落盘
process.on('SIGTERM', () => { saveStats(); process.exit(0) })
process.on('SIGINT', () => { saveStats(); process.exit(0) })
// ==================== / 轻量访问统计 ====================

const ROOT = fileURLToPath(new URL('.', import.meta.url))
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')

  // 通用 AI 代理：聊天 / 生图 / 生视频 / 任务轮询，SSE 流式透传
  // POST 请求体：{ url, body, auth }；GET 请求：?url=<编码目标>，密钥在 x-api-key 头
  if (url.pathname === '/api/proxy' && (req.method === 'POST' || req.method === 'GET')) {
    try {
      let upUrl = ''
      let upBody = {}
      let auth = ''
      if (req.method === 'POST') {
        const chunks = []
        for await (const c of req) chunks.push(c)
        const reqBody = JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}')
        upUrl = String(reqBody.url || '')
        upBody = reqBody.body || {}
        auth = String(reqBody.auth || '')
      } else {
        upUrl = decodeURIComponent(String(url.searchParams.get('url') || ''))
      }
      if (!ALLOWED_UPSTREAMS.some((h) => upUrl.includes(h))) {
        res.writeHead(403, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
        res.end(JSON.stringify({ error: { message: '不允许代理该地址' } }))
        return
      }
      const headers = { 'Content-Type': 'application/json' }
      // 上游密钥按域名匹配：智谱 → ZHIPU_API_KEY；方舟 → ARK_API_KEY；其余 → DEEPSEEK_API_KEY
      let host = ''
      try { host = new URL(upUrl).host } catch (e) {}
      const upstreamKey = host.includes('volces.com') ? ARK_KEY : host.includes('bigmodel.cn') ? ZHIPU_KEY : DEEPSEEK_KEY
      const xKey = req.headers['x-api-key']
      const key = (auth || (xKey && String(xKey).trim()) || upstreamKey || '').trim()
      if (key) {
        headers['Authorization'] = 'Bearer ' + key
        headers['api-key'] = key
      }
      const up = await fetch(upUrl, {
        method: req.method,
        headers,
        body: req.method === 'POST' ? JSON.stringify(upBody) : undefined,
      })
      res.writeHead(up.status, {
        'Content-Type': up.headers.get('content-type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      })
      if (up.body) {
        const reader = up.body.getReader()
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          res.write(Buffer.from(value))
        }
      }
      res.end()
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
      res.end(JSON.stringify({ error: { message: String(e && e.message || e) } }))
    }
    return
  }

  // 服务端 AI 对话代理（SSE 流式）：密钥来自环境变量 DEEPSEEK_API_KEY，
  // 绝不下发到前端。请求体：{ provider, model, messages, key? }
  // key 可选：本地用户若已在页面填过自己的 Key，可透传覆盖服务端 Key。
  if (url.pathname === '/api/chat' && req.method === 'POST') {
    try {
      const chunks = []
      for await (const c of req) chunks.push(c)
      const body = JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}')
      const key = String(body.key || DEEPSEEK_KEY || '').trim()
      if (!key) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
        res.end(JSON.stringify({ error: { message: '未配置 API Key：本地请运行 DEEPSEEK_API_KEY=sk-xxx node server.mjs；或在页面设置中填入你的 Key。' } }))
        return
      }
      const UP = {
        deepseek: { url: 'https://api.deepseek.com/chat/completions', model: 'deepseek-chat' },
        ark: { url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', model: 'doubao-seed-2-1-pro-260628' },
      }
      const prov = UP[body.provider] ? body.provider : 'deepseek'
      const upUrl = UP[prov].url
      const upBody = {
        model: body.model || UP[prov].model,
        messages: Array.isArray(body.messages) ? body.messages : [],
        stream: true,
      }
      const up = await fetch(upUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key, 'api-key': key },
        body: JSON.stringify(upBody),
      })
      res.writeHead(up.status, {
        'Content-Type': up.headers.get('content-type') || 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      })
      if (up.body) {
        const reader = up.body.getReader()
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          res.write(Buffer.from(value))
        }
      }
      res.end()
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
      res.end(JSON.stringify({ error: { message: String(e && e.message || e) } }))
    }
    return
  }

  // ---- 访问统计 API（A6） ----
  // POST /api/stats/view: 上报一次页面访问
  if (url.pathname === '/api/stats/view' && req.method === 'POST') {
    try {
      // 获取客户端 IP（兼容反代 X-Forwarded-For）
      const xff = req.headers['x-forwarded-for']
      const ip = xff ? String(xff).split(',')[0].trim() : (req.socket.remoteAddress || 'unknown')
      if (!checkRateLimit(ip)) {
        res.writeHead(429, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
        res.end(JSON.stringify({ error: 'Too Many Requests' }))
        return
      }
      const chunks = []
      for await (const c of req) chunks.push(c)
      const body = JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}')
      const path = String(body.path || '/').slice(0, 500)
      const title = String(body.title || '').slice(0, 200)
      const referrer = String(req.headers.referer || body.referrer || '').slice(0, 500)
      recordView(path, title, referrer)
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
      res.end(JSON.stringify({ ok: true }))
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
      res.end(JSON.stringify({ error: String(e && e.message || e) }))
    }
    return
  }

  // GET /api/stats/hot?n=5: 热榜 Top N
  if (url.pathname === '/api/stats/hot' && req.method === 'GET') {
    const n = Math.min(50, Math.max(1, parseInt(url.searchParams.get('n') || '10', 10)))
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=60' })
    res.end(JSON.stringify({ ok: true, data: getHot(n) }))
    return
  }

  // GET /api/stats/summary: 统计摘要
  if (url.pathname === '/api/stats/summary' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=60' })
    res.end(JSON.stringify({ ok: true, data: getStatsSummary() }))
    return
  }

  // GET /api/stats/pages: 全量页面统计（按访问量排序，前 100）
  if (url.pathname === '/api/stats/pages' && req.method === 'GET') {
    const list = Object.keys(stats.byPath)
      .map(p => ({ path: p, count: stats.byPath[p].count, title: stats.byPath[p].title || p, lastVisit: stats.byPath[p].lastVisit }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 100)
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=60' })
    res.end(JSON.stringify({ ok: true, data: list, total: stats.totalViews }))
    return
  }

  // 健康检查（云平台探活 / 负载均衡）
  if (url.pathname === '/healthz' || url.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
    res.end(JSON.stringify({ status: 'ok', name: 'ai-chuangzuo-jiyuan', keys: { deepseek: !!DEEPSEEK_KEY, ark: !!ARK_KEY }, ts: Date.now(), stats: { totalViews: stats.totalViews, totalPages: Object.keys(stats.byPath).length } }))
    return
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    })
    res.end()
    return
  }

  // 静态文件
  let p = url.pathname === '/' ? '/index.html' : url.pathname
  try { p = decodeURIComponent(p) } catch (e) {}
  p = normalize(p).replace(/^(\.\.[/\\])+/, '')
  const file = join(ROOT, p)
  try {
    const data = await readFile(file)
    const headers = { 'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream' }
    // HTML / JS / CSS 不缓存：保证页面与脚本改动即时生效（避免旧版 JS 缓存导致功能/安全修复不生效）。
    // 生产建议改成长缓存 + 文件名版本号（参考 ccowork.js?v=21 的做法）。
    const ext = extname(file).toLowerCase()
    if (ext === '.html' || ext === '.js' || ext === '.css' || ext === '.mjs') headers['Cache-Control'] = 'no-cache'
    res.writeHead(200, headers)
    res.end(data)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('404 Not Found')
  }
})

server.listen(PORT, () => {
  console.log('AI 创作纪元已启动：http://localhost:' + PORT)
  console.log('  DeepSeek Key: ' + (DEEPSEEK_KEY ? '已配置 ✅' : '缺失 ⚠️（白驹对话不可用，设置 DEEPSEEK_API_KEY 或页面填 Key）'))
  console.log('  ARK Key:      ' + (ARK_KEY ? '已配置 ✅' : '缺失 ⚠️（生图/生视频不可用，设置 ARK_API_KEY）'))
  console.log('  服务端统计:    ✅ 已启用（A6 · data/server-stats.json）')
})
