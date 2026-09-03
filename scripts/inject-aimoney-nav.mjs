/* inject-aimoney-nav.mjs
 * 给 website/*.html 中含 nav-links 的页面追加「AI赚钱」导航入口（幂等）
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIR = path.resolve(__dirname, '..', 'website')
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.html'))

let added = 0, skipped = 0
for (const f of files) {
  const fp = path.join(DIR, f)
  let html = fs.readFileSync(fp, 'utf8')
  if (!html.includes('class="nav-links"') || html.includes('ai-money.html')) { skipped++; continue }
  const re = /(<div class="nav-links">)([\s\S]*?)(<\/div>)/
  if (re.test(html)) {
    html = html.replace(re, '$1$2    <a href="ai-money.html">AI赚钱</a>\n  $3')
    fs.writeFileSync(fp, html, 'utf8')
    added++
  } else skipped++
}
console.log(`已加 AI赚钱 入口：${added} 页；跳过：${skipped} 页`)
