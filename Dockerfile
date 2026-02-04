FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable
RUN corepack use pnpm@latest

COPY package.json pnpm-lock.yaml ./

# 安装所有依赖（包括 devDependencies，用于编译）
RUN pnpm install --frozen-lockfile

COPY . .

# 编译 TypeScript → dist
RUN pnpm run build

# 验证编译结果
RUN ls -la dist/ && test -f dist/src/main.js
FROM node:20-alpine AS production

WORKDIR /app

RUN corepack enable
RUN corepack use pnpm@latest

# 复��� package.json 和 lock 文件
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./

# 只安装生产依赖
RUN pnpm install --prod --frozen-lockfile

# 复制编译后的代码
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 3000

# 健康检查（可选但推荐）
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "dist/src/main"]
