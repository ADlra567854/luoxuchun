/**
 * legacy-redirects.mjs · 旧路径收敛表（301）
 * ---------------------------------------------------------------------------
 * 为什么要有这个文件：
 *   server-legacy.mjs 里早就写好了一套 LEGACY_FLAT / LEGACY_EXTRA / LEGACY_MAP 映射，
 *   但全仓从来没有引用过它 —— 收敛代码写了，却从未生效。旧站 175 条 URL 一直
 *   占着 sitemap，搜索引擎和用户都被送到旧结构上。
 *
 * 策略（老罗 2026-11-02 定：旧站文件原地不动，只做路径别名）：
 *   ① 有新版对应页的旧路径      → 301 到新版路径
 *   ② 新版暂时没有的旧路径      → 先给它一个规范短路径，301 到短路径（内容不丢）
 *   ③ 历史遗留的错路径（% 编码、缺目录前缀）→ 301 到实际文件
 *
 * 落地约束：每一条的目标都必须在磁盘上真实存在。脚本自检不通过会直接抛错，
 * 避免把用户送到死路。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = path.dirname(fileURLToPath(import.meta.url))
// 本文件既在项目根目录，也可能在 scripts/ 下（转发层）。
// 两种位置都要算出同一个 ROOT —— 用「向上找 data/ 目录」来判定，最稳。
function findRoot(dir) {
  let d = dir
  for (let i = 0; i < 4; i++) {
    if (fs.existsSync(path.join(d, 'data')) && fs.existsSync(path.join(d, 'server.mjs'))) return d
    const up = path.dirname(d)
    if (up === d) break
    d = up
  }
  return dir
}
const ROOT = findRoot(__dir)

/* ============================================================
   一、别名表：旧路径 → 规范短路径
   右侧目标必须真实存在（脚本末尾自检）。
   这些短路径是五域承载页。2026-11-09 起旧页正文已迁入对应新页
   （scripts/merge-shell-content.py），不再用 iframe 嵌套旧架构。
   ============================================================ */
