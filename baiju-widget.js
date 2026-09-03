/* ============================================================
   baiju-widget.js · 每页浮动「白驹」助手
   - 自包含：自动创建悬浮按钮 + 对话面板，无需改页面结构
   - 使用 window.AI（服务端代理 /api/chat，服务端密钥，访客免填 Key）
   - 用法：在任意页面 </body> 前加 <script src="/baiju-widget.js"></script>
   ============================================================ */

  // 矢量图标：沿用站点 cc-ic CSS-mask 体系，自动继承文字颜色与字号
  function ic(name) {
    return '<i class="cc-ic" data-ic="' + name + '" aria-hidden="true"></i>'
  }
(function () {
  'use strict'
  if (window.__BAIJU_WIDGET__) return
  window.__BAIJU_WIDGET__ = true

  var SYS = '你是"白驹"，AI创作纪元的全局 AI 助手，精通 AI 创作、提示词、生图生视频、赚钱变现、本地部署、各类工具与案例。回答精炼、可执行、可用表格。若用户问题涉及本站点内容可自然引用；未覆盖时直接用通用 AI 知识给出有用答案，不要推脱或说"不知道"。'

  // ---------- 样式 ----------
  var css = [
    '#bj-fab{position:fixed;right:18px;bottom:18px;z-index:99998;width:56px;height:56px;border:none;border-radius:50%;',
    'background:linear-gradient(135deg,#6d5efc,#a06bff);color:#fff;font-size:24px;cursor:pointer;box-shadow:0 6px 20px rgba(109,94,252,.45);}',
    '#bj-panel{position:fixed;right:18px;bottom:84px;z-index:99999;width:360px;max-width:calc(100vw - 36px);height:520px;max-height:calc(100vh - 110px);',
    'background:#fff;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.22);display:none;flex-direction:column;overflow:hidden;font:14px/1.6 system-ui,"PingFang SC","Microsoft YaHei",sans-serif;}',
    '#bj-panel.show{display:flex;}',
    '#bj-head{background:linear-gradient(135deg,#6d5efc,#a06bff);color:#fff;padding:12px 14px;font-weight:600;display:flex;justify-content:space-between;align-items:center;}',
    '#bj-head .x{cursor:pointer;opacity:.85;font-weight:400;}',
    '#bj-msgs{flex:1;overflow-y:auto;padding:12px;background:#f7f7fb;}',
    '#bj-msgs .m{margin:8px 0;padding:9px 12px;border-radius:12px;max-width:88%;white-space:pre-wrap;word-break:break-word;}',
    '#bj-msgs .u{background:#6d5efc;color:#fff;margin-left:auto;border-bottom-right-radius:4px;}',
    '#bj-msgs .b{background:#fff;color:#222;border:1px solid #ececf3;border-bottom-left-radius:4px;}',
    '#bj-msgs .b.typing::after{content:"▋";animation:bjblink 1s steps(2) infinite;}',
    '@keyframes bjblink{50%{opacity:0;}}',
    '#bj-foot{display:flex;gap:8px;padding:10px;border-top:1px solid #eee;background:#fff;}',
    '#bj-in{flex:1;border:1px solid #ddd;border-radius:10px;padding:8px 10px;outline:none;resize:none;font:inherit;max-height:80px;}',
    '#bj-send{background:#6d5efc;color:#fff;border:none;border-radius:10px;padding:0 16px;cursor:pointer;font-weight:600;}'
  ].join('')
  var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style)

  // ---------- DOM ----------
  var fab = document.createElement('button'); fab.id = 'bj-fab'; fab.innerHTML = '<i class="cc-mark" aria-hidden="true"></i>'; fab.title = '问白驹'
  var panel = document.createElement('div'); panel.id = 'bj-panel'
  panel.innerHTML =
    '<div id="bj-head"><span>' + ic('horse-mark') + ' 白驹 · 随时问</span>'
    + '<span class="x" id="bj-close">' + ic('chevron-down') + ' 收起</span></div>' +
    '<div id="bj-msgs"></div>' +
    '<div id="bj-foot"><textarea id="bj-in" rows="1" placeholder="问白驹 anything…（Enter 发送）"></textarea><button id="bj-send">' + ic('send') + ' 发送</button></div>'
  document.body.appendChild(fab); document.body.appendChild(panel)
  var msgs = panel.querySelector('#bj-msgs')
  var input = panel.querySelector('#bj-in')
  var sendBtn = panel.querySelector('#bj-send')
  var history = []

  function addMsg(role, text, typing) {
    var d = document.createElement('div')
    d.className = 'm ' + (role === 'user' ? 'u' : 'b') + (typing ? ' typing' : '')
    d.textContent = text || ''
    msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight
    return d
  }
  function ensureAI(cb) {
    if (window.AI && window.AI.chat) return cb()
    var s = document.createElement('script'); s.src = '/ai-client.js'
    s.onload = cb; s.onerror = function () { addMsg('bot', '⚠️ AI 客户端加载失败，请确认通过 node server.mjs 访问本页。'); }
    document.head.appendChild(s)
  }
  function send() {
    var q = input.value.trim(); if (!q) return
    input.value = ''
    addMsg('user', q)
    history.push({ role: 'user', content: q })
    var botEl = addMsg('bot', '', true)
    ensureAI(function () {
      try {
        window.AI.chat({
          provider: 'deepseek',
          messages: [{ role: 'system', content: SYS }].concat(history),
          onDelta: function (c) { botEl.classList.remove('typing'); botEl.textContent += c; msgs.scrollTop = msgs.scrollHeight },
          onDone: function () {
            botEl.classList.remove('typing')
            history.push({ role: 'assistant', content: botEl.textContent })
            if (history.length > 20) history = history.slice(history.length - 20)
          },
          onError: function (e) { botEl.classList.remove('typing'); botEl.textContent = '⚠️ ' + (e && e.message || e) }
        })
      } catch (e) { botEl.classList.remove('typing'); botEl.textContent = '⚠️ ' + (e && e.message || e) }
    })
  }

  fab.onclick = function () { panel.classList.toggle('show'); if (panel.classList.contains('show')) input.focus() }
  panel.querySelector('#bj-close').onclick = function () { panel.classList.remove('show') }
  sendBtn.onclick = send
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } })
})()
