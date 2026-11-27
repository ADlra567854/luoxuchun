/* ============================================================
   compile-mode.js · 编译模式 COO 真·本地运行环境
   支持：HTML(沙箱预览) / JavaScript(沙箱执行+控制台回传) /
         Python(Pyodide 浏览器本地真跑) / Markdown(渲染)
   所有代码仅在用户浏览器本地运行；AI辅助跳转智能体。
   ============================================================ */
(function () {
  'use strict'
  if (window.__coo) return
  window.__coo = true

  var $ = function (id) { return document.getElementById(id) }
  var STORE = 'coo.code.v2'
  var LANG_NAME = { html: 'HTML', js: 'JavaScript', python: 'Python', markdown: 'Markdown' }
  var pyReady = null
  var state = {}
  try { state = JSON.parse(localStorage.getItem(STORE) || '{}') } catch (e) {}

  var DEFAULTS = {
    html:
'<h2>🌟 我的第一个页面</h2>\n' +
'<button onclick="hello()">点我</button>\n' +
'<p id="out"></p>\n' +
'<scr' + 'ipt>\n' +
'function hello(){\n' +
'  document.getElementById("out").textContent = "你好，" + new Date().getFullYear();\n' +
'}\n' +
'console.log("页面已加载");\n' +
'<\/scr' + 'ipt>',
    js:
'// JavaScript 真·运行：控制台可见输出与报错\n' +
'function fib(n){ return n < 2 ? n : fib(n - 1) + fib(n - 2); }\n' +
'console.log("斐波那契前 10 项：");\n' +
'for (let i = 0; i < 10; i++) console.log(i + " → " + fib(i));\n' +
'\n' +
'// 试试故意写错，看报错如何回传：\n' +
'// oops.undefinedMethod();',
    python:
'# Python 经 Pyodide 在浏览器本地运行（首次需联网下载运行时）\n' +
'import math\n' +
'for i in range(1, 11):\n' +
'    print(f"{i} 的平方 = {i*i}，根号 ≈ {math.sqrt(i):.2f}")\n' +
'\n' +
'# 画个简单图形\n' +
'for n in range(1, 6):\n' +
'    print("*" * n)',
    markdown:
'# 编译模式也支持 Markdown\n\n' +
'这是 **加粗**、*斜体*、`行内代码`。\n\n' +
'- 列表项一\n' +
'- 列表项二\n\n' +
'```js\nconsole.log("代码块");\n```\n\n' +
'> 引用一句话。'
  }

  /* ---------------- 工具 ---------------- */
  function curLang() {
    var b = document.querySelector('#compile .coo-lang button.cur')
    return b ? b.getAttribute('data-lang') : 'html'
  }
  function setStatus(text, busy) {
    var e = $('cooStatus')
    if (!e) return
    var dot = e.querySelector('.dot')
    if (dot) dot.className = 'dot' + (busy ? ' busy' : '')
    var t = e.querySelector('.txt')
    if (t) t.textContent = text
  }
  function appendConsole(cls, text) {
    var box = $('cooConsole')
    if (!box) return
    String(text).split('\n').forEach(function (line) {
      var d = document.createElement('span')
      d.className = 'ln ' + cls
      d.textContent = line
      box.appendChild(d)
    })
    box.scrollTop = box.scrollHeight
  }
  function clearConsole() { var b = $('cooConsole'); if (b) b.innerHTML = '' }
  function showPreview() {
    document.querySelector('#compile .coo-out-head .t[data-t="preview"]').classList.add('cur')
    document.querySelector('#compile .coo-out-head .t[data-t="console"]').classList.remove('cur')
    $('cooPreviewWrap').style.display = 'block'
    $('cooConsole').style.display = 'none'
  }
  function showConsole() {
    document.querySelector('#compile .coo-out-head .t[data-t="console"]').classList.add('cur')
    document.querySelector('#compile .coo-out-head .t[data-t="preview"]').classList.remove('cur')
    $('cooPreviewWrap').style.display = 'none'
    $('cooConsole').style.display = 'block'
  }
  function persist() {
    var lang = curLang()
    state[lang] = $('cooEditor').value
    try { localStorage.setItem(STORE, JSON.stringify(state)) } catch (e) {}
  }
  function loadLang(lang, keepEditor) {
    if (!keepEditor) {
      $('cooEditor').value = (state[lang] != null) ? state[lang] : DEFAULTS[lang]
    }
    if (lang === 'html' || lang === 'markdown') showPreview()
    else showConsole()
  }

  /* ---------------- 运行分发 ---------------- */
  function run() {
    var lang = curLang()
    persist()
    clearConsole()
    if (lang === 'html') runHTML()
    else if (lang === 'js') runJS()
    else if (lang === 'python') runPython()
    else if (lang === 'markdown') runMarkdown()
  }

  /* HTML：srcdoc 沙箱 + 报错回传 */
  function runHTML() {
    var code = $('cooEditor').value
    var hook = '<scr' + 'ipt>window.onerror=function(m,s,l){parent.postMessage({__coo:1,type:"err",msg:m+" (行 "+l+")"},"*");return false;};' +
      'window.addEventListener("unhandledrejection",function(e){parent.postMessage({__coo:1,type:"err",msg:"Promise 错误: "+(e.reason&&e.reason.message||e.reason)},"*");});<\/scr' + 'ipt>'
    showPreview()
    $('cooPreview').srcdoc = hook + code
    setStatus('HTML 已在本地沙箱渲染')
  }

  /* JS：独立沙箱 iframe 执行 + console 捕获回传 */
  function runJS() {
    var code = $('cooEditor').value.replace(/<\/script>/gi, '<\\/script>')
    showConsole()
    var runner =
      '<!doctype html><html><head><meta charset="utf-8"></head><body><scr' + 'ipt>' +
      'function fmt(v){if(v===undefined)return"undefined";if(v===null)return"null";if(typeof v==="string")return v;try{return JSON.stringify(v);}catch(e){return String(v);}}\n' +
      'function post(t,args){try{parent.postMessage({__coo:1,type:t,msg:Array.prototype.map.call(args,fmt).join(" ")},"*");}catch(e){}}\n' +
      '["log","info","warn","error"].forEach(function(m){var o=console[m];console[m]=function(){post(m,arguments);if(o)o.apply(console,arguments);};});\n' +
      'window.onerror=function(m,s,l,c){parent.postMessage({__coo:1,type:"err",msg:m+" (行 "+l+":"+c+")"},"*");return true;};\n' +
      'window.addEventListener("unhandledrejection",function(e){parent.postMessage({__coo:1,type:"err",msg:"Uncaught (in promise) "+(e.reason&&e.reason.message||e.reason)},"*");});\n' +
      'try{\n' + code + '\n}catch(e){parent.postMessage({__coo:1,type:"err",msg:(e&&e.stack||e.message||String(e))},"*");}\n' +
      '<\/scr' + 'ipt></body></html>'
    $('cooRunner').srcdoc = runner
    setStatus('JavaScript 已在本地沙箱执行')
  }

  /* Python：Pyodide 懒加载，浏览器本地真跑 */
  function loadPy() {
    if (pyReady) return pyReady
    setStatus('正在加载 Python 运行时（首次需联网下载约数十 MB）…', true)
    pyReady = new Promise(function (resolve, reject) {
      var s = document.createElement('script')
      // 国内镜像（npmmirror），境外回退 jsdelivr
      s.src = 'https://registry.npmmirror.com/pyodide/0.26.2/full/pyodide.js'
      s.onload = function () {
        window.loadPyodide({ indexURL: 'https://registry.npmmirror.com/pyodide/0.26.2/full/' }).then(function (py) {
          py.setStdout({ batched: function (s) { appendConsole('log', s) } })
          py.setStderr({ batched: function (s) { appendConsole('err', s) } })
          resolve(py)
        }).catch(reject)
      }
      s.onerror = function () { reject(new Error('Pyodide 脚本加载失败（需联网）')) }
      document.head.appendChild(s)
    })
    return pyReady
  }
  function runPython() {
    showConsole()
    appendConsole('sys', '>>> 准备 Python 运行时…')
    loadPy().then(function (py) {
      setStatus('Python 执行中…', true)
      appendConsole('sys', '>>> 运行代码：')
      return py.runPythonAsync($('cooEditor').value)
    }).then(function () {
      setStatus('Python 执行完成')
    }).catch(function (err) {
      appendConsole('err', '✖ ' + (err && err.message || err))
      setStatus('Python 执行出错')
    })
  }

  /* Markdown：轻量渲染 */
  function mdToHtml(md) {
    function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
    function inline(s) {
      s = esc(s)
      s = s.replace(/`([^`]+)`/g, '<code>$1</code>')
      s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>')
      return s
    }
    var out = [], lines = md.split('\n'), i = 0
    while (i < lines.length) {
      var l = lines[i]
      if (/^```/.test(l)) {
        var buf = []; i++
        while (i < lines.length && !/^```/.test(lines[i])) { buf.push(esc(lines[i])); i++ }
        i++
        out.push('<pre><code>' + buf.join('\n') + '</code></pre>'); continue
      }
      if (/^#{1,6}\s/.test(l)) {
        var lv = l.match(/^#+/)[0].length
        out.push('<h' + lv + '>' + inline(l.replace(/^#+\s/, '')) + '</h' + lv + '>'); i++; continue
      }
      if (/^>\s?/.test(l)) { out.push('<blockquote>' + inline(l.replace(/^>\s?/, '')) + '</blockquote>'); i++; continue }
      if (/^[-*]\s+/.test(l)) {
        var items = []
        while (i < lines.length && /^[-*]\s+/.test(lines[i])) { items.push('<li>' + inline(lines[i].replace(/^[-*]\s+/, '')) + '</li>'); i++ }
        out.push('<ul>' + items.join('') + '</ul>'); continue
      }
      if (l.trim() === '') { i++; continue }
      out.push('<p>' + inline(l) + '</p>'); i++
    }
    return out.join('\n')
  }
  function runMarkdown() {
    showPreview()
    var style = '<style>body{font-family:-apple-system,system-ui,sans-serif;padding:18px;color:#1d2b4d;line-height:1.7}' +
      'h1,h2,h3{color:#1d2b4d;border-bottom:1px solid #eef;padding-bottom:4px}' +
      'code{background:#eef4ff;padding:1px 5px;border-radius:4px;font-size:.9em}' +
      'pre{background:#0f1830;color:#dceaff;padding:12px;border-radius:10px;overflow:auto}' +
      'blockquote{border-left:3px solid #4f8cff;margin:0;padding-left:12px;color:#5b6b8c}' +
      'ul{line-height:1.9;padding-left:20px}</style>'
    $('cooPreview').srcdoc = style + mdToHtml($('cooEditor').value)
    setStatus('Markdown 已渲染')
  }

  /* ---------------- AI 辅助（复活死按钮 askCode） ---------------- */
  function aiAssist() {
    var lang = curLang()
    var code = $('cooEditor').value
    var prompt = '请帮我审查并改进下面这段' + LANG_NAME[lang] + '代码：\n1) 指出潜在 bug 与边界情况\n2) 给出更稳健的版本\n3) 用中文简要说明改动点\n\n```' + lang + '\n' + code + '\n```'
    window.open('./agent.html?ask=' + encodeURIComponent(prompt), '_blank')
  }

  /* ---------------- 消息监听（JS/HTML 回传） ---------------- */
  window.addEventListener('message', function (e) {
    var d = e.data
    if (!d || d.__coo !== 1) return
    if (d.type === 'err') appendConsole('err', '✖ ' + d.msg)
    else appendConsole(d.type === 'warn' ? 'warn' : (d.type === 'info' ? 'info' : 'log'), d.msg)
  })

  /* ---------------- 初始化 ---------------- */
  function init() {
    var editor = $('cooEditor')
    if (!editor) return
    // 语言切换
    document.querySelectorAll('#compile .coo-lang button').forEach(function (b) {
      b.addEventListener('click', function () {
        persist()
        document.querySelectorAll('#compile .coo-lang button').forEach(function (x) { x.classList.toggle('cur', x === b) })
        loadLang(b.getAttribute('data-lang'))
      })
    })
    // 输出区 tab
    document.querySelectorAll('#compile .coo-out-head .t').forEach(function (t) {
      t.addEventListener('click', function () {
        if (t.getAttribute('data-t') === 'preview') showPreview(); else showConsole()
      })
    })
    // 操作按钮
    $('cooRun').addEventListener('click', run)
    $('cooCopy').addEventListener('click', function () {
      var b = this; try { navigator.clipboard.writeText(editor.value) } catch (e) {}
      b.textContent = '✅ 已复制'; setTimeout(function () { b.textContent = '📋 复制'; }, 1400)
    })
    $('cooExample').addEventListener('click', function () {
      var lang = curLang(); state[lang] = DEFAULTS[lang]; persist(); editor.value = DEFAULTS[lang]; clearConsole()
      setStatus('已载入 ' + LANG_NAME[lang] + ' 示例')
    })
    $('cooClear').addEventListener('click', function () {
      var lang = curLang(); state[lang] = ''; editor.value = ''; clearConsole(); persist()
      setStatus('已清空')
    })
    $('cooAI').addEventListener('click', aiAssist)
    // 编辑器实时保存
    editor.addEventListener('input', function () { persist() })
    // 快捷键：Ctrl/Cmd + Enter 运行
    editor.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run() }
    })
    // 初始载入
    loadLang('html')
    setStatus('就绪 · 代码仅在本地运行')
  }

  if (document.readyState !== 'loading') init()
  else document.addEventListener('DOMContentLoaded', init)
})()
