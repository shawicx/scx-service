import { CacheService } from '@/modules/cache/cache.service';
import { User } from '@/modules/user/entities/user.entity';
import { UserService } from '@/modules/user/user.service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Observable } from 'rxjs';
import { Repository } from 'typeorm';
import { AiRequestEntity } from './entities/ai-request.entity';
import { AiException } from './exceptions/ai.exception';
import {
  AiMessage,
  AiProviderType,
  AiRequestOptions,
  AiResponse,
} from './interfaces/ai-provider.interface';
import { PROVIDER_FACTORY } from './providers/provider.factory';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly cacheTtl: number;
  private readonly enableCache: boolean;
  private readonly logRequests: boolean;

  constructor(
    @Inject(PROVIDER_FACTORY)
    private readonly providerFactory: Map<AiProviderType, any>,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly userService: UserService,
    @InjectRepository(AiRequestEntity)
    private readonly aiRequestRepository: Repository<AiRequestEntity>,
  ) {
    this.cacheTtl = this.configService.get<number>('ai.cacheTtl', 3600);
    this.enableCache = this.configService.get<boolean>('ai.enableCache', true);
    this.logRequests = this.configService.get<boolean>('ai.monitoring.logRequests', true);
  }

  /**
   * 生成 AI 回复(非流式)
   */
  async generateCompletion(
    user: User,
    messages: AiMessage[],
    options: AiRequestOptions = {},
    explicitProvider?: AiProviderType,
  ): Promise<AiResponse> {
    const startTime = Date.now();

    // 1. 确定 provider
    const providerType = this.determineProvider(user, explicitProvider);
    const provider = this.getProvider(providerType);

    // 2. 获取 API 密钥
    const apiKey = this.getUserApiKey(user, providerType);

    // 3. 生成缓存键
    const cacheKey = this.generateCacheKey(providerType, messages, options);

    // 4. 检查缓存
    if (this.enableCache && !options.stream) {
      const cached = await this.cacheService.get<AiResponse>(cacheKey);
      if (cached) {
        this.logger.debug(`缓存命中: 用户 ${user.id}, provider: ${providerType}`);
        return cached;
      }
    }

    // 5. 生成响应
    try {
      const response = await provider.generateCompletion(messages, options, apiKey);

      // 6. 缓存响应
      if (this.enableCache && !options.stream) {
        await this.cacheService.set(cacheKey, response, this.cacheTtl);
      }

      // 7. 记录日志到数据库
      const duration = Date.now() - startTime;
      await this.logRequest(user, providerType, messages, response, duration, false);

      this.logger.log({
        userId: user.id,
        provider: providerType,
        messageCount: messages.length,
        duration: `${duration}ms`,
        tokens: response.tokensUsed,
        model: response.model,
      });

      return response;
    } catch (error) {
      this.handleError(error, providerType);
    }
  }

  /**
   * 生成 AI 回复(流式)
   */
  generateCompletionStream(
    user: User,
    messages: AiMessage[],
    options: AiRequestOptions = {},
    explicitProvider?: AiProviderType,
  ): Observable<AiResponse> {
    // 1. 确定 provider
    const providerType = this.determineProvider(user, explicitProvider);
    const provider = this.getProvider(providerType);

    // 2. 获取 API 密钥
    const apiKey = this.getUserApiKey(user, providerType);

    // 3. 返回流式响应
    return provider.generateCompletionStream(messages, options, apiKey);
  }

  /**
   * 测试平台连接
   */
  async testConnection(user: User, providerType: AiProviderType): Promise<boolean> {
    const provider = this.getProvider(providerType);
    const apiKey = this.getUserApiKey(user, providerType);

    try {
      const result = await provider.testConnection(apiKey);
      this.logger.log(`连接测试成功: 用户 ${user.id}, provider: ${providerType}`);
      return result;
    } catch (error) {
      this.logger.error(`连接测试失败: 用户 ${user.id}, provider: ${providerType}`, error);
      return false;
    }
  }

  /**
   * 获取可用的 provider 列表
   */
  getAvailableProviders(): Array<{ type: AiProviderType; name: string }> {
    return Array.from(this.providerFactory.values()).map((provider) => ({
      type: provider.type,
      name: provider.name,
    }));
  }

  /**
   * 获取用户的请求历史
   */
  async getRequestHistory(
    user: User,
    page = 1,
    limit = 20,
  ): Promise<{ data: AiRequestEntity[]; total: number }> {
    const [data, total] = await this.aiRequestRepository.findAndCount({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  /**
   * 更新用户 AI 配置
   * @param user 用户
   * @param config 配置数据
   */
  async updateUserConfig(
    user: User,
    config: {
      defaultProvider?: 'copilot' | 'glm' | 'qwen';
      providers?: {
        copilot?: { apiKey?: string; enabled?: boolean; baseUrl?: string };
        glm?: { apiKey?: string; enabled?: boolean; baseUrl?: string };
        qwen?: { apiKey?: string; enabled?: boolean; baseUrl?: string };
      };
    },
  ): Promise<void> {
    const currentAiConfig = user.preferences?.ai || {};

    const newAiConfig: any = { ...currentAiConfig };

    if (config.defaultProvider) {
      newAiConfig.defaultProvider = config.defaultProvider;
    }

    if (config.providers) {
      if (!newAiConfig.providers) {
        newAiConfig.providers = {};
      }

      if (config.providers.copilot) {
        newAiConfig.providers.copilot = {
          ...(newAiConfig.providers.copilot || {}),
          apiKey: config.providers.copilot.apiKey ?? newAiConfig.providers.copilot?.apiKey,
          enabled:
            config.providers.copilot.enabled ?? newAiConfig.providers.copilot?.enabled ?? true,
          baseUrl: config.providers.copilot.baseUrl ?? newAiConfig.providers.copilot?.baseUrl,
        };
      }

      if (config.providers.glm) {
        newAiConfig.providers.glm = {
          ...(newAiConfig.providers.glm || {}),
          apiKey: config.providers.glm.apiKey ?? newAiConfig.providers.glm?.apiKey,
          enabled: config.providers.glm.enabled ?? newAiConfig.providers.glm?.enabled ?? true,
          baseUrl: config.providers.glm.baseUrl ?? newAiConfig.providers.glm?.baseUrl,
        };
      }

      if (config.providers.qwen) {
        newAiConfig.providers.qwen = {
          ...(newAiConfig.providers.qwen || {}),
          apiKey: config.providers.qwen.apiKey ?? newAiConfig.providers.qwen?.apiKey,
          enabled: config.providers.qwen.enabled ?? newAiConfig.providers.qwen?.enabled ?? true,
          baseUrl: config.providers.qwen.baseUrl ?? newAiConfig.providers.qwen?.baseUrl,
        };
      }
    }

    await this.userService.updatePreferences(user.id, { ai: newAiConfig });
  }

  // ==================== 私有方法 ====================

  /**
   * 确定 provider (三级优先级: 显式 > 用户默认 > 系统默认)
   */
  private determineProvider(user: User, explicitProvider?: AiProviderType): AiProviderType {
    // 优先级1: 显式指定
    if (explicitProvider) {
      return explicitProvider;
    }

    // 优先级2: 用户默认
    const userDefault = user.preferences?.ai?.defaultProvider;
    if (userDefault) {
      return userDefault;
    }

    // 优先级3: 系统默认
    return this.configService.get<AiProviderType>('ai.defaultProvider', 'copilot');
  }

  /**
   * 获取 provider 实例
   */
  private getProvider(type: AiProviderType): any {
    const provider = this.providerFactory.get(type);
    if (!provider) {
      throw AiException.providerNotAvailable(type);
    }
    return provider;
  }

  /**
   * 获取用户 API 密钥
   */
  private getUserApiKey(user: User, providerType: AiProviderType): string {
    const apiKey = user.preferences?.ai?.providers?.[providerType]?.apiKey;

    if (!apiKey) {
      throw AiException.apiKeyNotConfigured(providerType);
    }

    const provider = this.getProvider(providerType);
    if (!provider.validateApiKey(apiKey)) {
      throw AiException.invalidApiKey(providerType);
    }

    return apiKey;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(
    provider: AiProviderType,
    messages: AiMessage[],
    options: AiRequestOptions,
  ): string {
    const hash = Buffer.from(
      JSON.stringify({
        provider,
        messages,
        options: {
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          topP: options.topP,
        },
      }),
    )
      .toString('base64')
      .substring(0, 32);

    return `ai:${provider}:${hash}`;
  }

  /**
   * 记录请求日志到数据库
   */
  private async logRequest(
    user: User,
    provider: AiProviderType,
    messages: AiMessage[],
    response: AiResponse,
    duration: number,
    isCached: boolean,
  ): Promise<void> {
    if (!this.logRequests) {
      return;
    }

    try {
      const requestLog = this.aiRequestRepository.create({
        userId: user.id,
        provider,
        messages: messages as any,
        response: response as any,
        promptTokens: response.tokensUsed.prompt,
        completionTokens: response.tokensUsed.completion,
        totalTokens: response.tokensUsed.total,
        duration,
        isStream: false,
        finishReason: response.finishReason,
        isCached,
      });

      await this.aiRequestRepository.save(requestLog);
    } catch (error) {
      this.logger.error('记录请求日志失败:', error);
    }
  }

  /**
   * 错误处理和映射
   */
  private handleError(error: any, provider: AiProviderType): never {
    this.logger.error(`Provider ${provider} 请求失败:`, error);

    // HTTP 错误
    if (error.response) {
      const { status } = error.response;
      const { data } = error.response;

      switch (status) {
        case 401:
          throw AiException.authenticationFailed(provider);
        case 429:
          this.logger.warn(`频率限制: ${provider}, 请降低请求频率`);
          throw AiException.rateLimitExceeded(provider);
        case 402:
          throw AiException.insufficientQuota(provider);
        case 403:
          throw AiException.fromContentPolicyViolation(provider, data?.error?.message);
        default:
          if (status >= 500) {
            throw AiException.providerNotAvailable(provider);
          }
          throw AiException.fromProviderError(provider, data?.error?.message || 'Unknown error');
      }
    }

    // 网络错误
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw AiException.requestTimeout(provider);
    }

    // 默认错误
    throw AiException.fromProviderError(provider, error.message || 'Unknown error');
  }
}
