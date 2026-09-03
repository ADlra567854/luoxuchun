#!/usr/bin/env node
// ============================================================================
// gen-academy.mjs — AI学院 内容流水线（零依赖）
// 功能：
//   node scripts/gen-academy.mjs all            # 生成全部缺失章节
//   node scripts/gen-academy.mjs 17,18          # 只生成指定章节
//   node scripts/gen-academy.mjs linkcheck      # 巡检零入链 + 外链图
//   node scripts/gen-academy.mjs all --dry      # 试跑不落盘
//   node scripts/gen-academy.mjs all --force    # 强制覆盖已存在章节
// 引擎：火山方舟豆包（ARK_API_KEY），thinking 禁用 + 120s 超时
// 模板：与 chapter-01.html 一比一（theme-cloud.css + site-redesign.css
//       + blog-open 品牌开篇 + ccowork.js/module.js 收尾）
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const ACADEMY = path.join(ROOT, 'website', 'ai-academy')
const PORTAL = path.join(ROOT, 'website', 'ai-academy.html')

// ---------- 工具 ----------
const today = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const readEnv = () => {
  const raw = fs.readFileSync(path.join(ROOT, '.env'), 'utf8')
  const val = (k) => {
    const m = raw.match(new RegExp('^\\s*' + k + '\\s*=\\s*(.+?)\\s*$', 'm'))
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : ''
  }
  return { ark: val('ARK_API_KEY'), deepseek: val('DEEPSEEK_API_KEY') }
}

