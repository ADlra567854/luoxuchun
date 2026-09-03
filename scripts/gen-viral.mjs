#!/usr/bin/env node
// ============================================================================
// gen-viral.mjs — 爆款内容生产线（零依赖 · 豆包驱动）
//   node scripts/gen-viral.mjs hooks <主题>     # 生成 10 个爆款标题+钩子
//   node scripts/gen-viral.mjs blog <主题>      # 生成 1 篇爆款博文（hook 标题+结构）
//   node scripts/gen-viral.mjs vids <主题>      # 生成 1 条 60s 爆款短视频分镜脚本
//   node scripts/gen-viral.mjs seed             # 爆款选题入库（editorial-calendar.js 追加）
//   --dry                                        # 试跑不落盘
// 铁律：不编造——只用真实工具/事实；标题可夸张但内容必须站得住，全文带 AI 生成标注。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const BLOG = path.join(ROOT, 'blog')
const DATA = path.join(ROOT, 'data')

const today = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` }
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const readEnv = () => {
  const raw = fs.readFileSync(path.join(ROOT, '.env'), 'utf8')
  const val = (k) => { const m = raw.match(new RegExp('^\\s*' + k + '\\s*=\\s*(.+?)\\s*$', 'm')); return m ? m[1].trim().replace(/^["\']|["\']$/g, '') : '' }
  return { ark: val('ARK_API_KEY'), deepseek: val('DEEPSEEK_API_KEY') }
}

async function askLLM(env, sys, user, maxTokens = 4200) {
  const prov = env.ark
    ? { key: env.ark, url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', model: 'doubao-seed-2-1-pro-260628' }
    : { key: env.deepseek, url: 'https://api.deepseek.com/chat/completions', model: 'deepseek-chat' }
  if (!prov.key) throw new Error('未配置 LLM 密钥')
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 120000)
  try {
    const r = await fetch(prov.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + prov.key },
      body: JSON.stringify({ model: prov.model, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], temperature: 0.8, max_tokens: maxTokens, thinking: { type: 'disabled' } }),
      signal: ctrl.signal,
    })
    if (!r.ok) throw new Error('LLM API ' + r.status + ': ' + (await r.text()).slice(0, 150))
    return (await r.json()).choices?.[0]?.message?.content || ''
  } finally { clearTimeout(timer) }
}

function mdToHtml(md) {
  const lines = String(md).replace(/\r\n/g, '\n').split('\n')
  let h = '', code = false, buf = [], ul = false, ol = false
  const inline = (s) => String(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  const closeLists = () => { h += ul ? '</ul>\n' : ''; ul = false; h += ol ? '</ol>\n' : ''; ol = false }
  // GFM 管道表格 → 带内联样式的 <table>（截图锚点），修复 2026-09-03 前表格被当普通段落输出 bug
  const isSep = (s) => /^\|?[\s:|-]+\|[\s:|-]*$/.test(s) && s.includes('|') && !/[^|\s:-]/.test(s.replace(/\|/g, ''))
  const parseRow = (s) => s.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())
  const tdStyle = 'padding:9px 12px;border-bottom:1px solid var(--line);color:var(--text);text-align:left'
  const thStyle = 'padding:9px 12px;border-bottom:1px solid var(--line);background:rgba(255,140,90,.13);color:var(--gold);text-align:left;font-weight:700'
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const t = raw.trim()
    if (t.startsWith('```')) { if (code) { h += '<pre><code>' + esc(buf.join('\n')) + '</code></pre>\n'; buf = []; code = false } else { closeLists(); code = true } continue }
    if (code) { buf.push(raw); continue }
    if (!t) { closeLists(); continue }
    if (/^#{1,3}\s/.test(t)) { const m = t.match(/^(#{1,3})\s+(.*)$/); const lv = Math.min(m[1].length, 3); closeLists(); h += '<h' + lv + '>' + inline(m[2]) + '</h' + lv + '>\n'; continue }
    if (/^[-*]\s+/.test(t)) { if (!ul) { h += '<ul>\n'; ul = true } h += '<li>' + inline(t.replace(/^[-*]\s+/, '')) + '</li>\n'; continue }
    if (/^\d+[.、]\s+/.test(t)) { if (!ol) { h += '<ol>\n'; ol = true } h += '<li>' + inline(t.replace(/^\d+[.、]\s+/, '')) + '</li>\n'; continue }
    // 表格：本行含 | 且下一行是分隔行
    if (t.includes('|') && i + 1 < lines.length && isSep(lines[i + 1].trim())) {
      const rows = [parseRow(t)]
      i++ // 跳过分隔行
      while (i + 1 < lines.length) {
        const nxt = lines[i + 1].trim()
        if (!nxt.includes('|')) break
        rows.push(parseRow(nxt)); i++
      }
      const cols = rows[0].length
      const ths = rows[0].map((c) => '<th style="' + thStyle + '">' + inline(c) + '</th>').join('')
      const trs = rows.slice(1).map((r) => {
        const tds = Array.from({ length: cols }, (_, ci) => '<td style="' + tdStyle + (ci === 0 ? ';font-weight:700;color:var(--cyan)' : '') + '">' + inline(r[ci] || '') + '</td>').join('')
        return '<tr>' + tds + '</tr>'
      }).join('')
      closeLists()
      h += '<table style="width:100%;border-collapse:collapse;margin:12px 0 20px;font-size:14px;line-height:1.6;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--card)">' +
           '<thead><tr>' + ths + '</tr></thead><tbody>' + trs + '</tbody></table>\n'
      continue
    }
    h += '<p>' + inline(t) + '</p>\n'
  }
  h += ul ? '</ul>\n' : ''; h += ol ? '</ol>\n' : ''
  if (code) h += '<pre><code>' + esc(buf.join('\n')) + '</code></pre>\n'
  return h.trim()
}

