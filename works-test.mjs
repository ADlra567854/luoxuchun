import { chromium } from 'playwright'

const BASE = 'http://localhost:8787'
const b = await chromium.launch()
const p = await b.newPage()
const errors = [], failed = []
p.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))
p.on('response', r => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url()) })
p.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()) })

// 1) 从主站点「作品内容库」卡片
await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
await p.waitForTimeout(800)
const card = await p.evaluate(() => {
  const a = [...document.querySelectorAll('a.go')].find(x => x.getAttribute('href') && x.getAttribute('href').includes('works.html'))
  if (!a) return { found: false }
  return { found: true, href: a.getAttribute('href') }
})
console.log('主站作品内容库卡片:', JSON.stringify(card))

// 2) 直接打开 works.html
await p.goto(BASE + '/website/works.html', { waitUntil: 'networkidle' })
await p.waitForTimeout(2500)

const status = await p.evaluate(() => {
  const items = [...document.querySelectorAll('details.work')]
  return items.map(d => {
    const title = d.querySelector('.w-title')?.textContent || '(无标题)'
    const body = d.querySelector('.w-body')
    const txt = body ? body.innerText.trim().slice(0, 60) : ''
    let state = 'empty'
    if (txt.includes('加载中')) state = 'loading'
    else if (txt.includes('无法加载')) state = 'FAILED: ' + txt
    else if (txt.length > 0) state = 'OK(' + txt.length + '字)'
    return { title: title.slice(0, 28), state }
  })
})
console.log('\n=== works.html 作品加载状态 ===')
status.forEach((s, i) => console.log((i+1) + '. [' + s.state + '] ' + s.title))

// 3) 点开一个未展开的卡片测试懒加载
const before = await p.evaluate(() => document.querySelectorAll('details.work[open]').length)
await p.evaluate(() => {
  const d = [...document.querySelectorAll('details.work')].find(x => !x.open)
  if (d) { d.open = true; d.dispatchEvent(new Event('toggle')) }
})
await p.waitForTimeout(2000)
const after = await p.evaluate(() => {
  const d = [...document.querySelectorAll('details.work')].find(x => x.open)
  const body = d ? d.querySelector('.w-body') : null
  return { open: document.querySelectorAll('details.work[open]').length, lastBody: body ? body.innerText.trim().slice(0,80) : '' }
})
console.log('\n展开前 open 数:', before, '→ 展开后 open 数:', after.open)
console.log('新展开卡片正文预览:', after.lastBody)

console.log('\n=== 控制台错误 ===')
console.log(errors.length ? errors.join('\n') : '  (无)')
console.log('\n=== 4xx/5xx 请求 ===')
console.log(failed.length ? failed.join('\n') : '  (无)')

await b.close()
