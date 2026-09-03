/* ============================================================
   ai-tutor.js · AI 助教（C4 · 学习平台产品化）
   - 注入式：学院章节页自动出现「🎓 AI 助教」浮动按钮，点击展开对话面板
   - 上下文感知：自动提取当前章节标题 + 目录骨架 + 正文摘要，注入 system prompt
   - 复用 ai-client.js（window.AI.chat 流式；无后端时用户自填 Key，本地优先智谱免费）
   - 数据本地化：对话历史存 localStorage（ccowork.tutor），无隐私外泄
   - 双主题适配：全部 CSS 变量；不自动弹出，点击才开（不打扰阅读）
   - 零硬编码密钥：Key 由 ai-client.js 的 CC 统一管理（ccowork.keys）
   ============================================================ */
(function () {
  'use strict'
  if (window.__aiTutor) return
  window.__aiTutor = true

  var LSKEY = 'ccowork.tutor'          // { model, asked, lastAskAt, history: [{q,a,t}] }
  var MAX_HISTORY = 20
  var panel = null, fab = null, msgsEl = null, inputEl = null, sendBtn = null
  var busy = false, cancelFn = null, provider = 'zhipu'

  function LSget(k) { try { return localStorage.getItem(k) || '' } catch (e) { return '' } }
  function LSset(k, v) { try { localStorage.setItem(k, v) } catch (e) {} }
  function readTutor() {
    try { var o = JSON.parse(LSget(LSKEY) || 'null'); return (o && typeof o === 'object') ? o : {} } catch (e) { return {} }
  }
  function saveTutor(o) { LSset(LSKEY, JSON.stringify(o)) }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }
  // 矢量图标：沿用站点 cc-ic CSS-mask 体系，自动继承文字颜色与字号
  function ic(name) {
    return '<i class="cc-ic" data-ic="' + name + '" aria-hidden="true"></i>'
  }
  // 轻量 markdown：加粗 / 行内代码 / 换行（安全转义优先，不做完整 markdown）
  function renderMd(t) {
    var e = esc(t)
    e = e.replace(/`([^`\n]+)`/g, '<code>$1</code>')
    e = e.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')
    e = e.replace(/\n/g, '<br>')
    return e
  }
  function loadScript(src) {
    return new Promise(function (res, rej) {
      if (document.querySelector('script[src="' + src + '"]')) return res()
      var s = document.createElement('script')
      s.src = src
      s.onload = function () { res() }
      s.onerror = function () { rej(new Error('加载失败：' + src)) }
      document.head.appendChild(s)
    })
  }
  function ensureAI() {
    if (window.AI && window.AI.chat) return Promise.resolve()
    return loadScript('/ai-client.js').then(function () {
      if (!(window.AI && window.AI.chat)) throw new Error('AI 客户端不可用')
    })
  }

  // ---------------- 章节上下文提取 ----------------
  function collectContext() {
    var art = document.querySelector('article') || document.body
    var title = ''
    var h1s = art.querySelectorAll('h1')
    for (var i = 0; i < h1s.length; i++) {
      var t = (h1s[i].textContent || '').trim()
      if (t && /^第[一二三四五六七八九十百\d]+章/.test(t)) { title = t; break }
      if (t && !title) title = t
    }
    var toc = []
    var hs = art.querySelectorAll('h2, h3')
    for (var j = 0; j < hs.length && toc.length < 14; j++) {
      var tt = (hs[j].textContent || '').trim().replace(/\s+/g, ' ')
      if (tt && tt.length < 60) toc.push(tt)
    }
    var excerpt = ''
    var ps = art.querySelectorAll('p')
    for (var k = 0; k < ps.length && excerpt.length < 600; k++) {
      var p = (ps[k].textContent || '').trim()
      if (p.length > 24 && p.indexOf('图片') === -1) excerpt += p.slice(0, 150) + ' '
    }
    return { title: title || '本章', toc: toc, excerpt: excerpt.slice(0, 700) }
  }

  // ---------------- system prompt（上下文感知） ----------------
  function buildSystem() {
    var ctx = collectContext()
    var lines = [
      '你是「白驹 · AI 学院」的 AI 助教，正在一对一辅导学习者。用中文回答，口语化、通俗易懂，面向大专/自学水平，多用类比与例子。',
      '当前学习章节：' + (ctx.title || '本章'),
      ''
    ]
    if (ctx.toc.length) {
      lines.push('本章知识骨架（小标题）：')
      lines.push(ctx.toc.map(function (t) { return ' - ' + t }).join('\n'))
      lines.push('')
    }
    if (ctx.excerpt) {
      lines.push('本章开头内容摘录：' + ctx.excerpt.slice(0, 400))
      lines.push('')
    }
    lines.push('回答规则：')
    lines.push('1. 优先紧扣本章内容答疑；超出本章的问题可简要回答并指出可参考的章节方向')
    lines.push('2. 分点回答，一般控制在 400 字内；需要时可给代码/命令示例')
    lines.push('3. 不确定的内容必须明说「这部分我不确定，建议查证官方资料」，绝不编造')
    lines.push('4. 适当用 1-2 个小问题确认学习者是否理解（不要每轮都问）')
    return lines.join('\n')
  }

  // ---------------- 快捷问题（基于本章目录动态生成） ----------------
  function quickQuestions() {
    var ctx = collectContext()
    var qs = ['总结本章核心要点', '本章学完后我该掌握什么？', '出 1 道练习题考考我']
    var first = ctx.toc[0], second = ctx.toc[1] || ctx.toc[0]
    if (first) qs.unshift('给我讲讲「' + first.replace(/^\d+(\.\d+)*\s*/, '') + '」')
    if (second && second !== first) qs.push('举例说明「' + second.replace(/^\d+(\.\d+)*\s*/, '') + '」')
    return qs.slice(0, 5)
  }

  // ---------------- 样式 ----------------
  var css = '' +
    /* 位置避开 ccowork-pet（右下角 62px 悬浮宠物，z-index 9999）：FAB 放在其左侧 */
    '#aiTutorFab{position:fixed;right:92px;bottom:16px;z-index:9996;display:flex;align-items:center;gap:8px;padding:12px 18px;border-radius:999px;border:1px solid rgba(255,255,255,.4);' +
    'background:linear-gradient(120deg,#4f8cff,#38b6ff 50%,#8b5cf6);color:#fff;font-size:14px;font-weight:800;cursor:pointer;' +
    'box-shadow:0 8px 24px rgba(79,140,255,.4);transition:transform .18s,box-shadow .18s,opacity .2s;font-family:inherit;opacity:.96}' +
    'body[data-theme="deep"] #aiTutorFab{background:linear-gradient(120deg,#38e1ff,#5b8cff 45%,#8b5cf6);box-shadow:0 8px 24px rgba(56,225,255,.35)}' +
    '#aiTutorFab:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(79,140,255,.5)}' +
    '#aiTutorFab:active{transform:translateY(0)}' +
    '#aiTutorFab .at-fab-ic{font-size:17px;line-height:1}' +
    /* 面板 z-index 高于 ccowork-panel(9998)，保证对话不被工作台遮挡 */
    '#aiTutorPanel{position:fixed;right:16px;bottom:74px;z-index:10000;width:min(392px,calc(100vw - 24px));height:min(600px,calc(100vh - 96px));' +
    'display:flex;flex-direction:column;border-radius:18px;border:1px solid var(--line,#e3ebf5);background:var(--glass-strong,#fff);' +
    'box-shadow:0 18px 50px rgba(16,48,120,.28);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);overflow:hidden;' +
    'transform:translateY(12px) scale(.98);opacity:0;pointer-events:none;transition:.24s;font-family:var(--sans,"PingFang SC","Microsoft YaHei",sans-serif)}' +
    '#aiTutorPanel.show{transform:none;opacity:1;pointer-events:auto}' +
    '#aiTutorPanel .at-head{flex:none;display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--line,#e3ebf5);' +
    'background:linear-gradient(120deg,rgba(79,140,255,.08),rgba(139,92,246,.08))}' +
    '#aiTutorPanel .at-head .at-h-ic{width:36px;height:36px;border-radius:10px;background:linear-gradient(120deg,#4f8cff,#38b6ff 50%,#8b5cf6);' +
    'display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff;flex:none}' +
    'body[data-theme="deep"] #aiTutorPanel .at-head .at-h-ic{background:linear-gradient(120deg,#38e1ff,#5b8cff 45%,#8b5cf6)}' +
    '#aiTutorPanel .at-h-t{flex:1;min-width:0}' +
    '#aiTutorPanel .at-h-t b{display:block;font-size:14.5px;color:var(--text,#1e293b);font-weight:800}' +
    '#aiTutorPanel .at-h-t span{display:block;font-size:11.5px;color:var(--muted,#64748b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#aiTutorPanel .at-h-btn{flex:none;width:30px;height:30px;border-radius:50%;border:1px solid var(--line,#e3ebf5);background:transparent;' +
    'color:var(--muted,#64748b);font-size:13px;cursor:pointer;transition:.18s;display:flex;align-items:center;justify-content:center}' +
    '#aiTutorPanel .at-h-btn:hover{color:var(--blue,#2563eb);border-color:var(--blue,#2563eb)}' +
    '#aiTutorPanel .at-h-btn.at-key:hover{color:#d97706;border-color:#d97706}' +
    '#aiTutorPanel .at-chips{flex:none;display:flex;gap:8px;padding:10px 14px;overflow-x:auto;scrollbar-width:none;border-bottom:1px solid var(--line,#eef2f8)}' +
    '#aiTutorPanel .at-chips::-webkit-scrollbar{display:none}' +
    '#aiTutorPanel .at-chip{flex:none;font-size:12px;color:var(--muted,#475569);padding:6px 13px;border-radius:999px;border:1px solid var(--line,#e3ebf5);' +
    'background:var(--panel,#f6f9fd);cursor:pointer;transition:.16s;white-space:nowrap;font-family:inherit}' +
    '#aiTutorPanel .at-chip:hover{color:var(--blue,#2563eb);border-color:var(--blue,#2563eb)}' +
    '#aiTutorPanel .at-msgs{flex:1;overflow-y:auto;padding:16px 14px;display:flex;flex-direction:column;gap:12px;scroll-behavior:smooth}' +
    '#aiTutorPanel .at-msg{max-width:86%;padding:10px 14px;border-radius:14px;font-size:13.5px;line-height:1.75;word-break:break-word;white-space:normal}' +
    '#aiTutorPanel .at-msg.at-user{align-self:flex-end;background:linear-gradient(120deg,#4f8cff,#38b6ff 50%,#8b5cf6);color:#fff;border-bottom-right-radius:4px}' +
    'body[data-theme="deep"] #aiTutorPanel .at-msg.at-user{background:linear-gradient(120deg,#38e1ff,#5b8cff 45%,#8b5cf6);color:#04101f}' +
    '#aiTutorPanel .at-msg.at-bot{align-self:flex-start;background:var(--panel,#f1f5fb);color:var(--text,#1e293b);border:1px solid var(--line,#e8eef6);border-bottom-left-radius:4px}' +
    '#aiTutorPanel .at-msg.at-bot code{background:rgba(100,116,139,.12);padding:1px 6px;border-radius:6px;font-size:12px}' +
    '#aiTutorPanel .at-msg.at-bot b{font-weight:800}' +
    '#aiTutorPanel .at-msg.at-bot .at-think{margin-top:8px;padding:8px 10px;border-radius:10px;background:rgba(250,204,21,.08);border:1px dashed rgba(217,119,6,.3);font-size:12px;color:var(--muted,#64748b)}' +
    '#aiTutorPanel .at-msg.at-err{align-self:center;max-width:92%;padding:12px 14px;border-radius:12px;border:1px solid rgba(239,68,68,.25);background:rgba(239,68,68,.06);color:#dc2626;font-size:12.5px}' +
    '#aiTutorPanel .at-welcome{align-self:center;text-align:center;color:var(--muted,#64748b);font-size:12px;line-height:1.8;padding:6px 10px;max-width:92%}' +
    '#aiTutorPanel .at-keyset{margin:4px 14px 0;padding:14px;border-radius:14px;border:1px solid rgba(217,119,6,.3);background:rgba(250,204,21,.06);flex:none}' +
    '#aiTutorPanel .at-keyset b{font-size:13px;color:#d97706;display:block;margin-bottom:6px}' +
    '#aiTutorPanel .at-keyset p{font-size:12px;color:var(--muted,#64748b);margin:0 0 10px;line-height:1.7}' +
    '#aiTutorPanel .at-keyset select,#aiTutorPanel .at-keyset input{width:100%;margin-bottom:8px;padding:9px 11px;border-radius:10px;border:1px solid var(--line,#e3ebf5);' +
    'background:var(--card,#fff);color:var(--text,#1e293b);font-size:12.5px;outline:none;font-family:inherit}' +
    '#aiTutorPanel .at-keyset select:focus,#aiTutorPanel .at-keyset input:focus{border-color:#d97706}' +
    '#aiTutorPanel .at-keyset .at-ks-actions{display:flex;gap:8px}' +
    '#aiTutorPanel .at-ks-btn{flex:1;padding:9px 0;border-radius:10px;border:none;background:linear-gradient(120deg,#f59e0b,#d97706);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:.15s}' +
    '#aiTutorPanel .at-ks-btn:hover{filter:brightness(1.06)}' +
    '#aiTutorPanel .at-ks-cancel{flex:none;padding:9px 14px;border-radius:10px;border:1px solid var(--line,#e3ebf5);background:transparent;color:var(--muted,#64748b);font-size:12.5px;cursor:pointer;font-family:inherit}' +
    '#aiTutorPanel .at-input{flex:none;display:flex;align-items:flex-end;gap:8px;padding:12px 14px;border-top:1px solid var(--line,#e3ebf5);background:var(--card,#fff)}' +
    '#aiTutorPanel .at-input textarea{flex:1;resize:none;height:44px;max-height:110px;padding:11px 13px;border-radius:12px;border:1px solid var(--line,#e3ebf5);' +
    'background:var(--panel,#f6f9fd);color:var(--text,#1e293b);font-size:13.5px;outline:none;font-family:inherit;line-height:1.5;transition:border-color .2s}' +
    '#aiTutorPanel .at-input textarea:focus{border-color:var(--blue,#2563eb)}' +
    '#aiTutorPanel .at-send{flex:none;width:44px;height:44px;border-radius:12px;border:none;background:linear-gradient(120deg,#4f8cff,#38b6ff 50%,#8b5cf6);color:#fff;' +
    'font-size:17px;cursor:pointer;transition:.18s;display:flex;align-items:center;justify-content:center;font-family:inherit}' +
    'body[data-theme="deep"] #aiTutorPanel .at-send{background:linear-gradient(120deg,#38e1ff,#5b8cff 45%,#8b5cf6);color:#04101f}' +
    '#aiTutorPanel .at-send:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(79,140,255,.35)}' +
    '#aiTutorPanel .at-send:disabled{opacity:.55;cursor:not-allowed;transform:none;box-shadow:none}' +
    '#aiTutorPanel .at-send.at-stop{background:linear-gradient(120deg,#f87171,#dc2626)}' +
    '#aiTutorPanel .at-foot{flex:none;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 14px;border-top:1px solid var(--line,#eef2f8);' +
    'background:var(--card,#fff);font-size:11px;color:var(--muted,#94a3b8)}' +
    '#aiTutorPanel .at-foot button{background:none;border:none;color:var(--muted,#64748b);font-size:11px;cursor:pointer;padding:2px 4px;font-family:inherit;transition:.15s}' +
    '#aiTutorPanel .at-foot button:hover{color:var(--blue,#2563eb)}' +
    '@media(max-width:520px){#aiTutorFab{right:74px;bottom:12px;padding:11px 15px;font-size:13px}#aiTutorPanel{right:8px;bottom:66px;width:calc(100vw - 16px);height:calc(100vh - 86px);border-radius:16px}}'
  var st = document.createElement('style')
  st.textContent = css
  document.head.appendChild(st)

  // ---------------- 消息渲染 ----------------
  function addMsg(role, html, cls) {
    var d = document.createElement('div')
    d.className = 'at-msg ' + (role === 'user' ? 'at-user' : 'at-bot') + (cls ? ' ' + cls : '')
    d.innerHTML = html
    msgsEl.appendChild(d)
    msgsEl.scrollTop = msgsEl.scrollHeight
    return d
  }
  function addWelcome() {
    var ctx = collectContext()
    var w = document.createElement('div')
    w.className = 'at-welcome'
    w.innerHTML = '我是本章的 <b>AI 助教</b>，已加载《' + esc(ctx.title || '本章') + '》的上下文。<br>你可以问我概念、让我总结、出练习题，或点击上方快捷问题试试。'
    msgsEl.appendChild(w)
  }

  // ---------------- 对话逻辑 ----------------
  function buildMessages(q) {
    var t = readTutor()
    var hist = (t.history || []).slice(-6)
    var msgs = [{ role: 'system', content: buildSystem() }]
    for (var i = 0; i < hist.length; i++) {
      if (hist[i].q) msgs.push({ role: 'user', content: String(hist[i].q).slice(0, 800) })
      if (hist[i].a) msgs.push({ role: 'assistant', content: String(hist[i].a).slice(0, 1000) })
    }
    msgs.push({ role: 'user', content: q.slice(0, 2000) })
    return msgs
  }
  function recordHistory(q, a) {
    var t = readTutor()
    t.asked = (t.asked || 0) + 1
    t.lastAskAt = Date.now()
    if (!t.history) t.history = []
    t.history.push({ q: String(q).slice(0, 500), a: String(a).slice(0, 3000), t: Date.now() })
    if (t.history.length > MAX_HISTORY) t.history = t.history.slice(-MAX_HISTORY)
    saveTutor(t)
  }
  function showKeySetup() {
    if (document.getElementById('atKeySetup')) return
    var ks = document.createElement('div')
    ks.className = 'at-keyset'
    ks.id = 'atKeySetup'
    ks.innerHTML =
      '<b>🔑 配置 AI 模型（Key 仅存本机）</b>' +
      '<p>当前站点为纯静态部署，需填入你自己的 API Key 才能使用助教。推荐<b>智谱 GLM-4.7-Flash（免费）</b>，去 open.bigmodel.cn 注册即得。</p>' +
      '<select id="atProvider">' +
      '<option value="zhipu">智谱 GLM-4.7-Flash（免费）</option>' +
      '<option value="deepseek">DeepSeek</option>' +
      '<option value="ark">火山方舟（豆包）</option>' +
      '</select>' +
      '<input id="atKeyInput" type="password" placeholder="粘贴 API Key" autocomplete="off">' +
      '<div class="at-ks-actions"><button class="at-ks-btn" id="atKeySave">' + ic('save') + ' 保存并开始</button><button class="at-ks-cancel" id="atKeyCancel">' + ic('clock') + ' 稍后</button></div>'
    // 插入到 chips 之前
    var chips = document.querySelector('#aiTutorPanel .at-chips')
    document.querySelector('#aiTutorPanel .at-head').after(ks)
    var sel = ks.querySelector('#atProvider')
    sel.value = provider
    var inp = ks.querySelector('#atKeyInput')
    if (window.CC && window.CC.get) inp.value = window.CC.get(provider) || ''
    ks.querySelector('#atKeySave').addEventListener('click', function () {
      var v = inp.value.trim()
      if (!v) { inp.style.borderColor = '#dc2626'; return }
      if (window.CC && window.CC.set) { window.CC.set(provider, v); window.CC.save() }
      provider = sel.value
      var t = readTutor(); t.model = provider; saveTutor(t)
      updateModelBtn()
      ks.remove()
      addMsg('bot', '<b>✅ Key 已保存（仅存本机）。</b>可以开始提问了。')
    })
    ks.querySelector('#atKeyCancel').addEventListener('click', function () { ks.remove() })
  }
  function updateModelBtn() {
    var btn = document.getElementById('atModelBtn')
    if (!btn || !window.AI || !window.AI.PROV) return
    var cfg = window.AI.PROV[provider]
    btn.textContent = cfg ? (cfg.label || provider) : provider
    btn.title = '当前模型：' + (cfg ? cfg.label : provider) + '，点击切换'
  }

  function handleError(e) {
    busy = false
    if (sendBtn) { sendBtn.disabled = false; sendBtn.innerHTML = ic('send'); sendBtn.className = 'at-send' }
    var msg = (e && e.message) || String(e)
    if (/API Key|请先设置|key/i.test(msg)) {
      addMsg('err', '🔑 需要配置 API Key 才能使用助教。请在下方完成设置，或本地运行时自动走服务端密钥。')
      showKeySetup()
    } else if (/fetch|network|网络|Failed to fetch|HTTP/i.test(msg)) {
      addMsg('err', '⚠️ 网络请求失败：' + esc(msg.slice(0, 120)) + '<br>请检查网络后重试，或切换到其他模型。')
    } else {
      addMsg('err', '⚠️ 出错了：' + esc(msg.slice(0, 160)))
    }
  }

  function send(text) {
    text = String(text || '').trim()
    if (!text || busy) return
    var t = readTutor()
    provider = t.model || 'zhipu'
    addMsg('user', renderMd(text).replace(/\n/g, '<br>'))
    inputEl.value = ''
    autoGrow()
    busy = true
    sendBtn.disabled = true
    sendBtn.innerHTML = ic('square')
    sendBtn.className = 'at-send at-stop cc-icon-only'
    sendBtn.title = '停止生成'
    var acc = ''
    var cur = addMsg('bot', '')
    cur.classList.add('at-thinking')
    cur.innerHTML = '<span class="at-think">🤔 思考中…</span>'

    function finish() {
      busy = false
      if (sendBtn) { sendBtn.disabled = false; sendBtn.innerHTML = ic('send'); sendBtn.className = 'at-send'; sendBtn.title = '发送' }
      if (!acc.trim()) {
        cur.remove()
        addMsg('err', '⚠️ 助教没有返回内容，请重试或检查模型配置。')
        return
      }
      cur.innerHTML = renderMd(acc)
      recordHistory(text, acc)
      updateAsked()
    }

    ensureAI().then(function () {
      var msgs = buildMessages(text)
      cancelFn = window.AI.chat({
        provider: provider,
        messages: msgs,
        onDelta: function (c) {
          acc += c
          var think = cur.querySelector('.at-think')
          if (think) think.remove()
          if (!cur.classList.contains('at-typing')) cur.classList.add('at-typing')
          cur.innerHTML = renderMd(acc)
          msgsEl.scrollTop = msgsEl.scrollHeight
        },
        onDone: finish,
        onError: function (e) {
          cur.remove()
          handleError(e)
        },
      })
      if (cancelFn && cancelFn.catch) cancelFn.catch(function (e) { cur.remove(); handleError(e) })
    }).catch(function (e) {
      cur.remove()
      handleError(e)
    })
  }

  function stop() {
    if (cancelFn) { try { cancelFn() } catch (e) {} cancelFn = null }
    busy = false
    if (sendBtn) { sendBtn.disabled = false; sendBtn.innerHTML = ic('send'); sendBtn.className = 'at-send'; sendBtn.title = '发送' }
  }

  function autoGrow() {
    if (!inputEl) return
    inputEl.style.height = 'auto'
    inputEl.style.height = Math.min(inputEl.scrollHeight, 110) + 'px'
  }

  // ---------------- 面板构建 ----------------
  function buildPanel() {
    var ctx = collectContext()
    panel = document.createElement('div')
    panel.id = 'aiTutorPanel'
    panel.innerHTML =
      '<div class="at-head">' +
      '<div class="at-h-ic">🎓</div>' +
      '<div class="at-h-t"><b>AI 助教 · 上下文感知</b><span>' + esc(ctx.title || '本章') + '</span></div>' +
      '<button class="at-h-btn at-key" id="atKeyBtn" title="配置 API Key">' + ic('key') + '</button>' +
      '<button class="at-h-btn" id="atModelBtn" title="切换模型">' + ic('ellipsis') + '</button>' +
      '<button class="at-h-btn" id="atClose" title="收起">' + ic('x') + '</button>' +
      '</div>' +
      '<div class="at-chips" id="atChips"></div>' +
      '<div class="at-msgs" id="atMsgs"></div>' +
      '<div class="at-input">' +
      '<textarea id="atInput" rows="1" placeholder="问本章的内容，比如：什么是智能体？"></textarea>' +
      '<button class="at-send" id="atSend" title="发送">' + ic('send') + '</button>' +
      '</div>' +
      '<div class="at-foot"><span>回答由 AI 生成，仅供参考 · 已提问 <b id="atAsked">0</b> 次</span><span><button id="atClear">' + ic('eraser') + ' 清除记录</button></span></div>'
    document.body.appendChild(panel)

    msgsEl = panel.querySelector('#atMsgs')
    inputEl = panel.querySelector('#atInput')
    sendBtn = panel.querySelector('#atSend')

    // 快捷问题
    var chipsEl = panel.querySelector('#atChips')
    quickQuestions().forEach(function (q) {
      var c = document.createElement('button')
      c.className = 'at-chip'
      c.type = 'button'
      c.textContent = q
      c.addEventListener('click', function () { send(q) })
      chipsEl.appendChild(c)
    })

    // 事件
    panel.querySelector('#atClose').addEventListener('click', function () { togglePanel(false) })
    panel.querySelector('#atKeyBtn').addEventListener('click', function () { showKeySetup() })
    panel.querySelector('#atModelBtn').addEventListener('click', function () {
      var order = ['zhipu', 'deepseek', 'ark']
      var idx = order.indexOf(provider)
      provider = order[(idx + 1) % order.length]
      var t = readTutor(); t.model = provider; saveTutor(t)
      updateModelBtn()
      addMsg('bot', '已切换模型：<b>' + (window.AI && window.AI.PROV && window.AI.PROV[provider] ? window.AI.PROV[provider].label : provider) + '</b>')
    })
    panel.querySelector('#atClear').addEventListener('click', function () {
      if (!window.confirm('确定清除全部助教对话记录？（仅影响本机浏览器）')) return
      var t = readTutor(); t.history = []; saveTutor(t)
      msgsEl.innerHTML = ''
      addWelcome()
      updateAsked()
    })
    sendBtn.addEventListener('click', function () { if (busy) stop(); else send(inputEl.value) })
    inputEl.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); send(inputEl.value) }
    })
    inputEl.addEventListener('input', autoGrow)

    updateAsked()
    addWelcome()
    updateModelBtn()
  }

  function updateAsked() {
    var el = document.getElementById('atAsked')
    if (el) el.textContent = readTutor().asked || 0
  }

  function togglePanel(open) {
    if (!panel) buildPanel()
    var show = typeof open === 'boolean' ? open : !panel.classList.contains('show')
    panel.classList.toggle('show', show)
    if (fab) fab.style.opacity = show ? '0' : '.96'
    if (show) {
      // 首次打开：若无任何 Key 且无后端 → 温和引导（不强制弹，面板内提供 🔑 按钮）
      setTimeout(function () {
        if (!busy) {
          var hasKey = window.CC && window.CC.get && (window.CC.get('zhipu') || window.CC.get('deepseek') || window.CC.get('ark'))
          if (!hasKey && !document.getElementById('atKeySetup')) {
            var tip = document.createElement('div')
            tip.className = 'at-msg at-err'
            tip.innerHTML = '💡 首次使用：点右上角 <b>🔑</b> 配置一个免费 API Key（智谱 GLM-4.7-Flash 免费，仅存本机）即可开始提问。'
            msgsEl.appendChild(tip)
          }
        }
        inputEl && inputEl.focus()
      }, 260)
    }
  }

  // ---------------- 浮动按钮 ----------------
  function buildFab() {
    fab = document.createElement('button')
    fab.id = 'aiTutorFab'
    fab.type = 'button'
    fab.innerHTML = '<span class="at-fab-ic">🎓</span><span>AI 助教</span>'
    fab.title = 'AI 助教 · 本章内容随问随答'
    fab.addEventListener('click', function () { togglePanel() })
    document.body.appendChild(fab)
  }

  // ---------------- 启动 ----------------
  function init() {
    try {
      var t = readTutor()
      provider = t.model || 'zhipu'
      buildFab()
    } catch (e) {}
  }
  if (document.body) init()
  else document.addEventListener('DOMContentLoaded', init)

  // 全局 API：其他页面可手动打开
  window.AITutor = {
    open: function () { togglePanel(true) },
    close: function () { togglePanel(false) },
    send: function (q) { togglePanel(true); setTimeout(function () { send(q) }, 300) },
  }
})()
