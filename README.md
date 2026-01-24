<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

## SCX Service

基于 NestJS 的企业级后端服务框架，提供完整的用户认证、权限管理、邮件服务等功能。

## 技术栈

- **Node.js**: v20+
- **NestJS**: v11
- **TypeORM**: ORM 框架
- **PostgreSQL/Better-SQLite3**: 数据库支持
- **Redis**: 缓存服务
- **Fastify**: HTTP 服务器
- **Winston**: 日志管理
- **Bcrypt**: 密码加密
- **Swagger**: API 文档

## 功能特性

- JWT 认证与授权
- RBAC 权限控制模型
- 用户管理（注册、登录、角色分配）
- 邮件验证码服务
- 前端密码加密传输
- Redis 缓存集成
- AI 服务集成
- 统一异常处理
- 请求日志记录
- API 文档自动生成

## 安装配置

### 环境准备

```bash
# 安装依赖
$ pnpm install

# 复制环境变量文件
$ cp .env.example .env
```

### 环境变量配置

根据 `.env.example` 文件配置相应的环境变量，包括数据库连接、Redis 连接、邮件服务等。

## 运行应用

```bash
# 开发模式
$ pnpm run start:dev

# 构建
$ pnpm run build

# 生产模式
$ pnpm run start:prod
```

## 测试

```bash
# 单元测试
$ pnpm run test

# E2E 测试
$ pnpm run test:e2e

# 测试覆盖率
$ pnpm run test:cov
```

## API 文档

应用启动后访问 `/api/docs` 查看 Swagger API 文档。

## 项目结构

```
src/
├── app/                 # 应用根模块
├── common/             # 通用工具和中间件
│   ├── decorators/     # 自定义装饰器
│   ├── exceptions/     # 异常定义
│   ├── filters/        # 异常过滤器
│   ├── guards/         # 守卫
│   ├── interceptors/   # 拦截器
│   └── utils/          # 工具函数
├── config/             # 配置文件
├── modules/            # 业务模块
│   ├── auth/          # 认证模块
│   ├── cache/         # 缓存模块
│   ├── mail/          # 邮件模块
│   ├── user/          # 用户模块
│   ├── role/          # 角色模块
│   ├── permission/    # 权限模块
│   └── ai/            # AI 模块
└── main.ts            # 应用入口
```

## 许可证

MIT
