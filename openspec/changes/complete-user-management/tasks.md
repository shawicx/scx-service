# Tasks: Complete User Management

## Task 1: 添加软删除支持到用户实体

- [x] 在 User 实体中添加 `deletedAt` 字段
- [x] 配置 TypeORM 的 soft-delete 功能
- [x] 编写迁移脚本更新数据库架构（开发环境使用同步模式）
- [x] 为 email, name, isActive, deletedAt 添加复合索引
- [x] 验证软删除功能正常工作

**依赖**: 无
**验证**: 软删除的用户不会出现在正常查询中，但可以通过查询包含已删除记录的方式找到

## Task 2: 创建用户列表查询功能

- [x] 创建 `QueryUsersDto` DTO
  - `page`: 页码
  - `limit`: 每页数量
  - `search`: 搜索关键词（邮箱或姓名）
  - `isActive`: 启用状态筛选
  - `sortBy`: 排序字段
  - `sortOrder`: 排序方向
- [x] 在 `UserService` 中添加 `queryUsers` 方法
- [x] 实现 TypeORM 查询构建器，支持动态条件
- [x] 添加数据库索引优化查询性能
- [x] 在 `UserController` 中添加 `GET /users` 端点
- [x] 创建 `UserListResponseDto` 和 `UserListItemDto`
- [x] 添加 Swagger API 文档
- [ ] 编写单元测试和集成测试（待测试阶段）

**依赖**: Task 1
**验证**: 能够查询到分页的用户列表，搜索和筛选功能正常工作

## Task 3: 创建管理员创建用户功能

- [x] 创建 `CreateUserDto` DTO
  - `email`: 邮箱
  - `name`: 姓名
  - `password`: 密码
  - `isActive`: 是否启用（可选，默认true）
  - `roleIds`: 初始角色列表（可选）
- [x] 在 `UserService` 中添加 `createUser` 方法
  - 验证邮箱唯一性
  - 加密密码
  - 创建用户
  - 分配初始角色
- [x] 在 `UserController` 中添加 `POST /users/create` 端点
- [x] 添加管理员权限验证（使用 AdminGuard）
- [x] 添加 Swagger API 文档
- [ ] 编写单元测试和集成测试（待测试阶段）

**依赖**: Task 1
**验证**: 管理员能够成功创建用户，用户可以正常登录

## Task 4: 创建删除用户功能（支持批量）

- [x] 创建 `DeleteUsersDto` DTO（支持单个和批量）
  - `userIds`: 用户ID列表
- [x] 在 `UserService` 中添加 `deleteUsers` 方法
  - 检查用户是否存在
  - 检查是否为当前登录用户
  - 检查权限：普通管理员不能删除其他管理员
  - 执行软删除
  - 级联删除用户角色关系
- [x] 在 `UserController` 中添加 `DELETE /users` 端点
- [x] 添加管理员权限验证（使用 AdminGuard）
- [x] 添加 Swagger API 文档
- [ ] 编写单元测试和集成测试（待测试阶段）

**依赖**: Task 1
**验证**: 删除后的用户无法登录，相关角色关系被清除

## Task 5: 创建启用/禁用用户功能（支持批量）

- [x] 创建 `ToggleUserStatusDto` DTO
  - `userIds`: 用户ID列表
  - `isActive`: 目标状态
- [x] 在 `UserService` 中添加 `toggleUserStatus` 方法
  - 检查用户是否存在
  - 检查是否为当前登录用户
  - 切换 `isActive` 状态
- [x] 在 `UserController` 中添加 `PATCH /users/toggle-status` 端点
- [x] 添加管理员权限验证（使用 AdminGuard）
- [x] 更新登录逻辑，禁止禁用用户登录
- [x] 添加 Swagger API 文档
- [ ] 编写单元测试和集成测试（待测试阶段）

**依赖**: Task 1
**验证**: 禁用的用户无法登录，启用后可以正常登录

## Task 6: 更新登录逻辑支持状态检查

- [x] 在 `UserService.loginWithEmailCode` 中检查用户状态
- [x] 在 `UserService.loginWithPassword` 中检查用户状态
- [x] 为禁用用户返回明确的错误信息
- [ ] 更新相关测试用例（待测试阶段）

**依赖**: Task 5
**验证**: 禁用用户尝试登录时收到适当的错误提示

## Task 7: 添加权限验证和 Guards

- [x] 创建 `AdminGuard` 用于管理员权限检查
- [x] 为新增的用户管理API端点添加权限保护
- [ ] 测试未授权访问被正确拒绝（待测试阶段）
- [ ] 测试授权用户可以正常访问（待测试阶段）

**依赖**: Task 2, Task 3, Task 4, Task 5
**验证**: 非管理员用户无法访问用户管理API

## Task 8: 完善错误处理和验证

- [x] 添加业务规则验证
  - 不能删除自己
  - 不能禁用自己
  - 不能创建重复邮箱的用户
  - 普通管理员不能删除其他管理员用户
- [x] 统一错误响应格式
- [x] 添加详细的错误日志（通过 SystemExceptionFilter）
- [x] 更新 API 文档中的错误响应示例

**依赖**: Task 3, Task 4, Task 5
**验证**: 各种边界情况都有适当的错误处理

## Task 9: 性能优化

- [x] 为用户表添加复合索引（email, isActive, createdAt）
- [x] 优化列表查询的性能（使用 TypeORM 查询构建器）
- [ ] 添加缓存策略（如需要）（后续优化）
- [ ] 进行性能测试（待测试阶段）

**依赖**: Task 2
**验证**: 用户列表查询在合理时间内返回结果

## Task 10: 集成测试和文档

- [ ] 编写端到端测试
- [ ] 验证所有用户管理功能
- [x] 更新 API 文档（Swagger 文档自动生成）
- [ ] 添加使用示例（在 API 文档中已包含）
- [ ] 进行安全审查（待审查）

**依赖**: Task 1-9
**验证**: 所有功能按预期工作，文档完整准确

## 实现总结

已完成的代码实现包括：

### 新增文件

1. `src/modules/user/dto/query-users.dto.ts` - 用户列表查询 DTO
2. `src/modules/user/dto/create-user.dto.ts` - 创建用户 DTO
3. `src/modules/user/dto/delete-users.dto.ts` - 删除用户 DTO
4. `src/modules/user/dto/toggle-user-status.dto.ts` - 切换用户状态 DTO
5. `src/modules/user/dto/user-list-response.dto.ts` - 用户列表响应 DTO
6. `src/common/guards/admin.guard.ts` - 管理员权限 Guard

### 修改文件

1. `src/modules/user/entities/user.entity.ts` - 添加 deletedAt 字段和索引
2. `src/modules/user/user.service.ts` - 添加所有新方法
3. `src/modules/user/user.controller.ts` - 添加新的 API 端点
4. `src/common/exceptions/system.exception.ts` - 添加 ACCOUNT_DISABLED 错误码
5. `src/common/filters/system-exception.filter.ts` - 映射新错误码

### 新增 API 端点

- `GET /api/users` - 查询用户列表
- `POST /api/users/create` - 创建用户
- `DELETE /api/users` - 删除用户（支持批量）
- `PATCH /api/users/toggle-status` - 切换用户状态（支持批量）

### 系统功能增强

- 软删除支持
- 管理员权限验证
- 用户启用/禁用状态检查
- 批量操作支持
- 完善的错误处理