export const ALIASES = {
  // —— /website/ 顶层散页 → 各域的规范短路径 ——
  '/website/ai-academy-roadmap.html': '/learn/roadmap.html',
  '/website/ai-tools.html':          '/toolbox/library.html',
  '/website/skill-hub.html':         '/toolbox/index.html',
  '/website/workstation.html':       '/toolbox/workstation.html',
  '/website/ai-projects.html':       '/works/projects.html',
  '/website/cases.html':             '/works/cases.html',
  '/website/about.html':             '/about/index.html',
  '/website/ai-ecosystem.html':      '/about/ecosystem.html',
  '/website/improvement-plan.html':  '/about/plan.html',
  '/website/agent.html':             '/agent.html',
  /* 2026-11-11 唯一助手入口：/website/chat.html 原本 301 到 /chat.html，
     而 /chat.html 又是一整套独立的旧对话界面 —— 等于把用户从一个旧助手
     导向另一个旧助手。现在直接收敛到 canonical 的 /agent.html。 */
  '/website/chat.html':              '/agent.html',
  '/website/assistant.html':         '/agent.html',
  /* 根级旧入口：有 node 服务端时给真 301，纯静态托管由同名跳转壳兜底。
     两条都做，是因为发布产物既可能是静态包、也可能带 server.mjs。 */
  '/chat.html':                      '/agent.html',
  '/assistant.html':                 '/agent.html',

  // —— AI 学院：旧 website/ai-academy/ 下的章节 → /learn/tutorials/ ——
  '/website/ai-academy/index.html':  '/learn/tutorials/index.html',
  '/website/ai-academy.html':        '/learn/academy.html',
  /* 2026-11-10 补：裸 /ai-academy/ 会 404，而 /website/ai-academy/ 会 301 —— 两个入口口径不一致。
     成因：server.mjs 把 /ai-academy/* 内部重写到 /website/ai-academy/*，但 301 判定发生在重写「之前」，
     查的是原始 rel，所以只有带 website/ 前缀的那条命中；而 website/ai-academy/ 磁盘上没有 index.html，
     重写后 probe 必然落空。
     三个键都补上：目录形式（带斜杠）走 resolveLegacy 的 p + 'index.html' 兜底，
     不带斜杠的 /ai-academy 单列一条，避免用户手打时又是 404。 */
  '/ai-academy/index.html':          '/learn/tutorials/index.html',
  '/ai-academy/':                    '/learn/tutorials/index.html',
  '/ai-academy':                     '/learn/tutorials/index.html',


  /* —— 2026-11-10 补：根级平铺副本 → 域内唯一真源 ——
     prepare-deploy.mjs 的 walkFlat() 会把 website/*.html 平铺复制到部署根，
     目的是让旧页里 <a href="devbase.html"> 这类根相对链接还能命中。
     但整改后新站已全部改用 /learn/ /toolbox/ 这样的域路径，这些平铺副本
     就变成了「同一份内容两个地址」的重复页：42 个里 37 个没有 canonical、
     5 个 canonical 自指。对搜索引擎是重复内容，对人是点进去看到旧版。
     统一 301 到域内新页，对外只留一个地址。
     文件本身先不删：真出问题还能就地回滚，删文件等这一版线上验证过再说。 */
  '/ai-build-hall.html':             '/toolbox/ai-build-hall.html',
  '/ai-edu.html':                    '/learn/ai-edu.html',
  '/ai-jobs.html':                   '/learn/ai-jobs.html',
  '/ai-money.html':                  '/learn/ai-money.html',
  '/biz-center.html':                '/about/biz-center.html',
  '/biz.html':                       '/about/biz.html',
  '/cases.html':                     '/works/cases.html',
  '/comic.html':                     '/works/comic.html',
  '/covers.html':                    '/works/covers.html',
  '/daily.html':                     '/feed/daily.html',
  '/deep-dive.html':                 '/feed/deep-dive.html',
  '/devbase.html':                   '/toolbox/devbase.html',
  '/ecosystem.html':                 '/about/ecosystem.html',
  '/faq.html':                       '/about/faq.html',
  '/frontiers.html':                 '/feed/frontiers.html',
  '/gallery.html':                   '/works/gallery.html',
  '/industry.html':                  '/learn/industry.html',
  '/lab.html':                       '/works/lab.html',
  '/local-ai.html':                  '/toolbox/local-ai.html',
  '/local-deploy.html':              '/toolbox/local-deploy.html',
  '/majors.html':                    '/learn/majors.html',
  '/manju.html':                     '/works/manju.html',
  '/map-guide.html':                 '/about/map-guide.html',
  '/news.html':                      '/feed/news.html',
  '/personality.html':               '/toolbox/personality.html',
  '/privacy.html':                   '/about/privacy.html',
  '/prompts100.html':                '/toolbox/prompts100.html',
  '/reader.html':                    '/learn/books/reader.html',
  '/resume.html':                    '/toolbox/resume.html',
  '/roadmap.html':                   '/learn/roadmap.html',
  '/security.html':                  '/about/security.html',
  '/showcase.html':                  '/works/showcase.html',
  '/software-detail.html':           '/learn/software-detail.html',
  '/software.html':                  '/learn/software.html',
  '/study.html':                     '/learn/study.html',
  '/traffic-guide.html':             '/about/traffic-guide.html',
  '/videos.html':                    '/works/videos.html',
  '/voice.html':                     '/toolbox/voice.html',
  '/wechat-pick.html':               '/feed/wechat-pick.html',
  '/wechat-plan.html':               '/feed/wechat-plan.html',
  '/workstation.html':               '/toolbox/workstation.html',

  // —— 书稿：旧 website/book/ → /learn/books/ ——
  '/website/book/index.html':        '/learn/books/index.html',
}

/* ============================================================
   二、直接映射表：旧路径 → 新版路径（新版确有对应页）
   ============================================================ */
