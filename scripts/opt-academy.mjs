#!/usr/bin/env node
// ============================================================================
// opt-academy.mjs — AI学院 全站优化工具（零依赖）
//   node scripts/opt-academy.mjs nav      # 章节页注入 上一篇/下一篇 + 章节进度
//   node scripts/opt-academy.mjs badges   # 项目页注入 难度/时长 徽章
//   node scripts/opt-academy.mjs images   # 旧章节外链图下载本地化（并发 5）
//   node scripts/opt-academy.mjs all      # 依次执行以上三项
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const ACADEMY = path.join(ROOT, 'website', 'ai-academy')
const IMG_DIR = path.join(ACADEMY, 'assets', 'img')

const titleOf = (f) => {
  const html = fs.readFileSync(f, 'utf8')
  const m = html.match(/<title>([^<]*)<\/title>/)
  return m ? m[1].split('·')[0].trim() : path.basename(f)
}

// ---------- 1) 章节 上一篇/下一篇 导航 ----------
function addChapterNav() {
  const files = fs.readdirSync(ACADEMY).filter((f) => /^chapter-(\d+)\.html$/.test(f))
    .map((f) => ({ num: parseInt(f.match(/^chapter-(\d+)/)[1], 10), f, title: titleOf(path.join(ACADEMY, f)) }))
    .sort((a, b) => a.num - b.num)
  let done = 0
  for (let i = 0; i < files.length; i++) {
    const cur = files[i]
    const prev = files[i - 1]
    const next = files[i + 1]
    const fp = path.join(ACADEMY, cur.f)
    let html = fs.readFileSync(fp, 'utf8')
    if (html.includes('chapter-nav')) continue
    const prevLink = prev
      ? `<a href="chapter-${String(prev.num).padStart(2, '0')}.html" style="color:var(--blue);font-weight:700;font-size:13.5px"><i class="cc-ic" data-ic="chevron-left" aria-hidden="true"></i> 上一章：${prev.title}</a>`
      : `<span style="color:var(--muted);font-size:13px"><i class="cc-ic" data-ic="chevron-left" aria-hidden="true"></i> 已是第一章</span>`
    const nextLink = next
      ? `<a href="chapter-${String(next.num).padStart(2, '0')}.html" style="color:var(--blue);font-weight:700;font-size:13.5px">下一章：${next.title} <i class="cc-ic" data-ic="chevron-right" aria-hidden="true"></i></a>`
      : `<span style="color:var(--muted);font-size:13px">已到最新章节（每日 20:10 自动新增）</span>`
    const nav = `
<div class="chapter-nav" style="display:flex;gap:10px;justify-content:space-between;align-items:center;flex-wrap:wrap;margin:36px 0 6px;padding:14px 16px;border:1px solid var(--line);border-radius:14px;background:var(--card)">
  ${prevLink}
  <a href="../../website/ai-academy.html" style="color:var(--muted);font-weight:600;font-size:12.5px"><i class="cc-ic" data-ic="graduation-cap" aria-hidden="true"></i> 学院首页 · 第 ${cur.num} 章 / 共 ${files.length} 章</a>
  ${nextLink}
</div>
</article>`
    html = html.replace('</article>', nav)
    fs.writeFileSync(fp, html, 'utf8')
    done++
  }
  console.log('✅ 章节导航注入：' + done + ' 章（共 ' + files.length + ' 章）')
}

// ---------- 2) 项目页 难度/时长 徽章 ----------
const DIFF = {
  入门: ['办公效率', '内容创作', '营销', '求职', '教育', '心理健康', '资讯'],
  进阶: ['金融数据', '数据分析', '数据库', '数据处理', '健康', '法律服务', '服务', '出行', '学术', '运维', '多模态'],
  专家: ['开发工具', '物联网', '金融'],
}
function diffOf(cat) {
  for (const [lv, cats] of Object.entries(DIFF)) if (cats.includes(cat)) return lv
  return '进阶'
}
const HOURS = { 入门: 4, 进阶: 6, 专家: 8 }

