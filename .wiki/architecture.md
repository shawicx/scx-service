# 架构设计

## 目录结构

```
src/
├── main.ts                        # 启动入口
├── app/app.module.ts              # 根模块（全局守卫、过滤器、模块注册）
├── swagger-document.ts            # Swagger 文档生成
├── config/                        # 配置定义
│   ├── env.config.ts              # 应用 & Swagger 配置
│   ├── database.config.ts         # TypeORM / PostgreSQL
│   ├── redis.config.ts            # Redis 连接
│   ├── mail.config.ts             # 邮件 SMTP
│   ├── ai.config.ts               # AI 模块配置
│   └── logger.config.ts           # Winston 日志
├── common/                        # 公共组件
│   ├── decorators/                # @Public() 等自定义装饰器
│   ├── guards/                    # AuthGuard, AdminGuard
│   ├── filters/                   # HttpExceptionFilter, SystemExceptionFilter
│   ├── interceptors/              # LoggingInterceptor, TransformInterceptor
│   ├── exceptions/                # SystemException 自定义异常体系
│   └── utils/                     # 工具函数、常量（TTL、缓存 key、crypto）
├── modules/                       # 业务模块
│   ├── auth/                      # JWT 认证服务
│   ├── user/                      # 用户管理
│   ├── role/                      # 角色管理
│   ├── permission/                # 权限管理（树形）
│   ├── user-role/                 # 用户-角色关联
│   ├── role-permission/           # 角色-权限关联
│   ├── ai/                        # AI 多模型服务
│   ├── cache/                     # Redis 缓存封装
│   ├── mail/                      # 邮件服务
│   └── health/                    # 健康检查
└── templates/                     # Handlebars 邮件模板
```

## 请求处理链

```
Request → CORS → ValidationPipe → AuthGuard → [Controller] → TransformInterceptor → LoggingInterceptor → Response
```

### 全局管道 (ValidationPipe)

- `transform: true` — 自动类型转换
- `whitelist: true` — 剥离未声明字段
- `forbidNonWhitelisted: true` — 拒绝多余字段

### 全局守卫 (AuthGuard)

- 所有路由默认需要 JWT
- `@Public()` 装饰器跳过鉴权
- Token 从 `Authorization: Bearer <token>` 提取
- 验证签名 + Redis 中存在性检查

### 全局拦截器

- **TransformInterceptor** — 包装统一响应格式
- **LoggingInterceptor** — 请求/响应日志

### 全局过滤器

- **SystemExceptionFilter** — 捕获 `SystemException`，按错误码映射 HTTP 状态
- **HttpExceptionFilter** — 捕获 NestJS 内置 HttpException

## 统一响应格式

所有接口通过 `TransformInterceptor` 返回：

```typescript
{
  statusCode: number; // HTTP 状态码
  message: string; // 描述信息
  data: T; // 业务数据
  timestamp: string; // ISO 时间戳
  path: string; // 请求路径
  success: boolean; // 固定 true
}
```

如果 Controller 返回的对象含 `message` 字段，会被提取到外层 `message`。

## 异常体系

`SystemException` 使用静态工厂方法 + 错误码枚举 (`SystemErrorCode`)：

| 错误码 | 含义         | 典型 HTTP 映射 |
| ------ | ------------ | -------------- |
| 9000   | 缺少 Token   | 401            |
| 9001   | 参数错误     | 400            |
| 9002   | 数据未找到   | 404            |
| 9003   | 权限不足     | 403            |
| 9004   | 邮箱已存在   | 409            |
| 9005   | 验证码无效   | 400            |
| 9006   | 凭据无效     | 401            |
| 9007   | 资源已存在   | 409            |
| 9008   | 操作失败     | 500            |
| 9009   | 服务不可用   | 503            |
| 9010   | 密钥过期     | 400            |
| 9011   | 解密失败     | 400            |
| 9012   | 业务规则限制 | 400            |
| 9013   | 账户已禁用   | 403            |

## 配置管理

- `@nestjs/config` 的 `ConfigModule.forRoot({ isGlobal: true })`
- 配置文件通过 `registerAs()` 命名空间注册（`app`, `swagger`, `database`, `redis`, `mail`, `ai`）
- 通过 `ConfigService.get<T>('namespace.key')` 读取
- 环境变量从 `.env` 文件加载

## 路径别名

`@/*` → `src/*`，在 `tsconfig.json` 和 `jest.config.js` 中均已配置。

## HTTP 框架

使用 **Fastify**（非 Express）。注意请求/响应类型为 `FastifyRequest` / `FastifyReply`。

## 数据库

- TypeORM，PostgreSQL
- 开发环境 `synchronize: true`，生产环境禁用
- Entity 全部使用 UUID 主键，支持软删除 (`DeleteDateColumn`)
- 关系定义使用字符串引用避免循环依赖（如 `@OneToMany('UserRole', 'user')`）
- 连接池：最大 20 连接，空闲超时 30s，连接超时 2s
