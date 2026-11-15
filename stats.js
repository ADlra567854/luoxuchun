/* ============================================================
   stats.js · 白驹轻量访问统计 + 热榜（A6 · 服务端优先 · localStorage 降级）
   - 自动检测：有 Node 服务端 → 走 /api/stats 上报与热榜
               纯静态托管 → 降级 localStorage 本地统计
   - 埋点：每页访问 +1（URL 归一化，去 query/hash）
   - 热榜：CCOWorkStats.getHot(5) 返回 Top N {path,title,count}
   - 渲染：#ccoworkHot 容器填充热榜列表（首页热榜模块）
   ============================================================ */
;(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  var KEY = 'ccowork.views'
  var TITLE_KEY = 'ccowork.titles'
  var DAY_KEY = 'ccowork.viewsDay'
  var MODE_KEY = 'ccowork.statsMode' // 'server' | 'local' | 'detecting'

  // 纯静态托管默认本地模式，不再发 /api/stats 探活请求（避免控制台 404 噪音）。
  // 若日后接入 Node 后端，在 <head> 加 <meta name="ccowork-stats" content="server"> 即可启用服务端热榜。
  var metaMode = (function () {
    var m = document.querySelector('meta[name="ccowork-stats"]')
    return m ? m.getAttribute('content') : null
  })()
  var STATIC = metaMode ? metaMode !== 'server' : true

  var norm = function (p) {
    try {
      var u = new url(p, location.origin)
      return u.pathname
    } catch (e) { return String(p).split(/[?#]/)[0] }
  }
  var read = function (k) { try { return JSON.parse(localStorage.getItem(k) || 'null') || {} } catch (e) { return {} } }
  var write = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) {} }

  var path = norm(location.pathname)
  var title = (document.title || '').replace(/\s*·\s*(白驹 ccowork).*$/, '').trim()

  // ---- 本地模式（降级） ----
  var localViews = read(KEY)
  var localTitles = read(TITLE_KEY)
  var localDay = read(DAY_KEY)

  function localTrack() {
    localViews[path] = (localViews[path] || 0) + 1
    write(KEY, localViews)
    if (title && !localTitles[path]) { localTitles[path] = title; write(TITLE_KEY, localTitles) }
    localDay[path] = (localDay[path] || 0) + 1
    write(DAY_KEY, localDay)
  }

  function localGetHot(n) {
    var list = Object.keys(localViews).map(function (p) {
      return { path: p, count: localViews[p], title: localTitles[p] || p }
    }).filter(function (x) { return x.count > 1 && x.path !== '/' })
    list.sort(function (a, b) { return b.count - a.count })
    return list.slice(0, n || 5)
  }

  function localTotalViews() { return Object.keys(localViews).reduce(function (s, k) { return s + localViews[k] }, 0) }
  function localTotalPages() { return Object.keys(localViews).length }

  // ---- 服务端模式 ----
  var serverMode = false
  var serverHotCache = null
  var serverHotCacheTime = 0
  var SERVER_CACHE_TTL = 60000 // 热榜缓存 60 秒

  function serverTrack() {
    try {
      fetch('/api/stats/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: path, title: title, referrer: document.referrer }),
        keepalive: true
      }).catch(function () {
        // 上报失败降级为本地
        serverMode = false
        write(MODE_KEY, 'local')
        localTrack()
      })
    } catch (e) {
      serverMode = false
      write(MODE_KEY, 'local')
      localTrack()
    }
  }

  function serverGetHot(n, cb) {
    var now = Date.now()
    if (serverHotCache && now - serverHotCacheTime < SERVER_CACHE_TTL) {
      cb(serverHotCache.slice(0, n || 5))
      return
    }
    fetch('/api/stats/hot?n=' + encodeURIComponent(n || 10))
      .then(function (r) { return r.json() })
      .then(function (res) {
        if (res && res.ok && res.data) {
          serverHotCache = res.data
          serverHotCacheTime = now
          cb(res.data.slice(0, n || 5))
        } else {
          cb([])
        }
      })
      .catch(function () { cb([]) })
  }

  // ---- 模式检测 ----
  function detectMode(cb) {
    if (STATIC) { serverMode = false; write(MODE_KEY, 'local'); cb(false); return }
    var cached = read(MODE_KEY)
    if (cached === 'server') { serverMode = true; cb(true); return }
    if (cached === 'local') { serverMode = false; cb(false); return }
    // 首次检测
    write(MODE_KEY, 'detecting')
    fetch('/api/stats/summary', { method: 'GET', cache: 'no-store' })
      .then(function (r) {
        if (r.ok) {
          serverMode = true
          write(MODE_KEY, 'server')
          cb(true)
        } else {
          serverMode = false
          write(MODE_KEY, 'local')
          cb(false)
        }
      })
      .catch(function () {
        serverMode = false
        write(MODE_KEY, 'local')
        cb(false)
      })
  }

  // ---- 统一 API（window.CCOWorkStats） ----
  window.CCOWorkStats = {
    getHot: function (n, cb) {
      if (serverMode) {
        serverGetHot(n, function (list) {
          if (list && list.length) {
            cb(list)
          } else {
            // 服务端有但暂无数据，降级本地展示
            cb(localGetHot(n))
          }
        })
      } else {
        if (cb) cb(localGetHot(n))
        return localGetHot(n)
      }
    },
    totalViews: function () { return serverMode ? '—' : localTotalViews() },
    totalPages: function () { return serverMode ? '—' : localTotalPages() },
    isServerMode: function () { return serverMode }
  }

  // ---- 埋点执行 ----
  detectMode(function (isServer) {
    if (isServer) {
      serverTrack()
    } else {
      localTrack()
    }
    // 模式确定后渲染热榜
    renderHot()
  })

  // ---- 首页热榜渲染（容器 #ccoworkHot） ----
  function renderHot() {
    var el = document.getElementById('ccoworkHot')
    if (!el) return
    window.CCOWorkStats.getHot(5, function (hot) {
      if (hot && hot.length) {
        var items = hot.map(function (x, i) {
          return '<a href="' + x.path + '" class="hot-item"><span class="hot-rank">' + (i + 1) + '</span><span class="hot-title">' +
            String(x.title).replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span><span class="hot-count">' + x.count + ' 次</span></a>'
        }).join('')
        el.innerHTML = '<div class="hot-list">' + items + '</div>'
      } else {
        el.innerHTML = '<p class="hot-empty">数据积累中：多逛几页，热榜就会亮起来。</p>'
      }
    })
  }
})()
