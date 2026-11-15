# 环球语堂（LinguaVista）开源方案复用调研报告

> 调研日期：2026-08-30
> 调研范围：GitHub 开源项目
> 目标：为「环球语堂」MVP 核心模块找到可直接复用的高质量开源组件

---

## 1. 总览：推荐清单一览表

| 模块 | 推荐项目 | Star 数 | 协议 | 集成难度 | 推荐程度 |
|------|---------|---------|------|---------|---------|
| **SRS 算法** | ts-fsrs（FSRS v5） | ~500 | MIT | 2/5 | 强烈推荐 |
| **SRS 算法（备选）** | supermemo（SM-2） | ~300 | MIT | 1/5 | 推荐 |
| **日语词汇** | OpenJLPT | - | CC BY-SA 4.0 | 1/5 | 强烈推荐 |
| **日语词汇（进阶）** | japanese-language-data | ~400 | 混合（CC BY-SA / CC0） | 3/5 | 推荐 |
| **英语词汇** | Google 10000 English | ~4.5k | CC BY 3.0 | 1/5 | 推荐 |
| **多语种例句** | Tatoeba | 数据开放 | CC BY 2.0 FR | 2/5 | 推荐 |
| **IndexedDB 封装** | Dexie.js | ~11k | Apache-2.0 | 1/5 | 强烈推荐 |
| **Service Worker** | Workbox | ~12.6k | MIT | 2/5 | 强烈推荐 |
| **聊天 UI（参考）** | chatbot-ui | ~33k | MIT | 3/5 | 推荐 |
| **聊天组件（轻量）** | Open Chat Widget | 较新 | MIT | 2/5 | 可参考 |
| **TTS 封装** | easy-speech | ~200 | MIT | 1/5 | 强烈推荐 |
| **TTS 多后端** | voipi | 较新 | MIT | 2/5 | 推荐 |
| **离线 ASR** | whisper.wasm | ~1.2k | MIT | 4/5 | 可参考 |

---

## 2. 分模块详细调研

### 2.1 SRS 间隔重复算法 / 闪卡系统

#### 2.1.1 ts-fsrs（强烈推荐）

- **项目名**：ts-fsrs
- **GitHub**：https://github.com/open-spaced-repetition/ts-fsrs
- **Star 数**：约 500+
- **最近更新**：活跃维护（2026 年仍在更新）
- **技术栈**：TypeScript monorepo（pnpm + turbo + vitest）
- **协议**：MIT

**核心功能**：
- 实现最新 FSRS v5 算法（Free Spaced Repetition Scheduler）
- 包含两个包：`ts-fsrs`（调度器）和 `@open-spaced-repetition/binding`（参数优化器）
- 支持四种评分：Again / Hard / Good / Easy
- 支持四种卡片状态：New / Learning / Review / Relearning
- 提供参数优化功能，可从用户复习历史中训练个性化参数
- 支持 fuzz（随机扰动，避免卡片扎堆）
- 提供 TypeDoc 完整 API 文档，含中文/日文 README

**代码质量评估**：
- 代码结构清晰，monorepo 管理规范
- 284 次提交，6 位贡献者
- 有完整的测试套件（vitest）
- CI/CD 完善（GitHub Actions）
- 官方 FSRS 组织维护，是 fsrs.js 的继任者（原 fsrs.js 已推荐迁移到 ts-fsrs）
- 多语言文档（英/中/日）

**可以直接复用的部分**：
- `ts-fsrs` 包：直接 `pnpm add ts-fsrs` 导入使用
- 核心函数：`fsrs()` 创建调度器、`createEmptyCard()` 创建新卡、`scheduler.repeat()` 预览所有评分结果、`scheduler.next()` 应用评分
- 类型定义：`Card`、`Rating`、`State`、`FSRSParameters` 等完整 TypeScript 类型
- 复习日志记录功能（review_log）

**可以参考的设计思路**：
- 卡片状态机设计（New → Learning → Review → Relearning）
- 预览模式（preview）：用户回答前即可看到所有评分的下次复习时间
- 参数优化器的设计思路（从用户历史数据训练个性化参数）
- 工作流图（ts-fsrs-workflow.drawio）展示状态流转

**集成难度**：2/5 — API 设计简洁，文档完善，TypeScript 类型友好

---

#### 2.1.2 supermemo（SM-2 算法，推荐）

