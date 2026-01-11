<!-- OPENSPEC:START -->

# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:

- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:

- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# AGENTS.md

本文件为 AI 编码助手（代理）提供代码库工作指南。

## 构建/检查/测试命令

```bash
# 构建项目
pnpm run build

# 开发模式（热重载）
pnpm run dev

# 代码检查
pnpm run lint

# 修复代码问题（自动格式化+ESLint 修复）
pnpm run lint:fix

# 仅格式化代码
pnpm run format

# 运行所有测试
pnpm run test

# 运行单个测试文件
pnpm run test path/to/test.spec.ts

# 或使用 jest 直接运行
jest -- path/to/test.spec.ts

# 测试覆盖率报告
pnpm run test:cov

# 监听模式运行测试
pnpm run test:watch

# E2E 测试
pnpm run test:e2e
```

## 代码风格指南

### 导入顺序

```typescript
// 1. @/* 别名导入（项目内部模块）
import { Public } from '@/common/decorators/public.decorator';

// 2. 第三方库导入
import { Controller, Get, Post } from '@nestjs/common';
import { FastifyRequest } from 'fastify';

// 3. 相对路径导入
import { UserService } from './user.service';
```

### TypeScript 配置

- 使用 TypeScript 严格模式已关闭（`noImplicitAny: false`）
- 路径别名：`@/*` 映射到 `src/*`
- 所有异步方法必须返回 `Promise<T>`
- 类型定义使用 `interface` 或 `class`

### 命名规范

- **类名**：PascalCase（如 `UserService`, `RegisterUserDto`）
- **方法名**：camelCase（如 `register`, `loginWithEmailCode`）
- **常量**：UPPER_SNAKE_CASE（如 `EMAIL_VERIFICATION_TTL_MS`, `ACCESS_TOKEN_TTL_MS`）
- **文件名**：kebab-case（如 `user.service.ts`, `login-user.dto.ts`）
- **DTO 文件**：`xxx.dto.ts`
- **实体文件**：`entities/xxx.entity.ts`
- **常量文件**：`xxx.constants.ts`

### 项目架构模式

#### 模块结构

```
src/modules/模块名/
├── dto/              # 数据传输对象
├── entities/         # TypeORM 实体
├── xxx.controller.ts # 控制器（处理 HTTP 请求）
├── xxx.service.ts    # 服务（业务逻辑）
└── xxx.module.ts     # 模块定义
```

#### 控制器模式

- 使用装饰器定义路由和 Swagger 文档
- 所有方法必须是 `async` 并返回 `Promise<T>`
- 使用 DTO 类进行请求验证
- 公共接口使用 `@Public()` 装饰器
- 默认使用 `@UseInterceptors(ClassSerializerInterceptor)`

```typescript
@ApiTags('用户管理')
@Controller('users')
export class UserController {
  async register(@Body() dto: RegisterUserDto): Promise<UserResponseDto> {
    return this.userService.register(dto);
  }
}
```

#### 服务模式

- 使用 `@Injectable()` 装饰器
- 通过构造函数注入依赖
- 使用 `@InjectRepository()` 注入 TypeORM Repository
- 所有业务方法必须是 `async` 并返回 `Promise<T>`

```typescript
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cacheService: CacheService,
  ) {}
}
```

### 错误处理

- 业务逻辑错误使用 `SystemException` 静态方法
- 不直接抛出 `Error` 或原生异常
- 常用异常方法：
  - `SystemException.dataNotFound('数据未找到')`
  - `SystemException.invalidParameter('参数错误')`
  - `SystemException.emailExists('邮箱已存在')`
  - `SystemException.invalidCredentials('凭据无效')`
  - `SystemException.invalidVerificationCode('验证码无效')`
  - `SystemException.operationFailed('操作失败')`

### DTO 验证

- 使用 `class-validator` 装饰器
- 使用 `@ApiProperty()` 定义 Swagger 文档
- 必须包含验证规则：
  - `@IsNotEmpty()` - 非空验证
  - `@IsString()` - 字符串类型
  - `@IsEmail()` - 邮箱格式
  - `@Length(min, max)` - 长度限制
  - `@Matches(pattern)` - 正则匹配

```typescript
export class RegisterUserDto {
  @ApiProperty({ description: '用户邮箱' })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email: string;
}
```

### 实体定义

- 使用 TypeORM 装饰器
- 主键使用 `@PrimaryGeneratedColumn('uuid')`
- 自动时间戳使用 `@CreateDateColumn()` 和 `@UpdateDateColumn()`
- JSON 字段使用 `@Column({ type: 'json' })`
- 索引使用 `@Index()`

```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  @Index({ unique: true })
  email: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 注释规范

- 方法使用 JSDoc 风格注释
- 包含 `@param` 和 `@returns` 说明
- 私有方法可省略注释

```typescript
/**
 * 用户注册
 * @param registerUserDto 注册信息
 * @param clientIp 客户端IP
 * @returns 用户信息
 */
async register(registerUserDto: RegisterUserDto, clientIp?: string): Promise<UserResponseDto> {
  // 实现
}
```

### 全局组件

- **AuthGuard**：JWT 认证守卫（全局应用）
- **@Public()**：标记公共路由
- **SystemExceptionFilter**：全局异常处理
- **TransformInterceptor**：响应标准化
- **ValidationPipe**：全局输入验证

### 代码格式化

- 使用 Prettier 配置：`prettier-config-ali`
- ESLint 配置：`eslint-config-ali`
- Husky + lint-staged：提交前自动检查

### 测试规范

- 单元测试文件：`*.spec.ts`（与源文件同目录）
- E2E 测试文件：`test/*.e2e-spec.ts`
- 使用 Jest + ts-jest
- 测试环境：`node`

### Git 提交

- 使用 Conventional Commits 规范
- 提交前运行 `husky` 钩子
- lint-staged 自动格式化 staged 文件

### 其他重要约定

- 使用 Fastify 适配器而非 Express
- 密码加密使用 bcrypt（saltRounds: 12）
- Token 使用 JWT + Redis 存储
- 数据库操作使用 TypeORM
- 缓存使用 Redis
- 日志使用 Winston
- 邮件使用 Nodemailer
- Swagger 文档访问路径：`/api/docs`
- API 路径前缀：`/api`

## 开发工作流

1. 完成代码修改
2. 运行 `pnpm run lint:fix` 自动格式化和修复
3. 运行 `pnpm run test` 确保测试通过
4. 提交代码（Husky 自动运行预提交检查）
