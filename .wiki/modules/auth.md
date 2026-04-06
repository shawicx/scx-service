# Auth 认证模块

> 路径: `src/modules/auth/`

## 认证机制

### JWT 双 Token

项目自行实现 JWT（未使用第三方 JWT 库），通过 `crypto.createHmac('sha256', JWT_SECRET)` 签名。

| Token 类型    | 有效期 | Redis Key                |
| ------------- | ------ | ------------------------ |
| Access Token  | 2 小时 | `access_token:{userId}`  |
| Refresh Token | 7 天   | `refresh_token:{userId}` |

Token 格式: `{base64(payload)}.{hmac_signature}`

payload 包含: `{ userId, email, type: 'access'|'refresh', timestamp }`

### Token 刷新流程

1. 客户端用 Refresh Token 调用 `/api/users/refresh-token`
2. 验证 Refresh Token 签名 + Redis 存在性
3. 生成新的 Access Token + Refresh Token
4. 旧 Token 被覆盖（同 userId 的 Redis key 被更新）

### AES 密码加密

前端传输密码时使用临时 AES 密钥加密：

1. 前端调用 `GET /api/users/encryption-key` 获取 `{ key, keyId }`
2. 密钥有效期 **5 分钟**，存储在 Redis `encryption_key:{keyId}`
3. 前端用 AES 加密密码后随 keyId 一起提交
4. 后端从 Redis 取密钥解密

### 邮箱验证码

- 注册和登录均支持验证码方式
- 验证码有效期 **5 分钟**，存储在 User 实体的 `emailVerificationCode` + `emailVerificationExpiry` 字段
- 通过 Mail 模块发送

## 关键文件

| 文件                             | 职责                                |
| -------------------------------- | ----------------------------------- |
| `auth.service.ts`                | Token 生成/验证/刷新、加密密钥管理  |
| `auth.module.ts`                 | 模块注册，导出 AuthService          |
| `auth.guard.ts` (common/guards)  | 全局 JWT 守卫，`@Public()` 跳过鉴权 |
| `admin.guard.ts` (common/guards) | 管理员操作守卫                      |

## 注意事项

- Token 直接读取 `process.env.JWT_SECRET`，不通过 ConfigService
- 每个 userId 同一时间只有一对有效 Token（Redis key 唯一）
