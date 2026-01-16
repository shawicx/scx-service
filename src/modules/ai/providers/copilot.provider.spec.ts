import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import axios from 'axios';
import { AiMessage, AiProviderType, AiRequestOptions } from '../interfaces/ai-provider.interface';
import { CopilotProvider } from './copilot.provider';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CopilotProvider', () => {
  let provider: CopilotProvider;

  const mockConfig = {
    'ai.providers.copilot.baseUrl': 'https://api.githubcopilot.com',
    'ai.providers.copilot.model': 'gpt-4',
  };

  // 创建 mock axios 实例
  const mockAxiosInstance = {
    post: jest.fn(),
    get: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };

  beforeEach(async () => {
    // 在创建测试模块之前设置 mock
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

    const module = await Test.createTestingModule({
      providers: [
        CopilotProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
      ],
    }).compile();

    provider = module.get<CopilotProvider>(CopilotProvider);
  });

  beforeEach(() => {
    // 每个测试前清理 mock 调用记录
    mockAxiosInstance.post.mockClear();
    mockAxiosInstance.get.mockClear();
  });

  afterEach(() => {
    // 测试后重置 mock
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('should have correct provider type and name', () => {
    expect(provider.type).toBe('copilot' as AiProviderType);
    expect(provider.name).toBe('GitHub Copilot');
  });

  describe('validateApiKey', () => {
    it('should validate GitHub Copilot API key starting with ghu_', () => {
      const validKey = 'ghu_1234567890abcdef';
      expect(provider.validateApiKey(validKey)).toBe(true);
    });

    it('should validate API key with length > 20', () => {
      const longKey = 'a'.repeat(25);
      expect(provider.validateApiKey(longKey)).toBe(true);
    });

    it('should reject invalid API keys', () => {
      const invalidKey = 'short';
      expect(provider.validateApiKey(invalidKey)).toBe(false);
    });

    it('should reject empty string', () => {
      expect(provider.validateApiKey('')).toBe(false);
    });
  });

  describe('generateCompletion', () => {
    const mockMessages: AiMessage[] = [{ role: 'user', content: 'Hello, how are you?' }];

    const mockOptions: AiRequestOptions = {
      temperature: 0.7,
      maxTokens: 1000,
      topP: 1.0,
    };

    const mockApiResponse = {
      data: {
        model: 'gpt-4',
        choices: [
          {
            message: {
              content: 'I am doing well, thank you!',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      },
    };

    it('should successfully generate completion', async () => {
      mockAxiosInstance.post.mockResolvedValue(mockApiResponse);

      const result = await provider.generateCompletion(mockMessages, mockOptions, 'test-api-key');

      expect(result).toEqual({
        content: 'I am doing well, thank you!',
        model: 'gpt-4',
        tokensUsed: {
          prompt: 10,
          completion: 20,
          total: 30,
        },
        finishReason: 'stop',
        provider: 'copilot',
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/chat/completions',
        {
          model: 'gpt-4',
          messages: mockMessages,
          temperature: 0.7,
          max_tokens: 1000,
          top_p: 1.0,
          stream: false,
        },
        {
          headers: {
            Authorization: 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
        },
      );
    });

    it('should use default model when not specified in options', async () => {
      mockAxiosInstance.post.mockResolvedValue(mockApiResponse);

      await provider.generateCompletion(mockMessages, {}, 'test-api-key');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/chat/completions',
        expect.objectContaining({
          model: 'gpt-4',
        }),
        expect.any(Object),
      );
    });

    it('should use default values for options when not provided', async () => {
      mockAxiosInstance.post.mockResolvedValue(mockApiResponse);

      await provider.generateCompletion(mockMessages, {}, 'test-api-key');

      const callArgs = mockAxiosInstance.post.mock.calls[0];
      expect(callArgs[1].temperature).toBe(0.7);
      expect(callArgs[1].max_tokens).toBe(2048);
      expect(callArgs[1].top_p).toBe(1.0);
    });

    it('should throw error on API failure', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('API Error'));

      await expect(
        provider.generateCompletion(mockMessages, mockOptions, 'test-api-key'),
      ).rejects.toThrow('API Error');
    });
  });

  describe('testConnection', () => {
    it('should return true when connection succeeds', async () => {
      mockAxiosInstance.get.mockResolvedValue({ status: 200 });

      const result = await provider.testConnection('test-api-key');

      expect(result).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/models', {
        headers: { Authorization: 'Bearer test-api-key' },
      });
    });

    it('should return false when connection fails', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Connection failed'));

      const result = await provider.testConnection('invalid-key');

      expect(result).toBe(false);
    });

    it('should return false on non-200 status', async () => {
      mockAxiosInstance.get.mockResolvedValue({ status: 401 });

      const result = await provider.testConnection('test-api-key');

      expect(result).toBe(false);
    });
  });

  describe('generateCompletionStream', () => {
    const mockMessages: AiMessage[] = [{ role: 'user', content: 'Hello' }];

    it('should return an observable', () => {
      mockAxiosInstance.post.mockReturnValue({
        data: {
          on: jest.fn(),
        },
      });

      const result = provider.generateCompletionStream(mockMessages, {}, 'test-api-key');

      expect(result).toBeDefined();
      expect(result.subscribe).toBeDefined();
    });

    it('should make request with stream: true', () => {
      const mockStream = {
        on: jest.fn(),
      };

      mockAxiosInstance.post.mockReturnValue({
        then: jest.fn((callback) => {
          callback({ data: mockStream });
          return { catch: jest.fn() };
        }),
      });

      const observable = provider.generateCompletionStream(mockMessages, {}, 'test-api-key');

      // 订阅触发请求
      observable.subscribe({
        next: () => {},
        complete: () => {},
        error: () => {},
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/chat/completions',
        expect.objectContaining({
          stream: true,
        }),
        expect.objectContaining({
          responseType: 'stream',
        }),
      );
    });
  });
});
