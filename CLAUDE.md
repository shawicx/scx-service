# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

SCX Service 是基于 NestJS + Fastify + TypeORM + PostgreSQL 构建的企业级后端服务，提供用户认证、RBAC 权限管理、AI 多模型集成、邮件服务等能力。

## 要求

- 必须阅读 `.wiki/` 中的项目概述和文档结构，了解项目的整体架构和设计原则。
- 在处理代码时，必须遵循项目的编码规范和提交规范，确保代码质量和一致性。
- 在修改或添加功能时，必须更新相关文档，确保文档与代码保持一致。
- 在生成代码时，必须遵循项目的代码生成模式和文件结构。

## 常用命令

```bash
pnpm run dev          # 开发模式（热重载 + debug）
pnpm run build        # 编译构建
pnpm run lint         # ESLint 检查
pnpm run lint:fix     # ESLint + Prettier 自动修复
pnpm run format       # Prettier 格式化
pnpm run test         # 运行单测
pnpm run test:watch   # 监听模式运行单测
pnpm run test:cov     # 单测覆盖率
pnpm run test:e2e     # E2E 测试
```

单测文件匹配 `*.spec.ts`，Jest 配置在 `jest.config.js`，路径别名 `@/*` 映射到 `src/*`。

## 技术栈

- **运行时**: Node.js 20+, TypeScript 5.4
- **框架**: NestJS 11 + Fastify 5（非 Express）
- **ORM**: TypeORM 0.3，实体使用 UUID 主键，支持软删除
- **数据库**: PostgreSQL（生产）
- **缓存**: Redis 5（node-redis 客户端）
- **日志**: Winston + nest-winston
- **代码规范**: eslint-config-ali, prettier-config-ali, commitlint, husky + lint-staged
- **API 文档**: @nestjs/swagger，路径 `/api/docs`

## 架构

### 目录结构

```
src/
├── app/app.module.ts          # 根模块，注册全局守卫、过滤器、所有业务模块
├── main.ts                    # 启动入口，全局管道/拦截器/CORS/Swagger
├── config/                    # 配置定义（env, database, redis, mail, ai）
├── common/
│   ├── decorators/            # @Public() 装饰器（跳过鉴权）
│   ├── guards/                # AuthGuard（全局 JWT 鉴权）, AdminGuard
│   ├── filters/               # HttpExceptionFilter, SystemExceptionFilter
│   ├── interceptors/          # LoggingInterceptor, TransformInterceptor
│   ├── exceptions/            # 自定义异常类
│   └── utils/                 # 工具函数、常量（TTL、缓存 key）
├── modules/
│   ├── auth/                  # JWT 双 Token 认证（access + refresh）
│   ├── user/                  # 用户 CRUD
│   ├── role/                  # 角色管理
│   ├── permission/            # 权限管理（树形结构，支持 MENU/BUTTON 类型）
│   ├── user-role/             # 用户-角色关联
│   ├── role-permission/       # 角色-权限关联
│   ├── ai/                    # AI 多模型服务
│   ├── cache/                 # Redis 缓存封装
│   ├── mail/                  # 邮件服务（Handlebars 模板）
│   └── health/                # 健康检查
└── templates/                 # 邮件 Handlebars 模板
```

### 关键架构决策

- **HTTP 框架**: 使用 Fastify 而非 Express，注意 `FastifyReply`/`FastifyRequest` 与 Express 类型的区别
- **全局前缀**: 所有路由以 `/api` 开头
- **全局守卫**: `AuthGuard` 在 `AppModule` 中通过 `APP_GUARD` 注册，所有路由默认需要 JWT 鉴权，使用 `@Public()` 装饰器跳过
- **统一响应格式**: `TransformInterceptor` 将所有响应包装为 `{ statusCode, message, data, timestamp, path, success }` 结构
- **路径别名**: `@/*` 映射到 `src/*`（tsconfig.json + jest.config.js 均已配置）
- **配置管理**: 使用 `@nestjs/config` 的 `ConfigModule.forRoot` 加载 `.env` 和各配置文件，通过 `ConfigService` 读取

### RBAC 权限模型

User → Role → Permission 三层结构，通过 `user-role` 和 `role-permission` 中间表关联。Permission 实体支持树形结构（`parentId`/`level`/`children`），区分 `MENU`（菜单）和 `BUTTON`（按钮）类型。

### AI 模块

采用工厂模式（`provider.factory.ts`）管理多个 AI Provider，通过 `Map<AiProviderType, IAiProvider>` 注册。每个 Provider 实现 `IAiProvider` 接口，支持流式（SSE）和非流式生成。当前支持 Copilot、GLM（智谱）、Qwen（通义千问）三个平台。

### 认证流程

- 注册/登录支持验证码和密码两种方式
- 前端密码使用 AES 加密传输，后端 bcrypt 哈希存储
- JWT 双 Token：access token + refresh token，通过 Redis 管理 Token 状态
- 验证码有 5 分钟有效期

## 开发约定

- 提交信息遵循 Conventional Commits（commitlint 强制）
- pre-commit 钩子自动执行 lint-staged（ESLint fix + Prettier format）
- DTO 使用 `class-validator` + `class-transformer` 进行校验，配合全局 `ValidationPipe`（whitelist + forbidNonWhitelisted）
- Entity 使用 TypeORM 装饰器，关系定义使用字符串引用（如 `@OneToMany('UserRole', 'user')`）避免循环依赖
- Swagger 装饰器在 Controller 和 DTO 上标注 API 文档
