#!/usr/bin/env node
/* ============================================================
   gen-seo.mjs · B1 SEO 基础（零依赖 · 幂等）
   1) 全站补 <meta name="description">（从正文首段提取，不编造）
   2) 全站补 <meta name="keywords">（从 title 提取核心词 + 页面类型词）
   3) 生成根目录 sitemap.xml（全站 URL + lastmod/changefreq/priority）
   4) 生成根目录 rss.xml（blog 目录博文，按最后修改时间倒序）
   5) [v2] 生成 robots.txt + 全站补 canonical / og:title / og:image / og:url
   6) [v2] 全站补 twitter:card / twitter:title / twitter:description / twitter:image
   7) [v2] 去重错误的 <meta name="og:description">（保留 property= 版本）
   8) [v2] JSON-LD 结构化数据：首页 WebSite / 博客 BlogPosting（datePublished 用文件 mtime，不编造）

   用法：node scripts/gen-seo.mjs [--dry]
   --dry 只统计将要改动的文件，不落盘。

   原则：
   - 已有 description 且长度 ≥ 30 的页面跳过（不覆盖人工写好的摘要）
   - 正文提取纯文本，截断到 ~110 字符，不留半截 emoji/标签
   - 不编造数据：lastmod 用文件 mtime，RSS pubDate 用文件 mtime，JSON-LD datePublished 用文件 mtime
   - 所有补齐均为幂等：已有对应标签则跳过
   ============================================================ */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dir, '..')
const DRY = process.argv.includes('--dry')

// 线上基址：白驹全局大脑线上部署域（正式域名上线后改这里并重跑一次即可）
const SITE_BASE = 'https://cd4b0031dbe041d1b32f15cbab005a04.app.workbuddy.link'
const SITE_TITLE = '白驹全局大脑 · AI 创作纪元'
const BRAND_KEYWORDS = '白驹全局大脑,ccowork,AI 创作纪元,AI 工具,智能体'
const BRAND_NAME = '白驹全局大脑'
const DEFAULT_OG_IMAGE = '/assets/img/og-cover.png'

const EXCLUDE = new Set(['node_modules', 'deploy', '_archive', '_internal', '.git', '.workbuddy', 'scripts', 'templates'])
const MIN_DESC = 30  // 已有 description 短于此视为不合格，重写
const MAX_DESC = 110 // 中文摘要建议长度

// ---------- 工具 ----------
const walkHtml = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE.has(e.name) || e.name.startsWith('.')) continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) walkHtml(full, out)
    else if (e.name.endsWith('.html')) out.push(full)
  }
  return out
}

// 去 HTML 标签与实体，压缩空白（保留中文标点）
const stripHtml = (s) =>
  s.replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim()

// 模板开篇残留检测词（命中即视为「模板头」，从正文开头剥离，避免脏摘要进 description）
const TPL_WORDS = /深度长文|每日更新|爆款生产线|AI\s*生成|以官方为准|每日爆款引擎|白驹全局大脑\s*[··]\s*/
// 模板头句子正则（按顺序尝试剥离；每条要求命中模板词，避免误删真实内容）
const TPL_PREFIXES = [
  /^(白驹全局大脑\s*[··]\s*深度长文[^。！？!?…]*[。！？!?…]?)/,
  /^(深度长文\s*[··]\s*每日更新[^。！？!?…]*[。！？!?…]?)/,
  /^([⏱📅🔥🤖]+\s*[^。！？!?…]{0,70}(?:AI\s*生成|信息以官方为准|每日爆款引擎|爆款生产线|深度长文|每日更新)[^。！？!?…]*[。！？!?…]?)/,
  /^(AI\s*生成\s*[··]\s*(?:以官方为准|信息以官方为准)[。！？!?…]?\s*)/i,
  /^(信息以官方为准[。！？!?…]?\s*)/,
]
// 正文纯文本：article 优先，回退 body；循环剥离模板开篇残留（⏱ 时长 / 📅 日期 / 🔥🤖 生产线与 AI 生成标记 / 深度长文旧模板头），之后的才是真实正文
const bodyText = (html) => {
  const inArticle = html.match(/<article[\s>][\s\S]*?<\/article>/i)
  const seg = inArticle ? inArticle[0] : (html.match(/<body[\s>][\s\S]*?<\/body>/i) || [''])[0]
  let t = stripHtml(seg)
  const m1 = t.match(/⏱\s*\d+\s*分钟([\s\S]*)$/)
  if (m1 && m1[1].trim()) t = m1[1]
  const m2 = t.match(/📅\s*\d{4}-\d{2}-\d{2}\s*[^\s]+\s*[^\s]*([\s\S]*)$/)
  if (m2 && m2[1].trim()) t = m2[1]
  // 循环剥离模板头句子（最多 8 轮，每轮剥掉首个命中模板词的句段）
  for (let i = 0; i < 8; i++) {
    let hit = false
    for (const p of TPL_PREFIXES) {
      const m = t.match(p)
      if (m && m[0].trim() && TPL_WORDS.test(m[0])) {
        t = t.slice(m[0].length).trim()
        hit = true
        break
      }
    }
    if (!hit) break
  }
  return t
}

