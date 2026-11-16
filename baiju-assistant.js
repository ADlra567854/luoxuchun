/* 白驹助手 · 全站唯一悬浮助手（v2）
 *
 * 位置：默认贴右侧垂直居中，可按住拖动，位置记在本地；双击回到默认位。
 *      拖不出视口，也不会压到顶部导航（上边界按导航实际高度算）。
 * 图标：自绘小马 SVG（不是 emoji，深浅色都跟得上）。
 * 功能：对话（星火 spark-x2.6 流式逐字）、语音输入、朗读、全站搜索、
 *      回到顶部、阅读模式、换主题、复制链接、重置位置 —— 全部收在「设置」里，
 *      面板本身只留对话，不占地方。
 * 工作室：不是第二个入口，也不是第二个页面，只是这同一个悬浮窗里对话的一种模式。
 *      左上角小图标是模式开关；工具默认藏在对话里，展开时对话流仍在上方可见。
 *      全站仍然只有一个助手、一个设置、一个窗口。
 *
 * 对话优先走 /api/chat；静态托管时接口不存在 → 回落到本地能力，不会假装能答。
 */
(function () {
  if (window.__BAIJU_ASSISTANT__) return
  window.__BAIJU_ASSISTANT__ = true

  var CSS = 'baiju-assistant.css'
  var ASSIST_V = '20261116a'   /* 2026-11-16 常用直达 + 反馈入口；改助手资源必须同步 bump 全站 HTML 的 ?v= */
  var HIST_KEY = 'baiju.chat.v1'
  var PREF_KEY = 'baiju.prefs.v2'
  var POS_KEY = 'baiju.pos.v2'
  var MAX_TURNS = 8
  var MAX_CHARS = 4000

  /* 常用直达（2026-11-16 老罗要求「助手内置直达链接多一点」）。
     只放站内核心页，纯静态、不需要后端。要加链接只改这里。 */
  var QUICK_LINKS = [
    ['模型库 · 230 型号', '/models/library.html'],
    ['开放资料 · 官方源', '/learn/open-library.html'],
    ['教程 · 43 章', '/learn/tutorials/'],
    ['书稿 · 成书', '/learn/books/'],
    ['前沿流 · 每日更新', '/feed/'],
    ['作品库 · 项目', '/works/projects.html']
  ]
  /* 反馈联系方式：老罗随后给邮箱 / QQ 群号后填入即可生效（留空则不显示联系方式行）。
     仍是纯静态可见入口，不构成服务端工单；给了值就渲染成可点 mailto / 群链接。 */
  var FEEDBACK = { email: '', qqGroup: '', note: '反馈会尽快处理' }

  /* ---------------- 偏好 ---------------- */
  var pref = {
    voice: true,     // 语音输入按钮
    speak: false,    // 回答自动朗读
    chips: true,     // 快捷提问
    guide: true,     // 页面导读
    remember: true,  // 记住拖动位置
    think: false,    // 深度思考（走 enable_thinking，首字会慢 8-10 秒）
    long: false,     // 详细回答（max_tokens 由 1200 提到 2600）
    mode: 'chat',    // 任务形式：chat/write/code/data/trans/sum
    model: ''        // 空 = 用服务端默认
  }
  try {
    var saved = JSON.parse(localStorage.getItem(PREF_KEY) || '{}')
    for (var k in pref) {
      if (typeof pref[k] === 'boolean' && typeof saved[k] === 'boolean') pref[k] = saved[k]
      if (typeof pref[k] === 'string' && typeof saved[k] === 'string') pref[k] = saved[k]
    }
  } catch (e) {}

  function savePref() {
    try { localStorage.setItem(PREF_KEY, JSON.stringify(pref)) } catch (e) {}
  }

  /* ---------------- 样式 ---------------- */
  function loadCss() {
    if (document.querySelector('link[href*="' + CSS + '"]')) return
    var base = '/'
    try {
      var s = document.currentScript
      if (s && s.src) base = s.src.replace(/baiju-assistant\.js(\?.*)?$/, '')
    } catch (e) {}
    var l = document.createElement('link')
    l.rel = 'stylesheet'
    l.href = base + CSS + '?v=' + ASSIST_V
    document.head.appendChild(l)
  }

  /* 全站统一层：品牌标识 + 旧助手/设置收编（2026-11-10）
     本文件被 543 页引用，比 ccowork.js 的 418 页更广；/models/、/about/、
     /toolbox/ 等页只有本助手没有注入器，所以在这里也挂一次，保证全站统一。
     brand-one.js 自带去重守卫，与 ccowork.js 的注入不会重复执行。 */
  /* 导航覆盖边界（2026-11-10）：只引本助手、没引 ccowork.js 的 6 页
     （linguavista/ 全部）仍挂老的 34px .ccbar，是全站导航孤岛。
     ccowork.js 只在自己覆盖的 418 页补载 site-nav.js，这里补上剩下那批。
     三重守卫保证不与 ccowork.js / 页面静态引用重复注入。 */
  function loadSiteNav() {
    if (!document.querySelector('.ccbar')) return
    if (document.querySelector('script[src*="site-nav.js"]')) return
    if (document.querySelector('header.ccnav')) return
    try {
      if (!document.querySelector('link[href*="site-nav.css"]')) {
        var l = document.createElement('link')
        l.rel = 'stylesheet'
        l.href = BJS_BASE + 'site-nav.css?v=20261116a'
        document.head.appendChild(l)
      }
      var s = document.createElement('script')
      s.src = BJS_BASE + 'site-nav.js?v=20261116a'
      s.async = false
      document.head.appendChild(s)
    } catch (e) {}
  }

  function loadBrandOne() {
    if (document.querySelector('script[src*="brand-one.js"]')) return
    if (!document.querySelector('link[href*="brand-one.css"]')) {
      var l = document.createElement('link')
      l.rel = 'stylesheet'
      l.href = BJS_BASE + 'brand-one.css'
      document.head.appendChild(l)
    }
    var sc = document.createElement('script')
    sc.src = BJS_BASE + 'brand-one.js'
    sc.async = false
    document.head.appendChild(sc)
  }

  /* ---------------- 小工具 ---------------- */
  function el(tag, cls, html) {
    var n = document.createElement(tag)
    if (cls) n.className = cls
    if (html != null) n.innerHTML = html
    return n
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v }

  function fmt(text) {
    var s = esc(text)
    s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>')
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')
    s = s.replace(/(^|\s)(\/[a-z0-9][a-z0-9\-_\/]*\.?html?|\/[a-z0-9\-_]+\/)(?=[\s，。；、）)]|$)/g, function (m, p, u) {
      return p + '<a class="lnk" href="' + u + '">' + u + '</a>'
    })
    return s
  }
  function plain(text) {
    return String(text).replace(/\*\*/g, '').replace(/`/g, '')
  }

  /* ---------------- 页面上下文 ---------------- */
  var CTX = [
    [/^\/feed\//, '这里是前沿流：按日期收模型发布、工具版本、价格变化，每条带出处。', ['近 7 天最值得看的是哪几条', '按影响大小排一下 10 月的发布', '哪些是开放权重？']],
    [/^\/toolbox\/repos\.html/, '这里是开源仓库，每条带星数、许可证、上手难度、能否国内直连。', ['我想本地跑模型，先装哪个', '做 RAG 选哪三个', '哪些是 AGPL，商用要注意什么']],
    [/^\/toolbox\/platforms\.html/, '这里是平台阵列：云 API、本地运行、GPU 算力、Agent 平台、图像视频，都带价。', ['新项目想省钱，用哪家', '哪家支持 OpenAI 兼容接口', '国内直连最快的是哪几个']],
    [/^\/learn\/deploy\.html/, '这里是部署百科：四条路线、决策树、引擎横评、硬件门槛、量化。', ['我只有 16G 显存能跑多大模型', 'vLLM 和 SGLang 怎么选', '量化选 4bit 还是 8bit']],
    [/^\/works\/museum\.html/, '这里是 AI 博物馆：14 个真正改变走向的节点，还有一间「废墟馆」。', ['哪几个节点是分水岭', '废墟馆收了哪些做法', '为什么说参数量榜已经没意义']],
    [/^\/models\/leaderboards/, '这里是榜单矩阵：18 个榜，按能力、成本、开源、场景分类。', ['编程能力现在谁第一', '性价比最高的是哪个', '开源里最强的是谁']],
    [/^\/models\/atlas/, '这里是模型图谱：110 个类目、22 个组，覆盖 9 种官方切法。', ['工业级和医学级算类目吗', '多模态下面分哪些', '国标是怎么分的']],
    [/^\/models\//, '这里是模型域：图谱、模型库、榜单、厂商、对比、追踪。', ['现在第一梯队是哪几家', '国产开源最强的是哪个', '怎么比较两个模型']],
    [/^\/learn\//, '这里是学习域：教程、书稿、部署百科、概念库、路线图。', ['从零开始的学习顺序', '教程适合什么基础的人', '概念库怎么用']],
    [/^\/blog\//, '这里是博客：按主题分组的实践记录，工具实操、每周大事记、长文观察三组。', ['最近写了什么', '哪篇适合先看', '有没有讲部署的']],
    [/^\/works\//, '这里是作品域：项目、案例、博客、博物馆。', ['有哪些能直接跑的项目', '案例里哪个最完整', '博物馆讲什么']],
    [/^\/toolbox\//, '这里是工具域：工具库、开源仓库、平台阵列、工作站。', ['有哪些能直接用的工具', '开源仓库怎么筛', '工作站能做什么']]
  ]

  function ctxFor(path) {
    for (var i = 0; i < CTX.length; i++) if (CTX[i][0].test(path)) return { tip: CTX[i][1], chips: CTX[i][2] }
    return {
      tip: '站内有模型图谱、仓库库、平台阵列、部署百科、榜单和前沿流，直接问就行。',
      chips: ['这个站有哪些板块', '想本地跑模型怎么开始', '最近 AI 有什么变化']
    }
  }

  /* ---------------- 状态 ---------------- */
  var root, panel, log, input, sendBtn, micBtn, chipsBox, dotEl, footEl, sheet
  var ctop, cset, ctModel, ctFlags
  var clipBtn, fileInput, capBar, attBar, studio
  var home, backBtn, view = 'chat'
  /* 工作室只是对话的一种模式：不新开窗口、不跳页、不换助手 */
  var studioMode = false
  var busy = false
  var history = []
  var online = null
  /* 流式控制：一个请求一个 AbortController；停止后保留已生成文本；
     失败重试同一条问题；30s 无响应主动收口；读屏按句播报而非逐 token。 */
  var ctrl = null, reqTimer = 0, stopped = false, settled = false
  var localTimer = 0   /* 本地能力也走打字机，停止生成时一并收掉 */
  var triedByok = false
  var lastAsk = '', curTyper = null, curBody = null, liveEl = null
  var sendIconHtml = '', lastSpoken = '', lastAnnounceAt = 0
  var recog = null
  var FAB = 54
  var MARGIN = 12

  function loadHist() {
    try {
      var j = JSON.parse(sessionStorage.getItem(HIST_KEY) || '[]')
      if (Array.isArray(j)) history = j.slice(-16)
    } catch (e) { history = [] }
  }
  function saveHist() {
    try { sessionStorage.setItem(HIST_KEY, JSON.stringify(history.slice(-16))) } catch (e) {}
  }

  /* ---------------- 品牌标识 ----------------
     2026-11-12：全站统一到正式图形标「隙」—— 开放圆环 + 右上斜光 + 中心圆点，
     图形零文字，品牌名一律由相邻实时文本提供（改名不动 SVG / favicon / PNG）。
     唯一真源 = assets/brand/：
       mark.svg                      彩色主标（悬浮球、面板头、面板首页、导航都用它）
       mark-small.svg                ≤24px 小尺寸简化版（笔画加粗，去圆点）
       mark-mono.svg / -small-mono  单色版，currentColor 自动适配亮 / 深
     export/lockup-h*.png 只是对外下载物料，站内横版组合已改成
     「图形标 + 实时文本字标」，由 brand-one.js / brand-one.css 统一注入。 */
  var BJS_BASE = (function () {
    var b = '/'
    try {
      var s = document.currentScript
      if (s && s.src) b = s.src.replace(/baiju-assistant\.js(\?.*)?$/, '')
    } catch (e) {}
    return b
  })()
  var MARK_SRC = BJS_BASE + 'assets/brand/mark.svg'
  /* 品牌名不在这里另立真源：优先取 brand-one.js 暴露的 BaijuOne.brand，
     独立加载本脚本时才用兜底值。改名只需动 brand-one.js / site.config.json /
     site-nav.js 三处文本，图形资产一律不动。 */
  var BRAND_NAME = (window.BaijuOne && window.BaijuOne.brand) || '白驹 ccowork'
  var HORSE = '<img class="horse" src="' + MARK_SRC + '" alt="" aria-hidden="true">'
  function MARK(cls) {
    return '<img class="bja-mark' + (cls ? ' ' + cls : '') + '" src="' + MARK_SRC + '" alt="" aria-hidden="true">'
  }

  var IC = {
    find: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.2-3.2"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1h.1a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
    chat: '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.4 8.4 0 0 1-8.4 8.4 9 9 0 0 1-3.8-.8L3 21l1.9-5.7a8.4 8.4 0 0 1-.8-3.8A8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5z"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>',
    sliders: '<svg viewBox="0 0 24 24"><path d="M4 6h10M18 6h2M4 12h3M11 12h9M4 18h10M18 18h2"/><circle cx="16" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="16" cy="18" r="2"/></svg>',
    top: '<svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    moon: '<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    link: '<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
    reset: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>',
    clip: '<svg viewBox="0 0 24 24"><path d="M20 11.5l-8.4 8.4a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-2.8-2.8l8-8"/></svg>',
    grid: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    wand: '<svg viewBox="0 0 24 24"><path d="M15 4V2M15 10V8M12 6h-2M20 6h-2M4 20l9-9M13.5 6.5l4 4"/><path d="M18 3v3M3 12h3"/></svg>',
    cards: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="13" height="14" rx="2"/><path d="M8 2h11a2 2 0 0 1 2 2v12"/><path d="M6.5 10h6M6.5 14h4"/></svg>',
    layers: '<svg viewBox="0 0 24 24"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5M3 17l9 5 9-5"/></svg>'
  }

  /* ---------------- 构建 ---------------- */
  function build() {
    root = el('div', 'bja')
    root.id = 'bja-assistant'

    /* ---------- 面板 ---------- */
    panel = el('section', 'bja-panel')
    panel.setAttribute('role', 'dialog')
    panel.setAttribute('aria-label', '白驹助手')

    /* 头部 */
    var hd = el('div', 'bja-hd')
    /* 唯一的模式开关：平时只露这一枚小图标，不铺功能、不写菜单。
       它不是「入口」——按下去不开新窗口、不跳页，只是把工具从对话里展开。
       设置抽屉与首页视图里的重复入口已下线（2026-11-12「只留一个入口」）。 */
    backBtn = el('button', 'bja-back bja-studio-entry', '')
    backBtn.type = 'button'
    backBtn.title = '展开工具 · 工作室 / 设置 / 生活工具都收在这里'
    backBtn.setAttribute('aria-label', '展开工具折叠区')
    backBtn.setAttribute('aria-pressed', 'false')
    backBtn.innerHTML = '<span class="bja-tri" aria-hidden="true"></span>'
    hd.appendChild(backBtn)

    var tt = el('div', 'tt')
    var ttMark = el('span', 'tt-mk')
    ttMark.innerHTML = MARK('sm')
    dotEl = el('i', 'dot')
    tt.appendChild(ttMark)
    tt.appendChild(dotEl)
    tt.appendChild(el('b', null, '白驹'))
    tt.appendChild(el('em', null, 'spark-x2.6'))
    var act = el('div', 'act')
    ;[
      ['find', '全站搜索', IC.find],
      ['gear', '设置与功能', IC.gear],
      ['close', '收起', IC.close]
    ].forEach(function (it) {
      var b = el('button', null, it[2])
      b.type = 'button'
      b.title = it[1]
      b.setAttribute('aria-label', it[1])
      b.setAttribute('data-act', it[0])
      act.appendChild(b)
    })
    hd.appendChild(tt)
    hd.appendChild(act)

    /* ---------- 首页（打开面板先到这里，不直接开对话） ---------- */
    home = el('div', 'bja-home')
    home.innerHTML =
      '<div class="hm-hero">' +
      '<div class="hm-mk">' + MARK('lg') + '</div>' +
      '<b>' + BRAND_NAME + '</b>' +
      '<span>站内助手 · 先说一句，或者从下面进去</span>' +
      '</div>' +
      '<div class="hm-acts">' +
      '<button type="button" class="pri" data-go="chat">' +
      '<i class="hm-i">' + IC.chat + '</i>' +
      '<span class="hm-t"><b>开始对话</b><em>问站内的事，或让白驹改写一段 · 自带 Key · 本站不留存对话</em></span>' +
      '</button>' +
      '<button type="button" data-go="sheet">' +
      '<i class="hm-i">' + IC.sliders + '</i>' +
      '<span class="hm-t"><b>功能与设置</b><em>语音、朗读、悬浮位置与快捷动作</em></span>' +
      '</button>' +
      '</div>' +
      '<div class="hm-qs" data-qs></div>'

    /* 消息 */
    log = el('div', 'bja-log')
    log.setAttribute('role', 'log')
    log.setAttribute('aria-label', '对话记录')
    log.setAttribute('aria-busy', 'false')
    /* 独立读屏播报区：视觉隐藏、按句更新。直接给 log 挂 aria-live 会让读屏
       每来一个 token 就重读整段，实测不可用；句级播报是通行做法。 */
    liveEl = el('div', 'bja-sr')
    liveEl.setAttribute('aria-live', 'polite')
    liveEl.setAttribute('aria-atomic', 'true')
    panel.appendChild(liveEl)
    /* 快捷提问 */
    chipsBox = el('div', 'bja-chips')

    /* 能力条：功能都在，但不铺满、不宣告「出题」这类字眼；可横向滑 */
    capBar = el('div', 'bja-cap')
    capBar.setAttribute('role', 'group')
    capBar.setAttribute('aria-label', '常用能力')
    CAP_CHIPS.forEach(function (c) {
      var b = el('button', null, c.k)
      b.type = 'button'
      b.setAttribute('data-cap', c.k)
      b.title = c.q === '__attach__' ? '添加文件' : c.q
      capBar.appendChild(b)
    })
    /* 附件条：加了哪些文件一眼可见，QQ 式直连感 */
    attBar = el('div', 'bja-att')
    attBar.hidden = true
    attBar.setAttribute('aria-live', 'polite')

    /* 输入 */
    var form = el('form', 'bja-in')
    input = el('textarea')
    input.rows = 1
    input.placeholder = '问一句…（Enter 发送 · 可拖文件进来）'
    input.setAttribute('aria-label', '输入问题')
    clipBtn = el('button', 'clip', IC.clip)
    clipBtn.type = 'button'
    clipBtn.title = '添加文件（也可直接拖进来）'
    clipBtn.setAttribute('aria-label', '添加文件')
    fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.multiple = true
    fileInput.hidden = true
    /* 文件引擎按需加载；accept 由引擎单一真源接管，这里只给加载前的兜底列表 */
    fileInput.accept = (window.BaijuFiles && window.BaijuFiles.accept) ||
      '.txt,.md,.csv,.json,.html,.log,.py,.docx,.xlsx,.pptx,.pdf,.png,.jpg,.jpeg,.webp,.bmp,.gif'
    micBtn = el('button', 'mic', IC.mic)
    micBtn.type = 'button'
    micBtn.title = '语音输入'
    sendBtn = el('button', 'rd', IC.send)
    sendBtn.type = 'submit'
    sendBtn.title = '发送'
    form.appendChild(clipBtn)
    form.appendChild(fileInput)
    form.appendChild(micBtn)
    form.appendChild(input)
    form.appendChild(sendBtn)

    /* 底注 */
    footEl = el('div', 'bja-foot')
    footEl.innerHTML = '<span>Enter 发送 · Shift+Enter 换行 · 拖文件直接进对话</span><span class="st"></span>'

    /* 功能中心（从「设置」打开的抽屉，不占对话区）
       2026-11-12：全站唯一设置。头部挂正式图形标「隙」，开关收进分组卡片，
       导航小尖角 / 对话页齿轮 / 助手面板都回到这一处，不再有第二套设置 UI。 */
    sheet = el('div', 'bja-sheet')
    sheet.innerHTML =
      '<div class="sh-hd">' +
      '<span class="sh-mk">' + MARK('sm') + '</span>' +
      '<span class="sh-tt"><b>功能与设置</b><em>全站唯一设置 · ' + BRAND_NAME + '</em></span>' +
      '<button type="button" class="sh-x" data-sheet="close" aria-label="关闭设置">' + IC.close + '</button>' +
      '</div>' +
      '<div class="sh-bd">' +
      '<div class="sh-grp"><div class="sh-t">对话</div>' +
      rowSwitch('voice', '语音输入', '说话转文字，识别后可直接编辑') +
      rowSwitch('speak', '自动朗读', '回答生成后念一遍，可随时打断') +
      rowSwitch('chips', '快捷提问', '按当前页面给几个可直接点的问题') +
      rowSwitch('guide', '页面导读', '开场先说明这一页收的是什么') +
      '</div>' +
      '<div class="sh-grp"><div class="sh-t">悬浮标</div>' +
      rowSwitch('remember', '记住位置', '关掉后每次刷新回到右侧中间') +
      '</div>' +
      '<div class="sh-grp"><div class="sh-t">快捷操作</div>' +
      '<div class="sh-act">' +
      '<button type="button" data-do="search"><i>' + IC.find + '</i>全站搜索</button>' +
      '<button type="button" data-do="top"><i>' + IC.top + '</i>回到顶部</button>' +
      '<button type="button" data-do="read"><i>' + IC.eye + '</i>阅读模式</button>' +
      '<button type="button" data-do="theme"><i>' + IC.moon + '</i>切换深浅色</button>' +
      '<button type="button" data-do="copy"><i>' + IC.link + '</i>复制本页链接</button>' +
      '<button type="button" data-do="reset"><i>' + IC.reset + '</i>按钮复位</button>' +
      '</div></div>' +
      '<div class="sh-grp"><div class="sh-t">常用直达</div>' +
      '<div class="sh-act sh-links">' +
      QUICK_LINKS.map(function (x) {
        return '<button type="button" data-do="go:' + x[1] + '"><i>' + IC.link + '</i>' + esc(x[0]) + '</button>'
      }).join('') +
      '</div></div>' +
      '<div class="sh-grp"><div class="sh-t">反馈 · 实时</div>' +
      '<div class="sh-act">' +
      (FEEDBACK.email ? '<button type="button" data-do="fb:email"><i>' + IC.link + '</i>邮箱反馈</button>' : '') +
      (FEEDBACK.qqGroup ? '<button type="button" data-do="fb:qq"><i>' + IC.link + '</i>加入 QQ 群</button>' : '') +
      '<button type="button" data-do="fb:copy"><i>' + IC.link + '</i>复制反馈入口</button>' +
      '</div>' +
      '<p class="sh-tip">' + esc(FEEDBACK.note) + '。' + (FEEDBACK.email || FEEDBACK.qqGroup ? '' : '联系方式待填，先可复制入口。') + '</p>' +
      '</div>' +
      '<div class="sh-grp"><div class="sh-t">记忆与成长</div>' +
      '<div class="sh-mem" data-sh-mem></div>' +
      '<div class="sh-act">' +
      '<button type="button" data-do="memory"><i>' + IC.cards + '</i>看看记住了什么</button>' +
      '<button type="button" data-do="forget"><i>' + IC.reset + '</i>清空记忆</button>' +
      '</div></div>' +
      '<div class="sh-grp"><div class="sh-t">模型连接 · 可选</div>' +
      '<details class="sh-byok"><summary>需要翻译 / 逐句改写时才展开</summary>' +
      '<p class="sh-note">线上是静态托管，没有转发服务。文件、表格、计算、整理、导出、记忆这些<b>本地就能用</b>，不需要这里。<br>' +
      '填了才会启用；<b>Key 只存这台设备、不上传</b>。官方接口可能被浏览器跨域拦截，能否直连取决于服务商，本站不承诺可用；<b>不填也不影响</b>上面这些本地能力。</p>' +
      '<label class="sh-fld">接口地址<input type="text" data-byok="url" placeholder="https://…/v1/chat/completions" autocomplete="off"></label>' +
      '<label class="sh-fld">API Key<input type="password" data-byok="key" placeholder="sk-…" autocomplete="off"></label>' +
      '<label class="sh-fld">模型名<input type="text" data-byok="model" placeholder="deepseek-chat" autocomplete="off"></label>' +
      '<div class="sh-act"><button type="button" data-byok="save">保存并启用</button><button type="button" data-byok="off">关闭并清除</button></div>' +
      '</details></div>' +
      '<p class="sh-tip">拖动悬浮标换位置，双击回到右侧中间。<b>全站只有这一处设置</b>，并且和工具一起收在左上角三角折叠里，不再单独露出齿轮。工具展开时对话还在上面，始终只是这一个悬浮窗、这一个页面。文件与记忆只留在这台设备上。</p>' +
      '</div>'

    /* 对话页顶部设置条：左模型、右齿轮，齿轮平时压到 0.3 透明度，藏在上面不抢戏 */
    ctop = el('div', 'bja-ctop')
    ctop.innerHTML =
      '<span class="ct-model" title="当前服务端模型">' +
      '<i class="ct-dot"></i><b data-ct-model>spark-x2.6</b>' +
      '</span>' +
      '<span class="ct-flags" data-ct-flags></span>' +
      '<span class="ct-mode" data-ct-mode hidden>工具已展开</span>' +
      '<button type="button" class="ct-gear" data-ct="toggle" title="对话设置 · 模型 / 任务形式 / 工具" aria-label="打开对话设置" aria-expanded="false">' +
      IC.sliders + '<b>设置</b></button>'
    ctModel = ctop.querySelector('[data-ct-model]')
    ctFlags = ctop.querySelector('[data-ct-flags]')

    /* 对话设置面板（贴在顶部条下方展开，不出面板边界） */
    cset = el('div', 'bja-cset')
    cset.setAttribute('role', 'menu')
    cset.innerHTML =
      '<div class="cs-hd"><span class="cs-mk">' + MARK('sm') + '</span><b>对话设置</b><span>模型 · 任务形式 · 工具</span>' +
      '<button type="button" class="cs-x" data-ct="close" aria-label="收起设置">' + IC.close + '</button></div>' +
      '<div class="cs-bd">' +
      '<div class="cs-t">模型</div>' +
      '<div class="cs-models" data-cs-models>' +
      '<div class="cs-model cur"><i class="cs-mk">' + MARK('sm') + '</i>' +
      '<span class="cs-mt"><b>spark-x2.6</b><em>服务端默认 · 流式回答</em></span>' +
      '<span class="cs-badge">当前</span></div>' +
      '</div>' +
      '<div class="cs-t">任务形式</div>' +
      '<div class="cs-modes" data-cs-modes></div>' +
      '<div class="cs-t">回答方式</div>' +
      rowSwitch('think', '深度思考', '多等 8–10 秒先想再做，复杂问题更稳') +
      rowSwitch('long', '详细回答', '回答上限从 1200 放开到 2600 tokens') +
      '<div class="cs-t">对话延伸</div>' +
      rowSwitch('voice', '语音输入', '说话转文字，识别后可改') +
      rowSwitch('speak', '自动朗读', '回答生成后念一遍') +
      rowSwitch('chips', '快捷提问', '按当前页面给几个可点的问法') +
      '<div class="cs-t">工具</div>' +
      '<div class="cs-acts cs-tools">' +
      '<button type="button" data-ctool="file"><i>' + IC.book + '</i>生成文件</button>' +
      '<button type="button" data-ctool="calc"><i>' + IC.top + '</i>数据计算</button>' +
      '<button type="button" data-ctool="rec"><i>' + IC.mic + '</i>录音保存</button>' +
      '<button type="button" data-ctool="ocr"><i>' + IC.eye + '</i>图片识字</button>' +
      '</div>' +
      '<div class="cs-tool-panel" data-tool-panel hidden></div>' +
      '<div class="cs-act-row">' +
      '<button type="button" data-cdo="clear"><i>' + IC.reset + '</i>清空对话</button>' +
      '<button type="button" data-cdo="export"><i>' + IC.link + '</i>导出对话</button>' +
      '<button type="button" data-cdo="more"><i>' + IC.sliders + '</i>完整设置</button>' +
      '</div>' +
      '</div>'

    panel.appendChild(hd)
    panel.appendChild(ctop)
    panel.appendChild(cset)
    panel.appendChild(home)
    panel.appendChild(log)
    panel.appendChild(chipsBox)
    panel.appendChild(capBar)
    panel.appendChild(attBar)
    panel.appendChild(form)
    panel.appendChild(footEl)
    panel.appendChild(sheet)

    /* ---------- 悬浮按钮 ---------- */
    var fab = el('button', 'bja-fab')
    fab.type = 'button'
    fab.setAttribute('aria-label', '打开白驹助手（可拖动）')
    fab.innerHTML = '<span class="halo"></span>' + HORSE
    root.appendChild(fab)

    document.body.appendChild(root)
    document.body.appendChild(panel)
    document.documentElement.classList.add('bja-on')

    wire(fab)
    applyPref()
  }

  function rowSwitch(key, title, desc) {
    return '<div class="sh-row"><div class="sh-l"><b>' + title + '</b><span>' + desc + '</span></div>' +
      '<button type="button" class="sh-sw" data-sw="' + key + '" aria-pressed="false" aria-label="' + title + '"><i></i></button></div>'
  }

  /* ---------------- 事件绑定 ---------------- */
  function wire(fab) {
    fab.addEventListener('click', function (e) {
      if (fab.__dragged) { fab.__dragged = false; return }
      toggle()
    })
    fab.addEventListener('dblclick', function (e) {
      e.preventDefault()
      resetPos()
    })
    dragify(fab)

    panel.querySelector('.bja-hd .act').addEventListener('click', onAction)

    /* 对话页顶部设置：齿轮开关 + 抽屉内开关/动作 */
    ctop.addEventListener('click', function (e) {
      if (e.target.closest('[data-ct="toggle"]')) toggleCset()
    })
    cset.addEventListener('click', function (e) {
      if (e.target.closest('[data-ct="close"]')) { toggleCset(false); return }
      var sw = e.target.closest('[data-sw]')
      if (sw) {
        var k = sw.getAttribute('data-sw')
        pref[k] = !pref[k]
        savePref()
        applyPref()
        paintCtop()
        return
      }
      var md = e.target.closest('[data-mode]')
      if (md) {
        pref.mode = md.getAttribute('data-mode')
        savePref()
        paintModes()
        paintCtop()
        return
      }
      var tb = e.target.closest('[data-ctool]')
      if (tb) { toolPanel(tb.getAttribute('data-ctool')); return }
      var fm = e.target.closest('[data-fmt]')
      if (fm) { exportAs(fm.getAttribute('data-fmt')); return }
      var cb = e.target.closest('[data-calc]')
      if (cb) { runCalc(cb.getAttribute('data-calc')); return }
      var rb = e.target.closest('[data-rec]')
      if (rb) { recToggle(rb.getAttribute('data-rec')); return }
      var d = e.target.closest('[data-cdo]')
      if (d) chatAction(d.getAttribute('data-cdo'))
    })
    cset.addEventListener('change', function (e) {
      if (e.target.matches('[data-ocr-file]')) ocrImage(e.target.files && e.target.files[0])
    })
    document.addEventListener('click', function (e) {
      if (!cset.classList.contains('on')) return
      if (cset.contains(e.target) || ctop.contains(e.target)) return
      toggleCset(false)
    }, true)

    /* 模式开关：再点一次就收回去，始终是这个窗口、这一页 */
    backBtn.addEventListener('click', function () { setStudioMode() })
    home.addEventListener('click', function (e) {
      var q = e.target.closest('.hm-qs button')
      if (q) { openChat(q.textContent); return }
      var g = e.target.closest('[data-go]')
      if (!g) return
      var k = g.getAttribute('data-go')
      if (k === 'chat') { openChat(); return }
      if (k === 'sheet') { toggleSheet(true); return }
      quickAction(k)
    })
    panel.querySelector('.bja-in').addEventListener('submit', function (e) {
      e.preventDefault()
      if (busy) { stopGenerate(); return }
      submit()
    })
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault()
        if (busy) { stopGenerate(); return }   /* 生成中按 Enter = 停止，不吞掉用户意图 */
        submit()
      }
    })
    input.addEventListener('input', function () {
      input.style.height = 'auto'
      input.style.height = Math.min(104, input.scrollHeight) + 'px'
    })
    micBtn.addEventListener('click', voiceInput)
    /* 文件：按钮选 / 直接拖进来 —— QQ 式直连，不绕菜单 */
    clipBtn.addEventListener('click', function () { fileInput.click() })
    fileInput.addEventListener('change', function (e) { addAttach(e.target.files); fileInput.value = '' })
    ;['dragenter', 'dragover'].forEach(function (ev) {
      panel.addEventListener(ev, function (e) {
        if (!e.dataTransfer || String(e.dataTransfer.types).indexOf('Files') < 0) return
        e.preventDefault(); panel.classList.add('bja-drop')
      })
    })
    ;['dragleave', 'drop'].forEach(function (ev) {
      panel.addEventListener(ev, function (e) {
        e.preventDefault(); panel.classList.remove('bja-drop')
        if (ev === 'drop' && e.dataTransfer) addAttach(e.dataTransfer.files)
      })
    })
    capBar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cap]')
      if (!b) return
      var c = CAP_CHIPS.filter(function (x) { return x.k === b.getAttribute('data-cap') })[0]
      if (!c) return
      if (c.q === '__attach__') { fileInput.click(); return }
      input.value = c.q
      if (/^(练一练|理一理|导出|算一下)$/.test(c.k)) submit()
      else input.focus()
    })
    attBar.addEventListener('click', function (e) {
      var ex = e.target.closest('[data-att-export]')
      if (ex) {
        var sel = attBar.querySelector('[data-att-fmt]')
        exportMaterials(sel ? sel.value : 'md')
        return
      }
      var clr = e.target.closest('[data-att-clear]')
      if (clr) { attachments = []; paintAtt(); return }
      var x = e.target.closest('[data-att-x]')
      if (!x) return
      attachments.splice(parseInt(x.getAttribute('data-att-x'), 10), 1)
      paintAtt()
    })
    chipsBox.addEventListener('click', function (e) {
      var b = e.target.closest('button')
      if (!b) return
      input.value = b.textContent
      submit()
    })

    sheet.addEventListener('click', function (e) {
      var x = e.target.closest('[data-sheet]')
      if (x) { toggleSheet(false); return }
      var sw = e.target.closest('[data-sw]')
      if (sw) {
        var k = sw.getAttribute('data-sw')
        pref[k] = !pref[k]
        savePref()
        applyPref()
        return
      }
      var bk = e.target.closest('button[data-byok]')
      if (bk) { byokAction(bk.getAttribute('data-byok')); return }
      var doer = e.target.closest('[data-do]')
      if (doer) quickAction(doer.getAttribute('data-do'))
    })

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return
      if (root.classList.contains('open')) {
        if (sheet.classList.contains('on')) { toggleSheet(false); return }
        toggle(false)
      }
    })

    window.addEventListener('resize', function () {
      placeRoot(false)
      if (root.classList.contains('open')) placePanel()
    })
    /* 滚动时把悬浮按钮淡下去，停手立刻回来——窄屏没留白，避免它一直压着内容 */
    var tuckTimer = null
    window.addEventListener('scroll', function () {
      if (root.classList.contains('open') && window.innerWidth > 620) placePanel()
      if (root.classList.contains('open')) return
      root.classList.add('bja-ghost')
      clearTimeout(tuckTimer)
      tuckTimer = setTimeout(function () { root.classList.remove('bja-ghost') }, 420)
    }, { passive: true })
  }

  /* ---------------- 位置：默认右侧居中，可拖动 ---------------- */
  function defaultPos() {
    var navBottom = navH()
    return {
      x: window.innerWidth - MARGIN - FAB,
      y: Math.max(navBottom + MARGIN, Math.round((window.innerHeight - FAB) / 2))
    }
  }

  function navH() {
    var cands = ['header.ccnav', 'header.site-nav', '.ccnav', 'header nav', 'body > header']
    for (var i = 0; i < cands.length; i++) {
      var n = document.querySelector(cands[i])
      if (n) {
        var r = n.getBoundingClientRect()
        if (r.height > 20) return Math.round(Math.max(r.bottom, r.height))
      }
    }
    return 108
  }

  function bounds() {
    var nb = navH() + MARGIN
    return {
      minX: MARGIN,
      maxX: Math.max(MARGIN, window.innerWidth - MARGIN - FAB),
      minY: nb,
      maxY: Math.max(nb, window.innerHeight - MARGIN - FAB)
    }
  }

  function placeRoot(useSaved) {
    var p = null
    if (useSaved && pref.remember) {
      try { p = JSON.parse(localStorage.getItem(POS_KEY) || 'null') } catch (e) {}
    }
    if (!p || typeof p.x !== 'number') p = defaultPos()
    var b = bounds()
    root.style.left = clamp(p.x, b.minX, b.maxX) + 'px'
    root.style.top = clamp(p.y, b.minY, b.maxY) + 'px'
  }

  function savePos() {
    if (!pref.remember) return
    try {
      localStorage.setItem(POS_KEY, JSON.stringify({
        x: parseInt(root.style.left, 10) || 0,
        y: parseInt(root.style.top, 10) || 0
      }))
    } catch (e) {}
  }

  function resetPos() {
    try { localStorage.removeItem(POS_KEY) } catch (e) {}
    pref.remember = true
    savePref()
    applyPref()
    root.classList.add('bja-snap')
    placeRoot(false)
    setTimeout(function () { root.classList.remove('bja-snap') }, 260)
    if (root.classList.contains('open')) placePanel()
    tip('按钮已回到右侧中间')
  }

  function dragify(fab) {
    var dragging = false, sx = 0, sy = 0, ox = 0, oy = 0, moved = false

    fab.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return
      dragging = true
      moved = false
      sx = e.clientX; sy = e.clientY
      ox = parseInt(root.style.left, 10) || 0
      oy = parseInt(root.style.top, 10) || 0
      root.classList.add('bja-drag')
      try { fab.setPointerCapture(e.pointerId) } catch (err) {}
    })

    fab.addEventListener('pointermove', function (e) {
      if (!dragging) return
      var dx = e.clientX - sx, dy = e.clientY - sy
      if (!moved && Math.abs(dx) + Math.abs(dy) < 5) return
      moved = true
      var b = bounds()
      root.style.left = clamp(ox + dx, b.minX, b.maxX) + 'px'
      root.style.top = clamp(oy + dy, b.minY, b.maxY) + 'px'
      if (root.classList.contains('open')) placePanel()
    })

    function end(e) {
      if (!dragging) return
      dragging = false
      root.classList.remove('bja-drag')
      if (moved) {
        fab.__dragged = true
        savePos()
      }
      try { fab.releasePointerCapture(e.pointerId) } catch (err) {}
    }
    fab.addEventListener('pointerup', end)
    fab.addEventListener('pointercancel', end)
  }

  /* 面板：贴在按钮旁边，靠哪边就朝另一侧展开，纵向夹在导航与底边之间 */
  function placePanel() {
    if (window.innerWidth <= 620) { panel.style.left = panel.style.top = ''; return }
    var fr = root.getBoundingClientRect()
    /* 助手页（/agent.html）不显示悬浮按钮，root 包围盒会塌成 0×0。
       用右下角当兜底锚点，保证「设置」抽屉仍能出现在合理位置，
       而不是飞到视口左上角。 */
    if (fr.width < 8 || fr.height < 8) {
      var r0 = window.innerWidth - FAB - MARGIN
      var b0 = window.innerHeight - FAB - MARGIN
      fr = { left: r0, right: r0 + FAB, top: b0, bottom: b0 + FAB }
    }
    var pw = Math.min(404, window.innerWidth - 24)
    var room = window.innerHeight - navH() - 2 * MARGIN
    var want = Math.min(560, Math.max(420, room))   // 固定舒适高度，对话区才有地方
    if (cset && cset.classList.contains('on')) want = Math.min(660, Math.max(460, room))  // 设置展开时撑高
    if (sheet && sheet.classList.contains('on')) want = Math.min(640, Math.max(460, room))
    if (studioMode) want = Math.min(680, Math.max(500, room))  // 模式展开时给工具留位置，对话仍在上方
    panel.style.width = pw + 'px'
    panel.style.height = want + 'px'
    panel.style.maxHeight = room + 'px'
    var ph = Math.min(panel.offsetHeight || want, room)
    var x = fr.left + FAB / 2 > window.innerWidth / 2 ? fr.left - pw - 12 : fr.right + 12
    x = clamp(x, MARGIN, window.innerWidth - pw - MARGIN)
    var y = clamp(fr.top + FAB / 2 - ph / 2, navH() + MARGIN, window.innerHeight - ph - MARGIN)
    panel.style.left = Math.round(x) + 'px'
    panel.style.top = Math.round(y) + 'px'
  }

  /* ---------------- 打开/关闭 ---------------- */
  function setView(v) {
    view = (v === 'chat') ? 'chat' : 'home'
    panel.classList.toggle('v-home', view === 'home')
    home.setAttribute('aria-hidden', view === 'home' ? 'false' : 'true')
    if (view === 'chat') {
      if (!log.childElementCount) greet()
      paintChips()
      paintCtop()
      setTimeout(function () { try { input.focus() } catch (e) {} }, 120)
    } else {
      toggleCset(false)
    }
    setTimeout(placePanel, 30)
  }

  function openChat(q) {
    setView('chat')
    if (q) {
      input.value = q
      submit()
    }
  }

  /* 首页底部的快捷提问，和对话区共用同一份数据 */
  function paintHomeQs() {
    var box = home.querySelector('[data-qs]')
    if (!box) return
    var c = ctxFor(location.pathname)
    if (box.getAttribute('data-for') === location.pathname) return
    box.setAttribute('data-for', location.pathname)
    box.innerHTML = '<span class="qs-t">试试这样问</span>'
    c.chips.forEach(function (t) {
      var b = el('button', null, t)
      b.type = 'button'
      box.appendChild(b)
    })
    /* 有历史时首卡改成「继续对话」 */
    var pri = home.querySelector('.hm-acts .pri .hm-t b')
    if (pri) pri.textContent = history.length ? '继续上次对话' : '开始对话'
  }

  function toggle(force) {
    var want = typeof force === 'boolean' ? force : !root.classList.contains('open')
    if (want) {
      panel.classList.add('open')
      placePanel()
    }
    root.classList.toggle('open', want)
    panel.classList.toggle('open', want)
    if (want) {
      paintHomeQs()
      /* 2026-11-12：QQ 式直连 —— 点开就是对话，不再隔一层首页。
         全站搜索 / 阅读模式统一收在「功能与设置」里，这里不重复铺。 */
      setView('chat')
      checkOnline()
      paintMem()
      setTimeout(placePanel, 60)
    } else if (sheet && sheet.classList.contains('on')) {
      toggleSheet(false)
    }
    /* 收起窗口就回到纯对话：工作室是临时模式，不在下次打开时赖着 */
    if (!want) { toggleCset(false); if (studioMode) setStudioMode(false) }
  }

  function toggleSheet(on) {
    var want = typeof on === 'boolean' ? on : !sheet.classList.contains('on')
    sheet.classList.toggle('on', want)
    if (want) {
      // 打开抽屉时把面板撑到舒适高度
      panel.style.maxHeight = Math.min(window.innerHeight - 2 * MARGIN, 640) + 'px'
      setTimeout(placePanel, 30)
    }
  }

  /* 顶部条上的对话设置：默认收起，点齿轮展开 */
  function toggleCset(on) {
    if (!cset) return
    var want = typeof on === 'boolean' ? on : !cset.classList.contains('on')
    if (want) {
      paintCtop()
      paintModes()
      loadModels()
      // 高度交给 placePanel 统一算（它看到 cset 展开会自动撑高）
      setTimeout(placePanel, 30)
      var g = ctop.querySelector('[data-ct="toggle"]')
      if (g) g.setAttribute('aria-expanded', 'true')
    } else {
      var g2 = ctop.querySelector('[data-ct="toggle"]')
      if (g2) g2.setAttribute('aria-expanded', 'false')
    }
    cset.classList.toggle('on', want)
    if (!want) setTimeout(placePanel, 30)
  }

  /* 顶部条：模型名 + 当前生效的回答方式标记 */
  function paintCtop() {
    if (!ctop) return
    if (pref.think || pref.long) {
      ctFlags.innerHTML = (pref.think ? '<span class="ct-fg">深度思考</span>' : '') +
        (pref.long ? '<span class="ct-fg">详细</span>' : '')
    } else {
      ctFlags.innerHTML = ''
    }
  }

  /* ---------------- 任务形式 ---------------- */
  var MODES = [
    { k: 'chat', n: '通用问答', d: '站内问答与解释' },
    { k: 'write', n: '写作润色', d: '文案、稿件、改写' },
    { k: 'code', n: '代码', d: '写代码、看报错' },
    { k: 'data', n: '数据分析', d: '看表、算指标、给结论' },
    { k: 'trans', n: '翻译', d: '中英互译，保留术语' },
    { k: 'sum', n: '总结', d: '长文压缩成要点' }
  ]

  function paintModes() {
    var box = cset && cset.querySelector('[data-cs-modes]')
    if (!box) return
    box.innerHTML = ''
    MODES.forEach(function (m) {
      var b = el('button', 'cs-mode' + (pref.mode === m.k ? ' on' : ''), m.n)
      b.type = 'button'
      b.setAttribute('data-mode', m.k)
      b.title = m.d
      box.appendChild(b)
    })
  }

  /* ---------------- 模型列表（服务端读，前端不写死） ---------------- */
  function loadModels() {
    var box = cset && cset.querySelector('[data-cs-models]')
    if (!box) return
    fetch('/api/models', { method: 'GET' })
      .then(function (r) { return r.ok ? r.json() : null })
      .then(function (j) {
        var list = (j && j.models) || []
        if (!list.length) return
        box.innerHTML = ''
        list.forEach(function (m) {
          var row = el('div', 'cs-model' + (m.current ? ' cur' : ''))
          row.innerHTML =
            '<i class="cs-mk">' + MARK('sm') + '</i>' +
            '<span class="cs-mt"><b>' + esc(m.id) + '</b><em>' + esc(m.owner || 'OpenAI 兼容') + '</em></span>' +
            (m.current ? '<span class="cs-badge">当前</span>' : '<span class="cs-badge off">可切</span>')
          if (!m.current) {
            row.setAttribute('role', 'button')
            row.tabIndex = 0
            row.addEventListener('click', function () { pickModel(m.id) })
          }
          box.appendChild(row)
        })
        if (list.length === 1) {
          var tipRow = el('p', 'cs-note')
          tipRow.textContent = '当前服务端只接了这一家模型。要加别的，在 ai.config.json 的 providers 里填 base / model / key，刷新后就出现在上面。'
          box.appendChild(tipRow)
        }
      })
      .catch(function () {})
  }

  function pickModel(id) {
    pref.model = id
    savePref()
    tip('已切到 ' + id)
    var mt = ctop.querySelector('[data-ct-model]')
    if (mt) mt.textContent = id
    loadModels()
  }

  /* ---------------- 工具：生成文件 / 计算 / 录音 / 识字 ---------------- */
  function lastAnswer() {
    var arr = log.querySelectorAll('.bja-m.a .bd')
    if (!arr.length) return ''
    return String(arr[arr.length - 1].textContent || '').trim()
  }

  function dl(name, text, mime) {
    var blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' })
    var a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    document.body.appendChild(a)
    a.click()
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove() }, 400)
  }

  function stamp() {
    var d = new Date()
    var p = function (n) { return (n < 10 ? '0' : '') + n }
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes())
  }

  function toolPanel(k) {
    var p = cset.querySelector('[data-tool-panel]')
    if (!p) return
    if (p.getAttribute('data-for') === k && !p.hidden) { p.hidden = true; p.setAttribute('data-for', ''); return }
    p.hidden = false
    p.setAttribute('data-for', k)
    var t = lastAnswer()

    if (k === 'file') {
      p.innerHTML =
        '<div class="tp-hd">生成文件<em>取最后一条回答，导出成能直接打开的文件</em></div>' +
        '<div class="tp-grid">' +
        '<button type="button" data-fmt="md">.md</button>' +
        '<button type="button" data-fmt="txt">.txt</button>' +
        '<button type="button" data-fmt="html">.html</button>' +
        '<button type="button" data-fmt="csv">.csv</button>' +
        '<button type="button" data-fmt="json">.json</button>' +
        '<button type="button" data-fmt="docx">.docx</button>' +
        '<button type="button" data-fmt="pdf">.pdf</button>' +
        '<button type="button" data-fmt="doc">.doc</button>' +
        '</div>' +
        '<p class="tp-note">' + (t ? '取材：最后一条回答（' + t.length + ' 字）' : '还没有回答可导出，先问一句。') + '</p>'
    } else if (k === 'calc') {
      p.innerHTML =
        '<div class="tp-hd">数据计算<em>算式直接算；粘贴 CSV 给统计</em></div>' +
        '<textarea data-calc-in rows="3" placeholder="例：12*8+3.5&#10;或粘贴两列 CSV：&#10;月份,销量&#10;1月,120"></textarea>' +
        '<div class="tp-row"><button type="button" data-calc="run">计算</button><button type="button" data-calc="clear">清空</button></div>' +
        '<pre class="tp-out" data-calc-out></pre>'
    } else if (k === 'rec') {
      p.innerHTML =
        '<div class="tp-hd">录音保存<em>录完直接下载音频文件</em></div>' +
        '<div class="tp-row"><button type="button" data-rec="start">开始录音</button><button type="button" data-rec="stop" disabled>停止并保存</button></div>' +
        '<p class="tp-note" data-rec-note>浏览器要授权麦克风；保存为 .webm，Windows 与 Chrome 可直接播放。</p>'
    } else if (k === 'ocr') {
      p.innerHTML =
        '<div class="tp-hd">图片识字<em>识别图片里的文字</em></div>' +
        '<input type="file" accept="image/*" data-ocr-file />' +
        '<pre class="tp-out" data-ocr-out>选一张带文字的图片。</pre>' +
        '<p class="tp-note">走浏览器本地识别，不传服务器。</p>'
    }
  }

  /* ==================== 能力引擎 · 本地层（2026-11-12） ====================
     线上是静态托管，没有服务端转发。这一层全部在浏览器里跑，不请求任何接口：
       跨会话记忆 / 情感与偏好 / 成长画像 / 文件识别 / 文档问答 / 表格 /
       计算 / 简单分析与推理 / 整理归档 / 漫剧骨架 / 导出 Word·PDF。
     模型类（翻译、改论文、开放问答）仍走 /api/chat 或自带 Key；
     不可用时给本地可执行的骨架，不再甩服务端命令吓人。
     数据只存本机 localStorage，不上传、不写 Cookie。 */
  var MEM_KEY = 'baiju.memory.v1'
  var mem = null
  var attachments = []
  var MAX_ATT_CHARS = 24000
  var MEM_TOPICS = ['提示词', 'RAG', '智能体', 'Agent', '微调', '多模态', '模型', '工具',
    '论文', '翻译', '表格', '文档', '漫剧', '计算', '分析', '推理', '部署', '评测', '安全', '就业']

  function loadMem() {
    if (mem) return mem
    try { mem = JSON.parse(localStorage.getItem(MEM_KEY) || '{}') } catch (e) { mem = {} }
    if (!mem || typeof mem !== 'object') mem = {}
    mem.name = mem.name || ''
    mem.likes = Array.isArray(mem.likes) ? mem.likes : []
    mem.dislikes = Array.isArray(mem.dislikes) ? mem.dislikes : []
    mem.topics = mem.topics && typeof mem.topics === 'object' ? mem.topics : {}
    mem.tasks = mem.tasks && typeof mem.tasks === 'object' ? mem.tasks : {}
    mem.corrections = Array.isArray(mem.corrections) ? mem.corrections : []
    mem.turns = mem.turns || 0
    mem.since = mem.since || Date.now()
    return mem
  }
  function saveMem() { try { localStorage.setItem(MEM_KEY, JSON.stringify(mem)) } catch (e) {} }
  function stage() {
    var n = loadMem().turns
    return n < 3 ? '初识' : n < 12 ? '熟悉' : n < 40 ? '默契' : '同行'
  }
  function topTopics(n) {
    var t = loadMem().topics
    return Object.keys(t).sort(function (a, b) { return t[b] - t[a] }).slice(0, n || 3)
  }
  /* 从每一句里学一点：称呼、偏好、纠正、详略倾向、常问方向。 */
  function learn(q) {
    loadMem()
    mem.turns++
    var s = String(q), m
    MEM_TOPICS.forEach(function (k) {
      if (s.toLowerCase().indexOf(k.toLowerCase()) >= 0) mem.topics[k] = (mem.topics[k] || 0) + 1
    })
    if ((m = s.match(/(?:我叫|叫我|我是)\s*([\u4e00-\u9fa5A-Za-z0-9_]{1,12})/))) mem.name = m[1]
    if ((m = s.match(/(?:我喜欢|我偏好|以后都|请一直|记住我|我更想看)\s*([^，。,.；;]{2,24})/))) {
      var l = m[1].trim()
      if (l && mem.likes.indexOf(l) < 0) mem.likes.push(l)
      if (mem.likes.length > 12) mem.likes.shift()
    }
    if ((m = s.match(/(?:别再|不要|不喜欢|太长了|简单点|说人话|别用术语|记一下)[^，。,.；;]{0,24}/))) {
      var d = m[0].trim()
      if (d && mem.dislikes.indexOf(d) < 0) mem.dislikes.push(d)
      mem.corrections.push({ t: Date.now(), s: d })
      if (mem.dislikes.length > 12) mem.dislikes.shift()
      if (mem.corrections.length > 20) mem.corrections.shift()
    }
    if (/简洁|简短|一句话|别展开|简单点/.test(s)) mem.brief = true
    if (/详细|展开|多说|深入|具体点/.test(s)) mem.brief = false
    saveMem()
  }
  function noteTask(k) { if (k) { loadMem(); mem.tasks[k] = (mem.tasks[k] || 0) + 1; saveMem() } }
  /* 成长画像注入 system：模型在的时候越用越贴合，不在的时候也用于本地措辞。 */
  function memPrompt() {
    var p = ['你是白驹 ccowork 的站内助手，陪一个人自学 AI。']
    if (mem.name) p.push('称呼对方「' + mem.name + '」。')
    var tp = topTopics(3)
    if (tp.length) p.push('他最近常问：' + tp.join('、') + '。')
    if (mem.likes.length) p.push('已知偏好：' + mem.likes.slice(-4).join('、') + '。')
    if (mem.dislikes.length) p.push('避免：' + mem.dislikes.slice(-4).join('、') + '。')
    if (mem.brief === true) p.push('倾向简短回答。')
    p.push('已同行 ' + mem.turns + ' 轮（' + stage() + '）。贴合他的水平，不重复解释他已懂的概念；涉及站内内容优先给可点的路径。')
    return p.join('')
  }
  function memBrief() {
    loadMem()
    var tp = topTopics(2)
    return '**同行 ' + mem.turns + ' 轮 · ' + stage() + '**' +
      (mem.name ? ' · ' + esc(mem.name) : '') +
      (tp.length ? ' · 常聊 ' + tp.join(' / ') : '') +
      (mem.likes.length ? '\n\n记住的偏好：' + mem.likes.slice(-3).map(esc).join('、') : '') +
      (mem.dislikes.length ? '\n会避开：' + mem.dislikes.slice(-3).map(esc).join('、') : '') +
      '\n\n这些只存在你这台设备上，随时可在设置里清空。'
  }

  /* ---------- 文件 / 文档：添加、识别、按内容回答 ---------- */
  /* 文件引擎按需加载一次：页面以绝对路径引入 baiju-assistant.js，引擎在同根 assets/ */
  var fileEngineLoading = null
  function fileEngine() {
    if (window.BaijuFiles && window.BaijuFiles.parse) return Promise.resolve(window.BaijuFiles)
    if (fileEngineLoading) return fileEngineLoading
    fileEngineLoading = new Promise(function (resolve, reject) {
      var srcs = document.querySelectorAll('script[src*="baiju-assistant.js"]')
      var b = srcs.length ? srcs[srcs.length - 1].src.replace(/baiju-assistant\.js.*$/, '') : '/'
      var s = document.createElement('script')
      s.src = b + 'assets/baiju-file-engine.js'
      s.onload = function () { window.BaijuFiles ? resolve(window.BaijuFiles) : reject(new Error('engine')) }
      s.onerror = function () { reject(new Error('engine')) }
      document.head.appendChild(s)
    })
    return fileEngineLoading
  }

  function findAtt(file) {
    for (var i = 0; i < attachments.length; i++) if (attachments[i].raw === file) return attachments[i]
    return null
  }

  /* 图片自动 OCR：结果直接回填成该附件的正文，之后就能像普通文档一样问内容 */
  function ocrAttach(file) {
    return loadTesseract().then(function (T) {
      return ocrOnce(T, file, OCR.lang[0]).catch(function () {
        return ocrOnce(T, file, OCR.lang[1])
      }).catch(function () {
        return ocrOnce(T, file, OCR.lang[2])
      })
    }).then(function (r) {
      var a = findAtt(file); if (!a) return
      var txt = (r && r.data && r.data.text || '').trim()
        .replace(/([\u4e00-\u9fa5])\s+(?=[\u4e00-\u9fa5])/g, '$1')
      if (txt) {
        a.text = txt.slice(0, MAX_ATT_CHARS); a.note = 'OCR 识别结果'; a.ok = true
        tip('图片已识别 ' + txt.length + ' 字 · 可以直接问里面的内容')
      } else { a.note = '没认出文字，换张更清晰的图试试' }
      paintAtt()
    }).catch(function () {
      var a = findAtt(file); if (a) { a.note = 'OCR 未跑起来（语言包需就位）'; paintAtt() }
    })
  }

  function attachFiles(files, done) {
    var list = Array.prototype.slice.call(files || [])
    if (!list.length) { if (done) done(0); return }
    fileEngine().then(function (E) {
      try { if (fileInput && E.accept) fileInput.accept = E.accept } catch (e) {}
      return Promise.all(list.map(function (f) {
        return E.parse(f).then(function (r) {
          attachments.push({
            name: r.name, size: r.size, text: String(r.text || '').slice(0, MAX_ATT_CHARS),
            note: r.note || '', kind: r.kind || '', meta: r.meta || {},
            raw: r.raw || f, ok: !!r.ok
          })
          return r
        })
      }))
    }).then(function (rs) {
      paintAtt()
      if (done) done(rs.filter(function (r) { return r.ok || r.kind === 'image' }).length)
      rs.forEach(function (r) { if (r.kind === 'image') ocrAttach(r.raw) })
    }).catch(function () {
      tip('文件引擎没加载起来，刷新页面再试一次')
      if (done) done(0)
    })
  }
  function attBrief() {
    if (!attachments.length) return ''
    return attachments.map(function (a, i) {
      return (i + 1) + '. `' + a.name + '` · ' + Math.round(a.size / 1024) + 'KB' +
        (a.text ? ' · ' + a.text.length + ' 字' : ' · ' + a.note)
    }).join('\n')
  }
  function docHits(q) {
    /* 中文没有空格，整句当一个词永远匹配不到行；切成 2 字滑窗词再找 */
    var raw = String(q).replace(/[，。,.？?！!、；;：:\s]+/g, ' ').trim()
    var words = [], seen = {}
    raw.split(' ').forEach(function (seg) {
      if (!seg) return
      if (/^[\x00-\x7f]+$/.test(seg)) { if (seg.length > 1) words.push(seg.toLowerCase()); return }
      for (var i = 0; i + 2 <= seg.length; i++) {
        var g = seg.slice(i, i + 2)
        if (!seen[g]) { seen[g] = 1; words.push(g) }
      }
    })
    /* 「这份 / 讲了 / 什么」这类无检索词的组合会误命中每一行，先滤掉 */
    var stop = /^(这份|这个|文档|文件|讲了|什么|里面|上面|说说|请问|帮我|一下|内容|请|的|了|吗|呢|是|有|我|你|它|档讲|了什|么意|意思)$/
    words = words.filter(function (w) { return !stop.test(w) }).slice(0, 12)
    if (!words.length) words = ['白驹', '内容']
    var out = []
    attachments.forEach(function (a) {
      if (!a.text) return
      var score = 0, picks = []
      a.text.split(/\r?\n/).forEach(function (l, li) {
        var s = 0
        words.forEach(function (w) { if (l.toLowerCase().indexOf(w.toLowerCase()) >= 0) s++ })
        if (s) { score += s; if (picks.length < 4 && l.trim()) picks.push({ n: li + 1, t: l.trim().slice(0, 180) }) }
      })
      if (score) out.push({ name: a.name, score: score, picks: picks })
    })
    return out.sort(function (a, b) { return b.score - a.score }).slice(0, 3)
  }
  function attContext() {
    var usable = attachments.filter(function (a) { return a.text })
    if (!usable.length) return ''
    return '\n\n【已添加文件（节选，回答时优先引用）】\n' + usable.slice(0, 3).map(function (a) {
      return '— ' + a.name + ' —\n' + a.text.slice(0, 2200)
    }).join('\n')
  }

  /* 极简算式求值：只认数字与 + - * / % ( ) 和 ^，不碰 eval */
  function calcExpr(src) {
    var s = String(src).replace(/\s+/g, '')
    if (!/^[-+*/%^().\d]+$/.test(s) || !s) return null
    var i = 0
    function num() {
      var st = i
      while (i < s.length && /[\d.]/.test(s[i])) i++
      var v = parseFloat(s.slice(st, i))
      return isNaN(v) ? null : v
    }
    function factor() {
      if (s[i] === '-') { i++; var v = factor(); return v == null ? null : -v }
      if (s[i] === '+') { i++; return factor() }
      if (s[i] === '(') {
        i++
        var r = expr()
        if (s[i] === ')') i++
        return r
      }
      return num()
    }
    function power() {
      var a = factor()
      if (s[i] === '^') { i++; var b = power(); return a == null || b == null ? null : Math.pow(a, b) }
      return a
    }
    function term() {
      var a = power()
      while (i < s.length && '*/%'.indexOf(s[i]) >= 0) {
        var op = s[i++]
        var b = power()
        if (a == null || b == null) return null
        a = op === '*' ? a * b : op === '/' ? a / b : a % b
      }
      return a
    }
    function expr() {
      var a = term()
      while (i < s.length && '+-'.indexOf(s[i]) >= 0) {
        var op = s[i++]
        var b = term()
        if (a == null || b == null) return null
        a = op === '+' ? a + b : a - b
      }
      return a
    }
    var out = expr()
    return (i === s.length && out != null && isFinite(out)) ? out : null
  }

  function csvStats(text) {
    var rows = text.trim().split(/\r?\n/).filter(function (r) { return r.trim() })
    if (rows.length < 2) return null
    var sep = rows[0].indexOf('\t') >= 0 ? '\t' : ','
    var head = rows[0].split(sep).map(function (s) { return s.trim() })
    var body = rows.slice(1).map(function (r) { return r.split(sep) })
    var cols = head.map(function (h, ci) {
      var vals = []
      body.forEach(function (r) {
        var cell = String(r[ci] == null ? '' : r[ci]).trim()
        // 只认纯数字（可带千分位、负号、小数点），"1月" 这种不算
        if (!/^-?[\d,]*\.?\d+$/.test(cell)) return
        var v = parseFloat(cell.replace(/,/g, ''))
        if (!isNaN(v)) vals.push(v)
      })
      if (!vals.length) return null
      var sum = vals.reduce(function (a, b) { return a + b }, 0)
      var sorted = vals.slice().sort(function (a, b) { return a - b })
      return {
        name: h, n: vals.length, sum: sum,
        avg: sum / vals.length,
        min: sorted[0], max: sorted[sorted.length - 1],
        mid: sorted.length % 2 ? sorted[(sorted.length - 1) / 2]
          : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      }
    }).filter(Boolean)
    return { rows: body.length, cols: cols }
  }

  /* ---------- 本地能力路由：静态托管下也真能用的那些 ----------
     返回 {text, task} 交给同一台打字机逐字输出；返回 null 表示需要模型。 */
  function localReply(q) {
    loadMem()
    var s = String(q || '').trim()

    if (/^(我的记忆|记住了什么|你还记得|成长|同行进度)/.test(s) || /清空记忆|忘掉我|重置记忆/.test(s)) {
      if (/清空|忘掉|重置/.test(s)) {
        mem = { turns: 0, since: Date.now() }; saveMem()
        return { task: '记忆', text: '记的都清掉了，从初识重新开始。本机不留备份。' }
      }
      return { task: '记忆', text: memBrief() }
    }
    if (/^(看|列|有)?\s*(附件|文件|文档)($|[？?，,])/.test(s) || /我(上传|添加)的(文件|文档)/.test(s)) {
      if (!attachments.length) return { task: '文档', text: '还没有添加文件。点输入栏左边的回形针，或把文件直接拖进对话里。\n\n加进来之后可以直接问「这份文档讲了什么」「第 3 段是什么意思」，我会按原文片段找给你。支持 Word .docx / Excel .xlsx / PPT .pptx / PDF / 图片 OCR，以及 txt / md / csv / json / html / 代码等文本格式。' }
      return { task: '文档', text: '已收进 ' + attachments.length + ' 份文件：\n\n' + attBrief() + '\n\n可以直接问里面的内容；也可以说「理一理」生成目录，或「导出 Word / PDF」把结果带走。' }
    }
    if (/清空附件|删掉文件|移除文件|清空文件/.test(s)) {
      attachments = []
      return { task: '整理', text: '文件已清空，本机不留存。' }
    }

    var dh = docHits(s)
    if (dh.length && /文档|文件|附件|里面|这份|上面|刚才|讲了|写了|提到|摘要|总结|第.*段|什么意思/.test(s)) {
      var t = '按你问的，在这几份文件里找到相关片段：\n\n'
      dh.forEach(function (d) {
        t += '**`' + esc(d.name) + '`**\n'
        d.picks.forEach(function (p) { t += '> 第 ' + p.n + ' 行 · ' + esc(p.t) + '\n' })
        t += '\n'
      })
      t += '上面是原文定位，不是改写。要我按这些片段给一版完整解释，说一声就行。'
      return { task: '文档', text: t }
    }

    /* 有材料、但中文问句按词没命中时，直接给文件概览 + 开头原文，
       保证「添加文件 → 问里面讲了什么」一定答得出来，不甩给模型瞎猜。 */
    var usableAtt = attachments.filter(function (a) { return a.text })
    if (usableAtt.length && /文档|文件|附件|里面|这份|上面|刚才|讲了|写了|提到|摘要|总结|内容|什么意思|第.*段/.test(s)) {
      var brief = '我看了这 ' + usableAtt.length + ' 份材料，先把能确认的部分给你：\n\n'
      usableAtt.slice(0, 3).forEach(function (a) {
        var lines = a.text.split(/\r?\n/).filter(function (l) { return l.trim() }).slice(0, 6)
        brief += '**`' + esc(a.name) + '`** · ' + (a.kind || '文本') + ' · ' + a.text.length + ' 字\n'
        lines.forEach(function (l, li) { brief += '> ' + (li + 1) + '. ' + esc(l.trim().slice(0, 120)) + '\n' })
        brief += '\n'
      })
      brief += '以上是原文开头，不是改写。想细看哪一段、或按主题整理，直接说；也可以点附件条的「导出材料」把全文带走。'
      return { task: '文档', text: brief }
    }

    if (/导出|下载|生成文件|转成|转出|另存|导出成/.test(s)) {
      var fmts = []
      if (/\bPDF\b|pdf/i.test(s)) fmts.push('pdf')
      if (/Word|word|docx|doc\b/i.test(s)) fmts.push('docx')
      if (/Markdown|markdown|\.md/i.test(s)) fmts.push('md')
      if (/网页|\.html/i.test(s)) fmts.push('html')
      if (/表格|CSV|csv/i.test(s)) fmts.push('csv')
      if (!fmts.length) fmts = ['docx', 'pdf', 'md', 'txt', 'html', 'csv', 'json']
      var last = lastAnswer()
      if (!last) return { task: '导出', text: '还没有可导出的回答。先问一句，或说「理一理」把材料整理成一版，再导出。\n\n支持的格式：`Word .docx` · `PDF（打印另存）` · `Markdown` · `HTML` · `TXT` · `CSV` · `JSON`。' }
      var f = fmts[0]
      exportAs(f)
      return { task: '导出', text: '已按 `' + f + '` 导出最后一条回答（' + last.length + ' 字）' + (f === 'pdf' ? '，在新窗口里选「另存为 PDF」即可。' : '，浏览器下载里找一下。') + '\n\n想换格式直接说「导出 Word」「导出 Markdown」。' }
    }

    if (/理一理|整理|归类|目录|清单|归档|梳理|列个/.test(s)) {
      var blocks = []
      if (attachments.length) {
        blocks.push('**已添加的文件**\n' + attBrief())
        attachments.forEach(function (a) {
          if (!a.text) return
          var heads = a.text.split(/\r?\n/).filter(function (l) { return /^\s{0,3}#{1,3}\s|^\s*\d+[.、)]\s/.test(l) }).slice(0, 8)
          if (heads.length) blocks.push('**`' + esc(a.name) + '` 的骨架**\n' + heads.map(function (h) { return '- ' + esc(h.trim()) }).join('\n'))
        })
      }
      var msgs = log ? log.querySelectorAll('.bja-m.a .bd') : []
      if (msgs.length) {
        var recent = []
        for (var i = Math.max(0, msgs.length - 4); i < msgs.length; i++) {
          var tx = String(msgs[i].textContent || '').trim().split(/\n/)[0].slice(0, 60)
          if (tx) recent.push('- ' + tx)
        }
        if (recent.length) blocks.push('**这几轮聊到**\n' + recent.join('\n'))
      }
      if (!blocks.length) return { task: '整理', text: '现在还没有可整理的材料。先添加文件，或者聊几句再让我理。' }
      return { task: '整理', text: '# 整理结果 · ' + stamp() + '\n\n' + blocks.join('\n\n') + '\n\n需要的话说「导出 Word」，这份目录直接就能带走。' }
    }

    if (/(算|计算|等于|多少|求和|合计|百分比|增长率|增幅|平均)/.test(s)) {
      var ex = s.match(/[-+*/%^().\d]{3,}/)
      if (ex) {
        var v = calcExpr(ex[0].replace(/[，,]/g, ''))
        if (v != null) return { task: '计算', text: '`' + ex[0] + '` = **' + fmtNum(v) + '**\n\n本地算的，没走模型。复杂一点的算式直接贴给我就行。' }
      }
      if (/增长率|增幅|涨了|同比|环比/.test(s)) {
        var ns = s.match(/-?\d+(?:\.\d+)?/g)
        if (ns && ns.length >= 2) {
          var a = parseFloat(ns[0]), b = parseFloat(ns[1])
          if (a) return { task: '计算', text: '从 ' + fmtNum(a) + ' 到 ' + fmtNum(b) + '：变化 **' + fmtNum(b - a) + '**，增幅 **' + fmtNum((b - a) / a * 100) + '%**。（本地计算）' }
        }
      }
      return { task: '计算', text: '把算式直接发我就行，例如 `12*8+3.5`、`(240-180)/180`。也可以粘贴一段 CSV，我给每列算合计、均值、极值。' }
    }

    var stats = null
    if (/\t|,/.test(s) && s.split(/\r?\n/).length > 1) { try { stats = csvStats(s) } catch (e) {} }
    if (!stats && /表格|统计|汇总|均值|中位|极值/.test(s)) {
      var ca = attachments.filter(function (a) { return /\.(csv|tsv)$/i.test(a.name) && a.text })[0]
      if (ca) { try { stats = csvStats(ca.text) } catch (e) {} }
    }
    if (stats && stats.cols && stats.cols.length) {
      var tb = '**表格速览** · ' + stats.rows + ' 行数据\n\n| 列 | 条数 | 合计 | 均值 | 最小 | 最大 | 中位 |\n|---|---|---|---|---|---|---|\n'
      stats.cols.forEach(function (c) {
        tb += '| ' + esc(c.name) + ' | ' + c.n + ' | ' + fmtNum(c.sum) + ' | ' + fmtNum(c.avg) +
          ' | ' + fmtNum(c.min) + ' | ' + fmtNum(c.max) + ' | ' + fmtNum(c.mid) + ' |\n'
      })
      tb += '\n数字是本地算的。想看趋势、异常值或转成图表，把问题说具体一点。'
      return { task: '表格', text: tb }
    }
    if (/表格|CSV|csv|数据/.test(s)) {
      return { task: '表格', text: '把表格直接粘进来（或者添加 `.csv` 文件），我按列给合计、均值、最小最大、中位数。\n\n也可以说「导出 CSV」把整理好的结果带走。' }
    }

    if (/漫剧|短剧|分镜|剧本|人设|台词|分集|竖屏/.test(s)) {
      var topic = s.replace(/^.*?(?:写|做|来|生成|设计|搞)\s*/, '').replace(/(的)?(漫剧|短剧|分镜|剧本|设计|方案).*$/, '').trim().slice(0, 24) || '一个转场'
      return { task: '漫剧', text: '**' + esc(topic) + ' · 竖屏漫剧骨架**\n\n' +
        '| 集 | 时长 | 钩子 | 转折 | 收尾 |\n|---|---|---|---|---|\n' +
        '| 01 | 50s | 3 秒抛冲突 | 中段反转 | 留一句悬念 |\n| 02 | 50s | 接上集悬念 | 信息差揭开 | 关系变化 |\n| 03 | 50s | 新目标出现 | 代价浮出 | 决策点 |\n\n' +
        '**人物**：主角（想要什么 / 怕什么）、对手（挡在哪）、旁观者（负责说破）\n\n' +
        '**分镜节奏**：0-3s 特写钩子 → 3-15s 交代 → 15-35s 冲突 → 35-47s 反转 → 47-50s 定格\n\n' +
        '**台词原则**：一镜一句，单句不超过 14 字，靠画面不靠解释。\n\n想定风格（古装 / 都市 / 悬疑）或换成别的集数，说一声我接着改；也可以「导出 Word」拿走。' }
    }

    if (/练一练|随手|巩固|考考|来一个|换个说法再问/.test(s)) {
      var tp = topTopics(1)[0] || '提示词'
      return { task: '陪练', text: '接着刚才聊的「' + esc(tp) + '」，顺手给你一个：\n\n' +
        '> 如果只能改一个地方，让一个回答从「像模板」变成「真的懂我」，你会先动哪一处？为什么？\n\n' +
        '随口答一句就行，我们接着往下聊。' }
    }

    if (/分析|对比|为什么|原因|推理|结论|怎么看|值不值/.test(s)) {
      return { task: '分析', text: '先把这件事拆开，别急着下结论：\n\n' +
        '**1 · 事实**（已经能点回原文的）\n- ' + esc(s.replace(/[？?。，,]/g, '').slice(0, 40)) + ' 的已知条件先列清楚\n\n' +
        '**2 · 假设**（还没验证的）\n- 最可能的一种解释\n- 备用的另一种解释\n\n' +
        '**3 · 证据**（去哪儿找）\n- 站内：模型榜单 / 开源仓库 / 教程章节\n- 站外：原始发布页、论文、实测\n\n' +
        '**4 · 结论边界**\n- 现在能说到哪一步、哪一步需要再验\n\n把具体对象（哪个模型、哪份表格、哪段材料）告诉我，我按这四格填实；有文件时直接引用原文。' }
    }

    return null
  }

  /* 模型不可用时的本地降级：不假装有模型，也不甩服务端命令。 */
  function localFallback(q) {
    var s = String(q || '')
    if (/翻译|译成|translate|中译英|英译中/.test(s)) {
      return '**翻译这一句需要模型在线。** 现在页面是静态托管，没有转发服务。\n\n' +
        '两件事你现在就能做：\n' +
        '1. 在「功能与设置 → 模型连接」里填自己的 API 地址与 Key，填完直接问，我会走你的 Key；\n' +
        '2. 或者把这段先贴进输入框，我帮你把术语表和格式整理好，等到能连模型时一次翻完。\n\n' +
        '术语表模板：\n\n| 原文 | 统一译法 | 备注 |\n|---|---|---|\n|  |  |  |\n\n（你的 Key 只存本机，不上传。）'
    }
    if (/论文|摘要|参考文献|润色|改稿|查重/.test(s)) {
      return '**逐句改写需要模型在线**，但结构这层我现在就能陪你过一遍：\n\n' +
        '- **主张**：一句话说清这篇要证明什么\n- **证据**：每个分论点对应哪组数据 / 哪篇文献\n- **结构**：引言 → 方法 → 结果 → 讨论，缺哪块\n- **引用**：格式是否统一、有没有只引不评\n- **摘要**：是否包含问题、方法、结论、边界四件事\n\n' +
        '把论文粘进来（或添加 `.txt` / `.md` 文件），我先按这五项给你一份核对清单；模型连上后再做逐段润色。说「理一理」就能出清单，「导出 Word」能直接带走。'
    }
    return '这句要模型才答得准，当前页面是静态托管、没有转发服务。\n\n' +
      '**但下面这些现在就能用**（都在本地跑，不用联网）：\n\n' +
      '- 添加文件后问文档里的内容 · 说「理一理」整理成目录\n- 粘贴表格给统计 · 直接发算式给结果\n- 说「导出 Word / PDF / Markdown」把任何一条回答带走\n- 说「你还记得什么」看我记住了哪些偏好\n\n' +
      '想让翻译、逐句改写、开放问答也生效：在「功能与设置 → 模型连接」填自己的 API 地址与 Key（只存本机）。不填也不影响上面这些能力。'
  }

  /* 能力条：功能都在，但界面上不宣告「出题」这类字眼。 */
  var CAP_CHIPS = [
    { k: '练一练', q: '练一练' },
    { k: '改一版', q: '帮我把这段文字改得更清楚一点' },
    { k: '翻译', q: '翻译：把散落的 AI 工具装进一个大脑' },
    { k: '看表格', q: '我想看一张表的统计' },
    { k: '读文档', q: '看一下我添加的文档' },
    { k: '算一下', q: '算一下 12*8+3.5' },
    { k: '理一理', q: '理一理' },
    { k: '导出', q: '导出 Word' },
    { k: '加文件', q: '__attach__' }
  ]

  /* ---------- 导出成文件 ---------- */
  function mdTableToCsv(text) {
    var lines = text.split(/\r?\n/).filter(function (l) { return l.trim() })
    var out = []
    lines.forEach(function (l) {
      if (/^\|?[\s:|-]+\|?$/.test(l) && l.indexOf('-') >= 0) return
      if (l.indexOf('|') >= 0) {
        out.push(l.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(function (c) {
          return '"' + c.trim().replace(/"/g, '""') + '"'
        }).join(','))
      }
    })
    if (out.length) return out.join('\r\n')
    return text.split(/\r?\n/).map(function (l) { return '"' + l.replace(/"/g, '""') + '"' }).join('\r\n')
  }

  /* 已添加文件的全文汇总：导出材料时用，不再只导最后一条回答 */
  function materialsText() {
    var usable = attachments.filter(function (a) { return a.text })
    if (!usable.length) return ''
    return usable.map(function (a) { return '# ' + a.name + '\n\n' + a.text }).join('\n\n---\n\n')
  }

  function exportText(fmt, t, prefix) {
    if (!t) { tip('没有可导出的内容，先添加文件或问一句'); return false }
    var name = prefix + stamp()
    if (fmt === 'md') { dl(name + '.md', t, 'text/markdown'); return true }
    if (fmt === 'txt') { dl(name + '.txt', t, 'text/plain'); return true }
    if (fmt === 'csv') { dl(name + '.csv', '\ufeff' + mdTableToCsv(t), 'text/csv'); return true }
    if (fmt === 'json') {
      dl(name + '.json', JSON.stringify({
        source: location.href, exported: new Date().toISOString(), content: t,
        files: attachments.map(function (a) { return { name: a.name, size: a.size, kind: a.kind || '' } })
      }, null, 2), 'application/json'); return true
    }
    if (fmt === 'html') {
      var body = t.split(/\n{2,}/).map(function (p) {
        return '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>'
      }).join('\n')
      dl(name + '.html',
        '<!doctype html><meta charset="utf-8"><title>' + esc(name) + '</title>' +
        '<style>body{max-width:720px;margin:48px auto;padding:0 20px;font:16px/1.8 "PingFang SC","Microsoft YaHei",system-ui;color:#1e293b}h1{font-size:20px}</style>' +
        '<h1>' + esc(name) + '</h1>' + body, 'text/html'); return true
    }
    if (fmt === 'docx') { dl(name + '.docx', buildDocx(t), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'); return true }
    if (fmt === 'doc') { dl(name + '.doc', docHtml(name, t), 'application/msword'); return true }
    if (fmt === 'pdf') { exportPdf(name, t); return true }
    tip('暂不支持这个格式'); return false
  }

  function exportAs(fmt) { return exportText(fmt, lastAnswer(), '白驹-') }
  function exportMaterials(fmt) {
    if (!attachments.length) { tip('还没添加文件'); return false }
    return exportText(fmt, materialsText(), '白驹-材料-')
  }

  /* 纯文本 → 可打印 / 可另存的文档 HTML（Word .doc 与 PDF 打印共用） */
  function docHtml(title, text) {
    var body = String(text).split(/\r?\n/).map(function (l) {
      var s = esc(l.replace(/^\s*[-*]\s+/, '• '))
      if (/^#{1,3}\s/.test(l)) return '<h2>' + esc(l.replace(/^#{1,3}\s*/, '')) + '</h2>'
      if (/^>\s?/.test(l)) return '<blockquote>' + esc(l.replace(/^>\s?/, '')) + '</blockquote>'
      if (/^\s*[-*]\s+/.test(l)) return '<p class="li">' + s + '</p>'
      if (/^\s*\|/.test(l)) return '<p class="mono">' + s + '</p>'
      if (!l.trim()) return '<p class="gap"></p>'
      return '<p>' + s + '</p>'
    }).join('\n')
    return '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(title) + '</title>' +
      '<style>' +
      '@page{size:A4;margin:22mm 18mm}' +
      'body{max-width:720px;margin:0 auto;font:15px/1.85 "PingFang SC","Microsoft YaHei",SimSun,system-ui;color:#1e293b}' +
      'h1{font-size:20px;border-bottom:2px solid #4f8cff;padding-bottom:8px;margin:0 0 18px}' +
      'h2{font-size:16px;margin:20px 0 8px;color:#1d4ed8}' +
      'p{margin:0 0 6px}p.gap{height:6px}p.li{padding-left:16px}' +
      'p.mono{font-family:Consolas,Menlo,monospace;font-size:12px;background:#f4f7fc;padding:2px 6px}' +
      'blockquote{border-left:3px solid #8b5cf6;margin:8px 0;padding:4px 12px;background:#faf8ff;color:#475569}' +
      '.ft{margin-top:32px;border-top:1px solid #e2e8f0;padding-top:8px;font-size:11px;color:#94a3b8}' +
      '</style></head><body><h1>' + esc(title) + '</h1>' + body +
      '<div class="ft">白驹 ccowork · ' + esc(new Date().toLocaleString('zh-CN')) + ' · 导出自对话</div>' +
      '</body></html>'
  }
  /* PDF 走浏览器「打印 → 另存为 PDF」：纯前端、中文字体不丢、不引入三方库。 */
  function exportPdf(title, text) {
    var w = null
    try { w = window.open('', '_blank') } catch (e) {}
    if (!w) { tip('浏览器拦了新窗口，允许弹窗后再导出 PDF'); return }
    try {
      w.document.write(docHtml(title, text))
      w.document.close()
      w.document.title = title
      setTimeout(function () { try { w.focus(); w.print() } catch (e) {} }, 420)
      tip('在新窗口选「另存为 PDF」即可')
    } catch (e) { tip('打印窗口打开失败，可先导出 .doc 再另存') }
  }

  /* ---------- 最小 ZIP（store 不压缩）+ 最小 docx ---------- */
  var CRC_TABLE = (function () {
    var t = new Uint32Array(256)
    for (var n = 0; n < 256; n++) {
      var c = n
      for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[n] = c >>> 0
    }
    return t
  })()

  function crc32(buf) {
    var c = 0xffffffff
    for (var i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }

  function zipStore(files) {
    var enc = new TextEncoder()
    var chunks = []
    var central = []
    var offset = 0
    files.forEach(function (f) {
      var nameB = enc.encode(f.name)
      var dataB = enc.encode(f.data)
      var crc = crc32(dataB)
      var lh = new Uint8Array(30 + nameB.length)
      var dv = new DataView(lh.buffer)
      dv.setUint32(0, 0x04034b50, true)
      dv.setUint16(4, 20, true)
      dv.setUint16(6, 0x0800, true)
      dv.setUint16(8, 0, true)
      dv.setUint16(10, 0, true)
      dv.setUint16(12, 0, true)
      dv.setUint32(14, crc, true)
      dv.setUint32(18, dataB.length, true)
      dv.setUint32(22, dataB.length, true)
      dv.setUint16(26, nameB.length, true)
      dv.setUint16(28, 0, true)
      lh.set(nameB, 30)
      chunks.push(lh, dataB)
      central.push({ nameB: nameB, crc: crc, size: dataB.length, offset: offset })
      offset += lh.length + dataB.length
    })
    var cdSize = 0
    var cdParts = []
    central.forEach(function (c) {
      var cd = new Uint8Array(46 + c.nameB.length)
      var dv = new DataView(cd.buffer)
      dv.setUint32(0, 0x02014b50, true)
      dv.setUint16(4, 20, true)
      dv.setUint16(6, 20, true)
      dv.setUint16(8, 0x0800, true)
      dv.setUint16(10, 0, true)
      dv.setUint16(12, 0, true)
      dv.setUint16(14, 0, true)
      dv.setUint32(16, c.crc, true)
      dv.setUint32(20, c.size, true)
      dv.setUint32(24, c.size, true)
      dv.setUint16(28, c.nameB.length, true)
      dv.setUint16(30, 0, true)
      dv.setUint16(32, 0, true)
      dv.setUint16(34, 0, true)
      dv.setUint16(36, 0, true)
      dv.setUint32(38, 0, true)
      dv.setUint32(42, c.offset, true)
      cd.set(c.nameB, 46)
      cdParts.push(cd)
      cdSize += cd.length
    })
    var end = new Uint8Array(22)
    var edv = new DataView(end.buffer)
    edv.setUint32(0, 0x06054b50, true)
    edv.setUint16(8, central.length, true)
    edv.setUint16(10, central.length, true)
    edv.setUint32(12, cdSize, true)
    edv.setUint32(16, offset, true)
    var all = chunks.concat(cdParts, [end])
    var total = all.reduce(function (a, b) { return a + b.length }, 0)
    var out = new Uint8Array(total)
    var pos = 0
    all.forEach(function (a) { out.set(a, pos); pos += a.length })
    return out
  }

  function buildDocx(text) {
    var paras = String(text).split(/\r?\n/).map(function (line) {
      var t = line.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] })
      var bold = /^\*\*.+\*\*$/.test(line.trim()) || /^#{2,3}\s/.test(line.trim())
      var content = t.replace(/^\s*#{1,6}\s*/, '').replace(/\*\*/g, '')
      return '<w:p><w:pPr><w:spacing w:after="120" w:line="300" w:lineRule="auto"/></w:pPr>' +
        '<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:eastAsia="宋体" w:hAnsi="Calibri"/>' +
        '<w:sz w:val="' + (bold ? 26 : 22) + '"/>' + (bold ? '<w:b/>' : '') +
        '</w:rPr><w:t xml:space="preserve">' + content + '</w:t></w:r></w:p>'
    }).join('')

    return zipStore([
      {
        name: '[Content_Types].xml',
        data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
          '</Types>'
      },
      {
        name: '_rels/.rels',
        data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
          '</Relationships>'
      },
      {
        name: 'word/document.xml',
        data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
          '<w:body>' + paras + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
          '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>'
      }
    ])
  }

  /* ---------- 计算 ---------- */
  function runCalc(act) {
    var ta = cset.querySelector('[data-calc-in]')
    var out = cset.querySelector('[data-calc-out]')
    if (!ta || !out) return
    if (act === 'clear') { ta.value = ''; out.textContent = ''; return }
    var src = ta.value.trim()
    if (!src) { out.textContent = '先输入算式或粘贴 CSV。'; return }
    var multi = /\n/.test(src) || src.indexOf(',') >= 0 || src.indexOf('\t') >= 0
    if (multi) {
      var st = csvStats(src)
      if (!st) { out.textContent = '没认出表格：至少要有表头 + 一行数据。'; return }
      var lines = ['共 ' + st.rows + ' 行，' + st.cols.length + ' 个数值列', '']
      st.cols.forEach(function (c) {
        lines.push(c.name + '：n=' + c.n + ' 合计=' + fmtNum(c.sum) + ' 均值=' + fmtNum(c.avg) +
          ' 最小=' + fmtNum(c.min) + ' 最大=' + fmtNum(c.max) + ' 中位=' + fmtNum(c.mid))
      })
      out.textContent = lines.join('\n')
      return
    }
    var v = calcExpr(src)
    out.textContent = v == null ? '算式不合法：只支持数字、+ - * / % ^ 和括号。' : src + ' = ' + fmtNum(v)
  }

  function fmtNum(n) {
    if (!isFinite(n)) return '—'
    var r = Math.round(n * 1e6) / 1e6
    var s = String(r)
    var parts = s.split('.')
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return parts.join('.')
  }

  /* ---------- 录音保存 ---------- */
  var recorder = null, recChunks = []

  function recToggle(act) {
    var note = cset.querySelector('[data-rec-note]')
    var bStart = cset.querySelector('[data-rec="start"]')
    var bStop = cset.querySelector('[data-rec="stop"]')
    if (act === 'start') {
      if (!navigator.mediaDevices || !window.MediaRecorder) {
        if (note) note.textContent = '这个浏览器不支持录音，换 Chrome / Edge 试试。'
        return
      }
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        recChunks = []
        recorder = new MediaRecorder(stream)
        recorder.ondataavailable = function (e) { if (e.data && e.data.size) recChunks.push(e.data) }
        recorder.onstop = function () {
          var blob = new Blob(recChunks, { type: recorder.mimeType || 'audio/webm' })
          var a = document.createElement('a')
          a.href = URL.createObjectURL(blob)
          a.download = '白驹录音-' + stamp() + '.webm'
          document.body.appendChild(a)
          a.click()
          setTimeout(function () { URL.revokeObjectURL(a.href); a.remove() }, 500)
          stream.getTracks().forEach(function (t) { t.stop() })
          if (note) note.textContent = '已保存，文件在下载目录里。'
          if (bStart) bStart.disabled = false
          if (bStop) bStop.disabled = true
        }
        recorder.start()
        if (note) note.textContent = '录音中…说完点「停止并保存」。'
        if (bStart) bStart.disabled = true
        if (bStop) bStop.disabled = false
      }).catch(function () {
        if (note) note.textContent = '没拿到麦克风权限，浏览器地址栏左侧允许一下再试。'
      })
      return
    }
    if (recorder && recorder.state === 'recording') recorder.stop()
  }

  /* ---------- 图片识字：引擎在站内，语言包首次按需下载 ---------- */
  var tesseractLoading = null

  var OCR = {
    script: '/assets/ocr/tesseract.min.js',
    worker: '/assets/ocr/worker.min.js',
    core: '/assets/ocr',
    // 中文语言包已放进站内 assets/ocr/lang，完全离线可用；后两个只作兜底
    lang: [
      '/assets/ocr/lang',
      'https://unpkg.com/@tesseract.js-data/chi_sim@1.0.0/4.0.0',
      'https://tessdata.projectnaptha.com/4.0.0'
    ]
  }

  function loadTesseract() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract)
    if (tesseractLoading) return tesseractLoading
    tesseractLoading = new Promise(function (resolve, reject) {
      var s = document.createElement('script')
      s.src = OCR.script
      s.onload = function () { window.Tesseract ? resolve(window.Tesseract) : reject(new Error('load')) }
      s.onerror = function () { reject(new Error('load')) }
      document.head.appendChild(s)
    })
    return tesseractLoading
  }

  function ocrOnce(T, file, langPath) {
    return T.recognize(file, 'chi_sim', {
      workerPath: OCR.worker,
      corePath: OCR.core,
      langPath: langPath,
      gzip: true,
      logger: function (m) {
        var out = cset.querySelector('[data-ocr-out]')
        if (out && m.status === 'recognizing text') out.textContent = '识别中 ' + Math.round(m.progress * 100) + '%'
      }
    })
  }

  function ocrImage(file) {
    var out = cset.querySelector('[data-ocr-out]')
    if (!out) return
    if (!file) return
    out.textContent = '正在准备识别引擎…（首次要下中文语言包，约 20MB）'
    loadTesseract().then(function (T) {
      return ocrOnce(T, file, OCR.lang[0]).catch(function (e) {
        out.textContent = '本地语言包没命中，换联网源再试一次…'
        return ocrOnce(T, file, OCR.lang[1])
      }).catch(function (e) {
        out.textContent = '再换一个源…'
        return ocrOnce(T, file, OCR.lang[2])
      })
    }).then(function (r) {
      var txt = (r && r.data && r.data.text || '').trim()
      // Tesseract 按字切分，中文会被塞空格，这里合回来；英文单词之间的空格保留
      txt = txt.replace(/([\u4e00-\u9fa5])\s+(?=[\u4e00-\u9fa5])/g, '$1')
      out.textContent = txt || '这张图里没认出文字。字太小或太糊时可以放大后再传。'
      if (txt) {
        var btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'tp-mini'
        btn.textContent = '复制文字'
        btn.addEventListener('click', function () {
          try { navigator.clipboard.writeText(txt); btn.textContent = '已复制' } catch (e) {}
        })
        out.appendChild(document.createElement('br'))
        out.appendChild(btn)
      }
    }).catch(function () {
      out.textContent = '识别没跑起来：语言包要联网下载，网络不通就会失败。也可以把图里的内容直接打出来问我。'
    })
  }

  function chatAction(k) {
    if (k === 'more') { toggleCset(false); toggleSheet(true); return }
    if (k === 'search') { toggleCset(false); doSearch(); return }
    if (k === 'clear') {
      log.innerHTML = ''
      history = []
      saveHist()
      greet()
      paintChips()
      tip('对话已清空')
      toggleCset(false)
      return
    }
    if (k === 'export') {
      var lines = ['# 白驹对话 · ' + location.pathname, '']
      log.querySelectorAll('.bja-m').forEach(function (m) {
        var who = m.classList.contains('u') ? '我' : '白驹'
        var bd = m.querySelector('.bd')
        var txt = bd ? String(bd.textContent || '').trim() : ''
        if (txt) lines.push('**' + who + '**：' + txt, '')
      })
      var md = lines.join('\n').trim() || '（还没有对话内容）'
      try {
        navigator.clipboard.writeText(md)
        tip('对话已复制为 Markdown')
      } catch (e) {
        tip('复制失败，浏览器未授权剪贴板')
      }
      toggleCset(false)
      return
    }
  }

  /* ---------------- 偏好生效 ---------------- */
  function applyPref() {
    micBtn.style.display = pref.voice ? '' : 'none'
    chipsBox.style.display = pref.chips ? '' : 'none'
    log.classList.toggle('no-guide', !pref.guide)
    Array.prototype.forEach.call(panel.querySelectorAll('[data-sw]'), function (sw) {
      var on = !!pref[sw.getAttribute('data-sw')]
      sw.classList.toggle('on', on)
      sw.setAttribute('aria-pressed', on ? 'true' : 'false')
    })
    if (!pref.remember) { try { localStorage.removeItem(POS_KEY) } catch (e) {} }
    paintCtop()
  }

  /* ==================== 工作室 AI · 对话里的一个模式（2026-11-12） ====================
     重要边界：它不是入口、不是路由、不是第二个页面，也不是盖住对话的一层。
     只是这同一个悬浮窗里对话的一种模式 —— 工具平时藏在对话里，展开时
     插在输入行上方，对话记录仍在上面滚，页面没有跳转、助手没有多一个。
     形态参考 Claude Projects / Canvas、Gemini Gems：课题容器 + 项目指令 +
     模板库 + 素材归档 + 产出物版本。默认全部本地 localStorage、零 Key。
     云同步为可选增量：登录后才把收藏/已读/工件写入云端，未登录时不上传、不放假入口。
     明确不做：向量库 / 服务端文件上传（当前形态做不到，不放假入口）。 */
  /* 2026-11-12：「AI 工具 / 工作台 / 对话助手 / 全能 AI」整合进悬浮窗。
     原页面一个不删、功能一个不减；下面 5 条是可选的完整页直达。
     对话助手就是当前窗口本身，不再单列入出口。 */
  var TOOL_HUB = [
    { n: 'AI 工具真库', d: '可验证的产品与出处', u: '/ai-tools.html' },
    { n: 'AI 工具库',   d: '17 个能用起来的', u: '/toolbox/library.html' },
    { n: 'AI 平台阵列', d: '38 家平台一次看完', u: '/toolbox/platforms.html' },
    { n: '白驹工作站',  d: 'IDE × GitHub × AI', u: '/toolbox/workstation.html' },
    { n: '全能工作台',  d: '编译 · 生图 · 整理', u: '/workstation.html' }
  ]
  var STUDIO_KEY = 'baiju.studio.v1'
  var st = null
  var DEFAULT_TPL = [
    { n: '分析四格', q: '按事实 / 假设 / 证据 / 结论边界四格分析：{{对象}}' },
    { n: '整理成目录', q: '把 {{材料}} 整理成一份带层级的目录' },
    { n: '论文自检', q: '按主张 / 证据 / 结构 / 引用 / 摘要五项核对：{{论文}}' },
    { n: '漫剧骨架', q: '给「{{题材}}」出一版竖屏漫剧分集与分镜骨架' },
    { n: '学习卡', q: '把 {{内容}} 拆成几张正面提问、背面回答的学习卡' },
    { n: '改写一版', q: '把下面这段改得更清楚、更短，保留原意：{{文字}}' }
  ]
  function loadStudio() {
    if (st) return st
    try { st = JSON.parse(localStorage.getItem(STUDIO_KEY) || '{}') } catch (e) { st = {} }
    if (!st || typeof st !== 'object') st = {}
    st.projects = Array.isArray(st.projects) && st.projects.length ? st.projects :
      [{ id: 'p0', name: '我的第一个课题', instruction: '', created: Date.now() }]
    st.current = st.current || st.projects[0].id
    st.templates = Array.isArray(st.templates) ? st.templates : DEFAULT_TPL.slice()
    st.assets = Array.isArray(st.assets) ? st.assets : []
    st.artifacts = Array.isArray(st.artifacts) ? st.artifacts : []
    /* 首次进来给 2 份示例工件：新用户能立刻看到「产出物」长什么样，
       而不是对着一个空列表猜。只播种一次，之后用户删了就不再回来。 */
    if (!st.artSeeded) {
      st.artSeeded = true
      if (!st.artifacts.length) {
        st.artifacts = [
          {
            id: 'sample-1', projectId: st.current, ts: Date.now() - 86400000,
            title: '小红书文案 · 3 个让 AI 听话的写法', tags: ['文案', '示例'], sample: true,
            text: '# 3 个让 AI 听话的提示词写法\n\n**1. 先给身份，再给任务**\n「你是一名有 10 年经验的小红书编辑，请把下面这段产品说明改写成一篇笔记。」\n比只说「帮我写个小红书」稳定得多。\n\n**2. 把边界写进提示词**\n明确字数、语气、禁用词、要不要 emoji、给几个标题备选。\n不写边界，模型就会自由发挥到你不想要的方向。\n\n**3. 给一个正例**\n贴一段你喜欢的文字，让它照着语感写，比抽象描述「活泼一点」有效。\n\n> 这是预置示例，方便你看清产出物的样子。点「重命名 / 加标签」就能改成自己的。'
          },
          {
            id: 'sample-2', projectId: st.current, ts: Date.now() - 3600000,
            title: '竖屏漫剧《纸鸢》第 1 集 · 分镜骨架', tags: ['漫剧', '分镜', '示例'], sample: true,
            text: '# 《纸鸢》第 1 集 · 分镜骨架（约 50 秒 / 9:16）\n\n| 镜 | 时长 | 画面 | 台词 / 字幕 | 运镜 |\n|---|---|---|---|---|\n| 1 | 0-4s | 雨夜屋檐，一只纸鸢卡在瓦缝 | 「又是一年秋。」 | 特写推近 |\n| 2 | 4-11s | 少女仰头，手里攥着断线 | 「它没飞走，是被人忘了。」 | 低角度仰拍 |\n| 3 | 11-20s | 闪回：三年前两人一起糊纸鸢 | 无台词，只留风声 | 暖色叠化 |\n| 4 | 20-32s | 她爬上梯子，指尖够到纸鸢 | 「接住你了。」 | 手持微晃 |\n| 5 | 32-42s | 线断，纸鸢反而升起来 | 「原来放手才是让它飞。」 | 仰拍摇臂 |\n| 6 | 42-50s | 黑屏，留一行字 + 下集钩子 | 「第 2 集：那封信是谁写的」 | 定格淡出 |\n\n> 预置示例。存下你自己的版本后可以「对比最近两版」看改了什么。'
          }
        ]
      }
      saveStudio()
    }
    return st
  }
  function saveStudio() { try { localStorage.setItem(STUDIO_KEY, JSON.stringify(loadStudio())) } catch (e) {} }
  function curProject() {
    var s = loadStudio()
    return s.projects.filter(function (p) { return p.id === s.current })[0] || s.projects[0]
  }
  function inProject(x) { return !x.projectId || x.projectId === loadStudio().current }

  /* ---------------- 产出物管理（重命名 / 搜索 / 标签） ----------------
     全部收在唯一悬浮窗三角折叠区里，不另开页面、不另开窗口。 */
  var art = { q: '', tag: '' }
  function artDate(ts) {
    if (!ts) return ''
    var d = new Date(ts), p = function (n) { return (n < 10 ? '0' : '') + n }
    return (d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
  }
  function artTitle(a) { return a.title || ('产出物 · ' + (artDate(a.ts) || '未命名')) }
  function artTags() {
    var m = {}, s = loadStudio()
    s.artifacts.filter(inProject).forEach(function (a) {
      (Array.isArray(a.tags) ? a.tags : []).forEach(function (t) { if (t) m[t] = (m[t] || 0) + 1 })
    })
    return Object.keys(m).sort(function (x, y) { return m[y] - m[x] || x.localeCompare(y, 'zh') })
  }
  function artFiltered() {
    var s = loadStudio(), q = art.q.trim().toLowerCase()
    return s.artifacts.filter(inProject).filter(function (a) {
      if (art.tag && (Array.isArray(a.tags) ? a.tags : []).indexOf(art.tag) < 0) return false
      if (q && (artTitle(a) + ' ' + (a.text || '') + ' ' + (a.tags || []).join(' ')).toLowerCase().indexOf(q) < 0) return false
      return true
    }).slice().reverse()
  }
  function artHtml() {
    var list = artFiltered(), tags = artTags()
    var h = '<div class="st-grp"><div class="st-t">产出物 <em>可改名 / 打标签 / 搜索</em></div>' +
      '<div class="art-bar"><input type="search" data-st="artQ" placeholder="搜标题、正文、标签…" value="' + esc(art.q) + '" aria-label="搜索产出物">' +
      '<button type="button" data-st="artQClear" aria-label="清空搜索">×</button></div>'
    if (tags.length) {
      h += '<div class="art-tags"><button type="button" data-st="artTag" data-t=""' +
        (art.tag ? '' : ' class="cur"') + '>全部</button>' + tags.map(function (t) {
          return '<button type="button" data-st="artTag" data-t="' + esc(t) + '"' +
            (art.tag === t ? ' class="cur"' : '') + '>' + esc(t) + '</button>'
        }).join('') + '</div>'
    }
    if (!list.length) {
      h += '<div class="art-empty">' + (art.q || art.tag ? '没有匹配的产出物，换个词或点「全部」。' : '还没有产出物。跟 AI 聊完点下面「存一版产出物」。') + '</div>'
    } else {
      h += '<div class="art-list">' + list.map(function (a) {
        return '<div class="art-i" data-id="' + esc(String(a.id)) + '">' +
          '<div class="art-i-hd"><b>' + esc(artTitle(a)) + '</b>' +
          '<span class="art-i-ts">' + esc(artDate(a.ts)) + '</span>' +
          (a.sample ? '<span class="art-i-demo">示例</span>' : '') + '</div>' +
          '<div class="art-i-tx">' + esc(String(a.text || '').replace(/\s+/g, ' ').slice(0, 64)) + '…</div>' +
          (Array.isArray(a.tags) && a.tags.length ? '<div class="art-i-tags">' + a.tags.map(function (t) { return '<i>#' + esc(t) + '</i>' }).join('') + '</div>' : '') +
          '<div class="art-i-op">' +
          '<button type="button" data-st="artView" data-id="' + esc(String(a.id)) + '">查看</button>' +
          '<button type="button" data-st="artRename" data-id="' + esc(String(a.id)) + '">重命名</button>' +
          '<button type="button" data-st="artTagEdit" data-id="' + esc(String(a.id)) + '">标签</button>' +
          '<button type="button" data-st="artToChat" data-id="' + esc(String(a.id)) + '">回填对话</button>' +
          '<button type="button" data-st="artDel" data-id="' + esc(String(a.id)) + '">删除</button>' +
          '</div></div>'
      }).join('') + '</div>'
    }
    h += '<div class="st-row"><button type="button" data-st="snap">存一版产出物</button>' +
      (loadStudio().artifacts.filter(inProject).length > 1 ? '<button type="button" class="st-diff" data-st="diff">对比最近两版</button>' : '') +
      '</div></div>'
    return h
  }
  function artById(id) {
    return loadStudio().artifacts.filter(function (a) { return String(a.id) === String(id) })[0]
  }
  function repaintArt() {
    if (!studio) return
    var host = studio.querySelector('[data-art-host]')
    if (host) host.innerHTML = artHtml()
  }

  /* ---------------- 云能力（收在同一个三角折叠区） ----------------
     真源 website/cloud-sync.js 是全站唯一云客户端；这里只做 UI 与入口，
     不新建 client、不新建页面、不新建第二套设置。
     云组件按需加载：只有展开三角时才碰 CDN，避免全站每页都拉 SDK。 */
  var cloudUI = { posts: [], loaded: false, busy: false, msg: '', draft: '' }
  function cc() { return window.CCCloud || null }
  function loadCloud() {
    if (cloudUI.loaded) return
    cloudUI.loaded = true
    if (cc()) { mountCloud(); return }
    try {
      if (typeof window.__ccLoadCloudSync === 'function') window.__ccLoadCloudSync()
      else {
        var s = document.createElement('script')
        s.src = '/website/cloud-sync.js'; s.async = true
        document.body.appendChild(s)
      }
    } catch (e) {}
    /* 云组件就绪是异步的，轮几次再挂；不轮询网络请求本身 */
    var n = 0
    var t = setInterval(function () {
      n++
      if (cc()) { clearInterval(t); mountCloud(); paintCloud() }
      else if (n > 25) {
        clearInterval(t)
        cloudUI.msg = '云组件未加载成功（可能是网络）。本机功能不受影响，可稍后展开工具重试。'
        paintCloud()
      }
    }, 400)
  }
  var shareShown = false
  function mountCloud() {
    var host = studio && studio.querySelector('[data-cloud-host]')
    if (host && cc() && typeof cc().mountInto === 'function') cc().mountInto(host)
    /* 别人打开带 ?share= 的链接时，读回分享内容并给一句人话，
       不跳页、不弹窗、不新建窗口，只在对话里说明。 */
    if (shareShown || !cc()) return
    try {
      var u = new URL(location.href), tk = u.searchParams.get('share')
      if (!tk) return
      shareShown = true
      cc().readShare(tk).then(function (r) {
        if (r.error || !r.data) { addMsg('a', '这个分享链接读不到内容，可能已失效或网络不通。'); scroll(); return }
        var d = r.data
        addMsg('a', '**有人给你分享了一份内容**\n\n' +
          '《' + (d.title || '未命名') + '》· 来自 ' + (d.owner_name || '一位站友') + '\n\n' +
          (d.payload && d.payload.path ? '对应站内页面：`' + d.payload.path + '`\n\n' : '') +
          '分享来自云端，本页的留言与收藏在右下角「工具」里。')
        scroll()
      })
    } catch (e) {}
  }
  function cloudThread() { return (location.pathname || '/').split('?')[0] || '/' }
  function cloudHtml() {
    var api = cc()
    var h = '<div class="st-grp"><div class="st-t">云端 · 可选 <em>不登录也能用全部本地功能</em></div>' +
      '<div data-cloud-host class="cc-cloud">' +
      (api ? '' : '<div class="cc-cloud-hd"><b>☁ 云同步 · 可选</b><span>正在准备…</span></div>') +
      '</div>'
    h += '<div class="st-row"><button type="button" data-st="cloudSync">立即同步</button>' +
      '<button type="button" data-st="cloudFav">收藏本页</button>' +
      '<button type="button" data-st="cloudRead">标记已读</button>' +
      '<button type="button" data-st="cloudShare">生成分享链接</button></div>'
    if (cloudUI.msg) h += '<div class="cc-cloud-msg">' + esc(cloudUI.msg) + '</div>'
    h += '<div class="st-t" style="margin-top:10px">本页留言 <em>公开可见 · 登录后发表</em></div>' +
      '<div data-posts-host>' + postsHtml() + '</div>' +
      '<div class="st-row"><input type="text" data-st="postInput" placeholder="说点踩坑经验或补充…" maxlength="600" aria-label="留言内容" value="' + esc(cloudUI.draft) + '">' +
      '<button type="button" data-st="postSend">发表</button>' +
      '<button type="button" data-st="postLike">👍 点赞本页</button></div>' +
      '</div>'
    return h
  }
  function postsHtml() {
    if (!cloudUI.posts.length) return '<div class="cc-post-empty">还没有留言。看了这一页有什么要补充的，写一句吧。</div>'
    return '<div class="cc-posts">' + cloudUI.posts.map(function (p) {
      var like = p.kind === 'like'
      var t = p.created_at ? String(p.created_at).slice(5, 16).replace('T', ' ') : ''
      return '<div class="cc-post' + (like ? ' is-like' : '') + '">' +
        '<div class="cc-post-hd"><b>' + esc(p.owner_name || '匿名') + '</b><span>' + esc(t) + '</span></div>' +
        '<div class="cc-post-bd">' + (like ? '👍 ' : '') + esc(p.body || '') + '</div>' +
        (p.own ? '<button type="button" data-st="postDel" data-id="' + esc(String(p.id)) + '">删除</button>' : '') +
        '</div>'
    }).join('') + '</div>'
  }
  function paintCloud() {
    if (!studio) return
    var host = studio.querySelector('[data-cloud-host-wrap]')
    if (host) host.innerHTML = cloudHtml()
    mountCloud()
  }
  async function loadPosts() {
    var api = cc()
    if (!api) return
    var r = await api.listPosts(cloudThread())
    if (r.error) { cloudUI.msg = '留言读取失败：' + (r.error.message || '请稍后重试'); paintCloud(); return }
    var sess = await api.session()
    var myName = (sess && sess.user && (sess.user.name || sess.user.email)) || ''
    cloudUI.posts = (r.data || []).map(function (p) {
      return { id: p.id, owner_name: p.owner_name, kind: p.kind, body: p.body,
        created_at: p.created_at, own: !!(myName && p.owner_name === myName) }
    })
    paintCloud()
  }

  function mountStudio() {
    if (studio) return studio
    studio = el('div', 'bja-studio')
    studio.setAttribute('role', 'region')
    studio.setAttribute('aria-label', '工作室模式 · 对话里的工具')
    studio.setAttribute('aria-hidden', 'true')
    /* 关键：插在输入行之前，是对话流里的一段，不是盖住对话的第二层窗口 */
    panel.insertBefore(studio, panel.querySelector('.bja-in'))
    studio.addEventListener('click', function (e) {
      var b = e.target.closest('[data-st]')
      if (b) studioAction(b.getAttribute('data-st'), b)
    })
    studio.addEventListener('change', function (e) {
      if (e.target.matches('[data-st="project"]')) {
        loadStudio().current = e.target.value; art.tag = ''; saveStudio(); paintStudio()
      }
      if (e.target.matches('[data-st-restore]')) studioRestore(e.target.files && e.target.files[0])
    })
    /* 搜索是「边打边筛」：只重画产出物那一块，不整块重建折叠区，
       避免输入框每敲一个字就失焦，也避免天气/地图 iframe 被反复重载。 */
    studio.addEventListener('input', function (e) {
      if (e.target.matches('[data-st="artQ"]')) {
        art.q = e.target.value
        repaintArt()
        var box = studio.querySelector('[data-st="artQ"]')
        if (box) { box.focus(); try { box.setSelectionRange(box.value.length, box.value.length) } catch (er) {} }
      }
      /* 留言草稿记下来，重绘折叠区时不丢已打的字 */
      if (e.target.matches('[data-st="postInput"]')) cloudUI.draft = e.target.value
    })
    return studio
  }

  /* 唯一的模式切换：展开 = 把藏在对话里的工具摊开；收起 = 回到纯对话。
     两种状态共用同一个 panel、同一段 log、同一个输入框、同一个页面。 */
  function setStudioMode(on) {
    var want = typeof on === 'boolean' ? on : !studioMode
    studioMode = want
    if (want) mountStudio()
    if (studio) {
      studio.classList.toggle('on', want)
      studio.setAttribute('aria-hidden', want ? 'false' : 'true')
      if (want) paintStudio()
    }
    panel.classList.toggle('m-studio', want)
    if (backBtn) {
      backBtn.setAttribute('aria-pressed', want ? 'true' : 'false')
      backBtn.title = want ? '收起工具 · 回到纯对话' : '展开工具 · 工作室 / 设置 / 生活工具都收在这里'
      backBtn.setAttribute('aria-label', want ? '收起工具折叠区' : '展开工具折叠区')
    }
    var badge = ctop && ctop.querySelector('[data-ct-mode]')
    if (badge) badge.hidden = !want
    if (want) {
      toggleSheet(false); toggleCset(false); setView('chat')
      /* 展开即用真实定位取当地天气，只跑一次；用户可手动再点「重新定位」 */
      if (!life.wxAuto && !life.wxBusy) setTimeout(wxLocate, 60)
      /* 云能力按需加载：只有展开三角才去拉 SDK，其余页面不碰外部域名 */
      setTimeout(function () { loadCloud(); loadPosts() }, 80)
    }
    setTimeout(function () { try { placePanel() } catch (e) {} }, 30)
  }
  function openStudio() { setStudioMode(true) }
  function closeStudio() { setStudioMode(false) }

  /* ---------------- 顺手查 · 天气 / 日历 / 地图 ----------------
     2026-11-12：首页「白驹工作区」下线后，这三个生活工具整体搬进
     悬浮窗的三角折叠区，不再另开页面、不再有第二套 AI 工具区。
     天气以浏览器真实定位为首选：展开即取经纬度查当地实况，
     定位被拒或不可用才降级为手动输入城市。 */
  var WX_CODE = { 0:'晴',1:'大致晴朗',2:'局部多云',3:'阴',45:'雾',48:'雾凇',51:'毛毛雨',53:'小雨',55:'中雨',61:'小雨',63:'中雨',65:'大雨',71:'小雪',73:'中雪',75:'大雪',80:'阵雨',81:'强阵雨',95:'雷阵雨',96:'雷暴伴冰雹' }
  var life = {
    tab: 'wx',
    wxText: '', wxAuto: false, wxBusy: false,
    calY: 0, calM: 0, calD: 0,
    mapSrc: '', mapCap: ''
  }
  var CAL_KEY = 'baiju.cal.v1'
  function calEvents() {
    try { return JSON.parse(localStorage.getItem(CAL_KEY) || '{}') } catch (e) { return {} }
  }
  function calSave(o) { try { localStorage.setItem(CAL_KEY, JSON.stringify(o)) } catch (e) {} }
  function calStamp(y, m, d) { return y + '-' + (m + 1) + '-' + d }
  function ensureCal() {
    var d = new Date()
    if (!life.calY) { life.calY = d.getFullYear(); life.calM = d.getMonth(); life.calD = d.getDate() }
  }
  function calHtml() {
    ensureCal()
    var y = life.calY, m = life.calM, d = new Date()
    var first = new Date(y, m, 1).getDay()
    var days = new Date(y, m + 1, 0).getDate()
    var ev = calEvents()
    var h = '<div class="lf-calbar"><button type="button" data-st="calPrev">‹</button>' +
            '<b>' + y + ' 年 ' + (m + 1) + ' 月</b>' +
            '<button type="button" data-st="calNext">›</button></div>' +
            '<div class="lf-calgrid">' + '日一二三四五六'.split('').map(function (x) {
              return '<span class="lf-wk">' + x + '</span>'
            }).join('')
    for (var i = 0; i < first; i++) h += '<span></span>'
    for (var j = 1; j <= days; j++) {
      var k = calStamp(y, m, j)
      var isToday = (j === d.getDate() && y === d.getFullYear() && m === d.getMonth())
      var isSel = (j === life.calD)
      var hasEv = !!ev[k]
      h += '<span class="lf-day' + (isToday ? ' today' : '') + (isSel ? ' sel' : '') + (hasEv ? ' ev' : '') +
           '" data-st="calPick" data-d="' + j + '">' + j + '</span>'
    }
    h += '</div>'
    var selKey = calStamp(y, m, life.calD)
    h += '<div class="lf-calnote"><b>' + (m + 1) + ' 月 ' + life.calD + ' 日</b> · ' +
         (ev[selKey] ? esc(ev[selKey]) : '暂无记事') + '</div>' +
         '<div class="lf-row"><input type="text" data-st="calInput" placeholder="给这天记一笔…" value="' + esc(ev[selKey] || '') + '">' +
         '<button type="button" data-st="calAdd">记下</button></div>'
    return h
  }
  function paintLifeHtml() {
    var tabs = [['wx', '天气'], ['cal', '日历'], ['map', '地图']]
    var h = '<div class="st-grp st-life"><div class="st-t">顺手查 <em>免 Key · 都在这一个窗口里</em></div>' +
      '<div class="lf-tabs">' + tabs.map(function (t) {
        return '<button type="button" data-st="lifeTab" data-i="' + t[0] + '"' +
               (life.tab === t[0] ? ' class="cur"' : '') + '>' + t[1] + '</button>'
      }).join('') + '</div>'

    /* 天气：默认自动真实定位，失败才让用户填城市 */
    h += '<div class="lf-pane" data-life="wx"' + (life.tab === 'wx' ? '' : ' hidden') + '>' +
      '<div class="lf-wx">' + (life.wxText || '<span class="lf-dim">正在定位，取你所在城市的实时天气…</span>') + '</div>' +
      '<div class="lf-row"><button type="button" data-st="wxLocate">重新定位</button>' +
      '<input type="text" data-st="wxCity" placeholder="或输入城市（如 北京）">' +
      '<button type="button" data-st="wxGo">查询</button></div></div>'

    h += '<div class="lf-pane" data-life="cal"' + (life.tab === 'cal' ? '' : ' hidden') + '>' + calHtml() + '</div>'

    h += '<div class="lf-pane" data-life="map"' + (life.tab === 'map' ? '' : ' hidden') + '>' +
      '<div class="lf-mapcap">' + (life.mapCap || '默认视图（杭州）· 输入地点查询') + '</div>' +
      '<iframe class="lf-map" title="OpenStreetMap 地图" loading="lazy" ' +
      'src="' + esc(life.mapSrc || defaultMapSrc()) + '"></iframe>' +
      '<div class="lf-row"><input type="text" data-st="mapQ" placeholder="查地点，如 西湖 / 天安门">' +
      '<button type="button" data-st="mapGo">查找</button>' +
      '<button type="button" data-st="mapReset">默认</button></div></div>'

    h += '</div>'
    return h
  }
  function defaultMapSrc() {
    return 'https://www.openstreetmap.org/export/embed.html?bbox=118.9%2C29.9%2C121.5%2C31.2&layer=mapnik&marker=30.25%2C120.16'
  }
  function updateLife() {
    if (!studio) return
    var host = studio.querySelector('[data-life-host]')
    if (!host) return
    host.innerHTML = paintLifeHtml()
  }
  function setWx(text) { life.wxText = text; updateLife() }
  function wxQuery(city, lat, lon) {
    life.wxBusy = true
    setWx('<span class="lf-dim">正在查天气…</span>')
    var geo = lat != null
      ? Promise.resolve({ results: [{ latitude: lat, longitude: lon, name: city || '我的位置', country: '' }] })
      : fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(city) + '&language=zh&count=1').then(function (r) { return r.json() })
    geo.then(function (gj) {
      if (!gj.results || !gj.results.length) throw new Error('未找到这个城市')
      var g = gj.results[0]
      return fetch('https://api.open-meteo.com/v1/forecast?latitude=' + g.latitude + '&longitude=' + g.longitude +
        '&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m' +
        '&daily=temperature_2m_max,temperature_2m_min&timezone=auto').then(function (r) { return r.json() }).then(function (wj) {
          return { g: g, wj: wj }
        })
    }).then(function (o) {
      var c = o.wj.current, t = o.wj.daily, code = WX_CODE[c.weather_code] || '未知'
      var hi = t && t.temperature_2m_max ? Math.round(t.temperature_2m_max[0]) : '—'
      var lo = t && t.temperature_2m_min ? Math.round(t.temperature_2m_min[0]) : '—'
      setWx('<b class="lf-temp">' + Math.round(c.temperature_2m) + '°</b> ' + code + ' · ' + esc(o.g.name) +
        '<div class="lf-dim">最高 ' + hi + '° / 最低 ' + lo + '° · 湿度 ' + Math.round(c.relative_humidity_2m) +
        '% · 风速 ' + Math.round(c.wind_speed_10m) + ' m/s' + (lat != null ? ' · 已按真实定位' : '') + '</div>')
      life.wxBusy = false
    }).catch(function (e) {
      life.wxBusy = false
      setWx('<span class="lf-dim">' + esc(e.message || '天气查询失败') + '，可手动输入城市重试（需联网）。</span>')
    })
  }
  /* 真实定位：展开工具时自动跑一次，用户拒绝/不可用才退回城市输入 */
  function wxLocate() {
    life.wxAuto = true
    if (!navigator.geolocation) { setWx('<span class="lf-dim">此浏览器不支持定位，请在上方输入城市查询。</span>'); return }
    setWx('<span class="lf-dim">正在获取你的真实位置…</span>')
    navigator.geolocation.getCurrentPosition(function (p) {
      wxQuery('我的位置', p.coords.latitude, p.coords.longitude)
    }, function () {
      setWx('<span class="lf-dim">定位未获授权。可在上方输入城市查询，或点「重新定位」再试。</span>')
    }, { timeout: 9000, maximumAge: 300000 })
  }

  function paintStudio() {
    if (!studio) return
    var s = loadStudio(), p = curProject()
    var arts = s.artifacts.filter(inProject), cards = s.assets.filter(inProject)
    var h =
      '<div class="st-hd"><span class="st-mk">' + MARK('sm') + '</span>' +
      '<span><b>工具</b><em>还是这一页 · 对话就在上面 · 再点左上角三角收起</em></span>' +
      '<button type="button" data-st="close" aria-label="收起工具，回到纯对话">' + IC.close + '</button></div>' +
      '<div class="st-bd">' +
      '<div class="st-row st-settings"><button type="button" data-st="settings">打开设置 · 语音 / 朗读 / 主题 / 模型连接</button></div>' +
      '<div data-cloud-host-wrap>' + cloudHtml() + '</div>' +
      '<div data-life-host>' + paintLifeHtml() + '</div>' +
      '<div data-art-host>' + artHtml() + '</div>' +
      '<div class="st-grp"><div class="st-t">当前课题 <em>' + s.projects.length + ' 个</em></div>' +
      '<select data-st="project" aria-label="切换课题">' + s.projects.map(function (x) {
        return '<option value="' + esc(x.id) + '"' + (x.id === s.current ? ' selected' : '') + '>' + esc(x.name) + '</option>'
      }).join('') + '</select>' +
      '<div class="st-row"><button type="button" data-st="newp">新建课题</button>' +
      '<button type="button" data-st="saveinst">保存项目指令</button></div>' +
      '<textarea data-st="instruction" rows="2" placeholder="这个课题的固定要求：角色、语气、输出格式…（每次对话自动带上）">' + esc(p.instruction || '') + '</textarea>' +
      '<div class="st-mini">素材 ' + cards.length + ' 条 · 产出物 ' + arts.length + ' 版' +
      (attachments.length ? ' · 本轮文件 ' + attachments.length + ' 份' : '') + '</div></div>' +

      '<div class="st-grp"><div class="st-t">工具 <em>点一下就填进输入框</em></div>' +
      '<div class="st-tpl">' + s.templates.map(function (t, i) {
        return '<button type="button" data-st="tpl" data-i="' + i + '">' + esc(t.n) + '</button>'
      }).join('') + '</div>' +
      '<div class="st-row"><button type="button" data-st="clip">把最后一条回答存为摘录</button></div>' +
      (cards.length ? '<div class="st-list">' + cards.slice(-4).reverse().map(function (c) {
        return '<div class="st-li"><b>' + esc(c.title || '摘录') + '</b><span>' + esc(String(c.text || '').slice(0, 70)) + '</span></div>'
      }).join('') + '</div>' : '') +
      '</div>' +

      '<div class="st-grp"><div class="st-t">输出</div>' +
      '<div class="st-row">' +
      '<button type="button" data-st="portfolio">导出作品集 HTML</button>' +
      '<button type="button" data-st="backup">备份 JSON</button>' +
      '</div>' +
      '<label class="st-restore">导入备份<input type="file" accept="application/json,.json" data-st-restore hidden></label>' +
      '<p class="st-note">浏览器会清理本地数据，重要材料请顺手备份。想跨设备恢复，可在上方「云端 · 可选」里登录后开启云同步；不登录则全部留在本机。</p>' +
      '</div>' +

      '<div class="st-grp"><div class="st-t">能力边界 <em>哪些是本站自带 · 哪些要外部服务</em></div>' +
      '<div class="st-bound">' +
      '<p><b>不联网也能用</b>：对话里的计算 / 表格 / 整理 / 四格分析、站内资料检索、模板、工件改名搜索标签、作品集导出、编译模式（HTML/JS/Python 在浏览器本地真跑）、日历记事与备份导入导出。</p>' +
      '<p><b>要模型在线</b>：开放问答、翻译、逐句改写、长文润色。默认连服务端 <code>spark-x2.6</code> 流式回答；没连上时不假装有模型，会直接告诉你，并让你在「设置 → 模型连接」填自己的地址与 Key（只存本机）。</p>' +
      '<p><b>要外部服务</b>：天气取 Open-Meteo（真实定位经纬度）、地图取 OpenStreetMap / Nominatim；两者失败会明确提示，不静默假装成功。生图 / 生视频若接入外部额度，会在按钮上单独标注，不并入「免费」。</p>' +
      '<p class="st-bound-f">本站所有资讯、仓库、教程都带原始出处；模型回答不冒充出处。看到「带出处」的内容，请点回原页核对。</p>' +
      '</div></div>' +
      /* 完整页直达可选、默认收着：工作室本体全部在这一个对话页里完成 */
      '<div class="st-grp"><div class="st-t">可选 · 完整页直达 <em>功能不减 · 新标签</em></div>' +
      '<details class="st-more"><summary>展开 5 个站内工具页</summary>' +
      '<div class="st-go">' + TOOL_HUB.map(function (t) {
        return '<a href="' + t.u + '" target="_blank" rel="noopener"><b>' + esc(t.n) + '</b><em>' + esc(t.d) + '</em></a>'
      }).join('') + '</div></details></div>' +
      '</div></div>'
    studio.innerHTML = h
  }

  function studioAction(k, btn) {
    var s = loadStudio(), p = curProject()
    if (k === 'close') { closeStudio(); return }
    if (k === 'settings') { toggleSheet(true); return }
    /* ---- 产出物管理：重命名 / 搜索 / 标签 / 查看 / 回填 / 删除 ---- */
    if (k === 'artQClear') { art.q = ''; repaintArt(); return }
    if (k === 'artTag') { art.tag = btn.getAttribute('data-t') || ''; repaintArt(); return }
    if (k === 'artView') {
      var av = artById(btn.getAttribute('data-id'))
      if (!av) return
      closeStudio(); addMsg('a', '**' + artTitle(av) + '**\n\n' + String(av.text || '（空白）')); scroll(); return
    }
    if (k === 'artRename') {
      var ar = artById(btn.getAttribute('data-id'))
      if (!ar) return
      var nn = (window.prompt('给这份产出物起个名字', artTitle(ar)) || '').trim()
      if (!nn) return
      ar.title = nn.slice(0, 40); ar.sample = false
      saveStudio(); repaintArt(); tip('已改名'); return
    }
    if (k === 'artTagEdit') {
      var at = artById(btn.getAttribute('data-id'))
      if (!at) return
      var tv = (window.prompt('标签用逗号分开（例：文案,小红书,已定稿）', (at.tags || []).join(',')) || '').trim()
      at.tags = tv ? tv.split(/[,，\s]+/).filter(Boolean).slice(0, 6).map(function (x) { return x.slice(0, 12) }) : []
      at.sample = false
      saveStudio(); repaintArt(); tip('标签已更新'); return
    }
    if (k === 'artToChat') {
      var ac = artById(btn.getAttribute('data-id'))
      if (!ac) return
      input.value = '接着改这份《' + artTitle(ac) + '》：\n' + String(ac.text || '').slice(0, 1200)
      closeStudio(); setView('chat'); input.focus(); tip('已回填到输入框，接着说要改什么'); return
    }
    if (k === 'artDel') {
      var ad = artById(btn.getAttribute('data-id'))
      if (!ad) return
      if (!window.confirm('删除《' + artTitle(ad) + '》？此操作不可撤销。')) return
      s.artifacts = s.artifacts.filter(function (x) { return String(x.id) !== String(ad.id) })
      saveStudio(); repaintArt(); tip('已删除'); return
    }
    /* ---- 云端（可选）· 全部收在同一个三角折叠里 ---- */
    if (k === 'cloudSync') {
      var api1 = cc()
      if (!api1) { cloudUI.msg = '云组件还没就绪，稍等两秒再点一次。'; paintCloud(); return }
      cloudUI.msg = '正在同步…'; paintCloud()
      api1.pullPrefs().then(function () { cloudUI.msg = '已发起同步；状态见上方。'; paintCloud() })
      return
    }
    if (k === 'cloudFav') {
      var pid = cloudThread()
      var fav = window.CCOWork && window.CCOWork.fav
      if (!fav) { cloudUI.msg = '收藏组件未就绪，本机功能不受影响。'; paintCloud(); return }
      var added = fav.toggle(pid)
      cloudUI.msg = added ? '已收藏本页（' + pid + '）' : '已取消收藏本页'
      paintCloud(); return
    }
    if (k === 'cloudRead') {
      var apiR = cc()
      if (!apiR) { cloudUI.msg = '云组件还没就绪，稍等两秒再点一次。'; paintCloud(); return }
      var was = apiR.isRead(cloudThread())
      apiR.markRead(cloudThread(), !was)
      cloudUI.msg = was ? '已取消本页已读标记' : '已把本页标为已读'
      paintCloud(); return
    }
    if (k === 'cloudShare') {
      var apiS = cc()
      if (!apiS) { cloudUI.msg = '云组件还没就绪，稍等两秒再点一次。'; paintCloud(); return }
      apiS.createShare('page', document.title || cloudThread(), { path: cloudThread() }).then(function (r) {
        if (r.error) { cloudUI.msg = '分享失败：' + (r.error.message || '请先登录'); paintCloud(); return }
        var link = r.data.url
        cloudUI.msg = '分享链接已生成（可复制给朋友）：' + link
        try { navigator.clipboard.writeText(link) } catch (e) {}
        paintCloud()
      })
      return
    }
    if (k === 'postSend') {
      var apiP = cc()
      if (!apiP) { cloudUI.msg = '云组件还没就绪，稍等两秒再点一次。'; paintCloud(); return }
      var pi = studio.querySelector('[data-st="postInput"]')
      var body = pi ? pi.value.trim() : ''
      if (!body) { cloudUI.msg = '先写一句再发表。'; paintCloud(); return }
      if (cloudUI.busy) return
      cloudUI.busy = true
      apiP.addPost('comment', body).then(function (r) {
        cloudUI.busy = false
        if (r.error) { cloudUI.msg = '发表失败：' + (r.error.message || '请先登录'); paintCloud(); return }
        cloudUI.msg = '已发表。'; cloudUI.draft = ''
        loadPosts()
      })
      return
    }
    if (k === 'postLike') {
      var apiL = cc()
      if (!apiL) { cloudUI.msg = '云组件还没就绪，稍等两秒再点一次。'; paintCloud(); return }
      if (cloudUI.busy) return
      cloudUI.busy = true
      apiL.addPost('like', '觉得这页有用').then(function (r) {
        cloudUI.busy = false
        if (r.error) { cloudUI.msg = '点赞失败：' + (r.error.message || '请先登录'); paintCloud(); return }
        cloudUI.msg = '已点赞，谢谢。'; loadPosts()
      })
      return
    }
    if (k === 'postDel') {
      var apiD = cc()
      if (!apiD) return
      apiD.delPost(btn.getAttribute('data-id')).then(function (r) {
        if (r.error) { cloudUI.msg = r.error.message; paintCloud() }
        else loadPosts()
      })
      return
    }
    /* ---- 顺手查：天气 / 日历 / 地图 ---- */
    if (k === 'lifeTab') { life.tab = btn.getAttribute('data-i'); updateLife(); return }
    if (k === 'wxLocate') { wxLocate(); return }
    if (k === 'wxGo') {
      var city = (studio.querySelector('[data-st="wxCity"]') || {}).value || ''
      if (!city.trim()) { setWx('<span class="lf-dim">先输入城市名，或点「重新定位」。</span>'); return }
      wxQuery(city.trim()); return
    }
    if (k === 'calPrev' || k === 'calNext') {
      ensureCal()
      life.calM += (k === 'calNext' ? 1 : -1)
      if (life.calM < 0) { life.calM = 11; life.calY-- }
      if (life.calM > 11) { life.calM = 0; life.calY++ }
      life.calD = 1; updateLife(); return
    }
    if (k === 'calPick') { life.calD = parseInt(btn.getAttribute('data-d'), 10) || 1; updateLife(); return }
    if (k === 'calAdd') {
      ensureCal()
      var inp = studio.querySelector('[data-st="calInput"]')
      var v = inp ? inp.value.trim() : ''
      var o = calEvents(), key = calStamp(life.calY, life.calM, life.calD)
      if (v) o[key] = v.slice(0, 120); else delete o[key]
      calSave(o); updateLife(); tip(v ? '已记下' : '已清除记事'); return
    }
    if (k === 'mapGo') {
      var q = (studio.querySelector('[data-st="mapQ"]') || {}).value || ''
      if (!q.trim()) return
      life.mapCap = '查找 ' + q + ' …'; updateLife()
      fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(q.trim()))
        .then(function (r) { return r.json() }).then(function (list) {
          if (list && list.length) {
            var la = parseFloat(list[0].lat), lo = parseFloat(list[0].lon)
            life.mapSrc = 'https://www.openstreetmap.org/export/embed.html?bbox=' + (lo - .02) + '%2C' +
              (la - .012) + '%2C' + (lo + .02) + '%2C' + (la + .012) + '&layer=mapnik&marker=' + la + '%2C' + lo
            life.mapCap = q
          } else { life.mapSrc = defaultMapSrc(); life.mapCap = '未找到「' + q + '」，已回到默认视图' }
          updateLife()
        }).catch(function () {
          life.mapSrc = defaultMapSrc(); life.mapCap = '联网失败，已回到默认视图'; updateLife()
        })
      return
    }
    if (k === 'mapReset') { life.mapSrc = defaultMapSrc(); life.mapCap = '默认视图（杭州）'; updateLife(); return }
    if (k === 'newp') {
      var n = (window.prompt('新课题叫什么？', '新课题') || '').trim()
      if (!n) return
      var id = 'p' + Date.now()
      s.projects.push({ id: id, name: n.slice(0, 24), instruction: '', created: Date.now() })
      s.current = id; saveStudio(); paintStudio(); return
    }
    if (k === 'saveinst') {
      var ta = studio.querySelector('[data-st="instruction"]')
      p.instruction = ta ? ta.value.slice(0, 800) : ''
      saveStudio(); tip('项目指令已存，之后每轮都会带上'); return
    }
    if (k === 'tpl') {
      var t = s.templates[parseInt(btn.getAttribute('data-i'), 10)]
      if (!t) return
      input.value = t.q
      closeStudio(); setView('chat'); input.focus()
      tip('模板已填入，把 {{…}} 换成你的内容'); return
    }
    if (k === 'clip') {
      var last = lastAnswer()
      if (!last) { tip('还没有回答可存'); return }
      s.assets.push({ id: Date.now(), projectId: s.current, title: '摘录 · ' + stamp(), text: last.slice(0, 2000) })
      saveStudio(); paintStudio(); tip('已存进当前课题'); return
    }
    if (k === 'snap') {
      var a = lastAnswer()
      if (!a) { tip('还没有回答可存'); return }
      /* 用回答首行当默认标题，用户可在列表里改名、打标签 */
      var first = String(a).replace(/^\s*[#*\s]+/, '').split(/\r?\n/)[0].trim().slice(0, 34)
      s.artifacts.push({
        id: Date.now(), projectId: s.current, ts: Date.now(),
        title: first || ('产出物 · ' + stamp()), tags: [], text: a.slice(0, 8000)
      })
      saveStudio(); repaintArt(); tip('存了一版，可在上面改名 / 打标签 / 对比'); return
    }
    if (k === 'diff') {
      var ar = s.artifacts.filter(inProject).slice(-2)
      if (ar.length < 2) { tip('先存两版'); return }
      var A = ar[0].text.split(/\r?\n/), B = ar[1].text.split(/\r?\n/)
      var setA = {}, setB = {}
      A.forEach(function (l) { if (l.trim()) setA[l.trim()] = 1 })
      B.forEach(function (l) { if (l.trim()) setB[l.trim()] = 1 })
      var add = B.filter(function (l) { return l.trim() && !setA[l.trim()] }).slice(0, 8)
      var del = A.filter(function (l) { return l.trim() && !setB[l.trim()] }).slice(0, 8)
      var out = '**产出物版本对比**\n\n新增 ' + add.length + ' 行、移除 ' + del.length + ' 行（最多列 8 条）\n\n'
      if (add.length) out += '**＋ 后来加的**\n' + add.map(function (l) { return '- ' + l }).join('\n') + '\n\n'
      if (del.length) out += '**－ 后来去掉的**\n' + del.map(function (l) { return '- ' + l }).join('\n') + '\n\n'
      if (!add.length && !del.length) out += '两版内容一致。\n'
      closeStudio(); addMsg('a', out); scroll(); return
    }
    if (k === 'portfolio') {
      var items = s.artifacts.filter(inProject), notes = s.assets.filter(inProject)
      if (!items.length && !notes.length) { tip('先存一点摘录或产出物'); return }
      var html = '<!doctype html><meta charset="utf-8"><title>' + esc(p.name) + ' · 作品集</title>' +
        '<style>body{max-width:760px;margin:40px auto;padding:0 20px;font:15px/1.8 "PingFang SC","Microsoft YaHei",system-ui;color:#1e293b}' +
        'h1{border-bottom:2px solid #4f8cff;padding-bottom:10px}h2{margin-top:32px;color:#1d4ed8;font-size:17px}' +
        'article{border:1px solid #e2e8f0;border-radius:12px;padding:14px 18px;margin:12px 0;white-space:pre-wrap}' +
        'small{color:#94a3b8}</style><h1>' + esc(p.name) + ' · 作品集</h1>' +
        '<p><small>白驹 ccowork 工作室 · ' + esc(new Date().toLocaleString('zh-CN')) + '</small></p>'
      if (items.length) html += '<h2>产出物（' + items.length + ' 版）</h2>' + items.map(function (x) {
        return '<article><b>' + esc(artTitle(x)) + '</b>' +
          (x.tags && x.tags.length ? '<small> · ' + esc(x.tags.join(' / ')) + '</small>' : '') +
          '\n' + esc(x.text) + '</article>'
      }).join('')
      if (notes.length) html += '<h2>摘录与学习卡（' + notes.length + ' 条）</h2>' + notes.map(function (x) {
        return '<article><b>' + esc(x.title) + '</b>\n' + esc(x.text) + '</article>'
      }).join('')
      dl(esc(p.name) + '-作品集.html', html, 'text/html')
      tip('作品集已导出，双击就能打开'); return
    }
    if (k === 'backup') { dl('白驹工作室-备份.json', JSON.stringify(s, null, 2), 'application/json'); tip('备份已下载'); return }
  }
  function studioRestore(f) {
    if (!f) return
    var fr = new FileReader()
    fr.onload = function () {
      try {
        var j = JSON.parse(String(fr.result))
        if (!j || !Array.isArray(j.projects)) throw new Error('格式不对')
        st = j; saveStudio(); paintStudio(); tip('备份已恢复')
      } catch (e) { tip('这份 JSON 不是工作室备份') }
    }
    fr.readAsText(f, 'utf-8')
  }

  /* ---------- 附件条 / 记忆状态 / 可选模型连接 ---------- */
  function addAttach(files) {
    attachFiles(files, function (n) {
      paintAtt()
      if (n) { setView('chat'); tip('已收进 ' + n + ' 份文件 · 可以直接问里面的内容') }
    })
  }
  function paintAtt() {
    if (!attBar) return
    if (!attachments.length) { attBar.hidden = true; attBar.innerHTML = ''; return }
    attBar.hidden = false
    attBar.innerHTML = '<span class="at-lb">本轮材料</span>' +
      attachments.map(function (a, i) {
        return '<span class="at-i" title="' + esc(a.note || (a.text ? a.text.length + ' 字' : '')) + '">' +
          (a.text ? '' : '· ') + esc(a.name) +
          '<button type="button" data-att-x="' + i + '" aria-label="移除">×</button></span>'
      }).join('') +
      '<select class="at-fmt" data-att-fmt aria-label="导出格式" style="max-width:82px;font-size:11px;border:1px solid var(--line,#e2e8f0);border-radius:8px;background:transparent;color:inherit;padding:2px 4px">' +
      '<option value="md">.md</option><option value="txt">.txt</option><option value="csv">.csv</option>' +
      '<option value="json">.json</option><option value="html">.html</option><option value="docx">.docx</option>' +
      '<option value="pdf">.pdf</option></select>' +
      '<button type="button" class="at-clr" data-att-export>导出材料</button>' +
      '<button type="button" class="at-clr" data-att-clear>清空</button>'
  }
  function paintMem() {
    var box = sheet && sheet.querySelector('[data-sh-mem]')
    if (!box) return
    loadMem()
    var tp = topTopics(2)
    box.innerHTML = '<div class="mm-l"><b>同行 ' + mem.turns + ' 轮 · ' + stage() + '</b>' +
      (mem.name ? ' · ' + esc(mem.name) : '') + '</div>' +
      '<div class="mm-s">' + (tp.length ? '常聊 ' + tp.map(esc).join(' / ') : '还没记住常聊方向') +
      (mem.likes.length ? ' · 偏好 ' + mem.likes.slice(-2).map(esc).join('、') : '') + '</div>'
  }
  function studioInstruction() {
    var p = curProject()
    return p && p.instruction ? '\n\n【当前课题「' + p.name + '」的固定要求】\n' + p.instruction : ''
  }
  /* 可选 BYOK：只在用户主动填写、且站点转发失败时试一次。
     边界写死：官方接口会被浏览器 CORS 拦，Key 只留本机，失败一律回落本地能力。 */
  function byokStream(msgs, cfg, t, ok, bad) {
    var c = null
    try { c = typeof AbortController !== 'undefined' ? new AbortController() : null } catch (e) {}
    ctrl = c
    var timer = setTimeout(function () { try { if (c) c.abort() } catch (e) {} }, 30000)
    fetch(cfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.key },
      body: JSON.stringify({ model: cfg.model || 'deepseek-chat', messages: msgs, stream: true, max_tokens: 1200 }),
      signal: c ? c.signal : undefined
    }).then(function (res) {
      clearTimeout(timer)
      if (!res.ok) return res.text().then(function () {
        throw new Error('接口 ' + res.status + ' · 常见原因是浏览器跨域或 Key 无效')
      })
      var reader = res.body.getReader(), dec = new TextDecoder(), buf = ''
      function pump() {
        return reader.read().then(function (r) {
          if (r.done) { ok(); return }
          buf += dec.decode(r.value, { stream: true })
          var i
          while ((i = buf.indexOf('\n')) >= 0) {
            var line = buf.slice(0, i).trim(); buf = buf.slice(i + 1)
            if (line.indexOf('data:') !== 0) continue
            var d = line.slice(5).trim()
            if (d === '[DONE]') { ok(); return }
            try {
              var j = JSON.parse(d)
              var c2 = j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content
              if (c2) t.push(c2)
            } catch (e) {}
          }
          return pump()
        })
      }
      return pump()
    }).catch(function (err) { clearTimeout(timer); bad(err) })
  }
  var BYOK_KEY = 'baiju.byok.v1'
  function loadByok() { try { return JSON.parse(localStorage.getItem(BYOK_KEY) || '{}') } catch (e) { return {} } }
  function byokAction(k) {
    if (k === 'off') {
      try { localStorage.removeItem(BYOK_KEY) } catch (e) {}
      sheet.querySelectorAll('[data-byok]').forEach(function (i) { if (i.tagName === 'INPUT') i.value = '' })
      tip('模型连接已关闭并清除'); return
    }
    if (k === 'save') {
      var u = (sheet.querySelector('[data-byok="url"]') || {}).value || ''
      var key = (sheet.querySelector('[data-byok="key"]') || {}).value || ''
      var model = (sheet.querySelector('[data-byok="model"]') || {}).value || ''
      if (!/^https:\/\//.test(u.trim()) || !key.trim()) { tip('接口地址要 https 开头，Key 不能为空'); return }
      try { localStorage.setItem(BYOK_KEY, JSON.stringify({ url: u.trim(), key: key.trim(), model: model.trim() || 'deepseek-chat' })) } catch (e) {}
      tip('已存到本机。下次提问若站点转发不可用，会试一次你的接口'); return
    }
  }

  /* ---------------- 首屏问候 ---------------- */
  function greet() {
    var c = ctxFor(location.pathname)
    loadMem()
    var d = el('div', 'bja-hello')
    var hi = mem.turns > 2
      ? '<b>' + (mem.name ? esc(mem.name) + '，' : '') + '又见面了。</b>已经同行 ' + mem.turns + ' 轮 · ' + stage() + '。'
      : '<b>我是白驹。</b>'
    d.innerHTML = hi +
      (pref.guide ? esc(c.tip) : '可以问站内内容，也可以问 AI 本身。') +
      '<br>拖文件进来就能问文档；算式、表格、整理、导出都在这台设备上跑，记住的偏好也只留本机。' +
      '<br>需要翻译或逐句改写，去「设置 → 模型连接」按需接模型；左上角小图标切换工作室模式，工具就在这一页的对话里。'
    log.appendChild(d)
    if (history.length) {
      history.forEach(function (m) {
        addMsg(m.role === 'user' ? 'u' : 'a', m.content, true)
      })
      scroll()
    }
  }

  function paintChips() {
    var c = ctxFor(location.pathname)
    if (chipsBox.getAttribute('data-for') === location.pathname) return
    chipsBox.setAttribute('data-for', location.pathname)
    chipsBox.innerHTML = ''
    c.chips.forEach(function (t) {
      var b = el('button', null, t)
      b.type = 'button'
      chipsBox.appendChild(b)
    })
  }

  /* ---------------- 可用性 ---------------- */
  /* 8s 超时 + 一次重试：静态托管/弱网下 /api/health 可能被浏览器连接池
     长时间挂起（实测 Chromium 对本地 1.1 连接有竞态），不设超时会让
     状态灯永远停在「检测中」，也会卡住 networkidle 类验收。 */
  function healthFetch(signal) {
    return fetch('/api/health', { method: 'GET', cache: 'no-store', signal: signal })
  }
  function checkOnline() {
    if (online !== null) return
    var ctrl = (typeof AbortController === 'function') ? new AbortController() : null
    var timer = ctrl && setTimeout(function () { try { ctrl.abort() } catch (e) {} }, 8000)
    var retried = false
    var attempt = function (r) {
      /* 无论成败都读完 body，避免未消费的响应体把请求永远挂在“加载中” */
      return r.text().then(function (t) {
        if (!r.ok) return null
        try { return JSON.parse(t) } catch (e) { return null }
      })
    }
    var land = function (j) {
      if (timer) clearTimeout(timer)
      online = !!(j && j.ai)
      dotEl.classList.toggle('off', !online)
      /* 模型名以服务端为准，不在前端写死 */
      if (j && j.model) {
        if (ctModel) ctModel.textContent = j.model
        var sm = cset && cset.querySelector('[data-cs-models]')
        if (sm) sm.textContent = j.model
      }
      footEl.querySelector('.st').innerHTML = online
        ? '在线 · 流式'
        : '<span class="off">离线可用 · 本地能力已就绪</span>'
    }
    var fail = function () {
      if (!retried) {
        /* 超时/断链先重试一次，新连接通常能直接成功 */
        retried = true
        if (timer) clearTimeout(timer)
        ctrl = (typeof AbortController === 'function') ? new AbortController() : null
        timer = ctrl && setTimeout(function () { try { ctrl.abort() } catch (e) {} }, 8000)
        return healthFetch(ctrl && ctrl.signal).then(attempt).then(land).catch(fail)
      }
      if (timer) clearTimeout(timer)
      online = false
      dotEl.classList.add('off')
      footEl.querySelector('.st').innerHTML = '<span class="off">未连接服务 · 对话不可用</span>'
    }
    healthFetch(ctrl && ctrl.signal).then(attempt).then(land).catch(fail)
  }

  function tip(t) {
    footEl.querySelector('.st').innerHTML = esc(t)
    setTimeout(checkOnlineFresh, 1600)
  }
  function checkOnlineFresh() {
    online = null
    checkOnline()
  }

  /* ---------------- 消息 ---------------- */
  function addMsg(role, text, silent) {
    var wrap = el('div', 'bja-m ' + role)
    wrap.appendChild(el('div', 'av', role === 'u' ? '你' : '驹'))
    var body = el('div', 'bd')
    body.innerHTML = fmt(text)
    wrap.appendChild(body)
    if (role === 'a') {
      var ops = el('div', 'ops')
      var sp = el('button', null, '朗读')
      sp.type = 'button'
      sp.addEventListener('click', function () { speak(text) })
      ops.appendChild(sp)
      var cp = el('button', null, '复制')
      cp.type = 'button'
      cp.addEventListener('click', function () {
        try { navigator.clipboard.writeText(text); cp.textContent = '已复制' } catch (e) {}
      })
      ops.appendChild(cp)
      body.appendChild(ops)
    }
    log.appendChild(wrap)
    if (!silent) scroll(true)
    return { wrap: wrap, body: body }
  }

  /* 只在用户本来就贴着底部时跟随；上滚读旧内容时不抢滚动。
     force=true 用于「用户自己刚发了一条新消息」，这时必须滚到最新。 */
  function scroll(force) {
    var near = log.scrollHeight - log.scrollTop - log.clientHeight < 48
    if (force || near) log.scrollTop = log.scrollHeight
  }

  /* 按句播报：取最后一个已收尾的句子。不用正则后行断言，兼容老 Safari。 */
  function announce(text) {
    if (!liveEl) return
    var now = Date.now()
    if (now - lastAnnounceAt < 600) return
    var segs = String(text).split(/[。！？!?\n]/)
    var s = segs.length > 1 ? String(segs[segs.length - 2]).trim() : ''
    if (!s || s === lastSpoken) return
    lastSpoken = s
    lastAnnounceAt = now
    liveEl.textContent = s.slice(-160)
  }

  /* 生成中把「发送」按钮就地变成「停止」，不新增第二个控件。 */
  function markBusy(on) {
    if (!sendIconHtml && sendBtn) sendIconHtml = sendBtn.innerHTML
    if (!sendBtn) return
    if (on) {
      sendBtn.disabled = false
      sendBtn.classList.add('bja-stopping')
      sendBtn.title = '停止生成'
      sendBtn.setAttribute('aria-label', '停止生成')
      sendBtn.setAttribute('data-bja-stop', '1')
      sendBtn.innerHTML = '<span style="display:block;width:10px;height:10px;border-radius:2px;background:currentColor;margin:auto"></span>'
    } else {
      sendBtn.classList.remove('bja-stopping')
      sendBtn.title = '发送'
      sendBtn.setAttribute('aria-label', '发送')
      sendBtn.removeAttribute('data-bja-stop')
      sendBtn.innerHTML = sendIconHtml || IC.send
      sendBtn.disabled = false
    }
  }

  function stopGenerate() {
    if (!busy || settled) return
    stopped = true
    try { if (ctrl) ctrl.abort() } catch (e) {}
    finishStopped()
  }

  /* 用户主动停止：保留已出字部分并标注，不进历史、不假装答完。 */
  function finishStopped() {
    if (settled) return
    settled = true
    clearTimeout(reqTimer)
    if (curTyper) curTyper.end()
    if (curBody) {
      var tag = el('div', 'bja-stopped')
      tag.textContent = '已停止生成'
      curBody.appendChild(tag)
    }
    if (liveEl) liveEl.textContent = '已停止生成'
    done()
  }

  function done() {
    busy = false
    clearTimeout(reqTimer)
    clearInterval(localTimer); localTimer = 0
    ctrl = null
    curTyper = null
    curBody = null
    markBusy(false)
    chipsBox.style.display = pref.chips ? '' : 'none'
    if (log) log.setAttribute('aria-busy', 'false')
    scroll()
    try { input.focus() } catch (e) {}   /* 焦点留在输入框，键盘用户不被打断 */
  }

  /* ---------------- 打字机 ---------------- */
  function typer(body) {
    var queue = ''
    var shown = ''
    var started = false
    var ended = false
    var raf = 0

    function paint() {
      body.innerHTML = fmt(shown) + (ended ? '' : '<span class="bja-caret"></span>')
      announce(shown)
    }
    function tick() {
      raf = 0
      if (queue.length) {
        var n = queue.length > 240 ? 9 : queue.length > 80 ? 4 : queue.length > 20 ? 2 : 1
        shown += queue.slice(0, n)
        queue = queue.slice(n)
        paint()
        scroll()
      }
      if (queue.length || !ended) raf = requestAnimationFrame(tick)
    }
    return {
      push: function (t) {
        queue += t
        if (!started) { started = true; paint() }
        if (!raf) raf = requestAnimationFrame(tick)
      },
      end: function () {
        if (queue.length) { shown += queue; queue = '' }
        ended = true
        body.innerHTML = fmt(shown)
        scroll()
      },
      /* 切换上游（/api/chat 失败 -> 用户自备 BYOK）前必须彻底复位，
         否则上一次已吐出的字仍留在 shown 缓冲里，会被下一轮 paint() 画回来。 */
      reset: function () {
        queue = ''; shown = ''; started = false; ended = false
        if (raf) { try { cancelAnimationFrame(raf) } catch (e) {} raf = 0 }
        body.innerHTML = ''
      },
      text: function () { return shown + queue }
    }
  }

  /* ---------------- 发送 ---------------- */
  function submit() {
    var q = (input.value || '').trim()
    if (!q || busy) return
    input.value = ''
    input.style.height = 'auto'
    addMsg('u', q)
    history.push({ role: 'user', content: q })
    saveHist()
    ask(q)
  }

  function ask(q) {
    learn(q)                 /* 每轮都学一点：称呼 / 偏好 / 纠正 / 常问方向 */
    busy = true
    stopped = false
    settled = false
    lastAsk = q
    lastSpoken = ''
    lastAnnounceAt = 0
    triedByok = false
    markBusy(true)
    chipsBox.style.display = 'none'
    log.setAttribute('aria-busy', 'true')
    if (liveEl) liveEl.textContent = '正在生成回答'

    var m = addMsg('a', '')
    var body = m.body
    curBody = body
    body.innerHTML = '<span class="bja-think"><i></i><i></i><i></i></span>'
    var t = typer(body)
    curTyper = t
    var got = false

    /* 本地能力优先：文件、表格、计算、整理、导出、记忆、分析与漫剧骨架。
       静态托管下照样真能用，而且和模型回答一样逐字打字，不假装有模型。

       2026-11-15 修复「什么都问不了」：后端在线（本地预览 / 服务端形态）时，
       开放问答必须真走 /api/chat，不能被「分析/为什么/等于/多少」这类宽泛
       关键词的本地模板抢答。只有明确的本地工具指令仍走本地（要产文件、
       要读附件、要算算式）。后端离线时（正式静态发布）保持原降级口径不变：
       仍由本地模板答，不假装有模型、不内置任何密钥。 */
    var isToolCmd = /导出|下载|生成文件|转成|转出|另存|导出成|理一理|整理|归类|目录|清单|归档|梳理|清空记忆|忘掉我|重置记忆|记住了什么|你还记得|成长|同行进度|清空附件|删掉文件|移除文件|清空文件|漫剧|短剧|分镜|剧本|人设|台词|分集|竖屏|表格|CSV|csv|统计|汇总|均值|中位|极值|算一下|^算[\s:：]*[-+*/%^().\d\s]+$/.test(q) ||
      /^(看|列|有)?\s*(附件|文件|文档)($|[？?，,\s])/.test(q) ||
      (attachments && attachments.length && /文档|文件|附件|里面|这份|上面|刚才|讲了|写了|提到|摘要|总结|内容|什么意思|第.*段/.test(q))
    var local = null
    if (isToolCmd || online !== true) {
      try { local = localReply(q) } catch (e) { local = null }
    }
    if (local) {
      noteTask(local.task)
      paintMem()
      var ltxt = local.text
      var li = 0
      body.innerHTML = ''
      localTimer = setInterval(function () {
        if (settled) { clearInterval(localTimer); localTimer = 0; return }
        if (li >= ltxt.length) {
          clearInterval(localTimer); localTimer = 0
          finishLocal()
          return
        }
        var n = Math.min(ltxt.length - li, 5 + Math.floor(Math.random() * 7))
        t.push(ltxt.slice(li, li + n))
        li += n
      }, 17)
      function finishLocal() {
        if (settled) return
        settled = true
        t.end()
        var ops = el('div', 'ops')
        var cp = el('button', null, '复制'); cp.type = 'button'
        cp.addEventListener('click', function () { try { navigator.clipboard.writeText(ltxt); cp.textContent = '已复制' } catch (e) {} })
        var ex = el('button', null, '导出 Word'); ex.type = 'button'
        ex.addEventListener('click', function () { exportAs('docx') })
        ops.appendChild(cp); ops.appendChild(ex)
        body.appendChild(ops)
        history.push({ role: 'assistant', content: ltxt })
        saveHist()
        if (pref.speak) speak(ltxt)
        if (liveEl) liveEl.textContent = ltxt.slice(-300)
        done()
      }
      return
    }

    /* 成长画像 + 当前课题指令 + 已添加文件，一起注入上下文（越用越贴合）。 */
    var msgs = [{ role: 'system', content: memPrompt() + attContext() + studioInstruction() }].concat(
      history.slice(-MAX_TURNS * 2).map(function (x) {
        return { role: x.role, content: String(x.content).slice(0, MAX_CHARS) }
      })
    )

    /* 一个请求一个控制器。老浏览器没有 AbortController 时只是不能中断，
       超时与重试仍然可用。 */
    try { ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null } catch (e) { ctrl = null }
    clearTimeout(reqTimer)
    reqTimer = setTimeout(function () {
      if (!busy || settled) return
      try { if (ctrl) ctrl.abort() } catch (e) {}
      fail(new Error('请求超时 · 30 秒没有收到回答'))
    }, 30000)

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: msgs,
        thinking: pref.think === true,
        max_tokens: pref.long ? 2600 : 1200,
        mode: pref.mode || 'chat',
        model: pref.model || ''
      }),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (tx) {
          var msg = '接口返回 ' + res.status
          try { var j = JSON.parse(tx); if (j.error) msg = j.error } catch (e) {}
          throw new Error(msg)
        })
      }
      var reader = res.body.getReader()
      var dec = new TextDecoder()
      var buf = ''
      function pump() {
        return reader.read().then(function (r) {
          if (r.done) { finish(); return }
          buf += dec.decode(r.value, { stream: true })
          var i
          while ((i = buf.indexOf('\n')) >= 0) {
            var line = buf.slice(0, i).trim()
            buf = buf.slice(i + 1)
            if (line.indexOf('data:') !== 0) continue
            var data = line.slice(5).trim()
            if (data === '[DONE]') { finish(); return }
            try {
              var j = JSON.parse(data)
              if (j.c) {
                if (!got) { got = true; body.innerHTML = '' }
                t.push(j.c)
              }
              if (j.e) fail(new Error(j.e))
            } catch (e) {}
          }
          return pump()
        })
      }
      return pump()
    }).catch(function (e) {
      if (stopped || settled) return
      if (e && e.name === 'AbortError') return   /* 主动停止 / 超时中断不是错误 */
      fail(e)
    })

    /* 失败可恢复：重发同一条问题、替换掉失败气泡，不追加第二条 user 消息。 */
    function addRetry(container) {
      var rt = el('button', 'bja-retry', '重试')
      rt.type = 'button'
      rt.setAttribute('data-bja-retry', '1')
      rt.addEventListener('click', function () {
        if (busy) return
        var wrap = m.wrap
        if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap)
        ask(lastAsk)
      })
      container.appendChild(rt)
    }

    function finish() {
      if (settled) return
      if (stopped) { finishStopped(); return }
      settled = true
      t.end()
      var text = t.text().trim()
      if (!text) {
        body.innerHTML = fmt('（没有拿到内容，可能上游超时了，点「重试」再问一次）')
        addRetry(body)
      } else {
        var ops = el('div', 'ops')
        var sp = el('button', null, '朗读'); sp.type = 'button'
        sp.addEventListener('click', function () { speak(text) })
        var cp = el('button', null, '复制'); cp.type = 'button'
        cp.addEventListener('click', function () { try { navigator.clipboard.writeText(text); cp.textContent = '已复制' } catch (e) {} })
        ops.appendChild(sp); ops.appendChild(cp)
        body.appendChild(ops)
        history.push({ role: 'assistant', content: text })
        saveHist()
        if (pref.speak) speak(text)
      }
      if (liveEl) liveEl.textContent = (text || '回答为空').slice(-300)
      done()
    }

    function fail(e) {
      if (settled) return
      if (stopped) { finishStopped(); return }
      /* 站点转发不可用时，若用户自愿填了兼容接口，试一次；不行就给本地能做的部分，
         不再甩「去跑 node server.mjs」这种把访客吓走的话。 */
      var cfg = loadByok()
      if (!triedByok && cfg.url && cfg.key) {
        triedByok = true
        t.reset()                 /* 清掉上游残字，避免首个字粘在新回答前面 */
        body.innerHTML = ''
        byokStream(msgs, cfg, t, finish, fail)
        return
      }
      settled = true
      clearTimeout(reqTimer)
      t.end()
      body.innerHTML = fmt(localFallback(lastAsk))
      addRetry(body)
      if (liveEl) liveEl.textContent = '已给出本地可用的做法'
      done()
    }
  }

  /* ---------------- 语音 ---------------- */
  function voiceInput() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      tip('此浏览器不支持语音输入')
      return
    }
    if (recog) { try { recog.stop() } catch (e) {} recog = null; micBtn.classList.remove('rec'); return }
    recog = new SR()
    recog.lang = 'zh-CN'
    recog.interimResults = false
    recog.maxAlternatives = 1
    micBtn.classList.add('rec')
    recog.onresult = function (e) {
      var t = e.results[0][0].transcript
      input.value = (input.value ? input.value + ' ' : '') + t
      input.dispatchEvent(new Event('input'))
    }
    recog.onend = function () { micBtn.classList.remove('rec'); recog = null }
    recog.onerror = function () { micBtn.classList.remove('rec'); recog = null }
    try { recog.start() } catch (e) { micBtn.classList.remove('rec'); recog = null }
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) return
    try {
      speechSynthesis.cancel()
      var u = new SpeechSynthesisUtterance(plain(text))
      u.lang = 'zh-CN'
      u.rate = 1.02
      speechSynthesis.speak(u)
    } catch (e) {}
  }

  /* ---------------- 头部动作 / 快捷功能 ---------------- */
  function click(id) {
    var n = document.getElementById(id)
    if (!n) return false
    try { n.click(); return true } catch (e) { return false }
  }
  function has(id) { return !!document.getElementById(id) }

  function onAction(e) {
    var b = e.target.closest('button')
    if (!b) return
    var a = b.getAttribute('data-act')
    if (a === 'close') return toggle(false)
    if (a === 'gear') return toggleSheet()
    if (a === 'find') return doSearch()
  }

  function doSearch() {
    if (typeof window.ccowSearchOpen === 'function') { toggle(false); setTimeout(function () { window.ccowSearchOpen() }, 120); return }
    if (click('ccowSearchBtn')) { toggle(false); return }
    location.href = '/search.html'
  }

  function quickAction(k) {
    if (k === 'studio') return setStudioMode(true)
    if (k === 'memory') { toggleSheet(false); setView('chat'); addMsg('a', memBrief()); scroll(); return }
    if (k === 'forget') {
      mem = { turns: 0, since: Date.now() }; saveMem(); paintMem(); tip('记忆已清空，从初识重新开始'); return
    }
    if (k === 'search') return doSearch()
    if (k === 'top') { window.scrollTo({ top: 0, behavior: 'smooth' }); return toggle(false) }
    if (k === 'read') {
      if (click('modReadBtn') || click('modReadSwitch')) { tip('已切换阅读模式'); return }
      var on = document.body.getAttribute('data-read') === 'on'
      document.body.setAttribute('data-read', on ? '' : 'on')
      try { localStorage.setItem('ccowork.read', on ? '' : 'on') } catch (e) {}
      tip(on ? '阅读模式已关闭' : '阅读模式已开启')
      return
    }
    if (k === 'theme') {
      var deep = document.body.getAttribute('data-theme') === 'deep'
      document.body.setAttribute('data-theme', deep ? 'cloud' : 'deep')
      try { localStorage.setItem('ccowork.theme', deep ? 'cloud' : 'deep') } catch (e) {}
      tip(deep ? '已切回浅色' : '已切到深色')
      return
    }
    if (k === 'copy') {
      var u = location.href
      try {
        navigator.clipboard.writeText(u)
        tip('链接已复制')
      } catch (e) { tip('复制失败，可手动从地址栏复制') }
      return
    }
    if (k === 'reset') return resetPos()
    /* 常用直达：站内跳转（2026-11-16） */
    if (k.indexOf('go:') === 0) {
      var url = k.slice(3)
      toggle(false)
      location.href = url
      return
    }
    /* 反馈：实时入口（邮箱/QQ群留配置位，未填则复制入口说明） */
    if (k === 'fb:email' && FEEDBACK.email) { toggle(false); location.href = 'mailto:' + FEEDBACK.email; return }
    if (k === 'fb:qq' && FEEDBACK.qqGroup) { toggle(false); window.open(FEEDBACK.qqGroup, '_blank', 'noopener'); return }
    if (k === 'fb:copy') {
      var txt = FEEDBACK.email ? ('邮箱：' + FEEDBACK.email) : (FEEDBACK.qqGroup ? ('QQ群：' + FEEDBACK.qqGroup) : '反馈联系方式待公布')
      try { navigator.clipboard.writeText(txt); tip('反馈入口已复制') } catch (e) { tip(txt) }
      return
    }
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    loadCss()
    loadBrandOne()
    loadSiteNav()
    /* 页面本身就是助手（<body data-ccassist="page">，目前只有 /agent.html）：
       仍然构建面板 —— 全站的「设置」只有 .bja-sheet 这一处，助手页也得共用，
       否则就得退回页面自带的 prompt() 弹窗，设置口径立刻分裂。
       区别只在于**不露出悬浮入口**：由 body.bja-page-assist 把 .bja-fab 藏掉，
       于是同一屏只有一个对话界面，设置仍是同一份。 */
    loadHist()
    build()
    if (document.body && document.body.getAttribute('data-ccassist') === 'page') {
      document.body.classList.add('bja-page-assist')
      /* 悬浮入口不可见时 root 的包围盒会塌成 0，面板要靠 placePanel 的兜底锚点定位 */
      if (root) root.classList.add('bja-nofab')
    }
    placeRoot(true)
    // 字体/布局稳定后再校一次，避免初始高度未定把按钮放偏
    setTimeout(function () { placeRoot(true) }, 120)
    /* 2026-11-15：启动即探测后端，避免用户第一句提问时 online 仍是 null
       而误走本地模板。静态发布下 /api/health 404 → online=false，降级口径不变。 */
    try { checkOnline() } catch (e) {}
  }

  /* ---------------- 朋友门锁（2026-11-13） ----------------
     正式发布态默认只有「公开层」：助手不加载 CSS、不创建任何 DOM、不露入口。
     朋友凭钥匙解锁后，baiju-gate.js 派发 baiju:gate-open，这里才 boot。
     本地预览（localhost / 内网）自动放行，不影响日常调试。
     ⚠️ 这是可见性门锁，不是访问控制；真正的账号鉴权需要服务端。 */
  function gateAllowed() {
    /* 2026-11-15 分组：只有全量分组才构建 AI 悬浮窗。
       资料层 / 基础层即使已确认访问，也不出现任何 AI 入口。 */
    if (window.BaijuGate && window.BaijuGate.aiAllowed) {
      if (!window.BaijuGate.aiAllowed()) return false
    }
    try {
      if (localStorage.getItem('baiju.gate.lock') === '1' ||
          /[?&]gate=lock(?:[&#]|$)/.test(location.href)) return false
      var v = JSON.parse(localStorage.getItem('baiju.gate.v1') || 'null')
      if (v && v.ok && v.exp && v.exp > Date.now()) return true
    } catch (e) {}
    var h = location.hostname
    if (h === 'localhost' || h === '127.0.0.1' || h === '::1' ||
        /^192\.168\./.test(h) || /^10\./.test(h) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(h) || h === '') return true
    if (window.BaijuGate) return window.BaijuGate.isOpen()
    return false
  }
  var booted = false
  function tryBoot() {
    if (booted || !gateAllowed()) return
    booted = true
    boot()
  }
  document.addEventListener('baiju:gate-open', tryBoot)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryBoot)
  } else {
    tryBoot()
  }
})()
