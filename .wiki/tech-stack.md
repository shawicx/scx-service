# 技术栈

## 核心

| 技术       | 版本 | 用途        |
| ---------- | ---- | ----------- |
| Node.js    | 20+  | 运行时      |
| TypeScript | 5.4  | 语言        |
| NestJS     | 11   | 后端框架    |
| Fastify    | 5    | HTTP 适配器 |

## 数据层

| 技术       | 版本             | 用途            |
| ---------- | ---------------- | --------------- |
| TypeORM    | 0.3              | ORM             |
| PostgreSQL | -                | 数据库          |
| Redis      | 5.8 (node-redis) | 缓存/Token 存储 |

## 安全

| 技术                     | 用途             |
| ------------------------ | ---------------- |
| 自定义 JWT (HMAC-SHA256) | 双 Token 认证    |
| bcrypt                   | 密码哈希         |
| AES (crypto)             | 前端密码加密传输 |

## AI 集成

| 平台            | 模型（默认） | 说明          |
| --------------- | ------------ | ------------- |
| GitHub Copilot  | gpt-5        | 默认 Provider |
| GLM (智谱AI)    | glm-4.7      | -             |
| Qwen (通义千问) | qwen-turbo   | -             |

## 工具链

| 技术                                | 用途                         |
| ----------------------------------- | ---------------------------- |
| Winston + nest-winston              | 日志                         |
| @nestjs/swagger                     | API 文档（路径 `/api/docs`） |
| Nodemailer + Handlebars             | 邮件                         |
| class-validator + class-transformer | DTO 校验                     |
| axios                               | HTTP 客户端（AI 请求）       |

## 代码质量

| 工具        | 配置                          |
| ----------- | ----------------------------- |
| ESLint      | eslint-config-ali             |
| Prettier    | prettier-config-ali           |
| Husky       | pre-commit 钩子               |
| lint-staged | 暂存区 lint                   |
| commitlint  | Conventional Commits          |
| Jest        | ts-jest，单测匹配 `*.spec.ts` |

## 部署

| 工具           | 说明                   |
| -------------- | ---------------------- |
| Docker         | 多阶段构建 Dockerfile  |
| docker-compose | 开发/生产 compose 文件 |
| GitHub Actions | 部署到阿里云 ECS       |
