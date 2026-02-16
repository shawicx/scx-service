# SCX Service

基于 NestJS 的企业级后端服务框架，提供完整的用户认证、权限管理、AI 服务集成等功能模块。

## 核心特性

### 认证授权系统

- JWT 双令牌机制（访问令牌 + 刷新令牌）
- 前端密码加密传输（AES 临时密钥）
- 邮箱验证码登录与注册
- 基于 Redis 的令牌管理

### RBAC 权限控制

- 用户-角色-权限三层权限模型
- 细粒度权限控制（动作 + 资源）
- 灵活的角色分配与权限管理
- 内置管理员守卫

### AI 服务集成

- 多平台支持：GitHub Copilot、智谱 AI（GLM）、阿里通义千问（Qwen）
- 流式与非流式响应
- 请求历史记录与 Token 统计
- 智能缓存与错误处理
- 用户个性化配置

### 邮件服务

- 验证码邮件发送
- 欢迎邮件
- 密码重置邮件
- 自定义 HTML 邮件

### 系统功能

- 全局异常处理
- 请求日志记录（Winston）
- API 文档自动生成（Swagger）
- 统一响应格式
- 输入验证管道
- CORS 跨域支持

## 技术架构

### 技术栈

- **运行环境**: Node.js v20+
- **框架**: NestJS v11
- **ORM**: TypeORM v0.3
- **数据库**: PostgreSQL / Better-SQLite3
- **缓存**: Redis v5
- **HTTP 服务器**: Fastify v5
- **日志**: Winston v3
- **加密**: Bcrypt v6
- **文档**: Swagger v11
- **测试**: Jest v30

### 架构模式

- 模块化设计，高内聚低耦合
- 依赖注入（DI）
- 装饰器模式
- 拦截器链
- 守卫机制
- 异常过滤器

## 功能模块说明

### 用户模块

- 用户注册（邮箱验证码）
- 用户登录（验证码 / 密码）
- 用户信息查询（支持分页、搜索、筛选）
- 用户状态管理（启用/禁用）
- 用户删除（支持批量）
- 角色分配（单个 / 批量）
- 权限检查

### 认证模块

- 生成和验证访问令牌（2小时有效期）
- 生成和验证刷新令牌（7天有效期）
- 令牌刷新机制
- 用户登出
- 密码加密密钥管理（5分钟有效期）

### 角色模块

- 角色创建、更新、删除
- 角色查询（支持分页）
- 角色权限分配
- 角色详情查询
- 按代码查询角色

### 权限模块

- 权限创建、更新、删除
- 权限查询（支持分页、搜索、筛选）
- 动作和资源管理
- 权限详情查询
- 按动作/资源筛选权限

### AI 模块

- 非流式对话生成
- 流式对话生成（SSE）
- 平台连接测试
- 用户配置管理
- 请求历史查询
- 可用平台列表

### 邮件模块

- 验证码邮件
- 欢迎邮件
- 密码重置邮件
- 自定义 HTML 邮件

### 缓存模块

- Redis 连接管理
- 基础缓存操作（get/set/del）
- 毫秒级过期时间支持

## 快速开始

### 环境要求

- Node.js v20 或更高版本
- pnpm 包管理器
- PostgreSQL 或 Better-SQLite3
- Redis 服务

### 安装步骤

```bash
# 克隆项目
git clone https://github.com/shawicx/scx-service.git
cd scx-service

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库、Redis、邮件等服务

# 运行数据库迁移（如需要）
pnpm run migration:run

# 启动开发服务器
pnpm run dev
```

### 访问应用

- API 地址：http://localhost:3000/api
- Swagger 文档：http://localhost:3000/api/docs

## 配置说明

### 核心配置项

```bash
# 应用配置
NODE_ENV=development
PORT=3000

# 数据库配置（PostgreSQL）
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=scx
DB_PASSWORD=your_password
DB_DATABASE=scx-service

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6388
REDIS_PASSWORD=

# JWT 配置
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# 邮件配置
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=your_email@example.com
MAIL_PASSWORD=your_email_password
MAIL_FROM=noreply@example.com

# AI 模块配置
AI_DEFAULT_PROVIDER=copilot
AI_TIMEOUT=30000
AI_CACHE_TTL=3600
AI_ENABLE_CACHE=true
AI_MAX_TOKENS_LIMIT=4096

# AI 平台配置
COPILOT_BASE_URL=https://api.githubcopilot.com
COPILOT_MODEL=gpt-4
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
GLM_MODEL=glm-4
QWEN_BASE_URL=https://dashscope.aliyuncs.com/api/v1
QWEN_MODEL=qwen-turbo
```