const coverSvg = (title) => `<svg viewBox="0 0 1200 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(title)}" style="width:100%;height:auto;border-radius:16px;margin:0 0 24px;box-shadow:0 10px 28px rgba(0,0,0,.35)">
  <defs><linearGradient id="vg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f5c26b"/><stop offset=".5" stop-color="#ff8c5a"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs>
  <rect width="1200" height="240" rx="18" fill="url(#vg)"/>
  <circle cx="1120" cy="30" r="180" fill="rgba(255,255,255,.12)"/>
  <circle cx="90" cy="240" r="150" fill="rgba(255,255,255,.08)"/>
  <text x="56" y="82" font-size="20" font-weight="700" fill="rgba(255,255,255,.92)" font-family="PingFang SC, Microsoft YaHei, sans-serif">🔥 爆款生产线 · 白驹全局大脑</text>
  <text x="56" y="146" font-size="40" font-weight="900" fill="#ffffff" font-family="PingFang SC, Microsoft YaHei, sans-serif">${esc(title.slice(0, 20))}</text>
  <text x="56" y="186" font-size="17" fill="rgba(255,255,255,.92)" font-family="PingFang SC, Microsoft YaHei, sans-serif">AI 生成 · 信息以官方为准 · 每日爆款引擎</text>
  <text x="1120" y="205" font-size="96" text-anchor="middle" fill="rgba(255,255,255,.92)">🔥</text>
</svg>`

