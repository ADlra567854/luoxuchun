# AI 创作纪元 · 云端部署镜像
# server.mjs 纯 Node 原生实现，生产运行零第三方依赖（无需 npm install）
FROM node:20-alpine

# 安全：非 root 用户运行
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# 拷贝全部站点文件（node_modules / 开发脚本 / 密钥 等已被 .dockerignore 排除）
COPY . .

# 安全：降低文件权限
RUN chown -R appuser:appgroup /app

USER appuser

ENV PORT=8787
ENV NODE_ENV=production
# 生产密钥通过部署平台环境变量注入，切勿写进镜像：
#   DEEPSEEK_API_KEY=sk-xxx   （白驹对话 / 代理 deepseek）
#   ARK_API_KEY=ark-xxx       （方舟生图 / 生视频）
#   ZHIPU_API_KEY=xxx         （智谱 glm-4.7-flash）

EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8787/healthz || exit 1

CMD ["node", "server.mjs"]