- **项目名**：supermemo
- **GitHub**：https://github.com/VienDinhCom/supermemo
- **Star 数**：约 300+
- **最近更新**：2025 年 3 月（2.0.23 版本）
- **技术栈**：TypeScript
- **协议**：MIT

**核心功能**：
- 经典 SuperMemo 2（SM-2）算法的纯 TS 实现
- 极简 API：一个 `supermemo(item, grade)` 函数
- 三个核心参数：`interval`（间隔天数）、`repetition`（连续正确次数）、`efactor`（易度因子）
- 6 级评分（0-5）
- 支持浏览器（ESM）、Node.js（CJS/ESM）、Deno 多环境

**代码质量评估**：
- 代码量小，逻辑清晰，单函数实现
- 58 次提交，24 个版本发布，维护稳定
- 有完整的 README 和使用示例
- 作者亲自验证：用该库背了 10,000+ 英语单词
- 实现参考了原始 Delphi 源码，算法准确性有保障

**可以直接复用的部分**：
- `supermemo` 函数：一行代码导入使用
- `SuperMemoItem` 和 `SuperMemoGrade` 类型定义
- README 中的 Day.js 集成示例（计算 dueDate）

**可以参考的设计思路**：
- 极简 API 设计：一个纯函数，零依赖
- 数据结构与业务逻辑完全分离
- 多平台发布策略（npm + jsr + esm.sh）

**局限性**：
- SM-2 是 1980 年代的算法，效果不如现代 FSRS
- 不支持难度自适应参数优化
- 没有「学习中」「重新学习」等细分状态

**集成难度**：1/5 — 一个函数，零依赖

---

#### 2.1.3 ThinkCards（可参考 UI）

- **项目名**：ThinkCards
- **GitHub**：https://github.com/vs-front-end/think-cards
- **Star 数**：较新项目
- **最近更新**：2026 年活跃
- **技术栈**：React 19 + TypeScript + TanStack Router
- **协议**：需确认

**核心功能**：
- 完整的闪卡应用，使用 FSRS 算法
- 卡片翻转动画
- 进度统计
- 卡组管理

**可以参考的设计思路**：
- 闪卡翻转交互设计
- FSRS 算法与 React 前端的集成方式
- 复习进度统计页面设计

**集成难度**：4/5 — 完整应用，需拆解复用

---

### 2.2 多语种词汇数据

#### 2.2.1 OpenJLPT（强烈推荐 — 日语）

- **项目名**：OpenJLPT
- **GitHub**：https://github.com/evanclan/OpenJLPT
- **Star 数**：较新项目
- **最近更新**：2025-2026 年活跃
- **数据格式**：JSON / CSV / SQLite
- **协议**：CC BY-SA 4.0

**核心功能**：
- 完整的 JLPT N5-N1 词汇和汉字数据
- 正确授权（properly licensed），来源清晰
- 提供 JSON、CSV、SQLite 三种格式
- 包含词汇、汉字、语法点数据
- 每条数据有详细的元数据（读音、释义、等级等）

**数据质量评估**：
- 明确声明数据来源和授权链
- 纠正了很多 JLPT 词汇列表授权混乱的问题
- 有 schema 验证，数据结构规范
- 提供脚本可重建数据

**可以直接复用的部分**：
- `data/` 目录下的 JSON/CSV/SQLite 文件
- N5-N1 分级词汇表（MVP 阶段可先用 N5-N3）
- 汉字数据（含读音、笔画数、等级）
- 数据 schema 定义

**协议注意事项**：
- CC BY-SA 4.0：可以商用，但需要署名（attribution），且衍生作品需以相同协议发布
- 如不希望前端代码也开源，需注意数据与代码的隔离

**集成难度**：1/5 — 直接下载数据文件使用

---

#### 2.2.2 japanese-language-data（推荐 — 日语进阶）

- **项目名**：japanese-language-data
- **GitHub**：https://github.com/jkindrix/japanese-language-data
- **Star 数**：约 400+
- **最近更新**：2024-2025 年活跃（166 次提交）
- **数据格式**：JSON
- **协议**：混合协议（各数据源保留原有协议）

**核心功能**：
- 聚合多个优质日语开放资源，交叉关联
- 包含：词汇（JMdict）、汉字（Kanjidic）、例句（Tatoeba）、语法等
- 25,980 条精选日英例句对（来自 Tatoeba）
- 有 schema 验证，数据质量高
- 可重现构建（reproducible build）

