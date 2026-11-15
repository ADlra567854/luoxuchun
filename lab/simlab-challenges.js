/* =========================================================================
 * lab/simlab-challenges.js · 仿真挑战题（C6）
 * -------------------------------------------------------------------------
 * 产品规则（C 线学习平台 · 2026-09-03）：
 *  1. 4 个可通关挑战：PID 零超调 / 弹簧临界阻尼 / 顶风长射 / 十万点逼近 π
 *  2. 判定依据 = 页面结果区实时数值（DOM 解析，非复制仿真方程）→ 零漂移
 *  3. 通关解锁徽章：写入 ccowork.progress.challenges（随 C5 备份一起迁移）
 *  4. 首次通关自动记录该实验（recordLab）→ 计入「连续学习 N 天」
 *  5. 纯前端、零依赖、离线可用；失败仅提示不惩罚，可反复尝试
 * -------------------------------------------------------------------------
 * 判定阈值数值可行性已用同款方程在 Node 下验证（_internal/challenge-feasibility*.mjs）：
 *  PID 默认档超调 0.13%（未过）→ 通解 14521 组；弹簧默认 ζ=0.079（未过）→ 通解 1776 组；
 *  抛体默认射程 55.5m（未过）→ b≥0.01 时 v0≥51 可行、最佳 116.6m；MC 十万点失败率 0.005%。
 * ========================================================================= */