function addProjectBadges() {
  const dir = path.join(ACADEMY, 'projects')
  if (!fs.existsSync(dir)) { console.log('⚠️ 无 projects 目录'); return }
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.html'))
  let done = 0
  for (const f of files) {
    const fp = path.join(dir, f)
    let html = fs.readFileSync(fp, 'utf8')
    if (html.includes('blog-tag') === false || html.includes('难度：')) continue
    const catM = html.match(/blog-tag">([^<]*)</)
    const cat = catM ? catM[1].trim() : '综合'
    const diff = diffOf(cat)
    const hours = HOURS[diff] || 6
    html = html.replace(
      /(<div class="blog-meta">[^<]*<span>📅 [^<]*<\/span>)/,
      `$1<span class="blog-tag" style="background:rgba(79,140,255,.12);color:var(--blue)">🎚 难度：${diff}</span><span class="blog-tag" style="background:rgba(56,225,255,.10);color:var(--cyan)">⏱ 约 ${hours} 小时</span>`
    )
    fs.writeFileSync(fp, html, 'utf8')
    done++
  }
  console.log('✅ 项目徽章注入：' + done + ' 个')
}

// ---------- 2.5) 章节封面 SVG（品牌渐变横幅，自包含） ----------
const coverEmoji = (title) => {
  const map = [['提示词', '🧭'], ['RAG', '📚'], ['检索', '📚'], ['微调', '⚙️'], ['部署', '⚙️'], ['多模态', '🖼️'], ['AIGC', '🖼️'], ['机器学习', '🧮'], ['深度学习', '🧮'], ['职场', '💼'], ['行业', '🏭'], ['职业', '🏭'], ['多智能体', '🤖'], ['编排', '🤖'], ['编程', '👨‍💻'], ['代码', '👨‍💻'], ['安全', '🛡️'], ['伦理', '🛡️'], ['智能体', '🐎'], ['大语言模型', '🧠'], ['LLM', '🧠']]
  for (const [k, v] of map) if (title.includes(k)) return v
  return '📘'
}
const coverSvg = (num, title, desc) => `<svg viewBox="0 0 1200 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="第${num}章 ${title}" style="width:100%;height:auto;border-radius:16px;margin:0 0 22px;box-shadow:0 10px 28px rgba(31,45,77,.15)">
  <defs>
    <linearGradient id="covGrad${num}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#4f8cff"/><stop offset=".5" stop-color="#38b6ff"/><stop offset="1" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="240" rx="18" fill="url(#covGrad${num})"/>
  <circle cx="1120" cy="30" r="180" fill="rgba(255,255,255,.10)"/>
  <circle cx="90" cy="240" r="150" fill="rgba(255,255,255,.07)"/>
  <circle cx="600" cy="-70" r="210" fill="rgba(255,255,255,.06)"/>
  <text x="56" y="78" font-size="20" font-weight="700" fill="rgba(255,255,255,.92)" font-family="PingFang SC, Microsoft YaHei, sans-serif">AI 学院 · 第 ${num} 章 · 每日新增</text>
  <text x="56" y="142" font-size="46" font-weight="900" fill="#ffffff" font-family="PingFang SC, Microsoft YaHei, sans-serif">${title}</text>
  <text x="56" y="184" font-size="19" fill="rgba(255,255,255,.92)" font-family="PingFang SC, Microsoft YaHei, sans-serif">${desc}</text>
  <text x="1120" y="205" font-size="96" text-anchor="middle" fill="rgba(255,255,255,.92)">${coverEmoji(title)}</text>
</svg>`

function addCovers() {
  const files = fs.readdirSync(ACADEMY).filter((f) => /^chapter-(\d+)\.html$/.test(f)).sort()
  let done = 0
  for (const f of files) {
    const fp = path.join(ACADEMY, f)
    let html = fs.readFileSync(fp, 'utf8')
    if (html.includes('viewBox="0 0 1200 240"')) continue
    const num = parseInt(f.match(/^chapter-(\d+)/)[1], 10)
    const titleM = html.match(/<h1>([^<]*)<\/h1>/) || html.match(/<title>([^<]*)<\/title>/)
    const title = titleM ? titleM[1].split('·')[0].trim() : f
    const descM = html.match(/blog-divider"><\/div>[\s\S]{0,80}?<h1>/) // 无需，用 title 即可
    const cover = coverSvg(num, title, title + '：掌握可落地的 AI 技能')
    // 插到 blog-open 之后、第二个 h1 之前
    const anchor = '</div>\n<h1>第' + String(num).padStart(2, '0')
    if (html.includes(anchor)) html = html.replace(anchor, '</div>\n' + cover + '\n<h1>第' + String(num).padStart(2, '0'))
    else if (html.includes('<h1>第' + num)) html = html.replace('<h1>第' + num, cover + '\n<h1>第' + num)
    else continue
    fs.writeFileSync(fp, html, 'utf8')
    done++
  }
  console.log('✅ 章节封面注入：' + done + ' 章')
}

// ---------- 3) 外链图本地化 ----------
async function download(url, dest) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 20000)
  try {
    const r = await fetch(url, { signal: ctrl.signal })
    if (!r.ok) return false
    const buf = Buffer.from(await r.arrayBuffer())
    fs.writeFileSync(dest, buf)
    return true
  } catch { return false } finally { clearTimeout(t) }
}

