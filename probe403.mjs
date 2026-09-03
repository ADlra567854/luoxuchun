import { chromium } from 'playwright'
const b = await chromium.launch(); const p = await b.newPage()
const bad = []
p.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()) })
await p.goto('http://localhost:8787/website/ai-money.html?nc=' + Date.now(), { waitUntil: 'networkidle' }).catch(() => {})
await p.waitForTimeout(1500)
console.log('403/4xx 请求:'); bad.forEach(x => console.log('  ' + x))
await b.close()
