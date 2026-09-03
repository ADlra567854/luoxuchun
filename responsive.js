/* ============================================================
   responsive.js · 多端适配运行时 v1
   ① 补全 viewport-fit       ② 检测 方向/设备/双屏 → <html> 属性
   ③ 移动端汉堡菜单          ④ iframe 镜像式设备预览切换器
   注意：预览 iframe 内部(runtime 处于 iframe)不再构建预览控件，避免嵌套。
   ============================================================ */

  // 矢量图标：沿用站点 cc-ic CSS-mask 体系，自动继承文字颜色与字号
  function ic(name) {
    return '<i class="cc-ic" data-ic="' + name + '" aria-hidden="true"></i>'
  }
(function () {
  'use strict'
  if (window.__md_responsive) return
  window.__md_responsive = true

  var docEl = document.documentElement
  var isTop = (window.self === window.top)

  /* ---------- ① 视口元信息补全 ---------- */
  var vp = document.querySelector('meta[name=viewport]')
  if (vp) {
    var c = vp.getAttribute('content') || ''
    if (c.indexOf('viewport-fit') === -1) {
      vp.setAttribute('content', c + (c ? ', ' : '') + 'viewport-fit=cover')
    }
  }

  /* ---------- ② 设备 / 方向 / 双屏 检测 ---------- */
  function updateMode() {
    var w = window.innerWidth, h = window.innerHeight
    docEl.setAttribute('data-orientation', h >= w ? 'portrait' : 'landscape')
    var dev = w < 600 ? 'phone' : (w < 1024 ? 'tablet' : 'desktop')
    if (w >= 600 && w <= 900) dev = 'foldable'   // 折叠屏展开带
    docEl.setAttribute('data-device', dev)
    docEl.classList.remove('seg-h', 'seg-v')
    try {
      if (window.matchMedia('(horizontal-viewport-segments: 2)').matches) docEl.classList.add('seg-h')
      else if (window.matchMedia('(vertical-viewport-segments: 2)').matches) docEl.classList.add('seg-v')
    } catch (e) {}
  }
  window.addEventListener('resize', updateMode, { passive: true })
  window.addEventListener('orientationchange', function () { setTimeout(updateMode, 200) })
  updateMode()

  /* ---------- ③ 移动端汉堡菜单 ---------- */
  function buildBurger() {
    var nav = document.querySelector('nav')
    if (!nav || document.getElementById('mdBurger')) return
    var links = nav.querySelector('.nav-links')
    if (!links) return

    var burger = document.createElement('button')
    burger.id = 'mdBurger'; burger.className = 'md-burger'
    burger.type = 'button'; burger.setAttribute('aria-label', '打开菜单')
    burger.textContent = '☰'
    nav.appendChild(burger)

    var menu = document.createElement('div'); menu.className = 'md-mobile-menu'
    var scrim = document.createElement('div'); scrim.className = 'md-scrim'
    links.querySelectorAll('a').forEach(function (a) {
      menu.appendChild(a.cloneNode(true))
    })
    document.body.appendChild(scrim)
    document.body.appendChild(menu)

    function toggle(open) {
      document.body.classList.toggle('md-menu-open', open)
      burger.textContent = open ? '✕' : '☰'
    }
    burger.addEventListener('click', function (e) {
      e.stopPropagation()
      toggle(!document.body.classList.contains('md-menu-open'))
    })
    scrim.addEventListener('click', function () { toggle(false) })
    menu.addEventListener('click', function (e) { if (e.target.tagName === 'A') toggle(false) })
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false) })
  }

  /* ---------- ④ 设备预览切换器（iframe 镜像当前页） ---------- */
  function buildPreview() {
    if (!isTop || document.getElementById('mdPrev')) return
    var DEVS = [
      { k: 'phone', t: '手机', w: 390, h: 844 },
      { k: 'foldable', t: '折叠屏', w: 768, h: 900 },
      { k: 'tablet', t: '平板', w: 834, h: 1112 },
      { k: 'desktop', t: '桌面', w: 1440, h: 900 }
    ]
    var bar = document.createElement('div'); bar.id = 'mdPrev'
    var html = ''
    DEVS.forEach(function (d, i) {
      html += '<button data-k="' + d.k + '" data-w="' + d.w + '" data-h="' + d.h + '">' + d.t + '</button>'
      if (i < DEVS.length - 1) html += '<span class="md-sep"></span>'
    })
    html += '<span class="md-sep"></span><button data-act="rotate">⟳ 旋转</button>'
    bar.innerHTML = html
    document.body.appendChild(bar)

    var frame = document.createElement('div'); frame.id = 'mdFrame'
    frame.innerHTML =
      '<div class="md-label" id="mdLabel"></div>' +
      '<button class="md-close" id="mdClose" aria-label="关闭预览">' + ic('x') + '</button>' +
      '<div class="md-device" id="mdDevice"><iframe id="mdIframe" title="设备预览"></iframe></div>'
    document.body.appendChild(frame)
    var iframe = frame.querySelector('#mdIframe')
    var box = frame.querySelector('#mdDevice')
    var label = frame.querySelector('#mdLabel')
    var cur = { k: 'phone', w: 390, h: 844, rot: false }

    function render() {
      var W = cur.rot ? cur.h : cur.w
      var H = cur.rot ? cur.w : cur.h
      var availW = window.innerWidth - 48, availH = window.innerHeight - 48
      var scale = Math.min(availW / W, availH / H, 1)
      box.className = 'md-device md-' + cur.k
      box.style.width = W + 'px'; box.style.height = H + 'px'
      box.style.transform = 'scale(' + scale + ')'; box.style.transformOrigin = 'center center'
      var name = cur.k === 'phone' ? '手机' : cur.k === 'foldable' ? '折叠屏' : cur.k === 'tablet' ? '平板' : '桌面'
      label.textContent = name + ' · ' + W + '×' + H + (cur.rot ? ' · 横屏' : ' · 竖屏')
      var key = cur.k + (cur.rot ? 'r' : '')
      if (iframe.getAttribute('data-k') !== key) {
        iframe.setAttribute('data-k', key)
        iframe.src = location.href
      }
      frame.classList.add('show')
      bar.querySelectorAll('button[data-k]').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-k') === cur.k)
      })
    }
    function close() { frame.classList.remove('show'); iframe.src = 'about:blank' }

    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return
      if (b.getAttribute('data-act') === 'rotate') {
        if (frame.classList.contains('show')) { cur.rot = !cur.rot; render() }
        return
      }
      cur = { k: b.getAttribute('data-k'), w: +b.getAttribute('data-w'), h: +b.getAttribute('data-h'), rot: false }
      render()
    })
    frame.querySelector('#mdClose').addEventListener('click', close)
    frame.addEventListener('click', function (e) { if (e.target === frame) close() })
  }

  function init() {
    buildBurger()
    // buildPreview() 已禁用：设备预览切换器(手机/折叠屏/平板/桌面/旋转)按需求移除，不再注入
  }
  if (document.readyState !== 'loading') init()
  else document.addEventListener('DOMContentLoaded', init)
})()