export const DIRECT = {
  // 学习域
  '/website/ai-academy-roadmap.html': '/learn/roadmap.html',
  '/website/ai-academy.html':          '/learn/academy.html',

  // 工具域
  '/website/ai-tools.html':        '/toolbox/library.html',
  '/website/opensource.html':       '/toolbox/repos.html',

  // 作品域（2026-11-09：原先被降级到 /works/index.html，
  // 与 ALIASES 及 cut-legacy-links.py 的映射不一致，现统一到真实承载页）
  '/website/ai-projects.html':     '/works/projects.html',
  '/website/cases.html':           '/works/cases.html',
  '/website/tech-museum.html':      '/works/museum.html',
  '/website/blog.html':            '/blog/index.html',

  // 关于域（M8 帮助与说明模块，2026-11-10：三页正文已迁入五域，旧址 301）
  '/website/faq.html':                '/about/faq.html',
  '/website/privacy.html':            '/about/privacy.html',
  '/website/development-guide.html':  '/about/develop.html',

  // 关于域
  '/website/about.html':           '/about/index.html',
  '/website/improvement-plan.html': '/about/plan.html',

  // 学习域（M9 批量迁入，2026-11-10）
  '/website/ai-academy-cert.html':               '/learn/academy/cert.html',
  '/website/ai-academy-glossary.html':           '/learn/academy/glossary.html',
  '/website/ai-academy-history.html':            '/learn/academy/history.html',
  '/website/ai-academy-interview.html':          '/learn/academy/interview.html',
  '/website/ai-academy-jobs.html':               '/learn/academy/jobs.html',
  '/website/ai-academy-journey.html':            '/learn/academy/journey.html',
  '/website/ai-academy-national.html':           '/learn/academy/national.html',
  '/website/ai-academy-newsroom.html':           '/learn/academy/newsroom.html',
  '/website/ai-academy-projects.html':           '/learn/academy/projects.html',
  '/website/ai-academy-quiz.html':               '/learn/academy/quiz.html',
  '/website/ai-academy-resources.html':          '/learn/academy/resources.html',
  '/website/ai-academy/projects/code-reviewer.html': '/learn/academy/projects/code-reviewer.html',
  '/website/ai-academy/projects/column-writer.html': '/learn/academy/projects/column-writer.html',
  '/website/ai-academy/projects/customer-support.html': '/learn/academy/projects/customer-support.html',
  '/website/ai-academy/projects/data-analysis.html': '/learn/academy/projects/data-analysis.html',
  '/website/ai-academy/projects/data-cleaner.html': '/learn/academy/projects/data-cleaner.html',
  '/website/ai-academy/projects/database-agent.html': '/learn/academy/projects/database-agent.html',
  '/website/ai-academy/projects/email-assistant.html': '/learn/academy/projects/email-assistant.html',
  '/website/ai-academy/projects/finance-bot.html': '/learn/academy/projects/finance-bot.html',
  '/website/ai-academy/projects/health-coach.html': '/learn/academy/projects/health-coach.html',
  '/website/ai-academy/projects/health-record.html': '/learn/academy/projects/health-record.html',
  '/website/ai-academy/projects/image-captioner.html': '/learn/academy/projects/image-captioner.html',
  '/website/ai-academy/projects/iot-monitor.html': '/learn/academy/projects/iot-monitor.html',
  '/website/ai-academy/projects/legal-assistant.html': '/learn/academy/projects/legal-assistant.html',
  '/website/ai-academy/projects/marketing-writer.html': '/learn/academy/projects/marketing-writer.html',
  '/website/ai-academy/projects/meeting-minutes.html': '/learn/academy/projects/meeting-minutes.html',
  '/website/ai-academy/projects/mind-echo.html': '/learn/academy/projects/mind-echo.html',
  '/website/ai-academy/projects/network-health.html': '/learn/academy/projects/network-health.html',
  '/website/ai-academy/projects/news-digest.html': '/learn/academy/projects/news-digest.html',
  '/website/ai-academy/projects/podcast-script.html': '/learn/academy/projects/podcast-script.html',
  '/website/ai-academy/projects/research-agent.html': '/learn/academy/projects/research-agent.html',
  '/website/ai-academy/projects/resume-coach.html': '/learn/academy/projects/resume-coach.html',
  '/website/ai-academy/projects/stock-insight.html': '/learn/academy/projects/stock-insight.html',
  '/website/ai-academy/projects/travel-planner.html': '/learn/academy/projects/travel-planner.html',
  '/website/ai-academy/projects/tutor-agent.html': '/learn/academy/projects/tutor-agent.html',
  '/website/ai-edu.html':                        '/learn/ai-edu.html',
  '/website/software-detail.html':               '/learn/software-detail.html',
  '/website/software.html':                      '/learn/software.html',

  // 工具域（M9 批量迁入，2026-11-10）
  '/website/ai-build-hall.html':                 '/toolbox/ai-build-hall.html',
  '/website/devbase.html':                       '/toolbox/devbase.html',
  '/website/local-deploy.html':                  '/toolbox/local-deploy.html',
  '/website/prompts-guide.html':                 '/toolbox/prompts.html',
  '/website/quiz.html':                          '/toolbox/quiz.html',
  '/website/voice.html':                         '/toolbox/voice.html',

  // 作品域（M9 批量迁入，2026-11-10）
  '/website/comic.html':                         '/works/comic.html',
  '/website/covers.html':                        '/works/covers.html',
  '/website/gallery.html':                       '/works/gallery.html',
  '/website/showcase.html':                      '/works/showcase.html',
  '/website/videos.html':                        '/works/videos.html',
  '/website/works.html':                         '/works/collection.html',

  // 关于域（M9 批量迁入，2026-11-10）
  '/website/biz-center.html':                    '/about/biz-center.html',
  '/website/biz.html':                           '/about/biz.html',
  '/website/map-guide.html':                     '/about/map-guide.html',

  // 前沿流域（M9 批量迁入，2026-11-10）
  '/website/news.html':                          '/feed/news.html',

  // 前沿流域（M10：日报与公众号排期）
  '/website/daily.html':                         '/feed/daily.html',
  '/website/wechat-pick.html':                   '/feed/wechat-pick.html',
  '/website/wechat-plan.html':                   '/feed/wechat-plan.html',

  // 作品域（M10）
  '/website/lab.html':                           '/works/lab.html',

  // 工具域（M10）
  '/website/prompts100.html':                    '/toolbox/prompts100.html',
  '/website/resume.html':                        '/toolbox/resume.html',
  '/website/local-ai.html':                      '/toolbox/local-ai.html',

  // 学习域（M10）
  '/website/industry.html':                      '/learn/industry.html',
  '/website/ai-jobs.html':                       '/learn/ai-jobs.html',
  '/website/ai-money.html':                      '/learn/ai-money.html',
  '/website/study.html':                         '/learn/study.html',
  '/website/book/个人实战全书.html':                '/learn/books/个人实战全书.html',

  // 关于域（M10）
  '/website/traffic-guide.html':                 '/about/traffic-guide.html',

  // 源页过薄 → 归口到已有承载页（M10 裁决，不单独成页）
  '/website/hub.html':                           '/about/index.html',
  '/website/qbank-note.html':                    '/toolbox/quiz.html',
  '/website/ecosystem.html':                     '/about/ecosystem.html',

  // 与新站已有页同主题（不另建页）
  '/website/chronicle.html':                     '/learn/academy/history.html',
  '/website/roadmap.html':                       '/learn/roadmap.html',

  // 模型域（M12）
  '/website/models.html':                        '/models/review.html',

  // 作品域 / 学习域 / 前沿流（M11）
  '/website/manju.html':                         '/works/manju.html',
  '/website/personality.html':                   '/toolbox/personality.html',
  '/website/reader.html':                        '/learn/books/reader.html',
  '/website/majors.html':                        '/learn/majors.html',
  '/website/frontiers.html':                     '/feed/frontiers.html',
  '/website/deep-dive.html':                     '/feed/deep-dive.html',
  '/website/security.html':                      '/about/security.html',
}

