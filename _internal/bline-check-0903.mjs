// B线 2026-09-03 渲染体检：双 SVG=1、表格已渲染、零 JS 错误
import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const shots = path.join(ROOT, '_archive', 'bline-20260903')
const pages = [
  'blog/2026-09-03-爆款-100万上下文塞进4B小模型！讯飞开源星火X2.5：本地跑直接干翻云端大模型.html',
  'blog/2026-09-03-爆款-3个新能力反超GPT-4o？OpenAI Astra突袭上线：普通用户零成本上手.html',
  'blog/2026-09-01-爆款-3个Agent协作开源AI助手实测.html',
]
const browser = await chromium.launch()
let fails = 0
for (const p of pages) {
  const url = 'file:///' + path.join(ROOT, p).replace(/\\/g, '/')
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errs = []
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  page.on('pageerror', e => errs.push(String(e)))
  await page.goto(url, { waitUntil: 'networkidle' }).catch(() => {})
  await page.waitForTimeout(600)
  const svg = await page.locator('svg').count()
  const table = await page.locator('table').count()
  const pipe = await page.locator('p:has-text("| 模型")').count()
  const name = p.split('/').pop().slice(0, 26)
  const ok = svg === 1 && table >= 1 && pipe === 0 && errs.length === 0
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} svg=${svg} table=${table} pipe=${pipe} jsErr=${errs.length}`)
  if (errs.length) console.log('   ', errs.slice(0, 3).join(' | '))
  await page.screenshot({ path: path.join(shots, 'check-' + name.replace(/[^\w\u4e00-\u9fa5]/g, '') + '.png') })
  await page.close()
}
await browser.close()
console.log(fails ? `\n${fails} failures` : '\nALL GREEN')
process.exit(fails ? 1 : 0)
