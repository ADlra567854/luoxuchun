/* ==========================================================================
   site-nav.js · 全站唯一导航注入器（2026-10-29 从零重建）
   --------------------------------------------------------------------------
   旧架构的问题：导航写死在每一页的 HTML 里。
     327 个页面中只有 22 页有主导航，且分成 14 种互不相同的方案；
     首页一条导航塞进 14 个链接；305 个页面干脆没有导航，只有一行面包屑。
     于是「主站 / 副站 / 主导航 / 二级导航 / 栏目导航」五套说法同时存在，
     加一个页面就要手工复制一次导航，越加越乱。

   新架构：导航只在这里定义一次，页面引入本文件即自动生成。
     ① 主导航固定 5 个「域」，不再随栏目增长；
     ② 分区条只显示当前域自己的页面，不混入别域；
     ③ 层级封顶两层，第三层用页内锚点（.ccjump）解决。

   用法（新页面）：
     <link rel="stylesheet" href="/site-nav.css">
     <script src="/site-nav.js"></script>      ← 放 body 末尾或加 defer
   页面不需要写任何 <nav> 标签。标题、面包屑由 data 属性补充：
     <body data-ccnav="models" data-cctitle="模型图谱">
   旧页面若已有 <nav class="top">，本脚本自动跳过，绝不双导航。
   ========================================================================== */
