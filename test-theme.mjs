import { chromium } from 'playwright'
const BASE = 'https://d30b834e175c42e885f476edbf873aa4.app.workbuddy.link'
const b = await chromium.launch(); const p = await b.newPage()
await p.goto(BASE + '/website/ai-money.html?nc=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 60000 })
await p.waitForTimeout(3000)
const read = () => p.evaluate(() => ({
  theme: document.body.getAttribute('data-theme'),
  bg: getComputedStyle(document.body).backgroundColor,
  text: getComputedStyle(document.body).color
}))
const cloud = await read()
await p.evaluate(() => document.body.setAttribute('data-theme', 'deep'))
await p.waitForTimeout(1600)                        // 等 CSS 0.5s 过渡完成
const deep = await read()
console.log(JSON.stringify({ cloud, deep, switched: cloud.bg !== deep.bg }, null, 2))
await b.close()
