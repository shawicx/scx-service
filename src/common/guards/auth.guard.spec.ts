/*
 * @Author: shawicx d35f3153@proton.me
 * @Description: 鉴权
 */
import { AuthService } from '@/modules/auth/auth.service';
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  // let authService: AuthService;
  // let reflector: Reflector;

  const mockAuthService = {
    validateAccessToken: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const mockRequest = {
    headers: {
      authorization: '',
    },
  };

  const mockContext = {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
    // authService = module.get<AuthService>(AuthService);
    // reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true for public routes', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);

      const result = await guard.canActivate(mockContext as any);
      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException when no token provided', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockRequest.headers.authorization = '';

      await expect(guard.canActivate(mockContext as any)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockRequest.headers.authorization = 'Bearer invalid-token';
      mockAuthService.validateAccessToken.mockResolvedValue(null);

      await expect(guard.canActivate(mockContext as any)).rejects.toThrow(UnauthorizedException);
    });

    it('should return true when token is valid', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockRequest.headers.authorization = 'Bearer valid-token';
      mockAuthService.validateAccessToken.mockResolvedValue({
        userId: '123',
        email: 'test@example.com',
      });

      const result = await guard.canActivate(mockContext as any);
      expect(result).toBe(true);
    });
  });
});
