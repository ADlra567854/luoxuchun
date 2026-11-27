/* ==========================================================================
   site-library.js · 目录页的筛选交互（教程 / 书稿 / 博客共用）
   --------------------------------------------------------------------------
   三个目录页结构完全一样：.pg-toolbar 里一个输入框 + 若干 .pg-list。
   这里只做一件事：输入即过滤，并同步每个分组的计数。
   不引入任何框架，不写内联样式，深/浅主题自动跟随。
   ========================================================================== */
;(function () {
  'use strict';

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function norm(s) {
    return (s || '').toLowerCase().replace(/\s+/g, '');
  }

  function run() {
    var input = $('#libq');
    if (!input) return;
    var rows = $$('.pg-list .row');
    var groups = $$('.pg-sec');
    var counter = $('#libcount');
    var empty = $('#libempty');

    /* 每行预存一份检索文本：标题 + 说明 + 编号 + 数据属性里的标签 */
    rows.forEach(function (r) {
      var t = r.querySelector('.tx b');
      var d = r.querySelector('.tx small');
      var no = r.querySelector('.no');
      var extra = r.getAttribute('data-tag') || '';
      r.__k = norm((t ? t.textContent : '') + (d ? d.textContent : '') + (no ? no.textContent : '') + extra);
    });

    function apply() {
      var q = norm(input.value);
      var shown = 0;

      rows.forEach(function (r) {
        var hit = !q || r.__k.indexOf(q) >= 0;
        r.style.display = hit ? '' : 'none';
        if (hit) shown++;
      });

      /* 整组都被过滤掉的，把整组收起来，免得留下一堆空标题 */
      groups.forEach(function (g) {
        var inGroup = $$('.pg-list .row', g);
        if (!inGroup.length) return;
        var vis = inGroup.filter(function (r) { return r.style.display !== 'none'; }).length;
        g.style.display = vis ? '' : 'none';
        var cnt = g.querySelector('.sh .cnt');
        if (cnt) cnt.textContent = vis + ' 条';
      });

      if (counter) {
        counter.innerHTML = q
          ? '匹配 <b>' + shown + '</b> / ' + rows.length
          : '共 <b>' + rows.length + '</b> 条';
      }
      if (empty) empty.style.display = shown ? 'none' : '';

      /* 顶上跳转胶囊也一起过滤，避免点了跳到空组 */
      $$('.ccjump a').forEach(function (a) {
        var g = document.querySelector(a.getAttribute('href'));
        if (g) a.style.display = g.style.display === 'none' ? 'none' : '';
      });
    }

    var timer = null;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(apply, 90);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { input.value = ''; apply(); }
    });
    apply();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
