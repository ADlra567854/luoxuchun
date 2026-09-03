import { chromium } from 'playwright'

const BASE = 'https://d30b834e175c42e885f476edbf873aa4.app.workbuddy.link'
const b = await chromium.launch()
const p = await b.newPage()
const errors = [], failed = []
p.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))
p.on('response', r => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url()) })
p.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()) })

await p.goto(BASE + '/website/works.html', { waitUntil: 'networkidle' }).catch(e=>console.log('goto err:',e.message))
await p.waitForTimeout(1500)

// 展开所有卡片以触发全部 fetch
await p.evaluate(() => {
  document.querySelectorAll('details.work').forEach(d => { d.open = true; d.dispatchEvent(new Event('toggle')) })
})
await p.waitForTimeout(4000)

const status = await p.evaluate(() => {
  const items = [...document.querySelectorAll('details.work')]
  return items.map(d => {
    const title = d.querySelector('.w-title')?.textContent || '(无标题)'
    const body = d.querySelector('.w-body')
    const txt = body ? body.innerText.trim() : ''
    let state = 'empty'
    if (txt.includes('加载中')) state = 'loading'
    else if (txt.includes('无法加载')) state = 'FAILED'
    else if (txt.length > 0) state = 'OK(' + txt.length + '字)'
    return { title: title.slice(0, 26), state }
  })
})
console.log('=== 云端 works.html 作品加载状态 ===')
status.forEach((s, i) => console.log((i+1) + '. [' + s.state + '] ' + s.title))

console.log('\n=== 控制台错误 ===')
console.log(errors.length ? errors.join('\n') : '  (无)')
console.log('\n=== 4xx/5xx 请求(前15) ===')
console.log(failed.length ? failed.slice(0,15).join('\n') : '  (无)')
console.log('\n失败请求总数:', failed.length)

await b.close()
