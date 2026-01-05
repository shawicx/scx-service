import { AiProviderType } from './ai-provider.interface';

export interface AiProviderConfig {
  apiKey: string;
  enabled: boolean;
  isDefault?: boolean;
  baseUrl?: string; // 可选：自定义端点
}

export interface UserAiConfig {
  defaultProvider?: AiProviderType;
  providers: {
    copilot?: AiProviderConfig;
    glm?: AiProviderConfig;
    qwen?: AiProviderConfig;
  };
}
