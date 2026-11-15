/* 图标系统统一 · 自动水合 + 双系统兜底
   --------------------------------------------------------------------------
   问题：全站有两套图标机制并存
     A. CSS mask  —— site-redesign.css 里 317 条 .cc-ic[data-ic=x]{--cc-ic:url(assets/icons/x.svg)}
     B. JS 注入  —— assets/ai-ecosystem/ui/icons.js 把 SVG 字符串插进 DOM（137 个）
   两套只有 39 个重名，其余各管一半，导致：
     · 同名图标在 hub（走 A）与生态库（走 B）里形状不一致
     · 新增页面时不知道该用哪套，必然踩空图标的坑

   本方案的取舍（基于实测数据）：
     全站 HTML 实际只引用了 86 个图标名，两套合计已覆盖 85 个。
     因此**不追求把 317 个 CSS 图标全部搬进 JS**（那是浪费 278 个 path 的无用功），
     而是：让 JS 侧对**全站用到的 86 个**实现权威定义，CSS 侧降级为兜底。

   机制：
     1. 加载时扫描本页所有 [data-ic]
     2. JS 侧有的 → 直接注入 SVG（形状以 icons.js 为准，全站统一）
     3. JS 侧没有但 CSS 侧有的 → 保留 CSS mask 兜底（不动那 317 条规则）
     4. 两边都没有 → 显示为可见的淡灰占位点（宁可看得见，也不要空白）
   好处：改动面小、形状全站统一、以后新增图标只需加进 icons.js 一个地方。 */
(function () {
  if (window.__ccIconHydrated) return;
  window.__ccIconHydrated = true;

  var BJI = window.BJI;
  if (!BJI || !BJI.svg) { hydrateFallbackOnly(); return; }

  function hydrateFallbackOnly() {
    var els = document.querySelectorAll('[data-ic]');
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      if (e.querySelector('svg')) continue;
      var n = e.getAttribute('data-ic');
      if (n && !n.trim()) { markEmpty(e); }
    }
  }

  /* 两边都没有 → 显示淡灰占位点，让人知道"这里本该有个图标" */
  function markEmpty(e) {
    e.setAttribute('data-ico-empty', '1');
    if (!e.style.backgroundColor) e.style.backgroundColor = 'currentColor';
    e.style.opacity = '.28';
  }

  function hydrate() {
    var els = document.querySelectorAll('[data-ic]');
    var stats = { filled: 0, cssFallback: 0, empty: 0 };
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      var name = e.getAttribute('data-ic');
      if (!name || !name.trim()) { markEmpty(e); stats.empty++; continue; }
      if (e.querySelector('svg')) continue;                 // 已注入
      if (BJI.has(name)) {
        try {
          // 保留元素自身的类名与尺寸类，只替换内容为 SVG
          e.innerHTML = BJI.svg(name);
          stats.filled++;
        } catch (err) { /* 落到 CSS 兜底 */ }
      } else if (window.getComputedStyle(e).getPropertyValue('--cc-ic')) {
        stats.cssFallback++;                                // CSS mask 兜底可用
      } else {
        markEmpty(e);
        stats.empty++;
      }
    }
    window.__ccIconStats = stats;
  }

  /* 双主题切换时无需重注（SVG 用 currentColor，自动跟随） */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrate);
  } else {
    hydrate();
  }

  /* 动态插入的图标（AI 生态库的卡片是 JS 生成的）→ MutationObserver 补注 */
  var timer = null;
  var obs = new MutationObserver(function (muts) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () {
      timer = null;
      var els = document.querySelectorAll('[data-ic]:not([data-ic-done])');
      for (var i = 0; i < els.length; i++) {
        var e = els[i];
        var n = e.getAttribute('data-ic');
        if (!n || !n.trim() || e.querySelector('svg')) continue;
        if (BJI.has(n)) { try { e.innerHTML = BJI.svg(n); } catch (err) { } }
      }
    }, 120);
  });
  try {
    obs.observe(document.documentElement, { childList: true, subtree: true });
  } catch (err) { }

  /* 给已注入的打个标记，便于审计 */
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
      document.querySelectorAll('[data-ic]').forEach(function (e) {
        if (e.querySelector('svg')) e.setAttribute('data-ic-done', '1');
      });
    }, 300);
  });
})();