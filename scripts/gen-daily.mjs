/* ============================================================
   gen-daily.mjs · 白驹网站每日内容生成流水线（零依赖）
   从 .env 读密钥，按「智谱免费 → 方舟豆包 → DeepSeek」三级降级调用 LLM 生成内容。
   智谱 GLM-4.7-Flash 永久免费（注册 open.bigmodel.cn 填 ZHIPU_API_KEY 即 0 成本）。

   用法：node scripts/gen-daily.mjs <type> [--dry]
   type:
     tools      → 更新 AI 工具库 data/ai-tools.json（深挖每个工具详细内容）
     news       → 追加今日新闻到 data/news.js（头部插入，保留最新 12 条）
     blog       → 新增一篇博文 blog/<标题>.html
     book       → 轮转更新一章书稿 website/book/pages/（追加"今日 AI 进展"小节）
     projects   → 追加 2-3 个新开源项目到 data/ai-projects.json
     categories → 更新 data/showcase.json 的 latestNews（头部插入 2 条，保留 6 条）
     all        → 依次执行上面全部（测试用）
   --dry       → 只打印将要写入的内容，不落盘

   安全说明：
   - 密钥只从 .env 读取，绝不写入任何生成文件
   - 生成内容一律视为数据（JSON / HTML 片段），不做代码执行
   - 文件名经 sanitize，杜绝路径穿越
   ============================================================ */
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dir, '..')
const DATA = path.join(ROOT, 'data')
const BLOG = path.join(ROOT, 'blog')
const BOOK = path.join(ROOT, 'website/book/pages')
const CURSOR = path.join(DATA, '.gen-cursor.json')

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
const sanitizeName = (s) => String(s).replace(/[\\/:*?"<>|\s]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
const stripJson = (s) => {
  let t = String(s).trim()
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  const a = t.indexOf('{'), b = t.lastIndexOf('}')
  if (a !== -1 && b > a) t = t.slice(a, b + 1)
  return t
}
const readCursor = () => { try { return JSON.parse(fs.readFileSync(CURSOR, 'utf8')) } catch (e) { return {} } }
const writeCursor = (c) => { try { fs.writeFileSync(CURSOR, JSON.stringify(c, null, 2)) } catch (e) {} }

// ---------- LLM 调用（非流式，OpenAI 兼容协议，三级降级） ----------
// 优先级：智谱 GLM-4.7-Flash（永久免费，0 成本）→ 方舟豆包 → DeepSeek
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
    max_tokens: 4000,
  }
  // 豆包 seed 推理模型对中文长任务思考会超时（实测>85s），显式关闭 thinking
  if (prov.model.indexOf('seed') !== -1) body.thinking = { type: 'disabled' }
  if (wantJson) body.response_format = { type: 'json_object' }
  // fetch 硬超时保护（推理模型偶发卡死，避免任务挂起）
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
    // 部分渠道不支持 json_object，降级重试纯文本
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
      if (i > 0) console.log('↘️ 已由「' + provs[i].name + '」接手完成')
      return out
    } catch (e) {
      lastErr = e
      if (i < provs.length - 1) console.warn('⚠️ [' + provs[i].name + '] 失败，自动降级到下一渠道：' + String(e.message || e).slice(0, 160))
    }
  }
  throw lastErr || new Error('全部 LLM 渠道失败')
}

// ============================================================
// type: tools — AI 工具库深挖
// ============================================================
async function genTools(env, dry) {
  const file = path.join(DATA, 'ai-tools.json')
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  const tools = data.categories.flatMap((c) => c.tools)
  console.log('📦 工具库：' + data.categories.length + ' 类 / ' + tools.length + ' 个工具，开始生成详细内容…')

  const sys = '你是 AI 工具测评专家。为给定工具生成"深度使用指南"JSON，必须真实、实用、不编造。只输出 JSON。'
  const out = await askLLM(env, sys,
    '为以下 AI 工具逐个生成 deepdive（中文，每个 150-220 字，覆盖：核心用法 / 独门技巧 / 适合人群 / 注意事项）。要求真实准确，不写泛泛而谈：\n' +
    JSON.stringify(tools.map((t) => ({ id: t.id, name: t.name, usage: t.usage }))),
    true)

  // 解析 LLM 输出为 {工具id: deepdive文本}，只信任明确形态，杜绝类型污染
  const map = {}
  for (const [k, v] of Object.entries(out || {})) {
    if (typeof v === 'string') map[k] = v
    else if (v && typeof v === 'object' && typeof v.deepdive === 'string') map[k] = v.deepdive
  }
  for (const list of ['deepdives', 'items', 'tools']) {
    if (Array.isArray(out?.[list])) {
      for (const d of out[list]) {
        if (d && d.id && typeof d.deepdive === 'string') map[d.id] = d.deepdive
      }
    }
  }
  // 缺失的工具用占位说明（保证全量更新）
  for (const t of tools) {
    if (typeof map[t.id] !== 'string') map[t.id] = t.deepdive || ''
  }

  let updated = 0
  for (const c of data.categories) {
    for (const t of c.tools) {
      const dd = (typeof map[t.id] === 'string' ? map[t.id] : '').trim()
      if (dd) { t.deepdive = dd; updated++ }
    }
  }
  if (!updated) throw new Error('LLM 返回结构异常，0 个工具解析成功（out keys: ' + Object.keys(out || {}).join(',') + '）')
  data.lastUpdated = today()
  if (dry) { console.log('[dry] 将更新 ' + updated + ' 个工具的 deepdive 字段'); return }
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
  console.log('✅ tools：' + updated + ' 个工具已更新，lastUpdated=' + data.lastUpdated)
}

