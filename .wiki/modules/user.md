# User 用户模块

> 路径: `src/modules/user/`

## 实体 (User)

主键: UUID，表名 `users`

| 字段                    | 类型                 | 说明                   |
| ----------------------- | -------------------- | ---------------------- |
| email                   | varchar(100), unique | 登录邮箱               |
| name                    | varchar(50)          | 用户名                 |
| password                | varchar(255)         | bcrypt 哈希            |
| emailVerified           | boolean              | 邮箱是否验证           |
| emailVerificationCode   | varchar(6), nullable | 验证码                 |
| emailVerificationExpiry | timestamp, nullable  | 验证码过期时间         |
| preferences             | json                 | 用户偏好（含 AI 配置） |
| lastLoginIp             | varchar(45)          | 最后登录 IP            |
| lastLoginAt             | timestamp            | 最后登录时间           |
| loginCount              | int                  | 登录次数               |
| isActive                | boolean              | 启用状态               |
| deletedAt               | timestamp, nullable  | 软删除                 |

### preferences 结构

```typescript
{
  theme: 'light' | 'dark' | 'auto',
  language: string,
  timezone: string,
  notifications: { email, push, sms },
  privacy: { profileVisible, showEmail, showLastSeen },
  ai?: {
    defaultProvider?: 'copilot' | 'glm' | 'qwen',
    providers?: { copilot?, glm?, qwen? }
  }
}
```

## 登录方式

1. **验证码登录**: `POST /api/users/login` — 邮箱 + 验证码
2. **密码登录**: `POST /api/users/login-password` — 邮箱 + AES 加密密码 + keyId

## 管理员操作

需要 `AdminGuard`，路由：

- `GET /api/users` — 分页查询用户列表
- `POST /api/users/create` — 直接创建用户（无需验证码）
- `DELETE /api/users` — 批量删除用户
- `PATCH /api/users/toggle-status` — 批量启用/禁用用户

## 关键文件

| 文件                      | 职责                                       |
| ------------------------- | ------------------------------------------ |
| `user.controller.ts`      | 路由定义，含角色/权限查询端点              |
| `user.service.ts`         | 业务逻辑                                   |
| `entities/user.entity.ts` | TypeORM 实体                               |
| `dto/*.ts`                | DTO 定义（注册、登录、查询、创建、删除等） |