/* ============================================================
   三、历史错路径修正（来自 server-legacy.mjs 的 LEGACY_MAP）
   这些是「文件搬过家但链接没跟着改」造成的 404。
   ============================================================ */
export const FIXED = {
  // 2026-11-09：改指五域承载页，避免 LEGACY_MAP 的 value 还指向 website/ 旧页
  // （否则将来归档 website/ 会让 verifyTargets() 拒绝启动）
  '/ai-academy/roadmap.html': '/learn/roadmap.html',
  // 整改清单第 17 条：标题里的绝对化收益话术（「已经有人月入5万+」）改为客观表述。
  // 文件已改名，旧地址 301 到新地址 —— 旧链接不断。
  '/blog/2026年8月AI变现实录：别追风口了，这3个低门槛路径已经有人月入5万+.html':
    '/blog/2026年8月AI变现实录：别追风口了，这3条低门槛路径实际能赚多少.html',
  '/总序.html': '/book/五卷全书/总序.html',
  '/第五卷-如何用AI打造个人主流IP.html': '/book/五卷全书/第五卷-如何用AI打造个人主流IP.html',
  '/第六卷-AI思想者与未来图景.html': '/book/五卷全书/第六卷-AI思想者与未来图景.html',

  // % 编码被批量替换成「百分之」后没同步回去
  '/blog/2026.08.25-AI智能体现状：别再做Demo了，这3个可落地方案我跑了3个月ROI超300%.html':
    '/blog/2026.08.25-AI智能体现状：别再做Demo了，这3个可落地方案我跑了3个月ROI超300百分之.html',
  '/blog/2026年8月AI工具横评：3类高频场景实测，避开90%的功能宣传陷阱.html':
    '/blog/2026年8月AI工具横评：3类高频场景实测，避开90百分之的功能宣传陷阱.html',
  '/2026年8月AI工具横评：3类高频场景实测，避开90%的功能宣传陷阱.html':
    '/blog/2026年8月AI工具横评：3类高频场景实测，避开90百分之的功能宣传陷阱.html',
  '/assets/covers/cover-2026-8-AI工具横评：3类高频场景实测，避开90%的功能宣传陷阱.png':
    '/assets/covers/cover-2026-8-AI工具横评：3类高频场景实测，避开90百分之的功能宣传陷阱.png',

  // 仿真实验页漏了 lab 前缀
  '/simulation/仿真脚本图文讲解.html': '/lab/simulation/仿真脚本图文讲解.html',
  '/仿真脚本图文讲解.html': '/lab/simulation/仿真脚本图文讲解.html',
  '/simulation/开源仿真工具-一键安装与第一个案例.html':
    '/lab/simulation/开源仿真工具-一键安装与第一个案例.html',
}

