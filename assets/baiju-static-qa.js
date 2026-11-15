/* 白驹 · 站点速览 · 纯预设内容层（零依赖）
 *
 * 公开层唯一允许的交互：点击预设问题 → 展开预设答案。
 * 硬边界（不得突破）：
 *   - 没有任何 input / textarea / contenteditable，用户无法自由提问；
 *   - 没有任何 fetch / XHR / WebSocket / EventSource / script 注入，不发网络请求；
 *   - 不读写 localStorage / cookie，不接任何模型，不产生实时或自动回答；
 *   - 答案、链接、数字全部是本文件常量，链接只指向站内已存在的页面。
 * 供朋友使用的独立能力不在此处，也不从此处进入。
 */
(function () {
  'use strict'
  if (window.__baijuStaticQa) return
  window.__baijuStaticQa = true

  /* 数字来自发布物实测；链接均为站内已存在路径，不编造子域。 */
  var QA = [
    {
      q: '这个站有哪些内容？',
      a: '作品展示、源码与实验、书稿、教程、博客、工具台、场馆体系，共 7 个板块。',
      links: [['作品展示', '/works.html'], ['源码与实验', '/lab/code.html'], ['书稿', '/book/index.html'], ['教程', '/learn/index.html']]
    },
    {
      q: '一共有多少源码？',
      a: '33 个自有源码：27 个 Python 脚本 + 6 个前端模块，每个都带结论。',
      links: [['查看源码清单', '/lab/code.html']]
    },
    {
      q: '数据实验室里有什么？',
      a: '27 个 Python 脚本、10 张配图、7 个分组，覆盖算法、数值、建模与仿真。',
      links: [['进入实验室', '/lab/index.html'], ['源码清单', '/lab/code.html']]
    },
    {
      q: '书稿和教程有多少？',
      a: '书稿 67 页，教程 51 页。',
      links: [['书稿', '/book/index.html'], ['教程', '/learn/index.html']]
    },
    {
      q: '场馆体系是什么？',
      a: '5 类共 42 个地点，覆盖 15 座城市。',
      links: [['场馆总览', '/about/map-guide.html']]
    },
    {
      q: '有哪些工具？',
      a: '工具台 26 页。',
      links: [['工具台', '/toolbox/index.html']]
    },
    {
      q: '站点内容多久更新？',
      a: '每日更新。',
      links: [['最近更新', '/about/changelog.html'], ['站点说明', '/about/index.html']]
    }
  ]

  var host = null, panel = null, open = false

  function el(tag, cls, txt) {
    var e = document.createElement(tag)
    if (cls) e.className = cls
    if (txt != null) e.textContent = txt
    return e
  }

  function build() {
    if (host) return
    host = el('div', 'bjqa')
    var fab = el('button', 'bjqa-fab', '站点速览')
    fab.type = 'button'
    fab.setAttribute('aria-expanded', 'false')
    fab.setAttribute('aria-label', '站点速览')
    panel = el('div', 'bjqa-panel')
    panel.hidden = true

    var hd = el('div', 'bjqa-hd')
    hd.appendChild(el('span', 'bjqa-mark', '🐎 白驹 ccowork'))
    var close = el('button', 'bjqa-x', '收起')
    close.type = 'button'
    close.addEventListener('click', function () { setOpen(false) })
    hd.appendChild(close)
    panel.appendChild(hd)
    panel.appendChild(el('p', 'bjqa-lead', '下面是几个常见问题，点一下就能看到答案。'))

    var list = el('div', 'bjqa-list')
    QA.forEach(function (item, i) {
      var q = el('button', 'bjqa-q', item.q)
      q.type = 'button'
      q.setAttribute('aria-expanded', 'false')
      var box = el('div', 'bjqa-a')
      box.hidden = true
      box.appendChild(el('p', 'bjqa-txt', item.a))
      if (item.links && item.links.length) {
        var ls = el('div', 'bjqa-links')
        item.links.forEach(function (L) {
          var a = el('a', 'bjqa-link', L[0])
          a.href = L[1]
          ls.appendChild(a)
        })
        box.appendChild(ls)
      }
      q.addEventListener('click', function () {
        var willOpen = box.hidden
        /* 一次只展开一条，避免当成连续对话 */
        list.querySelectorAll('.bjqa-a').forEach(function (b) {
          b.hidden = true
          var pq = b.previousElementSibling
          if (pq) pq.setAttribute('aria-expanded', 'false')
        })
        box.hidden = !willOpen
        q.setAttribute('aria-expanded', String(willOpen))
      })
      list.appendChild(q)
      list.appendChild(box)
    })
    panel.appendChild(list)
    fab.addEventListener('click', function () { setOpen(!open) })
    host.appendChild(panel)
    host.appendChild(fab)
    document.body.appendChild(host)
  }

  function setOpen(v) {
    open = !!v
    if (!panel) return
    panel.hidden = !open
    var fab = host.querySelector('.bjqa-fab')
    if (fab) fab.setAttribute('aria-expanded', String(open))
  }

  function destroy() {
    if (host && host.parentNode) host.parentNode.removeChild(host)
    host = null; panel = null; open = false
    window.__baijuStaticQa = false
  }

  /* 只在公开态存在；朋友层一旦打开，这里立刻撤走，不出现两套并列入口。 */
  function sync() {
    var gate = document.documentElement.getAttribute('data-gate')
    var hidden = document.body && document.body.classList.contains('bj-gated-page')
    if (gate === 'locked' && !hidden) build()
    else destroy()
  }

  document.addEventListener('baiju:gate-open', destroy)
  document.addEventListener('baiju:gate-close', sync)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sync)
  } else {
    sync()
  }
})()
