/* C5 端到端验证：学习数据备份与恢复（证书页导出 JSON / 导入合并 / 跨设备迁移）
 * 内置静态服务器 + Playwright：导出文件内容校验、导入恢复、合并语义、错误文件拒绝、零 JS 错误
 */
import { chromium } from 'playwright'
import http from 'http'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve('.')
const PORT = 8792
const BASE = 'http://127.0.0.1:' + PORT
const results = []
const ok = (name, pass, extra = '') => { results.push({ name, pass, extra }); console.log((pass ? '✓' : '✗') + ' ' + name + (extra ? ' — ' + extra : '')) }

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' }
const server = http.createServer((req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0])
    if (p === '/') p = '/index.html'
    let fp = path.normalize(path.join(ROOT, p))
    if (!fp.startsWith(ROOT)) { res.writeHead(403); res.end(); return }
    if (!fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end('not found'); return }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream' })
    fs.createReadStream(fp).pipe(res)
  } catch (e) { res.writeHead(500); res.end('err') }
})
await new Promise(r => server.listen(PORT, r))

const browser = await chromium.launch()
const page = await browser.newPage({ acceptDownloads: true })
const errors = []
page.on('pageerror', e => errors.push(String(e)))
const four04 = []
page.on('response', r => { if (r.status() === 404 && !/\/api\/stats\//.test(r.url())) four04.push(r.url()) })

const CERT_URL = BASE + '/website/ai-academy-cert.html'

/* 1. 页面加载：备份区块齐全 */
await page.goto(CERT_URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
const bkEls = await page.evaluate(() => ({
  sec: !!document.getElementById('backup'),
  exp: !!document.getElementById('bkExport'),
  imp: !!document.getElementById('bkImportBtn'),
  file: !!document.getElementById('bkFile'),
  meta: (document.getElementById('bkMeta').textContent || '').trim().length > 0
}))
ok('证书页加载且备份区块齐全（导出/导入/文件/统计）', bkEls.sec && bkEls.exp && bkEls.imp && bkEls.file && bkEls.meta, JSON.stringify(bkEls))

/* 2. 预置学习数据（2 证书 + 3 章节 + 1 lab + 2 测验成绩）后刷新 */
await page.evaluate(() => {
  localStorage.setItem('ccowork.certs', JSON.stringify({
    cert02: { name: '智能体工程师认证', date: '2026-09-01', score: 90 },
    cert03: { name: 'RAG 应用工程师认证', date: '2026-09-02', score: 85 }
  }))
  localStorage.setItem('ccowork.progress', JSON.stringify({
    chapters: {
      'chapter-01': { completedAt: 1756710000000 },
      'chapter-02': { completedAt: 1756713600000 },
      'chapter-17': { completedAt: 1756717200000 }
    },
    labs: { 'lab-pid': { title: 'PID 仿真', completedAt: 1756720000000 } },
    streak: 2, lastCheckIn: '2026-09-01', totalCompleted: 3, startedAt: '2026-08-30'
  }))
  localStorage.setItem('ccowork.quiz.scores', JSON.stringify({ domain1: { best: 90, times: 1, last: 1756710000000 }, cert02: { best: 90, times: 1, last: 1756710000000 } }))
  localStorage.setItem('ccowork.quiz.history', JSON.stringify([{ mode: 'exam', label: 'CERT 02', date: '2026-09-01', score: 90, total: 10, pass: true }]))
  localStorage.setItem('ccowork.learnerName', '罗旭春')
  localStorage.setItem('ccowork.tutor', JSON.stringify({ model: 'zhipu', asked: 5, lastAskAt: 1756710000000, history: [{ q: '隐私问题', a: '不该导出', t: 1756710000000 }] }))
})
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(600)
const metaAfterSeed = await page.locator('#bkMeta').textContent()
ok('预置数据后统计卡显示 2 证书/3 章节/1 实验/2 测验', /2/.test(metaAfterSeed) && /3/.test(metaAfterSeed) && /1/.test(metaAfterSeed), (metaAfterSeed || '').slice(0, 60))

/* 3. 我的认证渲染出 2 张证书 */
const gotBadges = await page.locator('.mine .badge-got').count()
ok('「我的认证」渲染 2 张已获证卡片', gotBadges === 2, 'badges=' + gotBadges)

/* 4. 点击导出 → 捕获下载文件并校验内容 */
let downloadPath = ''
let dlSuggested = ''
const dlPromise = page.waitForEvent('download', { timeout: 8000 }).then(async d => {
  // suggestedFilename 在 Chromium 下需等浏览器解析完下载元数据，过早读取会返回内部 UUID
  await new Promise(r => setTimeout(r, 200))
  dlSuggested = d.suggestedFilename()
  downloadPath = await d.path()
  return d
})
await page.locator('#bkExport').click()
await dlPromise
ok('点击导出触发 JSON 文件下载', !!downloadPath && /\.json$/.test(dlSuggested), dlSuggested || 'no download')

const exported = JSON.parse(fs.readFileSync(downloadPath, 'utf8'))
const expKeys = Object.keys(exported.data || {})
const needKeys = ['ccowork.certs', 'ccowork.progress', 'ccowork.quiz.scores', 'ccowork.quiz.history', 'ccowork.learnerName', 'ccowork.tutor.meta']
const missing = needKeys.filter(k => !expKeys.includes(k))
ok('导出文件包含全部 5 个学习 key + 助教统计', missing.length === 0 && exported.v === 1, 'v=' + exported.v + (missing.length ? ' missing:' + missing.join(',') : ''))
const expSummary = exported.data['ccowork.progress']
ok('导出内容数值正确（2 证书/3 章节/1 实验）', Object.keys(exported.data['ccowork.certs']).length === 2 && Object.keys(expSummary.chapters).length === 3 && Object.keys(expSummary.labs).length === 1, 'certs=' + Object.keys(exported.data['ccowork.certs']).length)
ok('导出不含 AI 助教对话历史（隐私）', !exported.data['ccowork.tutor'] || !(exported.data['ccowork.tutor'].history), 'tutor.meta=' + JSON.stringify(exported.data['ccowork.tutor.meta']))

/* 5. 导出状态条提示成功 */
const expStatus = await page.locator('#bkStatus').textContent()
ok('导出成功状态条提示', /已导出/.test(expStatus || ''), (expStatus || '').slice(0, 40))

/* 6. 模拟换设备：清空 localStorage → 证书与进度清空 */
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(600)
const afterClear = await page.evaluate(() => ({
  badges: document.querySelectorAll('.mine .badge-got').length,
  meta: (document.getElementById('bkMeta').textContent || '').slice(0, 60)
}))
ok('清空 localStorage 后（模拟换设备）证书为空', afterClear.badges === 0, JSON.stringify(afterClear))

/* 7. 导入备份文件 → 状态条成功 + 数据恢复 */
await page.locator('#bkFile').setInputFiles(downloadPath)
await page.waitForTimeout(800)
const impStatus = await page.locator('#bkStatus').textContent()
ok('导入备份成功状态条', /导入成功/.test(impStatus || ''), (impStatus || '').slice(0, 50))

/* 8. 导入后证书恢复 2 张 */
const restoredBadges = await page.locator('.mine .badge-got').count()
ok('导入后「我的认证」恢复 2 张证书', restoredBadges === 2, 'badges=' + restoredBadges)

/* 9. 导入后进度恢复（章节 3 + 实验 1 + 姓名） */
const restored = await page.evaluate(() => ({
  chapters: Object.keys((JSON.parse(localStorage.getItem('ccowork.progress') || '{}').chapters) || {}).length,
  labs: Object.keys((JSON.parse(localStorage.getItem('ccowork.progress') || '{}').labs) || {}).length,
  name: localStorage.getItem('ccowork.learnerName'),
  quiz: Object.keys(JSON.parse(localStorage.getItem('ccowork.quiz.scores') || '{}')).length
}))
ok('导入后章节/实验/姓名/成绩全部恢复', restored.chapters === 3 && restored.labs === 1 && restored.name === '罗旭春' && restored.quiz === 2, JSON.stringify(restored))

/* 10. 合并语义：本地已有 1 张证书，再导入 2 张 → 合并为 3 张不丢本地 */
await page.evaluate(() => {
  localStorage.setItem('ccowork.certs', JSON.stringify({ cert01: { name: '本地新证书', date: '2026-09-02', score: 95 } }))
})
await page.locator('#bkFile').setInputFiles(downloadPath)
await page.waitForTimeout(800)
const merged = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('ccowork.certs') || '{}')).length)
ok('合并语义：本地证书不丢失（1+2 → 3）', merged === 3, 'certs=' + merged)

/* 11. 非法 JSON 文件被拒 */
const badJson = path.join(ROOT, '.tmp', 'bad-backup.json')
fs.mkdirSync(path.dirname(badJson), { recursive: true })
fs.writeFileSync(badJson, '{ not valid json !!!')
await page.locator('#bkFile').setInputFiles(badJson)
await page.waitForTimeout(500)
const errStatus1 = await page.locator('#bkStatus').textContent()
ok('非法 JSON 被拒并提示', /不是有效的 JSON/.test(errStatus1 || ''), (errStatus1 || '').slice(0, 30))

/* 12. 格式不对（缺 data 字段）被拒 */
fs.writeFileSync(badJson, JSON.stringify({ hello: 'world' }))
await page.locator('#bkFile').setInputFiles(badJson)
await page.waitForTimeout(500)
const errStatus2 = await page.locator('#bkStatus').textContent()
ok('缺 data 字段的备份被拒并提示', /格式不对/.test(errStatus2 || ''), (errStatus2 || '').slice(0, 40))

/* 12b. P5：首页学院入口「我的进度」迷你展示（有进度时显示数字钩子） */
await page.goto(BASE + '/index.html', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
const homeProgSeeded = await page.locator('#homeAcadProg').textContent()
ok('首页学院卡片注入「我的进度」迷你展示', /已学 3\/34 章/.test(homeProgSeeded || '') && /证书 \d+ 张/.test(homeProgSeeded || '') && /连续 2 天/.test(homeProgSeeded || ''), (homeProgSeeded || '').slice(0, 50))

/* 12c. P5：无进度时显示引导文案（不制造空洞数字） */
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(800)
const homeProgEmpty = await page.locator('#homeAcadProg').textContent()
ok('首页无进度时显示引导文案（诚实不造数）', /从第一章开始/.test(homeProgEmpty || ''), (homeProgEmpty || '').slice(0, 40))

/* 12d. deep 主题下备份区块可读（按钮/状态条/统计卡均正常渲染） */
await page.goto(CERT_URL, { waitUntil: 'networkidle' })
await page.evaluate(() => { document.body.setAttribute('data-theme', 'deep') })
await page.waitForTimeout(400)
const deepState = await page.evaluate(() => {
  const btn = document.getElementById('bkExport')
  const card = document.querySelector('.backup-card')
  const cs = getComputedStyle(btn)
  return { btnVisible: !!btn && cs.display !== 'none' && cs.visibility !== 'hidden', cardBg: getComputedStyle(card).backgroundColor, btnColor: cs.color }
})
ok('deep 主题下备份区块正常渲染', deepState.btnVisible && /rgb/.test(deepState.cardBg), JSON.stringify(deepState))

/* 13. 零 JS 错误（404 仅允许 /api/stats/* 已知纯静态降级） */
const realErrs = errors.concat(four04.length ? ['404: ' + four04.join(',')] : [])
ok('零 JS 错误', realErrs.length === 0, realErrs.slice(0, 3).join(' | '))

await browser.close()
server.close()
const passed = results.filter(r => r.pass).length
console.log(`\n${passed}/${results.length} 通过`)
process.exit(passed === results.length ? 0 : 1)
