// 全站 SEO 优化：title 加 ccowork 前缀 + 补 meta description + meta viewport/theme-color 检查
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../website', import.meta.url))

function walkHtml(dir, out) {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e)
    if (statSync(full).isDirectory()) { if (!e.startsWith('.')) walkHtml(full, out); continue }
    if (e.endsWith('.html')) out.push(full)
  }
  return out
}

const DESC = 'ccowork · AI 全能工作台：智能体对话、AI 漫剧、绘画生图、简历刷题、天气新闻、全生态知识库，模型内置开箱即用。'
let fixed = 0, skipped = 0

for (const f of walkHtml(ROOT, [])) {
  let html = readFileSync(f, 'utf-8')
  let changed = false

  // 1. title：加 ccowork 前缀（保留原标题语义）
  if (/<title>(?!ccowork)[^<]*<\/title>/.test(html)) {
    html = html.replace(/<title>([^<]*)<\/title>/, function(_, t){
      changed = true
      return '<title>ccowork · ' + t.replace(/^AI 创作纪元 · /, '') + '</title>'
    })
  }
  // 2. meta description：缺失则补
  if (!/<meta\s+name="description"/i.test(html) && /<head>/i.test(html)) {
    html = html.replace(/<head>/i, '<head>\n<meta name="description" content="' + DESC + '">')
    changed = true
  }
  // 3. og:title / og:description 基础社交标签
  if (!/<meta\s+property="og:title"/i.test(html)) {
    const m = html.match(/<title>([^<]*)<\/title>/)
    if (m) {
      html = html.replace(/<head>/i, '<head>\n<meta property="og:title" content="' + m[1].replace(/"/g, '&quot;') + '">\n<meta property="og:description" content="' + DESC.replace(/"/g, '&quot;') + '">')
      changed = true
    }
  }

  if (changed) { writeFileSync(f, html, 'utf-8'); fixed++; console.log('✓', f.replace(ROOT, '.')) }
  else skipped++
}
console.log('完成：优化 ' + fixed + ' 个页面，跳过 ' + skipped + ' 个')
