# claude_zh.md

此文件为 Claude Code (claude.ai/code) 在处理此仓库代码时提供指导。

## 项目概述

这是一个名为 "shawbox-service" 的 NestJS 后端服务，实现了完整的身份认证和基于角色访问控制（RBAC）的授权系统。项目遵循模块化架构模式，具有清晰的关注点分离。

## 开发命令

### 包管理

```bash
pnpm install
```

### 运行应用程序

```bash
# 开发模式，支持热重载
pnpm run dev

# 调试模式
pnpm run debug

# 生产构建和运行
pnpm run build
pnpm run start:prod
```

### 测试

```bash
# 单元测试
pnpm run test

# 端到端测试
pnpm run test:e2e

# 测试覆盖率报告
pnpm run test:cov

# 测试监视模式
pnpm run test:watch

# 调试测试
pnpm run test:debug
```

### 代码质量

```bash
# 代码检查
pnpm run lint
pnpm run lint:fix

# 代码格式化
pnpm run format
```

## 架构概览

### 核心架构

- **框架**: NestJS v11.1.6，使用 Fastify 适配器以提升性能
- **数据库**: MySQL 配合 TypeORM ORM
- **身份认证**: 基于 JWT 的认证，使用 bearer token 验证
- **授权**: RBAC 系统，包含角色和权限管理
- **缓存**: Redis 用于性能优化
- **日志**: Winston，支持不同环境的传输方式

### 模块结构

应用程序采用基于功能的模块结构：

- **app/**: 根应用模块
- **common/**: 共享组件（守卫、过滤器、拦截器、管道）
- **config/**: 使用 `registerAs` 模式的配置模块
- **modules/**: 功能模块
  - **auth/**: JWT 认证，包含登录/注册
  - **user/**: 用户管理，包含偏好设置
  - **role/**: 角色管理
  - **permission/**: 权限管理
  - **user-role/**: 用户-角色关系
  - **role-permission/**: 角色-权限关系
  - **cache/**: Redis 缓存
  - **mail/**: 邮件服务，包含模板

### 全局组件

- **AuthGuard**: JWT 认证守卫（全局自动应用）
- **@Public() 装饰器**: 标记端点为公开（绕过 AuthGuard）
- **SystemExceptionFilter**: 全局异常处理，提供结构化响应
- **LoggingInterceptor**: 请求/响应日志记录
- **TransformInterceptor**: 响应标准化
- **ValidationPipe**: 全局输入验证

### 数据库设计

- MySQL 数据库，使用 TypeORM 实体
- 用户实体包含偏好设置（JSON 字段）和审计字段
- 用户-角色和角色-权限之间的多对多关系
- 创建/更新日期的自动时间戳管理

### 配置模式

使用 NestJS ConfigModule 进行环境特定配置：

- **appConfig**: 端口、环境、全局前缀
- **databaseConfig**: MySQL 连接设置
- **swaggerConfig**: API 文档配置
- **redisConfig**: Redis 连接设置
- **mailConfig**: 邮件服务配置

## 关键开发模式

### 模块创建

创建新模块时，遵循既定模式：

- 模块文件导出控制器和服务
- 控制器处理 HTTP 请求，使用 Swagger 装饰器
- 服务包含业务逻辑
- DTO 用于请求/响应验证
- 实体用于数据库模型

### 错误处理

- 使用 SystemException 处理业务逻辑错误
- 根据错误代码自动映射 HTTP 状态码
- 全局异常过滤器确保一致的错误响应
- 带有上下文的详细错误日志

### 认证流程

- 默认情况下，所有端点都通过全局 AuthGuard 保护
- 使用 @Public() 装饰器标记公开端点
- AuthGuard 在 JWT 验证后将用户数据注入请求
- 令牌通过 JwtStrategy 使用可配置的密钥验证

### 测试设置

- Jest 配置用于单元测试和端到端测试
- 单元测试位于源文件旁边 (\*.spec.ts)
- 端到端测试位于 /test 目录 (\*.e2e-spec.ts)
- 覆盖率报告生成在 /coverage 目录
- 测试环境使用 node 环境和 ts-jest

### API 文档

- Swagger 文档可在 `/api/docs` 访问
- 从 DTO 自动生成模型文档
- 自定义 Swagger 配置，包含安全定义
- 控制器装饰器中的 API 示例和描述

## 开发工作流

### Git 钩子

- 配置 Husky 用于提交前钩子
- Lint-staged 对提交的文件运行
- Commitlint 强制执行传统提交消息

### 代码风格

- 使用 Ali 预设的 ESLint 配置
- Prettier 用于代码格式化
- TypeScript 严格模式禁用（noImplicitAny: false）
- 路径映射：`@/*` 映射到 `src/*`

### 环境变量

- 开发环境使用 `.env` 文件（不在 git 中跟踪）
- 生产环境变量应在部署环境中设置
- 必需变量：DB_HOST、DB_PORT、DB_USERNAME、DB_PASSWORD、DB_DATABASE

## 性能考虑

- 使用 Fastify 适配器而不是 Express 以获得更好的性能
- Redis 缓存频繁访问的数据
- 使用 TypeORM 优化数据库查询
- Winston 日志记录器，为开发/生产环境提供不同的传输方式
- 启用转换的全局验证管道