// ---------- LLM 调用（豆包优先，thinking 禁用 + 120s 超时） ----------
async function askLLM(env, sysPrompt, userPrompt, maxTokens = 4500) {
  const prov = env.ark
    ? { key: env.ark, url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', model: 'doubao-seed-2-1-pro-260628' }
    : { key: env.deepseek, url: 'https://api.deepseek.com/chat/completions', model: 'deepseek-chat' }
  if (!prov.key) throw new Error('未配置 LLM 密钥（ARK / DEEPSEEK）')
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 120000)
  try {
    const body = {
      model: prov.model,
      messages: [
        { role: 'system', content: sysPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
      thinking: { type: 'disabled' },
    }
    const r = await fetch(prov.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + prov.key },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    if (!r.ok) {
      const txt = await r.text().catch(() => '')
      throw new Error('LLM API ' + r.status + ': ' + txt.slice(0, 200))
    }
    const j = await r.json()
    return (j.choices?.[0]?.message?.content || '').trim()
  } finally {
    clearTimeout(timer)
  }
}

// ---------- Markdown → HTML（简单可靠转换） ----------
function inline(s) {
  return String(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
}

function mdToHtml(md) {
  const lines = String(md).replace(/\r\n/g, '\n').split('\n')
  let html = ''
  let inCode = false
  let codeBuf = []
  let inUl = false
  let inOl = false
  let tableBuf = []
  let inTable = false

  const flushList = () => {
    if (inUl) { html += '</ul>\n'; inUl = false }
    if (inOl) { html += '</ol>\n'; inOl = false }
  }
  const flushTable = () => {
    if (!inTable) return
    inTable = false
    const rows = tableBuf.filter((r) => r.trim().length > 0)
    tableBuf = []
    if (rows.length < 2) return
    const parseRow = (r) => r.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())
    const head = parseRow(rows[0])
    let t = '<table>\n<thead><tr>'
    for (const h of head) t += '<th>' + inline(h) + '</th>'
    t += '</tr></thead>\n<tbody>\n'
    for (let i = 2; i < rows.length; i++) {
      const cells = parseRow(rows[i])
      t += '<tr>'
      for (let j = 0; j < head.length; j++) t += '<td>' + inline(cells[j] || '') + '</td>'
      t += '</tr>\n'
    }
    t += '</tbody>\n</table>\n'
    html += t
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (line.trim().startsWith('```')) {
      if (inCode) {
        html += '<pre><code>' + escapeHtml(codeBuf.join('\n')) + '</code></pre>\n'
        codeBuf = []
        inCode = false
      } else {
        flushList(); flushTable(); inCode = true
      }
      continue
    }
    if (inCode) { codeBuf.push(line); continue }
    const t = line.trim()
    if (!t) { flushList(); flushTable(); continue }
    if (/^#{1,4}\s/.test(t)) {
      const m = t.match(/^(#{1,4})\s+(.*)$/)
      const lv = Math.min(m[1].length, 3)
      flushList(); flushTable()
      html += '<h' + lv + '>' + inline(m[2]) + '</h' + lv + '>\n'
      continue
    }
    if (/^[-*]\s+/.test(t)) {
      flushTable()
      if (!inUl) { flushList(); html += '<ul>\n'; inUl = true }
      html += '<li>' + inline(t.replace(/^[-*]\s+/, '')) + '</li>\n'
      continue
    }
    if (/^\d+[.、]\s+/.test(t)) {
      flushTable()
      if (!inOl) { flushList(); html += '<ol>\n'; inOl = true }
      html += '<li>' + inline(t.replace(/^\d+[.、]\s+/, '')) + '</li>\n'
      continue
    }
    if (/^\|/.test(t)) {
      flushList()
      if (!inTable) { tableBuf = []; inTable = true }
      tableBuf.push(t)
      continue
    }
    flushList(); flushTable()
    html += '<p>' + inline(t) + '</p>\n'
  }
  flushList(); flushTable()
  if (inCode) html += '<pre><code>' + escapeHtml(codeBuf.join('\n')) + '</code></pre>\n'
  return html.trim()
}

// ---------- 章节模板包装（与 chapter-01.html 一比一） ----------
function coverEmoji(title) {
  const map = [
    ['提示词', '🧭'], ['RAG', '📚'], ['检索', '📚'], ['微调', '⚙️'], ['部署', '⚙️'],
    ['多模态', '🖼️'], ['AIGC', '🖼️'], ['机器学习', '🧮'], ['深度学习', '🧮'], ['职场', '💼'],
    ['行业', '🏭'], ['职业', '🏭'], ['多智能体', '🤖'], ['编排', '🤖'], ['编程', '👨‍💻'],
    ['代码', '👨‍💻'], ['安全', '🛡️'], ['伦理', '🛡️'], ['智能体', '🐎'], ['大语言模型', '🧠'], ['LLM', '🧠'],
  ]
  for (const [k, v] of map) if (title.includes(k)) return v
  return '📘'
}

function chapterCover(num, title, desc) {
  return `<svg viewBox="0 0 1200 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="第${num}章 ${title}" style="width:100%;height:auto;border-radius:16px;margin:0 0 22px;box-shadow:0 10px 28px rgba(31,45,77,.15)">
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
}

function wrapChapter(num, title, desc, bodyHtml, minutes) {
  const d = today()
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta property="og:title" content="${title} · AI 学院 · 白驹全局大脑">
<meta property="og:description" content="AI 学院第${num}章 · ${desc}">
<meta charset="UTF-8">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${title} · AI 学院 · 白驹全局大脑</title>
<link rel="stylesheet" href="/theme-cloud.css">
<link rel="stylesheet" href="/site-redesign.css">
</head>
<body data-theme="cloud">
<nav><div class="logo">AI 创作纪元 · 离线版</div><a href="../website/ai-academy.html"><i class="cc-ic" data-ic="arrow-left" aria-hidden="true"></i> 学院首页</a>  <div class="nav-actions">
    <button class="theme-btn" id="ccoworkThemeBtn" onclick="ccoworkTheme()" title="切换主题"><span class="cc-theme-ics"><i class="cc-ic cc-ic-moon" data-ic="moon" aria-hidden="true"></i><i class="cc-ic cc-ic-sun" data-ic="sun" aria-hidden="true"></i></span></button>
  </div>
</nav>
<article>
<h1>${title}</h1>
<div class="blog-open">
  <div class="blog-badge">🐎 白驹 · 全局大脑 · AI 学院 第${num}章</div>
  <div class="blog-meta"><span>📅 ${d}</span><span>⏱ ${minutes} 分钟</span><span class="blog-tag">教程</span><span class="blog-tag" style="background:rgba(250,204,21,.14);color:#d97706;border:1px dashed rgba(217,119,6,.4)">🤖 AI 生成 · 以官方为准</span></div>
  <div class="blog-divider"></div>
</div>
${chapterCover(num, title, desc)}
<h1>第${num}章 ${title}</h1>

${bodyHtml}

</article>
<script src="/ccowork.js"></script>
<script src="/module.js"></script>
<script>
function ccoworkTheme(){var cur=document.body.getAttribute('data-theme')||'cloud';var next=cur==='cloud'?'deep':'cloud';document.body.setAttribute('data-theme',next);try{localStorage.setItem('ccowork.theme',next)}catch(e){}var b=document.getElementById('ccoworkThemeBtn');}
document.addEventListener('DOMContentLoaded',function(){var t=document.body.getAttribute('data-theme')||'cloud';var b=document.getElementById('ccoworkThemeBtn');});
</script>
</body>
</html>`
}

// ---------- 新章节清单（网上调研归纳的缺口板块） ----------
const CHAPTERS = [
  { num: 17, title: '提示词工程入门：从提问到指挥', desc: '提示词组成要素、撰写技巧、少样本与思维链', minutes: 50,
    outline: '什么是提示词；提示词的组成要素（指令/上下文/输入/输出格式）；撰写提示词的 6 大技巧；Zero-shot 与 Few-shot；思维链 CoT 与 ToT；提示词常见陷阱（模糊指令、幻觉、越狱）；两个完整示例对比' },
  { num: 18, title: '提示词工程进阶：结构化与迭代', desc: '角色设定、结构化输出、模板化与评估迭代', minutes: 55,
    outline: '角色设定与人格化提示；结构化输出（JSON/表格/固定格式）；System/User/Assistant 三段式；提示词模板化与复用（变量、版本管理）；提示词评估与迭代方法；结合 API 的自动化评测；防注入与安全边界' },
  { num: 19, title: 'RAG 检索增强生成实战', desc: 'RAG 原理、向量数据库、LangChain 实现与优化', minutes: 60,
    outline: '为什么需要 RAG（幻觉与知识时效）；RAG 三大环节：索引/检索/生成；向量化与 Embedding；向量数据库选型（Chroma/FAISS/Milvus）；文档切分策略；用 LangChain 十分钟搭一个知识库问答；RAG 优化：Query 改写/重排/混合检索；RAG 评估与幻觉抑制' },
  { num: 20, title: '大模型微调与私有化部署', desc: 'Ollama 私有化、LoRA 微调、量化与推理优化', minutes: 65,
    outline: '为什么需要微调与私有化；Ollama 一键本地部署开源模型；通过 API 调用本地模型；LoRA/QLoRA 参数高效微调原理；微调数据准备与格式；用 LlamaFactory 微调 Qwen 实战；模型量化（GGUF/INT8）与显存优化；部署架构与成本控制' },
  { num: 21, title: '多模态 AIGC：文生图与文生视频', desc: '扩散模型原理、Stable Diffusion、文生视频与数字人', minutes: 60,
    outline: 'AIGC 全景与工具矩阵；扩散模型原理通俗版；文生图实操：Stable Diffusion/即梦/可灵；提示词驱动图像质量（风格/构图/负面提示）；文生图进阶：ControlNet/LoRA 模型；文生视频与图生视频；数字人与语音合成；AIGC 版权与合规' },
  { num: 22, title: '机器学习与深度学习基础', desc: 'ML/DL 核心概念、神经网络、CNN/RNN/Transformer 速通', minutes: 70,
    outline: '机器学习范式：监督/无监督/强化；特征工程与模型评估；神经网络：感知机到多层网络、反向传播；CNN 卷积与图像识别；RNN/LSTM 与序列建模；注意力机制与 Transformer 架构；PyTorch 极简实战（手写数字识别）；从深度学习到大模型的跃迁' },
  { num: 23, title: 'AI 职场应用实战', desc: 'AI 写作、PPT、Excel 数据分析、简历面试全流程', minutes: 55,
    outline: 'AI 办公全景；AI 公文与文案写作（报告/邮件/周报）；AI 生成与优化 PPT；AI 辅助 Excel 与数据分析（公式/透视表/图表）；AI 简历优化与模拟面试；AI 会议纪要与人效提升；职场 AI 工具链推荐与组合打法；数据安全与合规提醒' },
  { num: 24, title: 'AI 行业应用与职业发展', desc: 'AI+X 行业图谱、岗位地图、认证体系与学习路线', minutes: 50,
    outline: 'AI+X 行业应用图谱（金融/医疗/教育/制造/法律）；各行业落地案例与机会；AI 岗位地图：提示词/智能体/RAG/微调工程师与算法岗；技能栈与薪资参考；认证体系（Prompt/智能体/RAG/微调工程师）；三个月学习路线图；作品集与求职策略' },
  { num: 25, title: '多智能体系统架构与编排', desc: '多智能体角色设计、通信协作、LangGraph 编排与成本控制', minutes: 65,
    outline: '为什么需要多智能体（复杂度/专精/并行）；多智能体典型模式：流水线/层级/辩论/市场；角色设计原则（职责单一、输入输出契约）；通信与状态共享（共享内存/消息总线/A2A）；用 LangGraph 实现多智能体编排（状态图/节点/边/条件路由）；多智能体评估与调试；成本与 token 控制；完整实战示例：一个三智能体内容工厂' },
  { num: 26, title: 'AI 编程助手与代码智能体', desc: 'Copilot/Cursor 类工具原理、AI 编程工作流与代码智能体实战', minutes: 60,
    outline: 'AI 编程助手全景（GitHub Copilot / Cursor / 通义灵码 / Codeium）；补全/对话/Agent 三种模式的原理与适用场景；AI 编程的正确姿势（任务拆解、验证闭环、上下文管理）；用 AI 从零写一个真实小项目（需求→生成→运行→修 bug 全流程）；代码智能体与自动编程（Claude Code / Cline / Aider 等，真实工具名）；AI 编程的坑与安全（幻觉代码、依赖投毒、许可证）；效率指标与团队落地建议' },
  { num: 27, title: 'MCP 智能体应用开发：连接万物的标准协议', desc: 'MCP 协议架构、三大原语、Python SDK 实战与生态盘点', minutes: 60,
    outline: '什么是 MCP（Model Context Protocol）：Anthropic 2024 年 11 月开源发布的开放标准，让 LLM 应用以统一方式连接外部工具/数据/服务，官方文档 modelcontextprotocol.io；为什么需要 MCP（告别 N 个工具 N 套定制集成的 N×M 问题，类比 USB-C）；MCP 核心架构三层：Host（主应用）/ Client / Server，一次 Host 可连多个 Server；三大原语：Tools 工具调用 / Resources 资源读取 / Prompts 提示模板，各自适用场景；传输方式：stdio（本地子进程）与 Streamable HTTP（远程，含 SSE），按需选型；官方 SDK：Python 版 mcp 包、TypeScript 版 @modelcontextprotocol/sdk，官方参考实现仓库 modelcontextprotocol/servers（filesystem/git/sqlite 等）；实战：用 Python SDK 写一个最小 MCP server（如 SQLite 查询工具）并用兼容客户端调用；生态现状：Claude Desktop、OpenAI、Google 及国内大模型厂商对 MCP 的支持，MCP Registry 官方注册中心，2026-08 Cloudflare WebMCP 开发者预览（网页向浏览器 AI 代理暴露工具，以官方为准）；安全与最佳实践：OAuth 2.0 鉴权、最小权限、提示注入防护；小结与练习' },
  { num: 28, title: 'DeepSeek Harness：插件化智能体运行时实战', desc: 'Model + Harness = Agent：全栈插件化 Agent 运行时框架、四种模式与插件开发', minutes: 60,
    outline: '什么是 DeepSeek Harness（智能体运行时框架而非模型本身，官方公式 Model + Harness = Agent）：深度求索 2026-08-13 开源 v0.1 开发者预览版、MIT 协议、GitHub 官方仓库可查（以官方为准），定位是连接模型与真实环境、调度工具完成任务的中介执行层；为什么需要执行层（模型只负责推理，文件操作/代码执行/网页检索/多工具调度等真实动作需要运行时完成；与 LangGraph 编排层、MCP 工具协议、Claude Code 类工具的定位区别与协作关系）；核心架构：一切皆插件（基于 Cordis 插件系统，模型/工具/技能/会话/沙箱/存储/循环/调度/UI 均为插件，通过服务与事件协作、配置层自由组合）；四种运行模式：标准模式（完整工具组合，日常任务）/ PTC 程序化工具调用（多步工具编排，复杂工作流）/ 极简模式（轻量命令行）/ 创造模式（插件试验与环境检查），按任务复杂度选型；安装与启动：官方文档给出的安装命令与 dsh 命令行入口、dsh web 本地控制台（端口以官方为准）、模型接入方式（官方宣称支持 DeepSeek/OpenAI/Anthropic/Google/Kimi 等近 40 家模型提供方，以官方文档为准）；实战：用 Harness 跑一个真实任务（如代码库检索/文件批量操作/多步工具调度），记录极简模式 CLI 的使用流程，运行 dsh 相关命令验证（具体命令以官方 README 为准）；插件开发入门：dsh-plugin 生态规模（GitHub 上 dsh-plugin 标签公开仓库与社区插件数以官方/社区现状为准）、插件结构（SKILL.md / 服务与事件注册，以官方规范为准）、如何发布与复用插件；生态与安全：国家超算互联网上线、QQ Bot 接入等官方动态（以官方公告为准）；Agent 运行时安全：最小权限、沙箱隔离、插件来源审查；小结与练习' },
  { num: 29, title: '多模态大模型理解实战：从视觉编码器到图文问答', desc: 'VLM 原理、OCR/图表/视频/音频理解、豆包/通义/智谱多模态 API 实战与评测', minutes: 65,
    outline: '什么是多模态大模型（VLM）：理解方向（图像问答/OCR/图表/视频/音频）与生成方向（对应第 21 章 AIGC）的区别，为什么多模态理解是 Agent 感知世界的基础；2026-08 真实进展：DeepSeek-V4-Flash-Vision-Exp（8/21 上线，DeepSeek 首个官方视觉多模态模型，纯文本能力与 V4-Flash 持平、多模态 Agent 能力对标同期旗舰，以官方文档为准）、GLM-5.3-Flash（8/26 智谱发布，首个原生多模态 GLM-5 基座，320B 总参/18B 激活 MoE、1M 上下文、开源权重，以官方为准）、Gemini 3.5 Audio 与 Omni Flash（8/26-27 发布，音频理解与全模态方向，以官方为准）、Qwen3.8-Max（原生多模态，文本/图像/视频/音频单窗口 1M 上下文，以官方为准）；VLM 工作原理：视觉编码器（ViT）+ 投影对齐层 + LLM 主干，动态分辨率与视觉 Token 数对推理成本的影响；核心任务与基准：图像问答（VQA）、OCR 与文档理解（DocVQA 类）、图表/表格理解、视频理解（抽帧+时序建模）、音频理解，评测基准 MMMU/MMBench/OCRBench（以官方榜单为准）；真实 API 实战：OpenAI 兼容多模态接口的输入格式（image_url 或 base64、多图、视频帧、音频字段），用豆包/通义/智谱官方 SDK 与模型 ID 调用视觉模型（端点与模型 ID 以官方文档为准），实战：发票/证件 OCR 抽取结构化 JSON；本地可跑的开源多模态模型：Qwen3.8-27B（Apache 2.0）与 GLM-5.3-Flash（MIT），量化后消费级 GPU 可推理（以官方为准）；选型与成本：闭源 vs 开源多模态模型定价对比、按任务选模型；局限与安全：多模态幻觉、图像隐私与证件信息脱敏合规、Prompt 注入；小结与练习' },
  { num: 30, title: '开源旗舰与长上下文实战：腾讯混元 Hy4 preview 接入指南', desc: '770B 开源旗舰、1M 上下文的应用场景、OpenRouter/TokenHub 接入与上下文工程', minutes: 60,
    outline: '2026-08-29 真实热点：腾讯混元 8/28 发布并开源旗舰大模型 Hy4 preview——总参 770B/激活 49B 的 MoE 架构、上下文长度 1M、定位「真正生产力」（软件工程/办公/游戏开发/科研），权重已上 HuggingFace/GitHub/ModelScope，API 上线腾讯云 TokenHub 与 OpenRouter，官方定价输入 6 元/百万 tokens、输出 18 元/百万 tokens（价格与参数以官方为准）；为什么 1M 长上下文重要：长上下文 vs RAG 的关系（上下文工程 context engineering 的概念）、一次装下整本技术书/整个中型代码库的能力边界（1M token 约相当于多少中文/英文内容量级，以官方说明为准）；开源旗舰模型怎么接：三条真实路径——①OpenRouter（openrouter.ai）统一 OpenAI 兼容 API 直接调用（模型 ID 以官方为准）、②腾讯云 TokenHub（tencentcloud 云上模型服务，Endpoint 与鉴权以官方文档为准）、③本地/私有部署（HuggingFace 或 ModelScope 下载权重，transformers 库加载，硬件门槛与量化方式以官方为准）；长上下文实战场景：整本 PDF/书籍问答、大型代码库检索问答（对比 ch19 RAG 与长上下文两种路线）、长文档摘要与多轮长对话；长上下文工程技巧：上下文窗口与注意力机制（稀疏注意力/长上下文优化，以官方技术报告为准）、输入裁剪与关键信息前置、按 token 计费的成本意识（6 元/百万输入、18 元/百万输出意味着 1M 满上下文一次调用约多少钱，动手算一下）、超长文本评测基准（LongBench 等，以官方为准）；开源旗舰选型视角：Hy4 preview vs GLM-5.3 vs Kimi K3 的开源旗舰格局（腾讯内部 163 名专家/203 个工程任务盲测均分 2.99/4 略优于 GLM-5.3 与 Kimi K3，以官方公布为准）；真实 API 调用示例：用 OpenAI 兼容 SDK（openai Python 包）发一个长上下文请求的代码骨架（base_url 指向 OpenRouter 或 TokenHub，具体端点与模型 ID 以官方为准）；局限与注意：长上下文不等于强推理、输入 1M 的成本与限流、开源权重合规（模型协议以官方 License 为准）；小结与练习' },
  { num: 31, title: '开源视频生成实战：MiniMax-H3 全模态模型本地部署', desc: 'H3 全模态架构、文生/图生/首尾帧视频、权重下载与本地推理、提示词与合规', minutes: 65,
    outline: '2026-08 真实热点：MiniMax 8-03 正式开源通用全模态生成大模型 MiniMax-H3（GitHub: MiniMax-AI/MiniMax-H3，许可协议 MiniMax H3 Community License Agreement，以官方为准），统一理解文本/图像/视频/音频多模态上下文并生成带原生双声道立体声的音视频内容；能力矩阵：文生视频、首帧生视频、尾帧生视频、首尾帧生视频，最高 15 秒 2K 24FPS、32kHz 立体声、11 种语言，发布即在 Artificial Analysis 视频编辑能力榜单登顶、指令遵循/文字与品牌信息呈现/视频到视频动作迁移表现突出（榜单与数据以官方为准），8-29 权重正式开源（以官方为准）；什么是全模态生成模型：与 ch21 在线工具（即梦/可灵/海螺）的定位区别、与 ch29 VLM 理解方向的互补（生成 vs 理解）、从「用工具生成」到「本地跑权重」的技能跃迁价值；本地部署实战：下载权重（HuggingFace / ModelScope，以官方为准）→ 官方推理脚本 / ComfyUI 集成（以官方文档为准）→ 文生视频/图生视频/首尾帧的命令行参数与基本用法 → 显存要求（官方公布单 GPU 生成 15 秒 768p 约 13 秒，以官方为准）与量化方式；视频生成提示词工程：时间连续性、镜头语言、人物一致性、文字与品牌信息呈现、指令遵循，对比文本提示词（ch17/18）的异同；用 API 快速体验：MiniMax 开放平台 API 接入方式与定价（以官方文档为准）；生态与工具：MiniMax Design 多模态创作 Agent 工作台（8-20 发布，任务规划/素材整理/多步骤协同）、fal 平台 H3 Max 后训练版高吞吐（以官方为准）；应用与合规：广告/电商/游戏制作落地场景、AIGC 标识与深度伪造风险、模型许可协议与商用边界（以官方 License 为准）；小结与练习' },
  { num: 32, title: '端侧大模型推理实战：Google LiteRT-LM 让 AI 跑在手机上', desc: '端侧 LLM 推理框架、NPU/GPU 加速、跨平台部署与离线 AI 应用', minutes: 60,
    outline: '为什么需要端侧/边缘大模型推理：隐私优先（数据不离设备）、零延迟离线可用、无 API 成本、弱网/无网场景可用，与第 20 章 Ollama 服务端私有化的区别与互补关系；什么是 LiteRT-LM：Google 推出的生产级端侧 LLM 推理编排层（LiteRT 即原 TensorFlow Lite 的演进，LiteRT-LM 负责在设备上高效运行语言模型流水线），GitHub 官方仓库 google-ai-edge/LiteRT-LM、Apache-2.0 开源协议、最新版本 v0.16.1（2026-08，版本号以 GitHub Releases 为准），官方文档 ai.google.dev/edge/litert；核心架构与能力：LiteRT 运行时引擎 + 模型转换流水线（.tflite/.task 格式）、KV-cache 与生成式优化、跨平台执行（Android/iOS/Linux/嵌入式/Web）；硬件加速：NPU 集成（设备专用 NPU 无缝调用）、GPU delegate、实验性 YNNPACK delegate（linux arm64）、对 llama.cpp 的性能对比（社区称速度领先，以实测为准）；支持的开源模型：Gemma 全家族（Gemma 3 / Gemma 3n / Gemma 4，Google 官方开源权重）等 Open-weight 模型（以官方支持列表为准）；跨平台实战路径：①Android——Java/Kotlin API 调用、Android Studio 集成、agent-skill 演示；②iOS——Swift 包（macOS/iOS）、CocoaPods/SPM 集成；③Linux 命令行——CLI 内置 OpenAI 兼容 server（本地起服务、其他程序当 API 调用）；④Web——LiteRT.js 浏览器内 AI 推理（2026-07 Google 发布 LiteRT.js 高性能 Web AI 推理，以官方博客为准）；端侧 Agent 实践：Android 上 agent-skill 演示（让本地模型调度设备能力完成多步任务，以官方示例为准）；模型转换与部署流程：原始权重 → 量化（INT4/INT8）→ LiteRT 模型 → 部署到目标设备的完整链路（转换命令与参数以官方文档为准）；端侧 vs 云端选型：模型质量天花板（端侧受参数量限制，不如云端旗舰）、内存/功耗/发热约束、适合场景（隐私问答/离线翻译/本地助手/智能输入法）；与同类方案对比：LiteRT-LM vs Ollama（桌面服务端）vs llama.cpp（社区推理引擎）vs MediaPipe LLM（Google 另一套 GenAI API）的定位差异；隐私与合规：端侧推理天然满足数据不出本机、满足 GDPR/个保法要求；局限与注意：模型选择有限、端侧硬件碎片化、首次加载与内存占用；小结与练习' },
  { num: 33, title: '端侧百万上下文实战：星火 X2.5 开源模型部署与 Agent 落地', desc: '混合注意力架构、1M 上下文、Ollama/vLLM/SGLang 部署、端侧 Agent 与工具调用', minutes: 60,
    outline: '2026-09 真实热点：科大讯飞全资子公司词元星火 9-01 正式开源端侧通用大模型 Spark-X2.5-4B 与 Spark-X2.5-1.7B（GitHub: XHToken/Spark-X2.5、HuggingFace: XHToken/Spark-X2.5-4B，Apache-2.0 许可协议，以官方为准），业界首个端侧原生支持最长 100 万（1,048,576）Token 上下文的开源模型，覆盖 200+ 种语言；为什么「端侧 + 百万上下文」是大事：与第 32 章 LiteRT-LM（Google 端侧推理框架）构成姊妹篇——一个是推理框架、一个是国产开源模型，与第 20 章 Ollama 服务端私有化的定位差异；过去端侧模型处理长文档需切段提问（易忘前情/漏信息），百万 Token ≈ 70 多万字，可一次读完一本产品手册或整份项目文档；核心技术拆解：混合注意力架构（全量注意力层与滑动窗口注意力层交替，以官方技术说明为准）、约 20 万亿 Token 多样化数据全国产算力平台预训练（以官方为准）、围绕智能体/代码/数学/指令遵循四大能力优化、Dense 架构 vs MoE 的取舍；部署实战（真实可执行）：权重下载（HuggingFace / GitHub，BF16 Safetensors 约 8.23GB，以官方为准）→ Ollama / LM Studio 一键部署（依赖词元星火定制版 llama.cpp，命令与参数以官方文档为准）→ vLLM 服务化（需安装 Spark-plugin）/ SGLang（使用指定 nightly 镜像）→ MLX（Apple 芯片）/ GGUF 量化路径；显存与资源注意：1M 是模型能力上限而非普通设备可低成本跑满，实际显存随上下文长度/并发量/KV Cache 明显增长（以官方为准）；Agent 与工具调用：长上下文解决「信息能不能看全」，工具调用解决「看完能不能动手」——通过 DeepSeek Harness / OpenCode / Codex / Pi 等开源 Harness 接入本地开发与自动化流程（官方列举，接入方式以各项目文档为准）；实测与场景：Domux 智能家居测试集 1.7B 控制指令端到端执行正确率 90.3%、平均响应 0.85 秒（官方公布数据，以官方为准），办公案例（上传销售明细表 → 本地写脚本汇总 → 生成约 3000 字中英双语业绩报告）、代码场景对标参数大 2-3 倍云端模型、机器人/车载/智能硬件持续感知与连续执行；API 快速体验：讯飞星辰 MaaS 平台模型集市（maas.xfyun.cn）已上线对应 API 且限时免费（以官方为准），与本地部署的成本对比；生态与趋势：9-7 将发布 293B 星火 X2.5 基座大模型（以官方为准）、端云协同矩阵、全国产算力与自主可控；与同尺寸开源端侧模型对比（Qwen3.5-4B / Gemma4-E4B 等，榜单数据以官方公布为准）；隐私与合规：端侧推理天然数据不出本机、离线可用、满足个保法/GDPR 场景；小结与练习' },
  { num: 34, title: 'NVIDIA NOOA 对象导向智能体框架：让 Agent 成为 Python 对象', desc: 'Agent 即 Python 类、六大接口能力、按引用传递与长期记忆实战', minutes: 65,
    outline: '什么是 NOOA（NVIDIA Object-Oriented Agents）：NVIDIA Labs 于 2026-07-27 开源的研究预览版（research preview），Apache 2.0 协议，GitHub 官方仓库 NVIDIA-NeMo/labs-OO-Agents，技术报告 arxiv.org/abs/2607.20709，官方博客 developer.nvidia.com/blog/six-agent-harness-capabilities-for-higher-model-performance（发布信息与链接以官方为准）；核心设计理念：an agent is a Python object——Agent 是单个 Python 类，方法即能力（capabilities）、字段即状态（state）、docstring 即提示词（prompt）、类型注解即强制契约（contracts），方法体为 ...（省略号）的由 LLM 在运行时驱动（generation method），有真实方法体的执行确定性 Python 逻辑（deterministic method）；为什么需要对象导向 Agent 范式：现有框架（LangGraph/LangChain/AutoGen 等）将提示词模板、工具 schema、回调代码、工作流图拆为多个抽象层导致的碎片化问题，NOOA 用单一 Python 类统一起来，使 Agent 开发回归传统软件开发——可 diff、可 code-review、可单元测试、可 trace、可版本管理；六大模型接口能力（Six model-facing interface ideas）：①类型化输入输出（Typed I/O，调用有类型参数与验证返回值，非自由文本）②按引用传递（Pass by reference，模型操作活动 Python 对象，看到有界预览而非序列化全量，工具结果不进上下文窗口）③代码即动作（Code as action，模型通过写 Python 代码执行动作，含控制流与内联方法调用）④可编程循环工程（Programmable loop engineering，编排循环是普通 Python，开发者和模型都可写）⑤显式对象状态（Explicit object state，持久化类型状态在 Agent 对象上，非仅对话历史）⑥模型可调用 Harness API（Context 块与事件历史是模型可检查和管理的 API）；长期记忆子系统：基于 SQLite 的人类可读存储，Agent 通过模型可调用工具主动策划记忆（写入/查询/修正记录），记录携带类型/重要性/标签，类型化关系（supports/contradicts/derived-from）构成知识图谱而非扁平日志，后台反思 pass 自动合并重复/链接关联/提炼洞察/清除过期信息，跨会话持久化；安装与快速上手：pip install nooa 或 uv add nooa（官方推荐 uv），可选子包 nooa-cli（CLI 与 trace viewer）/nooa-acp（Agent Client Protocol，对接 Zed 编辑器）/nooa-memory（长期记忆）/nooa-bench（基准测试），通过 LiteLLM 支持多模型（Anthropic/OpenAI/Ollama/vLLM 等，以 LiteLLM 支持列表为准）；实战代码走读：定义一个继承 Agent 的类、设置 llm、编写 generation method（... 体由 LLM 完成）、编写 deterministic method（真实体做验证逻辑）、运行 asyncio、用 nooa start-dev 启动 trace viewer（端口 5001 以官方为准）；基准测试结果（以官方公布为准，依赖所用模型）：SWE-bench Verified 82.2%（GPT-5.5，约半数 token 与 LLM 调用次数，无需上下文压缩）、CyberGym L1 86.8%（GPT-5.5，无网络访问，开源 Agent 最高分）、ARC-AGI-3 85.1%（GPT-5.6-sol，低于 20 美元/局），token 成本约半数得益于 pass by reference 与 append-only 追加式 transcript 保持 cache 有效；与其他 Agent 框架的定位对比：NOOA vs LangGraph（ch25 编排层，图编排 vs 对象编排）vs MCP（ch27 工具协议，NOOA 的方法是内置接口而非外部协议）vs DeepSeek Harness（ch28 运行时框架，插件化 vs 类化）；安全实践：NOOA 是研究预览版有粗糙边缘，AST 检查与模块黑名单是纵深防御非隔离边界，真正隔离需 OS 级沙箱（容器/VM/NVIDIA OpenShell），官方安全提醒代码可能执行危险操作；局限与注意：仅支持 Python、研究预览版状态、依赖模型能力（基准分数随模型变化）、文档与生态仍在早期；小结与练习' },
  { num: 35, title: '开源多模态权重实战：DeepSeek-V4-Flash-Vision-Exp 本地部署与视觉 Agent', desc: '305B MIT 视觉模型权重开源、FP8 与 GGUF 部署路径、vLLM/SGLang 服务化与视觉 Agent 全链路', minutes: 65,
    outline: '2026-09 真实热点：DeepSeek 于 8-31/9-1 在 Hugging Face 开源 V4 家族首个原生多模态模型 DeepSeek-V4-Flash-Vision-Exp（仓库 deepseek-ai/DeepSeek-V4-Flash-Vision-Exp，MIT 许可协议，总参数约 305B，FP8 精度权重 48 个 safetensors 文件共约 168GB，附 tokenizer、prompt encoding 参考实现与最小化 PyTorch 推理代码，以官方仓库为准），距 8-21 API 上线约十天即开放权重，是继 8-25 Z.ai GLM-5.3-Flash 开源权重后第二款超 300B 参数级别的 MIT 开源多模态 MoE（对比定位以官方为准）；为什么这章值得学：与第 29 章（多模态理解 API 实战）构成姊妹篇——ch29 讲「调 API 用视觉模型」，本章讲「把权重搬回自己机器」，与第 20 章 Ollama 私有化、第 32/33 章端侧部署、第 34 章 NOOA 对象 Agent 一起拼齐「开源模型部署全景」；架构拆解（以官方技术说明为准）：V4-Flash-0731 文本主干 284B 总参/约 13B 激活的稀疏 MoE（43 层、hidden 4096、上下文 1M token，256 个路由专家+1 共享专家、每 token 激活 6 个专家），叠加视觉编码器（32 层、1024 维、16 注意力头，图像按 14×14 patch 切分）与 aligner（把视觉特征投射进 4096 维语言隐藏空间后当作 token 序列与文本拼接输入），整体约 305B；DFlash 注意力、Hyper-Connections、DSpark 投机解码（以官方为准）；视觉输入口径：原生支持 JPEG/PNG/GIF/WebP，单图缩放后最多 384 视觉 token、单请求最多 600 张图（与 API 计费口径一致，以官方文档为准）；四条真实部署路径（由省事到硬核）：①DeepSeek API 快速体验——OpenAI 兼容 Chat Completions/Responses 与 Anthropic Messages 三套接口都支持图文输入，图片按 V4-Flash 文本费率计费（参考价输入 1.5-3 元/百万 tokens、输出 4.5-9 元/百万 tokens，高峰时段周一至周五 9-12 点/14-18 点上浮、缓存命中 95%+ 可显著降本，价格以官方定价页为准），OpenRouter 平台亦可调用；②Ollama / llama.cpp 单机跑 GGUF——社区 Unsloth 已发布量化版仓库 unsloth/DeepSeek-V4-Flash-Vision-Exp-GGUF（推荐 UD-Q4_K_XL 约 155GB、UD-Q8_K_XL 约 162GB），Ollama 一行拉取（ollama run hf.co/unsloth/DeepSeek-V4-Flash-Vision-Exp-GGUF:UD-Q4_K_XL）或 llama.cpp 起 OpenAI 兼容本地服务（llama serve -hf unsloth/DeepSeek-V4-Flash-Vision-Exp-GGUF:UD-Q4_K_XL），命令与量化档位以官方仓库为准；③KTransformers 混合推理省钱路径——专家权重放系统内存由 CPU 执行、注意力层放 GPU，RTX 5090（约 20+ tok/s 实测）/4090（约 10-11 tok/s）级显卡 + 200GB+ 系统内存 + x86 AVX2 指令集，官方教程见 ktransformers 文档 DeepSeek-V4.md，截至本写作日期多模态版适配状态以官方仓库为准；④vLLM/SGLang 多卡服务化（生产首选）——官方仓库已更新 vLLM recipe 与 SGLang 支持、提供 Docker 镜像（约 4×H200 或同档 GPU 集群，命令以官方 README 为准），DeepSeek 同步官方适配 DeepSeek Harness 智能体框架，打通「视觉输入→工具调用」全链路闭环（呼应第 28 章 Harness、第 34 章 NOOA）；硬件门槛的理性认知：内存比显卡贵——168GB 权重需 170-200GB 可用内存（Mac Studio M3/M5 Ultra 192GB+ 可跑 GGUF、工作站 8 条 DDR5 + 单张 4090/5090 走 KTransformers、双 DGX Spark 组网 4-bit 等，均为社区实测参考以官方为准）；官方自测基准与理性看待（重要诚实标注）：模型卡数据由 DeepSeek 自家 Harness Minimal Mode 评测（max reasoning、temperature 1.0、top_p 0.95），尚无独立实验室复现，且对比对象 Claude Opus 4.8 已非 Anthropic 当前旗舰（Opus 5 已于 7-24 发布）——官方公布：ApexBench 36.5（vs Opus 4.8 的 39.4）、ZeroBench 35.0（vs 34.0）、Chartography 64.3（vs 65.0）、DeepSWE 59.3（超文本版 V4-Flash 的 54.4）、Terminal Bench 2.1 83.9、Agents Last Exam 27.3（vs Opus 4.8 的 25.7），多模态 Agent 评测 2 胜 2 负/文本 1 胜 6 负，全表以官方模型卡为准，自行实测最可靠；视觉 Agent 实战方向：发票/证件/截图 OCR 结构化抽取、图表问答、截图驱动 QA 与界面理解、结合 Harness/NOOA 编排「看→想→调工具→交付」的最小视觉 Agent 闭环（给出可运行的 OpenAI 兼容调用代码骨架与本地服务对接示例）；微调与合规：MIT 协议允许自由商用/修改/微调且无地域限制、本地/内网部署数据不出域（政务/医疗/金融等敏感场景价值）、图片隐私与证件信息脱敏、模型标注「Exp 实验版本」非稳定版（以官方说明为准）；小结与练习' },
  { num: 36, title: '微软 Orchard 框架：Agent 训练基础设施与数据蒸馏实战', desc: 'Agentic AI 建模框架、K8s 沙箱服务、三域训练 recipe、失败轨迹价值挖掘与小模型逼近前沿', minutes: 65,
    outline: '什么是 Orchard：微软研究院 2026-07 开源的 Agentic AI 建模框架（GitHub: microsoft/Orchard，MIT 协议，arxiv.org/abs/2605.15040，官方博客 microsoft.com/en-us/research/blog/orchard-an-open-framework-for-scalable-agentic-ai/，以官方为准）；定位区别：Orchard 不是编码助手而是 Agent 训练基础设施，解决每个团队构建 AI Agent 时都要从头重建的沙箱管理/数据蒸馏/RL rollout 脚手架问题，与第 25 章 LangGraph 编排层、第 28 章 DeepSeek Harness 运行时、第 34 章 NOOA 对象导向 Agent 的互补关系；核心架构：Orchard Env 是 Kubernetes 原生服务，将沙箱生命周期/命令执行/文件 I/O/网络策略抽象为 REST API，Python SDK 经 FastAPI orchestrator 管理 K8s pod 创建，执行请求绕过 API server 直达沙箱 pod 实现低延迟，harness 无关设计同一基础设施通吃 SFT 数据收集/RL rollout/最终评估；三个训练 recipe：Orchard-SWE 软件工程（73% SWE-bench Verified 约 3B 活跃参数、覆盖 2,788 个 GitHub 仓库、MiniMax-M2.5 与 Qwen3.5-397B 生成轨迹、OpenHands 与 mini-swe-agent 双 harness）、Orchard-GUI 浏览器导航（4B 视觉语言模型、WebVoyager/Online-Mind2Web/DeepShop 基准）、Orchard-Claw 个人助手（Claw-Eval 基准，以官方为准）；关键技术拆解：Balanced Adaptive Rollout BAR、密集奖励信号 on-policy distillation + rubric-based process reward、value-model reranking 的递进提升路径 61.4% 到 69.1% 到 69.7% 到 73.0%（以官方为准）；失败轨迹的价值挖掘：retrospective value estimation 从未解决轨迹提取有进展片段（32,536 失败 + 74,649 成功 = 107,000 总轨迹，以官方为准）；开源资产：GitHub 仓库含环境服务与训练代码、HuggingFace 数据集含 107,000 SWE 轨迹与 3,070 GUI rollout 含失败轨迹、配套项目 OpenForge RL 在真实部署 harness 中训练 agent（ZeroClaw/OpenClaw/Codex）；安装与上手：Python SDK 调用、K8s 环境准备、REST API 用法、harness 接入方式（命令与参数以官方文档为准）；适用人群与场景：研究/组织级 Agent 训练、SFT 数据收集与 RL rollout 复用、小模型逼近前沿系统的趋势；局限与注意：研究级框架需 K8s 运维门槛、GUI/Claw recipe 数据量较薄为概念验证、训练成本与硬件要求以官方为准；小结与练习' },
]

// ---------- 毕业设计项目规格（现有 8 + 新增 16 = 24） ----------
const PROJECTS = [
  { id: 'stock-insight', emoji: '📈', name: 'StockInsight 股票分析', cat: '金融数据', desc: '股票数据查询、K 线分析与投资洞察智能体', tags: ['金融', '数据', 'Python'] },
  { id: 'database-agent', emoji: '🗄️', name: 'Database Agent', cat: '数据库', desc: '自然语言 → SQL 查询，对话式数据库操作', tags: ['数据库', 'NLP', 'LangChain'] },
  { id: 'column-writer', emoji: '✍️', name: 'ColumnWriter 专栏写手', cat: '内容创作', desc: '多智能体协作的专栏内容创作流水线', tags: ['内容', '多智能体', '创作'] },
  { id: 'health-record', emoji: '❤️', name: 'HealthRecord 健康助手', cat: '健康', desc: '健康记录管理、趋势洞察与建议生成', tags: ['健康', '记录', '洞察'] },
  { id: 'email-assistant', emoji: '📧', name: 'EmailSmartAssistant', cat: '办公效率', desc: '邮件分类、摘要与智能回复助手', tags: ['邮件', 'NLP', '自动化'] },
  { id: 'network-health', emoji: '🛰️', name: 'NetworkHealthReport', cat: '运维', desc: '网络健康监测与自动诊断报告生成', tags: ['运维', '诊断', '报告'] },
  { id: 'mind-echo', emoji: '💭', name: 'MindEcho 心声回响', cat: '心理健康', desc: '基于长期记忆的心理陪伴与情绪记录 Agent', tags: ['心理', '记忆', '陪伴'] },
  { id: 'data-analysis', emoji: '🧠', name: 'DataAnalysisAgent', cat: '数据分析', desc: '数据探索、清洗与可视化分析智能体', tags: ['数据', '分析', '可视化'] },
  { id: 'meeting-minutes', emoji: '📝', name: 'MeetingMinutes 会议纪要官', cat: '办公效率', desc: '语音转写 + 议题提炼 + 待办分派的会议纪要 Agent', tags: ['办公', '语音', '纪要'] },
  { id: 'code-reviewer', emoji: '🔍', name: 'CodeReviewer 代码评审助手', cat: '开发工具', desc: '代码审查、缺陷检测与重构建议的 AI 评审员', tags: ['开发', '审查', '重构'] },
  { id: 'legal-assistant', emoji: '⚖️', name: 'LegalAssistant 法律咨询助手', cat: '法律服务', desc: '法规检索、条款解读与文书起草的法律助手', tags: ['法律', '检索', '文书'] },
  { id: 'tutor-agent', emoji: '🎓', name: 'TutorAgent 家教辅导', cat: '教育', desc: '个性化答疑、错题解析与学习计划的辅导 Agent', tags: ['教育', '答疑', '计划'] },
  { id: 'resume-coach', emoji: '📄', name: 'ResumeCoach 简历优化教练', cat: '求职', desc: '简历诊断、岗位匹配与面试模拟的一站式求职助手', tags: ['求职', '简历', '面试'] },
  { id: 'finance-bot', emoji: '💰', name: 'FinanceBot 理财顾问', cat: '金融', desc: '记账分析、预算建议与理财科普的对话式顾问', tags: ['金融', '理财', '预算'] },
  { id: 'travel-planner', emoji: '✈️', name: 'TravelPlanner 行程规划师', cat: '出行', desc: '多约束行程编排、景点推荐与实时调整的旅行 Agent', tags: ['出行', '规划', '推荐'] },
  { id: 'news-digest', emoji: '📰', name: 'NewsDigest 新闻摘要官', cat: '资讯', desc: '热点聚合、事实核验与要点摘要的资讯 Agent', tags: ['资讯', '摘要', '核验'] },
  { id: 'research-agent', emoji: '📚', name: 'ResearchAgent 论文研读助手', cat: '学术', desc: '论文下载、要点抽取、综述生成的研究助手', tags: ['学术', '论文', '综述'] },
  { id: 'marketing-writer', emoji: '📣', name: 'MarketingWriter 营销文案机', cat: '营销', desc: '跨平台营销文案、广告创意与投放建议生成', tags: ['营销', '文案', '广告'] },
  { id: 'customer-support', emoji: '🎧', name: 'CustomerSupport 智能客服', cat: '服务', desc: '工单分类、知识库问答与情绪安抚的客服 Agent', tags: ['客服', '工单', '知识库'] },
  { id: 'image-captioner', emoji: '📷', name: 'ImageCaptioner 看图说话', cat: '多模态', desc: '图像理解、场景描述与内容标注的多模态 Agent', tags: ['多模态', '图像', '标注'] },
  { id: 'data-cleaner', emoji: '🧹', name: 'DataCleaner 数据清洗工', cat: '数据处理', desc: '缺失值、异常值、重复项自动清洗的数据工', tags: ['数据', '清洗', '质检'] },
  { id: 'podcast-script', emoji: '🎙️', name: 'PodcastScript 播客脚本工', cat: '内容创作', desc: '选题、提纲、口播稿与金句的播客全流程脚本', tags: ['内容', '播客', '脚本'] },
  { id: 'health-coach', emoji: '💪', name: 'HealthCoach 健身教练', cat: '健康', desc: '训练计划、饮食建议与打卡激励的私教 Agent', tags: ['健康', '健身', '计划'] },
  { id: 'iot-monitor', emoji: '🏭', name: 'IoTMonitor 物联网监控', cat: '物联网', desc: '设备数据采集、异常告警与预测性维护的监控 Agent', tags: ['物联网', '告警', '预测'] },
]

// ---------- 项目详情页模板（与章节模板同源） ----------
function wrapProject(p, bodyHtml, num) {
  const d = today()
  const pad = String(num).padStart(2, '0')
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta property="og:title" content="${p.name} · AI 学院毕业设计 · 白驹全局大脑">
<meta property="og:description" content="AI 学院毕业设计项目：${p.desc}">
<meta charset="UTF-8">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${p.name} · AI 学院 · 白驹全局大脑</title>
<link rel="stylesheet" href="/theme-cloud.css">
<link rel="stylesheet" href="/site-redesign.css">
</head>
<body data-theme="cloud">
<nav><div class="logo">AI 创作纪元 · 离线版</div><a href="../website/ai-academy-projects.html"><i class="cc-ic" data-ic="arrow-left" aria-hidden="true"></i> 项目库</a>  <div class="nav-actions">
    <button class="theme-btn" id="ccoworkThemeBtn" onclick="ccoworkTheme()" title="切换主题"><span class="cc-theme-ics"><i class="cc-ic cc-ic-moon" data-ic="moon" aria-hidden="true"></i><i class="cc-ic cc-ic-sun" data-ic="sun" aria-hidden="true"></i></span></button>
  </div>
</nav>
<article>
<h1>${p.emoji} ${p.name}</h1>
<div class="blog-open">
  <div class="blog-badge">🐎 白驹 · 全局大脑 · AI 学院 毕业设计 ${pad} 号</div>
  <div class="blog-meta"><span>📅 ${d}</span><span class="blog-tag">${p.cat}</span></div>
  <div class="blog-divider"></div>
</div>
<h1>${pad} 号毕业设计：${p.name}</h1>

${bodyHtml}

</article>
<script src="/ccowork.js"></script>
<script src="/module.js"></script>
<script>
function ccoworkTheme(){var cur=document.body.getAttribute('data-theme')||'cloud';var next=cur==='cloud'?'deep':'cloud';document.body.setAttribute('data-theme',next);try{localStorage.setItem('ccowork.theme',next)}catch(e){}var b=document.getElementById('ccoworkThemeBtn');}
document.addEventListener('DOMContentLoaded',function(){var t=document.body.getAttribute('data-theme')||'cloud';var b=document.getElementById('ccoworkThemeBtn');});
</script>
</body>
</html>`
}

// ---------- 生成单个项目详情页 ----------
async function genProject(env, p, idx, dry) {
  const dir = path.join(ACADEMY, 'projects')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const fp = path.join(dir, p.id + '.html')
  if (fs.existsSync(fp) && !force) {
    console.log('⏭ 跳过 ' + p.id + '（已存在）')
    return { id: p.id, status: 'skip' }
  }
  const sys = '你是「白驹 AI 学院」毕业设计导师。你撰写的项目文档要专业、具体、可落地，面向想动手复现的中文学习者。你只输出 Markdown 正文，不要寒暄。'
  const user = `请为 AI 学院毕业设计项目《${p.name}》（${p.emoji}，分类：${p.cat}，简介：${p.desc}）撰写一份完整可复现的项目文档。

要求：
1. 开头一段 60-100 字引言（这个项目解决什么问题、学完后你能获得什么能力）。
2. 用 6-8 个 "## " 二级小节，覆盖以下固定结构（顺序照此）：
   ## 项目简介
   ## 功能特性（用 "- " 列表列 5-6 个核心功能）
   ## 技术架构（用 Markdown 表格列出：组件 / 技术选型 / 作用；再加一段架构说明）
   ## 核心代码骨架（用三个反引号代码块给出 1-2 段关键代码，带注释，说明各模块职责）
   ## 运行步骤（用有序列表 "1. " 给出从环境准备到启动的 5-7 步，命令要具体）
   ## 扩展思路（用 "- " 列表给出 3-4 个进阶方向）
   ## 小结与练习（3 条收获 + 2 道动手练习）
3. 总字数 1200-1800 字，内容必须具体（真实库名、真实命令、可执行的代码骨架），不要空话。
4. 全文只输出 Markdown 正文；"## " 表示二级标题；不要用代码围栏包住整篇文档。`
  console.log('✍️  ' + p.id + ' 生成中（' + p.name + '）...')
  if (dry) return { id: p.id, status: 'dry' }
  const md = await askLLM(env, sys, user)
  const bodyHtml = mdToHtml(md)
  const html = wrapProject(p, bodyHtml, idx + 1)
  fs.writeFileSync(fp, html, 'utf8')
  console.log('✅ ' + p.id + ' 已写入（' + html.length + 'B）')
  return { id: p.id, status: 'ok' }
}

async function genProjects(env, dry) {
  let ok = 0, skip = 0, fail = 0
  for (let i = 0; i < PROJECTS.length; i++) {
    try {
      const r = await genProject(env, PROJECTS[i], i, dry)
      if (r.status === 'ok') ok++
      else if (r.status === 'skip') skip++
      else if (r.status === 'dry') skip++
    } catch (e) {
      fail++
      console.log('❌ ' + PROJECTS[i].id + ' 失败：' + e.message)
    }
  }
  console.log('📊 项目汇总：生成 ' + ok + ' · 跳过 ' + skip + ' · 失败 ' + fail)
}

// ---------- 生成单章 ----------
async function genChapter(env, spec, dry) {
  const fp = path.join(ACADEMY, 'chapter-' + String(spec.num).padStart(2, '0') + '.html')
  if (fs.existsSync(fp) && !force) {
    console.log('⏭ 跳过 ch' + spec.num + '（已存在，--force 可覆盖）')
    return { num: spec.num, status: 'skip' }
  }
  const sys = '你是「白驹 AI 学院」资深讲师。你撰写的教程要专业、具体、可落地、真实可核验，面向中文学习者（含非技术背景）。铁律：只用真实存在且广为人知的工具/库/框架/API/模型/命令与版本号；绝不编造事实、数字、产品、发布信息；不确定的内容明确标注「请以官方文档为准」。你只输出 Markdown 正文，不要任何寒暄。'
  const user = `请撰写 AI 学院教程章节《${spec.title}》。

要求：
1. 开头写一段 80-120 字的引言（点明本章价值与学完后能做什么）。
2. 用 6-8 个 "## " 二级小节组织正文，覆盖这些要点：${spec.outline}。
3. 每个小节包含 2-3 段正文，并穿插适当的列表（用 "- "）、表格（用 Markdown 表格）或代码示例（用三个反引号代码块）来增强可读性；代码块请给出简短注释，命令必须是可真实执行的。
4. 结尾用一个 "## 小结与练习" 小节：3 条核心收获 + 3 道动手练习 + 1 个扩展阅读方向。
5. 总字数 1800-2600 字，内容必须具体（真实工具名、真实参数、可执行的步骤），不要空话。
6. 真实可核验：所有工具/库/模型/API 必须真实存在且主流可查；涉及具体数字（价格/性能/版本）要谨慎，拿不准就写「以官方为准」；每节结尾可注明验证方式（如「运行 x 命令验证」）。
7. 全文只输出 Markdown 正文；"## " 表示二级标题，"### " 表示三级标题；不要用代码围栏包住整篇文档。`
  console.log('✍️  ch' + spec.num + ' 生成中（' + spec.title + '）...')
  if (dry) { console.log('  [dry] 跳过 LLM 调用'); return { num: spec.num, status: 'dry' } }
  const md = await askLLM(env, sys, user)
  const bodyHtml = mdToHtml(md)
  const html = wrapChapter(spec.num, spec.title, spec.desc, bodyHtml, spec.minutes)
  fs.writeFileSync(fp, html, 'utf8')
  const h2 = (bodyHtml.match(/<h2>/g) || []).length
  console.log('✅ ch' + spec.num + ' 已写入：' + path.relative(ROOT, fp) + '（' + html.length + 'B，h2×' + h2 + '）')
  return { num: spec.num, status: 'ok', size: html.length, h2 }
}

// ---------- 巡检：零入链 + 外链图 ----------
function linkcheck() {
  const files = fs.readdirSync(ACADEMY).filter((f) => /^chapter-\d+\.html$/.test(f)).sort()
  const portalHtml = fs.existsSync(PORTAL) ? fs.readFileSync(PORTAL, 'utf8') : ''
  const indexRoot = path.join(ROOT, 'index.html')
  const indexWeb = path.join(ROOT, 'website', 'index.html')
  const idxRoot = fs.existsSync(indexRoot) ? fs.readFileSync(indexRoot, 'utf8') : ''
  const idxWeb = fs.existsSync(indexWeb) ? fs.readFileSync(indexWeb, 'utf8') : ''
  const haystack = portalHtml + idxRoot + idxWeb
  const zeroInbound = []
  for (const f of files) {
    if (!haystack.includes(f)) zeroInbound.push(f)
  }
  const extImgs = []
  for (const f of files) {
    const html = fs.readFileSync(path.join(ACADEMY, f), 'utf8')
    const m = html.match(/<img[^>]+src="(https?:\/\/[^"]+)"/g) || []
    for (const im of m) {
      const src = (im.match(/src="([^"]+)"/) || [])[1]
      if (src && /^https?:/.test(src) && !/\/icon\.svg/.test(src)) extImgs.push({ f, src })
    }
  }
  console.log('--- 零入链章节（门户/index 未引用） ---')
  console.log(zeroInbound.length ? zeroInbound.join('\n') : '无，全部有入口 ✅')
  console.log('--- 外链图统计 ---')
  console.log('共 ' + extImgs.length + ' 个外链图片引用（离线可能失效），按文件：')
  const byFile = {}
  for (const e of extImgs) { byFile[e.f] = (byFile[e.f] || 0) + 1 }
  for (const [f, n] of Object.entries(byFile)) console.log('  ' + f + ': ' + n + ' 张')
  return { zeroInbound, extImgs }
}

// ---------- 主流程 ----------
const args = process.argv.slice(2)
const dry = args.includes('--dry')
let force = args.includes('--force')
const tasks = args.filter((a) => !a.startsWith('--'))
const env = readEnv()
console.log('📚 AI学院 内容流水线 · ' + today() + ' · ' + (dry ? 'DRY 模式（不落盘）' : '正式模式'))

async function main() {
  let plan = []
  if (tasks.length === 0 || tasks.includes('all')) plan = CHAPTERS
  else {
    for (const t of tasks) {
      if (t === 'linkcheck' || t === 'projects') continue
      const num = parseInt(t, 10)
      const spec = CHAPTERS.find((c) => c.num === num)
      if (spec) plan.push(spec)
      else console.log('⚠️ 未知章节号：' + t)
    }
  }
  if (tasks.includes('linkcheck') || tasks.length === 0 || tasks.includes('all')) {
    console.log('\n🔍 巡检')
    linkcheck()
  }
  if (tasks.includes('projects')) {
    console.log('\n🚀 生成毕业设计项目详情页（24 个）')
    await genProjects(env, dry)
  }
  if (plan.length) {
    console.log('\n📝 待生成 ' + plan.length + ' 章：' + plan.map((c) => 'ch' + c.num).join(', '))
    let ok = 0, skip = 0, fail = 0
    for (const spec of plan) {
      try {
        const r = await genChapter(env, spec, dry)
        if (r.status === 'ok') ok++
        else if (r.status === 'skip') skip++
        else if (r.status === 'dry') skip++
      } catch (e) {
        fail++
        console.log('❌ ch' + spec.num + ' 失败：' + e.message)
      }
    }
    console.log('\n📊 汇总：生成 ' + ok + ' · 跳过 ' + skip + ' · 失败 ' + fail)
  }
  console.log('\n🏁 完成')
}
main()