**数据质量评估**：
- 数据来源权威（JMdict、Kanjidic、Tatoeba）
- 交叉关联，条目级整合
- 有完整的构建脚本和验证流程
- 文档详细，数据字典清晰

**可以直接复用的部分**：
- `data/corpus/sentences.json` — 2.6 万条日英例句
- `data/dictionary/` — 词典数据（JMdict 衍生）
- `data/kanji/` — 汉字数据
- 数据 schema 定义（schemas/ 目录）

**协议注意事项**：
- 混合协议，各数据源保留原协议
- JMdict 为 CC BY-SA 3.0，Tatoeba 为 CC BY 2.0 FR
- 需保留各数据源的版权声明

**集成难度**：3/5 — 数据量大，需选择性使用

---

#### 2.2.3 Google 10000 English（推荐 — 英语）

- **项目名**：google-10000-english
- **GitHub**：https://github.com/first20hours/google-10000-english
- **Star 数**：约 4.5k
- **最近更新**：较早，但数据稳定
- **数据格式**：纯文本（每行一个词）
- **协议**：数据部分 CC BY 3.0

**核心功能**：
- 基于 Google 万亿词语料库的 n-gram 频率分析
- 10,000 个最常用英语单词，按频率排序
- 有带词性标注的版本（20k words with POS tags）
- 有美式英语和英式英语两个版本

**数据质量评估**：
- 数据来源权威（Google N-gram 语料库）
- 被大量语言学习项目引用
- 缺点：只有单词列表，没有释义、音标、例句

**可以直接复用的部分**：
- `google-10000-english.txt` — 1 万高频词
- `google-10000-english-usa.txt` — 美式英语版本
- 可用作词汇筛选的频率基准

**协议注意事项**：
- 数据部分 CC BY 3.0，需署名
- 代码部分 MIT

**集成难度**：1/5 — 纯文本文件，直接读取

---

#### 2.2.4 Tatoeba（推荐 — 多语种例句）

- **项目名**：Tatoeba / Tatoeba Challenge
- **GitHub**：https://github.com/Helsinki-NLP/Tatoeba-Challenge
- **官方网站**：https://tatoeba.org
- **数据规模**：487 种语言，4,024 个语言对
- **协议**：CC BY 2.0 FR（法国版）

**核心功能**：
- 众包的多语种句子数据库
- 数百万条翻译对齐的句子对
- 支持音频（母语者朗读）
- 日语-英语句子对数量充足
- 可下载完整数据或通过 API 查询

**数据质量评估**：
- 社区驱动，质量参差不齐但整体可用
- 有审核机制
- 被大量 NLP 和语言学习项目使用
-  Helsinki-NLP 维护的 Challenge 版本做了数据清洗

**可以直接复用的部分**：
- 日英/英日句子对（用于例句）
- 句子音频（部分句子有母语者朗读）
- 可按难度/频率筛选句子

**协议注意事项**：
- CC BY 2.0 FR：可以商用，需署名
- 如使用用户贡献的音频，需额外注意肖像权/声音权

**集成难度**：2/5 — 数据量大，需筛选和预处理

---

#### 2.2.5 Free Dictionary API（可参考 — 英语词典）

- **项目名**：Free Dictionary API
- **GitHub**：https://github.com/ngocsangyem/freedictionaryapi
- **协议**：MIT
- **数据来源**：基于 Wiktionary 等开源词典

**核心功能**：
- 提供英语单词的定义、音标、词性、同义词、反义词
- 有音频发音
- REST API 形式，也可自托管

**可以直接复用的部分**：
- 可自托管 API 服务
- 词典数据格式参考

**局限性**：
- 在线 API 形式，不适合离线使用
- 数据量和质量不如专业词典

**集成难度**：3/5 — 需自托管或在线调用

---

### 2.3 PWA / 离线存储方案

#### 2.3.1 Dexie.js（强烈推荐 — IndexedDB 封装）

- **项目名**：Dexie.js
- **GitHub**：https://github.com/dexie/Dexie.js
- **Star 数**：约 11k
- **最近更新**：非常活跃（2,923 次提交，持续更新）
- **技术栈**：JavaScript / TypeScript
- **协议**：Apache-2.0

