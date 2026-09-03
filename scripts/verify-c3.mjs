/* C3 端到端验证：lab 仿真在线化（下载脚本 / 在线仿真运行 / 实验打卡 / 学院入口） */
import { chromium } from 'playwright'
const BASE = 'http://127.0.0.1:8787'
const results = []
const ok = (name, pass, extra='') => { results.push({name, pass, extra}); console.log((pass?'✓':'✗')+' '+name+(extra?' — '+extra:'')) }

const browser = await chromium.launch()
const page = await browser.newPage()
const errors = []
page.on('pageerror', e => errors.push(String(e)))
// 404 资源收集：/api/stats/* 是纯静态部署下的已知降级路径（stats.js 自动切本地模式），不计入 JS 错误
const four04 = []
page.on('response', r => {
  if (r.status() === 404 && !/\/api\/stats\//.test(r.url())) four04.push(r.url())
})

/* 1. lab/index.html：11 个 .py 下载链接真实可点（HTTP 200） */
await page.goto(BASE + '/lab/index.html', { waitUntil: 'networkidle' })
const dlLinks = await page.locator('.card .links a[download]').count()
ok('lab 首页 11 个脚本下载链接存在', dlLinks === 11, 'dl=' + dlLinks)
const dl200 = await page.evaluate(async () => {
  const links = [...document.querySelectorAll('.card .links a[download]')]
  const res = await Promise.all(links.map(async a => {
    try { const r = await fetch(a.href); return r.status } catch(e){ return 0 }
  }))
  return res.every(s => s === 200) ? res.length : res.filter(s => s !== 200).length
})
ok('全部下载链接返回 200（文件真实存在）', dl200 === 11, 'ok=' + dl200)

/* 2. lab/index.html：在线版对照链接 + 图文讲解链接已修复（不再缺 href） */
const onlineLinks = await page.locator('.card .links a:not([download])').count()
ok('5 个「在线版」对照链接存在', onlineLinks === 5, 'online=' + onlineLinks)
const brokenAnchor = await page.evaluate(() => {
  return [...document.querySelectorAll('p a, .guide a')].filter(a => !a.getAttribute('href') || a.getAttribute('href').trim() === '').length
})
ok('页面无缺 href 的死链接', brokenAnchor === 0, 'broken=' + brokenAnchor)

/* 3. lab/simlab.html：5 个仿真自动运行 → 结果区有数据 + 图表渲染 */
await page.goto(BASE + '/lab/simlab.html', { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
const simRuns = []
for (const id of ['pid-results','sm-results','pj-results','rc-results','mc-results']) {
  const has = await page.locator('#' + id + ' .res').count()
  simRuns.push(has)
}
ok('5 个仿真自动运行并输出结果', simRuns.every(n => n >= 3), 'res=' + simRuns.join(','))

/* 4. simlab.html：5 个实验打卡按钮存在 */
const labBtns = await page.locator('.labcheck .lab-btn').count()
ok('5 个实验打卡按钮存在', labBtns === 5, 'btns=' + labBtns)

/* 5. 点击 PID 打卡 → ccowork.progress.labs 写入 + UI 变已完成 */
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.locator('[data-lab="lab-pid"] .lab-btn').click()
await page.waitForTimeout(300)
const labState = await page.evaluate(() => {
  const p = JSON.parse(localStorage.getItem('ccowork.progress') || '{}')
  return {
    labs: p.labs || {},
    streak: p.streak,
    btnText: document.querySelector('[data-lab="lab-pid"] .lab-btn').textContent,
    state: document.querySelector('[data-lab="lab-pid"] .lab-state').textContent
  }
})
ok('打卡写入 ccowork.progress.labs', !!(labState.labs['lab-pid'] && labState.labs['lab-pid'].completedAt))
ok('打卡后按钮变「已完成」+ 显示日期', labState.btnText.includes('已完成') && labState.state.includes('完成于'))
ok('实验打卡计入连续学习天数', labState.streak >= 1, 'streak=' + labState.streak)

/* 6. 重复点击不重复记录（幂等） */
await page.locator('[data-lab="lab-pid"] .lab-btn').click({ force: true }).catch(()=>{})
await page.waitForTimeout(200)
const dup = await page.evaluate(() => {
  const p = JSON.parse(localStorage.getItem('ccowork.progress') || '{}')
  return Object.keys(p.labs || {}).length
})
ok('重复点击不重复记录（幂等）', dup === 1, 'labs=' + dup)

/* 7. 学院页 lab 入口 chip 存在 */
await page.goto(BASE + '/website/ai-academy.html', { waitUntil: 'networkidle' })
const labChip = await page.locator('.gate-chips a[href*="simlab"]').count()
ok('学院首页新增「lab 仿真实验室」入口', labChip >= 1, 'chip=' + labChip)

/* 8. module.js 全局 API 支持实验打卡 */
await page.goto(BASE + '/lab/simlab.html', { waitUntil: 'networkidle' })
const api = await page.evaluate(() => {
  return !!(window.CCOWorkProgress
    && typeof window.CCOWorkProgress.recordLab === 'function'
    && typeof window.CCOWorkProgress.isLabCompleted === 'function'
    && typeof window.CCOWorkProgress.getLabs === 'function')
})
ok('CCOWorkProgress 实验打卡 API 可用', api === true)

/* 9. 零 JS 错误（404 仅允许 /api/stats/* 已知降级路径） */
const realErrs = errors.concat(four04.length ? ['404: ' + four04.join(',')] : [])
ok('零 JS 错误', realErrs.length === 0, realErrs.slice(0,3).join(' | '))

await browser.close()
const passed = results.filter(r => r.pass).length
console.log(`\n${passed}/${results.length} 通过`)
process.exit(passed === results.length ? 0 : 1)