// ============================================================
// type: news — 每日新闻
// ============================================================
async function genNews(env, dry) {
  const file = path.join(DATA, 'news.js')
  const raw = fs.readFileSync(file, 'utf8')
  // news.js 是 JS 字面量（window.NEWS = [...]），用 vm 沙箱安全求值
  let news = []
  try {
    const ctx = {}
    vm.createContext(ctx)
    vm.runInContext('var window = {};\n' + raw, ctx)
    news = Array.isArray(ctx.window.NEWS) ? ctx.window.NEWS : []
  } catch (e) { throw new Error('news.js 解析失败: ' + e.message) }
  if (!news.length) throw new Error('news.js 内容为空')
  const todayStr = today()
  const hasToday = news.some((n) => n.date === todayStr)
  if (hasToday) { console.log('⏭️ news：今天（' + todayStr + '）已有 ' + news.filter((n) => n.date === todayStr).length + ' 条新闻，跳过（防重复）'); return }

  const sys = '你是 AI 产业新闻编辑。基于你掌握的真实资讯输出 JSON，绝不编造；不确定来源的信息不要写。只输出 JSON。输出内容必须诚实：若信息来自你的训练知识而非实时核验，在 desc 末尾加「（AI 生成整理，以官方发布为准）」。'
  const prompt = '生成今天（' + todayStr + '）的 2 条 AI 领域真实新闻，格式：\n' +
    '{"items":[{"date":"' + todayStr + '","tag":"市场|智能体|产业|模型|开源 之一","title":"一句话标题","source":"媒体/机构名","desc":"90-150 字客观描述，注明具体时间与细节"}]}\n' +
    '要求：贴近本网站主题（AI 创作/工具/模型/产业/就业），信息可核验。'
  const out = await askLLM(env, sys, prompt, true)
  const items = (Array.isArray(out?.items) ? out.items : []).filter((i) => i && i.title)
  if (!items.length) throw new Error('news 生成结果为空')

  // 代码层强制兜底：每条 desc 末尾必须带标准诚实声明（带空格，与审查标记「AI 生成」一致），不依赖 LLM 自觉
  const MARKER = '（AI 生成整理，以官方发布为准）'
  for (const it of items) {
    it.date = todayStr
    const d = String(it.desc || '')
    // 若含任意形态声明则统一规范为标准形态，否则强制追加
    if (/AI\s*生成整理，以官方发布为准\s*[）)]/.test(d)) {
      it.desc = d.replace(/（?\s*AI\s*生成整理，以官方发布为准\s*[）)]/, MARKER)
    } else {
      it.desc = d.replace(/\s*$/, '') + MARKER
    }
    news = [it, ...news]
  }
  news = news.slice(0, 12)
  const rebuilt = '// 全生态知识库 · AI 前沿快报（自动生成，真实资讯，内置离线可读）\nwindow.NEWS = ' +
    JSON.stringify(news, null, 2) + '\n\nwindow.NEWS_UPDATED = "' + todayStr + '";\n'
  if (dry) { console.log('[dry] 新增 ' + items.length + ' 条今日新闻（' + todayStr + '），总条数=' + news.length); return }
  fs.writeFileSync(file, rebuilt, 'utf8')
  console.log('✅ news：今日新增 ' + items.length + ' 条（原今日已有 ' + (hasToday ? '是' : '否') + '，自动去重处理），现共 ' + news.length + ' 条')
}