**核心功能**：
- IndexedDB 的极简封装，Promise-based API
- 支持所有现代浏览器 + Electron + Capacitor
- 内置响应式查询（liveQuery）— 数据变化时自动更新 UI
- 跨标签页同步
- 数据库版本管理和迁移
- 丰富的查询语法（类似 SQL 的链式调用）
- TypeScript 类型支持完善
- 可选 Dexie Cloud 同步服务（商业产品）

**代码质量评估**：
- 2,923 次提交，大量贡献者
- 被 10 万+ 网站和应用使用
- 文档极其完善（dexie.org 有完整教程和 API 文档）
- 有完整的测试套件
- 修复了各浏览器 IndexedDB 的各种 bug
- 活跃维护，issue 响应快

**可以直接复用的部分**：
- 整个库：`npm install dexie`
- 数据库定义和 schema 声明方式
- `liveQuery()` 响应式查询（如用 React 可配合 useLiveQuery hook）
- 版本迁移机制（db.version(1).stores({...})）
- 事务处理 API

**可以参考的设计思路**：
- 如何用简洁 API 封装复杂的 IndexedDB
- 响应式查询的实现模式
- 数据库版本升级的最佳实践

**集成难度**：1/5 — API 简洁，文档完善，入门友好

---

#### 2.3.2 Workbox（强烈推荐 — Service Worker）

- **项目名**：Workbox
- **GitHub**：https://github.com/GoogleChrome/workbox
- **Star 数**：约 12.6k
- **最近更新**：持续维护（Google Chrome Aurora 团队接手）
- **技术栈**：JavaScript / TypeScript（monorepo）
- **协议**：MIT

**核心功能**：
- Service Worker 工具库集合，PWA 开发标配
- 多种缓存策略：CacheFirst、NetworkFirst、StaleWhileRevalidate 等
- 预缓存（precaching）— 构建时生成资源清单
- 运行时缓存（runtime caching）— 按 URL 模式匹配
- 后台同步（Background Sync）
- 离线页面回退
- 与 Vite / Webpack / Rollup 等构建工具集成

**代码质量评估**：
- Google 官方维护，质量有保障
- 1,512 次提交，大量贡献者
- 文档完善（developer.chrome.com/docs/workbox/）
-  monorepo 结构，模块化设计
- 被广泛使用，是 PWA 领域的事实标准

**可以直接复用的部分**：
- `workbox-precaching` — 预缓存应用壳（App Shell）
- `workbox-routing` + `workbox-strategies` — 运行时缓存策略
- `workbox-expiration` — 缓存过期管理
- `workbox-build` / `vite-plugin-pwa` — 构建集成

**可以参考的设计思路**：
- 缓存策略的分类和适用场景
- Service Worker 的最佳实践
- 渐进式离线支持的实现路径

**集成难度**：2/5 — 概念稍多，但有 vite-plugin-pwa 等插件可一键集成

---

#### 2.3.3 vite-plugin-pwa（可参考 — 快速集成）

- **项目名**：vite-plugin-pwa
- **GitHub**：https://github.com/vite-pwa/vite-plugin-pwa
- **Star 数**：约 3.5k
- **协议**：MIT

**核心功能**：
- Vite 的零配置 PWA 插件
- 封装了 Workbox，提供更简洁的 API
- 支持自动生成 Service Worker
- 支持开发环境调试
- 自动生成 manifest.json

**可以参考的设计思路**：
- 如何快速为 Vite 项目添加 PWA 支持
- Service Worker 的开发调试工作流

**集成难度**：1/5 — 几乎零配置

---

### 2.4 AI 对话 UI 组件

#### 2.4.1 chatbot-ui（推荐 — 设计参考）

- **项目名**：chatbot-ui
- **GitHub**：https://github.com/mckaywrigley/chatbot-ui
- **Star 数**：约 33k
- **最近更新**：2026 年仍活跃（209 次提交）
- **技术栈**：Next.js + React + TypeScript + TailwindCSS
- **协议**：MIT

**核心功能**：
- 完整的 AI 聊天界面应用
- 流式响应（streaming）
- Markdown 渲染（react-markdown）
- 代码高亮
- 对话历史管理
- 多模型支持
- 文件夹分类
- 提示词模板
- 深色/浅色主题

**代码质量评估**：
- 33k stars，社区认可度极高
- 代码结构清晰，组件化设计
- UI 设计质量高，交互流畅
- 有完整的功能实现，可作为设计蓝本