const blogTemplate = (title, bodyHtml) => `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} · AI 创作纪元（离线版）</title><style>
:root{--bg:#07090f;--bg2:#0c1120;--card:#111a2e;--line:#20304f;--gold:#f5c26b;--blue:#4f8cff;--cyan:#38e1ff;--purple:#8b5cf6;--text:#edf2fc;--muted:#93a3c7;--grad:linear-gradient(120deg,#f5c26b,#ff8c5a 40%,#8b5cf6)}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg);color:var(--text);font-family:"PingFang SC","Microsoft YaHei",system-ui,sans-serif;line-height:1.85}
nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:rgba(7,9,15,.92);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
nav a{color:var(--cyan);text-decoration:none;font-size:13px}
nav .logo{font-size:15px;font-weight:800;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
article{max-width:860px;margin:0 auto;padding:74px 18px 60px}
article h1{font-size:clamp(24px,4.5vw,36px);font-weight:800;line-height:1.35;margin:8px 0 20px;padding-bottom:16px;border-bottom:1px solid var(--line)}
article h2{font-size:23px;font-weight:700;margin:34px 0 12px;padding-left:13px;border-left:3px solid var(--gold)}
article h3{font-size:18px;font-weight:600;margin:26px 0 10px;color:var(--cyan)}
article p{color:#c6d2ea;font-size:15.5px;margin-bottom:15px}
article b{color:var(--text)}
article a{color:var(--gold)}
article ul,article ol{padding-left:24px;margin-bottom:16px}
article li{color:#c6d2ea;font-size:15px;margin-bottom:7px}
article code{background:#0a0f1e;border:1px solid var(--line);border-radius:6px;padding:2px 7px;color:var(--cyan);font-size:13.5px}
article pre{background:#0a0f1e;border:1px solid var(--line);border-left:3px solid var(--gold);border-radius:12px;padding:16px;overflow-x:auto;margin:18px 0}
article table{width:100%;border-collapse:collapse;margin:18px 0;font-size:13.5px}
article th,article td{padding:10px 12px;border:1px solid var(--line);text-align:left}
article th{background:#141f3a;color:var(--gold)}
article hr{border:none;border-top:1px dashed var(--line);margin:30px 0}
</style></head>
<body>
<nav><div class="logo">白驹 · ccowork</div><a href="index.html"><i class="cc-ic" data-ic="library-big" aria-hidden="true"></i> 博客目录</a></nav>
<article>
<h1>${esc(title)}</h1>
${coverSvg(title)}
${bodyHtml}
<hr>
<p style="color:var(--muted);font-size:12.5px">📌 出处声明：本页内容为白驹全局大脑 AI 生成整理，信息以官方为准；引用遵循原始许可，不侵犯原作者权益。发布时间 ${today()}。</p>
</article>
<script src="/ccowork.js"></script>
<script src="/module.js"></script>
</body></html>`

const stripJson = (s) => { let t = String(s).trim(); t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim(); const a = t.indexOf('{'), b = t.lastIndexOf('}'); return a !== -1 && b > a ? t.slice(a, b + 1) : t }

