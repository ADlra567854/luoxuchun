/* ============================================================
   nebula-3d.js · 轻量 3D 交互引擎（原生 JS，零依赖）
   模块：设备分级 / 卡片倾斜 / 弹簧回弹 / 按压 / 视差 / 入场 / 弹窗 / 手势
   原则：只写 CSS 变量与 class，所有动画交给合成层；单帧只做一次写操作
   ============================================================ */
(function () {
  'use strict';

  var docEl = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  var CARD_SEL = '.card,.rs-card,.h-card,.work-card,.news-card,.mod-card,.res-card,.d-card,' +
    '.lcard,.tcard,.bcard,.ec-card,.mi-card,.tl-item,section .grid > a,section .grid > div';
  var MAX_CARDS = 140;          /* 超出不初始化倾斜，避免长列表拖慢 */
  var TIER = 'high';

  /* ---------- 1. 设备分级 ---------- */
  function detectTier() {
    if (reduce) return 'low';
    var cores = navigator.hardwareConcurrency || 4;
    var mem = navigator.deviceMemory || 4;
    var small = Math.min(window.innerWidth, window.innerHeight) < 700;
    if (coarse && (cores <= 4 || mem <= 2)) return 'low';
    if (coarse || small || cores <= 4 || mem <= 4) return 'mid';
    return 'high';
  }
  function applyTier(t) {
    TIER = t;
    docEl.setAttribute('data-nb3d', t);
    docEl.classList.toggle('nb3d-touch', !!coarse);
  }

  var raf = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };

  /* ---------- 2. 卡片 3D：倾斜 + 高光 + 动态投影 + 弹簧回位 ---------- */
  var cards = [];
  var active = null;

  function pad(n) { return (Math.round(n * 100) / 100).toFixed(2); }

  function writeCard(c, st) {
    c.style.setProperty('--nb3-rx', pad(st.rx) + 'deg');
    c.style.setProperty('--nb3-ry', pad(st.ry) + 'deg');
    c.style.setProperty('--nb3-tz', pad(st.tz) + 'px');
    c.style.setProperty('--nb3-s', pad(st.s));
    c.style.setProperty('--nb3-hi', pad(st.hi));
    c.style.setProperty('--nb3-sha', pad(st.sha));
    c.style.setProperty('--nb3-shy', pad(st.shy) + 'px');
    c.style.setProperty('--nb3-shb', pad(st.shb) + 'px');
  }

  function resetCard(c) {
    writeCard(c, { rx: 0, ry: 0, tz: 0, s: 1, hi: 0, sha: 0, shy: 8, shb: 26 });
  }

  /* 弹性回位：阻尼弹簧，收敛即停，不做无限 rAF */
  function springBack(c) {
    var st = { rx: 0, ry: 0, tz: 0, s: 1, hi: 0, sha: 0, shy: 8, shb: 26 };
    var cur = readCard(c);
    var vx = 0, vy = 0, vz = 0, vh = 0;
    function step() {
      var k = 0.16, d = 0.72;             /* 刚度 / 阻尼 */
      vx = (vx + (st.rx - cur.rx) * k) * d;
      vy = (vy + (st.ry - cur.ry) * k) * d;
      vz = (vz + (st.tz - cur.tz) * k) * d;
      vh = (vh + (st.hi - cur.hi) * k) * d;
      cur.rx += vx; cur.ry += vy; cur.tz += vz; cur.hi += vh;
      cur.sha += (0 - cur.sha) * 0.18;
      cur.shy += (8 - cur.shy) * 0.18;
      cur.shb += (26 - cur.shb) * 0.18;
      cur.s += (1 - cur.s) * 0.2;
      writeCard(c, cur);
      var moving = Math.abs(vx) + Math.abs(vy) + Math.abs(vz) + Math.abs(vh) +
        Math.abs(cur.sha) + Math.abs(cur.s / 1 - 1) > 0.004;
      if (moving) raf(step);
      else {
        resetCard(c);
        setTimeout(function () { c.classList.remove('is-hot'); }, 320);
      }
    }
    raf(step);
  }

  function readCard(c) {
    var s = c.style;
    return {
      rx: parseFloat(s.getPropertyValue('--nb3-rx')) || 0,
      ry: parseFloat(s.getPropertyValue('--nb3-ry')) || 0,
      tz: parseFloat(s.getPropertyValue('--nb3-tz')) || 0,
      s: parseFloat(s.getPropertyValue('--nb3-s')) || 1,
      hi: parseFloat(s.getPropertyValue('--nb3-hi')) || 0,
      sha: parseFloat(s.getPropertyValue('--nb3-sha')) || 0,
      shy: parseFloat(s.getPropertyValue('--nb3-shy')) || 8,
      shb: parseFloat(s.getPropertyValue('--nb3-shb')) || 26
    };
  }

  /* 结构启发式：293 个页面各自类名不同，靠选择器枚举追不完。
     规则：容器里 ≥3 个「同标签 + 同类名」的兄弟、尺寸像卡片、容器是栅格布局 → 认定为卡片。 */
  function detectByStructure() {
    var out = [];
    var boxes = document.querySelectorAll('div,ul,section,main');
    for (var i = 0; i < boxes.length && out.length < MAX_CARDS * 2; i++) {
      var box = boxes[i];
      if (box.classList.contains('nb3d-scene')) continue;
      var kids = box.children;
      if (!kids || kids.length < 3) continue;
      var cs = getComputedStyle(box);
      var isGrid = cs.display.indexOf('grid') > -1 || (cs.display.indexOf('flex') > -1 && cs.flexWrap !== 'nowrap');
      if (!isGrid) continue;

      var sig = kids[0].tagName + '|' + (kids[0].className || '');
      var same = 0;
      for (var k = 0; k < kids.length; k++) {
        if (kids[k].tagName + '|' + (kids[k].className || '') === sig) same++;
      }
      if (same < 3) continue;

      var r0 = kids[0].getBoundingClientRect();
      if (r0.width < 120 || r0.height < 64) continue;
      /* 纯文字列表（一行行短条目）不做 3D，否则滚动时像抽搐 */
      if (r0.height < 90 && cs.display.indexOf('flex') > -1 && cs.flexDirection === 'column') continue;

      for (var j = 0; j < kids.length; j++) out.push(kids[j]);
      if (out.length >= MAX_CARDS) break;
    }
    return out;
  }

  function initCards() {
    if (cards.length >= MAX_CARDS) return;
    var list = [].slice.call(document.querySelectorAll(CARD_SEL));
    if (list.length < 3) list = list.concat(detectByStructure());
    if (!list.length) return;

    var n = Math.min(list.length, TIER === 'high' ? MAX_CARDS : 60);
    for (var i = 0; i < n; i++) {
      var c = list[i];
      if (!c || c.classList.contains('nb3d-card')) continue;
      if (c.closest && c.closest('.nb3d-card')) continue;   /* 不做嵌套卡片 */
      var r = c.getBoundingClientRect();
      if (r.width < 120 || r.height < 64) continue;
      c.classList.add('nb3d-card');
      if (c.parentElement && !c.parentElement.classList.contains('nb3d-scene') &&
          getComputedStyle(c.parentElement).perspective === 'none') {
        c.parentElement.classList.add('nb3d-scene');
      }
      if (TIER !== 'low' && cards.indexOf(c) < 0) cards.push(c);
    }
    if (TIER !== 'low') bindPointer();
  }

  var pend = null, ticking = false, bound = false;

  function bindPointer() {
    if (bound) return;
    bound = true;
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var t = e.target.closest ? e.target.closest('.nb3d-card') : null;
      /* 卡片常被兄弟覆盖层（渐变、遮罩、标签）压住，event.target 拿不到卡片本身。
         此时按几何归属兜底：指针落在哪张卡片的矩形内，就算悬停它。 */
      if (!t) {
        var x = e.clientX, y = e.clientY;
        if (active) {
          var ar = active.getBoundingClientRect();
          if (x >= ar.left && x <= ar.right && y >= ar.top && y <= ar.bottom) t = active;
        }
        if (!t && document.elementsFromPoint) {
          /* 一次命中测试拿整摞元素，比循环读 rect 便宜得多 */
          var stack = document.elementsFromPoint(x, y);
          for (var i = 0; i < stack.length; i++) {
            var hit = stack[i].closest && stack[i].closest('.nb3d-card');
            if (hit) { t = hit; break; }
          }
        }
      }
      if (!t) {
        if (active) { springBack(active); active = null; }
        return;
      }
      pend = { el: t, x: e.clientX, y: e.clientY };
      if (!ticking) { ticking = true; raf(flush); }
    }, { passive: true });

    document.addEventListener('pointerleave', function () {
      if (active) { springBack(active); active = null; }
    }, { passive: true });
    /* 页面滚走时也要收尾，否则高光会停在已经不在视口的卡片上 */
    window.addEventListener('scroll', function () {
      if (!active) return;
      var r = active.getBoundingClientRect();
      if (r.bottom < 0 || r.top > (window.innerHeight || 800)) {
        springBack(active);
        active = null;
      }
    }, { passive: true });
  }

  function flush() {
    ticking = false;
    if (!pend) return;
    var c = pend.el, r = c.getBoundingClientRect();
    if (active && active !== c) springBack(active);
    active = c;
    c.classList.add('is-hot');

    var px = (pend.x - r.left) / r.width - 0.5;
    var py = (pend.y - r.top) / r.height - 0.5;
    var amp = TIER === 'high' ? 4.6 : 3.2;

    var cur = readCard(c);
    var tgt = {
      rx: -py * amp * 2,
      ry: px * amp * 2,
      tz: TIER === 'high' ? 16 : 10,
      s: 1.012,
      hi: 1,
      sha: 1,
      shy: 6 - py * 4,
      shb: 30
    };
    /* 缓冲跟随（60fps 下约 3 帧到位，比瞬移更有物感） */
    cur.rx += (tgt.rx - cur.rx) * 0.34;
    cur.ry += (tgt.ry - cur.ry) * 0.34;
    cur.tz += (tgt.tz - cur.tz) * 0.3;
    cur.s += (tgt.s - cur.s) * 0.3;
    cur.hi += (tgt.hi - cur.hi) * 0.22;
    cur.sha += (tgt.sha - cur.sha) * 0.22;
    cur.shy += (tgt.shy - cur.shy) * 0.3;
    cur.shb += (tgt.shb - cur.shb) * 0.3;
    writeCard(c, cur);

    c.style.setProperty('--nb3-mx', ((pend.x - r.left) / r.width * 100).toFixed(1) + '%');
    c.style.setProperty('--nb3-my', ((pend.y - r.top) / r.height * 100).toFixed(1) + '%');
    pend = null;
  }

  /* ---------- 3. 按压 / 长按 ---------- */
  function cardAt(e) {
    var c = e.target && e.target.closest ? e.target.closest('.nb3d-card') : null;
    if (c) return c;
    if (document.elementsFromPoint && e.clientX != null) {
      var stack = document.elementsFromPoint(e.clientX, e.clientY);
      for (var i = 0; i < stack.length; i++) {
        var hit = stack[i].closest && stack[i].closest('.nb3d-card');
        if (hit) return hit;
      }
    }
    return null;
  }

  function initPress() {
    document.addEventListener('pointerdown', function (e) {
      var c = cardAt(e);
      if (!c) return;
      c.classList.add('is-press');
      /* 内联变量优先级高于 CSS 类，按压数值必须由 JS 直接写，否则被 flush 覆盖 */
      c.style.setProperty('--nb3-s', '0.972');
      c.style.setProperty('--nb3-tz', '0px');
      c.style.setProperty('--nb3-shy', '2px');
      c.style.setProperty('--nb3-shb', '8px');
      if (coarse) {
        clearTimeout(c._holdT);
        c._holdT = setTimeout(function () {
          c.classList.add('is-hold');
          c.style.setProperty('--nb3-s', '1.016');
          c.style.setProperty('--nb3-hi', '0.85');
          if (navigator.vibrate) { try { navigator.vibrate(12); } catch (x) {} }
        }, 380);
      }
    }, { passive: true });

    function release(e) {
      var c = cardAt(e);
      if (!c) return;
      c.classList.remove('is-press');
      c.style.setProperty('--nb3-s', '1');
      if (c._holdT) { clearTimeout(c._holdT); c._holdT = null; }
      if (c.classList.contains('is-hold')) {
        setTimeout(function () {
          c.classList.remove('is-hold');
          if (!c.classList.contains('is-press')) springBack(c);
        }, 150);
      }
    }
    document.addEventListener('pointerup', release, { passive: true });
    document.addEventListener('pointercancel', release, { passive: true });
  }

  /* ---------- 4. 全局滚动视差分层 ---------- */
  /* 自动认定纵深层：装饰光斑最慢（远景）、章节配图略快（中景）。
     滚动量做上限截断，避免滚过首屏后装饰层飘飞。 */
  function autoDepth() {
    if (TIER === 'low') return;
    var orbs = document.querySelectorAll('.nb-hero .nb-orb, header.hero .nb-orb, section.hero .nb-orb');
    for (var i = 0; i < orbs.length; i++) {
      if (!orbs[i].hasAttribute('data-nb3d-depth')) orbs[i].setAttribute('data-nb3d-depth', '0.16');
    }
    var imgs = document.querySelectorAll('section img, .sec-head img');
    for (var j = 0; j < imgs.length; j++) {
      var r = imgs[j].getBoundingClientRect();
      if (r.width < 420) continue;
      if (!imgs[j].hasAttribute('data-nb3d-depth')) imgs[j].setAttribute('data-nb3d-depth', '0.045');
    }
  }

  function initParallax() {
    if (TIER === 'low') return;
    autoDepth();

    var layers = [];
    var scan = function () {
      layers = [];
      var els = document.querySelectorAll('[data-nb3d-depth]');
      for (var i = 0; i < els.length; i++) {
        var d = parseFloat(els[i].getAttribute('data-nb3d-depth')) || 0.1;
        els[i].style.setProperty('--nb3-depth', d);
        layers.push(els[i]);
      }
    };
    scan();

    var last = -1, maxShift = (window.innerHeight || 800) * 1.4;
    function onScroll() {
      var y = Math.min(window.scrollY || window.pageYOffset, maxShift);
      if (Math.abs(y - last) < 1) return;
      last = y;
      raf(function () {
        docEl.style.setProperty('--nb3-scroll', y.toFixed(0) + 'px');
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () {
      maxShift = (window.innerHeight || 800) * 1.4;
      autoDepth();
      scan();
    }, { passive: true });
  }

  /* ---------- 5. 入场：3D 浮出 + 错峰 ---------- */
  var io = null;

  /* 卡片浮出：把纵深从 -46px 弹簧推回 0，形成真正的"从画面深处飘上来" */
  function depthPop(el) {
    var from = -46, cur = from, v = 0;
    el.style.setProperty('--nb3-tz', from + 'px');
    function step() {
      v = (v + (0 - cur) * 0.19) * 0.74;
      cur += v;
      if (Math.abs(cur) < 0.4 && Math.abs(v) < 0.4) {
        el.style.setProperty('--nb3-tz', '0px');
        return;
      }
      el.style.setProperty('--nb3-tz', cur.toFixed(1) + 'px');
      raf(step);
    }
    raf(step);
  }

  function observeReveals() {
    if (!('IntersectionObserver' in window)) return;
    if (!io) {
      io = new IntersectionObserver(function (list) {
        list.forEach(function (en) {
          if (!en.isIntersecting) return;
          var el = en.target;
          el.classList.add('in');
          if (el.classList.contains('nb3d-card') && TIER !== 'low') depthPop(el);
          io.unobserve(el);
        });
      }, { rootMargin: '0px 0px 10% 0px', threshold: 0 });
    }

    var vh = window.innerHeight || 800;
    var els = document.querySelectorAll('.nb3d-reveal:not(.in), .nb3d-card:not(.nb3d-reveal)');
    var groups = {};
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (!el.classList.contains('nb3d-reveal')) {
        /* 已在视口内的一律不进动画：宁可少一个效果，也不能让内容被藏住 */
        var r = el.getBoundingClientRect();
        if (r.top < vh * 0.94 && r.bottom > 0) continue;
        /* 零尺寸 / 祖先 display:none 的节点永远等不到 IntersectionObserver，
           直接放行，避免父级恢复显示时内容还停在不可见状态 */
        if (!r.width || !r.height || el.offsetParent === null) continue;
        el.classList.add('nb3d-reveal');
        if (STUCK_AT) STUCK_AT.set(el, Date.now());
        if (el.classList.contains('nb3d-card')) {
          /* 旧特效层会写内联 opacity/transform（内联优先级高于 CSS），必须先剥离，
             再由本层接管，否则卡片会永久停在不可见状态 */
          el.style.removeProperty('opacity');
          el.style.removeProperty('transform');
          el.style.removeProperty('transition');
          el.style.setProperty('--nb3-tz', '-46px');
        }
        var p = el.parentElement || docEl;
        if (p.dataset) {
          var key = p.dataset.nb3dKey || (p.dataset.nb3dKey = 'k' + Math.random().toString(36).slice(2, 7));
          groups[key] = (groups[key] || 0) + 1;
          el.style.transitionDelay = Math.min(groups[key], 5) * 55 + 'ms';
        }
      }
      io.observe(el);
    }
  }

  /* 兜底看门狗：周期性巡检，凡「待入场」超过 2.5 秒且已在视口内的，一律放出来。
     单次 setTimeout 不够——动态渲染的卡片可能在首轮兜底之后才被扫描到。 */
  var STUCK_AT = typeof WeakMap === 'function' ? new WeakMap() : null;

  function revealSafetyNet() {
    if (revealSafetyNet.armed) return;   /* rescan 会重复调 boot，看门狗只装一次 */
    revealSafetyNet.armed = true;
    var pass = function () {
      var vh = window.innerHeight || 800;
      var now = Date.now();
      var stuck = document.querySelectorAll('.nb3d-reveal:not(.in)');
      for (var i = 0; i < stuck.length; i++) {
        var el = stuck[i];
        if (!STUCK_AT) { el.classList.add('in'); continue; }
        if (!STUCK_AT.has(el)) STUCK_AT.set(el, now);
        var age = now - STUCK_AT.get(el);
        if (age < 2500) continue;
        var r = el.getBoundingClientRect();
        /* 只在它确实该被看见的时候放行，屏幕外的保留滚动入场效果 */
        if (r.width && r.height && r.bottom > 0 && r.top < vh) {
          el.classList.add('in');
          if (el.classList.contains('nb3d-card')) el.style.setProperty('--nb3-tz', '0px');
        }
      }
    };
    setTimeout(pass, 2600);
    setInterval(pass, 1500);
  }

  /* ---------- 6. 弹窗 / 侧边面板：3D 进出场 ----------
     只接管显式声明的弹窗（data-nb3d-modal / data-nb3d-kind）。
     站内既有的登录、引导、评论区各有自己的显隐机制（有的靠 bottom 位移、
     有的靠 body 锁滚动），自动接管会把它们顶到前台，风险大于收益。      */
  var DIALOG_SEL = '[data-nb3d-modal],[data-nb3d-kind]';

  function scrimFor(dlg, withClose) {
    var s = document.createElement('div');
    s.className = 'nb3d-overlay';
    var z = parseInt(getComputedStyle(dlg).zIndex, 10);
    s.style.zIndex = (isFinite(z) ? z - 1 : 8999);
    if (withClose) {
      s.addEventListener('click', function () {
        var btn = dlg.querySelector('#obSkip,#bjSkip,.close,.closeBtn,.bj-close,[data-nb3d-close]');
        if (btn) { btn.click(); return; }
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      });
    }
    return s;
  }

  function enhanceDialog(dlg) {
    if (dlg.dataset.nb3dReady === '1') return;
    dlg.dataset.nb3dReady = '1';

    /* 侧边面板不加遮罩，否则点开设置会被挡住 */
    var isSide = dlg.dataset.nb3dKind === 'side';
    var open = false, scrim = null;

    function isOpen() {
      var cs = getComputedStyle(dlg);
      return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.05;
    }

    /* 弹窗本体只加类，不搬动 DOM，保留原定位与事件 */
    function sync() {
      var o = isOpen();
      if (o === open) return;
      open = o;
      if (o) {
        dlg.classList.add('nb3d-panel');
        if (isSide) dlg.setAttribute('data-nb3d-kind', 'side');
        dlg.classList.remove('out');
        raf(function () { dlg.classList.add('in'); });
        if (!isSide && !scrim) {
          scrim = scrimFor(dlg, dlg.id === 'bjOnboardDlg' || dlg.getAttribute('role') === 'dialog');
          document.body.appendChild(scrim);
          raf(function () { scrim.classList.add('in'); });
        }
      } else {
        dlg.classList.remove('in');
        dlg.classList.add('out');
        if (scrim) {
          var s = scrim; scrim = null;
          s.classList.add('out');
          setTimeout(function () { s.remove(); }, 240);
        }
        setTimeout(function () { dlg.classList.remove('out'); }, 280);
      }
    }

    new MutationObserver(sync).observe(dlg, {
      attributes: true, attributeFilter: ['style', 'class', 'hidden']
    });
    sync();
  }

  function initDialogs() {
    var scan = function () {
      var list = document.querySelectorAll(DIALOG_SEL);
      for (var i = 0; i < list.length; i++) enhanceDialog(list[i]);
    };
    scan();
    /* 异步挂载的弹窗（评论、引导）稍后重试 */
    [300, 900, 1800, 3200].forEach(function (t) { setTimeout(scan, t); });
    window.addEventListener('load', function () { setTimeout(scan, 600); });
  }

  /* ---------- 7. 双指缩放视差（只作用于标记容器，不拦截浏览器缩放） ---------- */
  /* ---------- 7. 触屏双指缩放 ----------
     宿主 data-nb3d-pinch，缩放目标 data-nb3d-zoom（缺省即宿主自身）。
     只在双指时拦默认行为，单指拖动照常滚页面。 */
  function initPinch() {
    var hosts = document.querySelectorAll('[data-nb3d-pinch]');
    Array.prototype.forEach.call(hosts, function (host) {
      if (host.dataset.nb3dPinch === '1') return;
      host.dataset.nb3dPinch = '1';

      var target = host.querySelector('[data-nb3d-zoom]') || host;
      var start = 0, cur = 1;

      function dist(t) {
        return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
      }

      host.addEventListener('touchstart', function (e) {
        if (e.touches.length === 2) start = dist(e.touches);
      }, { passive: true });

      host.addEventListener('touchmove', function (e) {
        if (e.touches.length !== 2 || !start) return;
        e.preventDefault();                       /* 拦掉浏览器整页缩放 */
        var k = Math.max(0.7, Math.min(2.2, dist(e.touches) / start));
        if (Math.abs(k - cur) < 0.015) return;
        cur = k;
        target.style.setProperty('--nb3-zoom', k.toFixed(3));
      }, { passive: false });

      host.addEventListener('touchend', function (e) {
        if (e.touches.length === 2) return;
        start = 0;
        /* 已接近原始比例就归位，避免停在 1.02 这种别扭状态 */
        if (cur < 1.06) {
          cur = 1;
          target.style.setProperty('--nb3-zoom', '1');
        }
      }, { passive: true });
    });
  }

  /* ---------- 8. 帧率守卫：掉帧自动降级 ---------- */
  function initFpsGuard() {
    if (TIER === 'low') return;
    var frames = 0, t0 = performance.now(), bad = 0, done = false;
    function tick(now) {
      if (done) return;
      frames++;
      if (now - t0 >= 1000) {
        var fps = frames * 1000 / (now - t0);
        frames = 0; t0 = now;
        if (fps < 42) {
          bad++;
          if (bad >= 2) {
            done = true;
            applyTier(TIER === 'high' ? 'mid' : 'low');
            return;
          }
        } else bad = 0;
      }
      raf(tick);
    }
    raf(tick);
    setTimeout(function () { done = true; }, 12000);   /* 只在前 12 秒守卫，之后定档 */
  }

  /* ---------- 9. 启动 ---------- */
  /* 站内大量卡片由 JS 渲染或懒加载，必须多次扫描补齐 */
  function sweep() {
    initCards();
    observeReveals();
  }

  function boot() {
    applyTier(detectTier());
    sweep();
    initPress();
    initParallax();
    initDialogs();
    initPinch();
    initFpsGuard();
    revealSafetyNet();

    /* 动态内容补齐：定时扫 3 次 + load 后 + 6 秒内的 DOM 变动 */
    [400, 1200, 2500].forEach(function (t) { setTimeout(sweep, t); });
    window.addEventListener('load', function () { setTimeout(sweep, 300); });
    if (window.MutationObserver && document.body) {
      var pendT = null;
      var mo = new MutationObserver(function () {
        if (pendT) return;
        pendT = setTimeout(function () { pendT = null; sweep(); }, 260);
      });
      mo.observe(document.body, { childList: true, subtree: true });
      setTimeout(function () { mo.disconnect(); }, 6000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else boot();

  window.NB3D = {
    tier: function () { return TIER; },
    rescan: boot,
    /* 站内自己的弹窗可主动接入 3D：NB3D.modal(el, 'side'|'center') */
    modal: function (el, kind) {
      if (!el) return;
      if (kind) el.setAttribute('data-nb3d-kind', kind);
      enhanceDialog(el);
    }
  };
})();
