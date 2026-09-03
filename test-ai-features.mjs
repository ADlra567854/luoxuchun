import { chromium } from 'playwright'

const BASE = 'http://localhost:8787'
const nc = '?nc=' + Date.now()

const browser = await chromium.launch()
const page = await browser.newPage()
const errors = []
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()) })

await page.goto(BASE + '/' + nc, { waitUntil: 'load' })
await page.waitForFunction(() => typeof window.AI !== 'undefined' && typeof window.AI.complete === 'function', { timeout: 15000 })

const mode = await page.evaluate(() => document.getElementById('mode')?.value)
console.log('mode =', mode, '| hasAI =', await page.evaluate(() => !!window.AI))

async function runCase(name, setup, trigger, prompt) {
  const before = await page.evaluate(() => document.querySelectorAll('#msgs .bot').length)
  if (setup) await page.evaluate(setup)
  await page.evaluate(trigger)
  try {
    await page.waitForFunction(
      (n) => {
        const bots = document.querySelectorAll('#msgs .bot')
        if (bots.length <= n) return false
        const last = bots[bots.length - 1]
        return !last.classList.contains('typing') && last.innerText.trim().length > 10
      }, before, { timeout: 30000 })
  } catch (e) { /* 超时也继续取最后一条 */ }
  const txt = await page.evaluate(() => {
    const bots = document.querySelectorAll('#msgs .bot')
    return bots.length ? bots[bots.length - 1].innerText.trim() : ''
  })
  const isFallback = txt.includes('已自动降级为书稿检索') || txt.startsWith('**')
  const ok = txt.length > 30 && !isFallback
  console.log(`\n【${name}】 ${ok ? '✅ 真AI' : '❌ 异常/兜底'}`)
  console.log('  长度=' + txt.length + ' | 降级的=' + isFallback)
  console.log('  预览: ' + txt.slice(0, 90).replace(/\n/g, ' '))
  return ok
}

const docSample = '今天用 AI 写了一篇关于远程办公的文章，主要讲了工具选型和时间管理，但感觉写得很散，缺乏重点。'

const r1 = await runCase('问白驹', null,
  () => window.askWith('祛 AI 味三刀具体是哪三刀？一句话各说一句'), 'q')

const r2 = await runCase('交给白驹润色',
  (d) => { document.getElementById('docBody').value = d },
  () => window.docAsk('润色并补全这段内容'),
  docSample)

const r3 = await runCase('白驹总结',
  (d) => { document.getElementById('docBody').value = d },
  () => window.docAsk('总结要点并给出下一步'),
  docSample)

const r4 = await runCase('白驹细化(分镜)',
  (d) => { const el = document.getElementById('vidOut'); if (el) el.innerText = d },
  () => window.askWith('把这段分镜细化成带生图提示词的完整拍摄脚本：主角在雨夜的天台眺望城市，决定重新出发。'),
  'vid')

console.log('\n=== 汇总 ===')
console.log('问白驹:', r1, '| 润色:', r2, '| 总结:', r3, '| 细化:', r4)
console.log('errors:', errors.length ? errors : '[]')

await browser.close()
