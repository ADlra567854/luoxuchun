// gen-book-pdf2.mjs · 《五卷全书》PDF 导出（Playwright Chromium print-to-PDF，零额外依赖）
// 用法: node scripts/gen-book-pdf2.mjs [--out <path>]
// 章节顺序与 gen-book-epub2.py 保持一致（总目录→总序→科技史→三工具书→第五/六卷→三附录）
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { COVER_CSS, coverHTML } from './lib-book-cover.mjs'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dir, '..')
const VOL_DIR = path.join(ROOT, 'book', '五卷全书')
const OUT = path.join(ROOT, 'website', 'book', '五卷全书.pdf')

// 与 gen-book-epub2.py 一致的显式顺序
const ORDER = [
  'README-全书总目录.html',
  '总序.html',
  '从古至今科技史与AI发展历程.html',
  'AI工具大全-百科全书.html',
  'AI绘画实战-从文字到画面.html',
  'AI视频制作实战-一个人做出一条视频.html',
  '第五卷-如何用AI打造个人主流IP.html',
  '第六卷-AI思想者与未来图景.html',
  '附录-学习路线图.html',
  '附录-工具速查表.html',
  '附录-提示词模板库.html',
]

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const stripNav = (html) => html
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
  .replace(/<nav[\s\S]*?<\/nav>/gi, '')
  .replace(/<svg[\s\S]*?<\/svg>/gi, '')
  .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, '$1')
  .replace(/\s+(style|class|id|data-[a-z-]+|width|height|align|valign|border)="[^"]*"/gi, '')

const CSS = `@page{size:A4;margin:18mm 16mm}
*{box-sizing:border-box}
body{font-family:"Source Han Serif SC","Noto Serif SC","Songti SC",serif;line-height:1.8;color:#1a1a1a;font-size:11pt}
h1{font-size:1.7em;line-height:1.4;margin:0 0 0.6em;padding-bottom:0.3em;border-bottom:2px solid #333}
h2{font-size:1.3em;margin:1.3em 0 0.5em}
h3{font-size:1.12em;margin:1em 0 0.4em}
p{margin:0.5em 0;text-align:justify}
ul,ol{padding-left:1.5em;margin:0.5em 0}
li{margin:0.25em 0}
blockquote{margin:0.7em 0;padding:0.5em 1em;border-left:3px solid #888;background:#f5f5f5}
pre{font-family:Consolas,"Courier New",monospace;font-size:9pt;background:#f6f6f6;border:1px solid #ddd;border-radius:5px;padding:0.8em;white-space:pre-wrap;word-break:break-all;margin:0.7em 0}
code{font-family:Consolas,monospace;font-size:0.92em;background:#f2f2f2;padding:0.1em 0.3em;border-radius:3px}
table{border-collapse:collapse;width:100%;margin:0.8em 0;font-size:9.5pt;page-break-inside:avoid}
th,td{border:1px solid #aaa;padding:0.4em 0.55em;text-align:left}
th{background:#eee}
hr{border:none;border-top:1px solid #ccc;margin:1.2em 0}
img{max-width:100%}
.chapter{page-break-before:always}
.chapter:first-of-type{page-break-before:avoid}
${COVER_CSS}
`

;(async () => {
  const chapters = []
  const missing = []
  for (const name of ORDER) {
    const fp = path.join(VOL_DIR, name)
    if (!fs.existsSync(fp)) { missing.push(name); continue }
    const html = fs.readFileSync(fp, 'utf8')
    const m = html.match(/<article[\s>][\s\S]*?<\/article>/i)
    let seg = m ? m[0] : (html.match(/<main[\s>][\s\S]*?<\/main>/i) || [''])[0]
    if (!seg) { const b = html.match(/<body[\s>][\s\S]*?<\/body>/i); seg = b ? b[0] : '' }
    const h1 = seg.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
    const title = h1 ? h1[1].replace(/<[^>]+>/g, '').trim() : path.basename(name, '.html')
    chapters.push({ title, body: stripNav(seg) })
  }
  if (missing.length) console.log('[warn] 缺失文件:', missing)

  const body = chapters.map((c) => `<section class="chapter">${c.body.replace(/^<article>\s*/i, '').replace(/<\/article>\s*$/i, '')}</section>`).join('\n')

  const full = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>${esc('五卷全书')}</title><style>${CSS}</style></head>
<body>
${coverHTML({ title: '五卷全书', sub: '从 AI 工具到思想者的完整路线', chapters: chapters.length })}
${body}
</body></html>`
  fs.writeFileSync(path.join(ROOT, '_tmp-book2.html'), full, 'utf8')

  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto('file:///' + path.join(ROOT, '_tmp-book2.html').replace(/\\/g, '/'), { waitUntil: 'networkidle' })
  await page.pdf({ path: OUT, format: 'A4', printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } })
  await browser.close()
  fs.rmSync(path.join(ROOT, '_tmp-book2.html'), { force: true })

  const size = (fs.statSync(OUT).size / 1024 / 1024).toFixed(1)
  console.log(`✅ PDF 生成: ${OUT} | ${size} MB | ${chapters.length} 章`)
})().catch((e) => { console.error('❌', e.message); process.exit(1) })
