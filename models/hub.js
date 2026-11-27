/* ==========================================================================
   models/hub.js · 模型域公共渲染工具（2026-10-29）
   只做四件事：取数、转义、生成卡片、驱动筛选。页面各自只写必要的渲染逻辑。
   ========================================================================== */
;(function (w) {
  'use strict';
  var V = '20261029a';   /* 数据版本指纹：改数据时改这里，避免浏览器缓存旧 JSON */

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }
  function ic(n, cls) { return '<i class="cc-ic' + (cls ? ' ' + cls : '') + '" data-ic="' + n + '" aria-hidden="true"></i>'; }

  /* 取 JSON：用 XHR 以兼容旧浏览器，同时避开 file:// 下的 fetch 限制 */
  function getJSON(url, cb, err) {
    var x = new XMLHttpRequest();
    x.open('GET', url + (url.indexOf('?') < 0 ? '?' : '&') + 'v=' + V, true);
    x.onload = function () {
      if (x.status >= 200 && x.status < 300) {
        try { cb(JSON.parse(x.responseText)); }
        catch (e) { err && err(e); }
      } else { err && err(new Error('HTTP ' + x.status)); }
    };
    x.onerror = function () { err && err(new Error('network')); };
    x.send();
  }

  /* 从 URL 读初始筛选状态，便于分享一个已筛好的视图 */
  function param(k, d) {
    var m = new RegExp('[?&]' + k + '=([^&]*)').exec(location.search);
    return m ? decodeURIComponent(m[1]) : (d || '');
  }
  /* 把筛选写回地址栏，不产生历史记录 */
  function setParam(k, v) {
    try {
      var u = new URL(location.href);
      if (v) u.searchParams.set(k, v); else u.searchParams.delete(k);
      history.replaceState(null, '', u.toString());
    } catch (e) {}
  }

  /* 国别中文名 */
  var CNAME = { CN: '中国', US: '美国', FR: '法国', DE: '德国', UK: '英国', CA: '加拿大', CH: '瑞士', KR: '韩国', JP: '日本' };
  function cn(c) { return CNAME[c] || c; }

  /* 组 → 图标 / 英文名 */
  var GIC = {
    lang: 'languages', mm: 'images', img: 'palette', vid: 'video', asr: 'mic',
    tts: 'volume-2', aud: 'music', s2s: 'audio-lines', emb: 'layers', rer: 'sort-asc',
    vis: 'eye', doc: 'file-text', d3: 'box', wm: 'globe', vla: 'bot', ts: 'chart-line',
    sci: 'flask-conical', safe: 'shield', rec: 'target', dec: 'split', bci: 'waves', misc: 'puzzle'
  };

  w.MH = {
    V: V, $: $, $$: $$, esc: esc, ic: ic, getJSON: getJSON,
    param: param, setParam: setParam, cn: cn, GIC: GIC,

    /* 声明式计数：<b data-cnt="110">0</b>
       不采用数字滚动动画：截图、爬虫、读屏软件抓到的都是中间值，
       而且用户要的是「一眼看到规模」，滚动反而延迟了这个信息。 */
    fillCounts: function (root) {
      $$('[data-cnt]', root || document).forEach(function (el) {
        el.textContent = el.getAttribute('data-cnt');
      });
    },

    /* 空态 */
    empty: function (msg, hint) {
      return '<div class="pg-empty">' + ic('search') +
             '<b>' + esc(msg) + '</b>' + (hint ? esc(hint) : '') + '</div>';
    }
  };
  var MH = w.MH;
})(window);
