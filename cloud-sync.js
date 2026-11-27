/* cloud-sync.js · 白驹 ccowork 云服务接入层
 * 复用应用 wbapp_lGbvBmNPqBUVWgPWsRqqyC 的 cloud-service publicConfig（Form B · CDN SDK）。
 * 能力：WorkBuddy 账号登录 + 收藏/偏好/工件/已读跨端云同步 + 评论点赞 + 公开分享链接。
 *       user_prefs（私有，每用户一行 JSONB）存偏好+收藏+工件+已读；
 *       bj_posts（公开读，登录写）存评论与点赞；bj_shares（公开读，登录写）存分享。
 * 由 module.js 按需加载；纯增量——本地 localStorage 既有行为不变，登录后才写入云端；
 * 未登录/失败时保留本地并明确提示，不做静默降级。
 * 2026-11-12：修 new url → new URL 笔误（登录/回调必抛错）；云 UI 收进唯一悬浮窗三角折叠区。
 */
(function () {
  'use strict'
  if (window.__cc_cloud) return
  window.__cc_cloud = true

  // publicConfig（来自 cloud-service 激活结果；publishableKey 可进源码、本身无权限、勿入日志）
  var PUB = {
    endpoint: 'https://mp-api.app.workbuddy.host',
    oauthRelayBaseUrl: 'https://www.workbuddy.cn/v2/as/genie-baas/oauth',
    publishableKey: 'wbpk_lGbvBmNPqBUVWgPWsRqqyC_7JNv8bvEVGPrkUZ5Dwvb6rULj9AxDXxm'
  }
  var SDK_URL = 'https://cdn.jsdelivr.net/npm/@tencent-ai/workbuddy-cloud-sdk@dev/lib/index.global.js'
  var SDK_FALLBACK = 'https://unpkg.com/@tencent-ai/workbuddy-cloud-sdk@dev/lib/index.global.js'  // 同包同 @dev 通道，jsdelivr 不可达时回退
  var SDK_SOURCES = [SDK_URL, SDK_FALLBACK]
  var LS = {
    get: function (k) { try { return localStorage.getItem(k) || '' } catch (e) { return '' } },
    set: function (k, v) { try { localStorage.setItem(k, v) } catch (e) {} }
  }
  // [body 属性, localStorage 键, blob 键]
  var PREFS = [
    ['data-theme', 'ccowork.theme', 'theme'],
    ['data-wall', 'ccowork.wall', 'wall'],
    ['data-font', 'ccowork.font', 'font'],
    ['data-read', 'ccowork.read', 'read'],
    ['data-role', 'ccowork.role', 'role']
  ]
  var cloud = null
  var pushing = false
  var pushTimer = null
  var applying = false

  function nowHM() { var d = new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }

  // ---------- 本地 <-> 云 ----------
  function localFav() { try { var v = JSON.parse(localStorage.getItem('ccowork.fav') || '[]'); return Array.isArray(v) ? v : [] } catch (e) { return [] } }
  function localStudio() { try { var v = JSON.parse(localStorage.getItem('baiju.studio.v1') || '{}'); return (v && typeof v === 'object') ? v : {} } catch (e) { return {} } }
  function localRead() { try { var v = JSON.parse(localStorage.getItem('ccowork.readset') || '[]'); return Array.isArray(v) ? v : [] } catch (e) { return [] } }
  /* 合并数组：取并集，不丢本地已有数据 */
  function mergeArr(a, b) {
    var out = Array.isArray(a) ? a.slice() : []
    ;(Array.isArray(b) ? b : []).forEach(function (x) { var s = String(x); if (out.indexOf(s) < 0) out.push(s) })
    return out
  }
  function localBlob() {
    var b = document.body, o = { fav: localFav() }
    PREFS.forEach(function (p) { o[p[2]] = b.getAttribute(p[0]) || '' })
    o.studio = localStudio()      // 工件 / 课题 / 模板（登录后云同步）
    o.readset = localRead()       // 标记已读
    return o
  }
  function applyBlob(blob) {
    if (!blob || typeof blob !== 'object') return
    applying = true
    try {
      if (Array.isArray(blob.fav)) LS.set('ccowork.fav', JSON.stringify(mergeArr(localFav(), blob.fav)))
      if (Array.isArray(blob.readset)) LS.set('ccowork.readset', JSON.stringify(mergeArr(localRead(), blob.readset)))
      if (blob.studio && typeof blob.studio === 'object') {
        var L = localStudio(), R = blob.studio
        /* 课题/产出物/素材按 id 取并集；模板、当前课题、指令以本地为准（避免覆盖新改动） */
        var merged = { projects: mergeObjArr(L.projects, R.projects), artifacts: mergeObjArr(L.artifacts, R.artifacts),
          assets: mergeObjArr(L.assets, R.assets), templates: Array.isArray(L.templates) ? L.templates : (R.templates || []),
          current: L.current || R.current || '', artSeeded: !!(L.artSeeded || R.artSeeded) }
        LS.set('baiju.studio.v1', JSON.stringify(merged))
      }
      PREFS.forEach(function (p) {                          // 标量偏好：云端有则采用，无则保留本地
        var v = blob[p[2]]
        if (v === undefined || v === null) return
        try { document.body.setAttribute(p[0], v) } catch (e) {}
        LS.set(p[1], v)
      })
    } finally {
      setTimeout(function () { applying = false }, 0)      //  observeBody 在此期间跳过自动推送
    }
    try { window.dispatchEvent(new CustomEvent('ccowork:cloudsynced', { detail: blob })) } catch (e) {}
  }
  function mergeObjArr(a, b) {
    var out = Array.isArray(a) ? a.slice() : [], seen = {}
    out.forEach(function (x) { seen[String(x && x.id)] = 1 })
    ;(Array.isArray(b) ? b : []).forEach(function (x) {
      var k = String(x && x.id)
      if (!seen[k]) { seen[k] = 1; out.push(x) }
    })
    return out
  }

  // ---------- 状态提示 ----------
  var lastStatus = { txt: '检测中…', ok: null }
  function setStatus(txt, ok) {
    lastStatus.txt = txt; lastStatus.ok = ok
    var el = document.getElementById('ccSyncStatus')
    if (!el) return                       // 折叠区还没展开，等 mountInto 时回填
    el.textContent = txt
    el.style.color = ok === true ? '#22c55e' : (ok === false ? '#e11d48' : 'var(--muted)')
  }
  /* 云组件尚未加载时，三角折叠里也要有一句人话，不能是空白 */
  function setPendingStatus(txt) { setStatus(txt || '云组件未加载', null) }

  // ---------- 会话 / 拉取 / 推送 ----------
  async function getSessionSafe() {
    try { var r = await cloud.auth.getSession(); return (r && !r.error && r.data) ? r.data : null } catch (e) { return null }
  }
  async function pullPrefs() {
    if (!cloud) return
    var sess = await getSessionSafe()
    if (!sess) { setStatus('未登录 · 本地已保存', false); return }
    setStatus('同步中…', null)
    try {
      var res = await cloud.database.from('user_prefs').select('prefs').maybeSingle()
      if (res.error) { setStatus('读取失败：' + (res.error.message || '请稍后重试'), false); return }
      if (res.data && res.data.prefs) applyBlob(res.data.prefs)   // 云端有记录 → 回填合并
      await doPush()                                              // 合并后再推一次（并集收藏等）
      setStatus('已同步 ' + nowHM(), true)
    } catch (e) { setStatus('同步出错，请稍后重试', false) }
  }
  function pushPrefs() {
    if (!cloud) return
    if (pushTimer) clearTimeout(pushTimer)
    pushTimer = setTimeout(doPush, 500)
  }
  async function doPush() {
    if (!cloud || pushing) return
    var sess = await getSessionSafe()
    if (!sess) { setStatus('未登录 · 本地已保存', false); return }   // 身份门：未登录不写云端
    pushing = true
    try {
      var res = await cloud.database.from('user_prefs').upsert({ prefs: localBlob() }, { onConflict: 'owner_id' })
      if (res.error) setStatus('同步失败：' + (res.error.message || '请稍后重试'), false)
      else setStatus('已同步 ' + nowHM(), true)
    } catch (e) { setStatus('同步出错，请稍后重试', false) }
    finally { pushing = false }
  }

  // ---------- 评论 / 点赞 / 分享（公开读，登录写） ----------
  /* thread 用页面路径，保证同一页的评论聚在一起；kind: comment | like */
  function threadId() { return (location.pathname || '/').split('?')[0] || '/' }
  function postOwnerName(sess) { return (sess && sess.user && (sess.user.name || sess.user.email)) || '' }
  async function listPosts(thread) {
    if (!cloud) return { data: [], error: { message: '云组件未就绪' } }
    try {
      var res = await cloud.database.from('bj_posts')
        .select('id, owner_name, kind, body, created_at')
        .eq('thread', thread || threadId())
        .order('created_at', { ascending: true }).limit(80)
      return { data: Array.isArray(res.data) ? res.data : [], error: res.error }
    } catch (e) { return { data: [], error: { message: e.message || '读取失败' } } }
  }
  async function addPost(kind, body, thread) {
    var sess = await getSessionSafe()
    if (!sess) return { error: { message: '先登录再发表' } }
    try {
      var res = await cloud.database.from('bj_posts').insert({
        owner_name: postOwnerName(sess), thread: thread || threadId(),
        kind: kind || 'comment', body: String(body || '').slice(0, 600)
      }).select()
      return { data: res.data, error: res.error }
    } catch (e) { return { error: { message: e.message || '发表失败' } } }
  }
  async function delPost(id) {
    var sess = await getSessionSafe()
    if (!sess) return { error: { message: '先登录' } }
    try {
      var res = await cloud.database.from('bj_posts').delete().eq('id', id).select()
      var ok = Array.isArray(res.data) && res.data.length > 0
      return { error: res.error || (ok ? null : { message: '只能删自己的留言' }) }
    } catch (e) { return { error: { message: e.message || '删除失败' } } }
  }
  function newToken() {
    var a = new Uint8Array(9)
    try { crypto.getRandomValues(a) } catch (e) { for (var i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256) }
    return Array.prototype.map.call(a, function (x) { return ('0' + x.toString(36)).slice(-2) }).join('')
  }
  async function createShare(kind, title, payload) {
    var sess = await getSessionSafe()
    if (!sess) return { error: { message: '先登录再生成分享链接' } }
    var token = newToken()
    try {
      var res = await cloud.database.from('bj_shares').insert({
        owner_name: postOwnerName(sess), token: token, kind: kind || 'page',
        title: String(title || '').slice(0, 80), payload: payload || {}
      }).select()
      if (res.error) return { error: res.error }
      var u = new URL(location.href)
      ;['code', 'state', 'provider'].forEach(function (k) { u.searchParams.delete(k) })
      u.searchParams.set('share', token)
      return { data: { url: u.toString(), token: token } }
    } catch (e) { return { error: { message: e.message || '生成失败' } } }
  }
  async function readShare(token) {
    if (!cloud) return { error: { message: '云组件未就绪' } }
    try {
      var res = await cloud.database.from('bj_shares')
        .select('kind, title, payload, owner_name, created_at').eq('token', token).maybeSingle()
      return { data: res.data, error: res.error }
    } catch (e) { return { error: { message: e.message || '读取失败' } } }
  }
  /* 已读：本地先记，再走 pushPrefs 把 readset 同步到 user_prefs */
  function markRead(id, on) {
    var a = localRead(), s = String(id), i = a.indexOf(s)
    if (on && i < 0) a.push(s)
    if (!on && i >= 0) a.splice(i, 1)
    LS.set('ccowork.readset', JSON.stringify(a))
    pushPrefs()
    return a
  }
  function isRead(id) { return localRead().indexOf(String(id)) >= 0 }

  // ---------- 登录 / 登出 / 回调 ----------
  async function login() {
    if (!cloud) { setStatus('云组件加载中，请稍候', null); return }
    var back = new URL(location.href)
    back.pathname = '/'                                        // OAuth 回调必须落站点根（静态站无 history 回退）
    ;['code', 'state', 'provider'].forEach(function (k) { back.searchParams.delete(k) })
    setStatus('正在跳转登录…', null)
    try {
      var res = await cloud.auth.signInWithOAuth({ provider: 'workbuddy', redirectTo: back.toString() })
      if (res.error) { setStatus('登录失败：' + (res.error.message || '请重试'), false); return }
      location.assign(res.data.url)                            // 同标签跳转（PKCE verifier 存于本标签 sessionStorage）
    } catch (e) { setStatus('登录出错，请重试', false) }
  }
  async function logout() {
    if (!cloud) return
    try { await cloud.auth.signOut() } catch (e) {}
    setStatus('未登录 · 本地已保存', false)
    refreshAuthUI()
  }
  async function restoreAuth() {
    if (!cloud) return
    var cur = new URL(location.href)
    if (!cur.searchParams.has('code') && !cur.searchParams.has('error')) { await refreshAuthUI(); return }
    var provider = cur.searchParams.get('provider')
    if (provider !== 'workbuddy' && provider !== 'wechat') { await refreshAuthUI(); return }
    var handler = provider === 'workbuddy' ? cloud.auth.handleWorkBuddyCallback : cloud.auth.handleWechatWebCallback
    if (typeof handler !== 'function') { setStatus('登录方式暂不可用', false); return }
    setStatus('登录处理中…', null)
    try {
      var res = await handler.call(cloud.auth)
      if (res.error) { setStatus('登录失败：' + (res.error.message || '请重新登录'), false); }
      else if (res.data) {
        ;['code', 'state', 'provider'].forEach(function (k) { cur.searchParams.delete(k) })
        history.replaceState(null, '', cur.pathname + cur.search + cur.hash)   // 清掉一次性 code/state
        await pullPrefs()
      }
    } catch (e) { setStatus('登录处理出错，请重试', false) }
    await refreshAuthUI()
  }

  // ---------- UI 注入 ----------
  /* 2026-11-12：唯一助手 / 唯一设置 / 唯一入口。
     云同步不再往 #modSettings 里塞第二套面板，改为由 baiju-assistant.js
     在三角折叠区调用 CCCloud.mountInto(host)。没拿到 host 就不渲染，
     绝不自作主张再建一个窗口。 */
  var authHost = null
  var mounting = false
  function mountInto(host) {
    if (!host || mounting) return
    /* host 内容已被 paintCloud 重建过 → 需要重新挂；否则只刷新状态，
       避免每次重绘都重写 innerHTML 触发连锁更新。 */
    if (authHost === host && host.querySelector('#ccAuthBox')) { refreshAuthUI(); return }
    mounting = true
    authHost = host
    host.innerHTML =
      '<div class="cc-cloud-hd"><b>☁ 云同步 · 可选</b><span id="ccSyncStatus">' + escapeHtml(lastStatus.txt) + '</span></div>' +
      '<div id="ccAuthActions"></div>' +
      '<p class="cc-cloud-note">不登录也能用：资料、工件、设置都存在本机。登录后才会把收藏 / 已读 / 工件同步到云端，换设备可恢复。</p>'
    refreshAuthUI()
    setStatus(lastStatus.txt, lastStatus.ok)
    mounting = false
  }
  function injectAuthUI() {
    /* 兼容：仅「我的」页保留顶部 banner（该页以云同步为主功能）；
       全站设置面板不再注入云同步块，唯一入口在悬浮窗三角折叠里。 */
    if (/\/mine\.html/.test(location.pathname) && !document.getElementById('ccMineBanner')) {
      var favSec = document.getElementById('favSec')
      var main = document.querySelector('main')
      if (main && favSec) {
        var ban = document.createElement('div')
        ban.id = 'ccMineBanner'
        ban.style.cssText = 'display:none;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 16px;border-radius:14px;margin-bottom:18px;background:rgba(120,160,220,.08);border:1px solid var(--line)'
        ban.innerHTML = '<div id="ccMineBannerBody" style="flex:1;min-width:200px;font-size:14px;color:var(--muted);line-height:1.6"></div><div id="ccMineBannerAct"></div>'
        main.insertBefore(ban, favSec)
      }
    }
    if (authHost) refreshAuthUI()
  }
  async function refreshAuthUI() {
    var sess = cloud ? await getSessionSafe() : null
    var name = (sess && sess.user) ? (sess.user.name || sess.user.email || '已登录用户') : ''
    var act = document.getElementById('ccAuthActions')
    if (act) {
      if (!cloud) {
        act.innerHTML = '<div style="font-size:12px;color:var(--muted)">云同步组件未就绪（网络原因），收藏与偏好仍保存在本机。</div>'
      } else if (sess) {
        act.innerHTML =
          '<div style="display:flex;align-items:center;gap:8px">' +
            '<span style="flex:1;font-size:13px;color:var(--text);font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(name) + '</span>' +
            '<button type="button" id="ccLogoutBtn" style="border:1px solid var(--line);background:transparent;color:var(--muted);border-radius:10px;padding:6px 12px;font-size:12px;cursor:pointer;font-family:inherit">退出</button>' +
          '</div>'
        var lo = document.getElementById('ccLogoutBtn'); if (lo) lo.addEventListener('click', logout)
      } else {
        act.innerHTML =
          '<button type="button" id="ccLoginBtn" style="width:100%;border:none;background:var(--grad);color:#fff;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit">使用 WorkBuddy 登录 · 开启云同步</button>' +
          '<div style="font-size:11px;color:var(--dim);text-align:center;line-height:1.6">登录后：收藏 / 已读 / 工件 / 主题跨设备恢复，可评论、点赞、生成分享链接</div>'
        var li = document.getElementById('ccLoginBtn'); if (li) li.addEventListener('click', login)
      }
    }
    var ban = document.getElementById('ccMineBanner')
    if (ban) {
      var body = document.getElementById('ccMineBannerBody')
      var bact = document.getElementById('ccMineBannerAct')
      if (cloud && sess) {
        ban.style.display = 'flex'
        if (body) body.innerHTML = '☁️ 已登录 <b style="color:var(--gold)">' + escapeHtml(name) + '</b>，收藏与偏好正在云端同步，换设备登录即可恢复。'
        if (bact) bact.innerHTML = '<a class="btn-go" href="/website/book.html" style="padding:9px 16px;font-size:13px">去书库收藏</a>'
      } else if (cloud) {
        ban.style.display = 'flex'
        if (body) body.innerHTML = '☁️ 登录后，你的<b style="color:var(--gold)">收藏与偏好</b>会同步到云端，换手机 / 电脑都能恢复。'
        if (bact) bact.innerHTML = '<button type="button" class="btn-go" id="ccMineLoginBtn" style="padding:9px 16px;font-size:13px">使用 WorkBuddy 登录</button>'
        var ml = document.getElementById('ccMineLoginBtn'); if (ml) ml.addEventListener('click', login)
      } else {
        ban.style.display = 'none'
      }
    }
    if (cloud && !sess) setStatus('未登录 · 本地已保存', false)
  }

  // ---------- 变更 → 自动推送 ----------
  function observeBody() {
    if (typeof MutationObserver !== 'function') return
    var mo = new MutationObserver(function (muts) {
      if (applying) return
      for (var i = 0; i < muts.length; i++) {
        var a = muts[i].attributeName
        if (a === 'data-theme' || a === 'data-wall' || a === 'data-font' || a === 'data-read' || a === 'data-role') { pushPrefs(); break }
      }
    })
    mo.observe(document.body, { attributes: true, attributeFilter: ['data-theme', 'data-wall', 'data-font', 'data-read', 'data-role'] })
  }
  function patchFav() {
    if (window.CCOWork && window.CCOWork.fav && !window.CCOWork.fav.__ccPatched) {
      var orig = window.CCOWork.fav.toggle
      window.CCOWork.fav.toggle = function (id) { var r = orig.apply(this, arguments); pushPrefs(); return r }
      window.CCOWork.fav.__ccPatched = true
    }
  }

  // ---------- 启动 ----------
  function loadSdk(cb) {
    if (window.WorkBuddyCloud && window.WorkBuddyCloud.createWorkBuddyCloud) { cb(); return }
    var i = 0
    function attempt() {
      if (i >= SDK_SOURCES.length) { setStatus('云组件加载失败', false); refreshAuthUI(); return }
      var s = document.createElement('script')
      s.src = SDK_SOURCES[i++]
      s.async = true
      s.onload = function () {
        if (window.WorkBuddyCloud && window.WorkBuddyCloud.createWorkBuddyCloud) cb()
        else attempt()   // 脚本到位但未导出全局 → 换下一个源
      }
      s.onerror = attempt
      document.head.appendChild(s)
    }
    attempt()
  }
  function boot() {
    loadSdk(function () {
      try {
        cloud = window.WorkBuddyCloud.createWorkBuddyCloud({
          endpoint: PUB.endpoint,
          oauthRelayBaseUrl: PUB.oauthRelayBaseUrl,
          publishableKey: PUB.publishableKey
        })
      } catch (e) { setStatus('云组件初始化失败', false); return }
      window.CCCloud = {
        get cloud() { return cloud },
        login: login, logout: logout, pushPrefs: pushPrefs, pullPrefs: pullPrefs,
        mountInto: mountInto, setPendingStatus: setPendingStatus,
        listPosts: listPosts, addPost: addPost, delPost: delPost,
        createShare: createShare, readShare: readShare,
        markRead: markRead, isRead: isRead,
        session: getSessionSafe, threadId: threadId
      }
      injectAuthUI()
      /* 三角折叠区可能已经展开在等云组件：立刻挂进去，不用用户收起再展开。
         折叠区后续重绘时由 baiju-assistant.js 的 paintCloud() 显式调用
         CCCloud.mountInto(host)，这里不挂 MutationObserver —— 写 innerHTML
         会再触发 observer，造成自激重绘把页面卡死。 */
      try {
        var pending = document.querySelector('[data-cloud-host]')
        if (pending) mountInto(pending)
      } catch (e) {}
      patchFav()
      observeBody()
      if (cloud.auth.onAuthStateChange) {
        cloud.auth.onAuthStateChange(function (evt) {
          if (evt === 'SIGNED_IN') pullPrefs()
          else if (evt === 'SIGNED_OUT') setStatus('未登录 · 本地已保存', false)
          refreshAuthUI()
        })
      }
      restoreAuth()
    })
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot)
  else boot()
})()
