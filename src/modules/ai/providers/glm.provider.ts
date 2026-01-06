import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import axios, { AxiosInstance } from 'axios';
import {
  IAiProvider,
  AiProviderType,
  AiMessage,
  AiRequestOptions,
  AiResponse,
} from '../interfaces/ai-provider.interface';

@Injectable()
export class GlmProvider implements IAiProvider {
  readonly type: AiProviderType = 'glm';
  readonly name = 'GLM (智谱AI)';

  private readonly logger = new Logger(GlmProvider.name);
  private readonly client: AxiosInstance;
  private readonly baseUrl: string;
  private readonly defaultModel: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('ai.providers.glm.baseUrl');
    this.defaultModel = this.configService.get<string>('ai.providers.glm.model');

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    });
  }

  validateApiKey(apiKey: string): boolean {
    // GLM API key 格式：id.secret 或长度大于30
    return apiKey.includes('.') || apiKey.length > 30;
  }

  async generateCompletion(
    messages: AiMessage[],
    options: AiRequestOptions,
    apiKey: string,
  ): Promise<AiResponse> {
    try {
      const response = await this.client.post(
        '/chat/completions',
        {
          model: options.model || this.defaultModel,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 2048,
          top_p: options.topP ?? 1.0,
          stream: false,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const { data } = response;

      return {
        content: data.choices[0].message.content,
        model: data.model,
        tokensUsed: {
          prompt: data.usage.prompt_tokens,
          completion: data.usage.completion_tokens,
          total: data.usage.total_tokens,
        },
        finishReason: data.choices[0].finish_reason,
        provider: this.type,
      };
    } catch (error) {
      this.logger.error(`GLM API error: ${error.message}`);
      throw error;
    }
  }

  generateCompletionStream(
    messages: AiMessage[],
    options: AiRequestOptions,
    apiKey: string,
  ): Observable<AiResponse> {
    return new Observable<AiResponse>((subscriber) => {
      const controller = new AbortController();

      this.client
        .post(
          '/chat/completions',
          {
            model: options.model || this.defaultModel,
            messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 2048,
            top_p: options.topP ?? 1.0,
            stream: true,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            responseType: 'stream',
            signal: controller.signal,
          },
        )
        .then((response) => {
          response.data.on('data', (chunk: Buffer) => {
            const lines = chunk
              .toString()
              .split('\n')
              .filter((line) => line.trim() !== '');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  subscriber.complete();
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed.choices[0]?.delta?.content;

                  if (delta) {
                    subscriber.next({
                      content: delta,
                      model: parsed.model,
                      tokensUsed: { prompt: 0, completion: 0, total: 0 },
                      finishReason: parsed.choices[0]?.finish_reason || '',
                      provider: this.type,
                    });
                  }
                } catch (e) {
                  this.logger.warn(`Failed to parse SSE data: ${e.message}`);
                }
              }
            }
          });

          response.data.on('end', () => subscriber.complete());
          response.data.on('error', (error) => subscriber.error(error));
        })
        .catch((error) => {
          subscriber.error(error);
        });

      // Cleanup on unsubscribe
      return () => controller.abort();
    });
  }

  async testConnection(apiKey: string): Promise<boolean> {
    try {
      const response = await this.client.get('/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}
