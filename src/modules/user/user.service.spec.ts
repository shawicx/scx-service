import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth/auth.service';
import { CacheService } from '../cache/cache.service';
import { MailService } from '../mail/mail.service';
import { Role } from '../role/entities/role.entity';
import { UserRole } from '../user-role/entities/user-role.entity';
import { RegisterUserDto } from './dto/register-user.dto';
import { User } from './entities/user.entity';
import { UserService } from './user.service';

// 模拟 CryptoUtil 模块
jest.mock('@/common/utils/crypto.util', () => ({
  CryptoUtil: {
    decrypt: jest.fn().mockImplementation((text) => text), // 默认返回原文
  },
}));

import { CryptoUtil } from '@/common/utils/crypto.util';

describe('UserService', () => {
  let userService: UserService;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockRoleRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockUserRoleRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getMany: jest.fn(),
    })),
  };

  const mockCacheService = {
    get: jest.fn(),
    setWithMilliseconds: jest.fn(),
    del: jest.fn(),
  };

  const mockMailService = {
    sendVerificationCode: jest.fn(),
    sendWelcomeEmail: jest.fn(),
  };

  const mockAuthService = {
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    logout: jest.fn(),
    refreshTokens: jest.fn(),
    generateEncryptionKey: jest.fn(),
    getEncryptionKey: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Role),
          useValue: mockRoleRepository,
        },
        {
          provide: getRepositoryToken(UserRole),
          useValue: mockUserRoleRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerUserDto: RegisterUserDto = {
        email: 'serve.suitor386@passinbox.com',
        name: 'Test User',
        password: 'password123',
        emailVerificationCode: '123456',
      };

      const mockUser = {
        id: '1',
        email: 'serve.suitor386@passinbox.com',
        name: 'Test User',
        password: 'hashedPassword',
        emailVerified: true,
        preferences: {
          theme: 'light',
          language: 'zh-CN',
          timezone: 'Asia/Shanghai',
          notifications: {
            email: true,
            push: true,
            sms: false,
          },
          privacy: {
            profileVisible: true,
            showEmail: false,
            showLastSeen: true,
          },
        },
        lastLoginIp: '127.0.0.1',
        lastLoginAt: new Date(),
        loginCount: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      mockCacheService.get.mockResolvedValue('123456');
      // 使用 spyOn 来模拟 bcrypt.hash
      const bcryptSpy = jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedPassword' as never);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockMailService.sendWelcomeEmail.mockResolvedValue(undefined);

      const result = await userService.register(registerUserDto, '127.0.0.1');

      // 使用 toMatchObject 来检查部分属性，而不是完全匹配
      expect(result).toMatchObject({
        id: '1',
        email: 'serve.suitor386@passinbox.com',
        name: 'Test User',
        emailVerified: true,
        preferences: mockUser.preferences,
        lastLoginIp: '127.0.0.1',
        lastLoginAt: mockUser.lastLoginAt,
        loginCount: 1,
        isActive: true,
      });
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'serve.suitor386@passinbox.com' },
      });
      expect(bcryptSpy).toHaveBeenCalledWith('password123', 12);
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      const registerUserDto: RegisterUserDto = {
        email: 'existing@example.com',
        name: 'Test User',
        password: 'password123',
        emailVerificationCode: '123456',
      };

      const existingUser = {
        id: '1',
        email: 'existing@example.com',
        name: 'Existing User',
        password: 'hashedPassword',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(existingUser);

      await expect(userService.register(registerUserDto)).rejects.toThrow(ConflictException);
      await expect(userService.register(registerUserDto)).rejects.toThrow('该邮箱已被注册');
    });

    it('should throw BadRequestException if email verification code is invalid', async () => {
      const registerUserDto: RegisterUserDto = {
        email: 'serve.suitor386@passinbox.com',
        name: 'Test User',
        password: 'password123',
        emailVerificationCode: '123456',
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      mockCacheService.get.mockResolvedValue('654321'); // Different code

      await expect(userService.register(registerUserDto)).rejects.toThrow(BadRequestException);
      await expect(userService.register(registerUserDto)).rejects.toThrow('邮箱验证码无效或已过期');
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: '1',
        email: 'serve.suitor386@passinbox.com',
        name: 'Test User',
        password: 'hashedPassword',
        emailVerified: true,
        preferences: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await userService.findById('1');

      // 我们只检查返回对象的部分属性，而不是全部
      expect(result).toMatchObject({
        id: '1',
        email: 'serve.suitor386@passinbox.com',
        name: 'Test User',
        emailVerified: true,
        preferences: {},
        isActive: true,
      });
    });

    it('should return null when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await userService.findById('999');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: '1',
        email: 'serve.suitor386@passinbox.com',
        name: 'Test User',
        password: 'hashedPassword',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await userService.findByEmail('serve.suitor386@passinbox.com');

      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await userService.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('assignRole', () => {
    it('should assign role to user successfully', async () => {
      const userId = '1';
      const roleId = 'role1';
      const assignRoleDto = { roleId };

      const mockUser = {
        id: userId,
        email: 'serve.suitor386@passinbox.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockRole = { id: roleId, name: 'Admin', createdAt: new Date(), updatedAt: new Date() };
      const mockUserRole = { userId, roleId };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockRoleRepository.findOne.mockResolvedValue(mockRole);
      mockUserRoleRepository.findOne.mockResolvedValue(null);
      mockUserRoleRepository.create.mockReturnValue(mockUserRole);
      mockUserRoleRepository.save.mockResolvedValue(mockUserRole);

      const result = await userService.assignRole(userId, assignRoleDto);

      expect(result).toEqual({ userId, roleId });
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
      expect(mockRoleRepository.findOne).toHaveBeenCalledWith({ where: { id: roleId } });
      expect(mockUserRoleRepository.findOne).toHaveBeenCalledWith({ where: { userId, roleId } });
      expect(mockUserRoleRepository.create).toHaveBeenCalledWith({ userId, roleId });
      expect(mockUserRoleRepository.save).toHaveBeenCalledWith(mockUserRole);
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = '999';
      const roleId = 'role1';
      const assignRoleDto = { roleId };

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(userService.assignRole(userId, assignRoleDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(userService.assignRole(userId, assignRoleDto)).rejects.toThrow('用户不存在');
    });

    it('should throw NotFoundException if role not found', async () => {
      const userId = '1';
      const roleId = '999';
      const assignRoleDto = { roleId };

      const mockUser = {
        id: userId,
        email: 'serve.suitor386@passinbox.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockRoleRepository.findOne.mockResolvedValue(null);

      await expect(userService.assignRole(userId, assignRoleDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(userService.assignRole(userId, assignRoleDto)).rejects.toThrow('角色不存在');
    });

    it('should throw ConflictException if user already has the role', async () => {
      const userId = '1';
      const roleId = 'role1';
      const assignRoleDto = { roleId };

      const mockUser = {
        id: userId,
        email: 'serve.suitor386@passinbox.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockRole = { id: roleId, name: 'Admin', createdAt: new Date(), updatedAt: new Date() };
      const mockUserRole = { userId, roleId };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockRoleRepository.findOne.mockResolvedValue(mockRole);
      mockUserRoleRepository.findOne.mockResolvedValue(mockUserRole);

      await expect(userService.assignRole(userId, assignRoleDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(userService.assignRole(userId, assignRoleDto)).rejects.toThrow(
        '用户已拥有该角色',
      );
    });
  });

  describe('loginWithEmailCode', () => {
    it('should login user successfully with email code', async () => {
      const loginUserDto = {
        email: 'serve.suitor386@passinbox.com',
        emailVerificationCode: '123456',
      };

      const mockUser = {
        id: '1',
        email: 'serve.suitor386@passinbox.com',
        name: 'Test User',
        password: 'hashedPassword',
        emailVerified: true,
        preferences: {},
        lastLoginIp: null,
        lastLoginAt: null,
        loginCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedUser = {
        ...mockUser,
        lastLoginIp: '127.0.0.1',
        lastLoginAt: new Date(),
        loginCount: 1,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockCacheService.get.mockResolvedValue('123456');
      mockUserRepository.update.mockResolvedValue(undefined);
      mockAuthService.generateAccessToken.mockResolvedValue('access-token');
      mockAuthService.generateRefreshToken.mockResolvedValue('refresh-token');
      mockUserRepository.findOne.mockResolvedValueOnce(mockUser).mockResolvedValueOnce(updatedUser);

      const result = await userService.loginWithEmailCode(loginUserDto, '127.0.0.1');

      // 使用 toMatchObject 来检查部分属性
      expect(result).toMatchObject({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      // LoginResponseDto 直接包含用户信息，而不是 user 属性
      expect(result).toMatchObject({
        id: '1',
        email: 'serve.suitor386@passinbox.com',
        name: 'Test User',
        emailVerified: true,
        preferences: {},
        loginCount: 1,
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const loginUserDto = {
        email: 'nonexistent@example.com',
        emailVerificationCode: '123456',
      };

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(userService.loginWithEmailCode(loginUserDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(userService.loginWithEmailCode(loginUserDto)).rejects.toThrow('邮箱不存在');
    });

    it('should throw UnauthorizedException if email verification code is invalid', async () => {
      const loginUserDto = {
        email: 'serve.suitor386@passinbox.com',
        emailVerificationCode: '123456',
      };

      const mockUser = {
        id: '1',
        email: 'serve.suitor386@passinbox.com',
        name: 'Test User',
        password: 'hashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockCacheService.get.mockResolvedValue('654321'); // Different code

      await expect(userService.loginWithEmailCode(loginUserDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(userService.loginWithEmailCode(loginUserDto)).rejects.toThrow(
        '邮箱验证码无效或已过期',
      );
    });
  });

  describe('loginWithPassword', () => {
    it('should login user successfully with password', async () => {
      const loginWithPasswordDto = {
        email: 'serve.suitor386@passinbox.com',
        password: 'encryptedPassword',
      };
      const keyId = 'key123';

      const mockUser = {
        id: '1',
        email: 'serve.suitor386@passinbox.com',
        name: 'Test User',
        password: '$2b$12$hashedPassword', // bcrypt hashed password
        emailVerified: true,
        preferences: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedUser = {
        ...mockUser,
        lastLoginIp: '127.0.0.1',
        lastLoginAt: new Date(),
        loginCount: 1,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockAuthService.getEncryptionKey.mockResolvedValue('encryptionKey');

      // 模拟 CryptoUtil.decrypt 方法返回解密后的密码
      (CryptoUtil.decrypt as jest.Mock).mockReturnValue('decryptedPassword');

      // 使用 spyOn 来模拟 bcrypt.compare
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      mockUserRepository.update.mockResolvedValue(undefined);
      mockAuthService.generateAccessToken.mockResolvedValue('access-token');
      mockAuthService.generateRefreshToken.mockResolvedValue('refresh-token');
      mockUserRepository.findOne.mockResolvedValueOnce(mockUser).mockResolvedValueOnce(updatedUser);

      const result = await userService.loginWithPassword(loginWithPasswordDto, keyId, '127.0.0.1');

      // 使用 toMatchObject 来检查部分属性
      expect(result).toMatchObject({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      // LoginResponseDto 直接包含用户信息，而不是 user 属性
      expect(result).toMatchObject({
        id: '1',
        email: 'serve.suitor386@passinbox.com',
        name: 'Test User',
        emailVerified: true,
        preferences: {},
        loginCount: 1,
      });

      // 验证 CryptoUtil.decrypt 被调用
      expect(CryptoUtil.decrypt).toHaveBeenCalledWith('encryptedPassword', 'encryptionKey');
    });

    it('should throw BadRequestException if keyId is missing', async () => {
      const loginWithPasswordDto = {
        email: 'serve.suitor386@passinbox.com',
        password: 'encryptedPassword',
      };

      await expect(userService.loginWithPassword(loginWithPasswordDto, '')).rejects.toThrow(
        BadRequestException,
      );
      await expect(userService.loginWithPassword(loginWithPasswordDto, '')).rejects.toThrow(
        '密码必须加密传输，请先获取加密密钥',
      );
    });

    it('should throw BadRequestException if encryption key is expired', async () => {
      const loginWithPasswordDto = {
        email: 'serve.suitor386@passinbox.com',
        password: 'encryptedPassword',
      };
      const keyId = 'expiredKey';

      mockAuthService.getEncryptionKey.mockResolvedValue(null);

      await expect(userService.loginWithPassword(loginWithPasswordDto, keyId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(userService.loginWithPassword(loginWithPasswordDto, keyId)).rejects.toThrow(
        '加密密钥已过期，请重新获取',
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const loginWithPasswordDto = {
        email: 'nonexistent@example.com',
        password: 'encryptedPassword',
      };
      const keyId = 'key123';

      // 模拟加密密钥存在但用户不存在的情况
      mockAuthService.getEncryptionKey.mockResolvedValue('encryptionKey');

      // 模拟 CryptoUtil.decrypt 方法
      (CryptoUtil.decrypt as jest.Mock).mockReturnValue('decryptedPassword');

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(userService.loginWithPassword(loginWithPasswordDto, keyId)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(userService.loginWithPassword(loginWithPasswordDto, keyId)).rejects.toThrow(
        '邮箱或密码错误',
      );
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      const loginWithPasswordDto = {
        email: 'serve.suitor386@passinbox.com',
        password: 'encryptedPassword',
      };
      const keyId = 'key123';

      const mockUser = {
        id: '1',
        email: 'serve.suitor386@passinbox.com',
        name: 'Test User',
        password: '$2b$12$hashedPassword',
        emailVerified: true,
        preferences: {},
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockAuthService.getEncryptionKey.mockResolvedValue('encryptionKey');

      // 模拟 CryptoUtil.decrypt 方法
      (CryptoUtil.decrypt as jest.Mock).mockReturnValue('wrongPassword');

      // 使用 spyOn 来模拟 bcrypt.compare 返回 false
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(userService.loginWithPassword(loginWithPasswordDto, keyId)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(userService.loginWithPassword(loginWithPasswordDto, keyId)).rejects.toThrow(
        '邮箱或密码错误',
      );
    });
  });
});
