# 故障排查

## 启动失败

### 数据库连接失败

- 检查 `.env` 中 `DB_HOST` / `DB_PORT` / `DB_USERNAME` / `DB_PASSWORD` / `DB_DATABASE`
- 确认 PostgreSQL 已启动且端口正确（默认 5433）
- 检查连接池配置：`database.config.ts` 中 `connectionTimeoutMillis: 2000`

### Redis 连接失败

- 检查 `.env` 中 `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD`
- 确认 Redis 已启动且端口正确（默认 6388）
- Redis 不可用会导致所有认证请求失败（Token 验证依赖 Redis）

### 端口被占用

- 默认端口 `3000`（`.env` 中 `PORT`）
- 可修改 `PORT` 环境变量

## 认证问题

### Token 无效或已过期

- Access Token 有效期 2 小时
- 用 Refresh Token 刷新（`POST /api/users/refresh-token`）
- Refresh Token 有效期 7 天
- 每次刷新会生成全新 Token 对

### 密码登录失败（解密失败）

- AES 密钥有效期仅 5 分钟
- 需要先调用 `GET /api/users/encryption-key` 获取新密钥
- `keyId` 必须与 `key` 配对使用

### 验证码无效

- 验证码有效期 5 分钟
- 每次发送新验证码会覆盖旧的

## AI 模块问题

### AI 请求失败

- 检查用户 `preferences.ai.providers.{provider}.apiKey` 是否配置
- 检查 AI Provider 的 Base URL 是否可达
- 查看错误码：`AiException` 和 `ai-error-code.enum.ts`

### AI 流式响应中断

- 检查网络连接和超时配置（`AI_TIMEOUT=30000`）
- SSE 端点: `GET /api/ai/completion/stream`

## 数据库问题

### TypeORM synchronize 报错

- 开发环境 `synchronize: true`，生产环境禁用
- Entity 变更后删除数据库重新同步（仅开发环境）
- 检查 Entity 装饰器和关系定义是否正确

### 软删除数据查不到

- TypeORM 的 `find` / `findOne` 默认不返回软删除记录
- User 实体使用 `@DeleteDateColumn`

## 代码质量问题

### ESLint 报错

- `pnpm run lint:fix` 自动修复大部分问题
- 规则集: `eslint-config-ali`

### 测试失败

- 确认路径别名配置：`jest.config.js` 中 `@/*` → `<rootDir>/*`
- 单测文件: `*.spec.ts`
