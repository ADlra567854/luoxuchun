/* ccowork · 全局悬浮工作台插件
 * 所有页面右下角悬浮小宠物（动画），点击展开 ccowork 工作台：
 * 智能体 / AI对话 / AI漫剧 / 语音 / 简历 / 刷题 / 天气 / 新闻 / 画廊 / 知识库
 * 用法：页面 <script src="/ccowork.js"></script>（根目录或各子目录均用绝对路径）
 */
(function () {
  'use strict'
  if (window.__ccowork) return
  window.__ccowork = true

  var C = {
    pet: null, panel: null, open: false, recog: null
  }

  // ---------- 白驹主题注入（云顶天空 · 全站统一白色） ----------
  try {
    var scr = document.currentScript || (function () { var s = document.getElementsByTagName('script'); return s[s.length - 1] })()
    var base = scr.src.replace(/[^/]*$/, '')
    var link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = base + 'theme-cloud.css'
    document.head.appendChild(link)
    // 全站设计系统组件层（毛玻璃导航 / 渐变 Hero / 品牌页脚 / 卡片按钮统一）
    var link2 = document.createElement('link')
    link2.rel = 'stylesheet'
    link2.href = base + 'site-redesign.css'
    document.head.appendChild(link2)
    // 工业美学层（工程图纸 × 精密仪表 · 全站追加）
    var link3 = document.createElement('link')
    link3.rel = 'stylesheet'
    link3.href = base + 'site-industrial.css'
    document.head.appendChild(link3)

    // 全站统一品牌资产（favicon / apple-touch-icon / og-image / manifest）
    ;(function brandHead(){
      if (!document.querySelector('link[rel*="icon"]')) {
        var fav = document.createElement('link'); fav.rel = 'icon'; fav.href = '/favicon.ico'; fav.sizes = 'any'; document.head.appendChild(fav);
      }
      if (!document.querySelector('link[rel="apple-touch-icon"]')) {
        var at = document.createElement('link'); at.rel = 'apple-touch-icon'; at.href = '/apple-touch-icon.png'; at.sizes = '180x180'; document.head.appendChild(at);
      }
      if (!document.querySelector('link[rel="manifest"]')) {
        var man = document.createElement('link'); man.rel = 'manifest'; man.href = '/manifest.webmanifest'; document.head.appendChild(man);
      }
      if (!document.querySelector('meta[property="og:image"]')) {
        var og = document.createElement('meta'); og.setAttribute('property', 'og:image'); og.setAttribute('content', '/og-image.png'); document.head.appendChild(og);
      }
    })()
  } catch (e) {}
  try {
    if (!document.body.getAttribute('data-theme')) {
      var savedTheme = ''
      try { savedTheme = localStorage.getItem('ccowork.theme') || '' } catch (e) {}
      document.body.setAttribute('data-theme', savedTheme || 'cloud')
    }
  } catch (e) {}

  // 每页底部注入「今日鼓励语」（每日轮换 · 全站每页可见）
  (function footerQuote(){
    try{
      var QUOTES2 = [
        '今天也要离梦想近一点——哪怕只近 1%。',
        '坚持做难而正确的事，时间会给答案。',
        '别怕慢，怕的是停。',
        '你现在的努力，正在悄悄改变未来的轨迹。',
        '先相信自己，别人才会相信你。',
        '每一次小小的尝试，都在积累大大的可能。',
        '把今天过好，明天不会差。',
        '学习新东西最好的时间是现在。',
        '累了就歇一下，但别停下来。',
        '你的潜力，远超你此刻的想象。',
        '勇敢不是不害怕，而是害怕了还在往前走。',
        '每一个认真生活的人，都值得被生活温柔以待。',
        '成长就是：昨天的难题，变成今天的故事。',
        '星光不问赶路人，时光不负有心人。',
        '慢慢来，比较快。',
        '你只管努力，剩下的交给时间。',
        '今天的一小步，是明天的一大步。',
        '与其仰望星空，不如脚踏实地。',
        '别让"来不及"成为你的口头禅。',
        '世界会为认真的人让路。',
        '把抱怨换成行动，世界立刻不一样。',
        '成功的路上并不拥挤，因为坚持的人不多。',
        '愿你眼中有光，心中有火。',
        '今天，从一个小目标开始。',
        '你不需要很厉害才能开始，但需要开始才能很厉害。',
        '所有的不可能，都始于不敢尝试。',
        '给自己一点耐心，给未来一点信心。',
        '热爱可抵岁月漫长。',
        '每天进步一点点，坚持带来大改变。',
        '你比自己以为的更强大。'
      ];
      var dayIdx = Math.floor(Date.now() / 86400000);
      var q = QUOTES2[dayIdx % QUOTES2.length];
      var foot = document.querySelector('footer');
      var div = document.createElement('div');
      div.className = 'ccw-footer-quote';
      div.innerHTML = '<i class="cc-ic" data-ic="message-circle" aria-hidden="true"></i> <em>' + q + '</em><span>—— 今日鼓励 · ccowork 与你同行</span>';
      if(foot){ foot.appendChild(div); }
      else {
        div.style.cssText = 'text-align:center;padding:20px 24px 28px;color:#64748b;font-size:12.5px;line-height:1.9';
        document.body.appendChild(div);
      }
    }catch(e){}
  })();

  // ---------- 全站统一品牌页脚（设计系统组件层） ----------
  // 检测到页面 footer 过简（仅一行版权）或缺失时，注入品牌列+三列链接的完整页脚；
  // 已有 .site-footer / .ccw-footer / .foot-inner 的页面（如首页）自动跳过。
  (function siteFooter(){
    try{
      if (document.querySelector('.site-footer, .ccw-footer, .foot-inner')) return;
      var FOOT_HTML =
        '<footer class="site-footer">' +
          '<div class="foot-inner">' +
            '<div class="foot-brand">' +
              '<div class="logo-row"><span class="logo"><i class="cc-mark" aria-hidden="true"></i></span><b>白驹 · ccowork</b></div>' +
              '<p>把散落的 AI 工具装进一个大脑。门户、对话、创作、仿真，本地优先，开箱即用。</p>' +
            '</div>' +
            '<div class="foot-col"><b>产品</b>' +
              '<a href="' + base + 'index.html">对话工作台</a>' +
              '<a href="' + base + 'website/workstation.html">白驹工作站</a>' +
              '<a href="' + base + 'website/biz-center.html">AI 业务中心</a>' +
              '<a href="' + base + 'website/map-guide.html">地图指引</a>' +
            '</div>' +
            '<div class="foot-col"><b>场馆</b>' +
              '<a href="' + base + 'website/tech-museum.html">科技馆</a>' +
              '<a href="' + base + 'website/ai-build-hall.html">AI 智能建造馆</a>' +
              '<a href="' + base + 'website/gallery.html">AI 绘画</a>' +
              '<a href="' + base + 'website/voice.html">语音输入</a>' +
            '</div>' +
            '<div class="foot-col"><b>内容</b>' +
              '<a href="' + base + 'website/hub.html">博客与书库</a>' +
              '<a href="' + base + 'website/book/index.html">五卷全书</a>' +
              '<a href="' + base + 'lab/index.html">实验室</a>' +
              '<a href="' + base + 'website/ai-projects.html">作品集</a>' +
            '</div>' +
            '<div class="foot-col"><b>关于</b>' +
              '<a href="' + base + 'website/about.html">关于我们</a>' +
              '<a href="' + base + 'website/brand-guidelines.html">品牌规范</a>' +
              '<a href="' + base + 'website/privacy.html">隐私政策</a>' +
              '<a href="' + base + 'website/opensource.html">开源仓库</a>' +
            '</div>' +
          '</div>' +
          '<div class="foot-bar">' +
            '<span>© 2026 ccowork · 白驹全局大脑 · AI 创作纪元</span>' +
            '<span>本地运行 · 数据不出本机 · MIT License</span>' +
          '</div>' +
        '</footer>';
      var oldFoot = document.querySelector('footer');
      if (oldFoot) {
        // 保留原页脚版权文本（若存在且非空），合并进 foot-bar
        var oldTxt = (oldFoot.innerText || '').replace(/[\s\n]+/g, ' ').trim();
        if (oldTxt && oldTxt.length > 2 && oldTxt.indexOf('ccowork') === -1) {
          FOOT_HTML = FOOT_HTML.replace('</span></div></footer>', '</span><span>' + oldTxt.slice(0, 60) + '</span></div></footer>');
        }
        oldFoot.outerHTML = FOOT_HTML;
      } else {
        document.body.appendChild(document.createElement('div')).outerHTML = FOOT_HTML;
      }
    }catch(e){}
  })();

  // 被 iframe 嵌入（如工作台 ccowork.html 内嵌的页面）时不创建悬浮宠物，避免重影
  var inIframe = false
  try { inIframe = window.self !== window.top } catch (e) { inIframe = true }
  if (inIframe) return

  // 本身已是工作台 / 门户 / 智能体主页的页面，不再叠加悬浮宠物，消除「重影」与小屏重复
  var _path = ((location.pathname || '').split('/').pop() || 'index.html').toLowerCase()
  var SKIP_PET = ['ccowork.html','home.html','hub.html','portal.html','workstation.html',
    'agent.html','index.html','chat.html','assistant.html','reader.html','settings.html']
  if (SKIP_PET.indexOf(_path) !== -1) return

  var css = '' +
  '#ccowork-pet{position:fixed;right:18px;bottom:18px;z-index:9999;width:62px;height:62px;cursor:pointer;' +
    'border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:30px;' +
    'background:radial-gradient(circle at 32% 30%,#38e1ff,#5b8cff 55%,#8b5cf6);' +
    'box-shadow:0 8px 30px rgba(56,225,255,.45),inset 0 0 18px rgba(255,255,255,.25);' +
    'transition:transform .25s,box-shadow .25s;user-select:none;' +
    'animation:ccwFloat 3.2s ease-in-out infinite}' +
  '#ccowork-pet:hover{transform:scale(1.12);box-shadow:0 12px 40px rgba(56,225,255,.65)}' +
  '#ccowork-pet::after{content:"";position:absolute;inset:-7px;border-radius:50%;border:2px dashed rgba(94,234,212,.5);' +
    'animation:ccwSpin 12s linear infinite}' +
  '#ccowork-pet .eye{position:absolute;width:8px;height:10px;border-radius:50%;background:#04101f;top:24px;' +
    'animation:ccwBlink 4s infinite}' +
  '#ccowork-pet .eye.l{left:17px}#ccowork-pet .eye.r{right:17px}' +
  '#ccowork-pet .mouth{position:absolute;width:10px;height:6px;border-bottom:2.5px solid #04101f;border-radius:0 0 12px 12px;bottom:16px;left:26px}' +
  '@keyframes ccwFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}' +
  '@keyframes ccwSpin{to{transform:rotate(360deg)}}' +
  '@keyframes ccwBlink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}' +
  '#ccowork-panel{position:fixed;right:18px;bottom:92px;z-index:9998;width:min(330px,calc(100vw - 36px));' +
    'max-height:min(76vh,640px);overflow-y:auto;border-radius:20px;padding:18px;' +
    'background:rgba(8,12,22,.92);border:1px solid rgba(120,160,220,.25);backdrop-filter:blur(18px);' +
    'box-shadow:0 24px 70px rgba(0,0,0,.6);color:#e9f0fb;font-family:"PingFang SC","Microsoft YaHei",system-ui,sans-serif;' +
    'transform:translateY(16px) scale(.96);opacity:0;pointer-events:none;transition:.28s}' +
  '#ccowork-panel.show{transform:none;opacity:1;pointer-events:auto}' +
  '#ccowork-panel h3{margin:0 0 4px;font-size:17px;letter-spacing:1px;background:linear-gradient(120deg,#5eead4,#38e1ff,#5b8cff);' +
    '-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:900}' +
  '#ccowork-panel .sub{font-size:11.5px;color:#8fa3bd;margin-bottom:12px}' +
  '#ccowork-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
  '#ccowork-chat{margin-bottom:10px}' +
  '#ccowork-session-bar{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;gap:6px}' +
  '#ccowork-session-title{flex:1;font-size:11.5px;color:#8fa3bd;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
  '#ccowork-session-title b{color:#5eead4;font-weight:600}' +
  '.ccw-sess-btn{background:rgba(120,160,220,.12);border:1px solid rgba(120,160,220,.2);color:#8fa3bd;border-radius:8px;padding:4px 8px;font-size:11px;cursor:pointer;transition:.2s;font-family:inherit}' +
  '.ccw-sess-btn:hover{background:rgba(94,234,212,.15);border-color:rgba(94,234,212,.3);color:#5eead4}' +
  '#ccowork-sess-menu{position:fixed;z-index:10000;min-width:220px;max-height:300px;overflow-y:auto;background:rgba(8,12,22,.98);border:1px solid rgba(120,160,220,.25);border-radius:12px;padding:6px}' +
  '#ccowork-sess-menu .sess-item{padding:8px 10px;border-radius:8px;cursor:pointer;font-size:11.5px;display:flex;justify-content:space-between;align-items:center;gap:8px}' +
  '#ccowork-sess-menu .sess-item:hover{background:rgba(94,234,212,.1)}' +
  '#ccowork-sess-menu .sess-item.active{background:rgba(94,234,212,.15);border:1px solid rgba(94,234,212,.3)}' +
  '#ccowork-sess-menu .sess-item .s-left{flex:1;min-width:0}' +
  '#ccowork-sess-menu .sess-item .st{color:#8fa3bd;font-size:10.5px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
  '#ccowork-sess-menu .sess-item .sname{color:#e9f0fb;font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block}' +
  '#ccowork-sess-menu .sess-item .sdel{color:#f87171;opacity:0;transition:.2s;font-size:12px;flex-shrink:0}' +
  '#ccowork-sess-menu .sess-item:hover .sdel{opacity:1}' +
  '#ccowork-sess-menu .sess-empty{padding:12px;text-align:center;color:#64748b;font-size:11.5px}' +
  '#ccowork-chat-msgs{max-height:210px;overflow-y:auto;background:rgba(10,15,30,.6);border:1px solid rgba(120,160,220,.22);border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:7px;margin-bottom:8px}' +
  '#ccowork-chat-msgs::-webkit-scrollbar{width:5px}' +
  '#ccowork-chat-msgs::-webkit-scrollbar-thumb{background:#2a3b5e;border-radius:4px}' +
  '.ccowork-cmsg{font-size:11.5px;line-height:1.65;max-width:96%;padding:7px 10px;border-radius:11px;overflow-wrap:break-word;word-break:break-word}' +
  '.ccowork-cmsg.user{align-self:flex-end;background:linear-gradient(120deg,#38bdf8,#818cf8);color:#fff;border-bottom-right-radius:4px}' +
  '.ccowork-cmsg.ai{align-self:flex-start;background:rgba(25,34,60,.85);color:#c6d2ea;border:1px solid rgba(120,160,220,.18);border-bottom-left-radius:4px}' +
  '.ccowork-cmsg pre{background:#05070f;border-radius:8px;padding:8px;overflow-x:auto;font-size:10.5px;margin:4px 0}' +
  '.ccowork-cmsg code{background:rgba(94,234,212,.12);border-radius:4px;padding:0 5px;font-size:10.5px;color:#5eead4}' +
  '.ccowork-cmsg .ccw-h{display:block;font-size:12px;margin:4px 0 2px}' +
  '.ccowork-cmsg .ccw-li{display:block;padding-left:4px}' +
  '.ccowork-cmsg .ccw-typing{color:#8fa3bd}' +
  '.ccowork-cmsg img{display:block;margin-top:4px}' +
  '.ccowork-chat-row{display:flex;gap:6px}' +
  '#ccowork-chat-input{flex:1;background:rgba(10,15,30,.9);border:1px solid rgba(120,160,220,.28);color:#e9f0fb;border-radius:10px;padding:9px 12px;font-size:12.5px;outline:none;font-family:inherit;transition:.2s;min-width:0}' +
  '#ccowork-chat-input:focus{border-color:rgba(94,234,212,.5);box-shadow:0 0 0 3px rgba(94,234,212,.12)}' +
  '#ccowork-chat-input::placeholder{color:#64748b}' +
  '#ccowork-chat-send{flex-shrink:0;background:var(--ccw-grad,linear-gradient(120deg,#38bdf8,#818cf8));color:#fff;border:none;border-radius:10px;padding:0 15px;font-size:12.5px;font-weight:700;cursor:pointer;transition:.2s;font-family:inherit}' +
  '#ccowork-chat-send:hover{filter:brightness(1.1)}' +
  'body[data-theme="cloud"] #ccowork-chat-msgs{background:rgba(240,248,255,.75)!important;border-color:rgba(90,140,190,.22)!important}' +
  'body[data-theme="cloud"] .ccowork-cmsg.ai{background:#fff!important;color:#334155!important;border-color:rgba(90,140,190,.25)!important}' +
  'body[data-theme="cloud"] .ccowork-cmsg code{color:#1d4ed8!important}' +
  'body[data-theme="cloud"] #ccowork-chat-input{background:#fff!important;border-color:rgba(90,140,190,.3)!important;color:#1e293b!important}' +
  'body[data-theme="cloud"] #ccowork-chat-input::placeholder{color:#94a3b8!important}' +
  'body[data-theme="cloud"] #ccowork-session-title{color:#475569}' +
  'body[data-theme="cloud"] .ccw-sess-btn{background:rgba(90,140,190,.08);border-color:rgba(90,140,190,.2);color:#475569}' +
  'body[data-theme="cloud"] .ccw-sess-btn:hover{background:rgba(59,130,246,.12);border-color:rgba(59,130,246,.35);color:#1d4ed8}' +
  'body[data-theme="cloud"] #ccowork-sess-menu{background:rgba(255,255,255,.98);border-color:rgba(90,140,190,.2)}' +
  'body[data-theme="cloud"] #ccowork-sess-menu .sess-item:hover{background:rgba(59,130,246,.08)}' +
  'body[data-theme="cloud"] #ccowork-sess-menu .sess-item .sname{color:#1e293b}' +
  'body[data-theme="cloud"] #ccowork-sess-menu .sess-item .st{color:#64748b}' +
  '#ccowork-grid a{display:flex;flex-direction:column;align-items:center;gap:5px;padding:12px 6px;border-radius:13px;' +
    'text-decoration:none;color:#e9f0fb;background:rgba(19,26,45,.6);border:1px solid rgba(120,160,220,.16);transition:.22s}' +
  '#ccowork-grid a:hover{transform:translateY(-2px);border-color:rgba(94,234,212,.45);background:rgba(25,34,60,.8)}' +
  '#ccowork-grid .ic{font-size:24px}' +
  '#ccowork-grid .nm{font-size:12px;color:#c6d2ea}' +
  '#ccowork-skills{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}' +
  '#ccowork-skills button{flex:1;min-width:72px;border:1px solid rgba(120,160,220,.22);background:rgba(19,26,45,.6);color:#c6d2ea;' +
    'border-radius:9px;padding:7px 4px;font-size:11.5px;cursor:pointer;transition:.2s;font-family:inherit}' +
  '#ccowork-skills button:hover{border-color:rgba(240,185,92,.55);color:#f0b95c;transform:translateY(-1px)}' +
  '#ccowork-voice{margin-top:10px;display:flex;gap:8px}' +
  '#ccowork-voice button{flex:1;border:1px solid rgba(120,160,220,.25);background:rgba(19,26,45,.6);color:#c6d2ea;' +
    'border-radius:10px;padding:9px 0;font-size:12.5px;cursor:pointer;transition:.2s;font-family:inherit}' +
  '#ccowork-voice button:hover{border-color:rgba(240,185,92,.5);color:#f0b95c}' +
  '#ccowork-asr{display:none;margin-top:8px;background:rgba(13,19,32,.9);border:1px solid rgba(94,234,212,.3);border-radius:10px;' +
    'padding:10px 12px;font-size:12.5px;color:#e9f0fb;line-height:1.6}' +
  '#ccowork-asr.show{display:block}' +
  '#ccowork-close{position:absolute;top:10px;right:12px;background:none;border:none;color:#8fa3bd;font-size:17px;cursor:pointer}' +
  '#ccowork-close:hover{color:#fff}' +
  '@media(max-width:640px){#ccowork-pet{right:12px;bottom:12px;width:54px;height:54px;font-size:26px}#ccowork-panel{right:12px;bottom:80px}}' +
  /* ---- 白驹主题：面板白化 ---- */
  'body[data-theme="cloud"] #ccowork-panel{background:rgba(255,255,255,.94)!important;border-color:rgba(90,140,190,.3)!important;box-shadow:0 24px 70px rgba(37,99,235,.18)!important;color:#1e293b!important}' +
  'body[data-theme="cloud"] #ccowork-panel h3{background:linear-gradient(120deg,#0ea5e9,#6366f1,#d946ef);-webkit-background-clip:text;background-clip:text;color:transparent!important}' +
  'body[data-theme="cloud"] #ccowork-panel .sub{color:#64748b!important}' +
  'body[data-theme="cloud"] #ccowork-grid a{background:rgba(240,248,255,.75)!important;border-color:rgba(90,140,190,.2)!important;color:#1e293b!important}' +
  'body[data-theme="cloud"] #ccowork-grid a:hover{border-color:rgba(37,99,235,.5)!important;background:#fff!important}' +
  'body[data-theme="cloud"] #ccowork-grid .nm{color:#334155!important}' +
  'body[data-theme="cloud"] #ccowork-skills button{background:rgba(240,248,255,.75)!important;border-color:rgba(90,140,190,.25)!important;color:#334155!important}' +
  'body[data-theme="cloud"] #ccowork-skills button:hover{color:#b45309!important;border-color:#b45309!important}' +
  'body[data-theme="cloud"] #ccowork-voice button{background:rgba(240,248,255,.75)!important;border-color:rgba(90,140,190,.25)!important;color:#334155!important}' +
  'body[data-theme="cloud"] #ccowork-voice button:hover{color:#b45309!important;border-color:#b45309!important}' +
  'body[data-theme="cloud"] #ccowork-close{color:#64748b!important}' +
  'body[data-theme="cloud"] #ccowork-close:hover{color:#1e293b!important}' +
  'body[data-theme="cloud"] #ccowork-asr{background:#fff!important;border-color:rgba(37,99,235,.3)!important;color:#1e293b!important}' +
  '#ccowork-wave{height:30px;margin-top:8px}' +
  '#ccowork-news{margin-top:10px;border:1px solid rgba(120,160,220,.2);border-radius:12px;padding:10px 12px;background:rgba(13,19,32,.55)}' +
  '#ccowork-news .nt{font-size:12px;font-weight:700;color:#e9f0fb;display:flex;justify-content:space-between;align-items:center;margin-bottom:7px}' +
  '#ccowork-news .nt a{color:#f0b95c;font-size:10.5px;text-decoration:none}' +
  '#ccowork-news-list{display:flex;flex-direction:column;gap:6px}' +
  '#ccowork-news .nup{font-size:10px;color:#8fa3bd;margin-bottom:2px}' +
  '#ccowork-news .ni{display:flex;align-items:center;gap:7px;font-size:11.5px;color:#c6d2ea;text-decoration:none;line-height:1.45}' +
  '#ccowork-news .ni:hover{color:#5eead4}' +
  '#ccowork-news .ni .ntag{flex-shrink:0;font-size:9.5px;color:#03121a;background:linear-gradient(120deg,#5eead4,#38e1ff);border-radius:4px;padding:1px 6px;font-weight:700}' +
  '#ccowork-news .ni .ntx{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
  '#ccowork-news .ni em{flex-shrink:0;font-style:normal;font-size:9.5px;color:#64748b}' +
  '#ccowork-kb{margin-top:8px;border:1px solid rgba(120,160,220,.2);border-radius:12px;padding:10px 12px;background:rgba(13,19,32,.55)}' +
  '#ccowork-kb .nt{font-size:12px;font-weight:700;color:#e9f0fb;display:flex;justify-content:space-between;align-items:center;margin-bottom:7px}' +
  '#ccowork-kb .nt a{color:#f0b95c;font-size:10.5px;text-decoration:none}' +
  '#ccowork-kb-body{display:flex;flex-direction:column;gap:5px}' +
  '#ccowork-kb .kt{font-size:11px;color:#5eead4;font-weight:700}' +
  '#ccowork-kb .kix{font-size:11px;color:#c6d2ea;line-height:1.55}' +
  '#ccowork-kb .kip{font-size:10.5px;color:#8fa3bd;line-height:1.5;padding-left:8px;position:relative}' +
  '#ccowork-kb .kip::before{content:"";position:absolute;left:0;top:7px;width:4px;height:4px;border-radius:50%;background:#38e1ff}' +
  '#ccowork-kb .kit{font-size:10.5px;color:#f0b95c;line-height:1.5}' +
  '#ccowork-quote{margin-top:8px;font-size:11px;color:#8fa3bd;line-height:1.6;padding:8px 12px;border-left:3px solid rgba(240,185,92,.6);background:rgba(240,185,92,.06);border-radius:0 10px 10px 0}' +
  '#ccowork-quote-text{color:#c6d2ea;font-style:italic}' +
  '#ccowork-sess{margin-top:8px;border:1px solid rgba(120,160,220,.2);border-radius:12px;padding:10px 12px;background:rgba(13,19,32,.55)}' +
  '#ccowork-sess .nt{font-size:12px;font-weight:700;color:#e9f0fb;display:flex;justify-content:space-between;align-items:center;margin-bottom:7px}' +
  '#ccowork-sess .nt a{color:#f0b95c;font-size:10.5px;text-decoration:none}' +
  '#ccowork-sess-list{display:flex;flex-direction:column;gap:6px}' +
  '#ccowork-sess .ni{display:flex;align-items:center;gap:7px;font-size:11.5px;color:#c6d2ea;text-decoration:none;line-height:1.45}' +
  '#ccowork-sess .ni:hover{color:#5eead4}' +
  '#ccowork-sess .ni .ntag{flex-shrink:0;font-size:9.5px;color:#fff;background:linear-gradient(120deg,#8b5cf6,#5b8cff);border-radius:4px;padding:1px 6px;font-weight:700}' +
  '#ccowork-sess .ni .ntx{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
  '#ccowork-sess .ni em{flex-shrink:0;font-style:normal;font-size:9.5px;color:#64748b}' +
  'body[data-theme="cloud"] #ccowork-quote{color:#64748b!important;background:rgba(240,185,92,.08)!important}' +
  'body[data-theme="cloud"] #ccowork-quote-text{color:#1e293b!important}' +
  'body[data-theme="cloud"] #ccowork-kb{background:rgba(240,248,255,.7)!important;border-color:rgba(90,140,190,.2)!important}' +
  'body[data-theme="cloud"] #ccowork-kb .nt{color:#1e293b!important}' +
  'body[data-theme="cloud"] #ccowork-kb .nt a{color:#b45309!important}' +
  'body[data-theme="cloud"] #ccowork-kb .kt{color:#0e7490!important}' +
  'body[data-theme="cloud"] #ccowork-kb .kix{color:#334155!important}' +
  'body[data-theme="cloud"] #ccowork-kb .kip{color:#475569!important}' +
  'body[data-theme="cloud"] #ccowork-kb .kit{color:#b45309!important}' +
  'body[data-theme="cloud"] #ccowork-news{background:rgba(240,248,255,.7)!important;border-color:rgba(90,140,190,.2)!important}' +
  'body[data-theme="cloud"] #ccowork-news .nt{color:#1e293b!important}' +
  'body[data-theme="cloud"] #ccowork-news .nt a{color:#b45309!important}' +
  'body[data-theme="cloud"] #ccowork-news .ni{color:#334155!important}' +
  'body[data-theme="cloud"] #ccowork-news .ni:hover{color:#0891b2!important}' +
  'body[data-theme="cloud"] #ccowork-news .nup{color:#64748b!important}' +
  'body[data-theme="cloud"] #ccowork-sess{background:rgba(240,248,255,.7)!important;border-color:rgba(90,140,190,.2)!important}' +
  'body[data-theme="cloud"] #ccowork-sess .nt{color:#1e293b!important}' +
  'body[data-theme="cloud"] #ccowork-sess .nt a{color:#b45309!important}' +
  'body[data-theme="cloud"] #ccowork-sess .ni{color:#334155!important}' +
  'body[data-theme="cloud"] #ccowork-sess .ni:hover{color:#0891b2!important}'

  var style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)

  // ---------- 悬浮宠物 ----------
  C.pet = document.createElement('div')
  C.pet.id = 'ccowork-pet'
  C.pet.innerHTML = '<span class="cc-mark cc-pet-mark"></span><span class="eye l"></span><span class="eye r"></span><span class="mouth"></span>'
  C.pet.title = 'ccowork 工作台'
  document.body.appendChild(C.pet)

  // ---------- 工作台面板 ----------
  var LINKS = [
    ['layout-grid', '全能工作台', '/website/ccowork.html'],
    ['settings', '模型设置', '/website/settings.html'],
    ['bot', '全能智能体', '/website/agent.html'],
    ['message-circle', 'AI 对话', '/website/chat.html'],
    ['clapperboard', 'AI 漫剧', '/website/comic.html'],
    ['notebook-pen', '刷题', '/website/quiz.html'],
    ['file-text', '简历', '/website/resume.html'],
    ['calendar-days', '天气日历', '/website/weather.html'],
    ['newspaper', '每日新闻', '/website/news.html'],
    ['palette', 'AI 画廊', '/website/gallery.html'],
    ['library-big', '知识库', '/website/ecosystem.html']
  ]
  var SKILLS = [
    ['pen-line', '写作', '请帮我写一篇高质量中文文章（主题我来定）：'],
    ['globe', '翻译', '请把下面内容翻译成地道英文：'],
    ['table', '表格', '请用 Markdown 表格整理：'],
    ['list-checks', '总结', '请用要点式总结下面的内容：'],
    ['code', '代码', '请帮我写代码/调试：'],
    ['megaphone', '营销', '请帮我写一条有吸引力的营销文案：']
  ]
  C.panel = document.createElement('div')
  C.panel.id = 'ccowork-panel'
  C.panel.innerHTML =
    '<button id="ccowork-close" type="button"><i class="cc-ic" data-ic="x" aria-hidden="true"></i></button>' +
    '<h3><i class="cc-mark" aria-hidden="true"></i> ccowork</h3>' +
    '<div class="sub">AI 全能工作台 · 面板内直接对话 · 生文生图都有</div>' +
    '<div id="ccowork-chat">' +
      '<div id="ccowork-session-bar">' +
        '<div id="ccowork-session-title"><b>新会话</b></div>' +
        '<button class="ccw-sess-btn" id="ccowork-new-sess" type="button" title="新建会话"><i class="cc-ic" data-ic="plus" aria-hidden="true"></i> 新会话</button>' +
        '<button class="ccw-sess-btn" id="ccowork-sess-history" type="button" title="历史会话"><i class="cc-ic" data-ic="history" aria-hidden="true"></i></button>' +
      '</div>' +
      '<div id="ccowork-chat-msgs"><div class="ccowork-cmsg ai">你好，我是 ccowork 智能体 <i class="cc-ic" data-ic="sparkles" aria-hidden="true"></i> 直接在下方输入问题即可（试试：<b>生图:一只赛博猫咪</b>）</div></div>' +
      '<div class="ccowork-chat-row">' +
        '<input id="ccowork-chat-input" type="text" placeholder="问 AI 任何问题，回车发送…" autocomplete="off">' +
        '<button id="ccowork-chat-send" type="button"><i class="cc-ic" data-ic="send" aria-hidden="true"></i> 发送</button>' +
      '</div>' +
    '</div>' +
    '<div id="ccowork-grid">' + LINKS.map(function (l) {
      return '<a href="' + l[2] + '"><span class="ic"><i class="cc-ic" data-ic="' + l[0] + '" aria-hidden="true"></i></span><span class="nm">' + l[1] + '</span></a>'
    }).join('') + '</div>' +
    '<div id="ccowork-skills">' + SKILLS.map(function (s) {
      return '<button type="button" data-sk="' + s[2] + '" data-nm="' + s[1] + '"><i class="cc-ic" data-ic="' + s[0] + '" aria-hidden="true"></i> ' + s[1] + '</button>'
    }).join('') + '</div>' +
    '<div id="ccowork-wave" class="ccw-wave"></div>' +
    '<div id="ccowork-voice">' +
      '<button id="ccowork-mic" type="button"><i class="cc-ic" data-ic="mic" aria-hidden="true"></i> 语音输入</button>' +
      '<button id="ccowork-speak" type="button"><i class="cc-ic" data-ic="volume-2" aria-hidden="true"></i> 朗读本页</button>' +
    '</div>' +
    '<div id="ccowork-asr"></div>' +
    '<div id="ccowork-sess">' +
      '<div class="nt"><i class="cc-ic" data-ic="history" aria-hidden="true"></i> 最近会话 <a href="/website/agent.html">智能体 →</a></div>' +
      '<div id="ccowork-sess-list">加载中…</div>' +
    '</div>' +
    '<div id="ccowork-news">' +
      '<div class="nt"><i class="cc-ic" data-ic="newspaper" aria-hidden="true"></i> 今日新闻 <a href="/website/news.html">全部 →</a></div>' +
      '<div id="ccowork-news-list">加载中…</div>' +
    '</div>' +
    '<div id="ccowork-kb">' +
      '<div class="nt"><i class="cc-ic" data-ic="lightbulb" aria-hidden="true"></i> 知识卡片 <a href="/website/ecosystem.html">知识库 →</a></div>' +
      '<div id="ccowork-kb-body">加载中…</div>' +
    '</div>' +
    '<div id="ccowork-quote"><i class="cc-ic" data-ic="pin" aria-hidden="true"></i> 今日一言 · <span id="ccowork-quote-text"></span></div>'
  document.body.appendChild(C.panel)

  // ---------- 悬浮窗 AI 对话（面板内直接聊 · 生文+生图） ----------
  var chatInput = document.getElementById('ccowork-chat-input')
  var chatSend = document.getElementById('ccowork-chat-send')
  var chatBox = document.getElementById('ccowork-chat-msgs')
  var chatHistory = []
  var chatBusy = false
  // ---------- 会话持久化（ccowork.sessions.v1 与 agent.html 互通） ----------
  var SESS_KEY = 'ccowork.sessions.v1'
  var sessions = []          // [{id, title, time, msgs:[{role,content}]}]
  var curSession = null      // 当前会话对象引用
  function loadSessData(){
    try{
      var raw = localStorage.getItem(SESS_KEY)
      if(raw) sessions = JSON.parse(raw)
      if(!Array.isArray(sessions)) sessions = []
    }catch(e){ sessions = [] }
  }
  function saveSessData(){
    try{ localStorage.setItem(SESS_KEY, JSON.stringify(sessions.slice(0, 50))) }catch(e){}
  }
  function sessTitleOf(s){
    var msgs = s.msgs || []
    for(var i=0;i<msgs.length;i++){
      var c = String(msgs[i].content || '')
      if(msgs[i].role === 'user' && c){ return c.replace(/\s+/g,' ').trim().slice(0,20) }
    }
    return '新会话'
  }
  function updateSessTitleUI(){
    var el = document.getElementById('ccowork-session-title')
    if(!el) return
    var t = curSession ? sessTitleOf(curSession) : '新会话'
    el.innerHTML = '<b>' + esc(t) + '</b>'
  }
  function createSession(){
    var s = { id: 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
      title: '', time: Date.now(), msgs: [] }
    sessions.unshift(s)
    saveSessData()
    return s
  }
  function switchSession(sid){
    var s = null
    for(var i=0;i<sessions.length;i++){ if(sessions[i].id === sid){ s = sessions[i]; break } }
    if(!s) return
    curSession = s
    // 重新渲染消息列表
    chatBox.innerHTML = ''
    var msgs = s.msgs || []
    if(!msgs.length){
      chatBox.innerHTML = '<div class="ccowork-cmsg ai">你好，我是 ccowork 智能体 <i class="cc-ic" data-ic="sparkles" aria-hidden="true"></i> 直接在下方输入问题即可（试试：<b>生图:一只赛博猫咪</b>）</div>'
    } else {
      for(var i=0;i<msgs.length;i++){
        var m = msgs[i]
        if(m.role === 'user') chatAdd('user', esc(m.content))
        else if(m.role === 'assistant') chatAdd('ai', mdSimple(m.content))
      }
    }
    chatHistory = msgs.slice(-8)
    updateSessTitleUI()
  }
  function appendMsgToSession(role, content){
    if(!curSession) curSession = createSession()
    curSession.msgs.push({ role: role, content: content })
    curSession.time = Date.now()
    // 移到最前
    var idx = sessions.indexOf(curSession)
    if(idx > 0){ sessions.splice(idx, 1); sessions.unshift(curSession) }
    saveSessData()
    updateSessTitleUI()
  }
  function deleteSession(sid){
    sessions = sessions.filter(function(s){ return s.id !== sid })
    if(curSession && curSession.id === sid){
      curSession = sessions[0] || null
      if(curSession){ switchSession(curSession.id) }
      else { chatBox.innerHTML = '<div class="ccowork-cmsg ai">你好，我是 ccowork 智能体 <i class="cc-ic" data-ic="sparkles" aria-hidden="true"></i> 直接在下方输入问题即可（试试：<b>生图:一只赛博猫咪</b>）</div>'; chatHistory = []; updateSessTitleUI() }
    }
    saveSessData()
  }
  var _sessMenu = null
  function closeSessMenu(){ if(_sessMenu){ _sessMenu.remove(); _sessMenu = null } }
  function toggleSessMenu(btn){
    if(_sessMenu){ closeSessMenu(); return }
    loadSessData()
    var menu = document.createElement('div')
    menu.id = 'ccowork-sess-menu'
    if(!sessions.length){
      menu.innerHTML = '<div class="sess-empty">暂无历史会话<br><small>发一条消息自动保存</small></div>'
    } else {
      menu.innerHTML = sessions.map(function(s){
        var active = (curSession && curSession.id === s.id) ? ' active' : ''
        var t = sessTitleOf(s)
        var n = (s.msgs||[]).length + ' 条'
        return '<div class="sess-item' + active + '" data-id="' + s.id + '">' +
          '<div class="s-left"><span class="sname">' + esc(t) + '</span><span class="st">' + n + ' · ' + new Date(s.time).toLocaleDateString() + '</span></div>' +
          '<span class="sdel" data-del="' + s.id + '" title="删除"><i class="cc-ic" data-ic="x" aria-hidden="true"></i></span></div>'
      }).join('')
    }
    document.body.appendChild(menu)
    // 定位到按钮旁边
    var rect = btn.getBoundingClientRect()
    menu.style.bottom = (window.innerHeight - rect.top + 4) + 'px'
    menu.style.right = (window.innerWidth - rect.right) + 'px'
    _sessMenu = menu
    // 事件
    menu.addEventListener('click', function(e){
      var del = e.target.closest('[data-del]')
      if(del){ e.stopPropagation(); deleteSession(del.getAttribute('data-del')); toggleSessMenu(btn); toggleSessMenu(btn); return }
      var item = e.target.closest('.sess-item')
      if(item){ var sid = item.getAttribute('data-id'); switchSession(sid); closeSessMenu() }
    })
    setTimeout(function(){
      document.addEventListener('click', function outside(ev){
        if(!menu.contains(ev.target) && ev.target !== btn){ closeSessMenu(); document.removeEventListener('click', outside) }
      })
    }, 0)
  }
  var CC = window.CC || (window.CC = (function(){ var K={}; try{ K = JSON.parse(localStorage.getItem('ccowork.keys')||'{}')||{} }catch(e){} return { get:function(p){return K[p]||''}, set:function(p,v){K[p]=v||''; try{localStorage.setItem('ccowork.keys',JSON.stringify(K))}catch(e){}} }; })())
  function esc(s){ return String(s||'').replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] }) }
  function mdSimple(md){
    var s = esc(md)
    s = s.replace(/```([\s\S]*?)```/g, '<pre>$1</pre>')
    s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>')
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>')
    s = s.replace(/^### (.+)$/gm, '<b class="ccw-h">$1</b>').replace(/^## (.+)$/gm, '<b class="ccw-h">$1</b>').replace(/^# (.+)$/gm, '<b class="ccw-h">$1</b>')
    s = s.replace(/^[-*] (.+)$/gm, '<span class="ccw-li">• $1</span>')
    s = s.replace(/\n/g, '<br>')
    return s
  }
  function chatAdd(role, html){
    var d = document.createElement('div')
    d.className = 'ccowork-cmsg ' + role
    d.innerHTML = html
    chatBox.appendChild(d)
    chatBox.scrollTop = chatBox.scrollHeight
    return d
  }
  function ccwProxy(){
    // 纯静态部署（无后端）→ 浏览器直连（用本地/部署默认 Key）；仅当真有后端（window.__BJ_HAS_BACKEND=true）才走服务端代理
    if(location.protocol !== 'http:' && location.protocol !== 'https:') return ''
    return (window.__BJ_HAS_BACKEND) ? location.origin : ''
  }
  function ccwChat(messages){
    var url = 'https://api.deepseek.com/chat/completions'
    var body = { model:'deepseek-chat', messages: messages, stream:false, max_tokens:800, max_completion_tokens:800 }
    var pb = ccwProxy()
    if(pb){
      return fetch(pb + '/api/proxy', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ url:url, body:body, auth:CC.get('deepseek') }) })
        .then(function(r){ if(!r.ok) throw new Error('代理 HTTP '+r.status); return r.json() })
    }
    var h = { 'Content-Type':'application/json', 'Authorization':'Bearer '+CC.get('deepseek'), 'api-key':CC.get('deepseek') }
    return fetch(url, { method:'POST', headers:h, body: JSON.stringify(body) }).then(function(r){ return r.json() })
  }
  function ccwGenImage(prompt){
    var url = 'https://ark.cn-beijing.volces.com/api/v3/images/generations'
    var body = { model:'doubao-seedream-5-0-260128', prompt:prompt, size:'1K', watermark:false, response_format:'url' }
    var pb = ccwProxy()
    if(pb){
      return fetch(pb + '/api/proxy', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ url:url, body:body, auth:CC.get('ark') }) })
        .then(function(r){ return r.json() })
    }
    var h = { 'Content-Type':'application/json', 'Authorization':'Bearer '+CC.get('ark'), 'api-key':CC.get('ark') }
    return fetch(url, { method:'POST', headers:h, body: JSON.stringify(body) }).then(function(r){ return r.json() })
  }
  function chatSendNow(){
    var v = chatInput.value.trim()
    if(!v || chatBusy) return
    chatInput.value = ''
    // 生图命令：生图:xxx
    var imgMatch = v.match(/^生图[:：]\s*(.+)$/)
    if(imgMatch){
      chatAdd('user', '<i class="cc-ic" data-ic="palette" aria-hidden="true"></i> 生图：' + esc(imgMatch[1]))
      appendMsgToSession('user', '生图：' + imgMatch[1])
      var waitImg = chatAdd('ai', '<span class="ccw-typing"><i class="cc-ic" data-ic="palette" aria-hidden="true"></i> 正在生成图片…（约 10-20 秒）</span>')
      chatBusy = true
      ccwGenImage(imgMatch[1]).then(function(d){
        var u = d && d.data && d.data[0] && (d.data[0].url || '')
        if(u){ waitImg.innerHTML = '<img src="' + u + '" alt="AI生成图" style="width:100%;border-radius:10px">'; appendMsgToSession('assistant', '[图片] ' + u) }
        else{ waitImg.innerHTML = '<i class="cc-ic" data-ic="triangle-alert" aria-hidden="true"></i> 生图失败：' + esc(JSON.stringify(d).slice(0,120)); appendMsgToSession('assistant', '生图失败') }
      }).catch(function(err){
        waitImg.innerHTML = '<i class="cc-ic" data-ic="triangle-alert" aria-hidden="true"></i> 生图失败：' + esc(err && err.message || err) + '<br><small>云端直连方舟可能被拦截，本地运行 node server.mjs 后访问 http://localhost:8787 可生图</small>'
        appendMsgToSession('assistant', '生图失败：' + (err && err.message || err))
      }).then(function(){ chatBusy = false })
      return
    }
    chatAdd('user', esc(v))
    chatHistory.push({ role:'user', content:v })
    appendMsgToSession('user', v)
    if(chatHistory.length > 8) chatHistory = chatHistory.slice(-8)
    var wait = chatAdd('ai', '<span class="ccw-typing">思考中…</span>')
    chatBusy = true
    ccwChat([{ role:'system', content:'你是 ccowork 智能体，回答简洁实用，中文，可用粗体/列表。' }].concat(chatHistory))
      .then(function(d){
        var t = d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content
        if(!t) throw new Error(JSON.stringify(d).slice(0,120))
        wait.innerHTML = mdSimple(t)
        chatHistory.push({ role:'assistant', content:t })
        appendMsgToSession('assistant', t)
        if(chatHistory.length > 8) chatHistory = chatHistory.slice(-8)
      })
      .catch(function(err){
        wait.innerHTML = '<i class="cc-ic" data-ic="triangle-alert" aria-hidden="true"></i> ' + esc(err && err.message || err)
        appendMsgToSession('assistant', '错误：' + (err && err.message || err))
      })
      .then(function(){ chatBusy = false })
  }
  // 页面存在对话输入框才绑定事件（书页等无聊天面板的页面不抛错）
  if (chatSend && chatInput) {
    chatSend.addEventListener('click', chatSendNow)
    chatInput.addEventListener('keydown', function(e){ if(e.key === 'Enter') chatSendNow() })
    // 新会话按钮
    var newSessBtn = document.getElementById('ccowork-new-sess')
    if(newSessBtn){
      newSessBtn.addEventListener('click', function(){
        curSession = createSession()
        chatBox.innerHTML = '<div class="ccowork-cmsg ai">你好，我是 ccowork 智能体 <i class="cc-ic" data-ic="sparkles" aria-hidden="true"></i> 直接在下方输入问题即可（试试：<b>生图:一只赛博猫咪</b>）</div>'
        chatHistory = []
        updateSessTitleUI()
      })
    }
    // 历史会话按钮
    var histBtn = document.getElementById('ccowork-sess-history')
    if(histBtn){
      histBtn.addEventListener('click', function(e){ e.stopPropagation(); toggleSessMenu(this) })
    }
    // 初始化：加载最近会话（如果有）
    loadSessData()
    if(sessions.length && sessions[0].msgs && sessions[0].msgs.length){
      switchSession(sessions[0].id)
    }
  }

  // 外观设置（主题 / 壁纸 / 字体）已统一移交 module.js 的全局悬浮窗管理，
  // 通过顶部目录条 ⚙️ / 导航栏 ⚙️ / 常驻齿轮均可唤起，单一真源、全站记忆。

  // 知识卡片（每页可见 · 内置 32 模块实体知识 · 随机一条）
  (function loadKB(){
    try{
      var ks = document.createElement('script');
      ks.src = base + 'data/knowledge.js';
      ks.onload = function(){
        var body = document.getElementById('ccowork-kb-body');
        if(!body) return;
        var K = window.KNOWLEDGE || {};
        var names = Object.keys(K);
        if(!names.length){ body.innerHTML = '<span class="ki">知识库加载中…</span>'; return; }
        var name = names[Math.floor(Math.random()*names.length)];
        var k = K[name];
        var pts = (k.points || []).slice(0, 2);
        var html = '<b class="kt">' + name + ' · 导读</b>';
        if(k.intro) html += '<span class="kix">' + (k.intro.length > 90 ? k.intro.slice(0, 90) + '…' : k.intro) + '</span>';
        if(pts.length) html += pts.map(function(p){ return '<span class="kip">• ' + p + '</span>'; }).join('');
        if(k.tips) html += '<span class="kit"><i class="cc-ic" data-ic="lightbulb" aria-hidden="true"></i> ' + (k.tips.length > 60 ? k.tips.slice(0, 60) + '…' : k.tips) + '</span>';
        body.innerHTML = html;
      };
      ks.onerror = function(){ var b = document.getElementById('ccowork-kb-body'); if(b) b.innerHTML = '<span class="ki">知识卡片加载失败</span>'; };
      document.head.appendChild(ks);
    }catch(e){}
  })();

  // ---------- 今日一言（按日期轮换 · 每天不同） ----------
  (function loadQuote(){
    var QUOTES = [
      'AI 不会取代你，会用 AI 的人才会取代你。',
      '把重复交给机器，把创造留给自己。',
      '提示词是新时代的敲门砖，问对问题比答案更重要。',
      '学习 AI 最好的方式：今天就让它帮你做一件小事。',
      '未来已来，只是分布不均——你现在的每个练习都在缩小差距。',
      '工具不会思考，但你可以用它思考得更远。',
      '模型会迭代，能力不归零：你掌握的思考方式才是资产。',
      '与其焦虑被替代，不如成为驾驭者。',
      '每天进步 1%，一年后是 37 倍。',
      '技术是杠杆，认知是支点。',
      '先完成，再完美——AI 时代尤其如此。',
      '输入决定输出：你喂给 AI 的问题质量 = 你的思考质量。',
      '跨界的灵感，往往来自把两个领域硬凑在一起。',
      '别怕试错，模型的 token 比你的时间便宜。',
      '把 AI 当同事，而不是工具——它会回报以惊喜。',
      '写作、绘画、编程，AI 让每个"不会"变成"可以学"。',
      '真正的稀缺能力：定义问题的能力。',
      '每一次使用 AI，都是一次思维的外包与升级。',
      '你不是在学工具，你是在学一个时代的语法。',
      '慢即是快：打好提示词的地基，高楼才稳。',
      '灵感 = 大量输入 × 偶然碰撞。',
      '让 AI 做你的第二大脑，但主脑永远是你自己。',
      '今天的实践，是明天的直觉。',
      'Be curious, not judgmental. 好奇而不评判。',
      'The best way to predict the future is to invent it.',
      '模仿是学习的起点，创造是学习的目的。',
      '不要问 AI 能做什么，问你想做什么。',
      '工具升级，思维也要升级——否则只是换了把更快的锤子。',
      '每天读一点，写一点，做一点，AI 时代没有怀才不遇。',
      '你与大师的差距，只差一万次刻意练习。'
    ];
    try{
      var dayIdx = Math.floor(Date.now() / 86400000);
      var q = QUOTES[dayIdx % QUOTES.length];
      var el = document.getElementById('ccowork-quote-text');
      if(el) el.textContent = q;
    }catch(e){}
  })();

  // 今日新闻（每页可见 · 真实资讯 · 每日更新）
  (function loadNews(){
    try{
      var ns = document.createElement('script');
      ns.src = base + 'data/news.js';
      ns.onload = function(){
        var list = document.getElementById('ccowork-news-list');
        if(!list) return;
        var NEWS = (window.NEWS || []).slice(0, 3);
        var up = window.NEWS_UPDATED || '';
        if(!NEWS.length){ list.innerHTML = '<span class="ni">暂无资讯</span>'; return; }
        list.innerHTML = (up ? '<span class="nup">更新于 ' + up + '</span>' : '') +
          NEWS.map(function(n){
            return '<a class="ni" href="/website/news.html" title="' + (n.desc||'') + '"><b class="ntag">' + (n.tag||'AI') + '</b><span class="ntx">' + (n.title||'') + '</span><em>' + (n.date||'') + '</em></a>';
          }).join('');
      };
      ns.onerror = function(){ var l = document.getElementById('ccowork-news-list'); if(l) l.innerHTML = '<span class="ni">资讯加载失败</span>'; };
      document.head.appendChild(ns);
    }catch(e){}
  })();

  // 声波条（GitHub 式声纹）：生成 28 根波形条
  // 防御式写法：waveEl 可能不存在（部分页面结构），且避免对字符串变量做函数调用类误判
  try {
    var waveEl = document.getElementById('ccowork-wave')
    if (waveEl) {
      var waveHTML = new Array(29).join('<i></i>')
      waveEl.innerHTML = waveHTML
    }
  } catch (waveErr) {}

  // 最近会话（每页可见 · 读取智能体 localStorage 会话 · 点击直达恢复）
  (function loadSess(){
    try{
      var list = document.getElementById('ccowork-sess-list');
      if(!list) return;
      var raw = '';
      try{ raw = localStorage.getItem('ccowork.sessions.v1'); }catch(e){}
      var sessions = [];
      if(raw){ try{ sessions = JSON.parse(raw); }catch(e){} }
      if(!Array.isArray(sessions) || !sessions.length){ list.innerHTML = '<span class="ni">暂无历史会话 · 在智能体页发一句即自动保存</span>'; return; }
      function titleOf(s){
        for(var i=0;i<(s.msgs||[]).length;i++){
          var c = String(s.msgs[i].content || '');
          if(s.msgs[i].role === 'user' && c){ return c.replace(/【上传文档[\s\S]*?】/g,'').replace(/\s+/g,' ').trim().slice(0,18); }
        }
        return '空会话';
      }
      list.innerHTML = sessions.slice(0,3).map(function(s){
        return '<a class="ni" href="/website/agent.html?session=' + encodeURIComponent(s.id) + '" title="点击恢复该会话">'
          + '<b class="ntag" style="background:#8b5cf6"><i class="cc-ic" data-ic="history" aria-hidden="true"></i></b><span class="ntx">' + (s.title || titleOf(s)).slice(0,20) + '</span><em>' + (s.msgs||[]).length + ' 条</em></a>';
      }).join('');
    }catch(e){}
  })();

  // ---------- 交互 ----------
  C.pet.addEventListener('click', function () {
    C.open = !C.open
    C.panel.classList.toggle('show', C.open)
  })
  document.getElementById('ccowork-close').addEventListener('click', function () {
    C.open = false
    C.panel.classList.remove('show')
  })

  // 声波条
  var waveEl = document.getElementById('ccowork-wave')
  function waveOn(){ waveEl.classList.add('live') }
  function waveOff(){ waveEl.classList.remove('live') }

  // 技能包：点击 → 打开智能体并带上技能提示词
  document.getElementById('ccowork-skills').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return
    var prefix = b.dataset.sk || ''
    var q = prompt('「' + b.dataset.nm + '」技能：请输入内容', '')
    if (q === null) return
    var ask = encodeURIComponent(prefix + (q || ''))
    window.open('/website/agent.html?ask=' + ask, '_blank')
  })

  // 语音输入（听写）+ 声波联动
  document.getElementById('ccowork-mic').addEventListener('click', function () {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition
    var box = document.getElementById('ccowork-asr')
    var btn = this
    if (!SR) { box.innerHTML = '<i class="cc-ic" data-ic="triangle-alert" aria-hidden="true"></i> 本浏览器不支持语音识别。请用 <b>Edge / Safari</b>，或直接在智能体/对话页<b>打字输入</b>。'; box.classList.add('show'); return }
    if (C.recog) {
      try { C.recog.stop() } catch (e) {}
      C.recog = null
      btn.innerHTML = '<i class="cc-ic" data-ic="mic" aria-hidden="true"></i> 语音输入'
      waveOff()
      return
    }
    var rec = new SR()
    rec.lang = 'zh-CN'
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = function (ev) {
      var t = (ev.results && ev.results[0] && ev.results[0][0]) ? ev.results[0][0].transcript : ''
      if (t) {
        box.innerHTML = '你说的是：「' + t + '」<br>👉 点击上方「<i class="cc-ic" data-ic="bot" aria-hidden="true"></i> 全能智能体」提问，或复制后去 AI 对话。'
        box.classList.add('show')
        try { navigator.clipboard.writeText(t) } catch (e) {}
      } else {
        box.innerHTML = '<i class="cc-ic" data-ic="triangle-alert" aria-hidden="true"></i> 没有识别到内容——请靠近麦克风再试；或直接打字输入。'
        box.classList.add('show')
      }
    }
    rec.onend = function () { C.recog = null; btn.innerHTML = '<i class="cc-ic" data-ic="mic" aria-hidden="true"></i> 语音输入'; waveOff() }
    rec.onerror = function (e) {
      C.recog = null; btn.innerHTML = '<i class="cc-ic" data-ic="mic" aria-hidden="true"></i> 语音输入'; waveOff()
      var err = e && e.error || ''
      var tip = { 'not-allowed': '麦克风权限被拒——点地址栏图标允许后再试', 'network': '识别服务连不上（Chrome 国内常受限，推荐 Edge/打字）', 'no-speech': '没听到声音，请靠近麦克风', 'audio-capture': '没找到麦克风设备' }[err]
      box.innerHTML = '<i class="cc-ic" data-ic="triangle-alert" aria-hidden="true"></i> ' + (tip || ('识别失败：' + err)) + '。也可直接打字输入。'
      box.classList.add('show')
    }
    C.recog = rec
    btn.innerHTML = '<i class="cc-ic" data-ic="square" aria-hidden="true"></i> 停止'
    box.innerHTML = '<i class="cc-ic" data-ic="mic" aria-hidden="true"></i> 正在聆听…（如果浏览器弹出麦克风授权，请点「允许」）'
    box.classList.add('show')
    waveOn()
    try { rec.start() } catch (e) {}
  })

  // 朗读本页 + 声波联动
  document.getElementById('ccowork-speak').addEventListener('click', function () {
    if (!('speechSynthesis' in window)) { alert('浏览器不支持语音合成'); return }
    var text = document.title + '。'
    var sel = window.getSelection && window.getSelection().toString()
    if (sel && sel.trim()) text = sel.trim()
    else {
      var body = document.body ? document.body.innerText || '' : ''
      text = text + body.slice(0, 800)
    }
    window.speechSynthesis.cancel()
    var u = new SpeechSynthesisUtterance(text)
    u.lang = 'zh-CN'
    u.rate = 1
    window.speechSynthesis.speak(u)
    var b = this
    b.innerHTML = '<i class="cc-ic" data-ic="square" aria-hidden="true"></i> 停止朗读'
    waveOn()
    var iv = setInterval(function () {
      if (!window.speechSynthesis.speaking) { b.innerHTML = '<i class="cc-ic" data-ic="volume-2" aria-hidden="true"></i> 朗读本页'; waveOff(); clearInterval(iv) }
    }, 500)
    b.onclick = function () {
      window.speechSynthesis.cancel()
      b.innerHTML = '<i class="cc-ic" data-ic="volume-2" aria-hidden="true"></i> 朗读本页'
      waveOff()
      clearInterval(iv)
    }
  })
})()
