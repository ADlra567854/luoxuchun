/* 阅读书库数据源 · 白驹 ccowork
 * 由调研子代理整理（WebSearch 验证真实存在），出版/评分信息取自公开来源，抓取时点 2026-10-18。
 * 字段：id, cat(分类), title(中文), orig(原名), author, pub(出版社), year, isbn, why(为什么火/证据), tags(teacher/student/dev/plain)
 * 仅作展示数据源，不参与发布逻辑。
 */
window.BOOKS = [
  // 一、AI 通识科普
  {id:1,cat:"通识",title:"生命3.0",orig:"Life 3.0",author:"迈克斯·泰格马克",pub:"浙江教育出版社",year:2018,isbn:"9787553672786",why:"全球火爆的 AI 未来思考；登亚马逊 AI 榜首，入选2018中国30本好书。豆瓣8.3",tags:["plain","teacher","student"]},
  {id:2,cat:"通识",title:"第二次机器革命",orig:"The Second Machine Age",author:"布莱恩约弗森、麦卡菲",pub:"中信出版社",year:2014,isbn:"9787508647210",why:"数字时代经济变革必读；弗里德曼力荐。豆瓣7.6",tags:["plain","dev","teacher"]},
  {id:3,cat:"通识",title:"哥德尔、艾舍尔、巴赫",orig:"Gödel, Escher, Bach",author:"侯世达",pub:"商务印书馆",year:1997,isbn:"9787100013239",why:"普利策奖，被誉为「人工智能的圣经」。豆瓣9.4",tags:["plain","student","teacher"]},
  {id:4,cat:"通识",title:"奇点临近",orig:"The Singularity Is Near",author:"雷·库兹韦尔",pub:"机械工业出版社",year:2011,isbn:"9787111358893",why:"盖茨称作者「预测AI最厉害」；未来学里程碑。豆瓣7.6",tags:["plain","student"]},
  {id:5,cat:"通识",title:"人工智能",orig:"",author:"李开复",pub:"文化发展出版社",year:2017,isbn:"9787514217155",why:"国内大众 AI 启蒙畅销书。豆瓣约7.3",tags:["plain","teacher"]},
  {id:6,cat:"通识",title:"AI·未来",orig:"",author:"李开复",pub:"浙江人民出版社",year:2018,isbn:"9787213088858",why:"解析 AI 未来十年趋势，长期居 AI 畅销榜。豆瓣7.2",tags:["plain","teacher"]},
  {id:7,cat:"通识",title:"AI 未来进行式",orig:"",author:"李开复 / 陈楸帆",pub:"浙江人民出版社",year:2022,isbn:"9787213101625",why:"科幻+科普；文津图书奖推荐，刘慈欣/杨立昆/纳德拉联荐。豆瓣7.9",tags:["plain","teacher","student"]},
  {id:8,cat:"通识",title:"终极算法",orig:"The Master Algorithm",author:"佩德罗·多明戈斯",pub:"中信出版集团",year:2017,isbn:"9787508668673",why:"盖茨亲自推荐：「想了解人工智能，这本书值得一读」。豆瓣约7.2",tags:["plain","dev"]},
  {id:9,cat:"通识",title:"AI 3.0",orig:"Artificial Intelligence: A Guide for Thinking Humans",author:"梅拉妮·米歇尔",pub:"四川科学技术出版社",year:2021,isbn:"9787572700378",why:"《复杂》作者力作，侯世达逐章审读；厘清 AI 与人类智能边界",tags:["plain","student","teacher"]},
  // 二、机器学习 / 深度学习
  {id:10,cat:"ML",title:"深度学习（花书）",orig:"Deep Learning",author:"古德费洛、本吉奥、库维尔",pub:"人民邮电出版社",year:2017,isbn:"9787115461476",why:"深度学习奠基教材，含图灵奖得主。豆瓣9.4",tags:["dev","student"]},
  {id:11,cat:"ML",title:"机器学习（西瓜书）",orig:"",author:"周志华",pub:"清华大学出版社",year:2016,isbn:"9787302423287",why:"中文 ML 教科书开山之作，全国优秀教材一等奖。豆瓣8.6",tags:["dev","student","teacher"]},
  {id:12,cat:"ML",title:"统计学习方法（第2版）",orig:"",author:"李航",pub:"清华大学出版社",year:2019,isbn:"9787302517276",why:"ML 经典工具书，公式推导严谨。豆瓣9.3",tags:["dev","student"]},
  {id:13,cat:"ML",title:"动手学深度学习",orig:"",author:"阿斯顿·张、李沐 等",pub:"人民邮电出版社",year:2019,isbn:"9787115490841",why:"全球400+高校采用，可运行 Jupyter 交互教材。豆瓣9.3",tags:["dev","student"]},
  {id:14,cat:"ML",title:"深度学习入门（鱼书）",orig:"Deep Learning from Scratch",author:"斋藤康毅",pub:"人民邮电出版社",year:2018,isbn:"9787115485588",why:"公认「最适自学」深度学习入门。豆瓣9.5",tags:["dev","student","plain"]},
  {id:15,cat:"ML",title:"Python 深度学习（第2版）",orig:"Deep Learning with Python",author:"弗朗索瓦·肖莱",pub:"人民邮电出版社",year:2022,isbn:"9787115597175",why:"Keras 之父用代码讲透 DL，不用数学公式。豆瓣9.4",tags:["dev","student"]},
  {id:16,cat:"ML",title:"神经网络与深度学习（蒲公英书）",orig:"",author:"邱锡鹏",pub:"机械工业出版社",year:2020,isbn:"9787111649687",why:"复旦教授力作，周志华、李航联荐。豆瓣9.4",tags:["dev","student"]},
  {id:17,cat:"ML",title:"人工智能：现代方法（第4版）",orig:"Artificial Intelligence: A Modern Approach",author:"罗素、诺维格",pub:"人民邮电出版社",year:2022,isbn:"9787115598103",why:"AI 标准教材，1500+高校采用；第4版新增伦理专篇。豆瓣9.1",tags:["dev","student","teacher"]},
  {id:18,cat:"通识",title:"智慧的疆界：从图灵机到人工智能",orig:"",author:"周志明",pub:"人民邮电出版社",year:2018,isbn:"待核实",why:"时间线系统梳理 AI 七十年，科普与入门兼顾。豆瓣9.1",tags:["plain","student","teacher"]},
  // 三、编程入门
  {id:19,cat:"编程",title:"Python 编程：从入门到实践（第3版）",orig:"",author:"埃里克·马瑟斯",pub:"人民邮电出版社",year:2023,isbn:"9787115613639",why:"影响超250万读者，长期居编程类榜首。豆瓣9.2",tags:["plain","student","teacher"]},
  {id:20,cat:"编程",title:"算法导论（第3版）",orig:"Introduction to Algorithms",author:"Cormen 等",pub:"机械工业出版社",year:2012,isbn:"9787111407010",why:"算法界「天花板」CLRS 经典。豆瓣9.3",tags:["dev","student"]},
  {id:21,cat:"编程",title:"C 程序设计语言（第2版）",orig:"The C Programming Language",author:"Kernighan、Ritchie",pub:"机械工业出版社",year:2004,isbn:"9787111128069",why:"C 语言圣经，图灵奖作品。豆瓣9.4",tags:["dev","student"]},
  {id:22,cat:"编程",title:"代码大全（第2版）",orig:"Code Complete",author:"史蒂夫·麦康奈尔",pub:"电子工业出版社",year:2006,isbn:"9787121022982",why:"软件构建经典手册，译作30+语言。豆瓣9.3",tags:["dev","teacher"]},
  {id:23,cat:"编程",title:"计算机程序的构造和解释（第2版）",orig:"SICP",author:"Abelson、Sussman",pub:"机械工业出版社",year:2004,isbn:"9787111135104",why:"MIT 经典教材，全球百余所名校采用。豆瓣9.5",tags:["dev","student","teacher"]},
  {id:24,cat:"编程",title:"人月神话",orig:"The Mythical Man-Month",author:"小弗雷德里克·布鲁克斯",pub:"清华大学出版社",year:2023,isbn:"9787302635383",why:"软件工程永恒经典，「没有银弹」影响深远。豆瓣8.5",tags:["dev","teacher"]},
  // 四、AI 伦理与社会
  {id:25,cat:"伦理",title:"超级智能",orig:"Superintelligence",author:"尼克·波斯特洛姆",pub:"中信出版社",year:2015,isbn:"9787508650166",why:"AI 风险研究开山之作，马斯克/盖茨广泛讨论。豆瓣7.3",tags:["plain","student","teacher"]},
  {id:26,cat:"伦理",title:"算法霸权",orig:"Weapons of Math Destruction",author:"凯西·奥尼尔",pub:"中信出版社",year:2018,isbn:"9787508692067",why:"揭示「数学杀伤性武器」加剧偏见，数据伦理代表作。豆瓣7.2",tags:["plain","teacher"]},
  {id:27,cat:"伦理",title:"黑箱社会",orig:"The Black Box Society",author:"弗兰克·帕斯奎尔",pub:"中信出版社",year:2015,isbn:"9787508655208",why:"剖析 Google/亚马逊/Facebook 的隐秘算法与数据权力。豆瓣约7.1",tags:["plain","teacher"]},
  {id:28,cat:"伦理",title:"未来简史",orig:"Homo Deus",author:"尤瓦尔·赫拉利",pub:"中信出版社",year:2017,isbn:"9787508672069",why:"全球超级畅销书，畅想算法与 AI 重塑人类未来。豆瓣8.5",tags:["plain","teacher","student"]},
  // 五、大模型 / LLM
  {id:30,cat:"LLM",title:"这就是 ChatGPT",orig:"What Is ChatGPT Doing...",author:"斯蒂芬·沃尔夫勒姆",pub:"人民邮电出版社",year:2023,isbn:"9787115618085",why:"对 ChatGPT 原理解释最清楚的通俗读物，万维钢力荐。豆瓣7.4",tags:["plain","student","dev"]},
  {id:31,cat:"LLM",title:"AIGC：智能创作时代",orig:"",author:"杜雨、张孜铭",pub:"中译出版社",year:2023,isbn:"9787500173458",why:"系统梳理 AIGC 演进与落地，入选央视《读书》。豆瓣6.1",tags:["plain","dev","teacher"]},
  {id:32,cat:"LLM",title:"生成式人工智能",orig:"AIGC 的逻辑与应用",author:"丁磊",pub:"中信出版社",year:2023,isbn:"9787521755992",why:"基于产业实践讲透 Transformer/Diffusion 与商业落地。豆瓣6.6",tags:["plain","dev","teacher"]},
  {id:33,cat:"LLM",title:"大语言模型",orig:"",author:"赵鑫、李军毅、周昆、唐天一、文继荣",pub:"高等教育出版社",year:2024,isbn:"9787040634969",why:"国内首部系统讲解大模型构建的中文专著。豆瓣7.9",tags:["dev","student"]},
  // 六、AI + 行业
  {id:34,cat:"行业",title:"给孩子的人工智能通识课",orig:"",author:"三津村直贵",pub:"海峡书局",year:2022,isbn:"9787556708932",why:"面向青少年的图像化 AI 科普，图书馆少儿区流通广。豆瓣8.1",tags:["teacher","student","plain"]},
  {id:35,cat:"行业",title:"AI 极简经济学",orig:"Prediction Machines",author:"阿杰伊·阿格拉沃尔 等",pub:"湖南科学技术出版社",year:2018,isbn:"9787535799647",why:"用经济学框架把 AI 本质归结为「廉价预测」，Varian 推荐。豆瓣7.7",tags:["plain","dev","teacher"]},
  {id:36,cat:"行业",title:"深度医疗",orig:"Deep Medicine",author:"埃里克·托普",pub:"河南科学技术出版社",year:2020,isbn:"9787572501029",why:"顶级心脏科医生展望 AI 重塑诊断与医疗系统。豆瓣9.2",tags:["plain","teacher","student"]},
  {id:37,cat:"行业",title:"智能时代",orig:"",author:"吴军",pub:"中信出版社",year:2016,isbn:"9787508663814",why:"畅销百万册，全景解读大数据与机器智能重构社会。豆瓣8.4",tags:["plain","teacher","dev"]}
];
