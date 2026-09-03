// 扫描全站 HTML 的内部链接（href/src），找出打不开的（404）
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, dirname, resolve, normalize, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

function walkHtml(dir, out) {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e)
    // 归档/构建副本/依赖目录不参与站点断链统计
    if (statSync(full).isDirectory()) {
      if (!e.startsWith('.') && !['node_modules', '_archive', '_internal', 'deploy'].includes(e)) walkHtml(full, out)
      continue
    }
    if (e.endsWith('.html')) out.push(full)
  }
  return out
}

const files = walkHtml(ROOT, [])
const broken = []
const seen = new Set()

for (const f of files) {
  const html = readFileSync(f, 'utf-8')
  const rel = f.replace(ROOT, '').replace(/\\/g, '/')
  const re = /(?:href|src)\s*=\s*["']([^"']+)["']/g
  let m
  while ((m = re.exec(html)) !== null) {
    let u = m[1]
    if (!u || u.startsWith('#') || u.startsWith('http://') || u.startsWith('https://')
      || u.startsWith('data:') || u.startsWith('javascript:') || u.startsWith('mailto:') || u.startsWith('tel:')) continue
    // 去掉 query/hash
    u = u.split(/[?#]/)[0]
    if (!u) continue
    let target
    // 中文/特殊字符路径：decodeURIComponent 可能抛 URIError（如含裸 %），容错回退原始串
    let dec = u
    try { dec = decodeURIComponent(u) } catch { dec = u }
    if (u.startsWith('/')) target = join(ROOT, dec.replace(/^\//, ''))
    else target = resolve(dirname(f), dec)
    target = normalize(target)
    if (seen.has(target)) continue
    seen.add(target)
    if (!existsSync(target)) {
      broken.push({ from: rel, link: m[1], target: target.replace(ROOT, '') })
    }
  }
}

console.log('扫描 HTML 文件数:', files.length, '| 内部链接数:', seen.size)
if (!broken.length) { console.log('✅ 全部链接可用'); process.exit(0) }
console.log('❌ 断链 ' + broken.length + ' 处：')
broken.forEach((b) => console.log(' ', b.from, '→', b.link))
