/* ccowork · 全局悬浮工作台插件
 * 所有页面右下角悬浮小宠物（动画），点击展开 ccowork 工作台：
 * 智能体 / AI对话 / AI漫剧 / 语音 / 简历 / 刷题 / 天气 / 新闻 / 画廊 / 知识库
 * 用法：页面 <script src="/ccowork.js"></script>（根目录或各子目录均用绝对路径）
 */
(function () {
  'use strict'
  if (window.__ccowork) return
  window.__ccowork = true

  /* ---------- 朋友门锁 · 首帧预锁（2026-11-13） ----------
     这段必须在 head 解析阶段同步执行：页面里静态写死的「开始对话」按钮、
     编译模式区块会在 DOM 解析时立刻渲染，等 DOMContentLoaded 再注入 CSS
     会闪一下。这里先把状态标记和最小隐藏规则打上，完整门锁 UI 由
     assets/baiju-gate.js 在 DOM 就绪后接管。
     规则：本地预览自动放行；已解锁（30 天内）放行；其余一律先锁。 */
  ;(function prelock() {
    try {
      var forced = localStorage.getItem('baiju.gate.lock') === '1' ||
                   /[?&]gate=lock(?:[&#]|$)/.test(location.href)
      /* 2026-11-16 老罗拍板：GitHub Pages 公开版「内容全开、AI 交互入口全关」。
         旧版把整站 ok=true 导致悬浮助手/开始对话/对话页入口全露出，与发布态口径冲突。
         现在拆成两个开关：
           - ok（内容层）：公开版永远可见，不遮罩、不白屏；
           - noAI（交互层）：公开版隐藏 AI 悬浮窗 / CTA / 编译模式 / 对话入口。
         本地预览与内网仍自动放行全部功能（自己调试用）；?gate=lock 可强制模拟发布态。 */
      var isPreview = (function () {
        var h = location.hostname
        return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '' ||
          /^192\.168\./.test(h) || /^10\./.test(h) ||
          /^172\.(1[6-9]|2\d|3[01])\./.test(h)
      })()
      /* 公开版内容层永远 open（与 baiju-gate.js 的 isOpen()=true 同口径），不遮罩不白屏；
         只有显式 ?gate=lock 才在内容层标 locked 供调试观察（实际全站无 bj-gated-page 类，不会遮正文）。 */
      var ok = true
      var noAI = forced || !isPreview   /* 发布态（含公开版）一律关 AI 交互；本地/内网默认开 */
      try { if (localStorage.getItem('bj.preview.ai') === '1') noAI = false } catch (e) {}
      var root = document.documentElement
      root.setAttribute('data-gate', ok ? 'open' : 'locked')
      root.setAttribute('data-ai', noAI ? 'off' : 'on')
      /* AI 交互入口隐藏规则：发布态一律生效，与内容是否锁定无关。
         .bja-page-assist 是加在 body 上的类，绝不进隐藏清单，否则整页白屏。 */
      if (noAI) {
        var st = document.createElement('style')
        st.setAttribute('data-baiju-gate', 'prelock-ai')
        st.textContent =
          'html[data-ai="off"] .bja-fab,' +
          'html[data-ai="off"] .bja-panel,' +
          'html[data-ai="off"] .bja-root,' +
          'html[data-ai="off"] button.cta-tip,' +
          'html[data-ai="off"] .ob-open,' +
          'html[data-ai="off"] #compile,' +
          'html[data-ai="off"] .modebtn[data-mode="compile"],' +
          'html[data-ai="off"] [data-ai-entry],' +
          'html[data-ai="off"] .ai-entry,' +
          'html[data-ai="off"] .gate-hide,' +
          'html[data-ai="off"] [data-gate-hide]' +
          '{display:none !important}'
        ;(document.head || root).appendChild(st)
      }
      if (!ok && !noAI) {
        var st2 = document.createElement('style')
        st2.setAttribute('data-baiju-gate', 'prelock')
        st2.textContent =
          'html[data-gate="locked"] .bja-fab,' +
          'html[data-gate="locked"] .bja-panel,' +
          'html[data-gate="locked"] .bja-root,' +
          'html[data-gate="locked"] button.cta-tip,' +
          'html[data-gate="locked"] .ob-open,' +
          'html[data-gate="locked"] #compile,' +
          'html[data-gate="locked"] .modebtn[data-mode="compile"],' +
          'html[data-gate="locked"] .gate-hide,' +
          'html[data-gate="locked"] [data-gate-hide]' +
          '{display:none !important}'
        ;(document.head || root).appendChild(st2)
      }
    } catch (e) {}
  })()

  /* 页面把本脚本放在 <head> 时 document.body 还是 null，主体里有大量
     document.body.appendChild / getElementById 依赖，直接跑会抛错并让
     宠物与工作台整体失效。这里统一等到 DOM 就绪再执行主体。 */
  function init() {

  var C = {
    pet: null, panel: null, open: false, recog: null
  }

  // ---------- 白驹主题注入（云顶天空 · 全站统一白色） ----------
  try {
    var scr = document.currentScript || (function () { var s = document.getElementsByTagName('script'); return s[s.length - 1] })()
    /* ★ base 必须剥掉查询串再取目录。
       旧写法 src.replace(/[^/]*$/, '') 遇到 '/ccowork.js?v=20261125a' 会算出 '/?v=21'，
       导致后续所有 base+'xxx' 拼出 '/?v=21/xxx' 而 404。
       这次挂图标系统时实测暴露，按标准 URL 解析重写。 */
    var base = (function () {
      /* src 可能是 '/ccowork.js?v=20261125a'（要剥掉查询串），也可能拿不到
         （异步注入时 currentScript 为空、回退到的 elem 无 src）。
         拿不到时一律按根目录算：ccowork.js 是根级文件，旧写法算出 ''
         会让子目录页面去请求 /website/theme-cloud.css 之类，全是 404。 */
      try {
        if (scr && scr.src) return new URL(scr.src).pathname.replace(/[^/]*$/, '') || '/'
      } catch (e) {}
      return '/'
    })()
    /* 2026-10-28：统一资源指纹。手机端没法强制刷新，只要这里改了，
       下面所有注入的 CSS/JS 都会换 URL，浏览器必须重新下载。
       改任何 front-end 资源后，把 V 改一下即可。 */
    /* 2026-11-10：分站导航收编 + 窄屏阅读留白改了 site-nav.js / ccowork.js /
       site-redesign.css / siteframe.css。手机端无法强刷，换指纹强制取新资源。 */
    /* 2026-11-10 晚：全站统一层（brand-one.css / brand-one.js）——
       唯一助手、一套设置、正式品牌标识。换指纹让手机端也取到新资源。 */
    var V = '20261125a'   /* 2026-11-24 页脚公示 ICP 备案号 赣ICP备2026031925号；两侧指纹必须同步 */
    var q = function (f) { return base + f + '?v=' + V }

    /* 朋友门锁：状态层脚本尽早注入（CSS 由它自注入，避免重复 link）。
       async=false 保证它先于页面里 defer 的 baiju-assistant.js 完成判定。 */
    var sGate = document.createElement('script')
    sGate.src = q('assets/baiju-gate.js')
    sGate.async = false
    document.head.appendChild(sGate)

    /* 发布态唯一允许的交互：纯预设问答（点预设问题 → 预设答案 + 预设链接）。
       零输入框、零网络请求、零模型；AI 悬浮窗由门锁控制，未解锁不创建任何 DOM。 */
    try {
      var lQa = document.createElement('link')
      lQa.rel = 'stylesheet'
      lQa.href = q('assets/baiju-static-qa.css')
      document.head.appendChild(lQa)
      var sQa = document.createElement('script')
      sQa.src = q('assets/baiju-static-qa.js')
      sQa.async = false
      document.head.appendChild(sQa)
    } catch (e) {}

    var link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = q('theme-cloud.css')
    document.head.appendChild(link)
    // 全站设计系统组件层（毛玻璃导航 / 渐变 Hero / 品牌页脚 / 卡片按钮统一）
    var link2 = document.createElement('link')
    link2.rel = 'stylesheet'
    link2.href = q('site-redesign.css')
    document.head.appendChild(link2)
    // 工业美学层（工程图纸 × 精密仪表 · 全站追加）
    var link3 = document.createElement('link')
    link3.rel = 'stylesheet'
    link3.href = q('site-industrial.css')
    document.head.appendChild(link3)
    // 全站内核：角色导入 / 登录体系 / 评论与提醒 / 版心骨架
    try {
      var link4 = document.createElement('link')
      link4.rel = 'stylesheet'
      link4.href = q('assets/baiju-core.css')
      document.head.appendChild(link4)
      var s4 = document.createElement('script')
      s4.src = q('assets/baiju-core.js')
      s4.async = true
      document.head.appendChild(s4)
    } catch (e) {}

    /* 星云视觉皮肤层：放在最后加载，优先级最高。
       只做覆盖、不改上面那几个文件，出问题删掉这两行即可回到原样。 */
    try {
      var link5 = document.createElement('link')
      link5.rel = 'stylesheet'
      link5.href = q('nebula-skin.css')
      document.head.appendChild(link5)
      // 动效层：粒子背景 / 光标光晕 / 滚动视差 / 卡片微倾斜 / 点击音效
      var s5 = document.createElement('script')
      s5.src = q('nebula-fx.js')
      s5.async = true
      document.head.appendChild(s5)

      /* 3D 交互层：景深卡片 / 指针视差高光 / 弹簧回弹 / 3D 弹窗 / 触屏手势。
         自带设备分级与帧率守卫，低端设备自动降档。 */
      var link6 = document.createElement('link')
      link6.rel = 'stylesheet'
      link6.href = q('nebula-3d.css')
      document.head.appendChild(link6)
      var s6 = document.createElement('script')
      s6.src = q('nebula-3d.js')
      s6.async = true
      document.head.appendChild(s6)

      /* 统一规范层：必须最后加载。它把 theme-cloud / site-redesign / nebula-skin
         三套不一致的圆角与阴影收敛成一套，并统一胶囊与图标钮规格。
         放在这里是为了让它排在所有视觉层之后，后续调尺度只改这一个文件。 */
      var link7 = document.createElement('link')
      link7.rel = 'stylesheet'
      link7.href = q('design-norms.css')
      document.head.appendChild(link7)

      /* 内容时效与出处层：读 /data/content-cite.json，按路径给书稿/教程/博文
         自动挂「核验至 YYYY-MM-DD · 出处 N 条」徽章与底部参考来源区。
         数据里没登记的页面静默不渲染，不会出现空壳。 */
      var s7 = document.createElement('script')
      s7.src = q('content-cite.js')
      s7.async = true
      document.head.appendChild(s7)
    } catch (e) {}

    /* 分站页（历史由 inject-siteframe.py 注入 .ccbar 的那批，170 页）只引了
       本文件，没有全站导航，只能靠那条 34px 老细栏「← 回总站」认路。
       检测到老框架条且尚未引入 site-nav.js 时补上，让双层导航、当前域高亮、
       分区条与面包屑在这些页面同样生效 —— 全站一套导航（BRAND.md §6.1）。
       条件写窄：绝不替本来就有导航的页面再叠一套。 */
    try {
      var navRoot = (typeof base !== 'undefined' && base) ? base : '/'
      if (document.querySelector('.ccbar') &&
          !document.querySelector('script[src*="site-nav.js"]') &&
          !document.querySelector('header.ccnav')) {
        /* site-nav.js 的导航与统一页脚样式都在 site-nav.css 里。
           分站页原本没有 link 它，实测 390px 下 .ccfoot-in 左右 0px 贴边，
           所以补载脚本的同时必须补样式，缺一不可。 */
        if (!document.querySelector('link[href*="site-nav.css"]')) {
          var lNav = document.createElement('link')
          lNav.rel = 'stylesheet'
          lNav.href = navRoot + 'site-nav.css?v=' + V
          document.head.appendChild(lNav)
        }
        var sNav = document.createElement('script')
        sNav.src = navRoot + 'site-nav.js?v=' + V
        sNav.async = false
        document.head.appendChild(sNav)
      }
    } catch (e) {}

    
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

    /* 2026-11-10：全站统一层 —— 唯一助手 + 一套设置 + 正式品牌标识。
       535 页都引本文件，在这里注入一次即可，不逐页改 HTML。
       brand-one.js 会把旧的三套面板收编，并把正式商标注入所有标识位。 */
    if (!document.querySelector('link[href*="brand-one.css"]')) {
      var lOne = document.createElement('link')
      lOne.rel = 'stylesheet'
      lOne.href = q('brand-one.css')
      document.head.appendChild(lOne)
    }
    if (!document.querySelector('script[src*="brand-one.js"]')) {
      var sOne = document.createElement('script')
      sOne.src = q('brand-one.js')
      sOne.async = false
      document.head.appendChild(sOne)
    }
  } catch (e) {}
  try {
    if (!document.body.getAttribute('data-theme')) {
      var savedTheme = ''
      try { savedTheme = localStorage.getItem('ccowork.theme') || '' } catch (e) {}
      /* 品牌细节兼容：首次访问没有本地偏好时跟随系统 prefers-color-scheme。
         否则系统深色用户会先看到浅色 LOGO / 浅色面板，再被脚本切走（闪白），
         在脚本未执行或加载失败时更是永久停留在错误的浅色版标识。 */
      var sysTheme = 'cloud'
      try {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) sysTheme = 'deep'
      } catch (e) {}
      document.body.setAttribute('data-theme', savedTheme || sysTheme)
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
        div.style.cssText = 'text-align:center;padding:20px 24px 28px;color:#64748b;font-size:13px;line-height:1.9';
        document.body.appendChild(div);
      }
    }catch(e){}
  })();

  // ---------- 全站统一品牌页脚（设计系统组件层） ----------
  // 检测到页面 footer 缺失/过简时，注入品牌列+多列链接的完整页脚。
  // 2026-11-09 运营层收口：新架构页面自带 footer.ccfoot / footer.ccfoot-s，
  // 旧跳过名单没覆盖它们，导致同一页叠出两套页脚（重复品牌区 + 大片空白）。
  // 这里把两套自带页脚一并纳入跳过名单，页脚只保留单一真源。
  (function siteFooter(){
    try{
      if (document.querySelector('.site-footer, .ccw-footer, .foot-inner, footer.ccfoot, footer.ccfoot-s')) return;
      var FOOT_HTML =
        '<footer class="site-footer">' +
          '<div class="foot-inner">' +
            '<div class="foot-brand">' +
              '<div class="logo-row"><span class="logo"><i class="cc-mark" aria-hidden="true"></i></span><b>白驹 ccowork</b></div>' +
              '<p>把散落的 AI 工具装进一个大脑：模型 · 学习 · 工具 · 作品 · 关于，五个域持续更新。门户、对话、创作、仿真，本地优先，开箱即用。</p>' +
            '</div>' +
            /* 2026-11-09 运营层收口：切断 16 条 /website/* 旧架构导航，
               统一收敛到 site-nav.js 的五域入口，避免页脚把用户带回旧内容。 */
            '<div class="foot-col"><b>内容域</b>' +
              '<a href="/models/">模型</a>' +
              '<a href="/learn/">学习</a>' +
              '<a href="/toolbox/">工具</a>' +
              '<a href="/works/projects.html">作品</a>' +
            '</div>' +
            '<div class="foot-col"><b>站点</b>' +
              '<a href="/about/index.html">关于</a>' +
              '<a href="/feed/">前沿流</a>' +
              '<a href="/blog/">博客</a>' +
              '<a href="/index.html">首页</a>' +
            '</div>' +
          '</div>' +
          '<div class="foot-bar">' +
            '<span>© 2026 白驹 ccowork</span>' +
            '<span>MIT License · 内容取自站内实际数据</span>' +
            '<span class="foot-legal">本站为个人学习与展示用途，AI 对话由站内服务端代理转发，密钥不下发到浏览器。 · ICP备案号：赣ICP备2026031925号</span>' +
          '</div>' +
        '</footer>';
      var oldFoot = document.querySelector('footer');
      /* 原页脚里带 id 的节点往往被本页 JS 引用（实测 ai-ecosystem 的 #footBrand、
         #footDate 被替换后 boot() 抛错，整个厂商库/地图/筛选都不渲染）。
         这种页脚一律不替换，宁可少一处美化，也不能让功能挂掉。 */
      var hasManaged = !!(oldFoot && oldFoot.querySelector('[id]'));
      if (oldFoot && hasManaged) return;
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

  /* ---------- ICP 备案号全站兜底公示（2026-11-24 立） ----------
     赣ICP备2026031925号 已下证，属于法定公示信息，必须每个公开页可见。
     上面的 siteFooter 检测到页面自带 footer（footer.ccfoot / .site-footer 等）会直接 return，
     不再注入品牌页脚 —— 实测首页 /models/ /about/changelog.html 等 500+ 页因此看不到备案号。
     这里独立兜底：只要整页文本里还没有这个号，就往该页最后一个 footer 末尾补一条 .foot-legal。
     幂等：先查 body 文本，已存在即跳过；load 后再补一次，兼容 JS 后渲染的页脚。 */
  (function ensureICP(){
    var ICP = '赣ICP备2026031925号'
    /* 2026-11-25 加强（老罗："备案号一点都不明显"）：
       原来是 12px + opacity .72 的灰小字，几乎看不见。
       现在改成独立法务条 + 蓝色胶囊徽章（带边框、加粗、可点进工信部查询），
       并给深浅两套主题各自的配色，保证任何页面都能一眼看到。 */
    function run(){
      try{
        if (!document.body) return
        if (document.body.innerText.indexOf(ICP) !== -1) return
        var foots = document.getElementsByTagName('footer')
        var host = foots.length ? foots[foots.length - 1] : null
        if (!host){
          host = document.createElement('footer')
          host.className = 'site-footer foot-fallback'
          document.body.appendChild(host)
        }
        if (!document.getElementById('bj-icp-style')) {
          var st = document.createElement('style')
          st.id = 'bj-icp-style'
          st.textContent = [
            '.bj-legal-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px;',
            'margin:16px 0 0;padding:14px 12px 4px;border-top:1px solid rgba(120,150,200,.28);',
            'font-size:13px;line-height:1.9;text-align:center}',
            '.bj-legal-bar .bj-legal-txt{opacity:.8;max-width:640px}',
            '.bj-icp{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:999px;',
            'background:rgba(79,140,255,.12);border:1px solid rgba(79,140,255,.40);color:#2f5fd0!important;',
            'font-weight:800;font-size:13.5px;text-decoration:none!important;letter-spacing:.2px;',
            'transition:.18s;white-space:nowrap}',
            '.bj-icp:hover{background:rgba(79,140,255,.22);transform:translateY(-1px)}',
            '.bj-icp::before{content:"🛡";font-size:13px;line-height:1}',
            '[data-theme="deep"] .bj-legal-bar{border-top-color:rgba(120,160,255,.30)}',
            '[data-theme="deep"] .bj-icp{background:rgba(56,225,255,.12);border-color:rgba(56,225,255,.42);color:#7fe4ff!important}',
            '[data-theme="deep"] .bj-icp:hover{background:rgba(56,225,255,.22)}',
            '@media(max-width:640px){.bj-legal-bar{flex-direction:column;gap:8px;font-size:12.5px;padding:12px 10px 4px}',
            '.bj-legal-bar .bj-legal-txt{font-size:12px}.bj-icp{font-size:13px;padding:6px 12px}}'
          ].join('')
          document.head.appendChild(st)
        }
        var bar = document.createElement('div')
        bar.className = 'bj-legal-bar foot-legal'
        bar.innerHTML =
          '<span class="bj-legal-txt">本站为个人学习与展示用途，AI 对话由站内服务端代理转发，密钥不下发到浏览器。</span>' +
          '<a class="bj-icp" href="https://beian.miit.gov.cn/" target="_blank" rel="noopener" title="点击到工信部政务服务平台查询该备案号">' + ICP + '</a>'
        host.appendChild(bar)
      }catch(e){}
    }
    run()
    if (document.readyState !== 'complete') {
      window.addEventListener('load', run, { once: true })
    }
  })();

  /* ---------- 全站「本页概览」注入（2026-11-24 立） ----------
     需求：每个页面都要有「这页讲什么、有多少条、下一步去哪」，并且数字必须是真的。
     做法：不逐个改 550+ 页，改由本注入层统一挂载，数据来自 /data/page-brief.json
           （由 scripts/gen-page-brief.mjs 从各真源现算，已挂进每日日更）。
     位置：首页不插（它有自己的 Hero，另由首页板块区承载）；子页插在 main 的最前面。
     边界：iframe 内不插（工作台内嵌页会重影）；fetch 失败就整块不渲染，绝不留空壳。 */
  (function pageBrief(){
    try{
      if (window.self !== window.top) return
      var path = (location.pathname || '/').replace(/\/+$/, '')
      /* 开源书阅读页自带「来源与许可」块 + 章节目录 + 上一章/下一章，
         再塞一张「本页概览」只会挡住正文，所以整片跳过（备案号仍由 ensureICP 兜底）。 */
      if (/^\/book\/open\//.test(path)) return
      /* 2026-11-25 收敛（老罗反馈：概览卡＋技术反馈满站播、挡住首屏内容）：
         只在 5 个主域首页保留（模型 / 学习 / 工具 / 作品 / 关于），
         且挂到页面**底部**，不再插在 main 最前面。子页、博客、前沿流、实验、书稿一律不注入。 */
      var MAIN_BOARDS = { models: 1, learn: 1, toolbox: 1, works: 1, about: 1 }
      var parts = path.split('/').filter(Boolean)
      var seg = (parts[0] || '').toLowerCase()
      if (/\.html?$/i.test(seg)) seg = ''
      /* 首页只做「板块角标」增强（每个板块标题后挂真实体量 + 直达），不插概览卡 */
      var isHome = path === '' || path === '/' || /^\/(index|home|hub|portal)\.html?$/i.test(path)
      var isBoardHome = !!MAIN_BOARDS[seg] &&
        (parts.length === 1 || (parts.length === 2 && /^index\.html?$/i.test(parts[1])))
      if (!isHome && !isBoardHome) return

      var CSS = [
        '.bj-brief{max-width:1120px;margin:20px auto 4px;padding:0 20px;box-sizing:border-box;text-align:left}',
        '.bj-brief-in{background:var(--card,#fff);border:1px solid rgba(120,150,200,.24);border-radius:16px;padding:18px 20px;box-shadow:0 6px 22px rgba(20,40,80,.06)}',
        '.bj-brief-badge{display:inline-block;font-size:12px;line-height:1;padding:6px 10px;border-radius:999px;background:rgba(79,140,255,.10);color:#3f6fd8;border:1px solid rgba(79,140,255,.24)}',
        '.bj-brief-title{margin:10px 0 6px;font-size:19px;line-height:1.35;font-weight:800;letter-spacing:.2px}',
        '.bj-brief-lead{margin:0;font-size:14px;line-height:1.85;opacity:.78}',
        '.bj-brief-stats{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0 0}',
        '.bj-brief-stat{display:flex;align-items:baseline;gap:6px;padding:8px 12px;border-radius:12px;background:rgba(79,140,255,.07);border:1px solid rgba(79,140,255,.16)}',
        '.bj-brief-stat b{font-size:17px;font-weight:800;color:#3f6fd8;font-variant-numeric:tabular-nums}',
        '.bj-brief-stat i{font-style:normal;font-size:12px;opacity:.72}',
        '.bj-brief-links{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 0}',
        '.bj-brief-links a{display:inline-block;font-size:13px;padding:7px 12px;border-radius:10px;text-decoration:none;color:#2f5fd0;background:rgba(79,140,255,.08);border:1px solid rgba(79,140,255,.18);transition:.18s}',
        '.bj-brief-links a:hover{background:rgba(79,140,255,.16);transform:translateY(-1px)}',
        '.bj-brief-fb{margin:14px 0 0;padding-top:12px;border-top:1px dashed rgba(120,150,200,.28);font-size:12.5px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;opacity:.85}',
        '.bj-brief-fb b{font-weight:700;opacity:.8}',
        '.bj-brief-fb a{color:#2f5fd0;text-decoration:none;padding:3px 8px;border-radius:8px;background:rgba(79,140,255,.07)}',
        '.bj-brief-fb a:hover{background:rgba(79,140,255,.15)}',
        '.bj-brief-qr{display:flex;gap:14px;flex-wrap:wrap;margin:12px 0 0}',
        '.bj-qr{display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px;border-radius:14px;border:1px solid rgba(120,150,200,.24);background:rgba(79,140,255,.04);text-decoration:none;transition:.18s;width:120px}',
        '.bj-qr:hover{transform:translateY(-2px);border-color:rgba(79,140,255,.42);background:rgba(79,140,255,.09)}',
        '.bj-qr img{width:98px;height:98px;object-fit:cover;object-position:center 30%;border-radius:8px;display:block;background:#fff}',
        '.bj-qr b{font-size:12.5px;color:#2f5fd0;font-weight:700}',
        '.bj-qr i{font-style:normal;font-size:11.5px;opacity:.72;text-align:center;line-height:1.4}',
        '[data-theme="deep"] .bj-qr{border-color:rgba(56,225,255,.22);background:rgba(56,225,255,.06)}',
        '[data-theme="deep"] .bj-qr b{color:#9dc4ff}',
        '[data-theme="deep"] .bj-brief-in{background:#101728;border-color:rgba(120,160,255,.24);color:#e9f0fb}',
        '[data-theme="deep"] .bj-brief-badge{background:rgba(56,225,255,.10);color:#7fe4ff;border-color:rgba(56,225,255,.26)}',
        '[data-theme="deep"] .bj-brief-stat{background:rgba(56,225,255,.07);border-color:rgba(56,225,255,.18)}',
        '[data-theme="deep"] .bj-brief-stat b{color:#7fe4ff}',
        '[data-theme="deep"] .bj-brief-links a,[data-theme="deep"] .bj-brief-fb a{color:#9dc4ff;background:rgba(56,225,255,.08);border-color:rgba(56,225,255,.18)}',
        '@media(max-width:720px){.bj-brief{padding:0 14px;margin-top:14px}.bj-brief-in{padding:15px 16px;border-radius:14px}.bj-brief-title{font-size:17px}.bj-brief-lead{font-size:13.5px}.bj-brief-stat b{font-size:16px}}'
      ].join('')

      function esc(s){
        return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){
          return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]
        })
      }

      /* 2026-11-25：一律挂到页面**底部**（main/article 末尾），
         不再插在首屏最前面挡正文。老罗原话："你放在上面干嘛？" */
      function mount(html){
        var box = document.createElement('section')
        box.className = 'bj-brief'
        box.id = 'bj-brief'
        box.innerHTML = html
        var host = document.querySelector('main') || document.querySelector('article')
        if (host) { host.appendChild(box) }
        else if (document.body) { document.body.appendChild(box) }
      }

      /* 首页板块增强：给每个既有板块标题补一个「真实体量 + 直达」角标。
         只做增量，不改原有结构；没有对应数据的板块直接跳过，不写假数字。 */
      function homeEnhance(d){
        try{
          var b = d.boards || {}
          var pick = function(key, idx){ var s = (b[key] && b[key].stats) || []; return s[idx] || null }
          var MAP = [
            ['explore', pick('models', 0), '/models/', '去模型库'],
            ['works', pick('works', 0), '/works/projects.html', '去作品库'],
            ['news', pick('feed', 1) || pick('feed', 0), '/feed/', '去前沿流'],
            ['hot', pick('blog', 0), '/blog/', '去博客'],
            ['content', pick('learn', 0), '/learn/', '去学习域'],
            ['tools', pick('toolbox', 0), '/toolbox/', '去工具库'],
            ['compile', pick('lab', 0), '/lab/code.html', '去源码台'],
          ]
          var CSS2 = '.bj-blk-tag{display:inline-flex;align-items:center;gap:8px;margin-left:10px;font-size:12.5px;font-weight:600;vertical-align:middle;text-decoration:none;padding:5px 11px;border-radius:999px;background:rgba(79,140,255,.10);border:1px solid rgba(79,140,255,.22);color:#3f6fd8;transition:.18s}.bj-blk-tag:hover{background:rgba(79,140,255,.18)}.bj-blk-tag b{font-variant-numeric:tabular-nums}[data-theme="deep"] .bj-blk-tag{background:rgba(56,225,255,.10);border-color:rgba(56,225,255,.24);color:#7fe4ff}@media(max-width:640px){.bj-blk-tag{margin-left:0;margin-top:8px;display:inline-flex}}'
          if (!document.getElementById('bj-blk-style')){
            var st2 = document.createElement('style')
            st2.id = 'bj-blk-style'
            st2.textContent = CSS2
            document.head.appendChild(st2)
          }
          for (var i = 0; i < MAP.length; i++){
            var id = MAP[i][0], stat = MAP[i][1], href = MAP[i][2], label = MAP[i][3]
            if (!stat || stat.value == null) continue
            var sec = document.getElementById(id)
            if (!sec) continue
            var h = sec.querySelector('h2') || sec.querySelector('.blk-head') || sec.querySelector('h3')
            if (!h || h.querySelector('.bj-blk-tag')) continue
            var a = document.createElement('a')
            a.className = 'bj-blk-tag'
            a.href = href
            a.innerHTML = esc(stat.label) + ' <b>' + esc(stat.value) + '</b> · ' + esc(label) + ' →'
            h.appendChild(a)
          }
        }catch(e){}
      }

      function render(d){
        var b = d && d.boards && d.boards[seg]
        if (!b) return
        if (document.getElementById('bj-brief')) return
        var style = document.getElementById('bj-brief-style')
        if (!style){
          style = document.createElement('style')
          style.id = 'bj-brief-style'
          style.textContent = CSS
          document.head.appendChild(style)
        }
        var st = (b.stats || []).map(function(s){
          return '<span class="bj-brief-stat"><b>' + esc(s.value) + '</b><i>' + esc(s.label) + '</i></span>'
        }).join('')
        var lk = (b.links || []).map(function(l){
          return '<a href="' + esc(l.href) + '">' + esc(l.title) + ' →</a>'
        }).join('')
        var fb = d.feedback || {}
        var fbItems = []
        if (fb.email) fbItems.push('<a href="mailto:' + esc(fb.email) + '">✉ 邮箱 ' + esc(fb.email) + '</a>')
        if (fb.cnb) fbItems.push('<a href="' + esc(fb.cnb) + '" target="_blank" rel="noopener">CNB 仓库</a>')
        if (fb.github) fbItems.push('<a href="' + esc(fb.github) + '" target="_blank" rel="noopener">GitHub</a>')
        // QQ 群 / 微博：支持 { name, qr, tip } 对象，点击二维码看大图；没配就整块不渲染
        var qrItems = []
        ;[['QQ 群', fb.qqGroup], ['微博', fb.weibo]].forEach(function(pair){
          var label = pair[0], v = pair[1]
          if (!v) return
          if (typeof v === 'string') {
            if (/^https?:/.test(v)) qrItems.push('<a href="' + esc(v) + '" target="_blank" rel="noopener">' + label + '</a>')
            return
          }
          if (!v.qr) return
          qrItems.push(
            '<a class="bj-qr" href="' + esc(v.qr) + '" target="_blank" rel="noopener" title="' + esc(v.tip || '扫码') + '">' +
              '<img src="' + esc(v.qr) + '" alt="' + esc(label) + ' · ' + esc(v.name || '') + '" loading="lazy">' +
              '<b>' + esc(label) + '</b><i>' + esc(v.name || '') + '</i>' +
            '</a>'
          )
        })
        var fbHtml = ''
        if (fbItems.length || qrItems.length) {
          fbHtml = '<div class="bj-brief-fb"><b>技术反馈</b>' + fbItems.join('') + '</div>'
          if (qrItems.length) fbHtml += '<div class="bj-brief-qr">' + qrItems.join('') + '</div>'
        }
        mount(
          '<div class="bj-brief-in">' +
            '<span class="bj-brief-badge">白驹 ccowork · ' + esc(b.title) + '</span>' +
            '<h2 class="bj-brief-title">本页概览</h2>' +
            '<p class="bj-brief-lead">' + esc(b.lead) + '</p>' +
            (st ? '<div class="bj-brief-stats">' + st + '</div>' : '') +
            (lk ? '<div class="bj-brief-links">' + lk + '</div>' : '') +
            fbHtml +
          '</div>'
        )
      }

      try{
        // V 定义在更内层作用域，这里必须容错：取不到就退回当前发布指纹常量
        var qv = (typeof V !== 'undefined' && V) ? V : '20261124a'
        fetch('/data/page-brief.json?v=' + qv, { credentials: 'same-origin' })
          .then(function(r){ return r.ok ? r.json() : null })
          .then(function(d){
            if (!d) return
            if (isHome) homeEnhance(d)
            else render(d)
          })
          .catch(function(){})
      }catch(e){}
    }catch(e){}
  })();

  /* ---------- 全站「下一步去哪」路线条 --------------------------------------
     老罗 2026-11-25：每一页的路线指引要多一点、要有预设内容。
     做法：按所属板块给一组预设的下一步，渲染成页面底部一条紧凑横条
     （不是大卡片，高度约 60px，不抢正文）。只覆盖 5 大板块，
     首页 / 开源书阅读页 / 隐藏层不插，避免重复与干扰阅读。
     按钮文案是"动作"，不是"栏目名"——用户看的是"我接下来能干什么"。 */
  ;(function nextSteps(){
    try{
      if (window.self !== window.top) return
      var path = (location.pathname || '/').replace(/\/+$/, '')
      if (!path) return                                   /* 站点首页有自己的 Hero 与板块区 */
      if (/^\/book\/open\//.test(path)) return            /* 开源书正文，别挡 */
      if (/friends/i.test(path)) return                   /* 隐藏层不挂任何公共模块 */
      if (/^\/(index|home|hub|portal)\.html?$/i.test(path)) return

      var KNOWN = { models:1, learn:1, toolbox:1, works:1, about:1 }
      var first = (path.split('/').filter(Boolean)[0] || '').toLowerCase()
      var seg = KNOWN[first] ? first : ''
      if (!seg) return

      var R = {
        models:  { t:'看完模型，接着可以',
                   l:[['查某个模型能做什么','/models/library.html'],
                      ['看它是谁做的、国内能不能用','/models/vendors.html'],
                      ['今天有什么新模型','/feed/'],
                      ['把它跑在自己机器上','/learn/deploy.html']] },
        learn:   { t:'不知道下一步学什么',
                   l:[['按路线选一条路','/learn/study.html'],
                      ['从第一课开始','/learn/tutorials/'],
                      ['做几道题验掌握','/learn/academy/quiz.html'],
                      ['拿一句提示词直接用','/learn/prompts.html'],
                      ['学科怎么和 AI 结合','/learn/subjects.html']] },
        toolbox: { t:'想马上用起来',
                   l:[['找国内能直连的仓库','/toolbox/repos.html'],
                      ['看工具怎么落地','/toolbox/ai-build-hall.html'],
                      ['去哪拿模型、去哪租卡','/toolbox/platforms.html'],
                      ['先打基础再动手','/learn/study.html']] },
        works:   { t:'想自己做一个',
                   l:[['从小游戏源码改起','/works/games.html'],
                      ['看别人怎么做成','/works/cases.html'],
                      ['AI 漫剧怎么做','/works/manju.html'],
                      ['读带出处的长文','/blog/']] },
        about:   { t:'还想了解',
                   l:[['这个站收录了什么','/about/ecosystem.html'],
                      ['附近有哪些 AI 场馆','/about/map-guide.html'],
                      ['最近改了什么','/about/changelog.html'],
                      ['回到学习起点','/learn/study.html']] }
      }
      var r = R[seg]
      if (!r) return

      var cur = path.replace(/\/index\.html?$/i, '')
      var links = []
      for (var i = 0; i < r.l.length; i++) {
        var h = r.l[i][1], hn = h.replace(/\/$/, '')
        if (hn !== cur) links.push(r.l[i])
      }
      if (!links.length) return
      if (links.length > 5) links = links.slice(0, 5)

      var box = document.createElement('section')
      box.className = 'bj-next'
      box.id = 'bj-next'
      box.setAttribute('aria-label', '下一步去哪')

      var h2 = document.createElement('b')
      h2.className = 'bj-next-t'
      h2.textContent = r.t
      box.appendChild(h2)

      var wrap = document.createElement('div')
      wrap.className = 'bj-next-l'
      for (var j = 0; j < links.length; j++) {
        var a = document.createElement('a')
        a.href = links[j][1]
        a.textContent = links[j][0] + ' →'
        wrap.appendChild(a)
      }
      box.appendChild(wrap)

      var css = ''
      css += '.bj-next{max-width:1180px;margin:34px auto 0;padding:15px 18px;border-radius:14px;'
      css += 'background:rgba(79,140,255,.055);border:1px solid rgba(79,140,255,.17);'
      css += 'display:flex;align-items:center;gap:14px;flex-wrap:wrap;box-sizing:border-box}'
      css += '.bj-next-t{font-size:13.5px;font-weight:800;color:#2f5fd0;flex:0 0 auto}'
      css += '.bj-next-l{display:flex;gap:8px;flex-wrap:wrap}'
      css += '.bj-next-l a{font-size:12.5px;font-weight:700;color:#2f5fd0;text-decoration:none;'
      css += 'padding:6px 13px;border-radius:999px;background:rgba(79,140,255,.1);'
      css += 'border:1px solid rgba(79,140,255,.24);transition:.16s;white-space:nowrap}'
      css += '.bj-next-l a:hover{background:rgba(79,140,255,.2);transform:translateY(-1px)}'
      css += '[data-theme="deep"] .bj-next{background:rgba(56,225,255,.05);border-color:rgba(56,225,255,.18)}'
      css += '[data-theme="deep"] .bj-next-t,[data-theme="deep"] .bj-next-l a{color:#7fe4ff}'
      css += '[data-theme="deep"] .bj-next-l a{background:rgba(56,225,255,.09);border-color:rgba(56,225,255,.24)}'
      css += '[data-theme="deep"] .bj-next-l a:hover{background:rgba(56,225,255,.18)}'
      css += '@media(max-width:640px){.bj-next{margin:24px 14px 0;padding:12px 13px;gap:8px}'
      css += '.bj-next-t{font-size:12.5px;width:100%}'
      /* 手机端改换行，不做横向滚动：横滑时最后一个胶囊会被右边缘切一半，
         用户看不出还有内容（实测 390px 第三个按钮被裁）。换行后每个都完整可见。
         同时只露前 4 个 —— 老罗要求底部的引导不要展开太多，5 个会排到第 3 行。 */
      css += '.bj-next-l{flex-wrap:wrap;width:100%;gap:6px}'
      css += '.bj-next-l a{font-size:11.5px;padding:6px 10px;white-space:normal}'
      css += '.bj-next-l a:nth-child(n+5){display:none}}'

      try{
        var st = document.createElement('style')
        st.id = 'bjNextCss'
        st.appendChild(document.createTextNode(css))
        ;(document.head || document.documentElement).appendChild(st)
      }catch(e){}

      function mount(){
        try{
          if (document.getElementById('bj-next')) return true
          var f = document.querySelector('footer.ccfoot') || document.querySelector('footer')
          if (f && f.parentNode) { f.parentNode.insertBefore(box, f); return true }
          var main = document.querySelector('main') || document.body
          if (main) { main.appendChild(box); return true }
        }catch(e){}
        return false
      }
      if (!mount()) {
        window.addEventListener('load', function(){ mount() }, { once: true })
        setTimeout(mount, 1200)
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
  '#ccowork-pet{position:fixed;right:18px;bottom:92px;z-index:9999;width:62px;height:62px;cursor:pointer;' +
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
  '#ccowork-pet .mouth{position:absolute;width:10px;height:6px;border-bottom:2.5px solid #04101f;border-radius:0 0 14px 14px;bottom:16px;left:26px}' +
  '@keyframes ccwFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}' +
  '@keyframes ccwSpin{to{transform:rotate(360deg)}}' +
  '@keyframes ccwBlink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}' +
  '#ccowork-panel{position:fixed;right:18px;bottom:172px;z-index:9998;width:min(330px,calc(100vw - 36px));' +
    'max-height:min(76vh,640px);overflow-y:auto;border-radius:18px;padding:18px;' +
    'background:rgba(8,12,22,.92);border:1px solid rgba(120,160,220,.25);backdrop-filter:blur(18px);' +
    'box-shadow:0 24px 70px rgba(0,0,0,.6);color:#e9f0fb;font-family:"PingFang SC","Microsoft YaHei",system-ui,sans-serif;' +
    'transform:translateY(16px) scale(.96);opacity:0;pointer-events:none;transition:.28s}' +
  '#ccowork-panel.show{transform:none;opacity:1;pointer-events:auto}' +
  '#ccowork-panel h3{margin:0 0 4px;font-size:17px;letter-spacing:1px;background:linear-gradient(120deg,#5eead4,#38e1ff,#5b8cff);' +
    '-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:900}' +
  '#ccowork-panel .sub{font-size:12px;color:#8fa3bd;margin-bottom:12px}' +
  '#ccowork-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
  '#ccowork-chat{margin-bottom:10px}' +
  '#ccowork-session-bar{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;gap:6px}' +
  '#ccowork-session-title{flex:1;font-size:12px;color:#8fa3bd;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
  '#ccowork-session-title b{color:#5eead4;font-weight:600}' +
  '.ccw-sess-btn{background:rgba(120,160,220,.12);border:1px solid rgba(120,160,220,.2);color:#8fa3bd;border-radius:10px;padding:4px 8px;font-size:11px;cursor:pointer;transition:.2s;font-family:inherit}' +
  '.ccw-sess-btn:hover{background:rgba(94,234,212,.15);border-color:rgba(94,234,212,.3);color:#5eead4}' +
  '#ccowork-sess-menu{position:fixed;z-index:10000;min-width:220px;max-height:300px;overflow-y:auto;background:rgba(8,12,22,.98);border:1px solid rgba(120,160,220,.25);border-radius:14px;padding:6px}' +
  '#ccowork-sess-menu .sess-item{padding:8px 10px;border-radius:10px;cursor:pointer;font-size:12px;display:flex;justify-content:space-between;align-items:center;gap:8px}' +
  '#ccowork-sess-menu .sess-item:hover{background:rgba(94,234,212,.1)}' +
  '#ccowork-sess-menu .sess-item.active{background:rgba(94,234,212,.15);border:1px solid rgba(94,234,212,.3)}' +
  '#ccowork-sess-menu .sess-item .s-left{flex:1;min-width:0}' +
  '#ccowork-sess-menu .sess-item .st{color:#8fa3bd;font-size:11px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
  '#ccowork-sess-menu .sess-item .sname{color:#e9f0fb;font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block}' +
  '#ccowork-sess-menu .sess-item .sdel{color:#f87171;opacity:0;transition:.2s;font-size:12px;flex-shrink:0}' +
  '#ccowork-sess-menu .sess-item:hover .sdel{opacity:1}' +
  '#ccowork-sess-menu .sess-empty{padding:12px;text-align:center;color:#64748b;font-size:12px}' +
  '#ccowork-chat-msgs{max-height:210px;overflow-y:auto;background:rgba(10,15,30,.6);border:1px solid rgba(120,160,220,.22);border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:7px;margin-bottom:8px}' +
  '#ccowork-chat-msgs::-webkit-scrollbar{width:5px}' +
  '#ccowork-chat-msgs::-webkit-scrollbar-thumb{background:#2a3b5e;border-radius:4px}' +
  '.ccowork-cmsg{font-size:12px;line-height:1.65;max-width:96%;padding:7px 10px;border-radius:10px;overflow-wrap:break-word;word-break:break-word}' +
  '.ccowork-cmsg.user{align-self:flex-end;background:linear-gradient(120deg,#38bdf8,#818cf8);color:#fff;border-bottom-right-radius:4px}' +
  '.ccowork-cmsg.ai{align-self:flex-start;background:rgba(25,34,60,.85);color:#c6d2ea;border:1px solid rgba(120,160,220,.18);border-bottom-left-radius:4px}' +
  '.ccowork-cmsg pre{background:#05070f;border-radius:10px;padding:8px;overflow-x:auto;font-size:11px;margin:4px 0}' +
  '.ccowork-cmsg code{background:rgba(94,234,212,.12);border-radius:4px;padding:0 5px;font-size:11px;color:#5eead4}' +
  '.ccowork-cmsg .ccw-h{display:block;font-size:12px;margin:4px 0 2px}' +
  '.ccowork-cmsg .ccw-li{display:block;padding-left:4px}' +
  '.ccowork-cmsg .ccw-typing{color:#8fa3bd}' +
  '.ccowork-cmsg img{display:block;margin-top:4px}' +
  '.ccowork-chat-row{display:flex;gap:6px}' +
  '#ccowork-chat-input{flex:1;background:rgba(10,15,30,.9);border:1px solid rgba(120,160,220,.28);color:#e9f0fb;border-radius:10px;padding:9px 12px;font-size:13px;outline:none;font-family:inherit;transition:.2s;min-width:0}' +
  '#ccowork-chat-input:focus{border-color:rgba(94,234,212,.5);box-shadow:0 0 0 3px rgba(94,234,212,.12)}' +
  '#ccowork-chat-input::placeholder{color:#64748b}' +
  '#ccowork-chat-send{flex-shrink:0;background:var(--ccw-grad,linear-gradient(120deg,#38bdf8,#818cf8));color:#fff;border:none;border-radius:10px;padding:0 15px;font-size:13px;font-weight:700;cursor:pointer;transition:.2s;font-family:inherit}' +
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
  '#ccowork-grid a{display:flex;flex-direction:column;align-items:center;gap:5px;padding:12px 6px;border-radius:14px;' +
    'text-decoration:none;color:#e9f0fb;background:rgba(19,26,45,.6);border:1px solid rgba(120,160,220,.16);transition:.22s}' +
  '#ccowork-grid a:hover{transform:translateY(-2px);border-color:rgba(94,234,212,.45);background:rgba(25,34,60,.8)}' +
  '#ccowork-grid .ic{font-size:24px}' +
  '#ccowork-grid .nm{font-size:12px;color:#c6d2ea}' +
  '#ccowork-skills{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}' +
  '#ccowork-skills button{flex:1;min-width:72px;border:1px solid rgba(120,160,220,.22);background:rgba(19,26,45,.6);color:#c6d2ea;' +
    'border-radius:10px;padding:7px 4px;font-size:12px;cursor:pointer;transition:.2s;font-family:inherit}' +
  '#ccowork-skills button:hover{border-color:rgba(240,185,92,.55);color:#f0b95c;transform:translateY(-1px)}' +
  '#ccowork-voice{margin-top:10px;display:flex;gap:8px}' +
  '#ccowork-voice button{flex:1;border:1px solid rgba(120,160,220,.25);background:rgba(19,26,45,.6);color:#c6d2ea;' +
    'border-radius:10px;padding:9px 0;font-size:13px;cursor:pointer;transition:.2s;font-family:inherit}' +
  '#ccowork-voice button:hover{border-color:rgba(240,185,92,.5);color:#f0b95c}' +
  '#ccowork-asr{display:none;margin-top:8px;background:rgba(13,19,32,.9);border:1px solid rgba(94,234,212,.3);border-radius:10px;' +
    'padding:10px 12px;font-size:13px;color:#e9f0fb;line-height:1.6}' +
  '#ccowork-asr.show{display:block}' +
  '#ccowork-close{position:absolute;top:10px;right:12px;background:none;border:none;color:#8fa3bd;font-size:17px;cursor:pointer}' +
  '#ccowork-close:hover{color:#fff}' +
  '@media(max-width:640px){#ccowork-pet{right:12px;bottom:88px;width:54px;height:54px;font-size:26px}#ccowork-panel{right:12px;bottom:158px}}' +
  /* 长列表性能：屏外卡片跳过布局/绘制（首页 122 张作品卡，文档高 5 万 px） */
  '#wsGrid>*,.works-grid>*,.wcard,.ecard,.ncard{content-visibility:auto;contain-intrinsic-size:auto 280px}' +
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
  '#ccowork-news{margin-top:10px;border:1px solid rgba(120,160,220,.2);border-radius:14px;padding:10px 12px;background:rgba(13,19,32,.55)}' +
  '#ccowork-news .nt{font-size:12px;font-weight:700;color:#e9f0fb;display:flex;justify-content:space-between;align-items:center;margin-bottom:7px}' +
  '#ccowork-news .nt a{color:#f0b95c;font-size:11px;text-decoration:none}' +
  '#ccowork-news-list{display:flex;flex-direction:column;gap:6px}' +
  '#ccowork-news .nup{font-size:10px;color:#8fa3bd;margin-bottom:2px}' +
  '#ccowork-news .ni{display:flex;align-items:center;gap:7px;font-size:12px;color:#c6d2ea;text-decoration:none;line-height:1.45}' +
  '#ccowork-news .ni:hover{color:#5eead4}' +
  '#ccowork-news .ni .ntag{flex-shrink:0;font-size:10px;color:#03121a;background:linear-gradient(120deg,#5eead4,#38e1ff);border-radius:4px;padding:1px 6px;font-weight:700}' +
  '#ccowork-news .ni .ntx{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
  '#ccowork-news .ni em{flex-shrink:0;font-style:normal;font-size:10px;color:#64748b}' +
  '#ccowork-kb{margin-top:8px;border:1px solid rgba(120,160,220,.2);border-radius:14px;padding:10px 12px;background:rgba(13,19,32,.55)}' +
  '#ccowork-kb .nt{font-size:12px;font-weight:700;color:#e9f0fb;display:flex;justify-content:space-between;align-items:center;margin-bottom:7px}' +
  '#ccowork-kb .nt a{color:#f0b95c;font-size:11px;text-decoration:none}' +
  '#ccowork-kb-body{display:flex;flex-direction:column;gap:5px}' +
  '#ccowork-kb .kt{font-size:11px;color:#5eead4;font-weight:700}' +
  '#ccowork-kb .kix{font-size:11px;color:#c6d2ea;line-height:1.55}' +
  '#ccowork-kb .kip{font-size:11px;color:#8fa3bd;line-height:1.5;padding-left:8px;position:relative}' +
  '#ccowork-kb .kip::before{content:"";position:absolute;left:0;top:7px;width:4px;height:4px;border-radius:50%;background:#38e1ff}' +
  '#ccowork-kb .kit{font-size:11px;color:#f0b95c;line-height:1.5}' +
  '#ccowork-quote{margin-top:8px;font-size:11px;color:#8fa3bd;line-height:1.6;padding:8px 12px;border-left:3px solid rgba(240,185,92,.6);background:rgba(240,185,92,.06);border-radius:0 10px 10px 0}' +
  '#ccowork-quote-text{color:#c6d2ea;font-style:italic}' +
  '#ccowork-sess{margin-top:8px;border:1px solid rgba(120,160,220,.2);border-radius:14px;padding:10px 12px;background:rgba(13,19,32,.55)}' +
  '#ccowork-sess .nt{font-size:12px;font-weight:700;color:#e9f0fb;display:flex;justify-content:space-between;align-items:center;margin-bottom:7px}' +
  '#ccowork-sess .nt a{color:#f0b95c;font-size:11px;text-decoration:none}' +
  '#ccowork-sess-list{display:flex;flex-direction:column;gap:6px}' +
  '#ccowork-sess .ni{display:flex;align-items:center;gap:7px;font-size:12px;color:#c6d2ea;text-decoration:none;line-height:1.45}' +
  '#ccowork-sess .ni:hover{color:#5eead4}' +
  '#ccowork-sess .ni .ntag{flex-shrink:0;font-size:10px;color:#fff;background:linear-gradient(120deg,#8b5cf6,#5b8cff);border-radius:4px;padding:1px 6px;font-weight:700}' +
  '#ccowork-sess .ni .ntx{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
  '#ccowork-sess .ni em{flex-shrink:0;font-style:normal;font-size:10px;color:#64748b}' +
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
  'body[data-theme="cloud"] #ccowork-sess .ni:hover{color:#0891b2!important}' +
  /* 移动端体验收紧（与 module.js 同一段，双保险：只引 ccowork.js 的页面同样生效） */
  '@media(max-width:760px){' +
    'nav{display:flex;align-items:center;min-width:0;flex-wrap:nowrap}' +
    'nav .logo,nav .brand,header .brand,.topbar .logo,#topbar .logo{font-size:16px!important;letter-spacing:0!important;max-width:46vw!important;min-width:0;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;flex:0 1 auto!important;margin-right:auto!important}' +
    'nav.top,.topnav,nav[class*="top"]{gap:8px;padding:0 12px;height:54px;min-width:0;flex-wrap:nowrap}' +
    'nav .brand,.topnav .brand{flex:none;min-width:0;font-size:15px;gap:7px}' +
    'nav.top .brand .nm,.topnav .brand .nm{font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    'nav.top .brand .logo,.topnav .brand .logo{width:30px;height:30px;font-size:16px}' +
    'nav.top .links,.topnav .links{min-width:0;flex:1 1 auto;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;-webkit-overflow-scrolling:touch}' +
    'nav.top .links::-webkit-scrollbar,.topnav .links::-webkit-scrollbar{display:none}' +
    'nav.top .links a,.topnav .links a{padding:7px 10px;font-size:13px}' +
    'nav .nav-actions,.topnav .nav-actions{flex:none!important;min-width:0;gap:6px;flex-wrap:nowrap}' +
    'nav.top .nav-actions .cta,.topnav .nav-actions .cta,nav.top .cta,.topnav .cta{display:none!important}' +
    '#ccowSearchBtn{padding:6px 9px!important;font-size:13px!important;gap:4px!important;margin-left:4px!important}' +
    '#ccowSearchBtn span{display:none}' +
    '.nav-gear{width:32px;height:32px;margin-left:4px;font-size:14px}' +
    'nav .theme-btn,.topnav .theme-btn{width:32px;height:32px;font-size:15px}' +
  '}' +
  '@media(max-width:420px){' +
    'nav .brand .nm,.topnav .brand .nm{display:none}' +
    'nav .logo{max-width:40vw!important;font-size:15px!important}' +
    'nav.top,.topnav,nav[class*="top"]{padding:0 10px;gap:6px}' +
  '}'

  var style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)

  // ---------- 悬浮宠物 ----------
  C.pet = document.createElement('div')
  C.pet.id = 'ccowork-pet'
  C.pet.innerHTML = '<span class="cc-mark cc-pet-mark"></span><span class="eye l"></span><span class="eye r"></span><span class="mouth"></span>'
  C.pet.title = 'ccowork 工作台'
  /* 页面把 ccowork.js 放在 <head> 时 document.body 还是 null，直接 appendChild 会抛错
     并中断后面所有逻辑（宠物 + 工作台一起失效）。改成 DOM 就绪后再挂。 */
  if (document.body) document.body.appendChild(C.pet)
  else document.addEventListener('DOMContentLoaded', function () { if (C.pet && document.body) document.body.appendChild(C.pet) })

  // ---------- 工作台面板 ----------
  var LINKS = [
    // P04 步骤 1：/website/ccowork.html 在磁盘上不存在（点菜单必 404），
    // 归位到新版工具域 —— 工作台聚合页的真实落点是 /toolbox/。
    ['layout-grid', '全能工作台', '/toolbox/'],
    ['settings', '模型设置', '/website/settings.html'],
    /* 2026-11-11 合并：「全能智能体」与「AI 对话」原本是两项，指向同一个助手的
       两份实现（/agent.html 与 /agent.html），点进去是两套界面。
       全站只有一个助手，坞里也只留一个入口；旧地址由构建闸门改成跳转壳。 */
    ['bot', '开始对话', '/agent.html'],
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
    '<div class="sub">AI 全能工作台 · 面板内直接对话 · 生文生图都有<br>AI 对话由站内服务端代理转发 · 密钥不下发到浏览器</div>' +
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
      '<div class="nt"><i class="cc-ic" data-ic="history" aria-hidden="true"></i> 最近会话 <a href="/agent.html">智能体 →</a></div>' +
      '<div id="ccowork-sess-list">加载中…</div>' +
    '</div>' +
    '<div id="ccowork-news">' +
      '<div class="nt"><i class="cc-ic" data-ic="newspaper" aria-hidden="true"></i> 今日新闻 <a href="/feed/news.html">全部 →</a></div>' +
      '<div id="ccowork-news-list">加载中…</div>' +
    '</div>' +
    '<div id="ccowork-kb">' +
      '<div class="nt"><i class="cc-ic" data-ic="lightbulb" aria-hidden="true"></i> 知识卡片 <a href="/about/ecosystem.html">知识库 →</a></div>' +
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
            return '<a class="ni" href="/feed/news.html" title="' + (n.desc||'') + '"><b class="ntag">' + (n.tag||'AI') + '</b><span class="ntx">' + (n.title||'') + '</span><em>' + (n.date||'') + '</em></a>';
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
        return '<a class="ni" href="/agent.html?session=' + encodeURIComponent(s.id) + '" title="点击恢复该会话">'
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
    window.open('/agent.html?ask=' + ask, '_blank')
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
  }
  if (document.body) init()
  else document.addEventListener('DOMContentLoaded', init)
})()

/* ---------- 2026-10-28 · 手机端滚动时收起底部工具带 ----------
   贴边排布后正文仍会从悬浮件底下穿过；滚动开始即收起，停手 700ms 再淡回，
   做到「读的时候零遮挡」。放在这里是因为 ccowork.js 是全站注入的，
   content 页不一定加载 responsive.js。 */
;(function () {
  try {
    if (!window.matchMedia || !window.matchMedia('(max-width: 760px)').matches) return
    var timer = null, root = document.documentElement
    window.addEventListener('scroll', function () {
      if (!root.classList.contains('fab-hidden')) root.classList.add('fab-hidden')
      if (timer) clearTimeout(timer)
      timer = setTimeout(function () { root.classList.remove('fab-hidden') }, 700)
    }, { passive: true })
  } catch (e) {}
})();
