# User Management Capability Spec

## ADDED Requirements

### Requirement: Query Users with Pagination

系统MUST提供查询用户列表的接口，支持分页、搜索和筛选功能。

#### Scenario: Query first page of users

**Given** 系统中存在 15 个用户
**When** 管理员请求第一页用户列表（每页 10 条）
**Then** 系统返回 10 个用户
**And** 响应包含 total=15, page=1, limit=10

#### Scenario: Search users by email

**Given** 系统中存在用户 alice@example.com 和 bob@test.com
**When** 管理员搜索关键词 "example"
**Then** 系统只返回 alice@example.com

#### Scenario: Search users by name

**Given** 系统中存在用户 "张三" 和 "李四"
**When** 管理员搜索关键词 "张"
**Then** 系统只返回 "张三"

#### Scenario: Filter users by active status

**Given** 系统中存在 5 个启用用户和 3 个禁用用户
**When** 管理员筛选启用状态=true 的用户
**Then** 系统只返回 5 个启用的用户

#### Scenario: Sort users by creation time

**Given** 系统中存在多个用户
**When** 管理员按创建时间降序排序
**Then** 系统返回最新创建的用户在前面

### Requirement: Admin Create User

管理员MUST能够创建新用户，无需邮箱验证码验证。

#### Scenario: Create user with valid data

**Given** 管理员已登录
**When** 管理员提交创建用户请求（邮箱、姓名、密码）
**Then** 系统成功创建用户
**And** 用户的邮箱被设为已验证状态
**And** 密码被加密存储
**And** 返回用户信息（不含密码）

#### Scenario: Create user with initial roles

**Given** 系统中存在角色 "admin" 和 "user"
**When** 管理员创建用户并分配角色 ["admin", "user"]
**Then** 系统成功创建用户
**And** 用户被分配了指定的角色
**And** 用户拥有相应角色的权限

#### Scenario: Create user with duplicate email

**Given** 系统中已存在邮箱 test@example.com 的用户
**When** 管理员尝试创建相同邮箱的用户
**Then** 系统返回 409 Conflict 错误
**And** 错误信息提示邮箱已被注册

#### Scenario: Create user with invalid password

**When** 管理员提交创建用户请求，密码不符合复杂度要求
**Then** 系统返回 400 Bad Request 错误
**And** 错误信息提示密码格式要求

#### Scenario: Non-admin user cannot create user

**Given** 普通用户已登录
**When** 普通用户尝试创建用户
**Then** 系统返回 403 Forbidden 错误

### Requirement: Delete User

管理员MUST能够删除用户账户。

#### Scenario: Delete existing user

**Given** 系统中存在 ID 为 user-123 的用户
**When** 管理员删除 user-123
**Then** 系统标记用户为已删除（软删除）
**And** 用户的角色关系被级联删除
**And** 返回成功消息

#### Scenario: Delete non-existing user

**Given** 系统中不存在 ID 为 user-999 的用户
**When** 管理员尝试删除 user-999
**Then** 系统返回 404 Not Found 错误

#### Scenario: User cannot delete themselves

**Given** 管理员 ID 为 admin-001 已登录
**When** 管理员尝试删除自己
**Then** 系统返回 400 Bad Request 错误
**And** 错误信息提示不能删除自己

#### Scenario: Regular admin cannot delete other admin

**Given** 普通管理员 admin-001 已登录
**And** admin-002 是普通管理员
**When** admin-001 尝试删除 admin-002
**Then** 系统返回 403 Forbidden 错误
**And** 错误信息提示无权限删除管理员

#### Scenario: Super admin can delete regular admin

**Given** 超级管理员 super-admin 已登录
**And** admin-001 是普通管理员
**When** super-admin 删除 admin-001
**Then** 系统成功删除 admin-001

#### Scenario: Batch delete users

**Given** 系统中存在用户 user-001, user-002, user-003
**When** 管理员批量删除 user-001 和 user-002
**Then** 系统标记 user-001 和 user-002 为已删除
**And** user-003 保持不变
**And** 返回成功删除的用户数量

#### Scenario: Deleted user cannot login

**Given** 用户 ID 为 user-123 已被删除
**When** 用户 user-123 尝试登录
**Then** 系统拒绝登录
**And** 返回相应的错误信息

#### Scenario: Non-admin user cannot delete user

**Given** 普通用户已登录
**When** 普通用户尝试删除用户
**Then** 系统返回 403 Forbidden 错误

### Requirement: Toggle User Active Status

管理员MUST能够切换用户的启用/禁用状态。

#### Scenario: Disable active user

