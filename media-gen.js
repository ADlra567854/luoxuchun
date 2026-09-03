/* ============================================================
   media-gen.js · 方舟生图 / 生视频 统一封装（豆包 Seedream / Seedance）
   - genImage(prompt, opts)            -> Promise<imageUrl>
   - genVideo(prompt, opts, onProgress)-> Promise<videoUrl>  （异步任务 + 轮询）
   生图：POST /images/generations
   生视频：POST /contents/generations/tasks 建任务 -> GET .../tasks/{id} 轮询 -> content.video_url
   密钥：仅来自页面设置里填的 CC.get('ark')（开发者自用），生产经 /api/proxy
   由服务端 ARK_API_KEY 注入，浏览器不持有任何密钥。
   ============================================================ */
(function () {
  'use strict'

  // 生产：密钥在服务端（ARK_API_KEY）注入，浏览器不下发。
  // 开发期若想用自己的方舟 Key，在页面设置里填 ARK 即可（仅本地生效）。
  var ARK_BASE = 'https://ark.cn-beijing.volces.com/api/v3'

  // 运行时探测后端代理（与 ai-client.js 共享 window.__BJ_HAS_BACKEND）
  function detectBackend() {
    // 部署版已注入前端密钥（DEPLOY_DEFAULT_ARK）→ 纯静态无后端，强制浏览器直连，杜绝去打 /api/proxy
    if (typeof DEPLOY_DEFAULT_ARK !== 'undefined') { window.__BJ_HAS_BACKEND = false; return Promise.resolve(false) }
    if (typeof window.__BJ_HAS_BACKEND !== 'undefined') return Promise.resolve(window.__BJ_HAS_BACKEND)
    if (location.protocol !== 'http:' && location.protocol !== 'https:') { window.__BJ_HAS_BACKEND = false; return Promise.resolve(false) }
    // 后端 /api/health 返回 JSON {"status":"ok"}；静态服务器返回 HTML(200) 或非 JSON → 判为无后端，走浏览器直连
    return fetch(location.origin + '/api/health', { method: 'GET', cache: 'no-store' })
      .then(function (r) { return r.text() })
      .then(function (t) { window.__BJ_HAS_BACKEND = /"status"\s*:\s*"ok"/.test(t); return window.__BJ_HAS_BACKEND })
      .catch(function () { window.__BJ_HAS_BACKEND = false; return false })
  }
  function proxyBase() {
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return ''
    return window.__BJ_HAS_BACKEND ? location.origin : ''
  }
  function arkKey() {
    try { var k = (window.CC && window.CC.get && window.CC.get('ark')); if (k) return k } catch (e) {}
    return ''   // 不再硬编码；生产由服务端 /api/proxy 注入 ARK_API_KEY
  }
  async function post(path, body) {
    await detectBackend()
    var pb = proxyBase()
    if (pb) {
      var k = arkKey()
      return fetch(pb + '/api/proxy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: ARK_BASE + path, body: body, auth: k || undefined })
      }).then(function (r) { if (!r.ok) throw new Error('代理 HTTP ' + r.status); return r.json() })
    }
    var k = arkKey()
    var h = { 'Content-Type': 'application/json' }
    if (k) { h['Authorization'] = 'Bearer ' + k; h['api-key'] = k }
    return fetch(ARK_BASE + path, { method: 'POST', headers: h, body: JSON.stringify(body) }).then(function (r) { return r.json() })
  }
  async function get(path) {
    await detectBackend()
    var pb = proxyBase()
    if (pb) {
      // 轮询走代理：若页面填了自有方舟 Key 才下发 x-api-key，否则由服务端注入 ARK_API_KEY
      var k = arkKey()
      var hdrs = {}
      if (k) hdrs['x-api-key'] = k
      return fetch(pb + '/api/proxy?url=' + encodeURIComponent(ARK_BASE + path), { headers: hdrs })
        .then(function (r) { if (!r.ok) throw new Error('代理 HTTP ' + r.status); return r.json() })
    }
    var k = arkKey()
    var h = { 'Content-Type': 'application/json' }
    if (k) { h['Authorization'] = 'Bearer ' + k; h['api-key'] = k }
    return fetch(ARK_BASE + path, { method: 'GET', headers: h }).then(function (r) { return r.json() })
  }

  // ---------------- 生图（Seedream） ----------------
  function genImage(prompt, opts) {
    opts = opts || {}
    return post('/images/generations', {
      model: opts.model || 'doubao-seedream-5-0-260128',
      prompt: prompt,
      size: opts.size || '2k',
      watermark: false,
      response_format: 'url'
    }).then(function (d) {
      var item = d && d.data && d.data[0]
      var u = item && (item.url || item.b64_json)
      if (!u) throw new Error('生图失败：' + JSON.stringify(d).slice(0, 200))
      return u
    })
  }

  // ---------------- 生视频（Seedance · 异步任务 + 轮询） ----------------
  function genVideo(prompt, opts, onProgress) {
    opts = opts || {}
    onProgress = onProgress || function () {}
    var model = opts.model || 'doubao-seedance-1-0-pro-250528'
    var content = [{ type: 'text', text: prompt }]
    if (opts.imageUrl) content.push({ type: 'image_url', image_url: { url: opts.imageUrl } }) // 图生视频：首帧
    var body = {
      model: model,
      content: content,
      ratio: opts.ratio || '16:9',
      duration: opts.duration || 5,
      watermark: false
    }
    onProgress('⏳ 提交视频任务…')
    return post('/contents/generations/tasks', body).then(function (d) {
      var id = d && d.id
      if (!id) {
        var ec = d && d.error && d.error.code
        if (ec === 'ModelNotOpen') {
          var acc = (d.error.message || '').match(/account (\d+)/)
          throw new Error('视频模型「' + model + '」未开通：请到方舟控制台「模型管理 / 模型体验」开通该模型后重试' + (acc ? '（账户 ' + acc[1] + '）' : '') + '。')
        }
        throw new Error('创建视频任务失败：' + JSON.stringify(d).slice(0, 200))
      }
      return poll(id, onProgress)
    })
  }
  function poll(id, onProgress) {
    var tries = 0, max = 120 // 最多约 10 分钟
    return new Promise(function (resolve, reject) {
      (function tick() {
        tries++
        get('/contents/generations/tasks/' + id).then(function (d) {
          var st = d && d.status
          if (st === 'succeeded') {
            var u = d && d.content && d.content.video_url
            if (!u) return reject(new Error('视频任务成功但无地址：' + JSON.stringify(d).slice(0, 200)))
            return resolve(u)
          }
          if (st === 'failed' || st === 'expired') {
            var err = (d && d.error && (d.error.message || JSON.stringify(d.error))) || '视频任务失败'
            return reject(new Error(err))
          }
          if (tries >= max) return reject(new Error('视频生成超时（已轮询 ' + tries + ' 次）'))
          onProgress((st === 'running' ? '🎬 生成中' : '⏳ 排队中') + '（' + tries + '）')
          setTimeout(tick, 5000)
        }).catch(function (err) { reject(err) })
      })()
    })
  }

  window.MediaGen = { genImage: genImage, genVideo: genVideo, arkKey: arkKey }
})()