**可以直接复用的部分**：
- `components/messages/` — 消息组件设计
- `components/chat/` — 聊天主界面布局
- 流式输出的实现方式（`useChat` hook 模式）
- Markdown + 代码高亮的渲染方案
- 输入框组件设计（支持多行、快捷键发送）

**可以参考的设计思路**：
- 侧边栏对话列表 + 主聊天区的经典布局
- 消息气泡的视觉设计
- 流式输出的打字机动效
- 对话设置/模型选择的交互模式

**局限性**：
- 是完整应用，不是组件库，需拆解复用
- 依赖 Next.js 全栈，不能直接 import

**集成难度**：3/5 — 需拆解组件和样式

---

#### 2.4.2 Open Chat Widget（可参考 — 嵌入式组件）

- **项目名**：Open Chat Widget
- **GitHub**：https://github.com/Open-Chat-Widget/openchatwidget
- **Star 数**：较新项目
- **最近更新**：2026 年 3 月
- **技术栈**：原生 JavaScript（无框架依赖）
- **协议**：MIT

**核心功能**：
- 可嵌入任何网站的 AI 聊天小部件
- 支持流式输出
- 支持多模型提供商（OpenAI、Anthropic、Gemini、Ollama 等）
- 附件支持（图片、PDF）
- MCP 支持
- 工具调用渲染
- 零依赖，CDN 引入即用

**代码质量评估**：
- 项目较新，功能较完整
- 设计理念好：后端 agent 与前端 UI 分离
- 有示例和文档

**可以直接复用的部分**：
- 流式输出的前端实现
- 消息气泡组件
- 工具调用（tool call）的 UI 呈现
- 附件上传和展示

**可以参考的设计思路**：
- 聊天小部件的嵌入模式
- 后端无关的前端聊天架构
- 工具调用的可视化设计

**集成难度**：2/5 — 组件化程度较高

---

#### 2.4.3 SvelteChatKit（可参考）

- **项目名**：SvelteChatKit
- **GitHub**：https://github.com/kristofers322/SvelteChatKit
- **技术栈**：Svelte 5 + SvelteKit 2
- **协议**：MIT

**核心功能**：
- Svelte 生态的 AI 聊天 UI
- 支持任何后端（OpenAI、Ollama、Dify 等）
- token-by-token 流式输出
- Markdown 渲染
- 对话历史

**可以参考的设计思路**：
- 轻量级聊天组件的架构
- 流式输出的 Svelte 实现方式

**集成难度**：3/5 — Svelte 技术栈，如项目用 React 需改写

---

### 2.5 语音相关（TTS / ASR）

#### 2.5.1 easy-speech（强烈推荐 — TTS 封装）

- **项目名**：Easy Speech
- **GitHub**：https://github.com/leaonline/easy-speech
- **Star 数**：约 200+
- **最近更新**：活跃（370 次提交）
- **技术栈**：JavaScript
- **协议**：MIT

**核心功能**：
- Web Speech API（speechSynthesis）的跨浏览器封装
- Promise / async-await API
- 自动检测和加载可用语音
- 修复了各浏览器的大量兼容问题
- 支持所有事件钩子（start、end、pause、resume、error 等）
- 支持音量、语速、音调调节
- 支持语音选择（按语言、性别筛选）

**代码质量评估**：
- 370 次提交，维护活跃
- 有完整的测试套件
- API 文档完善（API.md）
- 专门解决浏览器兼容性问题，踩坑经验丰富
- issue 响应积极

**可以直接复用的部分**：
- 整个库：`npm install easy-speech`
- `EasySpeech.speak(text, options)` — 朗读文本
- `EasySpeech.voices` — 获取可用语音列表
- `EasySpeech.pause() / resume() / cancel()` — 播放控制
- 浏览器兼容性修复逻辑

**可以参考的设计思路**：
- 如何优雅地封装浏览器原生 API 的兼容性问题
- TTS 播放状态管理
- 语音列表加载和缓存策略

**局限性**：
- 依赖浏览器内置 TTS 引擎，音质取决于系统
- 不同浏览器/操作系统的语音质量差异大
- 离线可用，但音质不如云端 TTS

**集成难度**：1/5 — API 简洁，开箱即用

---

#### 2.5.2 voipi（推荐 — 多后端 TTS）

- **项目名**：voipi
- **GitHub**：https://github.com/pithings/voipi
- **Star 数**：较新项目
- **技术栈**：JavaScript
- **协议**：MIT

