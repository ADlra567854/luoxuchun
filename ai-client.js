/* ============================================================
   ai-client.js · 统一 AI 客户端（前端零硬编码密钥）
   - window.CC：密钥本地存储（deepseek / ark ...），用户输入一次、各页共用
   - window.AI.chat()：流式对话，本地优先走 /api/chat（服务端环境变量 Key），
     云端/无服务时走用户自填 Key 直连
   所有 AI 页面（agent / chat / ccowork / workstation / 编译模式）共用本文件。
   ============================================================ */
(function () {
  'use strict'
  if (window.AI) return

  // ---------------- 密钥本地存储 ----------------
  var KSTORE = 'ccowork.keys'
  var CC = {
    KEYS: {},
    load: function () {
      try { var k = JSON.parse(localStorage.getItem(KSTORE) || '{}'); if (k && typeof k === 'object') this.KEYS = k } catch (e) {}
      return this
    },
    get: function (p) { return this.KEYS[p] || '' },
    set: function (p, v) { this.KEYS[p] = v || ''; this.save() },
    save: function () { try { localStorage.setItem(KSTORE, JSON.stringify(this.KEYS)) } catch (e) {} },
  }
  CC.load()

  // ---------------- 本地 / 云端判定 ----------------
  function isLocalHost() {
    var h = location.hostname || ''
    return (h === 'localhost' || h === '127.0.0.1' || h.indexOf('.local') !== -1 ||
      /^192\.168\./.test(h) || /^10\./.test(h) || /^172\.(1[6-9]|2[0-9]|3[01])\./.test(h))
  }
  // 运行时探测后端代理（本地 node server / 带后端的部署）。跨文件共享 window.__BJ_HAS_BACKEND。
  // 有后端 → 走 /api/chat、/api/proxy（服务端密钥，前端零密钥）；无后端（纯静态部署）→ 浏览器直连（用本地 Key）。
  function detectBackend() {
    // 部署版：已注入前端密钥（DEPLOY_DEFAULT_KEYS）→ 纯静态托管无后端，强制浏览器直连，杜绝去打不存在的 /api/proxy
    if (typeof DEPLOY_DEFAULT_KEYS !== 'undefined') { window.__BJ_HAS_BACKEND = false; return Promise.resolve(false) }
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

  // 模型提供商：智谱（免费优先，0 成本）→ DeepSeek → 火山方舟（豆包）
  // ai-hive 巨量网关（104 模型）由小驭在对话中通过 MCP 直接调用，无需前端 Key。
  var PROV = {
    zhipu: { url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-4.7-flash', free: true, label: '智谱免费' },
    deepseek: { url: 'https://api.deepseek.com/chat/completions', model: 'deepseek-chat', free: false, label: 'DeepSeek' },
    ark: { url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', model: 'doubao-seed-2-1-pro-260628', free: false, reasoning: true, label: '火山方舟' },
  }

  // ---------------- SSE 解析 ----------------
  function parseSSE(text, onData) {
    var parts = String(text).split('\n\n')
    for (var i = 0; i < parts.length; i++) {
      var lines = parts[i].split('\n')
      for (var j = 0; j < lines.length; j++) {
        var line = lines[j]
        if (line.indexOf('data:') !== 0) continue
        var payload = line.slice(5).trim()
        if (payload === '[DONE]') continue
        try {
          var jd = JSON.parse(payload)
          var delta = jd.choices && jd.choices[0] && jd.choices[0].delta
          var c = delta && delta.content
          if (typeof c === 'string' && c) onData(c)
        } catch (e) {}
      }
    }
  }

  // ---------------- 流式对话（支持多模型自动回退） ----------------
  // opts: { providers?:['zhipu','deepseek','ark'], provider, model, messages, key, onDelta, onDone, onError }
  async function chat(opts) {
    opts = opts || {}
    var providers = opts.providers || (opts.provider ? [opts.provider] : (typeof DEPLOY_DEFAULT_KEYS !== 'undefined' ? ['ark', 'zhipu', 'deepseek'] : ['zhipu', 'deepseek', 'ark']))
    var lastErr = null
    for (var pi = 0; pi < providers.length; pi++) {
      var provider = providers[pi]
      var cfg = PROV[provider] || PROV.zhipu
      var model = opts.model || cfg.model
      await detectBackend()
      var pb = proxyBase()
      var aborted = false, ctrl = null
      try {
        await new Promise(function (resolve, reject) {
          function pipe(reader, dec, buf) {
            if (aborted) { try { ctrl && ctrl.abort() } catch (e) {} return resolve() }
            reader.read().then(function (res) {
              if (aborted) return resolve()
              if (res.done) { if (buf) parseSSE(buf, opts.onDelta); opts.onDone && opts.onDone(); return resolve() }
              buf += dec.decode(res.value, { stream: true })
              var idx = buf.lastIndexOf('\n\n')
              if (idx !== -1) { var chunk = buf.slice(0, idx); buf = buf.slice(idx + 2); parseSSE(chunk, opts.onDelta) }
              return pipe(reader, dec, buf)
            }).catch(function (e) { if (!aborted) reject(e); else resolve() })
          }
          function start(makeReq) {
            return makeReq().then(function (r) {
              if (!r.ok) return r.text().then(function (t) { throw new Error('HTTP ' + r.status + ' ' + String(t).slice(0, 140)) })
              // 非 SSE / 非 JSON 的纯文本响应（多为鉴权失败 / 网关拦截返回的 HTML 或错误页）→ 读出来报错，触发多模型回退，而非静默无输出
              var ct = (r.headers && r.headers.get && r.headers.get('content-type')) || ''
              if (ct.indexOf('event-stream') === -1 && ct.indexOf('application/json') === -1) {
                return r.text().then(function (t) { throw new Error('接口返回非 SSE 响应（可能鉴权失败/网关拦截）：' + String(t).slice(0, 140)) })
              }
              if (!r.body) throw new Error('HTTP ' + r.status + ' 无响应体')
              return pipe(r.body.getReader(), new TextDecoder('utf-8'), '')
            })
          }
          if (pb) {
            ctrl = new AbortController()
            start(function () { return fetch(pb + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' }, body: JSON.stringify({ provider: provider, model: model, messages: opts.messages, key: opts.key || '' }), signal: ctrl.signal }) }).then(resolve, reject)
          } else {
            var key = opts.key || CC.get(provider)
            if (!key) return reject(new Error('请先设置 ' + provider + ' 的 API Key（点页面设置按钮填入，仅存本地）'))
            ctrl = new AbortController()
            var sb = buildBody(model, opts.messages, 0, cfg); sb.stream = true
            start(function () { return fetch(cfg.url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key, 'api-key': key, 'Accept': 'text/event-stream' }, body: JSON.stringify(sb), signal: ctrl.signal }) }).then(resolve, reject)
          }
        })
        return
      } catch (e) {
        lastErr = e
        if (pi < providers.length - 1) continue
        if (opts.onError) opts.onError(e)
        return { cancel: function () { aborted = true } }
      }
    }
  }

  // ---------------- 非流式一次性补全（多模型回退，返回 content 字符串） ----------------
  // opts: { providers?, provider, model, messages, maxTokens, key }
  async function complete(opts) {
    opts = opts || {}
    var providers = opts.providers || (opts.provider ? [opts.provider] : (typeof DEPLOY_DEFAULT_KEYS !== 'undefined' ? ['ark', 'zhipu', 'deepseek'] : ['zhipu', 'deepseek', 'ark']))
    var lastErr = null
    for (var pi = 0; pi < providers.length; pi++) {
      var provider = providers[pi]
      var cfg = PROV[provider] || PROV.zhipu
      var model = opts.model || cfg.model
      var messages = opts.messages || []
      var maxTokens = opts.maxTokens || 2000
      await detectBackend()
      var pb = proxyBase()
      try {
        var r
        if (pb) {
          r = await fetch(pb + '/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: cfg.url, body: buildBody(model, messages, maxTokens, cfg), auth: opts.key || (CC.get(provider) || '') }) })
          var praw = await r.text()
          if (!r.ok) throw new Error('代理 HTTP ' + r.status + '：' + praw.slice(0, 160))
          var pdata
          try { pdata = JSON.parse(praw) } catch (e) { throw new Error('代理返回非 JSON（可能网关拦截）：' + praw.slice(0, 160)) }
          return extract(pdata)
        }
        var key = opts.key || CC.get(provider)
        if (!key) throw new Error('请先设置 ' + provider + ' 的 API Key（点页面设置按钮填入，仅存本地）')
        var h = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key, 'api-key': key }
        r = await fetch(cfg.url, { method: 'POST', headers: h, body: JSON.stringify(buildBody(model, messages, maxTokens, cfg)) })
        var draw = await r.text()
        if (!r.ok) throw new Error(cfg.label + ' HTTP ' + r.status + '：' + draw.slice(0, 160))
        var ddata
        try { ddata = JSON.parse(draw) } catch (e) { throw new Error(cfg.label + ' 返回非 JSON（多为密钥失效/网关拦截）：' + draw.slice(0, 160)) }
        return extract(ddata)
      } catch (e) { lastErr = e; if (pi < providers.length - 1) continue; throw e }
    }
  }
  function extract(d) {
    var t = d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content
    if (!t) throw new Error('接口未返回内容：' + JSON.stringify(d).slice(0, 140))
    return t
  }
  // 构造请求体：只发 max_tokens（推理模型不接受 max_tokens+max_completion_tokens 同时出现，会 400）；
  // reasoning 模型（方舟 seed）加 thinking=disabled，避免长中文任务卡死（>85s 挂起陷阱）
  function buildBody(model, messages, maxTokens, cfg) {
    var b = { model: model, messages: messages, stream: false, max_tokens: maxTokens }
    if (cfg && cfg.reasoning) b.thinking = { type: 'disabled' }
    return b
  }

  window.CC = CC
  window.AI = { chat: chat, complete: complete, proxyBase: proxyBase, PROV: PROV }
})()
