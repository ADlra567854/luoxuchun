# 本周 AI 大事记 · 自动化执行记忆

## 2026-08-31（首次执行）
- 运行 `scripts/gen-weekly.mjs`：news.js 共 12 条，近 7 天（8.25-8.31）全部收录 12 条。
- LLM 链路：智谱 GLM-4.7-Flash 429 限流 → 方舟豆包 doubao-seed-2-1-pro-260628 接手成功（thinking disabled）。
- 产出：blog/2026-08-31-本周AI大事记-2026年8月第5周.html（覆盖同日早前 10 条版本，更新为 12 条，含 Meta Llama 4 / OpenAI Omni-Agent）。
- 博文结构：blockquote 总览 + 4 个 h2（基础模型发布动态 / 开源生态进展 / 企业级产品与市场数据 / 本周观察）+ 出处声明 + SVG 封面，真实可核验。
- 同步：prepare-deploy.mjs 成功，deploy/blog/ 副本已更新（16KB），密钥注入断言通过。

## 经验
- 智谱免费模型高峰期常 429，脚本三级降级（智谱→豆包→DeepSeek）已自动兜底，无需干预。
- 博文文件名固定 `YYYY-MM-DD-本周AI大事记-YYYY年M月第N周.html`，同日多次运行会覆盖同名文件（期望行为，内容随 news.js 增量更新）。
