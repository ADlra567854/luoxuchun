// 修复全站断链：.md → .html；删除指向不存在文件的链接
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs'
import { join, dirname, resolve, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

function walkHtml(dir, out) {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e)
    if (statSync(full).isDirectory()) { if (!e.startsWith('.')) walkHtml(full, out); continue }
    if (e.endsWith('.html')) out.push(full)
  }
  return out
}

function resolveTarget(fromFile, u) {
  if (u.startsWith('/')) return normalize(join(ROOT, u.replace(/^\//, '')))
  return normalize(resolve(dirname(fromFile), decodeURIComponent(u)))
}

let fixed = 0
const files = walkHtml(ROOT, [])
for (const f of files) {
  let html = readFileSync(f, 'utf-8')
  let changed = false
  // 1) .md 内部链接 → .html（若对应 html 存在）
  html = html.replace(/(href|src)\s*=\s*["']([^"']+?\.md)(["'])/gi, (all, attr, u, q) => {
    if (u.startsWith('http')) return all
    const target = resolveTarget(f, u)
    const alt = target.replace(/\.md$/i, '.html')
    if (existsSync(alt)) { changed = true; return attr + '=' + q + u.replace(/\.md$/i, '.html') + q }
    return all
  })
  // 2) 删除指向不存在文件的链接（保留非内部链接）
  html = html.replace(/<(a|link)\s+[^>]*?(href)\s*=\s*["']([^"']+)["'][^>]*>/gi, (tag, tagName, attrName, u) => {
    if (u.startsWith('http') || u.startsWith('#') || u.startsWith('data:') || u.startsWith('javascript:') || u.startsWith('mailto:')) return tag
    if (u.includes('${') || u.includes('$2') || u.includes('$1')) return tag   // 模板/正则引用，跳过
    const target = resolveTarget(f, u)
    if (existsSync(target)) return tag
    changed = true
    return ''   // 删除该标签
  })
  if (changed) { writeFileSync(f, html, 'utf-8'); fixed++; console.log('修复 ✓', f.replace(ROOT, '.')) }
}
console.log('修复完成：' + fixed + ' 个文件')
