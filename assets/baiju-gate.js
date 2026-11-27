/* 白驹 · 访问确认 · 状态层（零依赖）
 * 按访问范围控制界面展示内容。静态托管下只作用于可见性。 */
(function () {
  'use strict'
  if (window.__BAIJU_GATE__) return
  window.__BAIJU_GATE__ = true

  /* ---------- 访问码摘要表：由 scripts/build-access-keys.mjs 生成 ----------
     只存 SHA-256 摘要 + 分组 + 启用状态，绝不存明文。改钥匙走生成器，不要手改。 */
  /* KEYS:START */
  var FRIENDS = [
    { id: 'K01', label: "主钥匙 · 老罗", hash: '8a89ebe9deaa1b1f07f075b1ea60d3735fb108baee928e791da66bb702a2f9e7', scope: 'all', enabled: true },
    { id: 'K02', label: "全量 A", hash: '1a8b93461674ffd33875fc8456c2efbbf26b816546271aaa79c92d927f12e3f3', scope: 'all', enabled: true },
    { id: 'K03', label: "全量 B", hash: '82c1b45ff94b0df3e82d2a58d7d542a86d2e8ceb500ae57edd43c994c4ac9a5b', scope: 'all', enabled: true },
    { id: 'K04', label: "资料 A", hash: '2b7dc668799bbe48e5d7dc6dbb610f16451bed6a1061df84dc68b4f3f0a535ea', scope: 'library', enabled: true },
    { id: 'K05', label: "资料 B", hash: '3fa7c4ca99a21d94d9591a28d41213b81ddb100ac1d791bf06969949e1284134', scope: 'library', enabled: true },
    { id: 'K06', label: "资料 C", hash: 'f6e19d79a6f7ee7c6ef26972755a78f26fcd310efc8021271231ee235aa3ff13', scope: 'library', enabled: true },
    { id: 'K07', label: "资料 D", hash: 'ef6bc2cd4cf5c57c67b0719fee22c994c77ed54dfe6215749b3c3016d3b409e1', scope: 'library', enabled: true },
    { id: 'K08', label: "资料 E", hash: 'b470d6af5422b22de6b2edd4b5f73461eccc008b7fda5e3b9675c5f3de1bea80', scope: 'library', enabled: true },
    { id: 'K09', label: "基础 A", hash: 'f9113098c389ba4f583d7fca3e5648e6faf65cf36c050577f7112b6835e023d8', scope: 'guest', enabled: true },
    { id: 'K10', label: "基础 B", hash: 'a59615e7680c77f9ad3be07143ca09b2c05b187512dd6cae4e1c2a7068b33a1e', scope: 'guest', enabled: true },
    { id: 'K11', label: "预留 C", hash: '95da6ed741cfca2236d65e62c08a0bec40dbbecf3f689605b01679e06e55b2c3', scope: 'library', enabled: true },
    { id: 'K12', label: "预留 D", hash: '048f02363fcd464b27ea6f3cb83edaeebdbf76a0e543a55455e7360ef4ebfa77', scope: 'guest', enabled: true }
  ]
  /* KEYS:END */

  /* 分组只决定界面显示哪些板块，不隔离底层文件 */
  var SCOPE_MAP = {
    all: ['*'],
    library: ['overview', 'books', 'docs', 'programming', 'prompts', 'planning'],
    guest: ['overview']
  }

  var STORE = 'baiju.gate.v1'
  var FORCE = 'baiju.gate.lock'
  var DAYS = 30
  var EVENT_OPEN = 'baiju:gate-open'
  var EVENT_CLOSE = 'baiju:gate-close'

  /* 需要一并收起来的功能入口（以后新增只加这里，不改几百个 HTML） */
  /* 注意：.bja-page-assist 是加在 <body> 上的类名，绝不能进隐藏清单，
     否则锁定态整页 body 被 display:none，公开层直接白屏。 */
  var HIDE_SELECTORS = [
    '.bja-fab', '.bja-panel', '.bja-root',
    'button.cta-tip', '.ob-open',
    '#compile', '.modebtn[data-mode="compile"]',
    '.ccowork-pet', '.ccowork-panel', '.cc-pet', '.cc-panel',
    '[data-ai-entry]', '.ai-entry',
    '[data-gate-hide]', '.gate-hide'
  ]

  /* 命中这些路径时整页遮成访问确认卡 */
  var GATED_PAGES = /(^|\/)(chat|agent|assistant|friends)\.html$/i

  function isLocal() {
    var h = location.hostname
    return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '' ||
      /^192\.168\./.test(h) || /^10\./.test(h) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(h)
  }
  function forced() {
    try { return localStorage.getItem(FORCE) === '1' } catch (e) { return false }
  }
  function readState() {
    try {
      var v = JSON.parse(localStorage.getItem(STORE) || 'null')
      if (v && v.ok && v.exp && v.exp > Date.now()) return v
    } catch (e) {}
    return null
  }
  function isOpen() {
    if (forced()) return false
    if (readState()) return true
    if (isLocal()) return true
    return false
  }

  /* 供 baiju-assistant.js / friends.html 自检用（同一份规则，避免加载顺序不一致） */
  var Gate = {
    isOpen: isOpen,
    isLocal: isLocal,
    forced: forced,
    OPEN: EVENT_OPEN,
    CLOSE: EVENT_CLOSE
  }
  /* 本地预览没有 state，返回 null → 视为自己，可见范围全开 */
  Gate.scope = function () {
    var v = readState()
    return v && v.scope ? v.scope : null
  }
  Gate.allows = function (group) {
    if (!isOpen()) return false
    var s = Gate.scope()
    if (!s) return true
    var a = SCOPE_MAP[s] || SCOPE_MAP.guest
    return a.indexOf('*') >= 0 || a.indexOf(group) >= 0
  }
  /* 只有全量分组才允许构建 AI 悬浮窗；资料层 / 基础层永远不出现。
     2026-11-16 老罗拍板：公开版「内容全开、AI 交互全关」。ccowork.js 首帧预锁
     会在 <html> 上写 data-ai="off"；发布态一律不建 AI 悬浮窗 DOM（不是靠 CSS 藏，
     从源头不初始化）。本地预览 data-ai="on"，调试不受影响。 */
  Gate.aiAllowed = function () {
    try {
      if (document.documentElement.getAttribute('data-ai') === 'off') return false
    } catch (e) {}
    if (!isOpen()) return false
    var s = Gate.scope()
    return !s || s === 'all'
  }
  window.BaijuGate = Gate

  /* 单一状态出口：视觉 + 事件只在这里发一次，避免自触发循环 */
  function emit(name) {
    try { document.dispatchEvent(new CustomEvent(name)) } catch (e) {
      var ev = document.createEvent('Event'); ev.initEvent(name, true, true); document.dispatchEvent(ev)
    }
  }

  var overlay = null, relock = null, styleEl = null

  function loadCss() {
    /* 自注入：跳转壳页面不加载 ccowork.js，只引入本文件，样式必须自带 */
    if (document.querySelector('link[href*="baiju-gate.css"]')) return
    var href = '/assets/baiju-gate.css'
    try {
      var all = document.getElementsByTagName('script')
      for (var i = all.length - 1; i >= 0; i--) {
        if (all[i].src && all[i].src.indexOf('baiju-gate.js') >= 0) {
          href = all[i].src.replace(/baiju-gate\.js(\?.*)?$/, 'baiju-gate.css'); break
        }
      }
    } catch (e) {}
    var l = document.createElement('link')
    l.rel = 'stylesheet'
    l.href = href
    ;(document.head || document.documentElement).appendChild(l)
  }

  /* 运行时兜底：站内有 header.ccnav .cta.cta-tip{display:inline-flex !important}
     这类高特异性规则会盖过普通 CSS 隐藏。内联 important 优先级最高，
     任何作者样式表都盖不动。解锁时按保存的原值精确还原，不留副作用。 */
  function enforceHide() {
    var els
    try { els = document.querySelectorAll(HIDE_SELECTORS.join(',')) } catch (e) { return }
    for (var i = 0; i < els.length; i++) {
      var e = els[i]
      if (e === document.body || e === document.documentElement) continue  /* 白屏安全阀 */
      if (e.hasAttribute('data-baiju-gate-hidden')) continue
      e.setAttribute('data-baiju-gate-hidden', '1')
      e.setAttribute('data-baiju-gate-prev', e.style.getPropertyValue('display'))
      e.style.setProperty('display', 'none', 'important')
    }
  }
  function releaseHide() {
    var els = document.querySelectorAll('[data-baiju-gate-hidden]')
    for (var i = 0; i < els.length; i++) {
      var e = els[i], prev = e.getAttribute('data-baiju-gate-prev') || ''
      if (prev) e.style.setProperty('display', prev)
      else e.style.removeProperty('display')
      e.removeAttribute('data-baiju-gate-hidden')
      e.removeAttribute('data-baiju-gate-prev')
    }
  }

  function addHideRules() {
    if (styleEl) return
    styleEl = document.createElement('style')
    styleEl.setAttribute('data-baiju-gate', 'rules')
    styleEl.textContent = HIDE_SELECTORS.map(function (s) {
      return 'html[data-gate="locked"] ' + s + '{display:none !important}'
    }).join('\n') + '\n'
    ;(document.head || document.documentElement).appendChild(styleEl)
  }

  function renderOverlay() {
    if (overlay) return
    overlay = document.createElement('div')
    overlay.className = 'bj-gate-overlay'
    overlay.innerHTML =
      '<div class="bj-gate-box" role="dialog" aria-modal="true" aria-label="访问确认">' +
        '<span class="bj-gate-mark">白驹 ccowork</span>' +
        '<div class="bj-gate-lock" aria-hidden="true">🔒</div>' +
        '<h1>访问确认</h1>' +
        '<input class="bj-gate-input" type="password" placeholder="请输入访问码" autocomplete="off" spellcheck="false" aria-label="访问码">' +
        '<button class="bj-gate-btn" type="button">确认</button>' +
        '<div class="bj-gate-err" aria-live="polite"></div>' +
      '</div>'
    ;(document.body || document.documentElement).appendChild(overlay)

    var input = overlay.querySelector('.bj-gate-input')
    var btn = overlay.querySelector('.bj-gate-btn')
    var err = overlay.querySelector('.bj-gate-err')
    function submit() {
      var v = (input.value || '').trim()
      if (!v) { err.textContent = '请输入访问码'; input.focus(); return }
      err.textContent = '正在核对…'
      unlock(v, function (ok) {
        if (ok) { err.textContent = ''; return }
        err.textContent = '访问码不正确'
        input.value = ''; input.focus()
      })
    }
    btn.addEventListener('click', submit)
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit() })
  }

  function renderRelock() {
    if (relock || !document.body) return
    relock = document.createElement('button')
    relock.type = 'button'
    relock.className = 'bj-gate-relock'
    relock.textContent = '退出'
    relock.title = '退出'
    relock.addEventListener('click', function () { Gate.lock(); location.reload() })
    document.body.appendChild(relock)
  }

  function clearUi() {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay)
    overlay = null
    if (relock && relock.parentNode) relock.parentNode.removeChild(relock)
    relock = null
  }

  /* 只改视觉，不发事件 —— 事件由 open()/lock() 发 */
  function apply(open) {
    loadCss()
    addHideRules()
    document.documentElement.setAttribute('data-gate', open ? 'open' : 'locked')
    var gated = GATED_PAGES.test(location.pathname)
    if (document.body) {
      if (open) document.body.classList.remove('bj-gated-page')
      else if (gated) document.body.classList.add('bj-gated-page')
    }
    clearUi()
    if (open) releaseHide()
    else enforceHide()
    if (!open && gated) renderOverlay()
    if (open && !isLocal()) renderRelock()
  }

  Gate.open = function (label, scope) {
    try {
      localStorage.removeItem(FORCE)
      localStorage.setItem(STORE, JSON.stringify({
        ok: true, label: label || '朋友', scope: scope || 'guest',
        exp: Date.now() + DAYS * 864e5
      }))
    } catch (e) {}
    apply(true)
    emit(EVENT_OPEN)
  }
  Gate.lock = function () {
    try { localStorage.removeItem(STORE) } catch (e) {}
    apply(false)
    emit(EVENT_CLOSE)
  }
  Gate.apply = apply

  /* ---------- 访问码校验：零依赖纯 JS SHA-256 ----------
     不用 crypto.subtle：非 HTTPS / 老浏览器下 subtle 不可用，降级到另一套
     散列会让访问码永远对不上。这里同步算，任何环境结果都一致。 */
  var K256 = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]
  function rotr(x, n) { return (x >>> n) | (x << (32 - n)) }
  function sha256hex(str) {
    var raw = String(str), bytes = [], i
    /* UTF-8 编码 */
    for (i = 0; i < raw.length; i++) {
      var c = raw.charCodeAt(i)
      if (c < 0x80) bytes.push(c)
      else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 63))
      else if (c >= 0xd800 && c <= 0xdbff && i + 1 < raw.length) {
        var cp = 0x10000 + ((c - 0xd800) << 10) + (raw.charCodeAt(++i) - 0xdc00)
        bytes.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63))
      } else bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63))
    }
    var bitLen = bytes.length * 8
    bytes.push(0x80)
    while (bytes.length % 64 !== 56) bytes.push(0)
    bytes.push(0, 0, 0, 0, (bitLen >>> 24) & 255, (bitLen >>> 16) & 255, (bitLen >>> 8) & 255, bitLen & 255)
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]
    var w = new Array(64), t
    for (var off = 0; off < bytes.length; off += 64) {
      for (t = 0; t < 16; t++) {
        w[t] = ((bytes[off + 4 * t] << 24) | (bytes[off + 4 * t + 1] << 16) |
                (bytes[off + 4 * t + 2] << 8) | bytes[off + 4 * t + 3]) >>> 0
      }
      for (t = 16; t < 64; t++) {
        var s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3)
        var s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10)
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0
      }
      var a = H[0], b = H[1], c2 = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7]
      for (t = 0; t < 64; t++) {
        var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
        var ch = (e & f) ^ ((~e) & g)
        var t1 = (h + S1 + ch + K256[t] + w[t]) >>> 0
        var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
        var maj = (a & b) ^ (a & c2) ^ (b & c2)
        var t2 = (S0 + maj) >>> 0
        h = g; g = f; f = e; e = (d + t1) >>> 0
        d = c2; c2 = b; b = a; a = (t1 + t2) >>> 0
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0
      H[2] = (H[2] + c2) >>> 0; H[3] = (H[3] + d) >>> 0
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0
      H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0
    }
    return H.map(function (x) { return ('00000000' + (x >>> 0).toString(16)).slice(-8) }).join('')
  }
  function unlock(pass, cb) {
    var hex, hit = null
    try { hex = sha256hex(pass) } catch (e) { cb && cb(false); return }
    for (var i = 0; i < FRIENDS.length; i++) {
      if (FRIENDS[i].enabled && FRIENDS[i].hash === hex) { hit = FRIENDS[i]; break }
    }
    if (hit) Gate.open(hit.label, hit.scope)
    cb && cb(!!hit, hit && hit.label)
  }

  /* ---------- 专属链接 ?friend=<访问码> ---------- */
  function fromLink() {
    var key = null
    try {
      var q = new URLSearchParams(location.search)
      key = q.get('friend')
      if (!key && /^#friend=/.test(location.hash)) key = decodeURIComponent(location.hash.slice(8))
    } catch (e) {
      var r = /[?&]friend=([^&#]+)/.exec(location.href); if (r) key = decodeURIComponent(r[1])
    }
    if (!key) return false
    unlock(key, function (ok) {
      try {
        var u = new URL(location.href)
        u.searchParams.delete('friend')
        if (u.hash.indexOf('#friend=') === 0) u.hash = ''
        history.replaceState(null, '', u.pathname + u.search + u.hash)
      } catch (e) {}
      if (!ok) {
        var err = overlay && overlay.querySelector('.bj-gate-err')
        if (err) err.textContent = '链接不可用，请重新输入'
      }
    })
    return true
  }

  /* 锁定态点任何「对话 / 助手」入口 → 弹访问确认卡，而不是跳到空白页。
     用捕获阶段，抢在页面自带的 onclick 之前。 */
  function bindEntryGuard() {
    document.addEventListener('click', function (e) {
      if (isOpen() || !e.target || !e.target.closest) return
      var t = e.target.closest('a,button')
      if (!t) return
      var href = t.getAttribute('href') || ''
      var oc = t.getAttribute('onclick') || ''
      var hits = /(^|\/)(chat|agent|assistant|friends)\.html/i.test(href) ||
        /bja-fab|agent\.html|chat\.html|friends\.html|\.click\(\)/i.test(oc) ||
                 t.classList.contains('cta-tip') || t.classList.contains('ob-open')
      if (!hits) return
      e.preventDefault(); e.stopPropagation()
      if (!overlay) renderOverlay()
      var i = overlay.querySelector('.bj-gate-input'); if (i) i.focus()
    }, true)
  }

  function stopRedirect() {
    if (!GATED_PAGES.test(location.pathname) || isOpen()) return
    var metas = document.querySelectorAll('meta[http-equiv="refresh"]')
    for (var i = 0; i < metas.length; i++) {
      if (metas[i].parentNode) metas[i].parentNode.removeChild(metas[i])
    }
  }

  function boot() {
    /* ?gate=lock：本地模拟发布态，落进 localStorage 方便跨页一致 */
    try {
      if (/[?&]gate=lock(?:[&#]|$)/.test(location.href)) {
        localStorage.setItem(FORCE, '1')
        var u = new URL(location.href)
        u.searchParams.delete('gate')
        history.replaceState(null, '', u.pathname + u.search + u.hash)
      }
    } catch (e) {}

    var open = isOpen()
    stopRedirect()
    apply(open)
    bindEntryGuard()
    var linking = fromLink()
    /* 助手的 defer 脚本可能比本文件先跑完：已解锁时主动广播一次，
       确保它不会卡在「等事件」的状态。助手内部有 booted 去重，重复无副作用。 */
    if (open && !linking) emit(EVENT_OPEN)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot)
  else boot()
})()
