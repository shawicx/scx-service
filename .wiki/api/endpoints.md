# API 端点参考

全局前缀: `/api`

Swagger 文档: `/api/docs`（`SWAGGER_ENABLED=true` 时可用）

## 公开端点（无需 Token）

| 方法 | 路径                         | 说明              |
| ---- | ---------------------------- | ----------------- |
| GET  | `/api/health`                | 健康检查          |
| GET  | `/api/ai/providers`          | 获取 AI 平台列表  |
| GET  | `/api/users/encryption-key`  | 获取 AES 加密密钥 |
| POST | `/api/users/register`        | 用户注册          |
| POST | `/api/users/login`           | 验证码登录        |
| POST | `/api/users/login-password`  | 密码登录          |
| POST | `/api/users/send-login-code` | 发送登录验证码    |
| POST | `/api/users/send-email-code` | 发送注册验证码    |

## 需认证端点

### 用户

| 方法   | 路径                                                | 说明         |
| ------ | --------------------------------------------------- | ------------ |
| POST   | `/api/users/logout`                                 | 登出         |
| POST   | `/api/users/refresh-token`                          | 刷新 Token   |
| GET    | `/api/users/roles?id=`                              | 用户角色列表 |
| GET    | `/api/users/permissions?id=`                        | 用户权限列表 |
| GET    | `/api/users/check-role?id=&roleCode=`               | 检查用户角色 |
| GET    | `/api/users/check-permission?id=&action=&resource=` | 检查用户权限 |
| POST   | `/api/users/assign-role`                            | 分配角色     |
| POST   | `/api/users/assign-roles-batch`                     | 批量分配角色 |
| DELETE | `/api/users/remove-role?id=&roleId=`                | 移除角色     |

### 用户管理（AdminGuard）

| 方法   | 路径                       | 说明         |
| ------ | -------------------------- | ------------ |
| GET    | `/api/users`               | 用户列表     |
| POST   | `/api/users/create`        | 创建用户     |
| DELETE | `/api/users`               | 批量删除用户 |
| PATCH  | `/api/users/toggle-status` | 批量切换状态 |

### 角色

| 方法   | 路径                                             | 说明         |
| ------ | ------------------------------------------------ | ------------ |
| POST   | `/api/roles`                                     | 创建角色     |
| GET    | `/api/roles`                                     | 角色列表     |
| GET    | `/api/roles/detail?id=`                          | 角色详情     |
| GET    | `/api/roles/by-code?code=`                       | 按代码查询   |
| PUT    | `/api/roles`                                     | 更新角色     |
| DELETE | `/api/roles?id=`                                 | 删除角色     |
| POST   | `/api/roles/assign-permissions`                  | 分配权限     |
| GET    | `/api/roles/permissions?id=`                     | 角色权限列表 |
| DELETE | `/api/roles/remove-permission?id=&permissionId=` | 移除权限     |

### 权限

| 方法   | 路径                                     | 说明                      |
| ------ | ---------------------------------------- | ------------------------- |
| POST   | `/api/permissions`                       | 创建权限                  |
| GET    | `/api/permissions`                       | 权限列表（支持搜索/筛选） |
| GET    | `/api/permissions/search?keyword=`       | 搜索权限                  |
| GET    | `/api/permissions/detail?id=`            | 权限详情                  |
| GET    | `/api/permissions/actions`               | 所有唯一动作              |
| GET    | `/api/permissions/resources`             | 所有唯一资源              |
| GET    | `/api/permissions/by-action?action=`     | 按动作查询                |
| GET    | `/api/permissions/by-resource?resource=` | 按资源查询                |
| GET    | `/api/permissions/tree`                  | 完整权限树                |
| GET    | `/api/permissions/menu-tree`             | 菜单树（不含按钮）        |
| GET    | `/api/permissions/level-1`               | 一级菜单                  |
| GET    | `/api/permissions/by-level?level=`       | 按层级查询                |
| GET    | `/api/permissions/:menuId/buttons`       | 菜单下按钮                |
| PUT    | `/api/permissions`                       | 更新权限                  |
| DELETE | `/api/permissions?id=`                   | 级联删除                  |

### AI

| 方法 | 路径                        | 说明             |
| ---- | --------------------------- | ---------------- |
| POST | `/api/ai/completion`        | AI 非流式回复    |
| SSE  | `/api/ai/completion/stream` | AI 流式回复      |
| PUT  | `/api/ai/config`            | 更新用户 AI 配置 |
| POST | `/api/ai/test-connection`   | 测试平台连接     |
| GET  | `/api/ai/requests`          | 请求历史         |

### 邮件

| 方法 | 路径             | 说明     |
| ---- | ---------------- | -------- |
| POST | `/api/mail/send` | 发送邮件 |

## 分页参数约定

列表接口统一使用 `{ page, limit }` 分页，返回格式：

```json
{
  "list": [...],
  "total": 100
}
```
