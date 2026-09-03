/* ============================================================
   gen-weekly.mjs · 本周 AI 大事记周报生成（零依赖）
   读取 data/news.js 近7天新闻，用 LLM 聚合精炼成周报博文。
   三级降级：智谱免费 → 方舟豆包 → DeepSeek

   用法：node scripts/gen-weekly.mjs [--dry]
   --dry：只打印不落盘
   ============================================================ */
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dir, '..')
const DATA = path.join(ROOT, 'data')
const BLOG = path.join(ROOT, 'blog')
const dry = process.argv.includes('--dry')

// ---------- 工具 ----------
const readEnv = () => {
  const raw = fs.readFileSync(path.join(ROOT, '.env'), 'utf8')
  const val = (k) => {
    const m = raw.match(new RegExp('^\\s*' + k + '\\s*=\\s*(.+?)\\s*$', 'm'))
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : ''
  }
  return { deepseek: val('DEEPSEEK_API_KEY'), ark: val('ARK_API_KEY'), zhipu: val('ZHIPU_API_KEY') }
}
const today = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}
const dateOffset = (days) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const p = (n) => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}
const sanitizeName = (s) => String(s).replace(/[\\/:*?"<>|\s]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
const stripJson = (s) => {
  let t = String(s).trim()
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  const a = t.indexOf('{'), b = t.lastIndexOf('}')
  if (a !== -1 && b > a) t = t.slice(a, b + 1)
  return t
}

// ---------- 读取 news.js（vm 沙箱求值） ----------
function readNews() {
  const raw = fs.readFileSync(path.join(DATA, 'news.js'), 'utf8')
  const ctx = {}
  vm.createContext(ctx)
  vm.runInContext('var window = {};\n' + raw, ctx)
  const news = Array.isArray(ctx.window.NEWS) ? ctx.window.NEWS : []
  if (!news.length) throw new Error('news.js 内容为空')
  return news
}

// ---------- 过滤近7天 ----------
function filterThisWeek(news) {
  const startStr = dateOffset(-6) // 含今天共7天
  const endStr = today()
  return news.filter((n) => n.date >= startStr && n.date <= endStr)
    .sort((a, b) => (a.date < b.date ? 1 : -1)) // 新的在前
}

// ---------- 周编号 ----------
function weekOfMonth() {
  return Math.ceil(new Date().getDate() / 7)
}

// ---------- LLM 调用（三级降级） ----------
function buildProviders(env) {
  const provs = []
  if (env.zhipu) provs.push({ name: '智谱GLM-4.7-Flash(免费)', key: env.zhipu, url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-4.7-flash' })
  if (env.ark) provs.push({ name: '方舟豆包', key: env.ark, url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', model: 'doubao-seed-2-1-pro-260628' })
  if (env.deepseek) provs.push({ name: 'DeepSeek', key: env.deepseek, url: 'https://api.deepseek.com/chat/completions', model: 'deepseek-chat' })
  return provs
}
async function askOnce(prov, sysPrompt, userPrompt, wantJson) {
  const body = {
    model: prov.model,
    messages: [
      { role: 'system', content: sysPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 6000,
  }
  if (prov.model.indexOf('seed') !== -1) body.thinking = { type: 'disabled' }
  if (wantJson) body.response_format = { type: 'json_object' }
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), 120000)
  let r
  try {
    r = await fetch(prov.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + prov.key },
      body: JSON.stringify(body),
      signal: ac.signal,
    })
  } catch (e) {
    clearTimeout(timer)
    throw new Error('LLM 请求失败/超时: ' + e.message)
  }
  clearTimeout(timer)
  if (!r.ok) {
    const txt = await r.text().catch(() => '')
    if (wantJson && (r.status === 400 || r.status === 404)) {
      delete body.response_format
      const r2 = await fetch(prov.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + prov.key },
        body: JSON.stringify(body),
      })
      if (r2.ok) {
        const j2 = await r2.json()
        return JSON.parse(stripJson(j2.choices?.[0]?.message?.content || '{}'))
      }
    }
    throw new Error('LLM API ' + r.status + ': ' + txt.slice(0, 300))
  }
  const j = await r.json()
  const content = j.choices?.[0]?.message?.content || ''
  if (wantJson) return JSON.parse(stripJson(content))
  return content
}
async function askLLM(env, sysPrompt, userPrompt, wantJson = false) {
  const provs = buildProviders(env)
  if (!provs.length) throw new Error('未配置任何可用 LLM 密钥（ZHIPU / ARK / DEEPSEEK）')
  let lastErr = null
  for (let i = 0; i < provs.length; i++) {
    try {
      const out = await askOnce(provs[i], sysPrompt, userPrompt, wantJson)
      if (i > 0) console.log('  ↘️ 已由「' + provs[i].name + '」接手完成')
      return out
    } catch (e) {
      lastErr = e
      if (i < provs.length - 1) console.warn('  ⚠️ [' + provs[i].name + '] 失败，降级：' + String(e.message || e).slice(0, 160))
    }
  }
  throw lastErr || new Error('全部 LLM 渠道失败')
}

// ---------- 博文 CSS（与 gen-daily.mjs 一致） ----------
const BLOG_CSS = `:root{--bg:#07090f;--bg2:#0c1120;--card:#111a2e;--line:#20304f;--gold:#f5c26b;--blue:#4f8cff;--cyan:#38e1ff;--purple:#8b5cf6;--text:#edf2fc;--muted:#93a3c7;--grad:linear-gradient(120deg,#f5c26b,#ff8c5a 40%,#8b5cf6)}
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
article b,article strong{color:var(--text)}
article a{color:var(--gold)}
article ul,article ol{padding-left:24px;margin-bottom:16px}
article li{color:#c6d2ea;font-size:15px;margin-bottom:7px}
article blockquote{border:1px solid rgba(245,194,107,.30);border-left:4px solid var(--gold);background:linear-gradient(120deg,rgba(245,194,107,.12),rgba(139,92,246,.10));padding:16px 18px;border-radius:12px;color:#e8dcbe;margin:20px 0;font-size:14.5px}
article code{background:#0a0f1e;border:1px solid var(--line);border-radius:6px;padding:2px 7px;color:var(--cyan);font-size:13.5px;font-family:Consolas,Menlo,monospace}
article pre{background:#0a0f1e;border:1px solid var(--line);border-radius:12px;padding:16px;overflow-x:auto;margin:18px 0}
article pre code{background:none;border:none;padding:0;color:#b9c8ea;font-size:13px;line-height:1.6}
article table{width:100%;border-collapse:collapse;margin:18px 0;font-size:13.5px}
article th,article td{padding:10px 12px;border:1px solid var(--line);text-align:left}
article th{background:#141f3a;color:var(--gold)}
article td{color:var(--muted)}
article hr{border:none;border-top:1px solid var(--line);margin:30px 0}
article img{max-width:100%;border-radius:12px;margin:14px 0}
.blog-honest{display:inline-block;margin-top:12px;padding:5px 12px;border-radius:999px;font-size:12.5px;font-weight:600;color:#07090f;background:linear-gradient(120deg,#38e1ff,#8b5cf6)}
.blog-attribution{margin-top:34px;padding:16px 18px;border:1px solid var(--line);border-left:4px solid var(--gold);border-radius:12px;background:rgba(245,194,107,.06)}
.blog-attribution h3{color:var(--gold);font-size:15px;margin:0 0 8px}
.blog-attribution p{color:var(--muted);font-size:13.5px;margin:0}
.blog-sourcelist{margin:24px 0;padding:16px 18px;border:1px solid var(--line);border-radius:12px;background:var(--card)}
.blog-sourcelist h3{color:var(--cyan);font-size:15px;margin:0 0 10px}
.blog-sourcelist ul{margin:0;padding-left:20px}
.blog-sourcelist li{font-size:13px;color:var(--muted);margin-bottom:5px}
.blog-prevnext{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin:40px 0 10px;padding:16px 18px;border:1px solid var(--line);border-radius:14px;background:var(--card)}`

// ---------- SVG 封面横幅 ----------
function buildSVG(title, emoji) {
  const safeTitle = String(title).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<svg viewBox="0 0 1200 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${safeTitle}" style="width:100%;height:auto;border-radius:16px;margin:0 0 24px;box-shadow:0 10px 28px rgba(0,0,0,.35)">
  <defs>
    <linearGradient id="bgrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#f5c26b"/><stop offset=".5" stop-color="#ff8c5a"/><stop offset="1" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="240" rx="18" fill="url(#bgrad)"/>
  <circle cx="1120" cy="30" r="180" fill="rgba(255,255,255,.12)"/>
  <circle cx="90" cy="240" r="150" fill="rgba(255,255,255,.08)"/>
  <circle cx="600" cy="-70" r="210" fill="rgba(255,255,255,.07)"/>
  <text x="56" y="78" font-size="20" font-weight="700" fill="rgba(255,255,255,.92)" font-family="PingFang SC, Microsoft YaHei, sans-serif">白驹全局大脑 · 本周 AI 大事记</text>
  <text x="56" y="142" font-size="40" font-weight="900" fill="#ffffff" font-family="PingFang SC, Microsoft YaHei, sans-serif">${safeTitle}</text>
  <text x="56" y="184" font-size="18" fill="rgba(255,255,255,.92)" font-family="PingFang SC, Microsoft YaHei, sans-serif">白驹全局大脑 · 每周 AI 产业周报 · 真实可核验</text>
  <text x="1120" y="205" font-size="96" text-anchor="middle" fill="rgba(255,255,255,.92)">${emoji}</text>
</svg>`
}

// ---------- 构建 HTML ----------
function buildHTML(title, weekLabel, dateStr, body, newsItems, actions) {
  const safeTitle = String(title).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // 描述与关键词：直接基于新闻原文的「标题 + 来源」拼接，不让 LLM 生成（避免数据幻觉）
  // 去重：按"前 24 字符"去重前 4 条
  const seen = new Set()
  const uniqueNews = []
  for (const n of newsItems) {
    const key = String(n.title).slice(0, 24)
    if (seen.has(key)) continue
    seen.add(key)
    uniqueNews.push(n)
  }
  const anchors = uniqueNews.slice(0, 4).map((n) => String(n.title).replace(/[【】\[\]]/g, '').slice(0, 24)).join('、')
  const desc = '本周 AI 领域重要事件聚合周报，收录 ' + newsItems.length + ' 条新闻。亮点：' + anchors + '——一条看完本周趋势。'
  const kwSet = new Set(['本周AI大事记', weekLabel, '白驹全局大脑', 'ccowork', 'AI创作纪元', 'AI周报', 'AI产业', 'AI模型', 'AI工具', '智能体'])
  for (const n of newsItems.slice(0, 4)) {
    const m = String(n.title).match(/([A-Z][A-Za-z0-9. -]{2,20})(?=\s*(发布|开源|推出|开放|上线|更新|报告|分析|智能体|工具)?)/g)
    if (m) for (const t of m.slice(0, 2)) { const clean = t.trim(); if (clean.length >= 3) kwSet.add(clean) }
  }
  const keywords = [...kwSet].slice(0, 16).join(',')

  // 本周新闻源列表
  const sourceItems = newsItems.map((n) =>
    '<li><strong>' + String(n.date) + '</strong> · ' + String(n.title).replace(/&/g, '&amp;').replace(/</g, '&lt;') + ' — <em>' + String(n.source).replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</em></li>'
  ).join('\n')

  // 下周一分钟行动清单（LLM 输出的 4 条具体动作，作为周报转化点）
  const escLi = (a) => String(a).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const actionsHTML = (actions && actions.length)
    ? '<section class="blog-attribution" style="margin-top:28px"><h3>下周一分钟行动清单</h3><ol style="padding-left:1.3em;margin:0.6em 0;line-height:1.9">' +
        actions.map(escLi).map((s) => '<li>' + s + '</li>').join('') +
      '</ol></section>\n'
    : ''

  return '<!DOCTYPE html>\n<html lang="zh-CN"><head>\n' +
    '<meta property="og:description" content="' + desc + '">\n' +
    '<meta name="keywords" content="' + keywords + '">\n' +
    '<meta name="description" content="' + desc + '"><meta charset="UTF-8">\n' +
    '<link rel="icon" href="/icon.svg" type="image/svg+xml">\n\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '<title>' + safeTitle + ' · AI 创作纪元（离线版）</title><style>\n' + BLOG_CSS + '\n</style></head>\n' +
    '<body>\n' +
    '<nav><div class="logo">AI 创作纪元 · 离线版</div><a href="../index.html"><i class="cc-ic" data-ic="arrow-left" aria-hidden="true"></i> 返回总览</a>  <div class="nav-actions">\n' +
    '    <button class="theme-btn" id="ccoworkThemeBtn" onclick="ccoworkTheme()" title="切换主题"><span class="cc-theme-ics"><i class="cc-ic cc-ic-moon" data-ic="moon" aria-hidden="true"></i><i class="cc-ic cc-ic-sun" data-ic="sun" aria-hidden="true"></i></span></button>\n' +
    '  </div>\n</nav>\n' +
    '<article>\n' +
    buildSVG(safeTitle, '📰') + '\n' +
    '<div class="blog-open">\n' +
    '  <div class="blog-badge">🐎 白驹 · 全局大脑 · AI 创作纪元</div>\n' +
    '  <div class="blog-meta"><span>📅 ' + dateStr + '</span><span class="blog-tag">AI 大事记 · ' + weekLabel + '</span></div>\n' +
    '  <div class="blog-honest">🤖 AI 生成 · 以官方为准</div>\n' +
    '  <div class="blog-divider"></div>\n</div>\n' +
    '<h1>' + safeTitle + '</h1>\n' +
    body + '\n' +
    actionsHTML +
    '<section class="blog-sourcelist"><h3>📋 本周收录新闻源（共 ' + newsItems.length + ' 条）</h3>\n<ul>\n' + sourceItems + '\n</ul></section>\n' +
    '<div class="blog-prevnext">\n' +
    '  <span style="font-size:13px"><span style="color:var(--muted)">已是最新一篇</span></span>\n' +
    '  <a href="index.html" style="color:var(--cyan);font-weight:700;text-decoration:none;font-size:13px"><i class="cc-ic" data-ic="library-big" aria-hidden="true"></i> 博客目录</a>\n' +
    '  <span style="font-size:13px"><span style="color:var(--muted)">下一篇待更新</span></span>\n' +
    '</div>\n' +
    '<hr>\n' +
    '<section class="blog-attribution"><h3>出处声明</h3><p>本文由 AI（智谱 GLM / 豆包 / DeepSeek）依据 data/news.js 中收录的公开资讯聚合整理，所有新闻均标注原始来源，内容以官方发布为准。本站不对因使用本文产生的决策后果负责。</p></section>\n' +
    '</article>\n' +
    '<script src="/ccowork.js?v=19"></script>\n' +
    '<script src="/baiju-widget.js"></script>\n' +
    '<script src="/module.js"></script>\n' +
    '</body></html>\n'
}

// ============================================================
// 主流程
// ============================================================
async function main() {
  console.log('═══════════════════════════════════════')
  console.log('  本周 AI 大事记 · 周报生成流水线')
  console.log('═══════════════════════════════════════\n')

  // 1) 读取 & 过滤新闻
  const allNews = readNews()
  const weekNews = filterThisWeek(allNews)
  const todayStr = today()
  const wk = weekOfMonth()
  const monthStr = todayStr.slice(0, 7) // "2026-08"
  const monthNum = parseInt(todayStr.slice(5, 7), 10)
  const weekLabel = monthStr.slice(0, 4) + '年' + monthNum + '月第' + wk + '周'

  console.log('📅 今天：' + todayStr + '  周报标识：' + weekLabel)
  console.log('📰 news.js 共 ' + allNews.length + ' 条，近7天收录 ' + weekNews.length + ' 条：')
  for (const n of weekNews) {
    console.log('   ' + n.date + ' [' + n.tag + '] ' + n.title.slice(0, 40))
  }
  console.log()

  if (!weekNews.length) {
    console.error('❌ 近7天无新闻可聚合，终止。')
    process.exit(1)
  }

  // 2) LLM 聚合生成
  const env = readEnv()
  console.log('🔑 密钥：智谱=' + (env.zhipu ? '✓' : '✗') + '  方舟=' + (env.ark ? '✓' : '✗') + '  DeepSeek=' + (env.deepseek ? '✓' : '✗'))
  console.log('🤖 调用 LLM 聚合精炼周报…\n')

  const newsDigest = weekNews.map((n, i) =>
    (i + 1) + '. [' + n.date + '][' + n.tag + '] ' + n.title + '\n   来源：' + n.source + '\n   摘要：' + n.desc
  ).join('\n\n')

  const sys = '你是资深 AI 产业周报编辑，文风务实、信息密度高、擅长把碎片新闻提炼成有逻辑的周报。输出 JSON：{"title":"博文标题","body":"HTML 正文（h2/h3/p/ul/blockquote 标签，不含 h1、不含 <html>、不含 <article>）","actions":["行动1（30字内，含动作）","行动2","行动3","行动4"]}。只输出 JSON。'

  const prompt =
    '以下是本周（' + dateOffset(-6) + ' 至 ' + todayStr + '）AI 领域的 ' + weekNews.length + ' 条新闻原文，请聚合精炼成一篇周报博文。\n\n' +
    '【本周新闻原文】\n' + newsDigest + '\n\n' +
    '【写作要求】\n' +
    '1. 标题格式：「本周 AI 大事记 · ' + weekLabel + '」\n' +
    '2. 开篇用 blockquote 写一段60-100字的本周总览（点明核心趋势）\n' +
    '3. 按主题分组写3-4个 h2 小节（如：模型发布动态、产业市场报告、开源与企业级工具等），每条新闻在小节中简述要点并注明来源\n' +
    '4. 每个新闻条目用 <strong>标题</strong> 标注，来源用 <em>斜体</em> 标注\n' +
    '5. 结尾用 h2「本周观察」写一段150-200字的趋势分析\n' +
    '6. 正文总计1500-2500字，信息密度高，不写空话\n' +
    '7. 内容必须真实，全部基于上述新闻原文，不编造数据\n' +
    '7.1 **【真实性铁律】**严禁放大/缩小新闻原文中的数字（模型名/参数规模/同比数据等）。例如：原文是「Llama 3.2 1B/3B」就写「Llama 3.2 1B/3B」，禁止升级为「Llama 4 / 1.2 万亿」；原文是「IDC 生成式 AI 服务同比 128.3%」就写「128.3%」，禁止简化为「翻倍」。所有数字与模型名必须与新闻原文 1:1 一致。**违反此条 = 整篇作废。**\n' +
    '8. 只输出 JSON，body 字段为纯 HTML 片段\n' +
    '9. **actions 必填 4 条**（30 字内，每条必须含具体动作动词 + 落地场景），基于本周新闻可执行的「下周一分钟行动清单」——读者看完能立即动手；不写空话、不写「关注 X」这种没有动作的话'

  const out = await askLLM(env, sys, prompt, true)
  if (!out || !out.title || !out.body) throw new Error('LLM 生成结果不完整：' + JSON.stringify(out).slice(0, 200))

  const title = String(out.title).replace(/[#*]/g, '').trim()
  const body = String(out.body)
  const actions = Array.isArray(out.actions) ? out.actions.slice(0, 4).map((a) => String(a)) : []
  if (!actions.length) console.warn('⚠️ LLM 未输出 actions 字段，行动清单段将省略')
  console.log('\n✅ LLM 生成完成：' + title)
  console.log('   正文长度：' + body.length + ' 字符 · 行动清单：' + actions.length + ' 条\n')

  // 3) 构建 HTML
  const html = buildHTML(title, weekLabel, todayStr, body, weekNews, actions)
  const fname = sanitizeName(todayStr + '-本周AI大事记-' + weekLabel) || (todayStr.replace(/-/g, '') + '-weekly')
  const fp = path.join(BLOG, fname + '.html')

  if (dry) {
    console.log('[dry] 将写入：blog/' + fname + '.html')
    console.log('[dry] HTML 大小：' + html.length + ' 字符')
    return
  }

  if (fs.existsSync(fp)) {
    console.log('⚠️ 同名文件已存在，将覆盖：' + fname + '.html')
  }
  fs.writeFileSync(fp, html, 'utf8')
  console.log('✅ 博文已生成：blog/' + fname + '.html')
  console.log('   标题：' + title)
  console.log('   本周收录：' + weekNews.length + ' 条新闻')
  console.log('   文件大小：' + (html.length / 1024).toFixed(1) + ' KB')
}

main().catch((e) => {
  console.error('\n❌ 生成失败：' + (e.message || e))
  process.exit(1)
})
