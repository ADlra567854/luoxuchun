// 自学中心 · 真实案例 + 学习路线
// 全部为可验证的真实来源（文章/访谈原文链接），仅作索引跳转，不转存、不洗稿。
// 渲染页：website/study.html
window.STUDY_CASES = [
  // —— 自学编程 ——
  { cat: 'code', who: 'Syk Houdeib', title: '40 岁英语老师，10 个月零基础自学前端转行开发者', source: 'freeCodeCamp 中文', url: 'https://www.freecodecamp.org/chinese/news/how-i-switched-careers-and-got-a-developer-job-in-10-months-a-true-story/', lesson: '全职工作之余挤时间，靠免费资源 + GitHub 作品集拿到 offer。' },
  { cat: 'code', who: '阿May（化名）', title: '业余零基础自学 9 个月，成为软件工程师', source: 'CSDN 博客', url: 'https://blog.csdn.net/weixin_50829653/article/details/120755881', lesson: '每日目标 + 社区互动 + 尽早做开源，动力比天赋更重要。' },
  { cat: 'code', who: '朱帅', title: '从酒吧保安到年入百万企业高管：90 后小伙自学编程逆袭', source: '封面新闻', url: 'https://e.thecover.cn/shtml/hxdsb/20250620/231169.shtml', lesson: '四个月自学即投简历，从一线开发做到一号员工，技能要用于解决真实问题。' },
  { cat: 'code', who: 'Rahul', title: '大学辍学 → 5 年后高级软件工程师（无学位）', source: 'Prutor.ai', url: 'http://prutor.ai/blog/success-story-college-dropout-software-engineer', lesson: 'FreeCodeCamp + YouTube + 开源贡献，作品集比文凭更管用。' },
  { cat: 'code', who: 'Girges', title: '自学编程，拿到柏林某大厂全栈 offer（无计算机学位）', source: 'Imagine', url: 'https://www.joinimagine.com/i-m-a-self-taught-coder-here-s-how-i-got-a-job-in-berlin-', lesson: '侧项目 + GitHub 上传作品，初创公司更看重是否 fit 团队、能否产出。' },

  // —— UI 设计 ——
  { cat: 'ui', who: '工厂妹子（化名）', title: '从车间工厂妹子到中级 UI 设计师的自学之路', source: '优设网 UISDC', url: 'https://www.uisdc.com/designer-from-bottom-to-profession', lesson: '从抠图、临摹做起，逼自己教别人反而学透，作品才是敲门砖。' },
  { cat: 'ui', who: '小敏（宝妈）', title: '30 岁宝妈边带娃边学 UI，6 个月入职本地公司', source: '潜心学', url: 'https://m.qinxue365.com/jsjzx/Graphic_Design/595626.html', lesson: '每天娃睡后学 2 小时，两个虚拟项目作品集即可入职。' },
  { cat: 'ui', who: '飞屋睿 UIdesign', title: '非科班毕业，工作后自学设计软件，如今有自己的工作室', source: '优设网 UISDC', url: 'https://www.uisdc.com/?p=149147', lesson: '基础训练虽枯燥却是前提；接私单靠把设计说明写清楚赢得认同。' },

  // —— 网络安全 ——
  { cat: 'security', who: '黑客墨水（化名）', title: '25 岁机械行业转行网络安全，从未后悔', source: 'CSDN 博客', url: 'https://blog.csdn.net/hackeroink/article/details/149268596', lesson: '买书 + 边看边实操，在 SRC 平台挖漏洞拿奖励，行业对学历要求不高。' },
  { cat: 'security', who: 'm0_71745484', title: '从门外汉到守门人：我的网络安全自学故事', source: 'CSDN 博客', url: 'https://blog.csdn.net/m0_71745484/article/details/157939488', lesson: '先啃 TCP/IP 与 Linux，再刷 DVWA/SQLi-labs 靶场，OWASP Top10 当圣经。' },
  { cat: 'security', who: '老周（工地大哥）', title: '30 岁工地大哥零基础学网安，6 个月跳槽安全公司月薪 15K', source: '行业访谈', url: 'http://www.hqwc.cn/a/1825821.html', lesson: '用大白话入门，3 天搭出第一个靶场，只在授权平台玩、不碰法律红线。' },

  // —— 自学自动化（Python 办公） ——
  { cat: 'auto', who: '阳光如墨', title: 'Python 办公自动化：零基础 20 天接单 3200 元实操指南', source: '今日头条', url: 'https://www.toutiao.com/article/7626002474406511158/', lesson: 'pandas/openpyxl/requests 三库即可，需求理解能力决定成败。' },
  { cat: 'auto', who: 'Juno', title: '用 Python 搞副业：3 个不务正业项目每月多赚 5000', source: 'CSDN 博客', url: 'https://blog.csdn.net/Juno_for/article/details/159587424', lesson: '把脚本打包成 exe + 图文说明，交付感比技术牛更重要。' },
  { cat: 'auto', who: '老周（抖创汇）', title: '2026 用 Cursor + Python 做自动化办公，小白月入 8000+', source: '抖创汇', url: 'https://www.douchuanghui.com/thread-13683-1-9.html', lesson: 'AI 写代码降低门槛，从 Excel 批量处理小单起步，滚雪球到培训。' },

  // —— 软件设计 / 产品经理 ——
  { cat: 'pm', who: '好夕雷', title: '用 MVP 思维，0 基础快速转行产品经理', source: '人人都是产品经理', url: 'https://www.woshipm.com/?p=5873176', lesson: '写产品简历→疯狂面试→画原型迭代，最低成本验证可行性。' },
  { cat: 'pm', who: 'AI PM 作者', title: '转行 AI 产品经理，没经验真的不是问题', source: '人人都是产品经理', url: 'https://www.woshipm.com/?p=6304817', lesson: 'B站/论坛免费资源自学，边做边学 SQL 与 API，实习最快攒经验。' },
];

