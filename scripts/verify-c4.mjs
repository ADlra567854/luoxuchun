/* C4 端到端验证：AI 助教（章节页注入 / 上下文感知 / 流式对话 / 历史记录 / 学院入口）
 * 内置静态服务器 + mock AI 客户端（无需真实 API Key，验证前端交互链路）
 */
import { chromium } from 'playwright'
import http from 'http'
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve('.')
const PORT = 8791
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
const page = await browser.newPage()
const errors = []
page.on('pageerror', e => errors.push(String(e)))
const four04 = []
page.on('response', r => { if (r.status() === 404 && !/\/api\/stats\//.test(r.url())) four04.push(r.url()) })

// mock AI 客户端：ai-tutor.js 检测到 window.AI.chat 存在则不再加载 ai-client.js
await page.addInitScript(() => {
  window.AI = {
    PROV: {
      zhipu: { label: '智谱免费' }, deepseek: { label: 'DeepSeek' }, ark: { label: '火山方舟' }
    },
    chat: async (opts) => {
      const text = '这是助教的流式测试回答。**加粗内容**与`行内代码`。'
      // 分片模拟流式
      for (let i = 2; i <= text.length; i += 6) {
        opts.onDelta(text.slice(i - 6, i))
        await new Promise(r => setTimeout(r, 5))
      }
      opts.onDone()
      return { cancel() {} }
    }
  }
})

/* 1. 章节页自动注入 ai-tutor.js → 浮动按钮存在 */
await page.goto(BASE + '/website/ai-academy/chapter-01.html', { waitUntil: 'networkidle' })
await page.locator('#aiTutorFab').waitFor({ timeout: 8000 })
await page.waitForTimeout(300)
const fabCount = await page.locator('#aiTutorFab').count()
ok('章节页自动出现「AI 助教」浮动按钮', fabCount === 1, 'fab=' + fabCount)

/* 2. 点击 FAB → 面板展开 */
await page.locator('#aiTutorFab').click()
await page.waitForTimeout(400)
const panelShown = await page.locator('#aiTutorPanel.show').count()
ok('点击后对话面板展开', panelShown === 1)

/* 3. 上下文感知：面板标题包含本章名称 */
const panelTitle = await page.locator('#aiTutorPanel .at-h-t span').textContent()
ok('面板识别当前章节（上下文感知）', /第一章|初识智能体/.test(panelTitle || ''), 'title=' + (panelTitle || '').slice(0, 30))

/* 4. 快捷问题 chips ≥ 3（基于章节目录动态生成） */
const chips = await page.locator('#aiTutorPanel .at-chip').count()
ok('快捷问题基于本章目录生成（≥3 个）', chips >= 3, 'chips=' + chips)

/* 5. 首次打开引导：无 Key 时显示配置提示 */
const guideTip = await page.locator('#aiTutorPanel .at-msg.at-err').count()
ok('无 Key 时显示首次使用引导', guideTip >= 1, 'tip=' + guideTip)

/* 6. 发送问题 → 流式回答渲染（mock AI） */
await page.locator('#aiTutorPanel #atInput').fill('什么是反射智能体？')
await page.locator('#aiTutorPanel #atSend').click()
await page.waitForFunction(() => {
  const msgs = document.querySelectorAll('#aiTutorPanel .at-msg.at-bot')
  return msgs.length >= 1 && (msgs[msgs.length - 1].textContent || '').indexOf('助教') !== -1
}, null, { timeout: 10000 })
await page.waitForTimeout(300)
const botText = await page.locator('#aiTutorPanel .at-msg.at-bot').last().textContent()
ok('发送问题后助教流式返回回答', /助教/.test(botText || ''), 'bot=' + (botText || '').slice(0, 24))

/* 7. 对话历史写入 localStorage（ccowork.tutor） */
const hist = await page.evaluate(() => {
  const t = JSON.parse(localStorage.getItem('ccowork.tutor') || '{}')
  return { asked: t.asked || 0, histLen: (t.history || []).length }
})
ok('对话记录写入 localStorage', hist.asked >= 1 && hist.histLen >= 1, 'asked=' + hist.asked + ' hist=' + hist.histLen)

/* 8. 已提问计数展示 */
const askedEl = await page.locator('#atAsked').textContent()
ok('面板显示累计提问次数', parseInt(askedEl || '0') >= 1, 'asked=' + askedEl)

/* 9. 非章节页不注入助教（学院首页无 FAB） */
await page.goto(BASE + '/website/ai-academy.html', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
const fabHome = await page.locator('#aiTutorFab').count()
ok('学院首页不注入助教按钮（只在章节页）', fabHome === 0, 'fab=' + fabHome)

/* 10. 学院首页：AI 助教入口 chip + 进度卡助教统计元素 */
const tutorChip = await page.locator('.gate-chips a[href*="chapter-01"]').count()
const progTutorEl = await page.locator('#progTutor').count()
ok('学院首页「AI 助教 · 随章答疑」入口存在', tutorChip >= 1, 'chip=' + tutorChip)
ok('进度卡含助教互动统计位', progTutorEl === 1)

/* 11. module.js 助教统计 API */
const tutorApi = await page.evaluate(() => {
  return !!(window.CCOWorkProgress && typeof window.CCOWorkProgress.getTutor === 'function')
})
ok('CCOWorkProgress.getTutor API 可用', tutorApi === true)

/* 12. 零 JS 错误（404 仅允许 /api/stats/* 已知降级） */
const realErrs = errors.concat(four04.length ? ['404: ' + four04.join(',')] : [])
ok('零 JS 错误', realErrs.length === 0, realErrs.slice(0, 3).join(' | '))

await browser.close()
server.close()
const passed = results.filter(r => r.pass).length
console.log(`\n${passed}/${results.length} 通过`)
process.exit(passed === results.length ? 0 : 1)