// 取首个像"正文段落"的文本（≥ 40 字符，含中文标点或数字；跳过「白驹全局大脑」开头与模板残留段）
const extractDesc = (text) => {
  const isTpl = (p) => /深度长文|每日更新|爆款生产线|AI\s*生成|以官方为准|每日爆款引擎/.test(p)
  const paras = text.split(/(?<=[。！？!?])/).map((p) => p.trim()).filter((p) => p.length >= 40 && !isTpl(p))
  if (!paras.length) return ''
  let d = paras.find((p) => !p.startsWith('白驹')) || paras[0]
  // 截断到 MAX_DESC 字符，按代理对安全切
  if (d.length > MAX_DESC) {
    let cut = MAX_DESC
    while (cut > 0 && (d.charCodeAt(cut) & 0xfc00) === 0xdc00) cut--
    d = d.slice(0, cut) + '…'
  }
  return d
}

// 剥离 description 开头的标题重复（模板把标题拼进正文首段）
const stripTitle = (desc, title) => {
  const t = title.replace(/\s*·\s*(白驹全局大脑|AI 创作纪元|AI 学院).*$/, '').trim()
  if (t && desc.startsWith(t)) return desc.slice(t.length).trim()
  return desc
}

// title → keywords：去品牌后缀，取主体词
const extractKeywords = (title) => {
  let t = title.replace(/·\s*白驹全局大脑.*$/, '').replace(/·\s*AI 创作纪元.*$/, '').replace(/·\s*AI 学院.*$/, ' · AI 学院')
    .replace(/\s+-\s+.*$/, '').trim()
  const parts = t.split(/[：:，,。、|]/).map((s) => s.trim()).filter((s) => s && s.length <= 20)
  const head = parts.slice(0, 3)
  // 页面类型词
  let type = ''
  const rel = ROOT
  const relPath = ''
  if (title.includes('AI 学院') || relPath.includes('ai-academy')) type = 'AI 学院'
  else if (title.includes('博客') || relPath.includes('/blog/')) type = '博客'
  else if (relPath.includes('/book/')) type = 'AI 书籍'
  const kw = [...head, type].filter(Boolean).slice(0, 4).join(',')
  return kw ? kw + ',' + BRAND_KEYWORDS : BRAND_KEYWORDS
}

// 相对 URL：以站点根为基准，百分号编码路径段（保留 /）
const relUrl = (file) => {
  let rel = path.relative(ROOT, file).split(path.sep).join('/')
  if (rel === 'index.html') return '/'
  const segs = rel.split('/').map((s) => encodeURIComponent(s))
  return '/' + segs.join('/')
}

// 页面类型 → changefreq / priority
const classify = (file) => {
  const rel = path.relative(ROOT, file).split(path.sep).join('/')
  if (rel === 'index.html') return ['daily', '1.0']
  if (rel.startsWith('blog/')) return ['daily', rel === 'blog/index.html' ? '0.9' : '0.8']
  if (rel.startsWith('website/ai-academy/')) return ['weekly', '0.8']
  if (rel.startsWith('website/ai-academy')) return ['weekly', '0.7']
  if (rel.startsWith('book/')) return ['monthly', '0.7']
  if (rel.startsWith('lab/')) return ['weekly', '0.6']
  return ['weekly', '0.6']
}

