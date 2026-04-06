# 架构决策: 树形权限结构

## 上下文

权限系统需要支持菜单和按钮两种类型，菜单有层级关系（一级菜单 > 二级菜单 > 按钮）。

## 选项

1. **扁平结构** — action + resource 纯权限
2. **树形结构** — parentId + level 构建菜单树，按钮挂在菜单下

## 决策

选择**树形结构**。

## 理由

- 前端菜单渲染需要树形数据
- 按钮权限需要归属到具体菜单下
- 支持级联删除（删除菜单时自动删除子按钮）
- 兼容传统 RBAC 的 action + resource 权限粒度

## 层级规则

```
level 1: 一级菜单 (parentId = null, type = MENU)
level 2: 二级菜单 (parentId = 一级菜单ID, type = MENU) 或一级菜单下的按钮 (type = BUTTON)
level 3: 二级菜单下的按钮 (parentId = 二级菜单ID, type = BUTTON)
```

约束：

- BUTTON 类型必须有 parentId
- 二级菜单必须挂在一级菜单下
- 按钮允许挂在一级或二级菜单下

## 影响

- 删除菜单前需检查是否有关联的角色权限分配
- `deleteCascade` 递归删除子权限
- 查询菜单树使用内存构建（非数据库递归查询）