(function () {
  'use strict';
  if (window.__ccoworkSimChallenge) return;   // 防重复注入
  window.__ccoworkSimChallenge = true;

  var K = 'ccowork.progress';
  var LAB_TITLES = { 'lab-pid': 'PID 控制器仿真', 'lab-spring': '弹簧-质量-阻尼仿真', 'lab-projectile': '抛体运动仿真', 'lab-montecarlo': '蒙特卡洛求 π 仿真' };

  /* ---------------- 挑战定义（judge 入参为 DOM 解析出的数值对象） ---------------- */
  var CHS = [
    {
      id: 'ch-pid', sim: 'pid', lab: 'lab-pid', no: '①', name: 'PID 零超调',
      goal: '超调 ≤ 0.10% 且稳态误差 ≤ 0.01',
      judge: function (m) { return m.overshoot <= 0.10 && m.err <= 0.01; },
      cur: function (m) { return '当前：超调 ' + m.overshoot + '% · 误差 ' + m.err; },
      tip: '加大 Kd 压超调、保留 Ki 消稳态误差'
    },
    {
      id: 'ch-spring', sim: 'spring', lab: 'lab-spring', no: '②', name: '弹簧临界阻尼',
      goal: '阻尼比 ζ 落在 0.90 ~ 1.10（临界阻尼区）',
      judge: function (m) { return m.zeta >= 0.90 && m.zeta <= 1.10; },
      cur: function (m) { return '当前：ζ = ' + m.zeta; },
      tip: 'ζ = c / 2√(k·m)，用 m / c / k 三旋钮凑'
    },
    {
      id: 'ch-proj', sim: 'proj', lab: 'lab-projectile', no: '③', name: '顶风长射',
      goal: '空气阻力 b ≥ 0.01 时，射程 ≥ 100 m',
      judge: function (m) { return m.drag >= 0.0095 && m.range >= 100; },
      cur: function (m) { return '当前：b = ' + m.drag + ' · 射程 ' + m.range + ' m'; },
      tip: '有阻力时最佳抛射角 < 45°——拉高 v₀ 再降角度试试'
    },
    {
      id: 'ch-mc', sim: 'mc', lab: 'lab-montecarlo', no: '④', name: '十万点逼近 π',
      goal: '采样 N ≥ 100,000 且 |估算 π − 真 π| ≤ 0.02',
      judge: function (m) { return m.N >= 100000 && m.err <= 0.02; },
      cur: function (m) { return '当前：N = ' + m.N + ' · |Δ| = ' + m.err; },
      tip: '误差按 √N 收敛——N 翻 4 倍，误差减半'
    }
  ];

  /* ---------------- 存储（优先全局 API，兜底直读写同 key） ---------------- */
  function readProg() {
    try {
      if (window.CCOWorkProgress && window.CCOWorkProgress.get) return window.CCOWorkProgress.get();
    } catch (e) {}
    try { var r = localStorage.getItem(K); return r ? JSON.parse(r) : {}; } catch (e) { return {}; }
  }
  function writeProg(p) {
    try {
      if (window.CCOWorkProgress && window.CCOWorkProgress.save) { window.CCOWorkProgress.save(p); return; }
    } catch (e) {}
    try { localStorage.setItem(K, JSON.stringify(p)); } catch (e) {}
  }
  function recordLabAuto(labId) {
    try {
      if (window.CCOWorkProgress && window.CCOWorkProgress.recordLab && !window.CCOWorkProgress.isLabCompleted(labId)) {
        return window.CCOWorkProgress.recordLab(labId, LAB_TITLES[labId] || labId);
      }
    } catch (e) {}
    return false;
  }
  function markLabCheckUI(labId) {
    var box = document.querySelector('.labcheck[data-lab="' + labId + '"]');
    if (!box) return;
    var btn = box.querySelector('.lab-btn'), st = box.querySelector('.lab-state');
    if (btn) { btn.classList.add('done'); btn.disabled = true; btn.textContent = ' 实验已完成'; }
    if (st) { st.className = 'lab-state ok'; st.textContent = '通关挑战自动记录 · 已计入学习天数'; }
  }
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /* ---------------- DOM 解析：从结果区数值判定（不复制方程） ---------------- */
  function tileOf(boxId, keyPart) {
    var box = document.getElementById(boxId);
    if (!box) return null;
    var tiles = box.querySelectorAll('.res');
    for (var i = 0; i < tiles.length; i++) {
      var k = tiles[i].querySelector('.res-k');
      if (k && k.textContent.indexOf(keyPart) !== -1) {
        var v = tiles[i].querySelector('.res-v');
        return v ? v.textContent : '';
      }
    }
    return null;
  }
  function toNum(s) {
    if (s == null) return NaN;
    var m = String(s).replace(/,/g, '').match(/-?\d*\.?\d+(?:e[+-]?\d+)?/i);
    return m ? parseFloat(m[0]) : NaN;
  }
  function readSlider(id) {
    var el = document.getElementById(id);
    return el ? toNum(el.value) : NaN;
  }
  function metricOf(ch) {
    var m = {};
    if (ch.sim === 'pid') {
      m.overshoot = toNum(tileOf('pid-results', '超调'));
      m.err = toNum(tileOf('pid-results', '稳态误差'));
    } else if (ch.sim === 'spring') {
      m.zeta = toNum(tileOf('sm-results', '阻尼比'));
    } else if (ch.sim === 'proj') {
      m.drag = readSlider('pj-d');
      m.range = toNum(tileOf('pj-results', '射程'));
    } else if (ch.sim === 'mc') {
      m.N = Math.round(readSlider('mc-n'));
      m.err = toNum(tileOf('mc-results', '误差'));
    }
    return m;
  }
  function valid(m, ch) {
    if (ch.sim === 'pid') return isFinite(m.overshoot) && isFinite(m.err);
    if (ch.sim === 'spring') return isFinite(m.zeta);
    if (ch.sim === 'proj') return isFinite(m.drag) && isFinite(m.range);
    if (ch.sim === 'mc') return isFinite(m.N) && isFinite(m.err);
    return false;
  }

  /* ---------------- UI ---------------- */
  var CSS = ''
    + '.chalbar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:0 0 18px;padding:12px 16px;border:1px solid rgba(139,92,246,.4);border-radius:14px;background:linear-gradient(120deg,rgba(139,92,246,.14),rgba(56,225,255,.08));font-size:13px}'
    + '.chalbar b{font-size:14px;background:linear-gradient(120deg,#4f8cff,#38e1ff 55%,#8b5cf6);-webkit-background-clip:text;background-clip:text;color:transparent}'
    + '.chalbar .chbar-n{color:var(--green,#2fd17b);font-weight:800;font-size:15px}'
    + '.chalbar .chbar-tip{color:var(--muted,#8fa0c4);font-size:12px;margin-left:auto}'
    + '.simchal{margin-top:10px;border:1px solid rgba(139,92,246,.4);border-radius:10px;padding:9px 12px;background:rgba(139,92,246,.07);display:flex;flex-direction:column;gap:5px;transition:.2s}'
    + '.simchal.pass{border-color:rgba(47,209,123,.55);background:rgba(47,209,123,.10)}'
    + '.sch-l1{display:flex;align-items:center;gap:8px;flex-wrap:wrap}'
    + '.sch-no{font-size:11px;font-weight:800;color:#05101f;background:linear-gradient(120deg,#8b5cf6,#38e1ff);border-radius:5px;padding:1px 7px}'
    + '.sch-name{font-size:13px;font-weight:800}'
    + '.sch-goal{font-size:12px;color:var(--muted,#8fa0c4)}'
    + '.sch-st{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;font-size:12px}'
    + '.sch-state{font-weight:700}'
    + '.sch-state.pass{color:var(--green,#2fd17b)}'
    + '.sch-state.fail{color:#ffb454}'
    + '.sch-state.wait{color:var(--muted,#8fa0c4)}'
    + '.sch-tip{color:var(--muted,#8fa0c4);font-size:11px}'
    + '.sch-clear{cursor:pointer;border:1px dashed rgba(139,92,246,.5);color:#b7a6f5;background:transparent;border-radius:999px;font-size:11px;padding:1px 10px}'
    + '.sch-clear:hover{border-color:#ff5c8a;color:#ff5c8a}';
  function injectStyle() {
    var s = document.createElement('style');
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  function injectBar() {
    var grid = document.querySelector('main.wrap .grid');
    if (!grid || document.getElementById('chalbar')) return;
    var bar = document.createElement('div');
    bar.id = 'chalbar';
    bar.className = 'chalbar';
    bar.innerHTML = '<span><b>🎯 仿真挑战</b> 跑出指定结果即可通关 · 徽章记入学习进度</span><span class="chbar-n" id="chbar-n"></span><span class="chbar-tip">通关自动记录实验 · 计入连续学习天数</span>';
    grid.parentNode.insertBefore(bar, grid);
  }
  function injectChips() {
    var ANCHOR = { pid: 'pid-chart', spring: 'sm-chart', proj: 'pj-chart', mc: 'mc-chart' };
    CHS.forEach(function (ch) {
      var anchor = document.getElementById(ANCHOR[ch.sim]);
      if (!anchor || anchor.nextElementSibling && anchor.nextElementSibling.classList.contains('simchal')) return;
      var div = document.createElement('div');
      div.className = 'simchal';
      div.id = 'simchal-' + ch.id;
      div.setAttribute('data-ch', ch.id);
      div.innerHTML = ''
        + '<div class="sch-l1"><span class="sch-no">挑战 ' + ch.no + '</span><span class="sch-name">' + ch.name + '</span><span class="sch-goal">目标：' + ch.goal + '</span></div>'
        + '<div class="sch-st"><span class="sch-state wait" id="st-' + ch.id + '">运行后自动判定</span><span class="sch-tip">' + ch.tip + '</span></div>';
      anchor.insertAdjacentElement('afterend', div);
    });
  }

  /* ---------------- 判定 & 徽章 ---------------- */
  function storeDone() {
    var p = readProg();
    if (!p.challenges) p.challenges = {};
    return p;
  }
  function refreshAll() {
    var p = readProg();
    var done = p.challenges || {};
    var n = 0;
    CHS.forEach(function (ch) {
      var stEl = document.getElementById('st-' + ch.id);
      var chip = document.getElementById('simchal-' + ch.id);
      if (done[ch.id]) {
        n++;
        if (stEl) { stEl.textContent = '✅ 已通关 · ' + new Date(done[ch.id].completedAt).toISOString().slice(0, 10) + (done[ch.id].note ? ' · ' + done[ch.id].note : ''); stEl.className = 'sch-state pass'; }
        if (chip) chip.classList.add('pass');
      } else {
        var m = metricOf(ch);
        if (valid(m, ch) && ch.judge(m)) {
          n++;
          if (stEl) { stEl.textContent = '✅ 已通关 · ' + ch.cur(m); stEl.className = 'sch-state pass'; }
          if (chip) chip.classList.add('pass');
        } else if (valid(m, ch)) {
          if (stEl) { stEl.textContent = '未达标：' + ch.cur(m); stEl.className = 'sch-state fail'; }
        }
      }
    });
    var barN = document.getElementById('chbar-n');
    if (barN) barN.textContent = n + ' / ' + CHS.length + ' 通关';
  }
  function judgeOnce(ch, silentDone) {
    var m = metricOf(ch);
    var stEl = document.getElementById('st-' + ch.id);
    var chip = document.getElementById('simchal-' + ch.id);
    if (!valid(m, ch)) return false;
    if (ch.judge(m)) {
      var p = readProg();
      if (!p.challenges) p.challenges = {};
      if (!p.challenges[ch.id]) {
        p.challenges[ch.id] = { title: ch.name, completedAt: Date.now(), note: ch.cur(m) };
        writeProg(p);
        recordLabAuto(ch.lab);          // 通关自动打卡实验（幂等）
        markLabCheckUI(ch.lab);
      }
      if (stEl) { stEl.textContent = '✅ 通关！' + ch.cur(m); stEl.className = 'sch-state pass'; }
      if (chip) chip.classList.add('pass');
      if (!silentDone) refreshAll();
      return true;
    }
    if (stEl) { stEl.textContent = '未达标：' + ch.cur(m); stEl.className = 'sch-state fail'; }
    if (chip) chip.classList.remove('pass');
    return false;
  }

  /* ---------------- 运行钩子：包装 runX，运行后自动判定（不修改原函数） ---------------- */
  var RUN_FN = { pid: 'runPID', spring: 'runSpring', proj: 'runProj', mc: 'runMC' };
  CHS.forEach(function (ch) {
    var fn = RUN_FN[ch.sim];
    var orig = window[fn];
    if (typeof orig !== 'function') return;
    window[fn] = function () {
      var r = orig.apply(this, arguments);
      judgeOnce(ch);
      return r;
    };
  });

  /* ---------------- 初始化 ---------------- */
  function boot() {
    injectStyle();
    injectBar();
    injectChips();
    refreshAll();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
