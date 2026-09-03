/* search.js · A3 全站搜索模块（零依赖，v1.0）
 * 功能：
 *   ① 导航栏注入 🔍 搜索按钮（无导航页面回退为右下角悬浮按钮）
 *   ② 懒加载 data/search-index.js（首次打开才加载）
 *   ③ 中文子串 + 英文分词混合匹配，标题/关键词/标题行/描述/正文加权打分
 *   ④ 键盘导航（↑↓ Enter Esc，/ 或 Ctrl+K 唤起）
 *   ⑤ 主题适配（body[data-theme=deep]）
 * 架构：核心匹配逻辑为纯函数挂在 CCOWorkSearch 上，可在 Node 中直接单测；
 *       DOM 初始化仅在浏览器环境执行。
 */
(function () {
  'use strict'
  if (typeof globalThis === 'undefined') globalThis = window
  if (globalThis.CCOWorkSearch) return
  var G = globalThis
  var INDEX_URL = '/data/search-index.js'
  var MAX_RESULTS = 12
  var WEIGHT = { t: 100, k: 80, h: 60, d: 40, s: 20 }

  // ---------- 核心：分词 / 打分 / 匹配（纯函数，可单测） ----------
  function norm(s) { return String(s == null ? '' : s).toLowerCase() }
  function tokenize(q) {
    return String(q || '').toLowerCase()
      .replace(/[\s,，。.!！?？;；:："'“”‘’、()（）\[\]{}<>《》|/\\-]+/g, ' ')
      .split(' ')
      .map(function (t) { return t.trim() })
      .filter(function (t) { return t.length > 0 })
  }
  function hitCount(hay, term) {
    if (!hay) return 0
    var i = 0, n = 0
    while ((i = hay.indexOf(term, i)) !== -1) { n++; i += term.length }
    return n
  }
  // 返回 {item, score, fields[]}；requireAll=true 时任一 term 未命中返回 null
  function matchOne(item, terms, requireAll) {
    var score = 0, fields = [], hitAny = false
    for (var i = 0; i < terms.length; i++) {
      var term = terms[i], hit = false
      var inT = hitCount(item.t, term), inK = 0, inH = 0, inD = 0, inS = 0
      if (inT > 0) hit = true
      if (item.k) for (var j = 0; j < item.k.length; j++) { inK += hitCount(norm(item.k[j]), term) }
      if (inK > 0) hit = true
      if (item.h) for (var k = 0; k < item.h.length; k++) { inH += hitCount(norm(item.h[k]), term) }
      if (inH > 0) hit = true
      if (item.d) { inD = hitCount(norm(item.d), term); if (inD > 0) hit = true }
      if (item.s) { inS = hitCount(norm(item.s), term); if (inS > 0) hit = true }
      if (hit) hitAny = true
      else if (requireAll) return null
      score += inT * WEIGHT.t + inK * WEIGHT.k + inH * WEIGHT.h + inD * WEIGHT.d + inS * WEIGHT.s
      if (inT > 0) fields.push('标题')
      if (inH > 0) fields.push('目录')
      if (inD > 0) fields.push('描述')
      if (inS > 0) fields.push('正文')
    }
    if (!hitAny) return null
    // 标题前缀/全等加成
    var tl = norm(item.t)
    if (tl === terms.join(' ')) score += 60
    else if (terms.some(function (t) { return tl.indexOf(t) === 0 })) score += 25
    return { item: item, score: score, fields: fields }
  }
  // 对外主入口：match(query, index, limit) → 排序后结果数组（全命中优先，无全命中降级部分命中）
  function match(q, idx, limit) {
    var terms = tokenize(q)
    if (!terms.length || !Array.isArray(idx) || !idx.length) return []
    var limitN = limit || MAX_RESULTS
    var and = [], or = []
    for (var i = 0; i < idx.length; i++) {
      var r = matchOne(idx[i], terms, true)
      if (r) and.push(r)
      else {
        var p = matchOne(idx[i], terms, false)
        if (p) or.push(p)
      }
    }
    var list = and.length ? and : or // 无全命中时降级为部分命中
    list.sort(function (a, b) { return b.score - a.score || a.item.t.length - b.item.t.length || a.item.u.localeCompare(b.item.u) })
    return list.slice(0, limitN)
  }
  // 结果里的命中位置（用于高亮/上下文切片）
  function firstHitIn(text, terms) {
    var t = norm(text), best = -1, bl = 0
    for (var i = 0; i < terms.length; i++) {
      var p = t.indexOf(terms[i])
      if (p !== -1 && (best === -1 || p < best)) { best = p; bl = terms[i].length }
    }
    return { pos: best, len: bl }
  }

  G.CCOWorkSearch = {
    tokenize: tokenize,
    match: match,
    firstHitIn: firstHitIn,
    INDEX_URL: INDEX_URL,
    MAX_RESULTS: MAX_RESULTS
  }

  // ---------- DOM 部分（仅浏览器） ----------
  if (typeof document === 'undefined') return

  var loaded = false, loading = false
  var LS = {
    get: function (k) { try { return localStorage.getItem(k) || '' } catch (e) { return '' } },
    set: function (k, v) { try { localStorage.setItem(k, v) } catch (e) {} }
  }

  // ---------- 样式（跟随 module.js 硬编码 + deep 适配的既有模式） ----------
  var css = '' +
    '#ccowSearchBtn{display:inline-flex;align-items:center;gap:5px;margin-left:8px;border:1px solid rgba(120,160,220,.35);background:rgba(255,255,255,.6);color:#475569;border-radius:9px;padding:6px 11px;font-size:13.5px;cursor:pointer;flex-shrink:0;transition:.2s}' +
    'body[data-theme="deep"] #ccowSearchBtn{background:rgba(19,26,45,.6);color:#c6d2ea;border-color:rgba(120,160,220,.18)}' +
    '#ccowSearchBtn:hover{border-color:#2563eb;color:#2563eb}' +
    'body[data-theme="deep"] #ccowSearchBtn:hover{border-color:#5eead4;color:#5eead4}' +
    '#ccowSearchBtn.flat{position:fixed;right:16px;bottom:140px;z-index:9991;width:44px;height:44px;border-radius:50%;justify-content:center;font-size:17px;margin-left:0;box-shadow:0 6px 20px rgba(37,99,235,.25)}' +
    '#ccowSearchBackdrop{position:fixed;inset:0;z-index:9998;background:rgba(10,16,32,.42);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);display:flex;justify-content:center;align-items:flex-start;padding:10vh 16px 16px;opacity:0;pointer-events:none;transition:.2s}' +
    '#ccowSearchBackdrop.show{opacity:1;pointer-events:auto}' +
    '#ccowSearchPanel{width:min(680px,100%);max-height:76vh;display:flex;flex-direction:column;border-radius:18px;overflow:hidden;background:rgba(255,255,255,.98);border:1px solid rgba(90,140,190,.3);box-shadow:0 28px 80px rgba(15,30,70,.28);transform:translateY(-10px) scale(.985);transition:.22s;font-family:var(--sans,"PingFang SC","Microsoft YaHei",sans-serif)}' +
    '#ccowSearchBackdrop.show #ccowSearchPanel{transform:none}' +
    'body[data-theme="deep"] #ccowSearchPanel{background:rgba(9,14,28,.98);border-color:rgba(120,160,220,.28);box-shadow:0 28px 80px rgba(0,0,0,.6)}' +
    '#ccowSearchInputWrap{display:flex;align-items:center;gap:10px;padding:15px 18px;border-bottom:1px solid rgba(120,160,220,.22)}' +
    '#ccowSearchInput{flex:1;border:none;outline:none;background:transparent;font-size:16px;color:#1e293b;font-family:inherit}' +
    'body[data-theme="deep"] #ccowSearchInput{color:#e9f0fb}' +
    '#ccowSearchInput::placeholder{color:#94a3b8}' +
    '#ccowSearchKbd{flex:none;font-size:11px;color:#94a3b8;border:1px solid rgba(120,160,220,.3);border-radius:6px;padding:2px 7px}' +
    '#ccowSearchResults{overflow-y:auto;padding:8px 10px}' +
    '#ccowSearchHint{padding:34px 18px;text-align:center;color:#94a3b8;font-size:13px;line-height:1.8}' +
    '.ccowSearchItem{display:block;text-decoration:none;border-radius:12px;padding:10px 12px;margin-bottom:2px;transition:.15s;border:1px solid transparent}' +
    '.ccowSearchItem:hover,.ccowSearchItem.cur{background:rgba(120,160,220,.1);border-color:rgba(120,160,220,.25)}' +
    '.ccowSearchItem .t{font-size:14.5px;font-weight:700;color:#1e293b;line-height:1.5}' +
    'body[data-theme="deep"] .ccowSearchItem .t{color:#e9f0fb}' +
    '.ccowSearchItem .t mark{background:rgba(250,204,21,.45);color:inherit;border-radius:3px;padding:0 1px}' +
    'body[data-theme="deep"] .ccowSearchItem .t mark{background:rgba(250,204,21,.3)}' +
    '.ccowSearchItem .crumb{margin-top:3px;font-size:11px;color:#64748b;display:flex;gap:8px;align-items:center}' +
    'body[data-theme="deep"] .ccowSearchItem .crumb{color:#8fa3bd}' +
    '.ccowSearchItem .crumb .cat{color:#2563eb;font-weight:600}' +
    'body[data-theme="deep"] .ccowSearchItem .crumb .cat{color:#5eead4}' +
    '.ccowSearchItem .snip{margin-top:4px;font-size:12.5px;color:#475569;line-height:1.65;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}' +
    'body[data-theme="deep"] .ccowSearchItem .snip{color:#aeb9d0}' +
    '.ccowSearchItem .snip mark{background:rgba(250,204,21,.45);color:inherit;border-radius:3px}' +
    '@media(max-width:640px){#ccowSearchBackdrop{padding:6vh 10px 10px}#ccowSearchPanel{max-height:84vh}}'
  var st = document.createElement('style')
  st.textContent = css
  ;(document.head || document.documentElement).appendChild(st)

  // ---------- 构建 UI ----------
  var backdrop = document.createElement('div')
  backdrop.id = 'ccowSearchBackdrop'
  backdrop.innerHTML =
    '<div id="ccowSearchPanel" role="dialog" aria-label="全站搜索">' +
      '<div id="ccowSearchInputWrap">' +
        '<span style="font-size:17px">🔍</span>' +
        '<input id="ccowSearchInput" type="text" placeholder="搜索全站：书名 / 章节 / 工具 / 关键词…" autocomplete="off" spellcheck="false" aria-label="搜索关键词">' +
        '<span id="ccowSearchKbd">ESC</span>' +
      '</div>' +
      '<div id="ccowSearchResults"></div>' +
    '</div>'
  document.body.appendChild(backdrop)
  var panel = backdrop.querySelector('#ccowSearchPanel')
  var input = backdrop.querySelector('#ccowSearchInput')
  var resultsEl = backdrop.querySelector('#ccowSearchResults')
  var cur = -1, lastResults = [], loadedIdx = null

  // ---------- 索引懒加载 ----------
  function loadIndex(cb) {
    if (loadedIdx) { cb(loadedIdx); return }
    if (loading) { setTimeout(function () { loadIndex(cb) }, 80); return }
    loading = true
    var s = document.createElement('script')
    s.src = INDEX_URL
    s.onload = function () { loadedIdx = G.SEARCH_INDEX || []; loading = false; cb(loadedIdx) }
    s.onerror = function () { loading = false; renderHint('搜索索引加载失败（' + INDEX_URL + '），请先生成：node scripts/gen-search-index.mjs') }
    document.head.appendChild(s)
  }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }
  // 大小写不敏感高亮
  function markCI(text, terms) {
    var lower = norm(text), out = '', last = 0, marks = []
    for (var i = 0; i < terms.length; i++) {
      var t = terms[i], p = 0
      while ((p = lower.indexOf(t, p)) !== -1) { marks.push([p, p + t.length]); p += t.length }
    }
    marks.sort(function (a, b) { return a[0] - b[0] })
    var merged = []
    for (var j = 0; j < marks.length; j++) {
      var m = marks[j]
      if (merged.length && m[0] <= merged[merged.length - 1][1]) {
        merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], m[1])
      } else merged.push([m[0], m[1]])
    }
    for (var k = 0; k < merged.length; k++) {
      out += esc(text.slice(last, merged[k][0])) + '<mark>' + esc(text.slice(merged[k][0], merged[k][1])) + '</mark>'
      last = merged[k][1]
    }
    out += esc(text.slice(last))
    return out
  }

  function catOf(u) {
    if (u === 'index.html') return '首页'
    var seg = u.split('/')[0]
    return ({ website: '知识站', blog: '博客', book: '书籍', lab: '实验室', novel: '小说' })[seg] || seg
  }

  function renderHint(msg) {
    resultsEl.innerHTML = '<div id="ccowSearchHint">' + msg + '</div>'
  }
  function renderEmpty(q) {
    renderHint('未找到与「' + esc(q) + '」相关的页面<br>换个关键词试试，或搜索书名 / 章节 / 工具名')
  }
  function renderResults(list, terms) {
    lastResults = list
    cur = -1
    if (!list.length) {
      if (!terms.length) renderHint('输入关键词开始搜索，如「提示词」「DeepSeek」「PID」')
      else renderEmpty(input.value)
      return
    }
    var html = ''
    for (var i = 0; i < list.length; i++) {
      var it = list[i].item, sc = list[i].score
      var fields = list[i].fields.length ? list[i].fields.join('·') : ''
      var snip = it.s || ''
      var snipHtml = ''
      if (snip) {
        var fh = G.CCOWorkSearch.firstHitIn(snip, terms)
        if (fh.pos > 20) snip = '…' + snip.slice(Math.max(0, fh.pos - 20))
        snipHtml = '<div class="snip">' + markCI(snip, terms) + '</div>'
      }
      html += '<a class="ccowSearchItem" href="' + esc(G.CCOWorkSearch.absUrl(it.u)) + '" data-i="' + i + '">' +
        '<div class="t">' + markCI(it.t, terms) + '</div>' +
        '<div class="crumb"><span class="cat">' + catOf(it.u) + '</span><span>' + esc(fields) + '</span></div>' +
        snipHtml +
      '</a>'
    }
    resultsEl.innerHTML = html
    resultsEl.querySelectorAll('.ccowSearchItem').forEach(function (el, i) {
      el.addEventListener('mouseenter', function () { setCur(i) })
    })
  }

  function setCur(i) {
    cur = i
    var els = resultsEl.querySelectorAll('.ccowSearchItem')
    els.forEach(function (el, j) { el.classList.toggle('cur', j === i) })
    if (els[i]) els[i].scrollIntoView({ block: 'nearest' })
  }

  // ---------- 搜索流程 ----------
  var debounce = null
  function doSearch(q) {
    q = (q || '').trim()
    if (!q) { renderResults([], []); return }
    loadIndex(function (idx) {
      var terms = G.CCOWorkSearch.tokenize(q)
      if (!terms.length) { renderResults([], []); return }
      var list = G.CCOWorkSearch.match(q, idx, MAX_RESULTS)
      renderResults(list, terms)
    })
  }
  input.addEventListener('input', function () {
    clearTimeout(debounce)
    var v = this.value
    debounce = setTimeout(function () { doSearch(v) }, 130)
  })
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCur(Math.min(cur + 1, lastResults.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCur(Math.max(cur - 1, 0)) }
    else if (e.key === 'Enter') {
      if (cur >= 0 && lastResults[cur]) location.href = G.CCOWorkSearch.absUrl(lastResults[cur].item.u)
      else if (lastResults.length === 1) location.href = G.CCOWorkSearch.absUrl(lastResults[0].item.u)
    } else if (e.key === 'Escape') close()
  })
  function open() {
    backdrop.classList.add('show')
    setTimeout(function () { input.focus(); input.select() }, 60)
    if (LS.get('ccowork.searchLast')) { input.value = LS.get('ccowork.searchLast'); doSearch(input.value) }
  }
  function close() {
    backdrop.classList.remove('show')
    if (input.value) LS.set('ccowork.searchLast', input.value)
    input.blur()
  }
  backdrop.addEventListener('mousedown', function (e) { if (e.target === backdrop) close() })


  // 矢量图标：沿用站点 cc-ic CSS-mask 体系，自动继承文字颜色与字号
  function ic(name) {
    return '<i class="cc-ic" data-ic="' + name + '" aria-hidden="true"></i>'
  }
  // ---------- 触发按钮：优先导航栏，无导航或导航不可见（移动端折叠）则悬浮 ----------
  function injectButton() {
    if (document.querySelector('#ccowSearchBtn')) return
    var btn = document.createElement('button')
    btn.id = 'ccowSearchBtn'
    btn.type = 'button'
    btn.innerHTML = ic('search') + ' <span style="font-size:11px;opacity:.75">搜索</span>'
    btn.title = '全站搜索（/ 或 Ctrl+K）'
    btn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); open() })
    var nav = document.querySelector('nav, header .wrap > nav, .topbar, #topbar')
    if (nav) {
      var actions = nav.querySelector('.nav-actions') || nav
      actions.appendChild(btn)
      // 导航在移动端折叠/隐藏，或被 module.js 吸顶目录条遮挡 → 切换为悬浮按钮（z-index 高于目录条）
      setTimeout(function () {
        var r = btn.getBoundingClientRect()
        var toc = document.querySelector('#modTocBar')
        var tocR = toc ? toc.getBoundingClientRect() : null
        var overlap = !!(tocR && r.width > 0 && r.height > 0 &&
          r.x < tocR.x + tocR.width && r.x + r.width > tocR.x &&
          r.y < tocR.y + tocR.height && r.y + r.height > tocR.y)
        if (!btn.offsetParent || r.width === 0 || r.height === 0 || overlap) toFlat(btn)
      }, 80)
    } else {
      toFlat(btn)
    }
  }
  function toFlat(btn) {
    btn.classList.add('flat')
    btn.innerHTML = ic('search')
    document.body.appendChild(btn)
  }

  // ---------- 全局快捷键 ----------
  function isTyping(e) {
    var t = e.target
    return /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !isTyping(e) && !backdrop.classList.contains('show')) { e.preventDefault(); open() }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); backdrop.classList.contains('show') ? close() : open() }
  })

  // ---------- 启动 ----------
  function boot() {
    if (!document.body) { setTimeout(boot, 50); return }
    injectButton()
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot)
  else boot()
})()

// 浏览器下补一个便捷导出（供页面脚本调用）
if (typeof document !== 'undefined' && typeof globalThis !== 'undefined' && globalThis.CCOWorkSearch) {
  globalThis.CCOWorkSearch.absUrl = function (u) { return location.origin + '/' + u.replace(/^\/+/, '') }
}