/* ============================================================
   四、虚拟路径：新版路径 → 实际文件（零复制）
   ----------------------------------------------------------------
   AI 学院 67 章、书稿 35 篇这些正文，旧文件留在 website/ 下原地不动，
   但对外要有一个新版路径（/learn/tutorials/xxx.html），
   否则 sitemap 里全是 /website/，观感上永远是「两个站」。

   做法不是复制文件，而是在 server 层做一次路径重写：
     请求 /learn/tutorials/chapter-01.html
     → 命中本表 → 实际去读 website/ai-academy/chapter-01.html
   旧地址同时 301 到新地址，权重归一。

   表由 buildVirtualAliases() 在启动时按磁盘实际文件自动生成，
   不手写 —— 手写一定会漏。
   ============================================================ */
export const VIRTUAL_ALIASES = new Map()

/** 旧目录 → 新目录前缀（用于批量生成虚拟路径） */
const DIR_ALIAS = [
  ['website/ai-academy/', '/learn/tutorials/'],
  ['website/book/pages/', '/learn/books/pages/'],
  ['website/book/',      '/learn/books/'],
  // 2026-11-10：学院项目 24 页已迁成 learn/academy/projects/ 的真实文件，
  // 这里必须跟着改，否则下面的 DIRECT 会被生成成 /learn/tutorials/projects/ 而指错。
  ['website/ai-academy/projects/', '/learn/academy/projects/'],
]

/**
 * 扫描磁盘，自动生成虚拟路径表。
 * 只对「旧目录下有文件、且新路径下没有同名文件」的条目建表，
 * 避免和新版已有页面撞车。
 */