**核心功能**：
- 通用 TTS 库，支持多个后端
- 后端包括：Browser TTS、macOS say、Edge TTS、Google TTS、Piper、KittenTTS、eSpeak NG
- 自动选择最佳可用后端
- 自动语言检测
- 无需 API key（大部分后端）
- 纯 JS API

**可以直接复用的部分**：
- 多后端 TTS 抽象层设计
- 自动 fallback 机制
- 语言检测逻辑

**可以参考的设计思路**：
- TTS 多后端适配的架构设计
- 平台检测和能力降级策略

**集成难度**：2/5 — 封装良好，但部分后端需要额外资源

---

#### 2.5.3 whisper.wasm（可参考 — 离线 ASR）

- **项目名**：whisper.wasm
- **GitHub**：https://github.com/Timur00Kh/whisper.wasm
- **Star 数**：约 1.2k
- **最近更新**：2026 年 6 月（88 次提交）
- **技术栈**：TypeScript + WebAssembly（whisper.cpp）
- **协议**：MIT

**核心功能**：
- 浏览器端离线语音识别
- 基于 OpenAI Whisper 模型（通过 whisper.cpp 编译为 WASM）
- 多语言支持
- 流式转录（Streaming API）
- TypeScript 封装
- 有完整的 demo

**代码质量评估**：
- 代码结构清晰，TypeScript 类型完善
- 有 demo 目录，可参考集成方式
- CI/CD 完善
- 文档较完整

**可以直接复用的部分**：
- WASM 加载和初始化逻辑
- 音频采集和转换（AudioConverter）
- 流式转录的实现方式
- demo 中的完整集成示例

**可以参考的设计思路**：
- 如何在浏览器中集成 WASM ML 模型
- 流式语音识别的前端架构
- 音频处理流水线设计

**局限性**：
- 模型文件较大（tiny 模型约 75MB，base 约 142MB）
- WASM 性能不如原生，转录速度较慢
- 移动端性能可能不足
- 内存占用较高

**集成难度**：4/5 — WASM 集成复杂，模型加载需处理，性能优化挑战大

---

#### 2.5.4 Web Speech API 原生方案（MVP 首选）

- **技术**：浏览器原生 SpeechRecognition API
- **兼容性**：Chrome / Edge 支持较好，Safari 部分支持，Firefox 不支持
- **协议**：浏览器内置，无协议问题

**核心功能**：
- 浏览器原生语音识别
- 无需安装额外库
- 支持连续识别和 interim 结果
- 支持多语言

**优缺点**：
- 优点：零依赖、集成简单、性能好
- 缺点：兼容性差、需联网、隐私问题（数据发到 Google/Microsoft 服务器）

**集成难度**：1/5 — 直接调用浏览器 API

---

## 3. MVP 阶段推荐组合

基于以上调研，为「环球语堂」MVP 阶段推荐以下技术组合：

### 3.1 核心算法层

| 用途 | 推荐方案 | 理由 |
|------|---------|------|
| SRS 算法 | **ts-fsrs** | 最先进的 FSRS v5 算法，MIT 协议，TypeScript 原生，文档完善，官方维护 |
| 备选算法 | supermemo（SM-2） | 如 FSRS 过于复杂，可用 SM-2 快速上线，后期迁移到 FSRS |

### 3.2 数据层

| 用途 | 推荐方案 | 理由 |
|------|---------|------|
| 日语词汇 | **OpenJLPT** | JLPT 分级清晰，JSON/SQLite 格式，授权明确，开箱即用 |
| 英语词汇 | **Google 10000 English** | 频率排序，数据量适中（1 万词），CC BY 协议 |
| 日英例句 | **Tatoeba（精选子集）** | 数百万句对，筛选常用 1 万条即可，CC BY 协议 |
| 日语词典 | japanese-language-data（JMdict 子集） | 数据质量高，释义完整 |
| 英语释义 | Free Dictionary API（自托管或在线调用） | 补充英语词汇的音标、词性、释义 |

**数据整合建议**：
- MVP 阶段先做日语 N5-N3 + 英语 Top 3000 词
- 每个词条包含：单词、音标/假名、词性、中文释义、1-2 个例句
- 数据以 JSON 格式打包，IndexedDB 本地存储

### 3.3 存储层