## API 文档

项目启动后自动生成 Swagger API 文档，包含所有接口的详细说明、请求示例和响应格式。

### 主要接口

#### 用户管理

- `POST /api/users/register` - 用户注册
- `POST /api/users/login` - 邮箱验证码登录
- `POST /api/users/login-password` - 密码登录
- `GET /api/users` - 查询用户列表（管理员）
- `POST /api/users/create` - 创建用户（管理员）
- `DELETE /api/users` - 删除用户（管理员）
- `PATCH /api/users/toggle-status` - 切换用户状态（管理员）

#### 角色管理

- `POST /api/roles` - 创建角色
- `GET /api/roles` - 获取角色列表
- `PUT /api/roles` - 更新角色
- `DELETE /api/roles` - 删除角色
- `POST /api/roles/assign-permissions` - 分配权限

#### 权限管理

- `POST /api/permissions` - 创建权限
- `GET /api/permissions` - 获取权限列表
- `PUT /api/permissions` - 更新权限
- `DELETE /api/permissions` - 删除权限

#### AI 服务

- `POST /api/ai/completion` - 非流式对话
- `SSE /api/ai/completion/stream` - 流式对话
- `GET /api/ai/providers` - 获取平台列表
- `PUT /api/ai/config` - 更新用户配置
- `GET /api/ai/requests` - 获取请求历史

#### 邮件服务

- `POST /api/mail/send-verification-code` - 发送验证码
- `POST /api/mail/send-welcome-email` - 发送欢迎邮件
- `POST /api/mail/send-password-reset` - 发送密码重置邮件
- `POST /api/mail/send-html-email` - 发送自定义邮件

## 开发指南

### 代码规范

项目采用统一的代码风格：

- 使用 TypeScript
- 严格类型检查（可配置）
- ESLint + Prettier 代码格式化
- Husky + lint-staged 提交前检查
- Conventional Commits 提交规范

### 目录结构

```
src/
├── app/                    # 应用根模块
│   └── app.module.ts      # 主模块
├── common/                # 通用组件
│   ├── decorators/        # 自定义装饰器
│   ├── exceptions/        # 异常定义
│   ├── filters/           # 异常过滤器
│   ├── guards/            # 守卫
│   ├── interceptors/      # 拦截器
│   └── utils/             # 工具函数
├── config/                # 配置文件
│   └── *.config.ts        # 各模块配置
├── modules/               # 业务模块
│   ├── auth/             # 认证模块
│   ├── cache/            # 缓存模块
│   ├── mail/             # 邮件模块
│   ├── user/             # 用户模块
│   ├── role/             # 角色模块
│   ├── permission/       # 权限模块
│   ├── ai/               # AI 模块
│   ├── user-role/        # 用户角色关联
│   └── role-permission/  # 角色权限关联
└── main.ts               # 应用入口
```

### 模块开发规范

每个业务模块应包含：

- `*.module.ts` - 模块定义
- `*.controller.ts` - 控制器（处理 HTTP 请求）
- `*.service.ts` - 服务（业务逻辑）
- `dto/` - 数据传输对象
- `entities/` - TypeORM 实体

### 常用命令

```bash
# 开发模式（热重载）
pnpm run dev

# 构建项目
pnpm run build

# 代码检查
pnpm run lint

# 代码修复
pnpm run lint:fix

# 格式化代码
pnpm run format

# 运行测试
pnpm run test

# 运行测试（监听模式）
pnpm run test:watch

# 测试覆盖率
pnpm run test:cov

# E2E 测试
pnpm run test:e2e
```

## 部署说明

### Docker 部署（推荐）

```bash
# 构建镜像
docker build -t scx-service .

# 运行容器
docker run -d \
  --name scx-service \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e DB_HOST=postgres \
  -e REDIS_HOST=redis \
  scx-service
```

### 生产环境配置

生产环境需要注意以下配置：

- 使用 PostgreSQL 数据库
- 配置 Redis 密码
- 设置安全的 JWT_SECRET
- 配置 HTTPS
- 启用日志持久化
- 配置监控和告警

## 许可证

UNLICENSED
