# Mail / Cache / Health 模块

## Mail 邮件模块

> 路径: `src/modules/mail/`

基于 `@nestjs-modules/mailer` + Nodemailer + Handlebars 模板。

### 配置

| 环境变量      | 说明        |
| ------------- | ----------- |
| MAIL_HOST     | SMTP 服务器 |
| MAIL_PORT     | 端口        |
| MAIL_SECURE   | 是否 SSL    |
| MAIL_USER     | 用户名      |
| MAIL_PASSWORD | 授权码      |
| MAIL_FROM     | 发件人地址  |

### 模板

位于 `src/templates/`，Handlebars 格式：

| 模板              | 文件                    | 用途            |
| ----------------- | ----------------------- | --------------- |
| verification-code | `verification-code.hbs` | 注册/登录验证码 |
| password-reset    | `password-reset.hbs`    | 密码重置        |
| welcome           | `welcome.hbs`           | 欢迎邮件        |

## Cache 缓存模块

> 路径: `src/modules/cache/`

基于 Redis 的缓存服务封装（`CacheService`）。

### 核心方法

| 方法                                     | 说明                   |
| ---------------------------------------- | ---------------------- |
| `get(key)`                               | 获取缓存               |
| `set(key, value, ttl)`                   | 设置缓存（秒级 TTL）   |
| `setWithMilliseconds(key, value, ttlMs)` | 设置缓存（毫秒级 TTL） |
| `del(key)`                               | 删除缓存               |

### 缓存 Key 规范

定义在 `src/common/utils/cache-keys.constants.ts`：

| Key 模式                 | 用途          |
| ------------------------ | ------------- |
| `access_token:{userId}`  | Access Token  |
| `refresh_token:{userId}` | Refresh Token |
| `encryption_key:{keyId}` | AES 加密密钥  |

TTL 常量定义在 `src/common/utils/ttl.constants.ts`。

## Health 健康检查模块

> 路径: `src/modules/health/`

提供应用健康状态检查端点。

- `GET /api/health` — 返回数据库和 Redis 连接状态
