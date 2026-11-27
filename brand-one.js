/* ============================================================================
   白驹 ccowork · 全站统一层（2026-11-10）
   ----------------------------------------------------------------------------
   全站只有一个助手、一套设置、一套品牌标识。
   本文件做四件事：
     1) 把正式商标（assets/brand/）注入所有标识位，替换自绘卡通马与旧写法
     2) 暴露 window.BaijuOne —— 全站入口的唯一转发 API
     3) 把旧的三套设置（首页 setPanel / module.js 外观 / ccowork.js 工作台）
        收进唯一助手的「功能与设置」抽屉，读写原有 localStorage 键，不丢配置
     4) 缺 baiju-assistant.js 的页面自动补载，保证 535 页都有同一个助手
   配套样式：brand-one.css（由 ccowork.js 注入）
   ============================================================================ */
(function () {
  if (window.__BRAND_ONE__) return
  window.__BRAND_ONE__ = true

  /* ---------- 资源基址：与 ccowork.js 的注入基址一致，兼容子目录页面 ---------- */
  var BASE = '/'
  try {
    var mine = document.querySelector('script[src*="brand-one.js"]')
    if (mine && mine.src) BASE = mine.src.replace(/brand-one\.js(\?.*)?$/, '')
  } catch (e) {}
  var ASSET = BASE + 'assets/brand/'
  var MARK = ASSET + 'mark.svg'
  /* 2026-11-12 与名字解耦：横版字标不再用烧了名字的 lockup-h*.png 位图。
     图形标 + 实时文本 = 一处改名字，全站同步；两张 PNG 只保留给对外下载。
     小尺寸（≤24px）用简化版 mark-small.svg，避免细笔画被抗锯齿吃掉。 */
  var MARK_SMALL = ASSET + 'mark-small.svg'
  var BRAND_NAME = '白驹 ccowork'
  var BRAND_EN = 'ONE BRAIN · EVERY TOOL'
  var CONF_KEY = 'baiju-config-v2'

  /* ---------- 样式兜底（正常由 ccowork.js 注入，这里防独立引用） ---------- */
  if (!document.querySelector('link[href*="brand-one.css"]')) {
    var lk = document.createElement('link')
    lk.rel = 'stylesheet'
    lk.href = BASE + 'brand-one.css'
    document.head.appendChild(lk)
  }

  /* ---------- 标识组件：全站只认这两个 ---------- */
  function compact() {
    return '<span class="bj-brand bj-brand--compact" data-bj-brand="1">' +
      '<img class="bj-mark-img" src="' + MARK + '" alt="' + BRAND_NAME + ' 标识">' +
      '<span class="bj-name">' + BRAND_NAME + '</span></span>'
  }
  /* 横版组合：图形标 + 实时文本字标。
     亮/深靠 currentColor 自动适配，不再维护两张互不同步的反色位图。 */
  function lockup() {
    return '<span class="bj-brand bj-brand--lockup" data-bj-brand="1">' +
      '<img class="bj-lockup-mark" src="' + MARK + '" alt="">' +
      '<span class="bj-lockup-txt"><b>' + BRAND_NAME + '</b><em>' + BRAND_EN + '</em></span>' +
      '</span>'
  }

  function setBrand(sel, html, keepHref) {
    var el = document.querySelector(sel)
    if (!el) return false
    if (el.getAttribute('data-bj-brand') === '1') return true
    el.innerHTML = html
    el.setAttribute('data-bj-brand', keepHref ? '1' : '1')
    return true
  }

  /* ---------- 1) 所有标识位统一 ---------- */
  function applyBrand() {
    /* 首页老导航 nav.top */
    setBrand('nav.top .brand', compact())
    /* 统一导航（254 页 + 补载页） */
    setBrand('header.ccnav .ccnav-brand', compact())
    /* 统一页脚品牌列 */
    setBrand('footer.ccfoot .cf-logo', lockup())
    /* ccowork.js 注入的老页脚 */
    setBrand('.site-footer .foot-brand .logo-row', compact())
    /* module.js 长文页 CTA 品牌条（顺带改掉旧品牌名） */
    var cta = document.querySelector('#modReadCta .cta-brand')
    if (cta && cta.getAttribute('data-bj-brand') !== '1') {
      cta.innerHTML = lockup() + '<span class="bj-sub">把散落的 AI 工具装进一个大脑</span>'
      cta.setAttribute('data-bj-brand', '1')
      cta.style.display = 'flex'
      cta.style.alignItems = 'center'
      cta.style.gap = '10px'
    }

    /* 首页展开态对话卡：品牌头 + 打开全站助手出口 */
    var head = document.querySelector('#chatbox .chat-head')
    if (head && head.getAttribute('data-bj-brand') !== '1') {
      var t = head.querySelector('.t')
      if (t) t.textContent = BRAND_NAME + ' · 对话'
      head.insertAdjacentHTML('afterbegin', compact())
      var open = document.createElement('button')
      open.type = 'button'
      open.className = 'bj-open-assistant'
      open.textContent = '全站助手'
      open.title = '打开白驹 ccowork 助手（全站唯一）'
      open.style.cssText = 'margin-left:auto;border:1px solid rgba(79,140,255,.32);background:transparent;' +
        'color:inherit;border-radius:9px;padding:4px 9px;font:600 11px/1 inherit;cursor:pointer;white-space:nowrap'
      open.addEventListener('click', function () { window.BaijuOne.open('chat') })
      /* 原来的状态标签移到按钮后面 */
      var st = head.querySelector('.st')
      if (st) { st.style.marginLeft = '0'; head.appendChild(st) }
      head.insertBefore(open, st || null)
      head.setAttribute('data-bj-brand', '1')
    }

    /* 唯一助手：悬浮球 = 正式方块标 */
    var fab = document.querySelector('#bja-assistant .bja-fab')
    if (fab && !fab.querySelector('.bj-fab-mark')) {
      var fi = document.createElement('img')
      fi.className = 'bj-fab-mark'
      fi.src = MARK
      fi.alt = ''
      fab.insertBefore(fi, fab.firstChild)
    }
    /* 面板头：正式方块标 + 规范品牌名 */
    var ttMk = document.querySelector('.bja-panel .bja-hd .tt-mk')
    if (ttMk && !ttMk.querySelector('.bj-hd-mark')) {
      ttMk.innerHTML = '<img class="bj-hd-mark" src="' + MARK + '" alt="">'
    }
    var ttName = document.querySelector('.bja-panel .bja-hd .tt > b')
    if (ttName && ttName.textContent !== BRAND_NAME) ttName.textContent = BRAND_NAME
    /* 面板首页主视觉：正式横版组合（图形标 + 实时文本），与页脚同一套 */
    var hmMk = document.querySelector('.bja-panel .hm-hero .hm-mk')
    if (hmMk && hmMk.getAttribute('data-bj-brand') !== '1') {
      hmMk.innerHTML = '<img class="bj-hero-mark" src="' + MARK + '" alt="">'
      hmMk.setAttribute('data-bj-brand', '1')
    }
    var hmSub = document.querySelector('.bja-panel .hm-hero > span')
    var hmSubText = '全站唯一助手 · 对话 / 设置 / 工具都在这里'
    if (hmSub && hmSub.textContent !== hmSubText) hmSub.textContent = hmSubText

    /* 首访「选身份」弹窗：收进唯一助手。
       它是 showModal() 打开的 <dialog>，光用 CSS 隐藏仍会保留 top-layer，
       整页变 inert、点什么都没反应；必须主动 close() 掉。
       身份功能在「功能与设置 → 切换身份」里等效保留（bjRoleDlg）。 */
    var dlg = document.getElementById('bjOnboardDlg')
    if (dlg && dlg.open) {
      try { if (typeof dlg.close === 'function') dlg.close() } catch (e) {}
      try { dlg.removeAttribute('open') } catch (e) {}
    }

    /* 导航内唯一设置入口：点进去就是助手的「功能与设置」抽屉。
       刻意不新增第二个悬浮球 —— 全站悬浮组件只保留一个。 */
    var act = document.querySelector('nav.top .nav-actions') ||
              document.querySelector('header.ccnav .nav-actions')
    if (act && !act.querySelector('.bj-nav-settings')) {
      var gs = document.createElement('button')
      gs.type = 'button'
      gs.className = 'bj-nav-settings'
      gs.title = BRAND_NAME + ' · 设置与功能（全站唯一）'
      gs.setAttribute('aria-label', '打开设置与功能')
      /* 15px 属小尺寸，用加粗简化版；仍是同一枚「隙」，只是笔画更抗锯齿 */
      gs.innerHTML = '<img class="bj-mark-img" src="' + MARK_SMALL + '" alt=""><span>设置</span>'
      gs.addEventListener('click', function () { window.BaijuOne.settings() })
      act.appendChild(gs)
    }

    /* 独立分站（linguavista 等）没有统一导航，把同一个品牌标挂到老框架条上 */
    var bar = document.querySelector('.ccbar')
    if (bar && !bar.querySelector('.bj-brand')) {
      bar.insertAdjacentHTML('afterbegin', compact())
    }
  }

  /* ---------- 2) 站点设置：并入唯一助手的功能抽屉 ---------- */
  var WALLS = [
    ['epoch', '纪元'], ['nebula', '星云'], ['cloud-hero', '云顶'], ['garden', '花园'],
    ['train', '列车'], ['island', '岛屿'], ['cafe', '咖啡馆'], ['none', '无']
  ]
  var MODES = [
    ['cloud', '云端白驹 · DeepSeek 服务端（免 Key·推荐）'],
    ['webllm', '内置大模型 · 浏览器本地（Qwen2.5）'],
    ['ollama', '本地 Ollama'], ['deepseek', 'DeepSeek API（多模态）'],
    ['local', '极简书稿检索']
  ]

  function opts(list, cur) {
    return list.map(function (p) {
      return '<option value="' + p[0] + '"' + (p[0] === cur ? ' selected' : '') + '>' + p[1] + '</option>'
    }).join('')
  }
  function ls(k) { try { return localStorage.getItem(k) || '' } catch (e) { return '' } }
  function setLs(k, v) { try { localStorage.setItem(k, v) } catch (e) {} }
  function conf() { try { return JSON.parse(ls(CONF_KEY) || '{}') || {} } catch (e) { return {} } }
  function attr(name, v) { if (v) document.body.setAttribute(name, v) }

  function siteSetHtml() {
    var c = conf()
    var theme = ls('ccowork.theme') || (document.body.getAttribute('data-theme')) || 'cloud'
    var wall = ls('ccowork.wall') || document.body.getAttribute('data-wall') || ''
    return '<div class="bj-site-set" data-bj-site-set="1">' +
      '<div class="sh-t">站点设置 · ' + BRAND_NAME + '</div>' +
      '<div class="bj-row"><span>主题<small>全站统一，亮 / 深即时生效</small></span>' +
      '<select id="bjTheme">' + opts([['cloud', '云顶'], ['deep', '深空']], theme) + '</select></div>' +
      '<div class="bj-row"><span>壁纸<small>与主题联动</small></span>' +
      '<select id="bjWall"><option value="">默认</option>' + opts(WALLS, wall) + '</select></div>' +
      '<div class="bj-row"><span>默认大脑<small>问答、生成、编译辅助统一走这里</small></span>' +
      '<select id="bjMode">' + opts(MODES, c.mode || 'cloud') + '</select></div>' +
      '<div class="bj-row"><span>DeepSeek API Key<small>仅存本地浏览器</small></span>' +
      '<input type="password" id="bjKey" placeholder="sk-…" value="' + String(c.key || '').replace(/"/g, '&quot;') + '"></div>' +
      '<div class="bj-row"><span>语音播报</span><input type="checkbox" class="bj-sw" id="bjVoice"' +
      (c.voice === false ? '' : ' checked') + '></div>' +
      '<div class="bj-row"><span>多模态<small>图片输入，需 DeepSeek</small></span>' +
      '<input type="checkbox" class="bj-sw" id="bjMM"' + (c.mm ? ' checked' : '') + '></div>' +
      '<button type="button" class="bj-save" id="bjSave">保存设置</button>' +
      '<div class="sh-t">账号与身份</div>' +
      '<div class="bj-acct-row">' +
      '<button type="button" id="bjAcct">我的账号</button>' +
      '<button type="button" id="bjRole">切换身份</button></div>' +
      '<p class="bj-tip">全站只在此处设置：导航、页脚、对话、主题与账号共用同一份配置，下次打开自动恢复。</p>' +
      '</div>'
  }

  function injectSiteSet() {
    var bd = document.querySelector('.bja-panel .bja-sheet .sh-bd')
    if (!bd || bd.querySelector('[data-bj-site-set]')) return
    bd.insertAdjacentHTML('beforeend', siteSetHtml())
    var save = bd.querySelector('#bjSave')
    if (!save) return
    save.addEventListener('click', function () {
      var theme = bd.querySelector('#bjTheme').value
      var wall = bd.querySelector('#bjWall').value
      var mode = bd.querySelector('#bjMode').value
      var key = bd.querySelector('#bjKey').value.trim()
      var voice = bd.querySelector('#bjVoice').checked
      var mm = bd.querySelector('#bjMM').checked

      setLs('ccowork.theme', theme)
      attr('data-theme', theme)
      if (wall) { setLs('ccowork.wall', wall); attr('data-wall', wall) }
      setLs(CONF_KEY, JSON.stringify({
        mode: mode, key: key, voice: voice, mm: mm,
        deep: theme === 'deep', wall: wall
      }))
      /* 同步首页旧控件（隐藏但脚本仍读它们），保证对话逻辑不脱节 */
      ;[['sMode', 'mode'], ['mode', 'mode'], ['sWall', 'wall']].forEach(function (p) {
        var el = document.getElementById(p[0]); if (el) el.value = p[1] === 'mode' ? mode : wall
      })
      ;[['sKey', key], ['apikey', key]].forEach(function (p) {
        var el = document.getElementById(p[0]); if (el) el.value = p[1]
      })
      ;[['sVoice', voice], ['voice-on', voice], ['sMM', mm], ['mm-on', mm],
        ['sDeep', theme === 'deep']].forEach(function (p) {
        var el = document.getElementById(p[0]); if (el) el.checked = p[1]
      })
      try { if (typeof window.syncThemeBtn === 'function') window.syncThemeBtn() } catch (e) {}
      /* 通知全站主题层（module.js / ccowork.js 都监听 body 属性） */
      try { document.dispatchEvent(new CustomEvent('bj:settings', { detail: { theme: theme, wall: wall } })) } catch (e) {}
      save.textContent = '已保存 ✓'
      setTimeout(function () { save.textContent = '保存设置' }, 1400)
    })
    /* 账号 / 身份：原来的悬浮坞已收编，这里保留两个等效入口 */
    ;[['bjAcct', 'openAccount'], ['bjRole', 'openRolePicker']].forEach(function (p) {
      var el = bd.querySelector('#' + p[0])
      if (!el) return
      el.addEventListener('click', function () {
        try {
          if (window.Baiju && typeof window.Baiju[p[1]] === 'function') window.Baiju[p[1]]()
        } catch (e) {}
      })
    })
  }

  /* ---------- 3) 唯一助手公共 API + 旧入口转发 ---------- */
  /* 助手页（/agent.html，<body data-ccassist="page">）同样会构建 #bja-assistant，
     只是把悬浮入口藏起来（body.bja-page-assist）。因此全站所有页面 —— 包括助手页
     自己 —— 的「设置」都必须落到同一个 .bja-sheet，不能分流到页面自带的
     #keyBtn/prompt()，否则「所有设置最终只能是一个」立刻破功。
     惰性求值：本文件可能在 body 解析完成前就被注入，不能在建阶段读 document.body。 */
  function pageIsAssistant() {
    return !!(document.body && document.body.getAttribute('data-ccassist') === 'page')
  }

  function ensureAssistant() {
    if (document.querySelector('#bja-assistant')) return true
    /* 助手页自带 <script src="/baiju-assistant.js">，只等它建好，不重复注入 */
    if (pageIsAssistant()) return false
    if (document.querySelector('script[src*="baiju-assistant.js"]')) return false
    var s = document.createElement('script')
    s.src = BASE + 'baiju-assistant.js'
    s.defer = true
    document.head.appendChild(s)
    return false
  }

  window.BaijuOne = {
    brand: BRAND_NAME,
    open: function (tab) {
      var root = document.querySelector('#bja-assistant')
      if (!root) {
        ensureAssistant()
        var tries = 0
        var iv = setInterval(function () {
          tries++
          if (document.querySelector('#bja-assistant') || tries > 30) {
            clearInterval(iv)
            if (document.querySelector('#bja-assistant')) window.BaijuOne.open(tab)
          }
        }, 120)
        return
      }
      var fab = root.querySelector('.bja-fab')
      if (!root.classList.contains('open') && fab) fab.click()
      var t = tab || 'chat'
      setTimeout(function () {
        var btn = null
        if (t === 'settings') {
          btn = document.querySelector('.bja-panel [data-go="sheet"]') ||
                document.querySelector('.bja-panel [data-act="gear"]') ||
                document.querySelector('.bja-panel [data-cdo="more"]')
        } else if (t === 'search') {
          btn = document.querySelector('.bja-panel [data-act="find"]') ||
                document.querySelector('.bja-panel [data-go="search"]')
        } else {
          btn = document.querySelector('.bja-panel [data-go="chat"]')
        }
        if (btn) btn.click()
      }, 140)
    },
    settings: function () { window.BaijuOne.open('settings') },
    chat: function () { window.BaijuOne.open('chat') }
  }

  /* 旧设置入口统一转发到唯一助手（这些 UI 已被 brand-one.css 收编） */
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest(
      '#setBtn, #modGear, .nav-gear, #modTocGear, #ccowork-pet, [data-cc-open-settings]'
    ) : null
    if (!el) return
    e.preventDefault()
    e.stopPropagation()
    window.BaijuOne.settings()
  }, true)

  /* ---------- 4) 启动：等唯一助手构建完成后做统一增强 ---------- */
  var busy = false
  function enhance() {
    if (busy) return
    busy = true
    try {
      applyBrand()
      injectSiteSet()
    } finally { busy = false }
  }
  function boot() {
    ensureAssistant()
    enhance()
    /* 注入层是异步的（bja defer、site-nav.js、ccowork.js 页脚），
       用固定次数轮询做幂等增强。这里刻意不用 MutationObserver：
       enhance 本身会改 DOM，自观察会形成无限回调，把主线程占满。 */
    var n = 0
    var iv = setInterval(function () {
      enhance()
      n++
      if (n > 40) clearInterval(iv)
    }, 250)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot)
  } else {
    boot()
  }
})()
