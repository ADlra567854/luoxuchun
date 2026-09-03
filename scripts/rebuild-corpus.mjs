// 重建 _corpus.html：保留原有书稿，补入站内各专题页文本 + 100 个开源作品，
// 让白驹全局大脑能答全站内容（书稿/案例/提示词/工具 搞全）。
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const CORPUS_F = path.join(ROOT, 'website', '_corpus.html')
const MARK = 'window.BJ_CORPUS='

const raw = fs.readFileSync(CORPUS_F, 'utf8')
const mi = raw.indexOf(MARK)
const si = raw.indexOf('</script>', mi)
if (mi < 0 || si < 0) { console.error('无法定位语料边界'); process.exit(1) }

// 取 JSON 片段：去首尾空白，去掉可能存在的尾分号（浏览器合法的 ";"，非严格 JSON）
let sub = raw.slice(mi + MARK.length, si).trim()
if (sub.endsWith(';')) sub = sub.slice(0, -1)
const obj = JSON.parse(sub)
console.log('现有书稿:', Object.keys(obj).length, '部')

// HTML → 纯文本（并转义 </script>，避免浏览器加载时提前闭合 script 标签）
function html2text(file) {
  let h = fs.readFileSync(file, 'utf8')
  h = h.replace(/<script[\s\S]*?<\/script>/gi, ' ')
  h = h.replace(/<style[\s\S]*?<\/style>/gi, ' ')
  h = h.replace(/<[^>]+>/g, '\n')
  h = h.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  h = h.replace(/<\/script>/gi, '<\\/script>')           // 关键：防提前闭合
  h = h.replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim()
  return h.slice(0, 40000)
}

const PAGES = [
  ['漫剧指南', 'website/manju.html'], ['AI赚钱攻略', 'website/ai-money.html'],
  ['AI赋能教育', 'website/ai-edu.html'], ['AI赋能就业', 'website/ai-jobs.html'],
  ['提示词实战指南', 'website/prompts-guide.html'], ['AI性格测试', 'website/personality.html'],
  ['教程视频', 'website/videos.html'], ['实战案例库', 'website/cases.html'],
  ['行业实战手册', 'website/industry.html'], ['FAQ五十问', 'website/faq.html'],
  ['AI安全指南', 'website/security.html'], ['本地部署手册', 'website/local-deploy.html'],
  ['模型横评', 'website/models.html'], ['AI前沿全景', 'website/frontiers.html'],
  ['里程碑成果', 'website/showcase.html'], ['学习路线图', 'website/roadmap.html'],
  ['开源项目', 'website/opensource.html'], ['开发者基地', 'website/devbase.html'],
  ['AI全景编年史', 'website/chronicle.html'], ['工科实训项目', 'lab/工科实训项目.html'],
]
let added = 0
for (const [name, rel] of PAGES) {
  const key = '站内·' + name
  if (obj[key]) continue
  const fp = path.join(ROOT, rel)
  if (!fs.existsSync(fp)) continue
  const txt = html2text(fp)
  if (txt.length < 200) continue
  obj[key] = '# ' + name + '\n\n' + txt
  added++; console.log('+', key, '(' + Math.round(txt.length / 1000) + 'k字)')
}

// 100 个开源作品 → 可检索条目
const pj = path.join(ROOT, 'data', 'ai-projects.json')
if (fs.existsSync(pj)) {
  const projects = JSON.parse(fs.readFileSync(pj, 'utf8'))
  const grouped = {}
  projects.forEach(p => { const t = p.tag || '其他'; (grouped[t] = grouped[t] || []).push(p) })
  let s = '# 开源作品大全（100 个真实项目，个人/团队分开）\n\n'
  s += '团队作品 ' + projects.filter(p => p.org === 'team').length + ' 个，个人作品 ' + projects.filter(p => p.org === 'person').length + ' 个。\n\n'
  for (const tag in grouped) {
    s += '## ' + tag + '（' + grouped[tag].length + '）\n'
    grouped[tag].forEach(p => { s += '- ' + p.name + '（' + p.who + '）：' + (p.desc || '') + ' 链接：' + p.url + '\n' })
    s += '\n'
  }
  obj['站内·开源作品大全'] = s.slice(0, 45000)
  console.log('+ 站内·开源作品大全 (100项目)'); added++
}

// 全局消毒：任何条目文本里的 </script> 一律转义，防止浏览器加载 _corpus.html 时提前闭合
for (const k of Object.keys(obj)) {
  obj[k] = String(obj[k]).replace(/<\/script>/gi, '<\\/script>')
}

const head = raw.slice(0, mi)
const tail = raw.slice(si)
const out = head + MARK + JSON.stringify(obj) + tail
fs.writeFileSync(CORPUS_F, out, 'utf8')

// 自检：当脚本解析
try {
  const v = JSON.parse(out.slice(out.indexOf(MARK) + MARK.length, out.indexOf('</script>', out.indexOf(MARK))))
  console.log('✅ 写出并自检通过，总书稿:', Object.keys(v).length, '部 (+' + added + ')')
} catch (e) { console.error('❌ 写出文件 JSON 非法:', e.message); process.exit(2) }
