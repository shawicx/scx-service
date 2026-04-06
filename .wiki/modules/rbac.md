# RBAC 权限模型

> 涉及模块: `role/`, `permission/`, `user-role/`, `role-permission/`

## 数据模型

```
User ──(多对多)── UserRole ──(多对多)── Role
Role ──(多对多)── RolePermission ──(多对多)── Permission
```

中间表实体: `UserRole` (`userId` + `roleId`), `RolePermission` (`roleId` + `permissionId`)

### Role 实体

| 字段        | 说明                              |
| ----------- | --------------------------------- |
| name        | 角色名称，唯一                    |
| code        | 角色代码，唯一（如 `ROLE_ADMIN`） |
| description | 描述                              |
| isSystem    | 系统角色标记，不可修改/删除       |

### Permission 实体

支持**树形结构**，区分菜单和按钮两种类型。

| 字段     | 说明                                   |
| -------- | -------------------------------------- |
| name     | 权限名称，唯一                         |
| type     | `MENU` 或 `BUTTON`                     |
| action   | 操作（如 `read`, `write`, `delete`）   |
| resource | 资源（如 `user`, `workflow`）          |
| parentId | 父权限 ID，构成树                      |
| level    | 层级（1=一级菜单, 2=二级菜单, 3=按钮） |
| path     | 路由路径（菜单用）                     |
| icon     | 图标（菜单用）                         |
| sort     | 排序号                                 |
| visible  | 是否可见 (0/1)                         |
| status   | 状态 (0=禁用, 1=启用)                  |

### 层级规则

| 类型            | parentId          | level            | 约束               |
| --------------- | ----------------- | ---------------- | ------------------ |
| 一级菜单 (MENU) | null              | 1                | 根节点             |
| 二级菜单 (MENU) | 一级菜单 ID       | 2                | 必须挂在一级菜单下 |
| 按钮 (BUTTON)   | 一级或二级菜单 ID | parent.level + 1 | 必须有父节点       |

按钮允许直接挂在一级菜单下（level=2 或 level=3）。

## 关键 API

### Role

- `POST /api/roles` — 创建角色
- `PUT /api/roles` — 更新角色（系统角色不可修改）
- `DELETE /api/roles?id=` — 删除角色（系统角色不可删除）
- `GET /api/roles` — 分页列表
- `POST /api/roles/assign-permissions` — 为角色分配权限（覆盖式）
- `GET /api/roles/permissions?id=` — 获取角色的权限列表

### Permission

- `POST /api/permissions` — 创建权限
- `PUT /api/permissions` — 更新权限
- `DELETE /api/permissions?id=` — 级联删除（含子权限）
- `GET /api/permissions` — 分页列表（支持搜索/筛选）
- `GET /api/permissions/tree` — 完整权限树
- `GET /api/permissions/menu-tree` — 仅菜单树（不含按钮）
- `GET /api/permissions/level-1` — 一级菜单
- `GET /api/permissions/:menuId/buttons` — 菜单下的按钮

### User 关联操作

- `POST /api/users/assign-role` — 分配单个角色
- `POST /api/users/assign-roles-batch` — 批量分配角色
- `DELETE /api/users/remove-role` — 移除角色
- `GET /api/users/roles?id=` — 用户角色列表
- `GET /api/users/permissions?id=` — 用户权限列表
- `GET /api/users/check-role` — 检查用户是否拥有某角色
- `GET /api/users/check-permission` — 检查用户是否拥有某权限