// 分类标签映射（与 STUDY_CASES.cat 对应）
window.STUDY_CATS = [
  { key: 'code', label: '自学编程' },
  { key: 'ui', label: 'UI 设计' },
  { key: 'security', label: '网络安全' },
  { key: 'auto', label: '自学自动化' },
  { key: 'pm', label: '软件设计 / 产品' },
];

// 学习路线：五条自学线，每线分阶段（原创路线建议，非承诺结果）
window.STUDY_ROADS = [
  { cat: 'code', icon: '💻', title: '自学编程（零基础 → 前端 / 全栈）', stages: [
    '打地基：HTML / CSS / JavaScript 基础，跟免费教程敲出第一个网页',
    '学框架：React 或 Vue，做一个完整的小项目练手',
    '攒作品集：3–5 个真实项目放 GitHub，比文凭更被面试官看重',
    '补算法与面试：刷 LeetCode、准备数据结构，应对技术面',
    '求职：海投 + 侧项目展示，初创公司更看产出而非学位',
  ] },
  { cat: 'security', icon: '🛡️', title: '网络安全（零基础 → 渗透 / 安全运维）', stages: [
    '网络基础：TCP/IP、HTTP，用 Wireshark 抓包理解三次握手',
    '拥抱 Linux：虚拟机装 Ubuntu，强迫自己用命令行',
    '刷靶场：DVWA、SQLi-labs、Upload-labs 反复练 OWASP Top10',
    '学工具：Burp Suite、nmap、sqlmap，精通一两个胜过记一百个名字',
    '合规实战：上补天 / 漏洞盒子提交漏洞，只在授权平台玩，不碰红线',
  ] },
  { cat: 'ui', icon: '🎨', title: 'UI 设计（零基础 → UI / 交互设计师）', stages: [
    '学工具：Figma / PS 基础操作，先会画线框图与标注说明',
    '练手感：每天临摹 1 个 App 界面，研究配色与排版网格',
    '做作品集：用真实需求做 2–3 个虚拟项目（如小程序改版）',
    '补理论：《用户体验要素》《点石成金》，理解交互与体验',
    '求职：把怎么和老板沟通需求写进作品集，面试更被看重',
  ] },
  { cat: 'pm', icon: '🧩', title: '软件设计 / 产品经理（零经验 → 产品岗）', stages: [
    '建框架：读《启示录》《用户体验要素》，学 Axure / Figma',
    '做竞品分析 + 写 PRD：挑常用 App 输出优化需求与原型',
    '攒作品集：模拟实战项目，完整复现需求→方案→效果',
    '找经验：实习或从运营 / 相邻岗切入，与 PM 协作转岗',
    '求职：用 STAR 法则讲项目，准备 3 个目标产品的改进建议',
  ] },
  { cat: 'auto', icon: '⚙️', title: 'Python 办公自动化（零基础 → 副业 / 提效）', stages: [
    '学基础：Python 语法 + pandas / openpyxl 三个核心库',
    '写脚本：Excel 合并、邮件群发、文件批量处理等刚需',
    '接单渠道：闲鱼 / 淘宝挂服务，猪八戒接企业单，小红书引流',
    '交付包装：PyInstaller 打包 exe + 图文说明书，降低客户门槛',
    '合规变现：只处理公开数据、签保密、不碰抢票 / 破解等雷区',
  ] },
];