async function localizeImages() {
  fs.mkdirSync(IMG_DIR, { recursive: true })
  const files = fs.readdirSync(ACADEMY).filter((f) => /^chapter-\d+\.html$/.test(f)).sort()
  const extUrls = []
  for (const f of files) {
    const html = fs.readFileSync(path.join(ACADEMY, f), 'utf8')
    const imgs = html.match(/<img[^>]+src="(https?:\/\/[^"]+)"/g) || []
    for (const im of imgs) {
      const src = (im.match(/src="([^"]+)"/) || [])[1]
      if (src && /^https?:/.test(src) && !/icon\.svg/.test(src)) extUrls.push({ f, src })
    }
  }
  console.log('🔍 待本地化外链图：' + extUrls.length + ' 张')
  let ok = 0, fail = 0
  const seen = {}
  let idx = 0
  const concurrency = 5
  async function worker() {
    while (idx < extUrls.length) {
      const item = extUrls[idx++]
      const ext = (path.extname(item.src).split('?')[0] || '.png').slice(0, 8)
      const name = 'img-' + String(ok + 1).padStart(3, '0') + ext
      // 去重：同 url 复用
      if (seen[item.src]) {
        const rel = '../../website/ai-academy/assets/img/' + seen[item.src]
        const fp = path.join(ACADEMY, item.f)
        let html = fs.readFileSync(fp, 'utf8')
        html = html.split(item.src).join(rel)
        fs.writeFileSync(fp, html, 'utf8')
        continue
      }
      const dest = path.join(IMG_DIR, name)
      if (await download(item.src, dest)) {
        seen[item.src] = name
        ok++
        const rel = '../../website/ai-academy/assets/img/' + name
        const fp = path.join(ACADEMY, item.f)
        let html = fs.readFileSync(fp, 'utf8')
        html = html.split(item.src).join(rel)
        fs.writeFileSync(fp, html, 'utf8')
      } else {
        fail++
        console.log('  ⚠️ 下载失败：' + item.src.slice(0, 90))
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  console.log('📊 外链图本地化：成功 ' + ok + ' · 失败 ' + fail)
}

// ---------- 主流程 ----------
const cmd = process.argv[2] || 'all'
;(async () => {
  if (cmd === 'nav' || cmd === 'all') { console.log('\n📄 章节导航'); addChapterNav() }
  if (cmd === 'badges' || cmd === 'all') { console.log('\n🎖 项目徽章'); addProjectBadges() }
  if (cmd === 'covers' || cmd === 'all') { console.log('\n🖼 章节封面'); addCovers() }
  if (cmd === 'images' || cmd === 'all') { console.log('\n🖼 外链图本地化'); await localizeImages() }
  console.log('\n🏁 优化完成')
})()