;(function () {
  'use strict';

  /* ======================= 一、站点地图（唯一真源） ======================= */
  var MAP = {
    /* 品牌名只有一个写法：中文名 + 半角空格 + 英文标识。
       历史上有过「白驹 ccowork」「白驹 ccowork」「白驹 ccowork」三种写法并存，
       现在统一到这里 —— 改这一处，导航、抽屉、页脚三处同步。见 BRAND.md §1。 */
    brand: { name: '白驹 ccowork', home: '/' },

    /* 主导航：固定 5 项。增删域请在这里改，全站同步，不需要动任何页面。 */
    primary: [
      { k: 'models', n: '模型图谱', ic: 'brain',         href: '/models/', d: '图谱 · 模型库 · 榜单 · 厂商 · 前沿流' },
      { k: 'learn',  n: '学习路径', ic: 'graduation-cap', href: '/learn/',  d: '自学路线 · 教程 · 题库 · 提示词 · 学科×AI' },
      { k: 'toolbox', n: '工具工坊', ic: 'wrench',         href: '/toolbox/', d: '开源仓库 · AI 建造馆 · 平台 · 工具库' },
      { k: 'works',  n: '作品展厅', ic: 'layout-grid',    href: '/works/',  d: '开源项目 · 游戏源码 · 案例 · 漫剧' },
      { k: 'about',  n: '关于本站', ic: 'info',           href: '/about/',  d: '生态库 · 场馆地图 · 更新日志' }
    ],

    /* 分区条：每个域 3–8 项，只放本域的页。这是"副导航"，不再有第二个名字。 */
    sections: {
      models: [
        { n: '图谱',   href: '/models/atlas.html',        ic: 'grid-2x2',   d: '模型关系一张图看懂' },
        { n: '模型库', href: '/models/library.html',      ic: 'database',   d: '241 个具名模型可查' },
        { n: '榜单',   href: '/models/leaderboards.html', ic: 'trophy',     d: '按能力排个高下' },
        { n: '厂商',   href: '/models/vendors.html',      ic: 'building-2', d: '谁做的、国内能不能用' },
        { n: '追踪',   href: '/models/tracking.html',     ic: 'activity',   d: '新模型上线时间线' },
        { n: '前沿流', href: '/feed/',                    ic: 'flame',      d: '每日实抓，带出处与配图' }
      ],
      learn: [
        { n: '概览',     href: '/learn/',                  ic: 'school',      d: '学习路径首页，先定起点' },
        { n: '自学路线', href: '/learn/study.html',        ic: 'route',       d: '零基础到能做出东西的完整路径' },
        { n: '教程',     href: '/learn/tutorials/',        ic: 'book-open',   d: '43 章从零到能做出东西' },
        { n: '题库',     href: '/learn/academy/quiz.html', ic: 'list-checks', d: '按知识点自测与练习' },
        { n: '提示词库', href: '/learn/prompts.html',      ic: 'sparkles',    d: '可直接抄用的提示词，每天加' },
        { n: '学科×AI',  href: '/learn/subjects.html',     ic: 'atom',        d: '物理 / 化学 / 数学 + AI，高中也能用' },
        { n: '软件学院', href: '/learn/software.html',     ic: 'app-window',  d: '编程语言与工具怎么学' },
        { n: '软件详情', href: '/learn/software-detail.html', ic: 'info',     d: '每款软件的安装、许可与替代' },
        { n: '书稿',     href: '/learn/books/',            ic: 'library-big', d: '五卷全书与实战书稿' }
      ],
      toolbox: [
        { n: '开源仓库', href: '/toolbox/repos.html',          ic: 'git-branch', d: '国内可直连优先，标维护状态' },
        { n: 'AI 建造馆', href: '/toolbox/ai-build-hall.html',  ic: 'hammer',     d: '概念 → 工具 → 应用 → 园区' },
        { n: '平台',     href: '/toolbox/platforms.html',      ic: 'layers',     d: '33 家去哪拿模型、去哪租卡' },
        { n: '工具库',   href: '/toolbox/library.html',        ic: 'wrench',     d: '17 个 AI 工具，标官网与定价' }
      ],
      works: [
        { n: '项目',     href: '/works/projects.html', ic: 'folder-open', d: '开源作品与来源清单' },
        { n: '游戏源码', href: '/works/games.html',    ic: 'gamepad-2',   d: '能直接跑的小游戏与源码' },
        { n: '案例',     href: '/works/cases.html',    ic: 'briefcase',   d: '别人用 AI 做成了什么' },
        { n: '漫剧',     href: '/works/manju.html',    ic: 'film',        d: 'AI 漫剧怎么做，案例与工具' },
        { n: '博物馆',   href: '/works/museum.html',   ic: 'landmark',    d: 'AI 发展时间线 + 已失效做法' },
        { n: '博客',     href: '/blog/',               ic: 'newspaper',   d: '带出处的长文与笔记' }
      ],
      about: [
        { n: '关于',     href: '/about/index.html',      ic: 'info',    d: '这个站是干什么的' },
        { n: '生态库',   href: '/about/ecosystem.html',  ic: 'globe',   d: '189 家厂商与收录范围' },
        { n: '场馆地图', href: '/about/map-guide.html',  ic: 'map-pin', d: '42 处 AI 场馆，22 座城市' },
        { n: '更新日志', href: '/about/changelog.html',  ic: 'history', d: '每天改了什么，可查' }
      ]
    },

    /* 页脚。企业级站点的页脚是信任落点，不是装饰：
       品牌是谁、有哪些地方可去、出问题找谁、内容依据什么 —— 缺一项都算缺陷。
       所有链接必须是磁盘上真实存在的页面。页脚放死链比不放页脚更伤信任，
       所以这份清单只从「已验证存在」的页面里取，不写占位。 */
    footer: {
      tagline: '把散落的 AI 工具装进一个大脑',
      claim: '每个结论都能点回原文',
      cols: [
        {
          n: '站点',
          items: [
            { n: '模型图谱', href: '/models/' },
            { n: '学习路径', href: '/learn/' },
            { n: '工具工坊', href: '/toolbox/' },
            { n: '作品展厅', href: '/works/' },
            { n: '关于本站', href: '/about/' }
          ]
        },
        {
          n: '资源',
          items: [
            { n: '更新记录', href: '/about/changelog.html' },
            { n: '常见问题', href: '/about/faq.html' },
            { n: '生态库',   href: '/about/ecosystem.html' },
            { n: '开源仓库', href: '/toolbox/repos.html' },
            { n: '工具使用 · 31 款', href: '/learn/ai-coding-tools.html' },
            { n: '场馆地图', href: '/about/map-guide.html' }
          ]
        },
        {
          n: '说明',
          items: [
            { n: '隐私说明', href: '/about/privacy.html' },
            { n: '安全说明', href: '/about/security.html' },
            { n: '使用协议', href: '/LICENSE' }
          ]
        }
      ],
      note: '内容持续更新，每条事实标注来源与核验日期。',
      /* 免责声明沿用旧页脚那两句，意思一字不改 —— 它说明的是数据流向与
         内容归属，属于用户有权知情的事，不能因为改版就丢掉。 */
      disclaimer: '本站为个人学习与展示用途，AI 对话由站内服务端代理转发，密钥不下发到浏览器。' +
                  '内容以站内实际收录为准，外部链接归原作者所有。'
    }
  };

  /* ======================= 二、环境判定 ======================= */
  var path = location.pathname.replace(/\/index\.html$/, '/').replace(/\/{2,}/g, '/');

  function decode(s) {
    try { return decodeURIComponent(s); } catch (e) { return s; }
  }
  var curPath = decode(path);

  /* 路径归一，只用于「当前页 == 菜单项」的比对。
     踩过两个坑（都是分站结构带出来的）：
       · 映射表里写的是 /about/index.html，而 location.pathname 已经被上面
         replace 成 /about/，两边永远不相等 → 站在关于域首页时分区条一项都不亮；
       · /models/ 与 /models/index.html 是同一个人，但字符串不同。
     归一口径：去掉 index.html、去掉尾部斜杠、去掉 query/hash。
     显示与跳转仍然用原始 href，不动真实地址。 */
  function normPath(u) {
    var p = String(u || '').split('?')[0].split('#')[0];
    p = p.replace(/\/index\.html$/, '/');
    if (p.length > 1 && p.charAt(p.length - 1) === '/') p = p.slice(0, -1);
    return p || '/';
  }

  /* 取某域的分区条条目。
     models / toolbox / works 原来的列表里没有指向域根页的那一项，
     于是站在 /models/ 这种「自己家门口」时分区条一片空白，看不出身在何处。
     这里统一补一条「概览」打头 —— learn 和 about 已有等价项就不重复加。 */
  function sectionsOf(k) {
    var list = (MAP.sections[k] || []).slice();
    if (!list.length) return list;
    var hasRoot = list.some(function (s) { return normPath(s.href) === normPath('/' + k + '/'); });
    if (!hasRoot) list.unshift({ n: '概览', href: '/' + k + '/', ic: 'home' });
    return list;
  }

  /* 当前属于哪个域。
     有些目录不在 /<域>/ 下（博客在 /blog/、书稿在 /book/、章节在 /website/ai-academy/），
     用别名表把它们归到正确的域，否则这些页面拿不到分区条。 */
  /* 分站目录 → 域。分站是历史结构：它们不在 /<域>/ 下，
     但导航仍须回答「我属于哪一域、怎么回去」（BRAND.md §6.1）。
     按目录前缀归类而不是逐页列清单，新增分站页自动生效。
     顺序要紧：更具体的前缀必须排在宽泛前缀之前。 */
  var PATH_ALIAS = [
    /* 具体前缀必须排在 /website/ 之前。ai-academy-roadmap / -cert / -glossary
       这些派生页前缀是连字符，旧两条规则都匹配不到，会掉进 /website/ → works，
       学院页面包屑被写成「首页 / 作品」，是真实的归属边界错误。 */
    { p: '/website/ai-academy-',   k: 'learn' },
    { p: '/website/ai-academy/',   k: 'learn' },
    { p: '/website/ai-academy.',   k: 'learn' },  /* ai-academy.html 等派生页 */
    { p: '/blog/',                 k: 'works' },
    { p: '/book/',                 k: 'learn' },
    { p: '/novel/',                k: 'works' },   /* 小说分站 */
    { p: '/feed/',                 k: 'models' },  /* 前沿流挂在模型域分区条 */
    { p: '/lab/',                  k: 'toolbox' }, /* 仿真实验室 */
    { p: '/linguavista/',          k: 'learn' },   /* 环球语堂 · 语言学习分站 */
    { p: '/website/',              k: 'works' },   /* 历史分站 / 知识收纳站 */
    { p: '/tools/',                k: 'toolbox' },
    { p: '/data/',                 k: 'toolbox' },
    { p: '/docs/',                 k: 'about' },
    { p: '/templates/',            k: 'about' }
  ];
  /* 根目录散页同样要归属。按文件名前缀归类，避免给每页手写 data-ccnav。 */
  var ROOT_HINT = [
    { re: /^\/(ai-academy|academy|tutorial|quiz|glossary|cert|course|learn|book|reader|chapter|ai-books|ai-edu|ai-jobs|ai-money|ai-war-room)/, k: 'learn' },
    { re: /^\/(ai-tools|toolbox|software|repo|devbase|prompt|compile|ai-build-hall|ai-client|assistant|chat|agent)/, k: 'toolbox' },
    { re: /^\/(model|atlas|leaderboard|vendor|rank|ai-ecosystem)/, k: 'models' },
    { re: /^\/(works|project|case|blog|covers|cover|gallery|comic|video|ai-projects|biz|chronicle)/, k: 'works' },
    { re: /^\/(about|brand|changelog|privacy|security|plan|improvement|guide|faq)/, k: 'about' }
  ];
  function detectDomain() {
    /* 大小写边界：/Models/ 与 /models/ 是同一个域。别名表与 ROOT_HINT 全是
       小写字面量，统一用小写副本比较，避免给每条正则都补 i 标志。 */
    var low = curPath.toLowerCase();
    for (var i = 0; i < MAP.primary.length; i++) {
      var k = MAP.primary[i].k;
      if (low.indexOf('/' + k + '/') === 0) return k;
    }
    for (var j = 0; j < PATH_ALIAS.length; j++) {
      if (low.indexOf(PATH_ALIAS[j].p.toLowerCase()) === 0) return PATH_ALIAS[j].k;
    }
    for (var m = 0; m < ROOT_HINT.length; m++) {
      if (ROOT_HINT[m].re.test(curPath) || ROOT_HINT[m].re.test(low)) return ROOT_HINT[m].k;
    }
    /* 404 / 门户等确实不属于任何域：不硬塞，保留「首页」返回出口即可。 */
    return '';
  }
  var DOMAIN = (document.body && document.body.getAttribute('data-ccnav')) || detectDomain();

  /* 是否已经有旧的 nav.top —— 有就不注入，避免双导航 */
  function hasLegacyNav() {
    return !!document.querySelector('nav.top, header.site-head, nav[class*="top"]');
  }

  /* 旧页面自带的页脚。
     首页与 404 走的是旧架构（nav.top + ccowork.js），没有 data-ccnav，
     但它们同样需要统一页脚 —— 页脚是信任落点，一站两样本身就是缺陷。
     而 website/ 下的历史页自带完整页脚（.foot-inner / footer.foot），
     那些页面不能再叠一份，所以先探一下。 */
  function hasLegacyFooter() {
    return !!(document.querySelector('.foot-inner') ||
              document.querySelector('footer.foot') ||
              document.querySelector('body > footer:not(.ccfoot)'));
  }

  /* ======================= 三、构建 ======================= */
  /* 品牌标识（内联 SVG）。
     为什么不用 emoji：动物 emoji 在 Windows / macOS / Android 上是三套完全不同的图形，
     无法做单色版、无法控制字重与基线，导出与印刷会变成豆腐块。见 BRAND.md §2。
     为什么内联而不是 <img src>：标识每页都要用，内联省一次请求、无闪烁，
     并且能直接继承文档的渲染时序，不占 LCP。
     sid 必须每次调用都不同 —— 同一个页面里导航与抽屉各渲染一次，
    渐变 id 重复虽然多数浏览器能容忍，但 SVG 规范里是非法文档。 */
  function markSvg(sid) {
    /* 2026-11-12：统一到正式图形标「隙」（assets/brand/mark.svg）。
       这里必须内联 —— 导航是注入器建的，用 <img> 会多一次请求并出现闪白；
       但路径/配色与正式资产逐字一致，避免「导航一套、悬浮球一套」。
       无 width/height 的内联 svg 在 32~36px 容器里会按默认 300×150 渲染并溢出，
       显式 100% 让它填满容器，viewBox 0 0 40 40 自动缩放。
       图形标零文字：品牌名由相邻的 .tx 文本提供，改名不用动这里。 */
    return '<svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden="true" focusable="false">' +
      /* 渐变按规范固定 120deg。这里写成向量：(sin120°, −cos120°) ≈ (0.866, 0.5)，
         在以 20,20 为心的 40×40 框里换算得 (2.7,10) → (37.3,30)。
         不用对角线，是为了和按钮、图标底的渐变方向严格一致。 */
      '<defs><linearGradient id="' + sid + '" x1="2.7" y1="10" x2="37.3" y2="30" gradientUnits="userSpaceOnUse">' +
        '<stop offset="0" stop-color="#4F8CFF"/>' +
        '<stop offset=".5" stop-color="#38B6FF"/>' +
        '<stop offset="1" stop-color="#8B5CF6"/>' +
      '</linearGradient></defs>' +
      '<rect width="40" height="40" rx="11" fill="url(#' + sid + ')"/>' +
      /* 开放圆环（收敛工具）+ 右上开口斜笔画（白驹过隙的光）+ 中心圆点（枢纽） */
      '<path d="M30.34 18.18 A 10.5 10.5 0 1 1 21.82 9.66" fill="none" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round"/>' +
      '<path d="M31.8 8.2 L 22 18" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="20" cy="20" r="2.6" fill="#FFFFFF"/>' +
      '</svg>';
  }

  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  }
  function icon(n) { return '<i class="cc-ic" data-ic="' + n + '" aria-hidden="true"></i>'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  function buildHeader() {
    var h = el('header', 'ccnav');

    /* --- 第一层：品牌 + 主导航 + 动作 --- */
    var row = el('div', 'ccnav-in');

    var brand = el('a', 'ccnav-brand');
    brand.href = MAP.brand.home;
    brand.innerHTML = '<span class="lg">' + markSvg('bjMkNav') + '</span><span class="tx">' + esc(MAP.brand.name) + '</span>';
    row.appendChild(brand);

    var prim = el('nav', 'ccnav-main');
    prim.setAttribute('aria-label', '主导航');
    MAP.primary.forEach(function (p) {
      var a = el('a', '', icon(p.ic) + esc(p.n));
      a.href = p.href;
      if (p.k === DOMAIN) a.setAttribute('aria-current', 'page');
      prim.appendChild(a);
    });
    row.appendChild(prim);

    /* 动作区带上 nav-actions 类：
       assets/baiju-core.js 的 dockHost() 按 nav.top .nav-actions → header .nav-actions → header
       的顺序找挂载点。新导航没有 nav.top，如果不给这个类名，它会退到 header，
       把「选身份 / 登录」芯片追加成导航的第三个子元素，压到分区条下面。
       带上之后芯片就落在动作区里，和搜索、主题、开始对话并排。 */
    var act = el('div', 'ccnav-act nav-actions');
    var sr = el('a', 'ib sr');
    sr.href = '/learn/';
    sr.setAttribute('aria-label', '全站搜索');
    sr.innerHTML = icon('search');
    /* 交给 search.js 的弹层，避免两套搜索逻辑并存。
       该脚本没加载的页面就退化为跳转，不会点了没反应。 */
    sr.addEventListener('click', function (e) {
      if (typeof window.ccowSearchOpen === 'function') {
        e.preventDefault();
        window.ccowSearchOpen();
      }
    });
    act.appendChild(sr);

    var th = el('button', 'ib');
    th.type = 'button';
    th.setAttribute('aria-label', '切换主题');
    th.innerHTML = '<span class="cc-theme-ics">' + icon('moon') + '<i class="cc-ic cc-ic-sun" data-ic="sun" aria-hidden="true"></i></span>';
    th.addEventListener('click', toggleTheme);
    act.appendChild(th);

    /* 2026-11-12：「讨论 / 对话」不再占一个大按钮，收成和设置一样的小尖角。
       点击直接唤起全站唯一悬浮助手，不跳第二个对话页、不新开第二套界面。 */
    var cta = el('button', 'cta cta-tip', icon('message-circle') + '<span class="tx">开始对话</span>');
    cta.type = 'button';
    cta.setAttribute('aria-label', '打开助手对话');
    cta.addEventListener('click', function () {
      var fab = document.querySelector('.bja-fab');
      if (fab) fab.click();
      else location.href = '/agent.html';
    });
    act.appendChild(cta);
    row.appendChild(act);

    var burger = el('button', 'ccnav-burger');
    burger.type = 'button';
    burger.setAttribute('aria-label', '打开菜单');
    burger.innerHTML = icon('menu');
    burger.addEventListener('click', openDrawer);
    row.appendChild(burger);

    h.appendChild(row);

    /* --- 第二层：当前域的分区条（只有在本域内才出现）--- */
    var sec = sectionsOf(DOMAIN);
    if (sec && sec.length) {
      var sub = el('nav', 'ccnav-sub');
      sub.setAttribute('aria-label', '分区导航 · ' + domainName(DOMAIN));
      var sin = el('div', 'ccnav-sub-in');
      var lb = el('span', 'lb', esc(domainName(DOMAIN)));
      sin.appendChild(lb);
      /* 归了域却没有分区条条目的分站（/book/、/linguavista/、/lab/、/novel/…）
         答不出「我在哪」。只在缺项时补一条当前页，不动任何已有菜单项。 */
      var hasCur = sec.some(function (s) { return normPath(s.href) === normPath(curPath) });
      if (!hasCur && DOMAIN) {
        var own = (document.title || '').split(/[·|]/)[0].trim().slice(0, 12) || '当前页';
        sec.push({ n: own, href: curPath, ic: 'home' });
      }
      var primaryHref = (MAP.primary.filter(function (p) { return p.k === DOMAIN; })[0] || {}).href || '';
      sec.forEach(function (s) {
        var a = el('a', '', icon(s.ic) + esc(s.n));
        a.href = s.href;
        /* 站内黑话加人话副标题：分区条是横向窄条，撑不下文字，
           用 title + aria-label 给 hover / 读屏；抽屉里另有完整可见副标题。 */
        if (s.d) {
          a.title = s.n + ' · ' + s.d;
          a.setAttribute('aria-label', s.n + '：' + s.d);
        }
        /* 域首页时主导航与分区条「概览」是同一个 URL，两套渐变 + 两个
           aria-current 属重复高亮；由主导航单独承担，分区条不再画。 */
        var same = normPath(s.href) === normPath(curPath);
        var dupPrimary = primaryHref && normPath(s.href) === normPath(primaryHref);
        if (same && !dupPrimary) a.setAttribute('aria-current', 'page');
        sin.appendChild(a);
      });
      sub.appendChild(sin);
      h.appendChild(sub);
    }
    return h;
  }

  function domainName(k) {
    for (var i = 0; i < MAP.primary.length; i++) if (MAP.primary[i].k === k) return MAP.primary[i].n;
    return '';
  }

  /* ======================= 四、移动端抽屉 ======================= */
  var drawer = null;
  function buildDrawer() {
    var d = el('div', 'ccdrawer');
    d.id = 'ccDrawer';
    d.setAttribute('role', 'dialog');
    d.setAttribute('aria-modal', 'true');
    d.setAttribute('aria-label', '站点菜单');
    var head = el('div', 'dh');
    head.innerHTML = '<span class="lg">' + markSvg('bjMkDrw') + '</span>' +
                     '<span class="t">' + esc(MAP.brand.name) + '</span>';
    var x = el('button', 'x', icon('x'));
    x.type = 'button';
    x.setAttribute('aria-label', '关闭菜单');
    x.addEventListener('click', closeDrawer);
    head.appendChild(x);
    d.appendChild(head);

    var body = el('div', 'db');

    /* 按「要做什么」给一条快捷分类带，避开站内黑话。
       只指向已验证存在的页面，不放假入口。 */
    var TAGS = [
      { n: '资讯',   href: '/feed/' },
      { n: '教程',   href: '/learn/tutorials/' },
      { n: '创作',   href: '/works/cases.html' },
      { n: '本地部署', href: '/learn/deploy.html' },
      { n: '副业赚钱', href: '/works/manju.html' }
    ];
    var tagRow = el('div', 'cctags');
    tagRow.appendChild(el('span', 'cctag-lb', '按需要找'));
    TAGS.forEach(function (t) {
      var a = el('a', 'cctag', esc(t.n));
      a.href = t.href;
      tagRow.appendChild(a);
    });
    body.appendChild(tagRow);

    MAP.primary.forEach(function (p) {
      var grp = el('div', 'grp');
      grp.appendChild(el('div', 'gl', esc(p.n) + ' · ' + esc(p.d)));
      var a = el('a', 'dl',
        icon(p.ic) + '<span>' + esc(p.n) + '<small>' + esc(p.d) + '</small></span>');
      a.href = p.href;
      if (p.k === DOMAIN) a.setAttribute('aria-current', 'page');
      grp.appendChild(a);

      /* 当前域的二级项直接展开在抽屉里，不再需要第二次点击 */
      if (p.k === DOMAIN) {
        sectionsOf(p.k).forEach(function (s) {
          var sa = el('a', 'dl', icon(s.ic) + '<span>' + esc(s.n) +
                      (s.d ? '<small>' + esc(s.d) + '</small>' : '') + '</span>');
          sa.href = s.href;
          if (s.d) sa.title = s.n + ' · ' + s.d;
          sa.style.paddingLeft = '26px';
          sa.style.fontSize = '14px';
          if (normPath(s.href) === normPath(curPath)) sa.setAttribute('aria-current', 'page');
          grp.appendChild(sa);
        });
      }
      body.appendChild(grp);
    });
    d.appendChild(body);
    return d;
  }

  function openDrawer() {
    if (!drawer) { drawer = buildDrawer(); document.body.appendChild(drawer); }
    drawer.classList.add('on');
    document.body.classList.add('ccnav-lock');
  }
  function closeDrawer() {
    if (drawer) drawer.classList.remove('on');
    document.body.classList.remove('ccnav-lock');
  }

  /* ======================= 五、主题切换 ======================= */
  function toggleTheme() {
    var b = document.body;
    var next = b.getAttribute('data-theme') === 'deep' ? 'cloud' : 'deep';
    b.setAttribute('data-theme', next);
    try { localStorage.setItem('ccowork.theme', next); } catch (e) {}
    /* 同步所有 <meta name="theme-color"> */
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', next === 'deep' ? '#030014' : '#F4F7FC');
  }

  /* ======================= 六、面包屑（可选自动生成） ======================= */
  /* ---------------- 页脚 ----------------
     全站 117 个页面统一在这里生成页脚，页面零维护。
     旧架构页（首页/404）由 ccowork.js 动态注入了自己的 site-footer，
     mount() 里会先把它摘掉再放这一份，确保全站只有统一页脚。 */
  function buildFooter() {
    var F = MAP.footer;
    var f = el('footer', 'ccfoot');
    f.setAttribute('role', 'contentinfo');

    var inner = el('div', 'ccfoot-in');

    var bc = el('div', 'cf-brand');
    var logo = el('a', 'cf-logo');
    logo.href = MAP.brand.home;
    logo.innerHTML = '<span class="lg">' + markSvg('bjMkFoot') + '</span>' +
                     '<span class="tx">' + esc(MAP.brand.name) + '</span>';
    bc.appendChild(logo);
    bc.appendChild(el('p', 'cf-tag', esc(F.tagline)));
    bc.appendChild(el('p', 'cf-claim', esc(F.claim)));
    inner.appendChild(bc);

    F.cols.forEach(function (c) {
      var nav = el('nav', 'cf-col');
      nav.setAttribute('aria-label', '页脚 · ' + c.n);
      nav.appendChild(el('div', 'cf-h', esc(c.n)));
      var ul = el('ul', 'cf-list');
      c.items.forEach(function (it) {
        var li = el('li');
        var a = el('a', '', esc(it.n));
        a.href = it.href;
        li.appendChild(a);
        ul.appendChild(li);
      });
      nav.appendChild(ul);
      inner.appendChild(nav);
    });

    f.appendChild(inner);

    /* 版权年份取当前年，不写死 —— 写死的年份每年都会过期一次，
       而"过期"正是企业官网页脚最常见、也最没必要的低级错误。 */
    var yr = '';
    try { yr = String(new Date().getFullYear()); } catch (e) {}
    var bar = el('div', 'cf-bar');
    bar.innerHTML = '<span>© ' + esc(yr) + ' ' + esc(MAP.brand.name) + '</span>' +
                    '<span class="cf-note">' + esc(F.note) + '</span>';
    f.appendChild(bar);

    if (F.disclaimer) {
      var dis = el('div', 'cf-dis', esc(F.disclaimer));
      f.appendChild(dis);
    }

    return f;
  }

  function buildCrumb() {
    var holder = document.querySelector('[data-cccrumb]');
    if (!holder) {
      /* 覆盖边界：只有 27 页手写过 [data-cccrumb]，其余页面连「我在哪 /
         怎么回去」都答不出。统一导航已挂载时自动补一个容器，紧跟 header
         之后；已有 .cccrumb 就复用，绝不叠第二条。 */
      var hdr = document.querySelector('header.ccnav');
      if (!hdr) return;
      var existing = document.querySelector('.cccrumb');
      holder = existing || document.createElement('div');
      if (!existing) {
        holder.className = 'cccrumb cccrumb-auto';
        if (hdr.nextSibling) document.body.insertBefore(holder, hdr.nextSibling);
        else document.body.appendChild(holder);
      }
      /* 标题首段有时就是品牌名本身（「ccowork · 作品库」），直接用会让
         面包屑末级显示成「ccowork」。跳过品牌段，取第一个真正描述页面的段。 */
      var tSegs = (document.title || '').split(/\s*[·|｜]\s*/)
        .map(function (x) { return x.trim() })
        .filter(function (x) { return x && !/^(ccowork|白驹\s*ccowork|白驹)$/i.test(x) });
      holder.setAttribute('data-cccrumb', (tSegs[0] || '当前页').slice(0, 40));
    }
    var title = holder.getAttribute('data-cccrumb') || document.title.split('·')[0].trim();
    var dn = domainName(DOMAIN);
    /* 页面里的面包屑常写成「域 / 页名」，而域本身也会被拼进来，
       结果是「首页 / 工具 / 工具 / 开源仓库」。这里先把重复的域前缀剥掉。 */
    if (dn && title !== dn) {
      var pre = title.match(/^([^\/]+?)\s*\/\s*/);
      if (pre && pre[1].trim() === dn) title = title.slice(pre[0].length).trim() || dn;
    }
    var html = '<a href="/">首页</a>';
    if (dn) {
      var dh = (MAP.primary.filter(function (p) { return p.k === DOMAIN; })[0] || {}).href || '#';
      html += '<span class="sep">/</span><a href="' + dh + '">' + esc(dn) + '</a>';
    }
    /* 末级是当前页：不可点，并用 aria-current="page" 声明位置（W3C G65）。
       每级祖先都是可点链接，这根面包屑就是子站点唯一的「返回上级」出口，
       不需要再叠一条「← 回总站」工具栏。 */
    html += '<span class="sep">/</span><span class="cur" aria-current="page">' + esc(title) + '</span>';
    /* 域首页的标题常与域名相同（学习/学习），去掉重复的那一段 */
    if (dn && title === dn) {
      html = '<a href="/">首页</a><span class="sep">/</span><span class="cur" aria-current="page">' + esc(dn) + '</span>';
    }
    /* 2026-11-25 修复：原来这里是 holder.className = 'cccrumb'，会把上面
       buildCrumb 给自动容器加的 cccrumb-auto 类整体覆盖掉 —— 于是失去
       max-width / margin:auto / 左右 gutter，面包屑贴到视口左边缘，
       首段「首页」被切掉半个字（实测 1440 与 390 都复现）。
       改为追加类，不清空已有类。 */
    holder.classList.add('cccrumb');
    holder.innerHTML = html;
  }

  /* ======================= 七、挂载 ======================= */
  /* 分区条「还有更多」提示。
     分区条是横向滚动的，但滚动条被隐藏了 —— 原状态下最后一格被硬切成半截，
     用户看不出右边还有内容（实测 390px 下溢出 32px，360px 下溢出 62px）。
     做法：两端各自按需渐隐 ——
       还能往左滚 → 左缘淡出；还能往右滚 → 右缘淡出；滚到头 → 该侧不留渐变。
     用 edge-l / edge-r 两个类，CSS 里按组合给三种渐变，避免两条 mask 互相覆盖。 */
  function bindSubEdge(root) {
    var scr = (root || document).querySelector('.ccnav-sub-in');
    if (!scr) return;
    var upd = function () {
      var max = scr.scrollWidth - scr.clientWidth;
      var x = Math.round(scr.scrollLeft);
      scr.classList.toggle('edge-l', x > 2);
      scr.classList.toggle('edge-r', max > 2 && x < max - 3);
    };
    scr.addEventListener('scroll', upd, { passive: true });
    window.addEventListener('resize', upd);
    window.addEventListener('orientationchange', upd);
    if (window.ResizeObserver) { try { new ResizeObserver(upd).observe(scr); } catch (e) {} }
    /* 字体加载完宽度会变，再算一次 */
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(upd).catch(function () {}); }
    upd();
  }

  function mount() {
    /* 主题：沿用 ccowork.js 的同一把 key，切换不打架。
       ?theme=deep / ?theme=cloud 可强制指定，便于分享与截图核对。 */
    if (!document.body.getAttribute('data-theme')) {
      var saved = '', forced = '';
      try { saved = localStorage.getItem('ccowork.theme') || ''; } catch (e) {}
      var m = /[?&]theme=(deep|cloud)/.exec(location.search);
      if (m) forced = m[1];
      document.body.setAttribute('data-theme', forced || saved || 'cloud');
    }
    /* 页脚：统一用这一份。
       首页、404 这类旧架构页由 ccowork.js 动态注入了 site-footer，
       这里先把它摘掉再放统一页脚，避免两套并存（验证脚本只认 footer.ccfoot）。
       新架构页与已剥离旧页脚的页面没有 legacy footer，摘这一步是空操作。 */
    var legacyFoot = document.querySelector(
      '.foot-inner, footer.foot, body > footer:not(.ccfoot), footer.site-footer'
    );
    if (legacyFoot) legacyFoot.parentNode.removeChild(legacyFoot);
    if (!document.querySelector('footer.ccfoot')) {
      document.body.appendChild(buildFooter());
    }

    /* 分站老框架条（inject-siteframe.py 注入的 .ccbar，170 页）与全站导航
       是两套全局导航：叠在一起就是两条顶栏、两套品牌写法（/ 白驹 ccowork）。
       按 BRAND.md §6.1「导航全站唯一、页面不得自建导航」收编：
       统一导航已提供「品牌回首页 + 五域 + 分区条 + 面包屑」，老细栏让位。
       必须放在 hasLegacyNav() 之前，旧架构页也不会残留两套。 */
    var legacyBar = document.querySelector('.ccbar');
    if (legacyBar && legacyBar.parentNode) legacyBar.parentNode.removeChild(legacyBar);

    /* 旧架构首页（/、/404）保留自己的 nav.top，但它的 .logo 容器里的
       .cc-mark 没有任何脚本填充，实际渲染成一个空白渐变方块。
       这里换成内联 SVG 标记，全站标识一致。 */
    var legacyLogo = document.querySelector(
      'nav.top .brand .logo, .top .brand .logo, header.site-head .brand .logo, .topnav .brand .logo'
    );
    if (legacyLogo && !legacyLogo.querySelector('svg')) {
      legacyLogo.innerHTML = markSvg('bjMkLegacy');
    }

    if (hasLegacyNav()) return;                 /* 旧页面：不动它的导航 */

    var h = buildHeader();
    document.body.insertBefore(h, document.body.firstChild);
    /* 兼容控制：给 body 留一个「已接入统一导航」的显式标记。
       原来所有分档样式都靠 :has() —— 不支持 :has() 的浏览器会整条丢弃规则，
       92px 空白断层与双顶栏会同时回归。类选择器全浏览器可用，
       @supports 里的 :has() 只作为「类来不及加」时的增强兜底。 */
    try { document.body.classList.add('has-ccnav') } catch (e) {}
    bindSubEdge(h);

    /* 新架构已有「双层导航 + 页内锚点」，旧的吸顶目录条会是第三条横条，
       而且它按旧导航高 62px 定位，正好压在新导航第二层上。
       打个标记由 CSS 隐藏，旧页面（没有 header.ccnav）不受影响。 */
    document.documentElement.classList.add('ccnav-on');

    buildCrumb();

    /* 新架构页面只引了本文件，因此缺两样全站能力：
         · module.js —— 外观设置（主题/壁纸/字体）、阅读模式、顶部进度条
         · search.js —— 全站搜索（Ctrl/⌘+K）
       旧页面自己引了这两个，检测到就跳过，不会重复加载。 */
    ensureDeps();

    /* 旧锚点滚动时别被双层导航挡住：56 + 46 = 102，留 8px 余量 */
    document.documentElement.style.scrollPaddingTop = '110px';

    /* ESC 关闭抽屉 */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrawer();
    });
    /* 转屏/放大到桌面尺寸时自动收起 */
    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) closeDrawer();
    });
  }

  /* 按需补齐全站依赖：只在「本文件是唯一入口」的新架构页生效。 */
  function ensureDeps() {
    function loaded(kw, probe) {
      if (document.querySelector('script[src*="' + kw + '"]')) return true
      try { return !!(probe && probe()) } catch (e) { return false }
    }
    function load(src) {
      var s = document.createElement('script')
      s.src = src
      s.async = false
      s.setAttribute('data-ccdeps', '1')
      document.head.appendChild(s)
    }
    if (!loaded('module.js', function () { return document.getElementById('modSettings') })) {
      load('/module.js?v=20261125a')
    }
    if (!loaded('search.js', function () { return window.ccowSearchOpen })) {
      load('/search.js')
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
