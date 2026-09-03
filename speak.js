/* speak.js — 白驹全局大脑 · 语音朗读系统（零依赖，浏览器原生 Web Speech API）
 * 用法：任意页面 <script src="/speak.js"></script>
 * 功能：右下角悬浮按钮，朗读当前页面正文；支持暂停/继续/停止、语速调节；偏好记忆。
 */
(function () {
  if (typeof window === 'undefined') return
  if (!('speechSynthesis' in window)) return // 不支持则静默不注入

  var state = { utter: null, speaking: false, paused: false, chunks: [], idx: 0, rate: 1 }

  // 矢量图标：沿用站点 cc-ic CSS-mask 体系
  function ic(name) {
    return '<i class="cc-ic" data-ic="' + name + '" aria-hidden="true"></i>'
  }

  function css() {
    var s = document.createElement('style')
    s.textContent =
      '#speakBar{position:fixed;right:18px;bottom:18px;z-index:9995;display:flex;flex-direction:column;gap:8px;align-items:flex-end;font-family:var(--sans,"PingFang SC","Microsoft YaHei",sans-serif)}' +
      '#speakMain{width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;font-size:20px;' +
      'background:linear-gradient(120deg,#4f8cff,#8b5cf6);color:#fff;box-shadow:0 8px 22px rgba(79,140,255,.35);transition:.25s}' +
      '#speakMain:hover{transform:translateY(-2px) scale(1.05)}' +
      '#speakMain.on{background:linear-gradient(120deg,#f59e0b,#d97706)}' +
      '#speakPanel{display:none;background:rgba(255,255,255,.96);border:1px solid rgba(120,160,220,.25);border-radius:14px;' +
      'padding:10px 12px;box-shadow:0 10px 28px rgba(31,45,77,.18);font-size:12px;min-width:180px}' +
      'body[data-theme="deep"] #speakPanel{background:rgba(16,23,40,.96);border-color:rgba(120,160,220,.3);color:#e9f0fb}' +
      '#speakPanel.show{display:block}' +
      '#speakPanel .row{display:flex;gap:6px;margin-top:8px}' +
      '#speakPanel button{flex:1;border:1px solid rgba(120,160,220,.3);background:transparent;color:inherit;' +
      'border-radius:9px;padding:5px 8px;font-size:11.5px;cursor:pointer;transition:.2s}' +
      '#speakPanel button:hover{border-color:#38b6ff;color:#0891b2}' +
      '#speakRate{width:100%;margin-top:8px}' +
      '#speakTip{font-size:11px;opacity:.7;margin-top:6px;line-height:1.5}'
    document.head.appendChild(s)
  }

  // 把正文切成可朗读的小段（避免单次过长被浏览器截断）
  function buildChunks() {
    var root = document.querySelector('article') || document.body
    var nodes = root.querySelectorAll('h1,h2,h3,h4,p,li')
    var out = []
    for (var i = 0; i < nodes.length; i++) {
      var t = (nodes[i].textContent || '').replace(/\s+/g, ' ').trim()
      if (!t) continue
      if (t.length > 180) {
        var parts = t.match(/[\s\S]{1,180}/g) || [t]
        for (var j = 0; j < parts.length; j++) out.push(parts[j])
      } else out.push(t)
    }
    return out
  }

  function stop() {
    try { window.speechSynthesis.cancel() } catch (e) {}
    state.speaking = false; state.paused = false; state.idx = 0
    sync()
  }

  function speakFrom(i) {
    if (i >= state.chunks.length) { stop(); return }
    state.idx = i
    var u = new SpeechSynthesisUtterance(state.chunks[i])
    u.lang = 'zh-CN'
    u.rate = state.rate
    u.onend = function () { if (state.speaking) speakFrom(state.idx + 1) }
    u.onerror = function () { stop() }
    state.utter = u
    try { window.speechSynthesis.speak(u) } catch (e) { stop() }
  }

  function start() {
    stop()
    state.chunks = buildChunks()
    if (!state.chunks.length) return
    state.speaking = true
    speakFrom(0)
    sync()
  }

  function pause() {
    try { window.speechSynthesis.pause() } catch (e) {}
    state.paused = true; sync()
  }
  function resume() {
    try { window.speechSynthesis.resume() } catch (e) {}
    state.paused = false; sync()
  }

  function sync() {
    var btn = document.getElementById('speakMain')
    if (!btn) return
    btn.innerHTML = state.speaking ? (state.paused ? ic('play') : ic('pause')) : ic('volume-2')
    btn.classList.toggle('on', state.speaking)
    btn.title = state.speaking ? '停止朗读' : '朗读本页'
    var prog = document.getElementById('speakProg')
    if (prog) prog.textContent = state.speaking
      ? ('朗读中 ' + (state.idx + 1) + '/' + state.chunks.length)
      : '点击喇叭开始朗读'
  }

  function build() {
    css()
    var bar = document.createElement('div')
    bar.id = 'speakBar'
    bar.innerHTML =
      '<div id="speakPanel">' +
        '<b>' + ic('volume-2') + ' 语音朗读</b>' +
        '<div id="speakProg" style="font-size:11.5px;opacity:.8;margin-top:4px">点击喇叭开始朗读</div>' +
        '<input id="speakRate" type="range" min="0.6" max="1.8" step="0.1" value="1">' +
        '<div class="row">' +
          '<button id="speakPrev">' + ic('skip-back') + ' 上一段</button>' +
          '<button id="speakStop">' + ic('square') + ' 停止</button>' +
          '<button id="speakNext">' + ic('skip-forward') + ' 下一段</button>' +
        '</div>' +
        '<div id="speakTip">浏览器原生语音合成 · 不联网不上传 · 中文优先</div>' +
      '</div>' +
      '<button id="speakMain" class="cc-icon-only" title="朗读本页">' + ic('volume-2') + '</button>'
    document.body.appendChild(bar)

    var main = document.getElementById('speakMain')
    var panel = document.getElementById('speakPanel')
    main.addEventListener('click', function () {
      if (state.speaking) { if (state.paused) resume(); else if (!panel.classList.contains('show')) panel.classList.add('show'); else stop() }
      else { start(); panel.classList.add('show') }
    })
    // 双击/长按展开面板
    main.addEventListener('dblclick', function (e) { e.preventDefault(); panel.classList.toggle('show') })
    document.getElementById('speakStop').addEventListener('click', stop)
    document.getElementById('speakNext').addEventListener('click', function () {
      if (!state.speaking) return start()
      if (state.idx + 1 < state.chunks.length) speakFrom(state.idx + 1)
    })
    document.getElementById('speakPrev').addEventListener('click', function () {
      if (state.idx > 0) speakFrom(state.idx - 1)
    })
    var rate = document.getElementById('speakRate')
    try { var sv = parseFloat(localStorage.getItem('ccowork.speakRate') || '1'); if (sv) { rate.value = sv; state.rate = sv } } catch (e) {}
    rate.addEventListener('input', function () {
      state.rate = parseFloat(rate.value)
      try { localStorage.setItem('ccowork.speakRate', String(state.rate)) } catch (e) {}
      if (state.speaking) { var cur = state.idx; stop(); state.speaking = true; speakFrom(cur) }
    })
    window.addEventListener('beforeunload', function () { try { window.speechSynthesis.cancel() } catch (e) {} })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build)
  else build()
})()