const ymd = (ts) => { const d = new Date(ts); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` }
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
// JSON-LD 安全序列化：转义 < 防止 </script> 注入
const ldStr = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c')

// JSON-LD：首页 WebSite
const buildWebSiteLd = (desc) => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_TITLE,
  url: SITE_BASE,
  description: desc || '白驹全局大脑：把散落的 AI 工具装进一个大脑——本地优先、开箱即用、数据不出本机。',
  inLanguage: 'zh-CN',
  potentialAction: { '@type': 'SearchAction', target: `${SITE_BASE}/?q={search_term_string}`, 'query-input': 'required name=search_term_string' }
})

// JSON-LD：博客 BlogPosting（datePublished 用文件 mtime，不编造）
const buildBlogPostingLd = (title, desc, url, date) => ({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: title,
  description: desc,
  url,
  mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  image: SITE_BASE + DEFAULT_OG_IMAGE,
  datePublished: date,
  author: { '@type': 'Organization', name: BRAND_NAME },
  publisher: { '@type': 'Organization', name: BRAND_NAME }
})

// ---------- 主流程 ----------
const files = walkHtml(ROOT)
let fixedDesc = 0, fixedKw = 0, hasDesc = 0, hasKw = 0, changed = 0
let fixedCanonical = 0, fixedOgTitle = 0, fixedOgImage = 0, fixedOgUrl = 0
let fixedTwCard = 0, fixedTwTitle = 0, fixedTwDesc = 0, fixedTwImg = 0
let fixedJsonLd = 0, dedupOgDesc = 0

// 0. 清理 description/og:description 中嵌入的 HTML 标签（模板图标残留，如 <i class="cc-ic">），
//    避免后续 content 正则被标签内引号/尖括号截断导致 meta 结构损坏。
//    说明：meta description 语义上必须是纯文本，含标签即为脏数据，一律剥除。
const cleanMetaValue = (s) => stripHtml(s).replace(/<[^>]*$/g, ' ').replace(/\s+/g, ' ').trim()
const cleanDescMeta = (h) => h.replace(
  // .* 行内贪婪到该行最后一个 "> 前（meta 独占一行），保留完整 content 供剥标签；
  // 严禁用 [\s\S]*（会跨行吞掉整页），也避免在 content 内嵌标签的 "> 处提前截断丢内容
  // 覆盖 name / og: / twitter: 三种 description 变体
  /(<meta\s+(?:name|property)=["'](?:og:|twitter:)?description["'][^>]*content=["'])(.*)(["']\s*>[^\n]*)/gi,
  (_, a, b) => a + cleanMetaValue(b) + '">'
)

for (const f of files) {
  let html = cleanDescMeta(fs.readFileSync(f, 'utf8'))
  let org = html
  const titleM = html.match(/<title>([\s\S]*?)<\/title>/i)
  const title = titleM ? stripHtml(titleM[1]) : ''
  const rel = path.relative(ROOT, f).split(path.sep).join('/')
  const url = SITE_BASE + relUrl(f)

  // 1. description（含脏摘要检测：旧模板残留「深度长文」占位词 / 超长拼接垃圾 → 视为不合格重写）
  const isDirty = (s) => s.length > 220 || /深度长文/.test(s) || /每日更新\s*[📘🧭🚀]/.test(s) || /每日爆款引擎/.test(s) || /undefined|加载中/.test(s) || /<[a-z]/.test(s) || />/.test(s) || /AI\s*生成\s*[··]\s*(以官方为准|信息以官方为准)/.test(s) || /爆款生产线/.test(s)
  const descM = html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i)
  const curDesc = descM ? descM[1] : ''
  if (curDesc.length < MIN_DESC || isDirty(curDesc)) {
    const desc = stripTitle(extractDesc(bodyText(html)), title)
    if (desc.length >= MIN_DESC) {
      if (descM) {
        html = html.replace(/<meta\s+name=["']description["']\s+content=["'][\s\S]*?["']\s*>/i, `<meta name="description" content="${esc(desc)}">`)
      } else if (/<head>/i.test(html)) {
        html = html.replace(/<head>/i, `<head>\n<meta name="description" content="${esc(desc)}">`)
      }
      fixedDesc++
    }
  } else { hasDesc++ }

  // 2. keywords
  const kwM = html.match(/<meta\s+name=["']keywords["']\s+content=["']([\s\S]*?)["']/i)
  if (!kwM && title) {
    const kw = extractKeywords(title)
    if (/<head>/i.test(html)) {
      html = html.replace(/<head>/i, `<head>\n<meta name="keywords" content="${esc(kw)}">`)
      fixedKw++
    }
  } else if (kwM) { hasKw++ }

  // 3. og:description 同步（缺失 或 为脏摘要 → 用最新 description 补/替换，社交分享摘要）
  const newDescM = html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i)
  const ogM = html.match(/<meta\s+property=["']og:description["']\s+content=["']([\s\S]*?)["']/i)
  if (newDescM && newDescM[1].length >= MIN_DESC) {
    if (!ogM || isDirty(ogM[1])) {
      if (ogM) {
        html = html.replace(/<meta\s+property=["']og:description["']\s+content=["'][\s\S]*?["']\s*>/i, `<meta property="og:description" content="${esc(newDescM[1])}">`)
      } else if (/<head>/i.test(html)) {
        html = html.replace(/<head>/i, `<head>\n<meta property="og:description" content="${esc(newDescM[1])}">`)
      }
    }
  }

  // 当前 description（可能已被上面更新）
  const descNowM = html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i)
  const descNow = descNowM ? descNowM[1] : ''

  // 4. 去重错误的 <meta name="og:description">（OG 协议用 property=，name= 是误写；保留 property= 版本）
  const beforeDedup = html
  html = html.replace(/<meta\s+name=["']og:description["'][^>]*>\s*/gi, '')
  if (html !== beforeDedup) dedupOgDesc++

  // 5-6. 幂等补齐 canonical / og:* / twitter:*（已有则跳过）
  const adds = []
  const ensure = (testRe, tag) => { if (!testRe.test(html)) { adds.push(tag); return true } return false }
  if (ensure(/rel=["']canonical["']/i, `<link rel="canonical" href="${esc(url)}">`)) fixedCanonical++
  if (title && ensure(/property=["']og:title["']/i, `<meta property="og:title" content="${esc(title)}">`)) fixedOgTitle++
  if (ensure(/property=["']og:image["']/i, `<meta property="og:image" content="${DEFAULT_OG_IMAGE}">`)) fixedOgImage++
  if (ensure(/property=["']og:url["']/i, `<meta property="og:url" content="${esc(url)}">`)) fixedOgUrl++
  if (ensure(/name=["']twitter:card["']/i, `<meta name="twitter:card" content="summary_large_image">`)) fixedTwCard++
  if (title && ensure(/name=["']twitter:title["']/i, `<meta name="twitter:title" content="${esc(title)}">`)) fixedTwTitle++
  if (descNow.length >= MIN_DESC && ensure(/name=["']twitter:description["']/i, `<meta name="twitter:description" content="${esc(descNow)}">`)) fixedTwDesc++
  if (ensure(/name=["']twitter:image["']/i, `<meta name="twitter:image" content="${DEFAULT_OG_IMAGE}">`)) fixedTwImg++

  // 8. JSON-LD 结构化数据（已有 ld+json 则跳过，不重复）
  if (!/application\/ld\+json/i.test(html)) {
    if (rel === 'index.html') {
      adds.push(`<script type="application/ld+json">${ldStr(buildWebSiteLd(descNow))}</script>`)
      fixedJsonLd++
    } else if (rel.startsWith('blog/') && rel !== 'blog/index.html') {
      adds.push(`<script type="application/ld+json">${ldStr(buildBlogPostingLd(title, descNow, url, ymd(fs.statSync(f).mtimeMs)))}</script>`)
      fixedJsonLd++
    }
  }

  // 一次性插入到 </head> 前（无 </head> 则退回 <head> 后）
  if (adds.length) {
    const block = adds.join('\n')
    if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, `${block}\n</head>`)
    } else if (/<head>/i.test(html)) {
      html = html.replace(/<head>/i, `<head>\n${block}`)
    }
  }

  if (html !== org) {
    if (!DRY) fs.writeFileSync(f, html, 'utf8')
    changed++
    console.log('✓', path.relative(ROOT, f))
  }
}

// ---------- 3. sitemap.xml ----------
const urlset = files.map((f) => {
  const st = fs.statSync(f)
  const [cf, pr] = classify(f)
  return `  <url>\n    <loc>${esc(SITE_BASE + relUrl(f))}</loc>\n    <lastmod>${ymd(st.mtimeMs)}</lastmod>\n    <changefreq>${cf}</changefreq>\n    <priority>${pr}</priority>\n  </url>`
}).join('\n')
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlset}\n</urlset>\n`
if (!DRY) fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap, 'utf8')

