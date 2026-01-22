import { Test, TestingModule } from '@nestjs/testing';
import { LoginUserDto, LoginWithPasswordDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { AssignRoleDto, AssignRolesDto } from './dto/user-role.dto';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
  let userController: UserController;

  const mockUserService = {
    register: jest.fn(),
    loginWithEmailCode: jest.fn(),
    loginWithPassword: jest.fn(),
    logout: jest.fn(),
    refreshTokens: jest.fn(),
    getEncryptionKey: jest.fn(),
    sendLoginVerificationCode: jest.fn(),
    sendEmailVerificationCode: jest.fn(),
    assignRole: jest.fn(),
    assignRoles: jest.fn(),
    removeRole: jest.fn(),
    getUserRoles: jest.fn(),
    getUserPermissions: jest.fn(),
    hasRole: jest.fn(),
    hasPermission: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    userController = module.get<UserController>(UserController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a user successfully', async () => {
      const registerUserDto: RegisterUserDto = {
        email: 'serve.suitor386@passinbox.com',
        name: 'Test User',
        password: 'password123',
        emailVerificationCode: '123456',
      };

      const mockRequest = {
        headers: {},
        connection: { remoteAddress: '127.0.0.1' },
      };

      const expectedResult: any = {
        id: '1',
        email: 'serve.suitor386@passinbox.com',
        name: 'Test User',
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
      };

      mockUserService.register.mockResolvedValue(expectedResult);

      const result = await userController.register(registerUserDto, mockRequest as any);

      expect(result).toEqual(expectedResult);
      expect(mockUserService.register).toHaveBeenCalledWith(registerUserDto, '127.0.0.1');
    });
  });

  describe('login', () => {
    it('should login user with email code successfully', async () => {
      const loginUserDto: LoginUserDto = {
        email: 'serve.suitor386@passinbox.com',
        emailVerificationCode: '123456',
      };

      const mockRequest = {
        headers: {},
        connection: { remoteAddress: '127.0.0.1' },
      };

      const mockUser = {
        id: '1',
        email: 'serve.suitor386@passinbox.com',
        name: 'Test User',
        emailVerified: true,
        preferences: {},
        lastLoginIp: '127.0.0.1',
        lastLoginAt: new Date(),
        loginCount: 1,
        isActive: true,
      };

      const expectedResult: any = {
        user: mockUser,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockUserService.loginWithEmailCode.mockResolvedValue(expectedResult);

      const result = await userController.login(loginUserDto, mockRequest as any);

      expect(result).toEqual(expectedResult);
      expect(mockUserService.loginWithEmailCode).toHaveBeenCalledWith(loginUserDto, '127.0.0.1');
    });
  });

  describe('loginWithPassword', () => {
    it('should login user with password successfully', async () => {
      const loginWithPasswordDto: LoginWithPasswordDto = {
        email: 'serve.suitor386@passinbox.com',
        password: 'encryptedPassword',
        keyId: 'key123',
      };

      const keyId = 'key123';
      const mockRequest = {
        headers: {},
        connection: { remoteAddress: '127.0.0.1' },
      };

      const mockUser = {
        id: '1',
        email: 'serve.suitor386@passinbox.com',
        name: 'Test User',
        emailVerified: true,
        preferences: {},
        lastLoginIp: '127.0.0.1',
        lastLoginAt: new Date(),
        loginCount: 1,
        isActive: true,
      };

      const expectedResult: any = {
        user: mockUser,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockUserService.loginWithPassword.mockResolvedValue(expectedResult);

      const result = await userController.loginWithPassword(
        loginWithPasswordDto,
        mockRequest as any,
      );

      expect(result).toEqual(expectedResult);
      expect(mockUserService.loginWithPassword).toHaveBeenCalledWith(
        loginWithPasswordDto,
        keyId,
        '127.0.0.1',
      );
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      const userId = '1';
      mockUserService.logout.mockResolvedValue(undefined);

      const result = await userController.logout(userId);

      expect(result).toEqual({ message: '登出成功' });
      expect(mockUserService.logout).toHaveBeenCalledWith(userId);
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens successfully', async () => {
      const body = { refreshToken: 'refresh-token' };
      const tokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      mockUserService.refreshTokens.mockResolvedValue(tokens);

      const result = await userController.refreshToken(body);

      expect(result).toEqual(tokens);
      expect(mockUserService.refreshTokens).toHaveBeenCalledWith('refresh-token');
    });

    it('should throw error if refresh token is invalid', async () => {
      const body = { refreshToken: 'invalid-token' };

      mockUserService.refreshTokens.mockResolvedValue(null);

      await expect(userController.refreshToken(body)).rejects.toThrow(Error);
      await expect(userController.refreshToken(body)).rejects.toThrow('刷新令牌无效或已过期');
    });
  });

  describe('getEncryptionKey', () => {
    it('should return encryption key successfully', async () => {
      const expectedResult = { key: 'encryption-key', keyId: 'key123' };
      mockUserService.getEncryptionKey.mockResolvedValue(expectedResult);

      const result = await userController.getEncryptionKey();

      expect(result).toEqual(expectedResult);
      expect(mockUserService.getEncryptionKey).toHaveBeenCalled();
    });
  });

  describe('sendLoginCode', () => {
    it('should send login code successfully', async () => {
      const body = { email: 'serve.suitor386@passinbox.com' };
      mockUserService.sendLoginVerificationCode.mockResolvedValue(true);

      const result = await userController.sendLoginCode(body);

      expect(result).toEqual({ message: '验证码已发送到您的邮箱' });
      expect(mockUserService.sendLoginVerificationCode).toHaveBeenCalledWith(
        'serve.suitor386@passinbox.com',
      );
    });
  });

  describe('sendEmailCode', () => {
    it('should send email code successfully', async () => {
      const body = { email: 'serve.suitor386@passinbox.com' };
      mockUserService.sendEmailVerificationCode.mockResolvedValue(true);

      const result = await userController.sendEmailCode(body);

      expect(result).toEqual({ message: '验证码已发送到您的邮箱' });
      expect(mockUserService.sendEmailVerificationCode).toHaveBeenCalledWith(
        'serve.suitor386@passinbox.com',
      );
    });
  });

  describe('assignRole', () => {
    it('should assign role to user successfully', async () => {
      const assignRoleDto: AssignRoleDto = {
        userId: '1',
        roleId: 'role1',
      };

      const expectedResult: any = {
        userId: '1',
        roleId: 'role1',
        id: 'user-role-1',
        createdAt: new Date(),
      };

      mockUserService.assignRole.mockResolvedValue(expectedResult);

      const result = await userController.assignRole(assignRoleDto);

      expect(result).toEqual(expectedResult);
      expect(mockUserService.assignRole).toHaveBeenCalledWith(assignRoleDto.userId, assignRoleDto);
    });
  });

  describe('assignRoles', () => {
    it('should assign multiple roles to user successfully', async () => {
      const assignRolesDto: AssignRolesDto = {
        userId: '1',
        roleIds: ['role1', 'role2'],
      };

      const expectedResult: any[] = [
        { userId: '1', roleId: 'role1', id: 'user-role-1', createdAt: new Date() },
        { userId: '1', roleId: 'role2', id: 'user-role-2', createdAt: new Date() },
      ];

      mockUserService.assignRoles.mockResolvedValue(expectedResult);

      const result = await userController.assignRoles(assignRolesDto);

      expect(result).toEqual(expectedResult);
      expect(mockUserService.assignRoles).toHaveBeenCalledWith(
        assignRolesDto.userId,
        assignRolesDto,
      );
    });
  });

  describe('removeRole', () => {
    it('should remove role from user successfully', async () => {
      const userId = '1';
      const roleId = 'role1';

      mockUserService.removeRole.mockResolvedValue(undefined);

      const result = await userController.removeRole(userId, roleId);

      expect(result).toEqual({ message: '角色移除成功' });
      expect(mockUserService.removeRole).toHaveBeenCalledWith(userId, roleId);
    });
  });

  describe('getUserRoles', () => {
    it('should return user roles successfully', async () => {
      const userId = '1';
      const roles: any[] = [
        {
          id: 'role1',
          name: 'Admin',
          code: 'ROLE_ADMIN',
          description: 'Administrator role',
          isSystem: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockUserService.getUserRoles.mockResolvedValue(roles);

      const result = await userController.getUserRoles(userId);

      expect(result).toEqual(roles);
      expect(mockUserService.getUserRoles).toHaveBeenCalledWith(userId);
    });
  });

  describe('getUserPermissions', () => {
    it('should return user permissions successfully', async () => {
      const userId = '1';
      const permissions = [
        {
          id: 'perm1',
          name: 'Read User',
          action: 'read',
          resource: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockUserService.getUserPermissions.mockResolvedValue(permissions);

      const result = await userController.getUserPermissions(userId);

      expect(result).toEqual(permissions);
      expect(mockUserService.getUserPermissions).toHaveBeenCalledWith(userId);
    });
  });

  describe('checkUserRole', () => {
    it('should check user role successfully', async () => {
      const userId = '1';
      const roleCode = 'ROLE_ADMIN';

      mockUserService.hasRole.mockResolvedValue(true);

      const result = await userController.checkUserRole(userId, roleCode);

      expect(result).toEqual({ hasRole: true });
      expect(mockUserService.hasRole).toHaveBeenCalledWith(userId, roleCode);
    });
  });

  describe('checkUserPermission', () => {
    it('should check user permission successfully', async () => {
      const userId = '1';
      const action = 'read';
      const resource = 'user';

      mockUserService.hasPermission.mockResolvedValue(true);

      const result = await userController.checkUserPermission(userId, action, resource);

      expect(result).toEqual({ hasPermission: true });
      expect(mockUserService.hasPermission).toHaveBeenCalledWith(userId, action, resource);
    });
  });

  describe('getClientIp', () => {
    it('should get client IP from x-forwarded-for header', () => {
      const mockRequest = {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
      };

      const result = (userController as any).getClientIp(mockRequest);

      expect(result).toBe('192.168.1.1');
    });

    it('should get client IP from x-real-ip header', () => {
      const mockRequest = {
        headers: {
          'x-real-ip': '192.168.1.2',
        },
        connection: {},
      };

      const result = (userController as any).getClientIp(mockRequest);

      expect(result).toBe('192.168.1.2');
    });

    it('should get client IP from connection.remoteAddress', () => {
      const mockRequest = {
        headers: {},
        connection: {
          remoteAddress: '192.168.1.3',
        },
      };

      const result = (userController as any).getClientIp(mockRequest);

      expect(result).toBe('192.168.1.3');
    });

    it('should return default IP if no IP found', () => {
      const mockRequest = {
        headers: {},
        connection: {},
      };

      const result = (userController as any).getClientIp(mockRequest);

      expect(result).toBe('127.0.0.1');
    });
  });
});
