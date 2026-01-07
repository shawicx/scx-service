import { CacheService } from '@/modules/cache/cache.service';
import { User } from '@/modules/user/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Observable } from 'rxjs';
import { Repository } from 'typeorm';
import { AiService } from './ai.service';
import { AiRequestEntity } from './entities/ai-request.entity';
import { AiException } from './exceptions/ai.exception';
import { AiMessage, AiProviderType, AiResponse } from './interfaces/ai-provider.interface';
import { PROVIDER_FACTORY } from './providers/provider.factory';

describe('AiService', () => {
  let service: AiService;
  let cacheService: CacheService;
  let aiRequestRepository: Repository<AiRequestEntity>;

  // Mock user - 符合 User 实体结构
  const mockUser: User = {
    id: 'user-123',
    name: 'testuser',
    password: 'hashedpassword',
    email: 'test@example.com',
    preferences: {
      theme: 'light',
      language: 'zh-CN',
      timezone: 'Asia/Shanghai',
      notifications: {
        email: true,
        push: false,
        sms: false,
      },
      privacy: {
        profileVisible: true,
        showEmail: false,
        showLastSeen: true,
      },
      ai: {
        defaultProvider: 'copilot',
        providers: {
          copilot: {
            apiKey: 'test-copilot-key',
            enabled: true,
          },
          glm: {
            apiKey: 'test-glm-key',
            enabled: true,
          },
        },
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    emailVerified: false,
    emailVerificationCode: '',
    emailVerificationExpiry: new Date(),
    lastLoginIp: '',
    lastLoginAt: new Date(),
    loginCount: 1,
    isActive: true,
    userRoles: [],
  };

  // Mock provider
  const mockProvider = {
    type: 'copilot' as AiProviderType,
    name: 'GitHub Copilot',
    generateCompletion: jest.fn(),
    generateCompletionStream: jest.fn(),
    testConnection: jest.fn(),
    validateApiKey: jest.fn().mockReturnValue(true),
  };

  // Mock response
  const mockResponse: AiResponse = {
    content: 'This is a test response',
    model: 'gpt-4',
    tokensUsed: {
      prompt: 10,
      completion: 20,
      total: 30,
    },
    finishReason: 'stop',
    provider: 'copilot',
  };

  beforeEach(async () => {
    // 清理所有 mock
    jest.clearAllMocks();

    const mockProviderFactory = new Map();
    mockProviderFactory.set('copilot', mockProvider);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: PROVIDER_FACTORY,
          useValue: mockProviderFactory,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                'ai.cacheTtl': 3600,
                'ai.enableCache': true,
                'ai.monitoring.logRequests': true,
                'ai.defaultProvider': 'copilot',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AiRequestEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findAndCount: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    module.get<ConfigService>(ConfigService);
    cacheService = module.get<CacheService>(CacheService);
    aiRequestRepository = module.get<Repository<AiRequestEntity>>(
      getRepositoryToken(AiRequestEntity),
    );
    module.get<Map<AiProviderType, any>>(PROVIDER_FACTORY);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateCompletion', () => {
    it('should successfully generate completion with provider', async () => {
      const messages: AiMessage[] = [{ role: 'user', content: 'Hello' }];
      mockProvider.generateCompletion.mockResolvedValue(mockResponse);

      const result = await service.generateCompletion(mockUser, messages);

      expect(result).toEqual(mockResponse);
      expect(mockProvider.generateCompletion).toHaveBeenCalledWith(
        messages,
        {},
        'test-copilot-key',
      );
      expect(cacheService.set).toHaveBeenCalled();
      expect(aiRequestRepository.save).toHaveBeenCalled();
    });

    it('should return cached response when available', async () => {
      const messages: AiMessage[] = [{ role: 'user', content: 'Hello' }];

      // Mock cache to return a response
      (cacheService.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.generateCompletion(mockUser, messages);

      expect(result).toEqual(mockResponse);
      expect(cacheService.get).toHaveBeenCalled();
      // When cache hits, provider should not be called
      expect(mockProvider.generateCompletion).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled(); // No need to cache if already cached
    });

    it('should use explicit provider when specified', async () => {
      const messages: AiMessage[] = [{ role: 'user', content: 'Hello' }];
      mockProvider.generateCompletion.mockResolvedValue(mockResponse);

      await service.generateCompletion(mockUser, messages, {}, 'copilot');

      expect(mockProvider.generateCompletion).toHaveBeenCalled();
    });

    it('should throw exception when provider not available', async () => {
      const messages: AiMessage[] = [{ role: 'user', content: 'Hello' }];

      await expect(
        service.generateCompletion(mockUser, messages, {}, 'invalid' as AiProviderType),
      ).rejects.toThrow(AiException);
    });

    it('should throw exception when API key not configured', async () => {
      // 创建一个没有 AI 配置的用户对象
      const { ai, ...preferencesWithoutAi } = mockUser.preferences;
      const userWithoutKey = {
        ...mockUser,
        preferences: preferencesWithoutAi,
      };
      const messages: AiMessage[] = [{ role: 'user', content: 'Hello' }];

      await expect(service.generateCompletion(userWithoutKey, messages)).rejects.toThrow(
        AiException,
      );
    });

    it('should handle provider errors correctly', async () => {
      const messages: AiMessage[] = [{ role: 'user', content: 'Hello' }];
      const error = {
        response: { status: 401, data: { error: { message: 'Unauthorized' } } },
      };
      mockProvider.generateCompletion.mockRejectedValue(error);

      await expect(service.generateCompletion(mockUser, messages)).rejects.toThrow(AiException);
    });
  });

  describe('generateCompletionStream', () => {
    it('should return observable for streaming completion', () => {
      const messages: AiMessage[] = [{ role: 'user', content: 'Hello' }];
      const mockObservable = new Observable<AiResponse>((subscriber) => {
        subscriber.next(mockResponse);
        subscriber.complete();
      });

      mockProvider.generateCompletionStream.mockReturnValue(mockObservable);

      const result = service.generateCompletionStream(mockUser, messages);

      expect(result).toBeInstanceOf(Observable);
      expect(mockProvider.generateCompletionStream).toHaveBeenCalledWith(
        messages,
        {},
        'test-copilot-key',
      );
    });
  });

  describe('testConnection', () => {
    it('should return true when connection succeeds', async () => {
      mockProvider.testConnection.mockResolvedValue(true);

      const result = await service.testConnection(mockUser, 'copilot');

      expect(result).toBe(true);
      expect(mockProvider.testConnection).toHaveBeenCalledWith('test-copilot-key');
    });

    it('should return false when connection fails', async () => {
      mockProvider.testConnection.mockRejectedValue(new Error('Connection failed'));

      const result = await service.testConnection(mockUser, 'copilot');

      expect(result).toBe(false);
    });
  });

  describe('getAvailableProviders', () => {
    it('should return list of available providers', () => {
      const result = service.getAvailableProviders();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'copilot',
        name: 'GitHub Copilot',
      });
    });
  });

  describe('getRequestHistory', () => {
    it('should return paginated request history', async () => {
      const mockRequests = [
        { id: 'req-1', userId: 'user-123' } as const,
        { id: 'req-2', userId: 'user-123' } as const,
      ];

      (aiRequestRepository.findAndCount as jest.Mock).mockResolvedValue([mockRequests, 2]);

      const result = await service.getRequestHistory(mockUser, 1, 20);

      expect(result.data).toEqual(mockRequests);
      expect(result.total).toBe(2);
      expect(aiRequestRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('should handle pagination correctly', async () => {
      (aiRequestRepository.findAndCount as jest.Mock).mockResolvedValue([[], 0]);

      await service.getRequestHistory(mockUser, 2, 10);

      expect(aiRequestRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        order: { createdAt: 'DESC' },
        skip: 10,
        take: 10,
      });
    });
  });
});
