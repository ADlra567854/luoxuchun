/* home-fold.js · 首页渐进展开
 * 首页原先一口气铺 21500px：光「AI 作品精选」一段就 12900px（122 个项目卡全渲染）。
 * 这里把首屏之后的板块折成三段，每段前面放一条页脚样式的「展开更多」，
 * 点一次放一段——想看多少就能看多少，不必滚一条长得离谱的页面。
 *
 * 降级：折叠是 JS 加上去的（加 .hf-hide 类），脚本不跑时所有内容照常可见。
 */
(function () {
  'use strict';

  // 只在首页动手：首页有 #explore 与 #wsGrid，其它页面直接退出
  if (!document.getElementById('explore') || !document.getElementById('wsGrid')) return;
  if (window.__ccHomeFold) return;
  window.__ccHomeFold = true;

  // 首屏之后按真实 DOM 顺序分段（注意 #compile 在 #works 之前，别按直觉排）。
  // 每段内的 section 必须是连续兄弟节点，否则折叠条只会在第一次出现，展开后会错位——
  // 下面 isContiguous() 会兜住改版导致的顺序错乱。
  var STAGES = [
    {
      ids: ['compile', 'works'],
      title: '展开更多',
      note: '下一段：编译模式 · AI 作品精选（精选 6 件，开源项目分批放出）'
    },
    {
      ids: ['news', 'hot', 'content'],
      title: '继续展开',
      note: '下一段：今日快讯 · 热榜 · 内容与实验 —— 每天读的都在这里'
    },
    {
      ids: ['tools'],
      title: '最后一段',
      note: '下一段：全工具 —— 想动手跑的时候再看'
    }
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // 判断这组 section 在 DOM 里是否连续（中间只允许注释与空白文本节点）
  function isContiguous(els) {
    for (var i = 1; i < els.length; i++) {
      var n = els[i - 1].nextSibling;
      // 跳过注释(8)与纯空白文本(3)——HTML 里 section 之间本来就有换行
      while (n && (n.nodeType === 8 || (n.nodeType === 3 && !n.nodeValue.trim()))) n = n.nextSibling;
      if (n !== els[i]) return false;
    }
    return true;
  }

  // 收集真实存在的 section，缺的跳过（页面改版不至于把脚本搞挂）
  var live = [];
  STAGES.forEach(function (st) {
    var els = [];
    st.ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el && !el.closest('.hf-fold')) els.push(el);
    });
    if (!els.length) return;
    // 顺序错乱时只保留连续的那一截，宁可少折一段也不要把页面搞乱
    while (els.length && !isContiguous(els)) els.pop();
    if (!els.length) return;
    st.els = els;
    live.push(st);
  });
  if (!live.length) return;

  var total = live.length;

  // 每段建一条展开条，插在该段第一个 section 前面
  live.forEach(function (st, i) {
    var fold = document.createElement('div');
    fold.className = 'hf-fold';
    fold.setAttribute('data-stage', String(i));
    fold.innerHTML =
      '<button type="button" class="hf-btn">' +
        '<span class="hf-ic"><i class="cc-ic" data-ic="chevrons-down" aria-hidden="true"></i></span>' +
        '<span class="hf-t"><b>' + esc(st.title) + '</b><em>' + esc(st.note) + '</em></span>' +
        '<span class="hf-n">还有 ' + (total - i) + ' 段</span>' +
      '</button>' +
      '<div><button type="button" class="hf-all">一次全展开 · 不再分段</button></div>';

    st.els[0].parentNode.insertBefore(fold, st.els[0]);
    st.fold = fold;

    // 一次只露一条：第 0 段可见，后面的等前面展开后再冒出来（否则页面下方会叠三四个按钮）
    if (i > 0) fold.classList.add('hf-hide');

    // 先把这一段藏起来
    st.els.forEach(function (el) { el.classList.add('hf-hide'); });
  });

  // 结尾提示：全部展开后才显示，告诉用户没有更多了
  var ending = document.createElement('div');
  ending.className = 'hf-end';
  ending.innerHTML = '<i class="cc-ic" data-ic="check" aria-hidden="true"></i>以上是首页全部板块 · 想看更深的内容就进对应栏目';
  ending.classList.add('hf-hide');
  var lastEl = live[live.length - 1].els.slice(-1)[0];
  lastEl.parentNode.insertBefore(ending, lastEl.nextSibling);

  function showStage(st, animate) {
    st.els.forEach(function (el) {
      el.classList.remove('hf-hide');
      if (animate) {
        el.classList.remove('hf-in');
        // 强制回流，让动画能重新触发
        void el.offsetWidth;
        el.classList.add('hf-in');
        setTimeout(function () { el.classList.remove('hf-in'); }, 400);
      }
    });
    if (st.fold && st.fold.parentNode) st.fold.parentNode.removeChild(st.fold);
    st.fold = null;
  }

  function reveal(i, animate) {
    var st = live[i];
    if (!st || st.done) return;
    st.done = true;
    showStage(st, animate !== false);
    // 这一段落出来了，才把下一条展开条露出来
    var nxt = live[i + 1];
    if (nxt && nxt.fold) nxt.fold.classList.remove('hf-hide');
    // 最后一段放出来之后，才显示「已经到底了」
    var anyLeft = live.some(function (x) { return !x.done; });
    if (!anyLeft) ending.classList.remove('hf-hide');
  }

  // 事件委托：折叠条会被删掉重建，绑在 document 上最稳
  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest) return;

    var all = e.target.closest('.hf-all');
    if (all) {
      // 一次全展开：不做逐段动画，避免三段同时淡入卡一下
      for (var k = 0; k < live.length; k++) reveal(k, false);
      return;
    }

    var btn = e.target.closest('.hf-fold .hf-btn');
    if (!btn) return;
    var wrap = btn.closest('.hf-fold');
    if (!wrap) return;
    reveal(parseInt(wrap.getAttribute('data-stage'), 10) || 0, true);
  });
})();
