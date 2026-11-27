/* ==========================================================================
   float-dock.js · 统一悬浮坞（2026-10-29）
   --------------------------------------------------------------------------
   做一个「只加不改」的收纳层：
     全站右下角只保留一个入口，点开后向上浮出 5 个功能键：
       ① 问白驹   → 代理点击 #bj-fab（baiju-widget.js）
       ② 工作台   → 代理点击 #ccowork-pet（ccowork.js）
       ③ 搜索     → window.ccowSearchOpen()（search.js）
       ④ 外观     → 代理点击 #modGear（module.js）
       ⑤ 回顶部   → window.scrollTo（不依赖 #modTop 是否存在）

   为什么不直接改那三个原文件：
     它们在 649 / 392 / 553 个页面里各自加载，加载顺序不定，
     改任何一个都可能把别的页面带崩。这里用「代理点击 + CSS 隐藏原件」，
     原逻辑一行不动，坞只是替它们换了张脸。

   用法：<link rel="stylesheet" href="/float-dock.css"><script src="/float-dock.js" defer></script>
   ========================================================================== */
;(function () {
  'use strict'
  if (window.__CC_FLOAT_DOCK__) return
  window.__CC_FLOAT_DOCK__ = true

  var ICONS = {
    chat: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.9 9.9 0 0 1-3.5-.6L3 21l1.7-4.6A8.2 8.2 0 0 1 3.6 11.5a8.4 8.4 0 0 1 8.4-8.4 8.4 8.4 0 0 1 9 8.4Z"/>',
    desk: '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
    find: '<circle cx="10.8" cy="10.8" r="7.2"/><path d="m20.5 20.5-4.7-4.7"/>',
    skin: '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.9 2-2 0-1.6-1.4-1.7-1.4-2.7 0-.8.7-1.3 1.6-1.3H16a5 5 0 0 0 5-5C21 6.2 17 3 12 3Z"/><circle cx="8.2" cy="9.6" r="1.1"/><circle cx="12" cy="7.4" r="1.1"/><circle cx="15.6" cy="9.4" r="1.1"/>',
    top: '<path d="M12 19V5"/><path d="m5.5 11.5 6.5-6.5 6.5 6.5"/>'
  }
  function svg(name) {
    return '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (ICONS[name] || '') + '</svg>'
  }

  var BASE = '/'
  function css() {
    if (document.querySelector('link[href*="float-dock.css"]')) return
    // 不写死站点根：以本脚本的 src 前缀为准，子目录部署也能找到
    var s = document.currentScript || document.querySelector('script[src*="float-dock.js"]')
    try {
      if (s && s.src) BASE = s.src.replace(/float-dock\.js(\?.*)?$/, '')
    } catch (e) {}
    var l = document.createElement('link')
    l.rel = 'stylesheet'
    l.href = BASE + 'float-dock.css'
    document.head.appendChild(l)
  }

  function click(id) {
    var n = document.getElementById(id)
    if (!n) return false
    try { n.click(); return true } catch (e) { return false }
  }
  function openSettings() {
    if (click('modGear')) return true
    var st = document.getElementById('modSettings')
    if (st) { st.classList.add('show'); return true }
    return false
  }
  function openSearch() {
    if (typeof window.ccowSearchOpen === 'function') {
      try { window.ccowSearchOpen(); return true } catch (e) {}
    }
    return click('ccowSearchBtn')
  }
  /* 白驹组件只在 392 个页面里静态引入。坞是全站挂的，
     所以缺的时候自己补一次加载（baiju-widget.js 自带幂等开关，
     已加载过的页面不会重复建 DOM）。 */
  function ensureBaiju(cb) {
    var fab = document.getElementById('bj-fab')
    if (fab) return cb(true)
    if (window.__BAIJU_LOADING__) return cb(false)
    window.__BAIJU_LOADING__ = true
    var s = document.createElement('script')
    s.src = BASE + 'baiju-widget.js'
    s.onload = function () {
      setTimeout(function () { cb(!!document.getElementById('bj-fab')) }, 80)
    }
    s.onerror = function () { cb(false) }
    document.head.appendChild(s)
  }

  function mount() {
    if (document.querySelector('.fdock')) return
    css()

    var dock = document.createElement('div')
    dock.className = 'fdock'
    dock.innerHTML =
      '<div class="fdock-items" role="group" aria-label="快捷功能">' +
        '<button class="fdock-btn" type="button" data-act="top" aria-label="回到顶部" title="回到顶部">' +
          svg('top') + '<span class="fdock-tip">回到顶部</span></button>' +
        '<button class="fdock-btn" type="button" data-act="skin" aria-label="外观与偏好" title="外观与偏好">' +
          svg('skin') + '<span class="fdock-tip">外观</span></button>' +
        '<button class="fdock-btn" type="button" data-act="find" aria-label="全站搜索" title="全站搜索">' +
          svg('find') + '<span class="fdock-tip">搜索</span></button>' +
        '<button class="fdock-btn" type="button" data-act="desk" aria-label="ccowork 工作台" title="ccowork 工作台">' +
          svg('desk') + '<span class="fdock-tip">工作台</span></button>' +
        '<button class="fdock-btn" type="button" data-act="chat" aria-label="问白驹" title="问白驹">' +
          svg('chat') + '<span class="fdock-tip">问白驹</span></button>' +
      '</div>' +
      '<button class="fdock-main" type="button" aria-expanded="false" aria-label="快捷功能">' +
        '<span class="fdock-mark">驹</span><span class="fdock-x"></span></button>'

    document.body.appendChild(dock)

    var main = dock.querySelector('.fdock-main')
    var items = dock.querySelectorAll('.fdock-btn')

    function setOpen(on) {
      dock.classList.toggle('open', !!on)
      main.setAttribute('aria-expanded', on ? 'true' : 'false')
      main.setAttribute('aria-label', on ? '收起快捷功能' : '快捷功能')
    }
    main.addEventListener('click', function () {
      setOpen(!dock.classList.contains('open'))
    })

    // 后台脚本可能比坞晚到（defer 时序），延迟一帧再判可用性
    function markAvailable() {
      items.forEach(function (b) {
        var a = b.getAttribute('data-act')
        var ok = true
        /* chat 恒可用：缺组件时点击会补加载，不再标灰 */
        if (a === 'chat') ok = true
        if (a === 'desk') ok = !!document.getElementById('ccowork-pet')
        if (a === 'skin') ok = !!(document.getElementById('modGear') || document.getElementById('modSettings'))
        if (a === 'find') ok = (typeof window.ccowSearchOpen === 'function') || !!document.getElementById('ccowSearchBtn')
        b.setAttribute('data-off', ok ? '0' : '1')
        b.disabled = !ok
      })
    }
    markAvailable()
    setTimeout(markAvailable, 1200)

    items.forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.getAttribute('data-off') === '1') return
        var a = b.getAttribute('data-act')
        if (a === 'top') {
          window.scrollTo({ top: 0, behavior: 'smooth' })
          setOpen(false)
          return
        }
        if (a === 'skin') { openSettings(); setOpen(false); return }
        if (a === 'find') { openSearch(); setOpen(false); return }
        if (a === 'chat') {
          setOpen(false)
          ensureBaiju(function (ok) {
            if (!ok) return
            var fab = document.getElementById('bj-fab')
            var panel = document.getElementById('bj-panel')
            if (panel && panel.classList.contains('show')) {
              click('bj-close')
            } else if (fab) {
              fab.click()
            }
            setTimeout(syncChatState, 40)
          })
          return
        }
        if (a === 'desk') { click('ccowork-pet'); setOpen(false); return }
      })
    })

    /* 白驹面板开着时给主按钮打点，用户一眼知道「下面还有一层」 */
    function syncChatState() {
      var p = document.getElementById('bj-panel')
      main.setAttribute('data-active', p && p.classList.contains('show') ? '1' : '0')
    }
    document.addEventListener('click', function (e) {
      if (dock.contains(e.target)) return
      if (dock.classList.contains('open')) setOpen(false)
      // 面板自身的开关也走这里，延后一拍读状态
      setTimeout(syncChatState, 30)
    })
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Esc') setOpen(false)
    })
    // 面板可能在别处被打开/关闭，统一观察
    var panel = document.getElementById('bj-panel')
    if (panel && window.MutationObserver) {
      new MutationObserver(syncChatState).observe(panel, { attributes: true, attributeFilter: ['class'] })
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount)
  } else {
    mount()
  }
})()