async function genViralBlog(env, topic, dry) {
  const sys = '你是爆款内容主编。你写的文章标题有钩子但不虚假，内容基于真实工具/事实、能落地；全文必须标注 AI 生成，不编造来源。只输出 Markdown 正文。'
  const user = `请为「${topic}」写一篇爆款博文。
要求：
1. 标题：一个高点击钩子（数字+利益点+反差），在正文第一行用 "## 原标题" 给出。
2. 结构：开头 60-90 字抓住痛点 → 4-6 个 "## " 小节（每节 2-3 段，穿插列表/表格/代码）→ 结尾 "## 行动清单"（5 条可立刻做的动作）。
3. 总字数 1400-2200 字。内容不编造：只用真实工具/产品/数据，拿不准标注「以官方为准」。
4. 只输出 Markdown 正文。`
  const md = await askLLM(env, sys, user)
  const titleM = md.match(/^##\s*原标题\s*[：:]\s*(.+)$/m)
  const rawTitle = titleM ? titleM[1].trim() : `${topic}：一篇真实的爆款拆解`
  const body = mdToHtml(md.replace(/^##\s*原标题\s*[：:].*\n?/m, ''))
  const safe = rawTitle.replace(/[\\/:*?"<>|]/g, ' ').trim().slice(0, 40)
  const fp = path.join(BLOG, today() + '-爆款-' + safe + '.html')
  if (fs.existsSync(fp) && !fs.existsSync(fp + '.x')) {}
  fs.writeFileSync(fp, blogTemplate(rawTitle, body), 'utf8')
  console.log('🔥 爆款博文已生成：' + path.relative(ROOT, fp))
  return fp
}

async function genVids(env, topic, dry) {
  const sys = '你是爆款短视频编导。只输出 JSON：{"title":"钩子标题","seconds":60,"shots":[{"n":1,"sec":"8s","scene":"景别","desc":"画面描述(可直接作AI视频提示词)","narration":"旁白"}],"music":"配乐建议","hook":"开场钩子句","cta":"结尾引导"}。真实可拍、不编造。'
  const user = `为主题「${topic}」写一条 60 秒爆款短视频脚本，8-10 个镜头，画面描述可作即梦/可灵的图生视频提示词。只输出 JSON。`
  const out = JSON.parse(stripJson(await askLLM(env, sys, user)))
  const file = path.join(DATA, 'viral-scripts.js')
  let list = []
  try { const raw = fs.readFileSync(file, 'utf8'); const m = raw.match(/\[([\s\S]*)\]\s*$/); if (m) list = JSON.parse(m[1]) } catch {}
  list.push({ date: today(), topic, ...out })
  fs.writeFileSync(file, '// 爆款短视频分镜脚本库（自动生成 · 真实可拍）\nwindow.VIRAL_SCRIPTS = ' + JSON.stringify(list, null, 2) + ';\n', 'utf8')
  console.log('🎬 爆款短视频分镜已入库：' + out.title + '（' + out.shots.length + ' 镜头）')
}

async function genHooks(env, topic, dry) {
  const sys = '你是爆款标题专家。只输出 JSON：{"hooks":[{"title":"标题","hook":"第一句话","angle":"角度"}]}，10 条，标题有数字/反差/利益点，不虚假。'
  const out = JSON.parse(stripJson(await askLLM(env, sys, '主题「' + topic + '」生成 10 条爆款标题+开场钩子。只输出 JSON。')))
  console.log('🔥 主题「' + topic + '」的 10 条爆款钩子：')
  out.hooks.forEach((h, i) => console.log(`  ${i + 1}. ${h.title} —— ${h.hook}`))
}

async function genSeed(env, dry) {
  const file = path.join(DATA, 'editorial-calendar.js')
  const raw = fs.readFileSync(file, 'utf8')
  const existing = (raw.match(/window\.EDITORIAL\s*=\s*\[([\s\S]*?)\]\s*\nwindow\.EDITORIAL_UPDATED/) || [])[1] || ''
  const ids = [...existing.matchAll(/id:\s*'E(\d+)'/g)].map((m) => +m[1])
  const next = ids.length ? Math.max(...ids) + 1 : 21
  const existingTitles = [...existing.matchAll(/title:\s*'([^']+)'/g)].map((m) => m[1])
  const sys = '你是爆款选题引擎。只输出 JSON：{"topics":[{"title":"选题","pillar":"P1认知学习|P2实战技能|P3行业洞察|P4职场发展|P5品牌社区","format":"格式","persona":"A|B|C","why":"爆点理由"}]}，5 个近期可能爆的 AI 选题，真实可做。'
  const user = '基于当前 AI 行业热点，生成 5 个高传播潜力选题。只输出 JSON。标题不得与下列已有选题重复：' + existingTitles.join('｜')
  const out = JSON.parse(stripJson(await askLLM(env, sys, user)))
  const seen = new Set(existingTitles)
  const fresh = out.topics.filter((t) => t && t.title && !seen.has(t.title) && !seen.has(t.title.trim()))
  const skipped = out.topics.length - fresh.length
  if (!fresh.length) { console.log('⚠️ 5 个选题全部与已有选题重复，未入库（可改天再试）'); return }
  const newItems = fresh.map((t, i) => `  { id: 'E${String(next + i).padStart(2, '0')}', title: '${t.title.replace(/'/g, '')}', pillar: '${t.pillar}', format: '${t.format}', persona: '${t.persona}', status: 'todo', why: '${(t.why || '').replace(/'/g, '')}' }`)
  const body = existing.trimEnd() + (existing.trim() ? ',\n' : '') + newItems.join(',\n') + '\n'
  fs.writeFileSync(file, raw.replace(/window\.EDITORIAL\s*=\s*\[[\s\S]*?\n\]/, 'window.EDITORIAL = [\n' + body + ']').replace(/window\.EDITORIAL_UPDATED\s*=\s*'[^']*'/, "window.EDITORIAL_UPDATED = '" + today() + "'"), 'utf8')
  console.log('📋 爆款选题入库：' + fresh.length + ' 个（E' + next + '-E' + (next + fresh.length - 1) + '，editorial-calendar.js 更新）' + (skipped ? '，跳过重复 ' + skipped + ' 个' : ''))
}

const args = process.argv.slice(2)
const dry = args.includes('--dry')
const task = args.find((a) => !a.startsWith('--')) || 'seed'
const topic = args.filter((a) => !a.startsWith('--') && a !== task).join(' ')
const env = readEnv()

;(async () => {
  console.log('🔥 爆款内容生产线 · ' + today() + (dry ? '（DRY）' : ''))
  try {
    if (task === 'hooks') await genHooks(env, topic || 'AI 学习', dry)
    else if (task === 'blog') await genViralBlog(env, topic || 'AI 提升工作效率', dry)
    else if (task === 'vids') await genVids(env, topic || 'AI 工具', dry)
    else await genSeed(env, dry)
  } catch (e) { console.error('❌ 失败：' + e.message) }
  console.log('🏁 完成')
})()
