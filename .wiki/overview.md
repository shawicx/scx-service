# SCX Service

基于 NestJS 的企业级后端服务框架。

## 核心能力

- **用户认证**: JWT 双 Token + AES 密码加密 + 邮箱验证码
- **RBAC 权限**: User → Role → Permission 三层模型，支持树形菜单/按钮权限
- **AI 集成**: 多平台统一接口（Copilot / GLM / Qwen），支持流式和非流式
- **邮件服务**: 基于 Handlebars 模板的邮件发送
- **健康检查**: 数据库 + Redis 连接状态检测

## 快速开始

```bash
pnpm install          # 安装依赖
pnpm run dev          # 开发模式（热重载）
pnpm run build        # 构建
pnpm run test         # 测试
pnpm run lint:fix     # 代码检查+格式化
```

## 项目仓库

- GitHub: https://github.com/shawicx/scx-service

## Wiki 导航

- [架构设计](architecture.md)
- [技术栈](tech-stack.md)
- [模块详解](modules/)
- [API 文档](api/)
- [架构决策记录](decisions/)
- [故障排查](troubleshooting/)
