import { registerAs } from '@nestjs/config';

export const aiConfig = registerAs('ai', () => ({
  // 默认平台
  defaultProvider: process.env.AI_DEFAULT_PROVIDER || 'copilot',

  // 请求配置
  timeout: parseInt(process.env.AI_TIMEOUT || '30000', 10),
  maxTokensLimit: parseInt(process.env.AI_MAX_TOKENS_LIMIT || '4096', 10),

  // 缓存配置
  enableCache: process.env.AI_ENABLE_CACHE !== 'false',
  cacheTtl: parseInt(process.env.AI_CACHE_TTL || '3600', 10),

  // 平台特定配置
  providers: {
    copilot: {
      baseUrl: process.env.COPILOT_BASE_URL || 'https://api.githubcopilot.com',
      model: process.env.COPILOT_MODEL || 'gpt-4',
    },
    glm: {
      baseUrl: process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
      model: process.env.GLM_MODEL || 'glm-4',
    },
    qwen: {
      baseUrl: process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1',
      model: process.env.QWEN_MODEL || 'qwen-turbo',
    },
  },

  // 监控配置
  monitoring: {
    logRequests: process.env.AI_LOG_REQUESTS !== 'false',
    logResponses: process.env.AI_LOG_RESPONSES === 'true',
    logTokens: process.env.AI_LOG_TOKENS === 'true',
  },
}));
