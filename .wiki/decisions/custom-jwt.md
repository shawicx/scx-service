# 架构决策: 自定义 JWT 实现

## 上下文

需要实现 Token 认证机制，决定使用自实现还是第三方库（如 `@nestjs/jwt`）。

## 选项

1. **@nestjs/jwt (jsonwebtoken)** — 社区标准，功能完整
2. **自定义 HMAC-SHA256** — 轻量实现，完全控制

## 决策

选择**自定义 HMAC-SHA256** 实现。

## 理由

- 项目需求简单（仅 userId + email），不需要 JWT 标准的全部能力
- 避免引入额外依赖
- Token 存储在 Redis 中，签名验证 + Redis 存在性双重校验
- 每用户同时只有一对有效 Token，天然支持单设备登录

## 影响

- Token 格式 `{base64(payload)}.{hmac}` 非标准 JWT，不能被通用 JWT 库解析
- Token 过期完全依赖 Redis TTL，不在 payload 中编码 exp
- 如需对接第三方系统验证 Token，需额外适配
