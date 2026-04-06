# 架构决策: Redis 存储 Token

## 上下文

JWT Token 需要存储和管理（刷新、登出、单设备限制）。

## 选项

1. **无状态 JWT** — 不存储，靠 payload 中的 exp 判断
2. **Redis 存储** — 有状态管理，支持主动失效
3. **数据库存储** — 持久化但性能较低

## 决策

选择 **Redis 存储**。

## 理由

- 支持主动登出（删除 Redis key）
- 支持单设备登录（同 userId 覆盖 Token）
- Token 刷新时旧 Token 立即失效
- Redis 天然支持 TTL，自动清理过期 Token
- 性能优于数据库方案

## 影响

- Redis 是必须依赖，不可降级
- 每次请求验证 Token 需要一次 Redis 查询
- Redis 不可用时所有认证请求将失败
