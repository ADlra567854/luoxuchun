# automation-1787319821277 · 白驹每日开源 AI 项目流水线

## 任务定义
1. `node scripts/gen-daily.mjs projects` → 追加新开源项目到 `data/ai-projects.json`
2. `node scripts/prepare-deploy.mjs` → 同步 `deploy/`
3. 一句话报告：追加了哪些项目 + deploy 是否同步成功

## 环境要点
- 工作目录：`C:\Users\35683\WorkBuddy\2026-08-21-20-57-16\ccowork-site\AI创作纪元\AI创作纪元`
- 密钥：`.env` 中 DeepSeek + ARK 均可用；projects 任务走 DeepSeek 通道
- 去重机制：脚本按项目名去重，重复项会被过滤，因此每次实际新增数可能少于 2-3 个
- 验证新增项目最快方式：`git diff data/ai-projects.json | grep "^+"`
- 验证 deploy 同步：读 `deploy/data/ai-projects.json`，比对总数并检查新项目名是否存在

## 执行记录

### 2026-08-30（首次执行）
- 追加 1 个新项目：**agno**（agno-agi/agno，轻量级生产级多模态 AI Agent 框架，heat 4）
- 项目总数：111 → 112
- prepare-deploy 成功：deploy 138.2 MB，密钥注入断言通过，deploy 副本已含 agno（total 112）
- 无报错，全流程一次通过

### 2026-08-30（第二次执行 · 10:06）
- `gen-daily.mjs projects` 返回「无新项目可加（可能重复）」：今天首次执行已追加 agno，去重后本次无新增项，属正常情况
- `prepare-deploy.mjs` 成功：deploy 138.5 MB，密钥注入断言通过；源与 deploy 副本均为 112 个项目，agno 已同步

### 2026-08-31（第三次执行 · 15:06）
- `gen-daily.mjs projects` 返回「无新项目可加（可能重复）」：智谱 GLM 429 降级至方舟豆包，去重后本次无新增项，属正常情况
- `prepare-deploy.mjs` 成功：deploy 148.1 MB，密钥注入断言通过；源与 deploy 副本均为 112 个项目，一致（true）

### 2026-09-01（第四次执行 · 17:17）
- 首跑 `gen-daily.mjs projects`：智谱 GLM 429 降级方舟豆包，返回「无新项目可加（可能重复）」；重试一次成功
- 追加 1 个新项目：**cognee**（topoteretes/cognee，AI Agent 开源记忆层，构建结构化可查询知识图谱，heat 4）
- 项目总数：112 → 113
- `prepare-deploy.mjs` 成功：deploy 183.9 MB，密钥注入断言通过；源与 deploy 副本均为 113 个项目、均含 cognee，一致（true）

### 2026-09-02（第五次执行 · 12:24）
- `gen-daily.mjs projects` 成功：智谱 GLM-4.7-Flash 免费通道直出，无降级，追加 2 个新项目：**cophire**（CohereForAI/cophire，稀疏专家模型，heat 5）、**OpenDevin**（OpenDevin/OpenDevin，自主软件工程 AI Agent，heat 5）
- 项目总数：113 → 115
- `prepare-deploy.mjs` 成功：deploy 193.3 MB，密钥注入断言通过；源与 deploy 副本均为 115 个项目、一致（true），cophire 与 OpenDevin 均已同步

### 2026-09-03（第六次执行 · 10:07）
- `gen-daily.mjs projects`：智谱 GLM 429 自动降级方舟豆包接手成功，追加 1 个新项目：**crawl4ai**（unclecode/crawl4ai，面向 AI Agent 与 RAG 管线的 LLM 友好开源网页爬虫，heat 5）
- 项目总数：115 → 116
- `prepare-deploy.mjs` 成功：deploy 305.6 MB，密钥注入断言通过（DeepSeek/ARK/ZHIPU 三通道均 ✓）；源与 deploy 副本均为 116 个项目、一致（true），crawl4ai 已同步
