// review-content.mjs — 二轮审查工具（零依赖）
// 用法：node scripts/review-content.mjs [all|links|sources|news] [--json]
// 审查维度：
//   1. sources —— 所有内容页是否带「出处/诚实标注」区块（缺的列出）
//   2. links   —— 内容页外链 HTTP 探测可达性（失效列出）
//   3. news    —— data/news.js 是否带 AI 生成声明、日期合法性
//   4. all     —— 全部跑一遍
// 输出：通过/不通过 报告。自动化任务在发布前必须跑本工具，未通过不得上线。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const args = process.argv.slice(2)
const mode = args.find((a) => !a.startsWith('--')) || 'all'
const asJson = args.includes('--json')

// 强标记判定：必须出现固定区块/徽章才算「有诚实标注」，避免正文里的「来源/参考」等词误判
const HONEST_MARKERS = ['AI 生成 · 以官方为准', 'AI 生成', '以官方为准', '出处声明', '项目出处与许可', '项目出处']
const SRC_MARKERS = ['出处声明', '项目出处与许可', '项目出处', 'blog-attribution', 'proj-attribution']

function walk(dir, exts, skip = []) {
  const out = []
  for (const f of fs.readdirSync(dir)) {
    if (skip.includes(f)) continue
    const fp = path.join(dir, f)
    const st = fs.statSync(fp)
    if (st.isDirectory()) out.push(...walk(fp, exts, skip))
    else if (exts.some((e) => f.endsWith(e))) out.push(fp)
  }
  return out
}

// ---------- 1) 内容页诚实标注/出处检查 ----------
function checkSources() {
  const issues = []
  let total = 0
  const dirs = [
    path.join(ROOT, 'blog'),
    path.join(ROOT, 'website/ai-academy'),
    path.join(ROOT, 'website/ai-academy/projects'),
    path.join(ROOT, 'website/book/pages'),
    path.join(ROOT, 'book/五卷全书'),
  ]
  for (const d of dirs) {
    if (!fs.existsSync(d)) continue
    const pages = walk(d, ['.html'], ['index.html'])
    for (const fp of pages) {
      total++
      const html = fs.readFileSync(fp, 'utf8')
      const hasHonest = HONEST_MARKERS.some((m) => html.includes(m))
      const hasSrc = SRC_MARKERS.some((m) => html.includes(m))
      if (!hasHonest && !hasSrc) {
        issues.push('缺诚实/出处标注: ' + path.relative(ROOT, fp))
      }
    }
  }
  return { total, issues }
}

// ---------- 2) 外链可达性 ----------
async function checkLinks() {
  const issues = []
  let checked = 0
  const dirs = [path.join(ROOT, 'blog'), path.join(ROOT, 'website/ai-academy')]
  const seen = new Set()
  for (const d of dirs) {
    if (!fs.existsSync(d)) continue
    for (const fp of walk(d, ['.html'], ['index.html'])) {
      const html = fs.readFileSync(fp, 'utf8')
      const urls = [...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => m[1])
      for (const u of urls) {
        if (seen.has(u)) continue
        seen.add(u)
        checked++
        try {
          const ctrl = new AbortController()
          const t = setTimeout(() => ctrl.abort(), 10000)
          const r = await fetch(u, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal })
          clearTimeout(t)
          if (r.status >= 400) issues.push(`${r.status} ${u}`)
        } catch (e) {
          issues.push(`✗ ${u} (${e.name || e.message})`)
        }
      }
    }
  }
  return { checked, issues }
}

// ---------- 3) 新闻诚实性 ----------
function checkNews() {
  const issues = []
  const fp = path.join(ROOT, 'data/news.js')
  if (!fs.existsSync(fp)) return { issues: ['data/news.js 不存在'] }
  const raw = fs.readFileSync(fp, 'utf8')
  if (!raw.includes('AI 生成')) issues.push('news.js 头部缺 AI 生成声明')
  const dates = [...raw.matchAll(/"date": "(\d{4}-\d{2}-\d{2})"/g)].map((m) => m[1])
  if (!dates.length) issues.push('news.js 未解析到日期')
  const bad = dates.filter((d) => !/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(d))
  if (bad.length) issues.push('非法日期: ' + bad.join(','))
  return { count: dates.length, issues }
}

// ---------- 主流程 ----------
const report = { mode, ts: new Date().toISOString(), passed: true, sections: {} }

if (mode === 'sources' || mode === 'all') {
  const r = checkSources()
  report.sections.sources = { total: r.total, issues: r.issues.slice(0, 40) }
  if (r.issues.length) report.passed = false
}
if (mode === 'links' || mode === 'all') {
  const r = await checkLinks()
  report.sections.links = { checked: r.checked, issues: r.issues.slice(0, 40) }
  if (r.issues.length) report.passed = false
}
if (mode === 'news' || mode === 'all') {
  const r = checkNews()
  report.sections.news = { count: r.count, issues: r.issues }
  if (r.issues.length) report.passed = false
}

if (asJson) {
  console.log(JSON.stringify(report, null, 2))
} else {
  console.log(`\n🔍 二轮审查报告 · ${report.ts}`)
  console.log('================================')
  if (report.sections.sources) {
    console.log(`\n📄 内容诚实/出处: 检查 ${report.sections.sources.total} 页, 问题 ${report.sections.sources.issues.length} 个`)
    report.sections.sources.issues.forEach((i) => console.log('   ⚠️ ' + i))
  }
  if (report.sections.links) {
    console.log(`\n🔗 外链可达: 探测 ${report.sections.links.checked} 条, 问题 ${report.sections.links.issues.length} 个`)
    report.sections.links.issues.forEach((i) => console.log('   ⚠️ ' + i))
  }
  if (report.sections.news) {
    console.log(`\n📰 新闻诚实: ${report.sections.news.count} 条, 问题 ${report.sections.news.issues.length} 个`)
    report.sections.news.issues.forEach((i) => console.log('   ⚠️ ' + i))
  }
  console.log('\n================================')
  console.log(report.passed ? '✅ 审查通过，可发布' : '❌ 审查未通过，需修复后重跑')
  process.exit(report.passed ? 0 : 1)
}
