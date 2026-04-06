# 架构决策: 选择 Fastify 而非 Express

## 上下文

NestJS 默认使用 Express 作为 HTTP 适配器。项目需要选择底层 HTTP 框架。

## 选项

1. **Express** — NestJS 默认，社区生态最大
2. **Fastify** — 更高性能，更低的内存开销

## 决策

选择 **Fastify**。

## 理由

- 性能优势明显（基准测试约 2x 吞吐量）
- NestJS 官方完整支持，迁移成本几乎为零
- 项目无 Express 特定中间件依赖
- Fastify 的 JSON Schema 验证可替代部分手动校验

## 影响

- 请求/响应类型使用 `FastifyRequest` / `FastifyReply`
- 第三方中间件需要确认 Fastify 兼容性
