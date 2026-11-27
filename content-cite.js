/**
 * 内容时效与出处层
 * ------------------------------------------------------------------
 * 数据源：/data/content-cite.json
 *   { "groups": [{ "match": "/website/book/", ... }], "pages": { "/path": {...} } }
 * 页面级配置优先于分组配置；两者都没有就什么也不做。
 *
 * 渲染两处：
 *   1. 正文标题后的「核验至 YYYY-MM-DD · 出处 N 条」徽章
 *   2. 正文末尾的「📚 参考来源」区（与站内博文同一套标准：可点开原文 + 核验日期）
 *
 * 不搬动原有 DOM，只做追加；页面已自带参考来源区时整体跳过。
 */
(function () {
  'use strict';

  /* 2026-10-28：数据文件也加指纹。手机端无法强制刷新，
     只改 JSON 内容而 URL 不变时，页面会一直读到缓存里的旧文案。 */
  var V = '20261028e';
  var SRC = '/data/content-cite.json?v=' + V;
  var MARK = 'data-cite-done';

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* 站内路径不区分是否带 /index.html，统一成小写比较 */
  function clean(p) {
    p = (p || '').split('?')[0].split('#')[0];
    try { p = decodeURI(p); } catch (e) {}
    return p.toLowerCase();
  }

  /* 页面级精确匹配：把目录路径补成 index.html 再比 */
  function normPage(p) {
    p = clean(p);
    if (p.length > 1 && p.charAt(p.length - 1) === '/') p += 'index.html';
    return p;
  }

  /* 分组前缀匹配：原样保留，绝不能补 index.html，否则前缀永远匹配不上 */
  function normPrefix(p) {
    return clean(p);
  }

  /* 把分组基线合进页面配置：页面级来源是「专属补充」而不是「全量替换」。
     否则某页正文写着「比价请查各厂定价页（见文末）」，而文末只剩论文链接，
     读者点不到——这是比过期更糟的断裂。按 url 去重，页面自己的排在前面。 */
  function mergeSources(page, group) {
    var out = [], seen = {};
    var push = function (list) {
      for (var i = 0; i < (list || []).length; i++) {
        var s = list[i];
        var k = (s && s.url) || ('#' + i);
        if (seen[k]) continue;
        seen[k] = 1;
        out.push(s);
      }
    };
    push(page.sources);
    push(group.sources);
    return out;
  }

  function pick(cfg) {
    var here = normPage(location.pathname);
    var page = null;
    var pages = cfg.pages || {};
    for (var p in pages) {
      if (!Object.prototype.hasOwnProperty.call(pages, p)) continue;
      if (normPage(p) === here) { page = pages[p]; break; }
    }

    var group = null, bestLen = -1;
    var groups = cfg.groups || [];
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      if (!g || !g.match) continue;
      var m = normPrefix(g.match);
      if (m && here.indexOf(m) === 0 && m.length > bestLen) { group = g; bestLen = m.length; }
    }

    if (!page) return group;
    if (!group) return page;
    return {
      label: page.label || group.label,
      updatedAt: page.updatedAt || group.updatedAt,
      note: page.note || group.note,
      sources: mergeSources(page, group)
    };
  }

  function styles() {
    if (document.getElementById('cite-style')) return;
    var css = '' +
      '.cite-badge{display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;' +
        'margin:6px 0 20px;padding:7px 13px;border-radius:999px;font-size:13px;line-height:1.5;' +
        'font-weight:600;letter-spacing:.1px;' +
        'background:rgba(79,140,255,.10);border:1px solid rgba(79,140,255,.30);color:#4f8cff}' +
      '.cite-badge .dot{width:6px;height:6px;border-radius:50%;background:currentColor;flex:none;' +
        'box-shadow:0 0 0 3px rgba(79,140,255,.18)}' +
      '.cite-badge b{font-weight:800}' +
      '.cite-badge a{color:inherit;text-decoration:underline;text-underline-offset:2px}' +
      '.cite-src{margin:34px 0 0;padding:18px 20px;border-radius:14px;' +
        'background:rgba(79,140,255,.06);border:1px solid rgba(79,140,255,.22)}' +
      '.cite-src h2{margin:0 0 8px !important;padding:0 !important;border:0 !important;' +
        'font-size:17px !important;line-height:1.4 !important;color:inherit !important}' +
      '.cite-src .tip{margin:0 0 10px;font-size:13px;opacity:.72;line-height:1.7}' +
      '.cite-src ul{margin:0;padding-left:20px}' +
      '.cite-src li{margin:6px 0;font-size:13px;line-height:1.7}' +
      '.cite-src a{word-break:break-all}' +
      '.cite-src .meta{opacity:.62;font-size:12px}' +
      '@media(max-width:640px){.cite-badge{font-size:12px;padding:6px 11px}' +
        '.cite-src{padding:14px 15px;margin-top:26px}.cite-src li{font-size:13px}}';
    var st = el('style', null, css);
    st.id = 'cite-style';
    document.head.appendChild(st);
  }

  /* 页面自己已经列了「带外链」的参考来源，就不再叠一份。
     判据要严：必须有匹配的标题，且该标题到下一个标题之间真的存在外链。
     只写一句「出处声明：本文原创」不算——那不是来源清单。 */
  function hasOwnSourceList(host) {
    var hs = host.querySelectorAll('h2,h3,h4');
    for (var i = 0; i < hs.length; i++) {
      if (!/参考来源|参考资料|引用来源|数据来源|出处/.test(hs[i].textContent || '')) continue;
      var n = hs[i].nextElementSibling, hops = 0;
      while (n && hops < 12) {
        if (/^H[2-4]$/.test(n.nodeName)) break;
        if (n.querySelector && n.querySelector('a[href^="http"]')) return true;
        if (n.nodeName === 'A' && /^http/.test(n.getAttribute('href') || '')) return true;
        n = n.nextElementSibling;
        hops++;
      }
    }
    return false;
  }

  function render(cfg) {
    if (!cfg || document.documentElement.getAttribute(MARK)) return;
    var sources = cfg.sources || [];
    var date = cfg.updatedAt || '';
    if (!date && !sources.length) return;

    var host = document.querySelector('article') || document.querySelector('main') || document.body;
    if (!host) return;

    var ownList = hasOwnSourceList(host);

    styles();
    document.documentElement.setAttribute(MARK, '1');

    /* ---- 顶部徽章：挂在第一个 h1 之后 ---- */
    var h1 = host.querySelector('h1');
    var tail;
    if (!sources.length) tail = '';
    else if (ownList) tail = '<span>·</span><span>本文自带参考来源</span>';
    else tail = '<span>·</span><a href="#cite-src">出处 <b>' + sources.length + '</b> 条</a>';
    var badge = el('div', 'cite-badge',
      '<span class="dot"></span>' +
      '<span>内容核验至 <b>' + esc(date) + '</b></span>' + tail
    );
    if (h1 && h1.parentNode) h1.parentNode.insertBefore(badge, h1.nextSibling);
    else host.insertBefore(badge, host.firstChild);

    /* ---- 底部出处区 ---- */
    if (!sources.length || ownList) return;

    var box = el('section', 'cite-src');
    box.id = 'cite-src';
    var out = '<h2>📚 参考来源</h2>' +
      '<p class="tip">以下为本文事实性表述的核对出处（' + esc(date) + ' 核验，均为可点开原文）：</p><ul>';
    for (var i = 0; i < sources.length; i++) {
      var s = sources[i];
      if (!s || !s.url) continue;
      out += '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener nofollow">' +
        esc(s.name || s.url) + '</a>' +
        (s.date ? ' <span class="meta">（' + esc(s.date) + '）</span>' : '') + '</li>';
    }
    out += '</ul>';
    if (cfg.note) out += '<p class="tip" style="margin-top:10px">' + esc(cfg.note) + '</p>';
    box.innerHTML = out;
    host.appendChild(box);
  }

  function boot() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', SRC, true);
    xhr.onload = function () {
      if (xhr.status < 200 || xhr.status >= 300) return;
      var cfg;
      try { cfg = JSON.parse(xhr.responseText); } catch (e) { return; }
      var hit = pick(cfg);
      try { render(hit); } catch (e) {}
    };
    xhr.onerror = function () {};
    try { xhr.send(); } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else boot();

  window.ContentCite = { refresh: boot };
})();