export function buildVirtualAliases() {
  VIRTUAL_ALIASES.clear()
  const made = []

  // 递归列出目录下所有 html（相对路径）
  const listHtml = (dir, prefix = '') => {
    const out = []
    if (!fs.existsSync(dir)) return out
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith('.') || e.name.includes('.bak')) continue
      if (e.isDirectory()) out.push(...listHtml(path.join(dir, e.name), prefix + e.name + '/'))
      else if (e.name.endsWith('.html')) out.push(prefix + e.name)
    }
    return out
  }

  for (const [oldDir, newPrefix] of DIR_ALIAS) {
    const dir = path.join(ROOT, oldDir)
    for (const relName of listHtml(dir)) {
      const oldPath = '/' + oldDir + relName
      const newPath = newPrefix + relName
      // 新路径已有真实文件就不建虚拟路径（避免覆盖）
      const realNew = path.join(ROOT, newPath.replace(/^\//, ''))
      if (fs.existsSync(realNew)) continue
      VIRTUAL_ALIASES.set(newPath, oldPath)
      made.push(newPath)
      // 旧路径 301 → 新路径
      // 显式 DIRECT 表优先：目录批量别名不许覆盖人工裁定的承载页。
      // （否则 /website/ai-academy/projects/x.html 会被父目录规则改写成 tutorials 路径）
      if (!LEGACY_MAP.has(oldPath)) LEGACY_MAP.set(oldPath, newPath)
    }
  }
  return made
}

/* ============================================================
   五、合并成最终映射
   ============================================================ */
export const LEGACY_MAP = new Map()

for (const [from, to] of Object.entries(FIXED)) LEGACY_MAP.set(from, to)
// DIRECT 优先于 ALIASES（同键时后写的覆盖）
for (const [from, to] of Object.entries(ALIASES)) LEGACY_MAP.set(from, to)
for (const [from, to] of Object.entries(DIRECT)) LEGACY_MAP.set(from, to)

/* ============================================================
   六、自检：每条映射的目标必须真实存在
   不通过就抛错 —— 宁可构建失败，也不要把用户送到死路。
   ============================================================ */
export function verifyTargets() {
  const bad = []
  for (const [from, to] of LEGACY_MAP) {
    if (to.startsWith('http')) continue
    const clean = to.split('#')[0].split('?')[0]
    // 虚拟路径：目标不是磁盘文件，但映射表里有它也算有效
    if (VIRTUAL_ALIASES.has(clean)) continue
    const abs = path.join(ROOT, clean.replace(/^\//, ''))
    const ok = clean.endsWith('/')
      ? fs.existsSync(path.join(abs, 'index.html'))
      : fs.existsSync(abs)
    if (!ok) bad.push(`${from} → ${to}`)
  }
  return bad
}

/**
 * 查一条路径是否该 301。
 * @param {string} urlPath 已解码的 URL 路径（不含 query）
 * @returns {string|null} 目标路径；null 表示不该跳
 */
export function resolveLegacy(urlPath) {
  if (!urlPath) return null
  let p = urlPath
  if (!p.startsWith('/')) p = '/' + p
  // 目录形式：/website/ai-academy/ → 先试带斜杠，再试 index.html
  const direct = LEGACY_MAP.get(p)
  if (direct) return direct
  if (p.endsWith('/')) {
    const withIndex = LEGACY_MAP.get(p + 'index.html')
    if (withIndex) return withIndex
  }
  return null
}

/**
 * 虚拟路径 → 实际磁盘文件。
 * 命中就说明这个 URL 虽然磁盘上没有文件，但有等价的旧文件，应该 serve 那个。
 * @returns {string|null} 相对 ROOT 的文件路径
 */
export function resolveVirtual(urlPath) {
  if (!urlPath) return null
  let p = urlPath
  if (!p.startsWith('/')) p = '/' + p
  const target = VIRTUAL_ALIASES.get(p)
  if (!target) return null
  return target.replace(/^\//, '')
}

export const MAP_SIZE = LEGACY_MAP.size
