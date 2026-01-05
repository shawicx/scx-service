import { Observable } from 'rxjs';

export type AiProviderType = 'copilot' | 'glm' | 'qwen';

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiRequestOptions {
  temperature?: number; // 0-2
  maxTokens?: number; // 最大生成token数
  topP?: number; // 0-1
  stream?: boolean; // 是否流式
}

export interface AiResponse {
  content: string;
  model: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  finishReason: string;
  provider: AiProviderType;
}

export interface IAiProvider {
  // 平台标识
  readonly type: AiProviderType;
  readonly name: string;

  // API密钥验证
  validateApiKey: (apiKey: string) => boolean;

  // 非流式生成
  generateCompletion: (
    messages: AiMessage[],
    options: AiRequestOptions,
    apiKey: string,
  ) => Promise<AiResponse>;

  // 流式生成（SSE）
  generateCompletionStream: (
    messages: AiMessage[],
    options: AiRequestOptions,
    apiKey: string,
  ) => Observable<AiResponse>;

  // 连接测试
  testConnection: (apiKey: string) => Promise<boolean>;
}