// ============================================================
// type: blog — 新博文
// ============================================================
const BLOG_CSS = ':root{--bg:#07090f;--bg2:#0c1120;--card:#111a2e;--line:#20304f;--gold:#f5c26b;--blue:#4f8cff;--cyan:#38e1ff;--purple:#8b5cf6;--text:#edf2fc;--muted:#93a3c7;--grad:linear-gradient(120deg,#f5c26b,#ff8c5a 40%,#8b5cf6)}\n*{margin:0;padding:0;box-sizing:border-box}\nbody{background:var(--bg);color:var(--text);font-family:"PingFang SC","Microsoft YaHei",system-ui,sans-serif;line-height:1.85}\nnav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:rgba(7,9,15,.92);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}\nnav a{color:var(--cyan);text-decoration:none;font-size:13px}\nnav .logo{font-size:15px;font-weight:800;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}\narticle{max-width:860px;margin:0 auto;padding:74px 18px 60px}\narticle h1{font-size:clamp(24px,4.5vw,36px);font-weight:800;line-height:1.35;margin:8px 0 20px;padding-bottom:16px;border-bottom:1px solid var(--line)}\narticle h2{font-size:23px;font-weight:700;margin:34px 0 12px;padding-left:13px;border-left:3px solid var(--gold)}\narticle h3{font-size:18px;font-weight:600;margin:26px 0 10px;color:var(--cyan)}\narticle p{color:#c6d2ea;font-size:15.5px;margin-bottom:15px}\narticle b,article strong{color:var(--text)}\narticle a{color:var(--gold)}\narticle ul,article ol{padding-left:24px;margin-bottom:16px}\narticle li{color:#c6d2ea;font-size:15px;margin-bottom:7px}\narticle blockquote{border:1px solid rgba(245,194,107,.30);border-left:4px solid var(--gold);background:linear-gradient(120deg,rgba(245,194,107,.12),rgba(139,92,246,.10));padding:16px 18px;border-radius:12px;color:#e8dcbe;margin:20px 0;font-size:14.5px}\narticle code{background:#0a0f1e;border:1px solid var(--line);border-radius:6px;padding:2px 7px;color:var(--cyan);font-size:13.5px;font-family:Consolas,Menlo,monospace}\narticle pre{background:#0a0f1e;border:1px solid var(--line);border-radius:12px;padding:16px;overflow-x:auto;margin:18px 0}\narticle pre code{background:none;border:none;padding:0;color:#b9c8ea;font-size:13px;line-height:1.6}\narticle table{width:100%;border-collapse:collapse;margin:18px 0;font-size:13.5px}\narticle th,article td{padding:10px 12px;border:1px solid var(--line);text-align:left}\narticle th{background:#141f3a;color:var(--gold)}\narticle td{color:var(--muted)}\narticle hr{border:none;border-top:1px solid var(--line);margin:30px 0}\narticle img{max-width:100%;border-radius:12px;margin:14px 0}'