| 用途 | 推荐方案 | 理由 |
|------|---------|------|
| 本地数据库 | **Dexie.js** | IndexedDB 事实标准，API 简洁，响应式查询，文档完善 |
| 离线缓存 | **Workbox** | Google 官方，PWA 标配，与 Vite 集成方便（vite-plugin-pwa） |

### 3.4 UI 层

| 用途 | 推荐方案 | 理由 |
|------|---------|------|
| 闪卡 UI | 自研 + 参考 ThinkCards/chatbot-ui | 闪卡交互相对简单，自研成本低，可参考开源项目的动效设计 |
| 聊天 UI | 自研 + 参考 chatbot-ui / Open Chat Widget | 流式输出、Markdown 渲染等可参考开源实现，主体自研 |
| 流式输出 | 自研 + 参考 chatbot-ui 实现 | Web Streams API + 逐字渲染，参考成熟实现 |

### 3.5 语音层

| 用途 | 推荐方案 | 理由 |
|------|---------|------|
| TTS（MVP） | **easy-speech**（封装 Web Speech API） | 零成本，离线可用，跨浏览器兼容，满足 MVP 需求 |
| TTS（未来升级） | 云端 TTS API（如 Azure / 讯飞） | 音质更好，需付费，但用户体验更佳 |
| ASR（MVP） | Web Speech API（SpeechRecognition） | Chrome/Edge 可用，零成本，满足基础语音输入需求 |
| ASR（未来升级） | whisper.wasm 或云端 ASR | 离线/隐私场景用 whisper.wasm，高质量场景用云端 API |

---

## 4. 集成路线图

### Phase 1：基础骨架（第 1-2 周）

1. **项目初始化**
   - 创建 Vite + TypeScript 项目
   - 配置 TailwindCSS（或其他 CSS 方案）
   - 配置路由

2. **PWA 基础**
   - 集成 `vite-plugin-pwa`（基于 Workbox）
   - 配置预缓存策略
   - 添加 manifest.json
   - 验证离线可用性

3. **本地数据库**
   - 集成 Dexie.js
   - 设计数据库 schema（cards、decks、reviews、settings）
   - 实现基础 CRUD 操作

### Phase 2：核心学习功能（第 3-4 周）

4. **SRS 算法集成**
   - 集成 ts-fsrs
   - 实现卡片复习流程
   - 实现复习日志记录
   - 编写单元测试验证算法正确性

5. **闪卡 UI**
   - 实现卡片翻转动画
   - 实现评分按钮（Again/Hard/Good/Easy）
   - 实现复习进度统计
   - 参考 ThinkCards 的交互设计

6. **词汇数据导入**
   - 导入 OpenJLPT N5-N3 词汇
   - 导入 Google 3000 英语高频词
   - 导入精选 Tatoeba 例句
   - 实现数据初始化和 IndexedDB 存储

### Phase 3：AI 对话功能（第 5-6 周）

7. **聊天 UI**
   - 实现聊天界面布局（参考 chatbot-ui）
   - 实现消息气泡组件
   - 实现 Markdown + 代码高亮渲染
   - 实现输入框（多行、快捷键发送）

8. **流式输出**
   - 实现 SSE / WebSocket 流式响应
   - 实现打字机动效
   - 参考 chatbot-ui / Open Chat Widget 的实现

9. **AI 对话后端对接**
   - 对接 LLM API（如 Claude / GPT）
   - 实现对话历史管理
   - 实现提示词模板（词汇讲解、例句生成等）

### Phase 4：语音功能（第 7 周）

10. **TTS 集成**
    - 集成 easy-speech
    - 实现单词/例句朗读功能
    - 实现语音播放控制（播放/暂停/停止）
    - 支持语速调节

11. **ASR 基础（可选）**
    - 集成 Web Speech API（SpeechRecognition）
    - 实现语音输入功能
    - 注意浏览器兼容性提示

### Phase 5：优化与完善（第 8 周）

12. **数据同步（可选）**
    - 设计数据导出/导入功能
    - 或集成 Dexie Cloud（如需要云端同步）

13. **性能优化**
    - IndexedDB 查询优化
    - 首屏加载优化
    - 包体积优化

14. **测试与 Bug 修复**
    - 端到端测试
    - 兼容性测试
    - 性能测试

---

## 5. 协议合规注意事项

### 5.1 各项目协议汇总

