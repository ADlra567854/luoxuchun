/* inject-responsive.mjs
 * 为 website/*.html 批量注入多端适配层：
 *  ① <link rel=stylesheet href=/responsive.css> → </head> 前
 *  ② <script src=/responsive.js> → </body> 前
 *  ③ viewport 补 viewport-fit=cover
 *  ④ nav-links 追加「教程视频」入口
 * 幂等：已注入则跳过。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DIR = path.join(ROOT, 'website')
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.html'))

let nLink = 0, nScript = 0, nVp = 0, nNav = 0, nSkip = 0

for (const f of files) {
  const fp = path.join(DIR, f)
  let html = fs.readFileSync(fp, 'utf8')
  let changed = false

  // ③ viewport-fit
  if (/name=["']viewport["']/.test(html) && !/viewport-fit/.test(html)) {
    html = html.replace(/(content=["'][^"']*?)(["'])/, (m, p1, p2) => p1 + ', viewport-fit=cover' + p2)
    nVp++; changed = true
  } else if (!/name=["']viewport["']/.test(html)) {
    html = html.replace(/<head>/i, '<head>\n<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">')
    nVp++; changed = true
  }

  // ① 注入 stylesheet
  if (!html.includes('/responsive.css')) {
    if (html.includes('</head>')) {
      html = html.replace('</head>', '  <link rel="stylesheet" href="/responsive.css">\n</head>')
      nLink++; changed = true
    }
  }

  // ② 注入 script（在 </body> 前，module.js 之后更稳妥）
  if (!html.includes('/responsive.js')) {
    if (html.includes('</body>')) {
      html = html.replace('</body>', '  <script src="/responsive.js"></script>\n</body>')
      nScript++; changed = true
    }
  }

  // ④ nav-links 追加教程视频入口（精准匹配 nav-links 自身的闭合 </div>）
  if (html.includes('class="nav-links"') && !html.includes('videos.html')) {
    const re = /(<div class="nav-links">)([\s\S]*?)(<\/div>)/
    if (re.test(html)) {
      html = html.replace(re, '$1$2    <a href="videos.html">教程视频</a>\n  $3')
      nNav++; changed = true
    }
  }

  if (changed) { fs.writeFileSync(fp, html, 'utf8'); nSkip = nSkip }
  else nSkip++
}

console.log(`已处理 ${files.length} 个页面`)
console.log(`  注入 stylesheet : ${nLink}`)
console.log(`  注入 script     : ${nScript}`)
console.log(`  viewport 修正  : ${nVp}`)
console.log(`  nav 加教程入口 : ${nNav}`)
console.log(`  无变动/跳过     : ${nSkip}`)
