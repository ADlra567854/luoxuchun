/* inject-projects-nav-all.mjs
 * 给所有含 nav-links 且尚无 ai-projects 入口的页面追加「作品大全」导航（幂等）
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIR = path.resolve(__dirname, '..', 'website')
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.html'))
let added = 0, skip = 0

for (const f of files) {
  const fp = path.join(DIR, f)
  let html = fs.readFileSync(fp, 'utf8')
  if (!html.includes('class="nav-links"') || html.includes('ai-projects.html')) { skip++; continue }
  const re = /(<div class="nav-links">)([\s\S]*?)(<\/div>)/
  if (re.test(html)) {
    html = html.replace(re, '$1$2    <a href="ai-projects.html">作品大全</a>\n  $3')
    fs.writeFileSync(fp, html, 'utf8')
    added++
  } else skip++
}
console.log(`已加「作品大全」入口：${added} 页；跳过：${skip} 页`)
