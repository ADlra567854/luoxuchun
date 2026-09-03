# 每日 AI 工具库更新 · 执行记忆

## 2026-08-30（架构升级，须知）
- **gen-daily.mjs 已改为三级降级：智谱 GLM-4.7-Flash(免费) → 方舟豆包 → DeepSeek**。密钥从 .env 读 ZHIPU_API_KEY（当前为空占位）。老罗注册 open.bigmodel.cn 填入 key 后，每日任务 0 成本；key 未填/失效时自动走方舟，无需干预。
- 降级链已实测验证（假 key 401 → 自动切方舟成功）。运行日志特征：`🔑 LLM 渠道（优先级从高到低）：...`、降级时 stderr 出现 `⚠️ [... ] 失败，自动降级`，属正常，不卡任务。
- 一句话执行报告里可注明本次用的渠道（输出行「已由「XX」接手完成」即降级发生）。

## 2026-08-29
- gen-daily tools：更新 17 个 AI 工具的 deepdive 字段（4 类），lastUpdated=2026-08-29。API 用方舟豆包 seed 模型，正常返回。
- review-content sources：抽查 167 个内容页，诚实/出处标注 0 问题 → 审查通过。
- prepare-deploy：deploy/ 目录已同步（130.8 MB，含 index.html / ai-client.js 注入密钥 / website/_corpus.js）。
- 结论：更新 17 个工具；审查通过；deploy 同步成功。