// ---------- 4. rss.xml（blog 博文，mtime 倒序） ----------
const blogFiles = files.filter((f) => f.startsWith(path.join(ROOT, 'blog')) && path.basename(f) !== 'index.html')
  .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
const items = blogFiles.map((f) => {
  const html = fs.readFileSync(f, 'utf8')
  const t = (html.match(/<title>([\s\S]*?)<\/title>/i) || ['', path.basename(f, '.html')])[1]
  const title = stripHtml(t).replace(/\s*·\s*(白驹全局大脑|AI 创作纪元).*$/, '').trim() || path.basename(f, '.html')
  const d = html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i)
  const desc = d ? d[1] : (stripHtml((html.match(/<article[\s>][\s\S]*?<\/article>/i) || [''])[0]).slice(0, MAX_DESC) + '…')
  const st = fs.statSync(f)
  return `  <item>\n    <title>${esc(title)}</title>\n    <link>${esc(SITE_BASE + relUrl(f))}</link>\n    <description>${esc(desc)}</description>\n    <pubDate>${new Date(st.mtimeMs).toUTCString()}</pubDate>\n    <guid isPermaLink="false">${esc(SITE_BASE + relUrl(f))}</guid>\n  </item>`
}).join('\n')
const rss = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n  <title>${esc(SITE_TITLE)} · 博客</title>\n  <link>${esc(SITE_BASE)}/blog/</link>\n  <description>${esc(SITE_TITLE)}：AI 创业、工具实测、学习路线、行业洞察深度长文。</description>\n  <atom:link href="${esc(SITE_BASE)}/rss.xml" rel="self" type="application/rss+xml"/>\n${items}\n</channel>\n</rss>\n`
if (!DRY) fs.writeFileSync(path.join(ROOT, 'rss.xml'), rss, 'utf8')

// ---------- 5. robots.txt ----------
const robots = `User-agent: *\nAllow: /\n\nSitemap: ${SITE_BASE}/sitemap.xml\n`
if (!DRY) fs.writeFileSync(path.join(ROOT, 'robots.txt'), robots, 'utf8')

// ---------- 报告 ----------
console.log('========== B1 SEO 生成报告 ==========')
console.log(`页面总数：${files.length}`)
console.log(`补 description：${fixedDesc}（已有合格 ${hasDesc}）`)
console.log(`补 keywords：${fixedKw}（已有 ${hasKw}）`)
console.log(`去重 og:description(name=)：${dedupOgDesc}`)
console.log(`补 canonical：${fixedCanonical}`)
console.log(`补 og:title：${fixedOgTitle} | og:image：${fixedOgImage} | og:url：${fixedOgUrl}`)
console.log(`补 twitter:card：${fixedTwCard} | title：${fixedTwTitle} | desc：${fixedTwDesc} | image：${fixedTwImg}`)
console.log(`补 JSON-LD：${fixedJsonLd}（首页 WebSite + 博客 BlogPosting）`)
console.log(`改动的页面：${changed}`)
console.log(`sitemap.xml：${files.length} 条 URL → ${DRY ? '(dry)' : '已生成'}`)
console.log(`rss.xml：${blogFiles.length} 篇博文 → ${DRY ? '(dry)' : '已生成'}`)
console.log(`robots.txt → ${DRY ? '(dry)' : '已生成'}`)
console.log(`基址：${SITE_BASE}`)