| 项目 | 协议 | 商用 | 署名 | 衍生开源 |
|------|------|------|------|---------|
| ts-fsrs | MIT | 是 | 否 | 否 |
| supermemo | MIT | 是 | 否 | 否 |
| Dexie.js | Apache-2.0 | 是 | 是（ NOTICE 文件） | 否 |
| Workbox | MIT | 是 | 否 | 否 |
| easy-speech | MIT | 是 | 否 | 否 |
| whisper.wasm | MIT | 是 | 否 | 否 |
| chatbot-ui | MIT | 是 | 否 | 否 |
| Open Chat Widget | MIT | 是 | 否 | 否 |
| voipi | MIT | 是 | 否 | 否 |
| OpenJLPT | CC BY-SA 4.0 | 是 | 是 | 是（数据部分） |
| japanese-language-data | 混合（CC BY-SA 3.0 / CC BY 2.0 FR） | 是 | 是 | 是（数据部分） |
| Google 10000 English | CC BY 3.0（数据） | 是 | 是 | 否 |
| Tatoeba | CC BY 2.0 FR | 是 | 是 | 否 |

### 5.2 关键合规要点

**1. MIT / Apache-2.0 代码库**
- 可以自由商用、修改、分发
- 需要保留原始版权声明和许可证文本
- Apache-2.0 还需要保留 NOTICE 文件（如有）
- 不需要开源自己的代码

**2. CC BY 数据（Google 10000、Tatoeba）**
- 可以商用
- 必须署名（attribution）
- 署名方式：在应用的「关于」页面或数据来源说明页面列出数据来源和协议
- 示例：「英语词汇数据基于 Google N-gram 语料库（CC BY 3.0）」

**3. CC BY-SA 数据（OpenJLPT、JMdict）**
- 可以商用
- 必须署名
- **相同方式共享**：如果对数据进行修改或衍生，衍生数据也必须以 CC BY-SA 协议发布
- **重要**：CC BY-SA 仅适用于数据本身，不适用于使用数据的软件代码
- 建议：数据与代码严格分离，数据文件保留原协议声明

**4. 合规实践建议**

- 在应用中添加「数据来源」或「关于开源」页面，列出所有使用的开源项目和数据
- 代码中保留第三方库的许可证信息（可通过工具自动生成）
- 数据文件中保留原始版权和协议声明
- 如对 CC BY-SA 数据进行了修改，需明确说明修改内容，并以相同协议发布修改后的数据
- 定期审查依赖项的协议变化
- 如有疑问，咨询专业法务

### 5.3 协议风险等级

| 风险等级 | 项目 | 说明 |
|---------|------|------|
| 低风险 | ts-fsrs、Dexie.js、Workbox、easy-speech、chatbot-ui | MIT / Apache-2.0，宽松协议 |
| 中风险 | OpenJLPT、japanese-language-data、Tatoeba | CC BY / CC BY-SA，需署名，数据需注意相同方式共享 |
| 需关注 | whisper.wasm | MIT 协议，但 Whisper 模型本身的协议需确认 |

---

## 附录：快速链接

### SRS 算法
- ts-fsrs: https://github.com/open-spaced-repetition/ts-fsrs
- supermemo: https://github.com/VienDinhCom/supermemo
- FSRS 算法说明: https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler

### 词汇数据
- OpenJLPT: https://github.com/evanclan/OpenJLPT
- japanese-language-data: https://github.com/jkindrix/japanese-language-data
- Google 10000 English: https://github.com/first20hours/google-10000-english
- Tatoeba: https://tatoeba.org
- Tatoeba Challenge: https://github.com/Helsinki-NLP/Tatoeba-Challenge
- Free Dictionary API: https://github.com/ngocsangyem/freedictionaryapi

### PWA / 存储
- Dexie.js: https://github.com/dexie/Dexie.js
- Workbox: https://github.com/GoogleChrome/workbox
- vite-plugin-pwa: https://github.com/vite-pwa/vite-plugin-pwa

### 聊天 UI
- chatbot-ui: https://github.com/mckaywrigley/chatbot-ui
- Open Chat Widget: https://github.com/Open-Chat-Widget/openchatwidget
- SvelteChatKit: https://github.com/kristofers322/SvelteChatKit

### 语音
- easy-speech: https://github.com/leaonline/easy-speech
- voipi: https://github.com/pithings/voipi
- whisper.wasm: https://github.com/Timur00Kh/whisper.wasm

---

*报告结束*
