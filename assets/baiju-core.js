/* ============================================================
 * baiju-core.js · 白驹全站内核
 * ------------------------------------------------------------
 * 由 ccowork.js 全站注入（覆盖 94.5% 页面），提供四件事：
 *   1. 角色导入：首次进入选身份 → 记住 → 全站按身份给入口
 *   2. 登录体系：昵称 + 口令的轻量账号（本地优先，服务端可达则云同步）
 *   3. 评论与提醒：页面评论 + 被回复提醒 + 内容更新提醒（铃铛红点）
 *   4. 布局骨架：data-skeleton 三种版心，导航超 7 项自动收进「更多」
 *
 * 诚实原则：后端不可达时明确降级为「本地模式」，并在界面上写明，
 *           不假装云端已保存。
 * ============================================================ */
(function () {
  'use strict'
  if (window.__baijuCore) return
  window.__baijuCore = true

  /* ---------------- 常量 ---------------- */
  var K = {
    role: 'baiju.role',
    user: 'baiju.user',
    token: 'baiju.token',
    onboard: 'baiju.onboarded',
    notifyRead: 'baiju.notify.readAt',
    pickSeen: 'baiju.pick.seenDate',
    cmt: 'baiju.comments.',
    likes: 'baiju.likes',
    muted: 'baiju.notify.muted'
  }

  // 六类身份（与 data/role-map.json 一致，内置副本以免拖 110KB 进前端）
  var ROLES = [
    { id: 'teacher', name: '老师', icon: '🎓', sub: '明天上课就能用', go: 'website/ai-edu.html', goLabel: 'AI 进校园' },
    { id: 'student', name: '学生', icon: '📚', sub: '作业、选题、搞明白', go: 'website/ai-academy.html', goLabel: '自学路线' },
    { id: 'developer', name: '开发者', icon: '💻', sub: '写代码、接模型、跑起来', go: 'website/ai-tools.html', goLabel: 'AI 工具真库' },
    { id: 'engineer', name: '技术人员', icon: '⚙️', sub: '设备、产线、现场落地', go: 'website/smart-manufacturing.html', goLabel: '智能制造' },
    { id: 'toolbox', name: '工具台', icon: '🧰', sub: '只想要能直接用的', go: 'website/role-entry.html?as=toolbox', goLabel: '工具清单' },
    { id: 'everyone', name: '普通人', icon: '🙂', sub: '生活里用 AI 省点事', go: 'website/daily.html', goLabel: '每日简报' }
  ]

  // 这些页面不自动挂评论区（门户/工作台/工具页）
  var NO_COMMENT = /(^|\/)(index|hub|portal|covers|role-entry|agent|chat|workstation|reader|start|assistant|compile|404|biz|account|notify)\.html$|linguavista|\/lab\//i

  /* ---------------- 存储小工具 ---------------- */
  function rd(k, def) {
    try { var v = localStorage.getItem(k); return v == null ? def : JSON.parse(v) } catch (e) { return def }
  }
  function wr(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) {} }
  function rm(k) { try { localStorage.removeItem(k) } catch (e) {} }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }
  function pathKey() {
    var p = location.pathname || '/'
    if (p.length > 1 && p.charAt(p.length - 1) === '/') p = p.slice(0, -1)
    return p
  }
  function when(ts) {
    var d = Math.max(0, Date.now() - ts), m = d / 60000
    if (m < 1) return '刚刚'
    if (m < 60) return Math.floor(m) + ' 分钟前'
    if (m < 1440) return Math.floor(m / 60) + ' 小时前'
    if (m < 43200) return Math.floor(m / 1440) + ' 天前'
    return new Date(ts).toLocaleDateString('zh-CN')
  }

  /* ---------------- 后端探测（云端 / 本地模式） ---------------- */
  var NET = { online: null, checking: null, caps: {} }
  /* 服务端能力探测。
     只看「服务端活着」是不够的 —— server 返回 status:ok 但没实现评论/通知接口时，
     前端去打 /api/comments 会得到 404。改成按 caps 里的能力标志判断。 */
  function ping(cap) {
    if (NET.online !== null) return Promise.resolve(NET.online)
    if (NET.checking) return NET.checking
    /* 8s 超时兜底：本地静态服务 + Chromium 连接池有竞态，fetch 可能永远挂起 */
    var hCtrl = (typeof AbortController === 'function') ? new AbortController() : null
    var hTimer = hCtrl && setTimeout(function () { try { hCtrl.abort() } catch (e) {} }, 8000)
    NET.checking = fetch('/api/health', { cache: 'no-store', signal: hCtrl && hCtrl.signal })
      .then(function (r) {
        var ct = (r.headers && r.headers.get('content-type')) || ''
        /* 无论成败都必须把 body 读完：fetch 响应体不消费时 Chromium 会把
           请求永远记为“加载中”，卡住 networkidle 类的页面空闲判定。 */
        return r.text().then(function (t) {
          if (!r.ok || ct.indexOf('json') < 0) return false
          var j = null
          try { j = JSON.parse(t) } catch (e) { return false }
          if (!(j && j.status === 'ok')) return false
          NET.caps = j.caps || {}
          return true
        })
      })
      .catch(function () { return false })
      .then(function (ok) { if (hTimer) clearTimeout(hTimer); NET.online = ok; NET.checking = null; return ok })
    return NET.checking
  }
  /* 某个能力服务端是否提供。没声明能力表的老服务端一律当作不支持，
     这样不会因为服务端活着就盲目打接口。 */
  function hasCap(cap) {
    return ping().then(function (ok) {
      if (!ok) return false
      var c = NET.caps || {}
      return c[cap] === true
    })
  }
  function api(path, body) {
    var opt = { headers: { 'Content-Type': 'application/json' } }
    var tok = rd(K.token, '')
    if (tok) opt.headers['x-baiju-token'] = tok
    if (body) { opt.method = 'POST'; opt.body = JSON.stringify(body) }
    return fetch(path, opt).then(function (r) { return r.json() }).catch(function () { return { ok: false, offline: true } })
  }

  /* ============================================================
   * 一、角色（导入 + 记忆 + 分流）
   * ============================================================ */
  var Role = {
    get: function () {
      var r = rd(K.role, null)
      var hit = ROLES.filter(function (x) { return x.id === r })[0]
      return hit || null
    },
    set: function (id, silent) {
      var hit = ROLES.filter(function (x) { return x.id === id })[0]
      if (!hit) return
      wr(K.role, id)
      wr(K.onboard, 1)
      // 已登录则同步到账号资料
      var u = Auth.current()
      if (u) { u.role = id; wr(K.user, u); syncUser(u) }
      renderIdentity()
      if (!silent) {
        toast('身份已设为「' + hit.name + '」，全站按这个身份给你入口')
        try { document.dispatchEvent(new CustomEvent('baiju:role', { detail: hit })) } catch (e) {}
      }
    },
    clear: function () { rm(K.role); rm(K.onboard) }
  }

  /* ============================================================
   * 二、登录体系（昵称 + 口令，服务端可达则云同步）
   * ============================================================ */
  var Auth = {
    current: function () { return rd(K.user, null) },
    login: function (nick, pass, cb) {
      nick = String(nick || '').trim().slice(0, 16)
      if (nick.length < 2) return cb({ ok: false, msg: '昵称至少 2 个字' })
      if (String(pass || '').length < 4) return cb({ ok: false, msg: '口令至少 4 位' })
      hasCap('auth').then(function (online) {
        if (!online) {
          var u = { uid: 'local-' + uid(), nick: nick, role: (Role.get() || {}).id || 'everyone', mode: 'local', ts: Date.now() }
          wr(K.user, u); wr(K.token, 'local')
          renderIdentity(); renderComments(); cb({ ok: true, user: u, mode: 'local' })
          return
        }
        api('/api/auth/login', { nick: nick, pass: pass, role: (Role.get() || {}).id || 'everyone' }).then(function (j) {
          if (!j.ok) return cb(j)
          wr(K.user, j.user); wr(K.token, j.token)
          renderIdentity(); renderComments(); cb({ ok: true, user: j.user, mode: 'cloud' })
        })
      })
    },
    logout: function () {
      rm(K.user); rm(K.token)
      renderIdentity(); renderComments(); toast('已退出登录（本机数据保留）')
    }
  }
  function syncUser(u) {
    hasCap('auth').then(function (o) { if (o) api('/api/auth/me', { nick: u.nick, role: u.role }) })
  }

  /* ============================================================
   * 三、评论（页面维度）
   * ============================================================ */
  var Comments = {
    all: function () { return rd(K.cmt + pathKey(), []) },
    save: function (list) { wr(K.cmt + pathKey(), list) },
    add: function (text, parent) {
      text = String(text || '').trim().slice(0, 1000)
      if (!text) return { ok: false, msg: '说点什么再发吧' }
      var u = Auth.current()
      var c = {
        id: uid(), path: pathKey(), text: text, parent: parent || null,
        nick: u ? u.nick : ('访客' + uid().slice(-4)),
        uid: u ? u.uid : 'anon',
        role: (Role.get() || {}).id || '',
        ts: Date.now(), mine: true
      }
      var list = Comments.all(); list.push(c); Comments.save(list)
      hasCap('comments').then(function (online) {
        if (online) api('/api/comments', { path: c.path, text: c.text, parent: c.parent }).then(function (j) {
          if (j && j.ok && j.item) { c.serverId = j.item.id; Comments.save(Comments.all().map(function (x) { return x.id === c.id ? c : x })) }
          renderComments()
        })
      })
      renderComments()
      return { ok: true }
    },
    del: function (id) {
      var list = Comments.all().filter(function (c) { return c.id !== id })
      Comments.save(list); renderComments()
      hasCap('comments').then(function (o) { if (o) api('/api/comments/delete', { id: id }) })
    },
    like: function (id) {
      var likes = rd(K.likes, {})
      likes[id] = !likes[id]; wr(K.likes, likes)
      var list = Comments.all()
      list.forEach(function (c) { if (c.id === id) c.likes = (c.likes || 0) + (likes[id] ? 1 : -1) })
      Comments.save(list); renderComments()
      hasCap('comments').then(function (o) { if (o) api('/api/comments/like', { id: id, on: !!likes[id] }) })
    },
    pull: function () {
      hasCap('comments').then(function (online) {
        if (!online) return
        api('/api/comments?path=' + encodeURIComponent(pathKey())).then(function (j) {
          if (!j || !j.ok || !Array.isArray(j.data)) return
          var local = Comments.all()
          var seen = {}
          local.forEach(function (c) { if (c.serverId) seen[c.serverId] = 1 })
          var add = j.data.filter(function (c) { return !seen[c.id] }).map(function (c) {
            return {
              id: 's-' + c.id, serverId: c.id, path: c.path, text: c.text, parent: c.parent || null,
              nick: c.nick, uid: c.uid, role: c.role || '', ts: c.ts, likes: c.likes || 0,
              mine: !!(Auth.current() && Auth.current().uid === c.uid)
            }
          })
          if (add.length) { Comments.save(local.concat(add)); renderComments() }
        })
      })
    }
  }

  /* ============================================================
   * 四、提醒（回复提醒 + 内容更新提醒）
   * ============================================================ */
  var Notify = {
    // 本地可算出的：内容更新类
    sysList: function () {
      var out = []
      var seen = rd(K.pickSeen, '')
      var d = window.__BJ_PICK_DATE || ''
      if (d && d !== seen) out.push({ id: 'pick-' + d, type: 'pick', text: '每日精选已更新（' + d + '）', href: 'website/wechat-pick.html', ts: Date.now() })
      return out
    },
    fetch: function (cb) {
      hasCap('notify').then(function (online) {
        var sys = Notify.sysList()
        if (!online) return cb(sys, false)
        api('/api/notify').then(function (j) {
          var list = (j && j.ok && Array.isArray(j.data)) ? j.data : []
          cb(sys.concat(list.map(function (n) {
            return { id: n.id, type: n.type, text: n.text, href: n.href, ts: n.ts, unread: !n.read }
          })), true)
        })
      })
    },
    unread: function (list) {
      var last = rd(K.notifyRead, 0)
      return list.filter(function (n) { return (n.ts || 0) > last }).length
    },
    markAll: function () {
      wr(K.notifyRead, Date.now())
      hasCap('notify').then(function (o) { if (o) api('/api/notify/read', {}) })
      renderBell()
    }
  }

  /* ---------------- 迷你提醒数据（每日精选日期） ---------------- */
  // 站点统一部署在根，用绝对路径，子目录页面才不会 404
  fetch('/data/wechat-pick.json', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null })
    .then(function (j) { if (j && j.date) { window.__BJ_PICK_DATE = j.date; renderBell() } })
    .catch(function () {})

  /* ============================================================
   * UI 渲染
   * ============================================================ */
  var el = {}
  function mk(tag, cls, html) {
    var n = document.createElement(tag)
    if (cls) n.className = cls
    if (html != null) n.innerHTML = html
    return n
  }
  function toast(msg) {
    var t = document.getElementById('bjToast')
    if (!t) { t = mk('div', 'bj-toast'); t.id = 'bjToast'; document.body.appendChild(t) }
    t.textContent = msg
    t.classList.add('on')
    clearTimeout(t.__t)
    t.__t = setTimeout(function () { t.classList.remove('on') }, 2600)
  }

  /* ---- 顶栏：身份 + 铃铛 ---- */
  function dockHost() {
    /* 2026-11-20：老式 header.nav 页（friends/lab/code/open-library 等）原来只找到
       <header>，控件被 append 到 header 根节点、掉到导航行下方左堆叠，压住 hero。
       优先挂进 header 内的 .wrap（导航 flex 行），让它和 logo / 返回学习同一行。 */
    var host = document.querySelector('nav.top .nav-actions') || document.querySelector('nav.top') ||
      document.querySelector('header .nav-actions') ||
      document.querySelector('header.nav .wrap') || document.querySelector('header')
    if (host) return { node: host, inline: true }
    var f = mk('div', 'bj-dock')
    document.body.appendChild(f)
    return { node: f, inline: false }
  }

  function renderIdentity() {
    var host = dockHost()
    var box = document.getElementById('bjIdBox')
    if (!box) {
      box = mk('div', 'bj-idbox'); box.id = 'bjIdBox'
      host.node.appendChild(box)
    } else if (box.parentNode !== host.node) host.node.appendChild(box)

    var u = Auth.current()
    var r = Role.get()
    var html = ''
    html += '<button class="bj-role-chip" id="bjRoleChip" type="button" title="切换身份">' +
      '<span class="bj-role-ico">' + (r ? r.icon : '🙂') + '</span>' +
      '<span class="bj-role-nm">' + (r ? r.name : '选身份') + '</span></button>'
    if (u) {
      html += '<button class="bj-me" id="bjMe" type="button" title="我的账号">' +
        '<span class="bj-ava">' + esc(u.nick.slice(0, 1)) + '</span>' +
        '<span class="bj-me-nm">' + esc(u.nick) + '</span></button>'
    } else {
      // 2026-11-25 老罗要求：入口文案从「登录」改为「我的」（进去才是登录/资料/设置）
      html += '<button class="bj-login" id="bjLogin" type="button">我的</button>'
    }
    box.innerHTML = html

    var chip = document.getElementById('bjRoleChip')
    var me = document.getElementById('bjMe')
    var lg = document.getElementById('bjLogin')
    if (chip) chip.onclick = goPickRole
    if (me) me.onclick = openAccount
    if (lg) lg.onclick = openAccount
    updateRoleEntryText(r)
  }

  /* 首页/导航上「你是谁？从这里开始」这类入口，选过身份后改成身份名 */
  function updateRoleEntryText(r) {
    if (!r) return
    document.querySelectorAll('a[href*="role-entry"]').forEach(function (a) {
      walkText(a, function (node) {
        if (/你是谁|身份入口|选身份/.test(node.nodeValue)) {
          node.nodeValue = node.nodeValue.replace(/你是谁[^·｜|]*|身份入口|选身份/, r.name + ' · 换身份')
        }
      })
    })
  }
  function walkText(root, fn) {
    var ns = root.childNodes || []
    for (var i = 0; i < ns.length; i++) {
      var n = ns[i]
      if (n.nodeType === 3) fn(n)
      else if (n.nodeType === 1) walkText(n, fn)
    }
  }

  /* 每个内容页底部：按身份给下一步去哪（角色导入真正落地的地方） */
  var RECS = {
    teacher: [
      { href: '/website/ai-edu.html', label: 'AI 进校园', why: '先看清边界' },
      { href: '/website/prompts100.html', label: '提示词 100 条', why: '明天上课能直接用' },
      { href: '/website/ai-academy.html', label: '自学路线', why: '系统学一遍' }
    ],
    student: [
      { href: '/website/ai-academy.html', label: '自学路线', why: '按路线走' },
      { href: '/website/ai-academy-quiz.html', label: '题库', why: '学了就测' },
      { href: '/website/majors.html', label: '专业与选方向', why: '少走弯路' }
    ],
    developer: [
      { href: '/website/ai-tools.html', label: 'AI 工具真库', why: '都带出处' },
      { href: '/website/local-deploy.html', label: '本地部署', why: '不出本机也能跑' },
      { href: '/website/ai-projects.html', label: '开源项目库', why: '照着抄一遍' }
    ],
    engineer: [
      { href: '/website/industry.html', label: '行业应用', why: '看别人怎么落地' },
      { href: '/website/cases.html', label: '案例库', why: '有出处可查' },
      { href: '/website/ai-tools.html', label: 'AI 工具真库', why: '挑能接进流程的' }
    ],
    toolbox: [
      { href: '/website/ai-tools.html', label: 'AI 工具真库', why: '直接能用' },
      { href: '/website/wechat-pick.html', label: '每日精选', why: '复制就能发' },
      { href: '/website/prompts100.html', label: '提示词 100 条', why: '照抄改改' }
    ],
    everyone: [
      { href: '/website/wechat-pick.html', label: '今日精选', why: '每天 8 条' },
      { href: '/website/daily.html', label: '每日简报', why: '真实源直抓' },
      { href: '/website/ai-money.html', label: 'AI 变现', why: '顺手赚点' }
    ]
  }

  function renderRoleBar() {
    if (document.getElementById('bjRoleBar')) return
    var r = Role.get()
    if (!r) return
    var recs = (RECS[r.id] || []).filter(function (x) { return location.pathname.indexOf(x.href) < 0 })
    if (!recs.length) return
    var host = commentHost() || document.body
    var bar = mk('section', 'bj-rolebar')
    bar.id = 'bjRoleBar'
    bar.innerHTML = '<div class="bj-rb-h"><span class="bj-rb-ico">' + r.icon + '</span>' +
      '<b>你是「' + esc(r.name) + '」，接下来看这些</b>' +
      '<button class="bj-mini" id="bjRbChange" type="button">换身份</button></div>' +
      '<div class="bj-rb-list">' + recs.map(function (x) {
        return '<a class="bj-rb" href="' + esc(x.href) + '"><b>' + esc(x.label) + '</b><i>' + esc(x.why) + '</i></a>'
      }).join('') + '</div>'
    if (host === document.body) document.body.appendChild(bar)
    else host.parentNode.insertBefore(bar, host.nextSibling)
    var ch = document.getElementById('bjRbChange')
    if (ch) ch.onclick = openRolePicker
  }

  function renderBell() {
    var host = dockHost()
    var b = document.getElementById('bjBell')
    if (!b) {
      b = mk('button', 'bj-bell'); b.id = 'bjBell'; b.type = 'button'
      b.setAttribute('aria-label', '提醒')
      host.node.appendChild(b)
      b.onclick = openNotify
    } else if (b.parentNode !== host.node) host.node.appendChild(b)
    Notify.fetch(function (list) {
      var n = Notify.unread(list)
      b.innerHTML = '🔔' + (n ? '<i class="bj-dot">' + (n > 99 ? '99+' : n) + '</i>' : '')
      b.classList.toggle('bj-bell-on', !!n)
    })
  }

  /* ---- 对话框通用 ---- */
  function dlg(id, title, bodyHtml) {
    var d = document.getElementById(id)
    if (!d) {
      d = mk('dialog', 'bj-dlg'); d.id = id
      document.body.appendChild(d)
    }
    d.innerHTML =
      '<div class="bj-dlg-head"><b>' + esc(title) + '</b>' +
      '<button class="bj-x" type="button" aria-label="关闭">✕</button></div>' +
      '<div class="bj-dlg-body">' + bodyHtml + '</div>'
    d.querySelector('.bj-x').onclick = function () { try { d.close() } catch (e) {} }
    if (!d.open) { try { d.showModal() } catch (e) { d.setAttribute('open', '') } }
    return d
  }

  /* ---- 角色选择（引导 / 切换） ---- */
  function roleCardsHtml() {
    var cur = (Role.get() || {}).id
    return '<div class="bj-roles">' + ROLES.map(function (r) {
      return '<button class="bj-role' + (r.id === cur ? ' on' : '') + '" type="button" data-role="' + r.id + '">' +
        '<span class="bj-ri">' + r.icon + '</span>' +
        '<span class="bj-rn">' + r.name + '</span>' +
        '<span class="bj-rs">' + esc(r.sub) + '</span></button>'
    }).join('') + '</div>'
  }
  function bindRoleCards(root, after) {
    root.querySelectorAll('.bj-role').forEach(function (b) {
      b.onclick = function () {
        Role.set(b.dataset.role)
        root.querySelectorAll('.bj-role').forEach(function (x) { x.classList.toggle('on', x.dataset.role === b.dataset.role) })
        if (after) after(ROLES.filter(function (r) { return r.id === b.dataset.role })[0])
      }
    })
  }

  /* 2026-11-20：导航「身份芯片」不再弹独立的 bjRoleDlg 模态框。
     首页有 #onboard 面板时滚过去并高亮（唯一入口）；
     其它页面跳回首页并带 pick=1，落地自动展开面板。
     设置里的「切换身份」仍走 openRolePicker —— 那是主动操作，不是新手引导。 */
  function goPickRole() {
    var p = document.getElementById('onboard')
    if (p) {
      p.scrollIntoView({ behavior: 'smooth', block: 'center' })
      p.classList.add('flash')
      setTimeout(function () { p.classList.remove('flash') }, 1500)
      try { document.dispatchEvent(new CustomEvent('baiju:needpick')) } catch (e) {}
      return
    }
    location.href = '/?pick=1#onboard'
  }

  function openRolePicker() {
    var d = dlg('bjRoleDlg', '你是谁，就从这里开始',
      '<p class="bj-tip">选一个身份，站里只显示你该读的、可以跳过的，以及读完能带走什么。' +
      '不需要从第一页读到最后一页。</p>' + roleCardsHtml() +
      '<p class="bj-tip2">已选身份会记在本机' + (Auth.current() ? '，并同步到你的账号' : '') + '。随时可改。</p>')
    bindRoleCards(d)
  }

  /* ---- 首次进入引导（2026-11-20 已下线）----
     原来首访 900ms 后弹「先花 5 秒，选一下你是谁」模态框，和首页内联的
     #onboard 面板问的是同一件事，两套身份体系还会各写各的存储。
     现在身份只在首页面板选，写 baiju.role 这一处；这里只留函数壳，避免
     step() 注册处报未定义。 ---- */
  function maybeOnboard() {}

  /* ---- 账号 / 登录 ---- */
  function openAccount() {
    var u = Auth.current()
    if (u) {
      var r = Role.get()
      dlg('bjAcctDlg', '我的账号',
        '<div class="bj-me-card"><span class="bj-ava big">' + esc(u.nick.slice(0, 1)) + '</span>' +
        '<div><b>' + esc(u.nick) + '</b><i>' + (u.mode === 'local' ? '本地模式（未连服务端）' : '云端账号') + '</i></div></div>' +
        '<div class="bj-kv"><span>当前身份</span><b>' + (r ? r.icon + ' ' + r.name : '未选') + '</b></div>' +
        '<div class="bj-row"><button class="bj-btn" id="bjChangeRole" type="button">切换身份</button>' +
        '<button class="bj-btn ghost" id="bjLogout" type="button">退出登录</button></div>' +
        '<p class="bj-tip2">本地模式：评论、身份、提醒都存在这台设备的浏览器里，换设备不同步。</p>')
      var cr = document.getElementById('bjChangeRole'); if (cr) cr.onclick = openRolePicker
      var lo = document.getElementById('bjLogout'); if (lo) lo.onclick = function () { Auth.logout(); try { document.getElementById('bjAcctDlg').close() } catch (e) {} }
      return
    }
    dlg('bjAcctDlg', '登录 / 建个号',
      '<p class="bj-tip">只需要昵称和口令，不填手机号、不要邮箱。用于记住你的身份、评论和提醒。</p>' +
      '<label class="bj-fld"><span>昵称</span><input id="bjNick" maxlength="16" placeholder="比如：老罗" autocomplete="nickname"></label>' +
      '<label class="bj-fld"><span>口令</span><input id="bjPass" type="password" minlength="4" placeholder="至少 4 位，本机不存明文"></label>' +
      '<div class="bj-row"><button class="bj-btn" id="bjDoLogin" type="button">登录 / 注册</button></div>' +
      '<p class="bj-tip2" id="bjLoginMsg"></p>')
    var btn = document.getElementById('bjDoLogin')
    if (btn) btn.onclick = function () {
      var msg = document.getElementById('bjLoginMsg')
      Auth.login(document.getElementById('bjNick').value, document.getElementById('bjPass').value, function (res) {
        if (!res.ok) { msg.textContent = '❌ ' + (res.msg || res.error || '失败了，再试一次'); return }
        msg.textContent = '✅ 进来了（' + (res.mode === 'cloud' ? '云端模式' : '本地模式') + '）'
        setTimeout(function () { try { document.getElementById('bjAcctDlg').close() } catch (e) {} }, 500)
      })
    }
  }

  /* ---- 提醒中心 ---- */
  function openNotify() {
    var d = dlg('bjNotifyDlg', '提醒', '<div class="bj-tip">加载中…</div>')
    // 关闭面板时才标记已读，面板内保留未读高亮
    d.addEventListener('close', function () { Notify.markAll() })
    Notify.fetch(function (list, online) {
      var last = rd(K.notifyRead, 0)
      var body = ''
      if (!list.length) {
        body = '<div class="bj-empty">还没有提醒。别人回复你的评论、每日精选更新，都会出现在这里。</div>'
      } else {
        body = '<ul class="bj-nlist">' + list.slice().sort(function (a, b) { return (b.ts || 0) - (a.ts || 0) }).map(function (n) {
          var un = (n.ts || 0) > last
          return '<li class="bj-nitem' + (un ? ' un' : '') + '">' +
            '<span class="bj-nico">' + (n.type === 'reply' ? '💬' : '🆕') + '</span>' +
            '<a class="bj-ntext" href="' + esc(n.href || '#') + '">' + esc(n.text) + '</a>' +
            '<span class="bj-nts">' + when(n.ts || Date.now()) + '</span></li>'
        }).join('') + '</ul>'
      }
      body += '<div class="bj-row"><button class="bj-btn ghost" id="bjMarkAll" type="button">全部标为已读</button>' +
        '<button class="bj-btn ghost" id="bjNotifyToggle" type="button">' + (rd(K.muted, 0) ? '开启桌面通知' : '关闭桌面通知') + '</button></div>'
      body += '<p class="bj-tip2">' + (online ? '云端模式：提醒会跨设备同步。' : '本地模式：提醒只在这台设备上算。') + '</p>'
      d.querySelector('.bj-dlg-body').innerHTML = body
      var ma = document.getElementById('bjMarkAll')
      if (ma) ma.onclick = function () { Notify.markAll(); d.querySelector('.bj-dlg-body').querySelectorAll('.bj-nitem').forEach(function (x) { x.classList.remove('un') }); toast('已全部标为已读') }
      var tg = document.getElementById('bjNotifyToggle')
      if (tg) tg.onclick = function () {
        var m = rd(K.muted, 0) ? 0 : 1; wr(K.muted, m)
        if (!m) askDesktop()
        tg.textContent = m ? '开启桌面通知' : '关闭桌面通知'
        toast(m ? '桌面通知已关闭' : '已申请桌面通知权限')
      }
    })
  }
  function askDesktop() {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') Notification.requestPermission()
  }

  /* ---- 评论区 ---- */
  function commentHost() {
    var p = location.pathname
    if (NO_COMMENT.test(p)) return null
    if (document.querySelector('[data-no-comments]')) return null
    var c = document.querySelector('[data-bj-comments]') || document.querySelector('#comments') ||
      document.querySelector('article') || document.querySelector('main') ||
      document.querySelector('.wrap') || document.querySelector('.container') || document.querySelector('.content') ||
      document.querySelector('.page') || document.querySelector('section') || document.body
    if (!c || (c.closest && c.closest('nav'))) return null
    return c
  }

  function renderComments() {
    var box = document.getElementById('bjComments')
    if (!box) return
    var list = Comments.all().slice().sort(function (a, b) { return a.ts - b.ts })
    var likes = rd(K.likes, {})
    var me = Auth.current()
    var u = Auth.current()
    var canPost = !!u
    var body = ''

    if (!list.length) {
      body += '<div class="bj-empty">这一页还没有人说话。你看完有什么想补充的，留一句，别人能收到提醒。</div>'
    } else {
      body += '<ul class="bj-clist">' + list.map(function (c) {
        var r = ROLES.filter(function (x) { return x.id === c.role })[0]
        var mine = me && (c.uid === me.uid || c.mine)
        return '<li class="bj-citem">' +
          '<div class="bj-ch"><span class="bj-ava sm">' + esc(c.nick.slice(0, 1)) + '</span>' +
          '<b>' + esc(c.nick) + '</b>' + (r ? '<i class="bj-rtag">' + r.icon + r.name + '</i>' : '') +
          '<span class="bj-cts">' + when(c.ts) + '</span></div>' +
          '<p class="bj-ctext">' + esc(c.text).replace(/\n/g, '<br>') + '</p>' +
          '<div class="bj-cops">' +
          '<button class="bj-mini" type="button" data-like="' + c.id + '">' + (likes[c.id] ? '已赞 ' : '赞 ') + (c.likes || 0) + '</button>' +
          (mine ? '<button class="bj-mini" type="button" data-del="' + c.id + '">删除</button>' : '') +
          '</div></li>'
      }).join('') + '</ul>'
    }

    body += canPost
      ? '<div class="bj-cform"><textarea id="bjCInput" rows="3" maxlength="1000" placeholder="说点有用的：你试过的结果、踩过的坑、不同意的地方…"></textarea>' +
        '<div class="bj-row end"><button class="bj-btn" id="bjCSend" type="button">发表</button></div></div>'
      : '<div class="bj-cform lock"><button class="bj-btn" id="bjCLogin" type="button">登录后参与讨论</button>' +
        '<span class="bj-tip2">登录只要昵称 + 口令，不发验证码。</span></div>'

    box.querySelector('.bj-cbox-body').innerHTML = body

    var send = document.getElementById('bjCSend')
    if (send) send.onclick = function () {
      var t = document.getElementById('bjCInput')
      var res = Comments.add(t.value)
      if (!res.ok) return toast(res.msg)
      t.value = ''
      toast('已发表')
    }
    var li = document.getElementById('bjCLogin')
    if (li) li.onclick = openAccount
    box.querySelectorAll('[data-like]').forEach(function (b) { b.onclick = function () { Comments.like(b.dataset.like) } })
    box.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function () { Comments.del(b.dataset.del); toast('已删除') } })
  }

  function mountComments() {
    if (document.getElementById('bjComments')) return
    var host = commentHost()
    if (!host) return
    var box = mk('section', 'bj-comments')
    box.id = 'bjComments'
    box.innerHTML = '<h2 class="bj-ch2">讨论 <em id="bjCCnt"></em></h2><div class="bj-cbox-body"></div>'
    var rb = document.getElementById('bjRoleBar')
    if (rb) rb.parentNode.insertBefore(box, rb.nextSibling)
    else if (host.tagName === 'ARTICLE' || host.tagName === 'MAIN') host.parentNode.insertBefore(box, host.nextSibling)
    else host.appendChild(box)
    renderComments()
    Comments.pull()
    // 服务端在不在 ≠ 评论接口在不在。用能力标志判断，
    // 否则会告诉用户「启动 server 就变云端」，而服务端根本没实现评论接口。
    hasCap('comments').then(function (online) {
      var tag = mk('div', 'bj-mode' + (online ? ' cloud' : ''),
        online ? '☁️ 云端模式 · 评论会同步到服务端'
               : '💾 本地模式 · 评论只存在这台设备')
      box.insertBefore(tag, box.querySelector('.bj-cbox-body'))
    })
  }

  /* ============================================================
   * 五、布局：骨架版心 + 导航精简
   * ============================================================ */
  function applySkeleton() {
    if (document.body.getAttribute('data-skeleton')) return
    var p = location.pathname
    var sk = null
    if (/^\/(website\/)?blog\//.test(p) || /^\/book\//.test(p) || /^\/(website\/)?book\//.test(p)) sk = 'article'
    else if (/\/(hub|covers|ecosystem|ai-projects|ai-tools|daily|wechat-pick|biz|role-entry)\.html/.test(p)) sk = 'cards'
    else if (/\/(agent|chat|workstation|reader|start|assistant|compile)/.test(p)) sk = 'desk'
    if (sk) document.body.setAttribute('data-skeleton', sk)
  }

  function healOverflow() {
    if (window.innerWidth > 900) return
    if (document.documentElement.scrollWidth - window.innerWidth <= 2) return
    var nodes = document.querySelectorAll('p, li, span, div, td, th, h1, h2, h3, h4, a')
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i]
      try {
        var pw = el.parentElement ? el.parentElement.clientWidth : window.innerWidth
        var w = el.getBoundingClientRect().width
        // 两种情况都算撑宽：内容比自己宽（overflow 溢出），或自己比父容器宽（inline-flex 常见）
        var overSelf = el.scrollWidth > el.clientWidth + 4
        var overParent = pw > 0 && w > pw + 4
        if (!overSelf && !overParent) continue
        if (el.clientWidth <= 0) continue
        var cs = getComputedStyle(el)
        if (cs.display.indexOf('flex') >= 0) {
          // 页面里 .tag 这类规则自带 nowrap 且优先级高，这里必须用 !important 才压得住
          el.style.setProperty('flex-wrap', 'wrap', 'important')
          el.style.setProperty('max-width', '100%', 'important')
          Array.prototype.forEach.call(el.children, function (k) {
            k.style.setProperty('white-space', 'normal', 'important')
            k.style.setProperty('flex-shrink', '1', 'important')
            k.style.setProperty('min-width', '0', 'important')
          })
        }
        if (cs.whiteSpace === 'nowrap') el.style.setProperty('white-space', 'normal', 'important')
      } catch (e) {}
    }
  }

  function trimNav() {
    var links = document.querySelector('nav.top .links') || document.querySelector('header nav .links')
    if (!links || links.dataset.bjTrimmed) return
    var as = [].slice.call(links.querySelectorAll('a'))
    if (as.length <= 7) return
    links.dataset.bjTrimmed = '1'
    var keep = as.slice(0, 6)
    var rest = as.slice(6)
    var more = mk('span', 'bj-more')
    var btn = mk('button', 'bj-more-btn', '更多 <i>▾</i>')
    btn.type = 'button'
    var menu = mk('div', 'bj-more-menu')
    rest.forEach(function (a) { menu.appendChild(a) })
    more.appendChild(btn); more.appendChild(menu)
    links.appendChild(more)
    btn.onclick = function (e) {
      e.stopPropagation()
      menu.classList.toggle('on')
      btn.setAttribute('aria-expanded', menu.classList.contains('on') ? 'true' : 'false')
    }
    document.addEventListener('click', function () { menu.classList.remove('on') })
  }

  /* ---------------- 启动 ---------------- */
  function step(name, fn) {
    try { fn() } catch (e) { console.warn('[baiju-core] ' + name + ' 失败: ' + (e && e.message)) }
  }
  function boot() {
    step('applySkeleton', applySkeleton)
    step('trimNav', trimNav)
    step('renderIdentity', renderIdentity)
    step('renderBell', renderBell)
    step('renderRoleBar', renderRoleBar)
    step('mountComments', mountComments)
    step('maybeOnboard', maybeOnboard)
    setTimeout(function () { step('healOverflow', healOverflow) }, 300)
    var t = null
    window.addEventListener('resize', function () {
      clearTimeout(t); t = setTimeout(function () { step('healOverflow', healOverflow) }, 400)
    })
    // 桌面通知：有未读且授权过，弹一次
    ping().then(function () {
      Notify.fetch(function (list) {
        var n = Notify.unread(list)
        if (n && !rd(K.muted, 0) && 'Notification' in window && Notification.permission === 'granted') {
          try { new Notification('白驹 · 有 ' + n + ' 条新提醒', { body: (list[0] || {}).text || '', icon: '/icon-192.png' }) } catch (e) {}
        }
      })
    })
    // 跨页同步（别的标签页发了评论）
    window.addEventListener('storage', function (e) {
      if (e.key && e.key.indexOf(K.cmt) === 0) renderComments()
      if (e.key === K.user || e.key === K.role) renderIdentity()
    })
  }

  // 内核可能早于 body 就绪被 async 注入，这里统一等到 DOM 可用再启动
  if (!document.body || document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot)
  } else {
    boot()
  }

  window.Baiju = { Role: Role, Auth: Auth, Comments: Comments, Notify: Notify, ROLES: ROLES, toast: toast, openAccount: openAccount, openRolePicker: openRolePicker }
})()
