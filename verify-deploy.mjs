import { chromium } from 'playwright'

const BASE = 'http://localhost:8787'
const nc = '?nc=' + Date.now()
const browser = await chromium.launch()
const page = await browser.newPage()
const errors = []
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()) })

// ---------- 1) 主站：语料 + 四个白驹入口 ----------
await page.goto(BASE + '/' + nc, { waitUntil: 'load' })
await page.waitForFunction(() => typeof window.AI !== 'undefined', { timeout: 15000 })

const corpusN = await page.evaluate(() => Object.keys(window.BJ_CORPUS || {}).length)
const mode = await page.evaluate(() => document.getElementById('mode')?.value)
console.log('主站 mode=', mode, '| 语料部数=', corpusN, '| hasAI=', await page.evaluate(() => !!window.AI))

async function caseMain(name, setupArg, setup, trigger, prompt) {
  const before = await page.evaluate(() => document.querySelectorAll('#msgs .bot').length)
  if (setup) await page.evaluate(setup, setupArg)
  await page.evaluate(trigger)
  try {
    await page.waitForFunction(n => {
      const b = document.querySelectorAll('#msgs .bot')
      if (b.length <= n) return false
      const last = b[b.length - 1]
      return !last.classList.contains('typing') && last.innerText.trim().length > 10
    }, before, { timeout: 30000 })
  } catch (e) {}
  const txt = await page.evaluate(() => {
    const b = document.querySelectorAll('#msgs .bot'); return b.length ? b[b.length - 1].innerText.trim() : ''
  })
  const bad = txt.includes('已自动降级为书稿检索') || txt.startsWith('**') || txt.includes('语料没有') || txt.includes('书中未明确')
  const ok = txt.length > 30 && !bad
  console.log(`【主站·${name}】 ${ok ? '✅ 真AI' : '❌ 异常'} | 长度=${txt.length} | 预览: ${txt.slice(0, 70).replace(/\n/g, ' ')}`)
  return ok
}

const docSample = '今天用 AI 写了一篇关于远程办公的文章，主要讲了工具选型和时间管理，但感觉写得很散，缺乏重点，请帮我处理。'
const r1 = await caseMain('问白驹', null, null, () => window.askWith('祛 AI 味三刀具体是哪三刀？各用一句话说明'), 'q')
const r2 = await caseMain('交给白驹润色', docSample, (d) => { document.getElementById('docBody').value = d }, () => window.docAsk('润色并补全这段内容'), 'doc')
const r3 = await caseMain('白驹总结', docSample, (d) => { document.getElementById('docBody').value = d }, () => window.docAsk('总结要点并给出下一步'), 'doc')
const r4 = await caseMain('白驹细化', null, null, () => window.askWith('把这段分镜细化成带生图提示词的完整拍摄脚本：主角在雨夜的天台眺望城市，决定重新出发。'), 'vid')

// ---------- 2) 子页：浮动白驹组件 ----------
const sub = '/website/ai-money.html' + nc
await page.goto(BASE + sub, { waitUntil: 'load' })
await page.waitForTimeout(800)
const hasFab = await page.evaluate(() => !!document.getElementById('bj-fab'))
console.log('\n子页', sub, '| 浮动白驹按钮:', hasFab ? '✅ 存在' : '❌ 缺失')
let r5 = false
if (hasFab) {
  await page.click('#bj-fab')
  await page.waitForSelector('#bj-panel.show', { timeout: 5000 })
  await page.fill('#bj-in', '用 AI 赚钱有哪些低门槛路径？')
  await page.click('#bj-send')
  try {
    await page.waitForFunction(() => {
      const b = document.querySelectorAll('#bj-msgs .m.b')
      if (!b.length) return false
      const last = b[b.length - 1]
      return !last.classList.contains('typing') && last.textContent.trim().length > 10
    }, { timeout: 30000 })
    r5 = true
  } catch (e) {}
  const txt = await page.evaluate(() => {
    const b = document.querySelectorAll('#bj-msgs .m.b'); return b.length ? b[b.length - 1].textContent.trim() : ''
  })
  console.log('【子页·问白驹(浮动)】', r5 ? '✅ 真AI' : '❌ 异常', '| 长度=' + txt.length, '| 预览:', txt.slice(0, 70).replace(/\n/g, ' '))
}

console.log('\n=== 汇总 ===')
console.log('问白驹:', r1, '| 润色:', r2, '| 总结:', r3, '| 细化:', r4, '| 子页浮动白驹:', r5)
console.log('语料部数:', corpusN)
console.log('控制台错误:', errors.length ? errors.slice(0, 8) : '[]')
await browser.close()
