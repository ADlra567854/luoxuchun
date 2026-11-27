/* ============================================================
   星云动效层 nebula-fx.js
   ------------------------------------------------------------
   只做"锦上添花"的事，不碰任何业务逻辑与数据。
   任一模块初始化失败都静默跳过，绝不让页面因此白屏。

   模块：
   1. 环境探测（减少动效 / 触屏 / 省电）
   2. Hero 装饰节点注入（第三块光斑 + 顶部光线 + 粒子画布）
   3. 粒子系统（含鼠标斥力与近邻连线）
   4. 光标光晕（lerp 跟随）
   5. 滚动视差（光斑反向位移）
   6. 滚动进入动画（IntersectionObserver，stagger）
   7. 轻柔点击音效（Web Audio 合成，不依赖音频文件）
   8. 卡片 3D 微倾斜（仅桌面、仅指针设备）
   ============================================================ */
;(function () {
  'use strict'

  /* ---------- 1. 环境探测 ---------- */
  var reduceMotion = false
  try {
    reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch (e) {}

  var isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0
  var hasHover = false
  try {
    hasHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  } catch (e) {}

  /* ---------- 1.5 首屏宿主的统一识别 ----------
     全站首屏容器极其分裂，实测分布：
       header.hero 22 页 / div.hero 20 页 / section.hero 18 页
       + rs-hero、b-hero、dd-hero、rm-hero、tg-hero、wp-hero、
         hero-section、lang-hero 各 1 页（不同脚本生成的落地页）
       + 门户首页 section#gate
     之前只认 header.hero，导致 40+ 个页面的粒子/光斑/视差全部静默不启动，
     而且不报错，从截图完全看不出来。
     这里统一识别后打上 .nb-hero，CSS 只针对 .nb-hero 写一套即可。 */
  var HERO_SEL = [
    'header.hero', 'section.hero', 'div.hero', '.hero-section', '.lang-hero',
    '.rs-hero', '.b-hero', '.dd-hero', '.rm-hero', '.tg-hero', '.wp-hero',
    '.masthead', '#gate'
  ].join(',')

  var hero = null
  try {
    /* 不能直接 querySelector：它按文档顺序返回第一个匹配，
       而页头导航里也常有 .hero / .masthead 之类的小容器，
       结果真正的首屏反而没被选中（/website/index.html 就是这样丢的皮肤）。
       这里把所有候选都取出来，按"面积最大的那块"认定为首屏。 */
    var cands = document.querySelectorAll(HERO_SEL)
    var best = null
    var bestArea = 0
    for (var ci = 0; ci < cands.length; ci++) {
      var el = cands[ci]
      if (el.closest('nav, header nav, .nav, .top')) continue
      var r = el.getBoundingClientRect()
      var area = r.width * r.height
      if (r.height >= 200 && area > bestArea) {
        bestArea = area
        best = el
      }
    }
    hero = best

    /* #gate 例外：门户首页是深底白字，皮肤层第 9 节单独处理。
       如果也打上 .nb-hero，第 3 节的"浅底 + 深字"规则会把白标题刷成深色，
       和深空背景叠在一起直接看不见。 */
    if (hero && hero.id !== 'gate' && !hero.classList.contains('nb-hero')) {
      hero.classList.add('nb-hero')
    }
  } catch (e) {}

  var raf = window.requestAnimationFrame

  /* ---------- 2. Hero 装饰节点 ---------- */
  /* 3D 层是否已接入：ccowork.js 在插入 fx 脚本后同步插入 3D 样式表，
     所以查样式表比查运行时属性可靠（不受两个 async 脚本的加载顺序影响） */
  function has3DLayer() {
    return !!document.querySelector('link[href*="nebula-3d.css"]')
  }

  function decorateHero() {
    if (!hero) return null

    if (!hero.querySelector('.nb-orb')) {
      var orb = document.createElement('div')
      orb.className = 'nb-orb'
      hero.appendChild(orb)
    }
    if (!hero.querySelector('.nb-hairline')) {
      var line = document.createElement('div')
      line.className = 'nb-hairline'
      hero.appendChild(line)
    }

    var cv = hero.querySelector('canvas.nb-particles')
    if (!cv) {
      cv = document.createElement('canvas')
      cv.className = 'nb-particles'
      // 插到第一个子节点，保证在所有内容之下（z-index 也兜了一层）
      hero.insertBefore(cv, hero.firstChild)
    }
    return cv
  }

  /* ---------- 3. 粒子系统 ---------- */
  function initParticles(canvas) {
    if (!canvas || reduceMotion) return

    var ctx = canvas.getContext('2d')
    if (!ctx) return

    var dpr = Math.min(window.devicePixelRatio || 1, 2)
    var W = 0, H = 0
    var particles = []
    var mouse = { x: -9999, y: -9999, active: false }
    var running = true

    // 粒子配色：蓝 / 紫 / 青，与主色同源
    var COLORS = [
      [59, 110, 246],   // #3B6EF6
      [139, 92, 246],   // #8B5CF6
      [34, 211, 238]    // #22D3EE
    ]

    function count() {
      var area = W * H
      /* 密度随面积走，但封顶，避免大屏掉帧。
         2026-10-28 修：原来统一按 area/16000 算、下限 28。桌面 1440×900 得 81 颗，
         手机 390×844 只有 21 颗（被抬到 28），撒在 844 高的画布上几乎看不见，
         用户反馈「手机上 3D 效果没了」。小屏按更密的密度算，并给更高的下限。 */
      var small = W < 560
      var n = Math.round(area / (small ? 9000 : 16000))
      return Math.max(small ? 40 : 28, Math.min(n, 96))
    }

    function resize() {
      /* 量画布本身，不量宿主：#gate 高 1600+px，但画布 CSS 只占 100vh。
         若按宿主高度设 backing store，粒子会被纵向压扁一半。 */
      var cRect = canvas.getBoundingClientRect()
      var hRect = hero.getBoundingClientRect()
      W = Math.max(1, Math.round(cRect.width || hRect.width))
      H = Math.max(1, Math.round(cRect.height || hRect.height))
      canvas.width = W * dpr
      canvas.height = H * dpr
      // 尺寸交给 CSS 控制（header.hero 是 inset:0，section#gate 是 100vh），
      // 这里不再写内联 width/height，避免和 !important 的样式互相拉扯。
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
    }

    function seed() {
      var n = count()
      particles = []
      for (var i = 0; i < n; i++) {
        var c = COLORS[i % COLORS.length]
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          r: Math.random() * 1.7 + 0.7,
          a: Math.random() * 0.35 + 0.18,
          c: c
        })
      }
    }

    function step() {
      if (!running) return
      ctx.clearRect(0, 0, W, H)

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i]

        // 鼠标斥力：60px 内推开，力度随距离衰减
        if (mouse.active) {
          var dx = p.x - mouse.x
          var dy = p.y - mouse.y
          var d2 = dx * dx + dy * dy
          if (d2 < 8100 && d2 > 1) {
            var d = Math.sqrt(d2)
            var force = (90 - d) / 90 * 0.5
            p.vx += (dx / d) * force * 0.06
            p.vy += (dy / d) * force * 0.06
          }
        }

        // 限速 + 自然回弹，避免被推飞
        p.vx *= 0.985
        p.vy *= 0.985
        var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
        if (sp < 0.05) {
          p.vx += (Math.random() - 0.5) * 0.02
          p.vy += (Math.random() - 0.5) * 0.02
        }

        p.x += p.vx
        p.y += p.vy

        // 出界回绕
        if (p.x < -10) p.x = W + 10
        if (p.x > W + 10) p.x = -10
        if (p.y < -10) p.y = H + 10
        if (p.y > H + 10) p.y = -10

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, 6.2832)
        ctx.fillStyle = 'rgba(' + p.c[0] + ',' + p.c[1] + ',' + p.c[2] + ',' + p.a + ')'
        ctx.fill()
      }

      // 近邻连线：只连 110px 内的，透明度按距离衰减，超过就断开
      for (var a = 0; a < particles.length; a++) {
        for (var b = a + 1; b < particles.length; b++) {
          var pa = particles[a], pb = particles[b]
          var ddx = pa.x - pb.x, ddy = pa.y - pb.y
          var dd = ddx * ddx + ddy * ddy
          if (dd < 12100) {
            var op = (1 - dd / 12100) * 0.13
            ctx.beginPath()
            ctx.moveTo(pa.x, pa.y)
            ctx.lineTo(pb.x, pb.y)
            ctx.strokeStyle = 'rgba(99,131,246,' + op + ')'
            ctx.lineWidth = 0.7
            ctx.stroke()
          }
        }
      }

      raf(step)
    }

    resize()
    raf(step)

    var rt = null
    window.addEventListener('resize', function () {
      clearTimeout(rt)
      rt = setTimeout(resize, 180)
    })

    // 鼠标位置用 hero 局部坐标
    hero.addEventListener('mousemove', function (e) {
      var rect = hero.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
      mouse.active = true
    }, { passive: true })
    hero.addEventListener('mouseleave', function () {
      mouse.active = false
      mouse.x = mouse.y = -9999
    }, { passive: true })

    // 页面不可见时停掉动画，省电
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { running = false }
      else if (!running) { running = true; raf(step) }
    })
  }

  /* ---------- 4. 光标光晕 ---------- */
  function initCursorGlow() {
    if (!hasHover || isTouch || reduceMotion) return

    var glow = document.createElement('div')
    glow.className = 'nb-cursor-glow'
    document.body.appendChild(glow)

    var tx = window.innerWidth / 2, ty = window.innerHeight / 2
    var cx = tx, cy = ty
    var shown = false

    document.addEventListener('mousemove', function (e) {
      tx = e.clientX
      ty = e.clientY
      if (!shown) {
        shown = true
        glow.classList.add('on')
      }
    }, { passive: true })

    document.addEventListener('mouseleave', function () {
      glow.classList.remove('on')
      shown = false
    })

    // lerp 跟随，比直接跟手更有质感
    ;(function loop() {
      cx += (tx - cx) * 0.09
      cy += (ty - cy) * 0.09
      glow.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)'
      raf(loop)
    })()
  }

  /* ---------- 5. 滚动视差 ---------- */
  function initParallax() {
    if (!hero || reduceMotion) return
    /* 3D 层接管光斑视差（统一走 --nb3-scroll 变量），这里让位避免双写抖动 */
    if (has3DLayer()) return

    var ticking = false
    function update() {
      var y = window.scrollY || window.pageYOffset
      // 只在 hero 还没完全滚出视口时才算，滚过去就停
      if (y < hero.offsetHeight + 200) {
        // 光斑比内容慢，形成纵深
        hero.style.setProperty('--nb-shift', (y * 0.16).toFixed(1) + 'px')
        var orbs = hero.querySelectorAll('.nb-orb')
        for (var i = 0; i < orbs.length; i++) {
          orbs[i].style.transform = 'translate3d(0,' + (y * -0.12).toFixed(1) + 'px,0)'
        }
      }
      ticking = false
    }
    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true
        raf(update)
      }
    }, { passive: true })
  }

  /* ---------- 6. 滚动进入动画 ---------- */
  function initReveal() {
    if (reduceMotion) return
    if (!('IntersectionObserver' in window)) return

    /* 首页真实结构是 section > .sec-head（含 h2）+ .grid / .timeline，
       不是常见的 .wrap / section.block，选择器按实测结构写。 */
    var targets = document.querySelectorAll(
      'section > .sec-head, section .grid > *, section .timeline > *, footer > *'
    )
    if (!targets.length) return

    /* 3D 层接管后，卡片入场交给它统一调度：
       这里只处理非卡片的区块标题，避免两套入口动画互相覆盖内联样式 */
    var filtered = []
    for (var fi = 0; fi < targets.length; fi++) {
      if (targets[fi].classList.contains('nb3d-card')) continue
      filtered.push(targets[fi])
    }
    if (!filtered.length) return

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return
        var el = en.target
        // 同批元素按序错开，做出"依次浮现"的感觉
        var delay = Number(el.dataset.nbDelay || 0)
        el.style.transitionDelay = delay + 'ms'
        el.classList.add('in')
        io.unobserve(el)
      })
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.04 })

    // 每 6 个为一组归零延迟，避免长列表越往下延迟越大
    for (var i = 0; i < filtered.length; i++) {
      var el = filtered[i]
      el.classList.add('nb-reveal')
      el.dataset.nbDelay = String((i % 6) * 55)
      io.observe(el)
    }

    /* 兜底：动画只是增强，绝不能因为 IO 没触发就让内容永远看不见。
       只要元素已经在视口内却没被标记，就直接亮出来。 */
    setTimeout(function () {
      var vh = window.innerHeight
      var all = document.querySelectorAll('.nb-reveal:not(.in)')
      for (var j = 0; j < all.length; j++) {
        if (all[j].getBoundingClientRect().top < vh) all[j].classList.add('in')
      }
    }, 2000)
  }

  /* ---------- 7. 点击音效 ---------- */
  function initClickSound() {
    if (isTouch || reduceMotion) return
    var AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return

    var ctx = null
    var lastAt = 0

    function ensure() {
      if (!ctx) {
        try { ctx = new AC() } catch (e) { return null }
      }
      if (ctx.state === 'suspended') { ctx.resume().catch(function () {}) }
      return ctx
    }

    /**
     * 合成一声很轻的"嗒"：
     * 正弦波从 760Hz 滑到 1180Hz（上扬，比下降更轻盈），
     * 经过低通削掉高频毛刺，120ms 内衰减到静音。
     * 不用外部音频文件，省一个请求也不占包体。
     */
    function tick() {
      var c = ensure()
      if (!c) return
      var now = c.currentTime

      var osc = c.createOscillator()
      var gain = c.createGain()
      var lp = c.createBiquadFilter()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(760, now)
      osc.frequency.exponentialRampToValueAtTime(1180, now + 0.055)

      lp.type = 'lowpass'
      lp.frequency.setValueAtTime(2400, now)

      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.05, now + 0.006)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)

      osc.connect(lp)
      lp.connect(gain)
      gain.connect(c.destination)

      osc.start(now)
      osc.stop(now + 0.14)
    }

    document.addEventListener('click', function (e) {
      var t = e.target
      if (!t || !t.closest) return
      // 输入框、文本域里打字不响；纯文本选中也不响
      if (t.closest('input, textarea, select, [contenteditable="true"]')) return
      // 连点限流，避免快速点击变成一串噪音
      var now = Date.now()
      if (now - lastAt < 90) return
      lastAt = now
      tick()
    }, { passive: true })
  }

  /* ---------- 8. 卡片 3D 微倾斜 ---------- */
  function initTilt() {
    if (!hasHover || isTouch || reduceMotion) return
    /* 3D 层接管后停用这里的简易倾斜：两套同时写 transform 会互相打架 */
    if (has3DLayer()) return

    var cards = document.querySelectorAll('section .grid > *, .work-card, .mod-card')
    if (!cards.length) return

    Array.prototype.forEach.call(cards, function (card) {
      var rect = null

      card.addEventListener('mouseenter', function () {
        rect = card.getBoundingClientRect()
        card.style.transition = 'transform .16s cubic-bezier(.22,1,.36,1), box-shadow .28s cubic-bezier(.22,1,.36,1)'
        card.style.transformStyle = 'preserve-3d'
        card.style.willChange = 'transform'
      })

      card.addEventListener('mousemove', function (e) {
        if (!rect) rect = card.getBoundingClientRect()
        // 倾斜幅度压到很小（±3.2°），大角度会显得廉价
        var px = (e.clientX - rect.left) / rect.width - 0.5
        var py = (e.clientY - rect.top) / rect.height - 0.5
        var rx = (-py * 3.2).toFixed(2)
        var ry = (px * 3.2).toFixed(2)
        card.style.transform =
          'perspective(900px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateY(-4px)'
      }, { passive: true })

      card.addEventListener('mouseleave', function () {
        card.style.transform = ''
        card.style.willChange = ''
        rect = null
      })
    })
  }

  /* ---------- 1.6 评论区归位 ----------
     评论组件 #bjComments 是被脚本 append 上去的，落点取决于宿主：
       · news 等页落在 .wrap 末尾 —— 正确
       · ai-projects 等页落在首屏 hero 里 —— 一个「登录后参与讨论」的空卡
         占了首屏黄金位，标题下面紧接着就是评论区，作品列表被推到第二屏
     内容 > 交互噪音：评论区应该跟着正文走到底部。
     只在「评论确实落在首屏内」时才搬，落在正文末尾的不动。 */
  function relocateComments() {
    var c = document.getElementById('bjComments')
    if (!c || !hero || !hero.contains(c)) return false
    // 首屏内也分情况：如果它是首屏最后一个孩子且贴着首屏底边，属于正常收尾
    var heroRect = hero.getBoundingClientRect()
    var cRect = c.getBoundingClientRect()
    var nearBottom = cRect.bottom > heroRect.bottom - 24
    if (nearBottom && c === hero.lastElementChild) return false

    var footer = document.querySelector('footer')
    try {
      if (footer && footer.parentNode) footer.parentNode.insertBefore(c, footer)
      else document.body.appendChild(c)
      c.classList.add('nb-comments-moved')
      return true
    } catch (e) {
      return false
    }
  }

  /* ---------- 1.7 长文页标题去重 ----------
     批量注入「品牌开篇」时，开篇块插在了原有 h1 之前，于是 131 个长文页变成：
        <h1>初识智能体</h1>            ← 原页面标题
        <div class="blog-open">…</div>  ← 后加的品牌开篇
        <h1>第一章 初识智能体</h1>      ← 正文标题
     一屏里出现两次近义标题，层级彻底失效。
     必须比较文本才能安全地删：只在前一个兄弟也是 h1、且两者互为包含关系时
     隐藏后者，避免把「只有唯一标题」的页面也干掉。 */
  function dedupeTitles() {
    var opens = document.querySelectorAll('.blog-open, .nb-open')
    for (var i = 0; i < opens.length; i++) {
      var open = opens[i]
      var prev = open.previousElementSibling
      var next = open.nextElementSibling
      if (!prev || !next) continue
      if (prev.tagName !== 'H1' || next.tagName !== 'H1') continue

      var a = (prev.textContent || '').replace(/\s+/g, '')
      var b = (next.textContent || '').replace(/\s+/g, '')
      if (!a || !b) continue

      // 互为子串即为重复（「初识智能体」⊂「第一章 初识智能体」）
      if (a.indexOf(b) > -1 || b.indexOf(a) > -1) {
        next.setAttribute('data-nb-dup-title', '1')
        next.style.display = 'none'
      }
    }
  }

  /* ---------- 1.8 窄屏胶囊入口折叠 ----------
     枢纽页首屏动辄 12–18 个胶囊入口（ai-academy 实测 18 个）。
     桌面端排成 4 行还能当"入口矩阵"看，390px 下就是 9 行、
     把正文顶到三屏之外。窄屏只保留前 6 个，其余收进"更多入口"。
     用真实按钮而不是 CSS 省略，保证每个入口都还能点到。 */
  function collapseChips() {
    if (window.innerWidth > 720) return
    /* 同一首屏里可能有两个 .gate-chips（ai-academy 是 13 + 5 两块），
       只处理第一块会留下第二块整组裸露在折叠按钮下面。 */
    var blocks = document.querySelectorAll('.gate-chips')
    if (!blocks.length) return

    var all = []
    for (var b = 0; b < blocks.length; b++) {
      for (var i = 0; i < blocks[b].children.length; i++) {
        if (blocks[b].children[i].classList.contains('chip')) all.push(blocks[b].children[i])
      }
    }
    if (all.length <= 8) return

    var KEEP = 6
    var hidden = all.slice(KEEP)
    hidden.forEach(function (el) {
      el.style.display = 'none'
    })
    if (!hidden.length) return

    // 第二块整体空掉后直接收起，避免留一段空白
    for (var k = 1; k < blocks.length; k++) {
      var remain = 0
      for (var j = 0; j < blocks[k].children.length; j++) {
        if (blocks[k].children[j].style.display !== 'none') remain++
      }
      if (remain === 0) blocks[k].style.display = 'none'
    }

    var btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'nb-chips-toggle'
    btn.textContent = '更多入口 +' + hidden.length
    btn.setAttribute('aria-expanded', 'false')

    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true'
      hidden.forEach(function (el) {
        el.style.display = open ? 'none' : ''
      })
      for (var k2 = 1; k2 < blocks.length; k2++) {
        blocks[k2].style.display = open ? 'none' : ''
      }
      btn.setAttribute('aria-expanded', open ? 'false' : 'true')
      btn.textContent = open ? '更多入口 +' + hidden.length : '收起入口'
    })

    var last = blocks[blocks.length - 1]
    last.parentNode.insertBefore(btn, last.nextSibling)
  }

  /* ---------- 1.9 当前栏目滚进视野 ----------
     窄屏导航是一行横向滚动，.current 常常贴在右边缘只露半截，
     看起来像"标题被裁"。加载后把它居中一次。 */
  function revealActiveNav() {
    try {
      var lists = document.querySelectorAll('nav .links')
      for (var i = 0; i < lists.length; i++) {
        var list = lists[i]
        if (getComputedStyle(list).overflowX !== 'auto') continue
        var active = list.querySelector('.current, .on, .active, [aria-current]')
        if (!active) continue
        var target = active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2
        list.scrollLeft = Math.max(0, target)
      }
    } catch (e) {}
  }

  /* ---------- 启动 ---------- */
  function boot() {
    try {
      /* 评论组件是异步注入的：DOMContentLoaded 时还不存在，
         所以按几个时间点重试，并在 load 后再补一次。搬完即止。 */
      var tries = [0, 300, 900, 1800, 3200]
      tries.forEach(function (t) {
        setTimeout(function () {
          try { relocateComments() } catch (e) {}
        }, t)
      })
      window.addEventListener('load', function () {
        setTimeout(function () {
          try { relocateComments() } catch (e) {}
        }, 600)
      })

      var cv = decorateHero()
      try { dedupeTitles() } catch (e) {}
      try { collapseChips() } catch (e) {}
      try { revealActiveNav() } catch (e) {}
      initParticles(cv)
      initCursorGlow()
      initParallax()
      initReveal()
      initClickSound()
      initTilt()
    } catch (e) {
      // 动效是增强项，出错不影响页面正常使用
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot)
  } else {
    boot()
  }
})()
