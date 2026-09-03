/* module.js · 模块统一增强层（v24）
 * 为每一个模块页增量增强（不改动页面原有结构）：
 *   ① 阅读进度条  ② 返回顶部  ③ 吸顶目录条 TOC（标题≥4）  ④ 全局外观设置悬浮窗
 *   ⑤ 全站搜索（懒加载）  ⑥ 轻量统计与热榜（懒加载）  ⑦ 章节打卡与学习进度（C2）
 *   ⑧ AI 助教（C4：章节页注入 ai-tutor.js，上下文感知答疑）
 * 用法：页面 </body> 前 <script src="/module.js"></script>
 */

  // 矢量图标：沿用站点 cc-ic CSS-mask 体系，自动继承文字颜色与字号
  function ic(name) {
    return '<i class="cc-ic" data-ic="' + name + '" aria-hidden="true"></i>'
  }
(function () {
  'use strict'
  if (window.__module_enhance) return
  window.__module_enhance = true

  var HEAD = document.head || document.getElementsByTagName('head')[0]
  var LS = {
    get: function (k) { try { return localStorage.getItem(k) || '' } catch (e) { return '' } },
    set: function (k, v) { try { localStorage.setItem(k, v) } catch (e) {} }
  }

  // ---------- 注入样式（A4：全部 token 化，硬编码仅允许出现在 theme-cloud.css 引擎层） ----------
  var css = '' +
    /* ① 进度条 */
    '#modProgress{position:fixed;top:0;left:0;height:3px;width:0;z-index:9990;background:linear-gradient(120deg,#5eead4,#38e1ff 40%,#5b8cff 75%,#8b5cf6);transition:width .1s}' +
    /* ② 返回顶部 */
    '#modTop{position:fixed;right:16px;bottom:84px;z-index:9991;width:44px;height:44px;border-radius:50%;border:1px solid var(--line);background:var(--gear-bg);color:var(--cyan);font-size:20px;cursor:pointer;opacity:0;transform:translateY(12px);transition:.3s;backdrop-filter:blur(8px)}' +
    '#modTop.show{opacity:1;transform:none}' +
    '#modTop:hover{border-color:var(--cyan);box-shadow:0 8px 24px rgba(56,225,255,.4)}' +
    /* ③ 吸顶目录条（z-index 9990 · B8 根治 A3 移动端遮挡遗留） */
    '#modTocBar{position:fixed;left:0;right:0;top:56px;z-index:9990;display:flex;align-items:center;gap:10px;padding:7px 16px;' +
      'background:var(--nav-bg);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);' +
      'border-bottom:1px solid var(--nav-line);box-shadow:var(--nav-shadow);' +
      'font-family:var(--sans,"PingFang SC","Microsoft YaHei",sans-serif);opacity:0;transform:translateY(-8px);transition:.3s;pointer-events:none}' +
    '#modTocBar.show{opacity:1;transform:none;pointer-events:auto}' +
    '#modTocBar.hidden{display:none}' +
    '#modTocBar .t-title{display:flex;align-items:center;gap:6px;flex:none;color:var(--text);font-size:13px;font-weight:700;white-space:nowrap}' +
    '#modTocBar .t-title .ic{font-size:14px}' +
    '#modTocBar .t-list{flex:1;display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;padding:2px 0;mask-image:linear-gradient(90deg,transparent,#000 12px,#000 calc(100% - 12px),transparent)}' +
    '#modTocBar .t-list::-webkit-scrollbar{display:none}' +
    '#modTocBar .t-list a{flex:none;text-decoration:none;color:var(--muted);font-size:12.5px;padding:4px 11px;border-radius:999px;white-space:nowrap;transition:.2s;border:1px solid transparent}' +
    '#modTocBar .t-list a:hover{color:var(--blue);background:var(--nav-chip-bg)}' +
    '#modTocBar .t-list a.lv3{padding-left:18px;font-size:11.5px}' +
    '#modTocBar .t-list a.active{color:#fff;background:var(--grad);border-color:transparent}' +
    '#modTocBar .t-actions{flex:none;display:flex;align-items:center;gap:6px}' +
    '#modTocBar .t-btn{width:30px;height:30px;border-radius:50%;border:1px solid var(--line);background:transparent;color:var(--muted);font-size:14px;cursor:pointer;transition:.2s;display:flex;align-items:center;justify-content:center}' +
    '#modTocBar .t-btn:hover{color:var(--blue);border-color:var(--blue)}' +
    /* 导航设置入口（injectNavGear 注入 · 类名化 B4/B11，样式走组件层） */
    '.nav-gear{margin-left:8px;flex-shrink:0;cursor:pointer;width:34px;height:34px;border-radius:9px;border:1px solid var(--line);background:var(--nav-chip-bg);color:var(--muted);font-size:15px;line-height:1;display:inline-flex;align-items:center;justify-content:center;transition:color .18s,border-color .18s,transform .18s}' +
    '.nav-gear:hover{color:var(--blue);border-color:var(--blue);transform:rotate(20deg)}' +
    'body[data-theme="deep"] .nav-gear:hover{color:var(--cyan);border-color:var(--cyan)}' +
    /* ④ 外观设置悬浮窗 */
    '#modGear{position:fixed;left:16px;bottom:16px;z-index:9991;width:44px;height:44px;border-radius:50%;border:1px solid var(--line);background:var(--gear-bg);color:var(--gold);font-size:18px;cursor:pointer;transition:.3s;backdrop-filter:blur(8px)}' +
    '#modGear:hover{border-color:var(--gold);transform:rotate(20deg)}' +
    '#modSettings{position:fixed;right:16px;top:64px;z-index:9995;width:min(310px,calc(100vw - 32px));max-height:calc(100vh - 120px);overflow-y:auto;border-radius:18px;padding:16px 18px;' +
      'background:var(--glass-strong);border:1px solid var(--line);box-shadow:var(--float-shadow);backdrop-filter:blur(18px);' +
      'font-family:var(--sans,"PingFang SC","Microsoft YaHei",sans-serif);color:var(--text);transform:translateY(-10px) scale(.97);opacity:0;pointer-events:none;transition:.26s}' +
    '#modSettings.show{transform:none;opacity:1;pointer-events:auto}' +
    '#modSettings .s-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}' +
    '#modSettings .s-head b{font-size:15px;font-weight:900;background:linear-gradient(120deg,#0ea5e9,#6366f1,#d946ef);-webkit-background-clip:text;background-clip:text;color:transparent}' +
    'body[data-theme="deep"] #modSettings .s-head b{background:linear-gradient(120deg,#5eead4,#38e1ff,#5b8cff);-webkit-background-clip:text;background-clip:text;color:transparent}' +
    '#modSettings .s-close{width:28px;height:28px;border-radius:50%;border:1px solid var(--line);background:transparent;color:var(--muted);font-size:15px;cursor:pointer;transition:.2s}' +
    '#modSettings .s-close:hover{color:var(--text);border-color:var(--text)}' +
    '#modSettings .s-row{display:flex;align-items:center;gap:10px;margin-bottom:11px}' +
    '#modSettings .s-row > span{width:42px;flex:none;font-size:12.5px;color:var(--muted);font-weight:600}' +
    '#modSettings .s-seg{display:flex;gap:6px;flex:1}' +
    '#modSettings .s-seg button{flex:1;border:1px solid var(--line);background:var(--panel);color:var(--text);border-radius:10px;padding:8px 4px;font-size:12px;cursor:pointer;transition:.2s;font-family:inherit}' +
    '#modSettings .s-seg button.on{background:var(--grad);color:#fff;border-color:transparent;font-weight:700}' +
    'body[data-theme="deep"] #modSettings .s-seg button.on{background:linear-gradient(120deg,#5eead4,#38e1ff,#5b8cff);color:#04101f}' +
    '#modSettings select{flex:1;background:var(--card);border:1px solid var(--line);color:var(--text);border-radius:10px;padding:8px 10px;font-size:12px;outline:none;font-family:inherit;cursor:pointer;transition:.2s}' +
    '#modSettings select:hover{border-color:var(--cyan)}' +
    '#modSettings .s-tip{margin-top:4px;font-size:11px;color:var(--dim);text-align:center}' +
    '@media(max-width:640px){#modTocBar{padding:6px 10px;gap:6px}#modTocBar .t-title{display:none}#modSettings{top:56px}}'
  var st = document.createElement('style')
  st.textContent = css
  HEAD.appendChild(st)

  // ---------- ① 进度条 ----------
  var bar = document.createElement('div')
  bar.id = 'modProgress'
  document.body.appendChild(bar)

  // ---------- ② 返回顶部 ----------
  var back = document.createElement('button')
  back.id = 'modTop'
  back.type = 'button'
  back.textContent = '↑'
  back.title = '返回顶部'
  document.body.appendChild(back)
  back.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }) })

  // ---------- ④ 外观设置悬浮窗（全局，先于 TOC 创建，供导航/齿轮调用） ----------
  // 读取并应用记忆（与 ccowork.js 共用 localStorage 键，单一真源）
  function readLS(k) { return LS.get(k) }
  function writeLS(k, v) { LS.set(k, v) }
  function applyAttr(attr, val) {
    try { document.body.setAttribute(attr, val) } catch (e) {}
    if (attr === 'data-theme') {
      writeLS('ccowork.theme', val)
      // A4 B1 桥接：旧键 baiju-config-v2 若存在则同步 deep 字段（双向一致，防未来误读）
      try {
        var old = JSON.parse(localStorage.getItem('baiju-config-v2') || 'null')
        if (old && typeof old === 'object') { old.deep = (val === 'deep'); localStorage.setItem('baiju-config-v2', JSON.stringify(old)) }
      } catch (e) {}
    }
    if (attr === 'data-wall') writeLS('ccowork.wall', val)
    if (attr === 'data-font') writeLS('ccowork.font', val)
    // 主题/壁纸切换时平滑过渡，避免黑↔浅闪变
    var b = document.body
    if (!b.classList.contains('theme-fading')) {
      b.classList.add('theme-fading')
      setTimeout(function () { b.classList.remove('theme-fading') }, 550)
    }
  }
  (function initAppearance() {
    try {
      var t = readLS('ccowork.theme'); if (t) document.body.setAttribute('data-theme', t)
      var w = readLS('ccowork.wall'); if (w) document.body.setAttribute('data-wall', w)
      var f = readLS('ccowork.font'); if (f) document.body.setAttribute('data-font', f)
    } catch (e) {}
  })()

  var settings = document.createElement('div')
  settings.id = 'modSettings'
  settings.setAttribute('role', 'dialog')
  settings.setAttribute('aria-modal', 'false')
  settings.setAttribute('aria-labelledby', 'modSettingsTitle')
  settings.innerHTML =
    '<div class="s-head"><b id="modSettingsTitle"><i class="cc-ic" data-ic="palette" aria-hidden="true"></i> 外观设置</b><button class="s-close" type="button" title="关闭" aria-label="关闭设置"><i class="cc-ic" data-ic="x" aria-hidden="true"></i></button></div>' +
    '<div class="s-row"><span>主题</span><div class="s-seg">' +
      '<button type="button" data-theme-set="cloud">云顶</button>' +
      '<button type="button" data-theme-set="deep">深空</button>' +
    '</div></div>' +
    '<div class="s-row"><span>壁纸</span><select id="modWall" title="壁纸">' +
      '<option value="">默认壁纸</option>' +
      '<option value="cloud-hero">天空城</option><option value="garden">空中花园</option>' +
      '<option value="train">云轨列车</option><option value="island">天空岛屿</option>' +
      '<option value="cafe">云顶咖啡</option>' +
      '<option value="epoch">深空图书馆</option><option value="nebula">星云</option>' +
      '<option value="city">赛博都市</option>' +
    '</select></div>' +
    '<div class="s-row"><span>字体</span><select id="modFont" title="字体">' +
      '<option value="">默认字体</option><option value="round">圆体</option>' +
      '<option value="hei">黑体</option><option value="song">宋体</option>' +
      '<option value="hand">手写</option><option value="mono">等宽</option>' +
    '</select></div>' +
    '<div class="s-tip">全站生效 · 自动记忆</div>'
  document.body.appendChild(settings)
  var setClose = settings.querySelector('.s-close')
  var lastFocus = null
  function openSettings(trigger) {
    lastFocus = (trigger && trigger.focus) ? trigger : document.activeElement
    settings.classList.add('show')
    var first = settings.querySelector('.s-seg button, select, .s-close')
    if (first) try { first.focus() } catch (e) {}
  }
  function closeSettings(restoreFocus) {
    settings.classList.remove('show')
    if (restoreFocus !== false && lastFocus && lastFocus.focus) try { lastFocus.focus() } catch (e) {}
  }
  setClose.addEventListener('click', closeSettings)
  // Esc 关闭浮层与 TOC（无障碍 · B6）
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      closeSettings()
      var tb = document.getElementById('modTocBar')
      if (tb) tb.classList.remove('show')
    }
  })
  var wallSel = settings.querySelector('#modWall')
  var fontSel = settings.querySelector('#modFont')
  function syncThemeSeg() {
    var cur = document.body.getAttribute('data-theme') === 'deep' ? 'deep' : 'cloud'
    settings.querySelectorAll('.s-seg button').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-theme-set') === cur)
    })
  }
  settings.querySelectorAll('.s-seg button').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = b.getAttribute('data-theme-set')
      applyAttr('data-theme', v)
      syncThemeSeg()
      // 切主题时联动默认壁纸（用户未手动选壁纸才联动）
      if (!wallSel.value) {
        wallSel.value = v === 'deep' ? 'epoch' : 'cloud-hero'
        applyAttr('data-wall', wallSel.value)
      }
    })
  })
  wallSel.value = document.body.getAttribute('data-wall') || ''
  fontSel.value = document.body.getAttribute('data-font') || ''
  wallSel.addEventListener('change', function () { applyAttr('data-wall', wallSel.value) })
  fontSel.addEventListener('change', function () { applyAttr('data-font', fontSel.value) })
  syncThemeSeg()

  // 悬浮齿轮（常驻，保证任意页面都能开设置）
  var gear = document.createElement('button')
  gear.id = 'modGear'
  gear.type = 'button'
  gear.innerHTML = '<i class="cc-ic" data-ic="settings" aria-hidden="true"></i>'
  gear.title = '外观设置'
  document.body.appendChild(gear)
  gear.addEventListener('click', function () {
    if (settings.classList.contains('show')) closeSettings()
    else openSettings(gear)
  })
  // 点击设置窗外区域关闭（不抢焦点）
  document.addEventListener('click', function (e) {
    if (settings.classList.contains('show') && !settings.contains(e.target) && e.target !== gear && !gear.contains(e.target)) {
      closeSettings(false)
    }
  })

  // 把 ⚙️ 入口注入到站点导航栏（"导航设置应该在导航里"）
  function injectNavGear() {
    try {
      var nav = document.querySelector('nav, header .wrap > nav, .topbar, #topbar')
      if (!nav) return
      if (nav.querySelector('#modNavGear')) return
      var nb = document.createElement('button')
      nb.id = 'modNavGear'
      nb.type = 'button'
      nb.innerHTML = '<i class="cc-ic" data-ic="settings" aria-hidden="true"></i>'
      nb.title = '外观设置'
      nb.setAttribute('aria-label', '外观设置')
      nb.className = 'nav-gear'   // A4 B4/B11：样式走组件层 token，不再 style.cssText 内联
      nb.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); openSettings(nb) })
      var actions = nav.querySelector('.nav-actions') || nav
      actions.appendChild(nb)
    } catch (e) {}
  }
  injectNavGear()

  // ---------- ③ 吸顶目录条 TOC ----------
  // 目录页抑制：<main class="no-toc"> / <body class="no-toc"> / URL 含 ?no-toc 均不生成
  var bodyCls = (document.body.className || '') + ' ' + ((document.querySelector('main') || {}).className || '')
  var isNoToc = bodyCls.indexOf('no-toc') !== -1 || /[?&]no-toc/.test(location.search)
  var tocClosed = LS.get('ccowork.tocBarClosed') === '1'
  var heads = isNoToc ? [] : [].slice.call(document.querySelectorAll('article h2, article h3, .content h2, .content h3, main h2, main h3'))
  if (heads.length < 4 && !isNoToc) heads = [].slice.call(document.querySelectorAll('h2, h3'))
  if (heads.length >= 4) {
    var tocbar = document.createElement('nav')
    tocbar.id = 'modTocBar'
    var title = document.title.split('·')[0].trim() || '本页目录'
    var listHtml = ''
    heads.forEach(function (h, i) {
      if (!h.id) h.id = 'h-' + i
      var lv = h.tagName === 'H3' ? 'lv3' : ''
      listHtml += '<a class="' + lv + '" href="#' + h.id + '" data-t="h-' + i + '">' + (h.textContent || '').slice(0, 20) + '</a>'
    })
    tocbar.innerHTML =
      '<div class="t-title"><span class="ic"><i class="cc-ic" data-ic="list" aria-hidden="true"></i></span>' + title + '</div>' +
      '<div class="t-list">' + listHtml + '</div>' +
      '<div class="t-actions">' +
        '<button class="t-btn" id="modTocGear" type="button" title="外观设置"><i class="cc-ic" data-ic="settings" aria-hidden="true"></i></button>' +
        '<button class="t-btn" id="modTocClose" type="button" title="关闭目录"><i class="cc-ic" data-ic="x" aria-hidden="true"></i></button>' +
      '</div>'
    document.body.appendChild(tocbar)

    // 动态定位到导航栏正下方（导航是 fixed，需避开；gap 恒为 0 紧密衔接）
    function placeBar() {
      try {
        var nav = document.querySelector('nav, header .wrap > nav, .topbar, #topbar')
        var top = 64   // B5：兜底对齐桌面导航高 64px（原 56 会遮 8px）
        if (nav) {
          var r = nav.getBoundingClientRect()
          if (r.height) top = Math.max(0, Math.round(r.bottom))
        }
        tocbar.style.top = top + 'px'
        settings.style.top = (top + 8) + 'px'
      } catch (e) {}
    }
    placeBar()
    requestAnimationFrame(placeBar)           // 首帧后再校一次（字体/布局 settle 前）
    window.addEventListener('resize', placeBar)
    window.addEventListener('scroll', placeBar, { passive: true })
    // A4 B5 补强：导航高度可能因字体/换行在加载后变化
    window.addEventListener('load', function () { setTimeout(placeBar, 60); setTimeout(placeBar, 400) })
    setTimeout(placeBar, 300)
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeBar).catch(function () {})
    // 导航自身尺寸变化（换行/字体/折叠）→ 立即重定位，保证 0 间隙
    try {
      var navEl0 = document.querySelector('nav, header .wrap > nav, .topbar, #topbar')
      if (navEl0 && 'ResizeObserver' in window) {
        new ResizeObserver(function () { placeBar() }).observe(navEl0)
      }
    } catch (e) {}

    if (tocClosed) tocbar.classList.add('hidden')
    else tocbar.classList.add('show')

    // 关闭目录（记忆）
    tocbar.querySelector('#modTocClose').addEventListener('click', function () {
      tocbar.classList.remove('show')
      tocbar.classList.add('hidden')
      LS.set('ccowork.tocBarClosed', '1')
    })
    // 目录条里的设置按钮
    tocbar.querySelector('#modTocGear').addEventListener('click', function (e) {
      e.preventDefault(); openSettings(tocbar.querySelector('#modTocGear'))
    })
    // 锚点平滑滚动
    tocbar.querySelector('.t-list').addEventListener('click', function (e) {
      var a = e.target.closest('a')
      if (a) { e.preventDefault(); var el = document.getElementById(a.getAttribute('data-t')); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
    })
    // scroll-spy
    var links = [].slice.call(tocbar.querySelectorAll('.t-list a'))
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (en.isIntersecting) {
            links.forEach(function (l) { l.classList.remove('active') })
            var act = tocbar.querySelector('.t-list a[data-t="' + en.target.id + '"]')
            if (act) act.classList.add('active')
          }
        })
      }, { rootMargin: '-30% 0px -65% 0px' })
      heads.forEach(function (h) { io.observe(h) })
    }
  }

  // ---------- 滚动联动 ----------
  function onScroll() {
    var h = document.documentElement
    var stp = h.scrollTop || document.body.scrollTop
    var sh = (h.scrollHeight - h.clientHeight) || 1
    bar.style.width = (stp / sh * 100) + '%'
    if (stp > 420) back.classList.add('show'); else back.classList.remove('show')
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
  onScroll()

  // ---------- B1 内容运营：文章读完互动 CTA（长文页底部，注入层幂等） ----------
  try {
    if (!document.getElementById('modCtaCss')) {
      var ctaStyle = document.createElement('style')
      ctaStyle.id = 'modCtaCss'
      ctaStyle.textContent = '#modReadCta{margin:40px auto 8px;padding:22px 24px;border-radius:16px;border:1px solid var(--nav-line,#e3ebf5);background:var(--card,#fff);box-shadow:0 6px 24px rgba(30,41,59,.06)}'
        + '#modReadCta .cta-brand{font-size:13px;color:var(--muted,#475569);margin-bottom:10px}'
        + '#modReadCta .cta-btns{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0 14px}'
        + '#modReadCta .cta-btn{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:999px;border:1px solid var(--nav-line,#e3ebf5);background:var(--glass-strong,rgba(255,255,255,.82));color:var(--text,#1e293b);font-size:14px;cursor:pointer;text-decoration:none;transition:transform .15s,box-shadow .15s}'
        + '#modReadCta .cta-btn:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(79,140,255,.18)}'
        + '#modReadCta .cta-btn.primary{background:linear-gradient(120deg,#4f8cff,#38b6ff 50%,#8b5cf6);color:#fff;border-color:transparent}'
        + '#modReadCta .cta-links{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:13px}'
        + '#modReadCta .cta-links a{color:var(--muted,#475569);text-decoration:none;border-bottom:1px dashed var(--nav-line,#dbe4f0)}'
        + '#modReadCta .cta-links a:hover{color:#38b6ff}'
        + '#modReadCta .cta-tip{font-size:12px;color:var(--muted,#94a3b8);margin-top:10px}'
        + '#modReadCta .cta-tip.ok{color:#22c55e}'
      document.head.appendChild(ctaStyle)
    }
    var art = document.querySelector('article')
    if (art && !document.getElementById('modReadCta')) {
      var artLen = (art.innerText || art.textContent || '').length
      if (artLen > 800) {
        var cta = document.createElement('div')
        cta.id = 'modReadCta'
        cta.innerHTML = '<div class="cta-brand"><i class="cc-mark" aria-hidden="true"></i> 白驹全局大脑 · 把散落的 AI 工具装进一个大脑</div>'
          + '<div style="font-size:15px;font-weight:600;color:var(--text,#1e293b)">读完了？别让这篇内容只躺在你的标签页里</div>'
          + '<div class="cta-btns">'
          + '<button class="cta-btn primary" data-cta="share">' + ic('share-2') + ' 分享给需要的人</button>'
          + '<button class="cta-btn" data-cta="copy">' + ic('link') + ' 复制链接</button>'
          + '</div>'
          + '<div class="cta-links">'
          + '<a href="/blog/index.html"><i class="cc-ic" data-ic="library-big" aria-hidden="true"></i> 更多深度长文</a>'
          + '<a href="/website/ai-academy.html"><i class="cc-ic" data-ic="graduation-cap" aria-hidden="true"></i> AI 学院 30 章</a>'
          + '<a href="/index.html"><i class="cc-ic" data-ic="house" aria-hidden="true"></i> 回到首页</a>'
          + '</div>'
          + '<div class="cta-tip" id="ctaTip"></div>'
        art.appendChild(cta)
        var tip = cta.querySelector('#ctaTip')
        cta.querySelector('[data-cta="copy"]').addEventListener('click', function () {
          var url = location.href
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(function () {
              tip.textContent = '链接已复制，粘贴给朋友吧'; tip.classList.add('ok')
            }, function () { tip.textContent = '复制失败，请手动复制地址栏链接' })
          } else {
            var ta = document.createElement('textarea'); ta.value = url
            document.body.appendChild(ta); ta.select()
            try { document.execCommand('copy'); tip.textContent = '链接已复制'; tip.classList.add('ok') } catch (e) { tip.textContent = '复制失败，请手动复制地址栏链接' }
            document.body.removeChild(ta)
          }
        })
        cta.querySelector('[data-cta="share"]').addEventListener('click', function () {
          var shareData = { title: document.title, url: location.href }
          if (navigator.share) {
            navigator.share(shareData).catch(function () {})
          } else {
            var url = location.href
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(url).then(function () { tip.textContent = '链接已复制，去分享吧'; tip.classList.add('ok') })
            } else { tip.textContent = '分享：复制地址栏链接发给朋友' }
          }
        })
      }
    }
  } catch (e) {}

  // ---------- ⑤ 全站搜索（A3：独立模块懒加载，导航注入由 search.js 自管） ----------
  try {
    if (!document.querySelector('script[src*="search.js"]')) {
      var s = document.createElement('script')
      s.src = '/search.js'
      s.async = true
      document.body.appendChild(s)
    }
  } catch (e) {}

  // ---------- ⑥ 轻量统计与热榜（B4：本地埋点 + 首页热榜，懒加载） ----------
  try {
    if (!document.querySelector('script[src*="stats.js"]')) {
      var st = document.createElement('script')
      st.src = '/stats.js'
      st.async = true
      document.body.appendChild(st)
    }
  } catch (e) {}

  // ---------- ⑦ 章节打卡与学习进度（C2：章节页注入 + 全局进度查询 API） ----------
  try {
    // 进度数据读写（全局，供所有页面使用）
    var PROGRESS_KEY = 'ccowork.progress'
    var TOTAL_CHAPTERS = 36
    function getProgress() {
      try {
        var raw = localStorage.getItem(PROGRESS_KEY)
        return raw ? JSON.parse(raw) : { chapters: {}, labs: {}, streak: 0, lastCheckIn: '', totalCompleted: 0, startedAt: '' }
      } catch (e) { return { chapters: {}, labs: {}, streak: 0, lastCheckIn: '', totalCompleted: 0, startedAt: '' } }
    }
    function saveProgress(p) {
      try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)) } catch (e) {}
    }
    function todayStr() {
      var d = new Date()
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    }
    function calcStreak(p) {
      if (!p.lastCheckIn) return 0
      var today = new Date(todayStr())
      var last = new Date(p.lastCheckIn)
      var diff = Math.floor((today - last) / (1000 * 60 * 60 * 24))
      if (diff === 0) return p.streak || 1
      if (diff === 1) return p.streak || 1
      return 0
    }

    // 暴露进度查询 API（供学院首页/路线图/测验页使用）
    window.CCOWorkProgress = {
      get: getProgress,
      save: saveProgress,
      isChapterCompleted: function (chId) {
        var p = getProgress()
        return !!(p.chapters[chId] && p.chapters[chId].completedAt)
      },
      getCompletedCount: function () {
        var p = getProgress()
        return p.totalCompleted || Object.keys(p.chapters).filter(function(k) { return p.chapters[k] && p.chapters[k].completedAt }).length
      },
      TOTAL_CHAPTERS: TOTAL_CHAPTERS,
      // ---------- C3：实验打卡（lab 仿真纳入学习路径） ----------
      getLabs: function () {
        var p = getProgress()
        return p.labs || {}
      },
      isLabCompleted: function (labId) {
        var p = getProgress()
        return !!(p.labs && p.labs[labId] && p.labs[labId].completedAt)
      },
      recordLab: function (labId, title) {
        var p = getProgress()
        if (!p.labs) p.labs = {}
        if (p.labs[labId] && p.labs[labId].completedAt) return false   // 已记录
        p.labs[labId] = { title: title || labId, completedAt: Date.now() }
        var today = todayStr()
        if (!p.startedAt) p.startedAt = today
        if (p.lastCheckIn !== today) {                                // 实验也算学习日
          var streak = calcStreak(p)
          p.streak = streak + 1
          p.lastCheckIn = today
        }
        saveProgress(p)
        return true
      },
      // ---------- C4：AI 助教互动统计（轻量，供学院首页展示） ----------
      getTutor: function () {
        try {
          var t = JSON.parse(localStorage.getItem('ccowork.tutor') || 'null')
          return (t && typeof t === 'object') ? t : { asked: 0, history: [] }
        } catch (e) { return { asked: 0, history: [] } }
      }
    }

    // ---------- C5：首页学院入口「我的进度」迷你展示（P5，转化钩子：回访用户看到自己的数字） ----------
    try {
      var homeAcadCard = document.querySelector('a.wcard[href*="ai-academy"] .cb')
      if (homeAcadCard && !document.getElementById('homeAcadProg')) {
        var progData = getProgress()
        var doneCh = Object.keys(progData.chapters).filter(function (k) { return progData.chapters[k] && progData.chapters[k].completedAt }).length
        var labsCount = Object.keys(progData.labs || {}).length
        var certCount = 0
        try {
          var certRaw = localStorage.getItem('ccowork.certs')
          certCount = certRaw ? Object.keys(JSON.parse(certRaw)).length : 0
        } catch (e) {}
        var streak = progData.streak || 0
        var progSpan = document.createElement('span')
        progSpan.id = 'homeAcadProg'
        progSpan.className = 'tg'
        if (doneCh > 0 || labsCount > 0 || certCount > 0) {
          var parts = []
          if (doneCh > 0) parts.push('已学 ' + doneCh + '/' + TOTAL_CHAPTERS + ' 章')
          if (certCount > 0) parts.push('证书 ' + certCount + ' 张')
          if (labsCount > 0) parts.push('实验 ' + labsCount + ' 个')
          if (streak > 0) parts.push('连续 ' + streak + ' 天')
          progSpan.textContent = '📈 ' + parts.join(' · ')
        } else {
          progSpan.textContent = '🎯 从第一章开始，累计学习进度会显示在这里'
        }
        // 插到卡片描述后的标签组里（紧跟现有 .tg 后）
        var tgRef = homeAcadCard.querySelector('.tg')
        if (tgRef && tgRef.nextSibling) homeAcadCard.insertBefore(progSpan, tgRef.nextSibling)
        else homeAcadCard.appendChild(progSpan)
      }
    } catch (e) {}

    // 仅在学院章节页注入打卡卡片
    var isChapterPage = /ai-academy\/chapter-\d+\.html/.test(location.pathname)
    if (isChapterPage && !document.getElementById('modCheckIn')) {
      // 提取章节号
      var chMatch = location.pathname.match(/chapter-(\d+)\.html/)
      var chapterNo = chMatch ? chMatch[1] : ''
      var chapterId = 'chapter-' + chapterNo
      var chapterTitle = (document.querySelector('article h1') || {}).textContent || ('第' + chapterNo + '章')

      var prog = getProgress()
      var isCompleted = !!(prog.chapters[chapterId] && prog.chapters[chapterId].completedAt)
      var today = todayStr()

      // 样式注入（幂等）
      if (!document.getElementById('modCheckInCss')) {
        var ciCss = document.createElement('style')
        ciCss.id = 'modCheckInCss'
        ciCss.textContent =
          '#modCheckIn{margin:40px auto 8px;padding:22px 24px;border-radius:16px;border:1px solid var(--nav-line,#e3ebf5);background:var(--card,#fff);box-shadow:0 6px 24px rgba(30,41,59,.06)}'
          + '#modCheckIn .ci-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}'
          + '#modCheckIn .ci-icon{width:44px;height:44px;border-radius:12px;background:linear-gradient(120deg,#4f8cff,#38b6ff 50%,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff;flex:none;box-shadow:0 4px 12px rgba(79,140,ff,.25)}'
          + '#modCheckIn .ci-title{flex:1;min-width:200px}'
          + '#modCheckIn .ci-title b{font-size:15px;color:var(--text,#1e293b);display:block}'
          + '#modCheckIn .ci-title span{font-size:12.5px;color:var(--muted,#64748b)}'
          + '#modCheckIn .ci-stats{display:flex;gap:18px;margin-bottom:14px;padding:12px 16px;border-radius:12px;background:rgba(120,160,220,.06);border:1px solid rgba(120,160,220,.12)}'
          + '#modCheckIn .ci-stat{text-align:center;flex:1}'
          + '#modCheckIn .ci-stat b{font-size:20px;font-weight:800;background:linear-gradient(120deg,#4f8cff,#8b5cf6);-webkit-background-clip:text;background-clip:text;color:transparent;display:block;line-height:1.2}'
          + '#modCheckIn .ci-stat span{font-size:11.5px;color:var(--muted,#64748b)}'
          + '#modCheckIn .ci-bar{height:8px;border-radius:99px;background:rgba(120,160,220,.12);overflow:hidden;margin-bottom:8px}'
          + '#modCheckIn .ci-bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#22c55e,#4ade80);transition:width .6s ease}'
          + '#modCheckIn .ci-bar-text{display:flex;justify-content:space-between;font-size:11.5px;color:var(--muted,#64748b);margin-bottom:14px}'
          + '#modCheckIn .ci-btn{display:inline-flex;align-items:center;gap:6px;padding:11px 24px;border-radius:999px;border:none;background:linear-gradient(120deg,#4f8cff,#38b6ff 50%,#8b5cf6);color:#fff;font-size:14px;font-weight:700;cursor:pointer;transition:transform .15s,box-shadow .15s;font-family:inherit}'
          + '#modCheckIn .ci-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(79,140,ff,.35)}'
          + '#modCheckIn .ci-btn.done{background:linear-gradient(120deg,#22c55e,#16a34a);cursor:default}'
          + '#modCheckIn .ci-btn.done:hover{transform:none;box-shadow:none}'
          + '#modCheckIn .ci-links{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:13px;margin-top:14px;padding-top:14px;border-top:1px solid var(--nav-line,#e3ebf5)}'
          + '#modCheckIn .ci-links a{color:var(--muted,#64748b);text-decoration:none;border-bottom:1px dashed var(--nav-line,#dbe4f0)}'
          + '#modCheckIn .ci-links a:hover{color:#38b6ff}'
          + '#modCheckIn .ci-tip{font-size:12px;color:var(--muted,#94a3b8);margin-top:10px}'
          + '#modCheckIn .ci-tip.ok{color:#22c55e}'
        document.head.appendChild(ciCss)
      }

      // 计算进度（引用全局 TOTAL_CHAPTERS，消除重复硬编码）
      var totalChapters = TOTAL_CHAPTERS
      var completedCount = prog.totalCompleted || Object.keys(prog.chapters).filter(function(k) { return prog.chapters[k] && prog.chapters[k].completedAt }).length
      var progressPct = Math.round(completedCount / totalChapters * 100)

      // 构建卡片 HTML
      var art = document.querySelector('article')
      if (art) {
        var ci = document.createElement('div')
        ci.id = 'modCheckIn'
        ci.innerHTML =
          '<div class="ci-head">'
          + '<div class="ci-icon"><i class="cc-ic" data-ic="' + (isCompleted ? 'circle-check' : 'book-open') + '" aria-hidden="true"></i></div>'
          + '<div class="ci-title">'
          + '<b>' + (isCompleted ? '本章已完成学习' : '学完本章了？打卡记录进度') + '</b>'
          + '<span>' + (isCompleted ? '完成于 ' + prog.chapters[chapterId].completedAt.substr(0, 10) : '打卡后计入学习进度，积累连续学习天数') + '</span>'
          + '</div>'
          + '</div>'
          + '<div class="ci-stats">'
          + '<div class="ci-stat"><b>' + completedCount + '/' + totalChapters + '</b><span>已完成章节</span></div>'
          + '<div class="ci-stat"><b>' + prog.streak + '</b><span>连续学习天数</span></div>'
          + '<div class="ci-stat"><b>' + progressPct + '%</b><span>学习进度</span></div>'
          + '</div>'
          + '<div class="ci-bar"><i style="width:' + progressPct + '%"></i></div>'
          + '<div class="ci-bar-text"><span>学习进度</span><span>' + completedCount + ' / ' + totalChapters + ' 章</span></div>'
          + (isCompleted
              ? '<button class="ci-btn done" type="button" disabled><i class="cc-ic" data-ic="circle-check" aria-hidden="true"></i> 已打卡完成</button>'
              + '<div class="ci-tip ok">太棒了！继续保持学习节奏</div>'
              : '<button class="ci-btn" type="button" id="ciCheckInBtn"><i class="cc-ic" data-ic="pen-line" aria-hidden="true"></i> 打卡本章 · 记录进度</button>'
              + '<div class="ci-tip">打卡即表示你已完成本章学习，进度会自动保存到本机浏览器</div>')
          + '<div class="ci-links">'
          + '<a href="/website/ai-academy-roadmap.html"><i class="cc-ic" data-ic="map" aria-hidden="true"></i> 查看学习路线图</a>'
          + '<a href="/website/ai-academy-quiz.html"><i class="cc-ic" data-ic="notebook-pen" aria-hidden="true"></i> 去做章节测验</a>'
          + '<a href="/website/ai-academy.html"><i class="cc-ic" data-ic="graduation-cap" aria-hidden="true"></i> 回到学院首页</a>'
          + '</div>'
        art.appendChild(ci)

        // 打卡按钮事件
        var btn = ci.querySelector('#ciCheckInBtn')
        if (btn) {
          btn.addEventListener('click', function () {
            var p = getProgress()
            if (!p.startedAt) p.startedAt = today
            if (!p.chapters[chapterId]) {
              p.chapters[chapterId] = { title: chapterTitle, firstReadAt: Date.now() }
            }
            if (!p.chapters[chapterId].completedAt) {
              p.chapters[chapterId].completedAt = Date.now()
              p.totalCompleted = (p.totalCompleted || 0) + 1
            }
            // 更新连续打卡
            if (p.lastCheckIn !== today) {
              var streak = calcStreak(p)
              p.streak = streak + 1
              p.lastCheckIn = today
            }
            saveProgress(p)

            // 更新 UI
            var newCompleted = p.totalCompleted || Object.keys(p.chapters).filter(function(k) { return p.chapters[k] && p.chapters[k].completedAt }).length
            var newPct = Math.round(newCompleted / totalChapters * 100)
            ci.querySelector('.ci-icon').innerHTML = '<i class="cc-ic" data-ic="circle-check" aria-hidden="true"></i>'
            ci.querySelector('.ci-title b').textContent = '本章已完成学习'
            ci.querySelector('.ci-title span').textContent = '完成于 ' + today
            var stats = ci.querySelectorAll('.ci-stat b')
            if (stats[0]) stats[0].textContent = newCompleted + '/' + totalChapters
            if (stats[1]) stats[1].textContent = p.streak
            if (stats[2]) stats[2].textContent = newPct + '%'
            ci.querySelector('.ci-bar i').style.width = newPct + '%'
            ci.querySelector('.ci-bar-text span:last-child').textContent = newCompleted + ' / ' + totalChapters + ' 章'
            btn.innerHTML = '<i class="cc-ic" data-ic="circle-check" aria-hidden="true"></i> 已打卡完成'
            btn.className = 'ci-btn done'
            btn.disabled = true
            var tip = ci.querySelector('.ci-tip')
            if (tip) { tip.textContent = '太棒了！已连续学习 ' + p.streak + ' 天，继续保持'; tip.className = 'ci-tip ok' }
          })
        }
      }
    }

    // ---------- ⑧ AI 助教（C4：章节页注入 ai-tutor.js，懒加载；ai-tutor.js 自包含判断页面） ----------
    if (isChapterPage && !document.querySelector('script[src*="ai-tutor.js"]')) {
      var at = document.createElement('script')
      at.src = '/ai-tutor.js'
      at.async = true
      document.body.appendChild(at)
    }
  } catch (e) {
    // 静默失败：打卡功能不影响页面核心体验
  }
})()
