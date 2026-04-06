# AI 模块

> 路径: `src/modules/ai/`

## 架构

采用**工厂模式**管理多个 AI Provider：

```
AiController → AiService → ProviderFactory → { CopilotProvider, GlmProvider, QwenProvider }
```

### IAiProvider 接口

```typescript
interface IAiProvider {
  readonly type: AiProviderType; // 'copilot' | 'glm' | 'qwen'
  readonly name: string;
  validateApiKey(apiKey: string): boolean;
  generateCompletion(messages, options, apiKey): Promise<AiResponse>;
  generateCompletionStream(messages, options, apiKey): Observable<AiResponse>;
  testConnection(apiKey): Promise<boolean>;
}
```

### Provider 注册

`provider.factory.ts` 通过 `ConfigService` 动态创建 Provider 实例，注册为 `Map<AiProviderType, IAiProvider>`。

### Provider 选择优先级

1. 请求中显式指定的 `provider`
2. 用户 `preferences.ai.defaultProvider` 配置
3. 系统默认 `AI_DEFAULT_PROVIDER` 环境变量

### API Key 来源

从用户 `preferences.ai.providers.{provider}.apiKey` 读取。

## 支持的平台

| Provider | 环境变量前缀 | 默认模型   | Base URL                              |
| -------- | ------------ | ---------- | ------------------------------------- |
| Copilot  | `COPILOT_*`  | gpt-5      | https://api.githubcopilot.com         |
| GLM      | `GLM_*`      | glm-4.7    | https://open.bigmodel.cn/api/paas/v4/ |
| Qwen     | `QWEN_*`     | qwen-turbo | https://dashscope.aliyuncs.com/api/v1 |

## 功能特性

- **缓存**: 相同请求返回缓存结果（`AI_CACHE_TTL` 可配置）
- **Token 统计**: 每次请求记录 prompt/completion/total token 数
- **请求历史**: 保存到 `AiRequest` 实体，支持分页查询
- **流式响应**: 通过 SSE 端点 `/api/ai/completion/stream` 实现

## 关键文件

| 文件                               | 职责                     |
| ---------------------------------- | ------------------------ |
| `ai.controller.ts`                 | 非流式端点               |
| `ai-stream.controller.ts`          | SSE 流式端点             |
| `ai.service.ts`                    | 业务逻辑、缓存、历史记录 |
| `providers/provider.factory.ts`    | Provider 工厂            |
| `providers/copilot.provider.ts`    | GitHub Copilot 实现      |
| `providers/glm.provider.ts`        | 智谱 AI 实现             |
| `providers/qwen.provider.ts`       | 通义千问实现             |
| `entities/ai-request.entity.ts`    | 请求历史实体             |
| `exceptions/ai.exception.ts`       | AI 专用异常              |
| `exceptions/ai-error-code.enum.ts` | AI 错误码枚举            |
