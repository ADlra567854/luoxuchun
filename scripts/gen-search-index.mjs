// gen-search-index.mjs · A3 全站搜索 · 索引生成器（零依赖）
// 扫描有效 HTML 页面 → 提取 title/description/keywords/标题/正文摘要 → 生成 data/search-index.js
// 用法：node scripts/gen-search-index.mjs [--check]
//   --check  生成后自检：URL 全部有效、无重复、标题非空（生成器默认每次生成即自检）
// 原则：确定性输出（按 URL 排序），重复运行 diff 干净；产物随源码入库（静态站点开箱即用）。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dir, '..')
const OUT = path.join(ROOT, 'data', 'search-index.js')
const MAX_HEADS = 12
const SNIPPET_LEN = 240

// ---------- 与 prepare-deploy.mjs 一致的排除规则（单一真源：内部产物不入索引） ----------
const SKIP_NAME = /(AIGC.*报告\.html$|.*完成报告\.html$|.*工作总结\.html$|^tmp_.*\.html$)/
const SKIP_DIR = new Set(['_internal', 'templates', 'deploy', '_archive', '.git', 'node_modules', 'scripts', 'docs', 'data'])
const SKIP_FILE = new Set(['website/_corpus.html']) // 语料查看器（本身是检索页，不参与检索）

const DIRS = ['website', 'blog', 'book', 'lab', 'novel']

// ---------- HTML 提取工具 ----------
const ENT = {
  amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ', mdash: '—', ndash: '–',
  hellip: '…', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', middot: '·', times: '×',
  copy: '©', reg: '®', trade: '™', deg: '°', plusmn: '±', frac12: '½', laquo: '«', raquo: '»',
  emsp: ' ', ensp: ' ', thinsp: ' ', shy: '', zwnj: '', zwj: '',
}
function decode(s) {
  return String(s).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, e) => {
    if (e[0] === '#') {
      const c = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return (c >= 0 && c < 65536 && !(c >= 0xd800 && c <= 0xdfff)) ? String.fromCharCode(c) : m
    }
    return ENT[e.toLowerCase()] || m
  })
}
function cleanText(html) {
  return decode(html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/table)[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ').trim()
}
function sliceTag(html, tag) {
  const m = html.match(new RegExp('<' + tag + '[\\s\\S]*?>([\\s\\S]*?)</' + tag + '>', 'i'))
  return m ? m[1] : ''
}
function metaContent(html, name) {
  const re = new RegExp('<meta[^>]+>', 'gi')
  let m
  while ((m = re.exec(html))) {
    const tag = m[0]
    const n = /name=["']([^"']+)["']/i.exec(tag)
    const c = /content=["']([^"']*)["']/i.exec(tag)
    if (n && c && n[1].toLowerCase() === name) return decode(c[1])
  }
  return ''
}

// ---------- 单页提取 ----------
function extract(html) {
  const title = (decode(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || '')).trim().slice(0, 120)
  const desc = metaContent(html, 'description').slice(0, 200)
  const keywords = metaContent(html, 'keywords').split(/[,，;；\s]+/).map(s => s.trim()).filter(Boolean).slice(0, 12)

  const heads = []
  const hre = /<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi
  let hm
  while ((hm = hre.exec(html)) && heads.length < MAX_HEADS) {
    const t = cleanText(hm[2])
    if (t) heads.push(t.slice(0, 60))
  }

  // 正文容器：article → main → .content/#content → body
  let body = ''
  body = sliceTag(html, 'article')
  if (!cleanText(body)) body = sliceTag(html, 'main')
  if (!cleanText(body)) {
    const m = html.match(/<(div|section)[^>]+(?:class|id)=["']([^"']*content[^"']*)["'][^>]*>([\s\S]*?)<\/(?:div|section)>/i)
    body = m ? m[3] : html
  }
  const snippet = cleanText(body).slice(0, SNIPPET_LEN)

  return { title, desc, keywords, heads, snippet }
}

// ---------- 扫描 ----------
const entries = []
function walk(dir, rel) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name)
    const r = rel ? rel + '/' + e.name : e.name
    if (e.isDirectory()) {
      if (!SKIP_DIR.has(e.name)) walk(abs, r)
    } else if (e.name.endsWith('.html')) {
      if (SKIP_NAME.test(e.name)) continue
      if (SKIP_FILE.has(r)) continue
      const html = fs.readFileSync(abs, 'utf8')
      const { title, desc, keywords, heads, snippet } = extract(html)
      if (!title) continue // 无标题页视为无效页
      const u = r.split(path.sep).join('/')
      const item = { u, t: title }
      if (desc) item.d = desc
      if (keywords.length) item.k = keywords
      if (heads.length) item.h = heads
      if (snippet) item.s = snippet
      entries.push(item)
    }
  }
}
for (const d of DIRS) walk(path.join(ROOT, d), d)
// 根 index.html
const idxAbs = path.join(ROOT, 'index.html')
if (fs.existsSync(idxAbs)) {
  const html = fs.readFileSync(idxAbs, 'utf8')
  const { title, desc, keywords, heads, snippet } = extract(html)
  if (title) {
    const item = { u: 'index.html', t: title }
    if (desc) item.d = desc
    if (keywords.length) item.k = keywords
    if (heads.length) item.h = heads
    if (snippet) item.s = snippet
    entries.push(item)
  }
}

// ---------- 确定性输出 ----------
entries.sort((a, b) => a.u.localeCompare(b.u))
const now = new Date().toISOString().slice(0, 10)
const header = '/* search-index.js · A3 全站搜索索引（由 scripts/gen-search-index.mjs 生成，请勿手改）\n' +
  ' * 生成日期：' + now + ' · 收录 ' + entries.length + ' 页 · 字段：u=URL t=标题 d=描述 k=关键词 h=标题行 s=正文摘要\n' +
  ' * 重新生成：node scripts/gen-search-index.mjs\n */\n'
const body = 'globalThis.SEARCH_INDEX = ' + JSON.stringify(entries) + ';\n'
fs.writeFileSync(OUT, header + body, 'utf8')

// ---------- 自检 ----------
let errors = 0
const seen = new Set()
for (const it of entries) {
  if (seen.has(it.u)) { console.error('❌ 重复 URL: ' + it.u); errors++ }
  seen.add(it.u)
  const f = path.join(ROOT, it.u.split('/').join(path.sep))
  if (!fs.existsSync(f)) { console.error('❌ 索引指向不存在文件: ' + it.u); errors++ }
  if (!it.t) { console.error('❌ 空标题: ' + it.u); errors++ }
  if (!it.s && !it.h && !it.d) { console.error('⚠️ 无正文/标题/描述: ' + it.u) }
}
const bytes = fs.statSync(OUT).size
console.log('✅ 生成 ' + OUT.replace(ROOT, '.') + '：' + entries.length + ' 页，' + (bytes / 1024).toFixed(1) + ' KB')
if (errors) { console.error('❌ 自检失败 ' + errors + ' 项'); process.exit(1) }
console.log('✅ 自检通过：URL 有效、无重复、标题齐全')