**Given** 用户 ID 为 user-123 的状态为启用（isActive=true）
**When** 管理员禁用 user-123
**Then** 系统将用户状态更新为禁用（isActive=false）
**And** 返回更新后的用户信息

#### Scenario: Enable disabled user

**Given** 用户 ID 为 user-456 的状态为禁用（isActive=false）
**When** 管理员启用 user-456
**Then** 系统将用户状态更新为启用（isActive=true）
**And** 返回更新后的用户信息

#### Scenario: Disabled user cannot login

**Given** 用户 user-123 的状态为禁用
**When** 用户 user-123 尝试登录
**Then** 系统拒绝登录
**And** 返回错误信息提示账户已被禁用

#### Scenario: User cannot disable themselves

**Given** 管理员 ID 为 admin-001 已登录
**When** 管理员尝试禁用自己
**Then** 系统返回 400 Bad Request 错误
**And** 错误信息提示不能禁用自己

#### Scenario: Batch toggle user status

**Given** 系统中存在 user-001 (enabled), user-002 (enabled), user-003 (disabled)
**When** 管理员批量禁用 user-001 和 user-002
**Then** user-001 和 user-002 被禁用
**And** user-003 保持禁用状态

#### Scenario: Non-admin user cannot toggle status

**Given** 普通用户已登录
**When** 普通用户尝试切换用户状态
**Then** 系统返回 403 Forbidden 错误

### Requirement: Permission Control

所有用户管理操作MUST受到适当的权限控制。

#### Scenario: Admin can access all user management APIs

**Given** 管理员用户已登录
**When** 管理员访问用户管理相关的API
**Then** 系统允许访问
**And** 操作正常执行

#### Scenario: Regular user cannot access user management APIs

**Given** 普通用户已登录
**When** 普通用户访问用户管理API
**Then** 系统返回 403 Forbidden 错误

#### Scenario: Unauthenticated user cannot access user management APIs

**Given** 用户未登录
**When** 用户访问用户管理API
**Then** 系统返回 401 Unauthorized 错误

### Requirement: Data Integrity and Validation

系统MUST确保用户数据的一致性和有效性。

#### Scenario: Email must be unique

**Given** 邮箱地址已存在于数据库
**When** 尝试创建具有相同邮箱的新用户
**Then** 操作失败
**And** 返回邮箱已存在的错误

#### Scenario: Password must meet complexity requirements

**When** 创建用户时提供的密码不满足复杂度要求
**Then** 操作失败
**And** 返回密码格式错误信息

#### Scenario: User ID must be valid UUID

**When** 提供的用户ID格式不正确
**Then** 系统返回 400 Bad Request 错误
**And** 错误信息提示用户ID格式无效

#### Scenario: Role IDs must exist when assigned

**Given** 系统中不存在角色 ID 为 role-999
**When** 创建用户时分配了 role-999
**Then** 操作失败
**And** 返回角色不存在的错误

### Requirement: Performance and Pagination

用户列表查询MUST具有良好的性能，并支持高效的分页。

#### Scenario: Query large dataset with pagination

**Given** 系统中存在 10,000 个用户
**When** 管理员查询第一页（每页 20 条）
**Then** 系统在合理时间内（< 1s）返回结果
**And** 只返回 20 个用户
**And** 响应包含正确的分页信息

#### Scenario: Empty result set

**Given** 搜索条件不匹配任何用户
**When** 管理员执行查询
**Then** 系统返回空列表
**And** total=0
**And** 系统不报错

#### Scenario: Page beyond available data

**Given** 系统中存在 25 个用户
**When** 管理员请求第 10 页（每页 10 条）
**Then** 系统返回空列表
**And** total=25

## MODIFIED Requirements

### Requirement: User Login with Password

登录逻辑MUST检查用户的启用状态。

#### Scenario: Disabled user cannot login with password

**Given** 用户 ID 为 user-123 的状态为禁用
**When** 用户 user-123 尝试使用密码登录
**Then** 系统拒绝登录
**And** 返回错误信息提示账户已被禁用

#### Scenario: Disabled user cannot login with verification code

**Given** 用户 ID 为 user-123 的状态为禁用
**When** 用户 user-123 尝试使用验证码登录
**Then** 系统拒绝登录
**And** 返回错误信息提示账户已被禁用

#### Scenario: Deleted user cannot login

**Given** 用户 ID 为 user-123 已被删除
**When** 用户 user-123 尝试登录
**Then** 系统拒绝登录
**And** 返回错误信息提示用户不存在

## REMOVED Requirements

None
