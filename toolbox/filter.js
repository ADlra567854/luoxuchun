/* ==========================================================================
   filter.js · 仓库 / 条目列表的筛选与排序（2026-10-29）
   --------------------------------------------------------------------------
   页面上有 96 个仓库卡，纯静态 HTML 渲染（首屏不闪、可被搜索引擎读到），
   本文件只负责「显隐 + 重排」，不生成任何内容。

   依赖的 DOM 约定（由 scripts/gen-toolbox.py 产出）：
     #catChips .pg-chip[data-cat]   分类按钮，data-cat="all" 表示全部
     #q                             搜索框
     #sort                          排序选择，值 star / easy / name
     #list > [data-cat][data-t][data-s][data-h]   条目
     #rc                            计数文字
     #empty                         空态
   ========================================================================== */
;(function () {
  'use strict'
  var chips = document.getElementById('catChips')
  var list = document.getElementById('list')
  var q = document.getElementById('q')
  var sort = document.getElementById('sort')
  var rc = document.getElementById('rc')
  var empty = document.getElementById('empty')
  if (!list) return

  var items = [].slice.call(list.querySelectorAll('[data-cat]'))
  var curCat = 'all'

  /* 预先算好排序键，避免每次输入都重新解析 */
  items.forEach(function (el, i) {
    el.__i = i
    el.__s = parseInt(el.getAttribute('data-s') || '0', 10)
    el.__h = parseInt(el.getAttribute('data-h') || '2', 10)
    el.__n = (el.querySelector('h3') ? el.querySelector('h3').textContent : '').trim()
  })

  function apply() {
    var kw = (q && q.value || '').trim().toLowerCase()
    var shown = 0
    items.forEach(function (el) {
      var okCat = curCat === 'all' || el.getAttribute('data-cat') === curCat
      var okKw = !kw || (el.getAttribute('data-t') || '').toLowerCase().indexOf(kw) > -1
      var ok = okCat && okKw
      el.hidden = !ok
      if (ok) shown++
    })
    if (rc) {
      var label = rc.textContent.replace(/^共\s*\d+\s*条$/, '')
      rc.textContent = '共 ' + shown + ' 条' + (shown < items.length ? ' / ' + items.length : '')
    }
    if (empty) empty.hidden = shown !== 0
  }

  function order() {
    var v = sort ? sort.value : 'star'
    var sorted = items.slice().sort(function (a, b) {
      if (v === 'easy') return a.__h - b.__h || b.__s - a.__s
      if (v === 'name') return a.__n.localeCompare(b.__n, 'zh-Hans-CN')
      return b.__s - a.__s
    })
    // 用 DocumentFragment 一次搬完，避免逐次 append 触发多次重排
    var frag = document.createDocumentFragment()
    sorted.forEach(function (el) { frag.appendChild(el) })
    list.appendChild(frag)
  }

  if (chips) {
    chips.addEventListener('click', function (e) {
      var b = e.target.closest('.pg-chip')
      if (!b) return
      curCat = b.getAttribute('data-cat') || 'all'
      /* 注意这里的分号不能省：上一行以字符串结尾，下一行以 [ 开头，
         不加分号会被解析成 'all'[].forEach 而报 SyntaxError。 */
      ;[].forEach.call(chips.querySelectorAll('.pg-chip'), function (x) {
        x.classList.toggle('on', x === b)
      })
      apply()
    })
  }

  var t = null
  if (q) {
    q.addEventListener('input', function () {
      clearTimeout(t)
      t = setTimeout(apply, 120)
    })
    // Esc 清空
    q.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { q.value = ''; apply() }
    })
  }

  if (sort) sort.addEventListener('change', function () { order(); apply() })

  order()
  apply()
})()
