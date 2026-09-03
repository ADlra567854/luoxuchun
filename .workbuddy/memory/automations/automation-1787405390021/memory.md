# AI 学院每日长章节 · 自动化执行记忆

## 2026-08-31（周一，首次运行）
- **主题**：ch31 开源视频生成实战：MiniMax-H3 全模态模型本地部署（8-29 权重开源，登顶 Artificial Analysis 视频编辑榜）
- **结果**：生成 1 章（8679B，h2×7）；首次生成 fetch failed，重试成功（网络抖动）
- **审查**：sources news 通过（176 页 0 问题）
- **门户**：PART 08 追加 ch31 卡片；progCount / tag / meta description 30→31；module.js TOTAL_CHAPTERS 30→31
- **部署**：prepare-deploy.mjs 同步成功（183.9MB，密钥注入 ✓，ch31 + 门户 + module.js 均已同步 deploy/website/）
- **注意**：deploy 目录下门户在 deploy/website/ 而非根目录；ch17-30 均已存在（此生成器每日只需跑一次 all 即可）

## 2026-09-01（周二）
- **主题**：ch33 端侧百万上下文实战：星火 X2.5 开源模型部署与 Agent 落地（科大讯飞词元星火 9-01 开源 Spark-X2.5-4B/1.7B，业界首个端侧原生 1M 上下文，Apache-2.0；来源：科技日报/南方+/AIBase，HF: XHToken/Spark-X2.5-4B，GitHub: XHToken/Spark-X2.5）
- **结果**：生成 1 章（9796B，h2×8）；ch32 已在数组中（与 ch33 构成端侧姊妹篇）
- **审查**：首轮未过（旧 blog「2026年8月AI变现实录」缺诚实标注）→ 补 `<section class="blog-attribution">出处声明` 后重跑通过（181 页 0 问题）
- **门户**：PART 07 追加 ch33 卡片（PART 03 已有 8 章，容量充足无需新增 PART）；描述补「星火 X2.5 百万上下文」；progCount / meta description 32→33；module.js TOTAL_CHAPTERS 32→33
- **部署**：prepare-deploy.mjs 同步成功（189.1MB，密钥注入 ✓，ch33 + 门户 + module.js 均同步 deploy/website/）
- **注意**：sources 审查是全站检查（181 页），旧页面缺标注也会导致不通过——发现即顺手修复该页并重跑；生成时正文已含「AI 生成 · 以官方为准」徽章与 XHToken/maas.xfyun.cn 真实来源

## 2026-09-02（周三）
- **主题**：ch35 开源多模态权重实战：DeepSeek-V4-Flash-Vision-Exp 本地部署与视觉 Agent（8-31/9-1 HF 开源 MIT 权重，305B/激活13B MoE 视觉模型，FP8 168GB/48 文件；来源：新浪/explainx/runtimewire/TechTimes，HF: deepseek-ai/DeepSeek-V4-Flash-Vision-Exp + unsloth GGUF）
- **结果**：生成 1 章（10366B，h2×8）；ch34 白天已生成，ch35 为当日新增
- **审查**：sources news 一次通过（185 页 0 问题）
- **门户**：PART 08 追加 ch35 卡片 + 描述补「开源多模态权重部署」；progCount/tag/meta+twitter description 34→35（meta 与 twitter:description 文案顺手对齐）；module.js TOTAL_CHAPTERS 34→35
- **部署**：prepare-deploy.mjs 同步成功（211.6MB，密钥注入 ✓，deploy/website/ 含 chapter-35.html + 门户「0 / 35 章」验证 ✓）
- **注意**：ch35 与 ch29（多模态 API）构成姊妹篇（API vs 开源权重部署），放 PART 08 与 ch31 同风格；编辑 module.js 前必须先 Read 文件