async function genBlog(env, dry) {
  const sys = '你是资深 AI 领域博主，文风务实、信息密度高。输出 JSON：{"title":"博文标题","tag":"AI 创作|AI 工具|AI 产业|AI 学习 之一","body":"HTML 正文（h2/h3/p/ul/blockquote 标签，不含 h1、不含 <html>、不含 <article>）"}。只输出 JSON。'
  const topics = ['AI 智能体实战', 'AI 绘画技巧', 'AI 视频创作', 'AI 办公效率', 'AI 编程', 'AI 变现', 'AI 学习路径', 'AI 工具评测', '大模型技术', 'AI 创业']
  const topic = topics[Math.floor(Math.random() * topics.length)]
  const prompt = '写一篇关于「' + topic + '」的今日博文（' + today() + '），1500-2200 字，结构：开篇引言 blockquote → 3-4 个 h2 小节 → 结尾行动建议。内容必须真实、可操作，避免空话。'
  const out = await askLLM(env, sys, prompt, true)
  if (!out || !out.title || !out.body) throw new Error('blog 生成结果不完整')
  const title = String(out.title).replace(/[#*]/g, '').trim()
  const fname = sanitizeName(title) || ('AI博文-' + today().replace(/-/g, ''))
  const html = '<!DOCTYPE html>\n<html lang="zh-CN"><head><meta charset="UTF-8">\n<link rel="icon" href="/icon.svg" type="image/svg+xml">\n\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>' + title + ' · AI 创作纪元（离线版）</title><style>\n' + BLOG_CSS + '\n.blog-honest{display:inline-block;margin-top:12px;padding:5px 12px;border-radius:999px;font-size:12.5px;font-weight:600;color:#07090f;background:linear-gradient(120deg,#38e1ff,#8b5cf6)}\n.blog-attribution{margin-top:34px;padding:16px 18px;border:1px solid var(--line);border-left:4px solid var(--gold);border-radius:12px;background:rgba(245,194,107,.06)}\n.blog-attribution h3{color:var(--gold);font-size:15px;margin:0 0 8px}\n.blog-attribution p{color:var(--muted);font-size:13.5px;margin:0}\n</style></head>\n<body>\n<nav><div class="logo">AI 创作纪元 · 离线版</div><a href="../index.html"><i class="cc-ic" data-ic="arrow-left" aria-hidden="true"></i> 返回总览</a>  <div class="nav-actions">\n    <button class="theme-btn" id="ccoworkThemeBtn" onclick="ccoworkTheme()" title="切换主题"><span class="cc-theme-ics"><i class="cc-ic cc-ic-moon" data-ic="moon" aria-hidden="true"></i><i class="cc-ic cc-ic-sun" data-ic="sun" aria-hidden="true"></i></span></button>\n  </div>\n</nav>\n<article>\n<div class="blog-open">\n  <div class="blog-badge">🐎 白驹 · 全局大脑 · AI 创作纪元</div>\n  <div class="blog-meta"><span>📅 ' + today() + '</span><span class="blog-tag">' + (out.tag || 'AI 创作') + '</span></div>\n  <div class="blog-honest">🤖 AI 生成 · 以官方为准</div>\n  <div class="blog-divider"></div>\n</div>\n<h1>' + title + '</h1>\n' + out.body + '\n<section class="blog-attribution"><h3>出处声明</h3><p>本文由 AI（智谱 GLM / 豆包 / DeepSeek）依据公开资讯辅助生成，内容以官方发布为准；如涉及具体数据、政策或产品细节，请以来源机构官方信息为准。本站不对因使用本文产生的决策后果负责。</p></section>\n</article>\n<script src="/ccowork.js?v=19"></script>\n<script src="/baiju-widget.js"></script>\n<script src="/module.js"></script>\n</body></html>\n'
  if (dry) { console.log('[dry] 新博文：' + fname + '.html（' + title + '）'); return }
  const fp = path.join(BLOG, fname + '.html')
  if (fs.existsSync(fp)) { console.log('⚠️ blog：同名文件已存在，跳过：' + fname + '.html'); return }
  fs.writeFileSync(fp, html, 'utf8')
  console.log('✅ blog：已生成 ' + fname + '.html（' + title + '）')
}

// ============================================================
// type: book — 轮转更新书稿章节
// ============================================================
async function genBook(env, dry) {
  if (!fs.existsSync(BOOK)) throw new Error('书稿目录不存在：' + BOOK)
  const files = fs.readdirSync(BOOK).filter((f) => f.endsWith('.html')).sort()
  if (!files.length) throw new Error('书稿目录为空')
  const cur = readCursor()
  const idx = (cur.bookIndex || 0) % files.length
  const fname = files[idx]
  if (!dry) writeCursor({ ...cur, bookIndex: (idx + 1) % files.length })
  const fp = path.join(BOOK, fname)
  let html = fs.readFileSync(fp, 'utf8')
  const chapter = fname.replace(/\.html$/, '').replace(/^\d+-/, '')

  const sys = '你是 AI 书籍编辑。输出 JSON：{"sectionTitle":"补充小节标题","html":"HTML 片段（h3 + 2-3 段 p + 1 个 ul），600-900 字"}。只输出 JSON。'
  const prompt = '为书稿章节《' + chapter + '》写一节「' + today() + ' · 今日 AI 进展」补充内容：结合该章主题，写当日值得记录的行业动态/新知识，真实可核验，不编造。'
  const out = await askLLM(env, sys, prompt, true)
  if (!out || !out.html) throw new Error('book 生成结果不完整')

  const section = '\n<h2>' + (out.sectionTitle || today() + ' · 今日 AI 进展') + '</h2>\n' + out.html + '\n'
  if (dry) { console.log('[dry] 书稿追加小节：' + chapter + ' ← ' + (out.sectionTitle || '')); return }
  // 插入到 </article> 前
  if (html.includes('</article>')) html = html.replace('</article>', section + '</article>')
  else html += section
  fs.writeFileSync(fp, html, 'utf8')
  console.log('✅ book：' + fname + ' 已追加小节「' + (out.sectionTitle || '') + '」')
}

// ============================================================
// type: projects — 追加开源项目
// ============================================================
async function genProjects(env, dry) {
  const file = path.join(DATA, 'ai-projects.json')
  const list = JSON.parse(fs.readFileSync(file, 'utf8'))
  const existing = new Set(list.map((p) => (p.owner + '/' + p.name).toLowerCase()))
  const sample = list.slice(0, 3).map((p) => ({ name: p.name, owner: p.owner, desc: p.desc, org: p.org }))

  const sys = '你是开源社区观察者。输出 JSON：{"items":[{"name":"仓库名","owner":"作者/组织","org":"team|个人 之一","heat":1-5,"desc":"30-60 字英文描述","url":"https://github.com/owner/name"}]}。只输出 JSON，必须真实存在。'
  const prompt = '推荐 2 个 2026 年值得关注的真实 GitHub AI 项目（此前未收录，避免与这些重复：' + JSON.stringify([...existing].slice(-8)) + '）。示例格式参考：' + JSON.stringify(sample)
  const out = await askLLM(env, sys, prompt, true)
  const items = (Array.isArray(out?.items) ? out.items : []).filter((i) => i && i.name && i.owner)
  const fresh = items.filter((i) => !existing.has((i.owner + '/' + i.name).toLowerCase()))
  if (!fresh.length) throw new Error('projects 无新项目可加（可能重复）')
  for (const it of fresh) {
    it.url = it.url || ('https://github.com/' + it.owner + '/' + it.name)
    it.author = it.owner
    list.push(it)
  }
  if (dry) { console.log('[dry] 将追加 ' + fresh.length + ' 个新项目：' + fresh.map((f) => f.name).join(', ')); return }
  fs.writeFileSync(file, JSON.stringify(list, null, 2), 'utf8')
  console.log('✅ projects：追加 ' + fresh.length + ' 个新项目，现共 ' + list.length + ' 个')
}

// ============================================================
// type: categories — 作品类目/展示区新闻
// ============================================================
async function genCategories(env, dry) {
  const file = path.join(DATA, 'showcase.json')
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  const sys = '你是 AI 产业编辑。输出 JSON：{"items":["一句话真实新闻（含主体、事件、时间）"]}。只输出 JSON，不编造。'
  const prompt = '生成 2 条今日（' + today() + '）AI 领域代表性进展，一句话一条，用于站点展示区。参考现有条目风格：' + JSON.stringify(data.latestNews.slice(0, 2))
  const out = await askLLM(env, sys, prompt, true)
  const items = (Array.isArray(out?.items) ? out.items : []).filter((s) => typeof s === 'string' && s.trim().length > 8)
  if (!items.length) throw new Error('categories 生成结果为空')
  data.latestNews = [...items, ...data.latestNews].slice(0, 6)
  data.lastUpdated = today()
  if (dry) { console.log('[dry] latestNews 头部插入 ' + items.length + ' 条，保留 ' + data.latestNews.length + ' 条'); return }
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
  console.log('✅ categories：latestNews 已更新（' + data.latestNews.length + ' 条），lastUpdated=' + today())
}

// ---------- 主流程 ----------
async function main() {
  const type = process.argv[2] || 'all'
  const dry = process.argv.includes('--dry')
  const env = readEnv()
  const provs = buildProviders(env)
  if (!provs.length) { console.error('❌ .env 未配置任何 LLM 密钥（ZHIPU_API_KEY / ARK_API_KEY / DEEPSEEK_API_KEY 至少一个）'); process.exit(1) }
  console.log('🔑 LLM 渠道（优先级从高到低）：' + provs.map((p) => p.name).join(' → ') + (dry ? '（dry 模式，不落盘）' : ''))
  console.log('📅 日期：' + today() + ' · 任务：' + type)

  const tasks = {
    tools: () => genTools(env, dry),
    news: () => genNews(env, dry),
    blog: () => genBlog(env, dry),
    book: () => genBook(env, dry),
    projects: () => genProjects(env, dry),
    categories: () => genCategories(env, dry),
  }
  const order = type === 'all' ? ['tools', 'news', 'blog', 'book', 'projects', 'categories'] : [type]
  for (const t of order) {
    if (!tasks[t]) { console.error('❌ 未知任务类型：' + t + '（可选：tools | news | blog | book | projects | categories | all）'); process.exit(1) }
    try { await tasks[t]() } catch (e) { console.error('❌ [' + t + ']', e) }
  }
  console.log('🏁 完成')
}

main().catch((e) => { console.error(e); process.exit(1) })
