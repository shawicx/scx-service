import { SystemException } from '@/common/exceptions';
import { emailVerificationKey, loginVerificationKey } from '@/common/utils/cache-keys.constants';
import { EMAIL_VERIFICATION_TTL_MS, LOGIN_VERIFICATION_TTL_MS } from '@/common/utils/ttl.constants';
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CacheService } from '../cache/cache.service';
import { MailService } from '../mail/mail.service';
import { CreateUserDto } from './dto/create-user.dto';
import { DeleteUsersDto } from './dto/delete-users.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { LoginUserDto, LoginWithPasswordDto } from './dto/login-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { ToggleUserStatusDto } from './dto/toggle-user-status.dto';
import { UserListItemDto, UserListResponseDto } from './dto/user-list-response.dto';
import { UserResponseDto, UserPreferences } from './dto/user-response.dto';
import { AssignRoleDto, AssignRolesDto, UserRoleResponseDto } from './dto/user-role.dto';
import { CryptoUtil } from '@/common/utils/crypto.util';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly mailService: MailService,
    private readonly authService: AuthService,
  ) {}

  /**
   * 用户注册
   */
  async register(registerUserDto: RegisterUserDto, clientIp?: string): Promise<UserResponseDto> {
    const { email, name, password, emailVerificationCode } = registerUserDto;

    // 检查邮箱是否已存在
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw SystemException.emailExists('该邮箱已被注册');
    }

    // 验证邮箱验证码
    const isValidCode = await this.validateEmailCode(email, emailVerificationCode);
    if (!isValidCode) {
      throw SystemException.invalidVerificationCode('邮箱验证码无效或已过期');
    }

    // 加密密码
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 创建默认用户偏好设置
    const defaultPreferences: UserPreferences = {
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
    };

    // 创建用户
    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        emailVerified: true,
        preferences: defaultPreferences as any,
        lastLoginIp: clientIp,
        lastLoginAt: new Date(),
        loginCount: 1,
      },
    });

    // 发送欢迎邮件
    try {
      await this.mailService.sendWelcomeEmail(user.email, user.name);
    } catch {
      // 忽略邮件发送失败
    }

    return new UserResponseDto(user);
  }

  /**
   * 根据ID查找用户
   */
  async findById(id: string): Promise<UserResponseDto | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? new UserResponseDto(user) : null;
  }

  /**
   * 根据邮箱查找用户
   */
  async findByEmail(email: string): Promise<any | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  /**
   * 更新用户登录信息
   */
  async updateLoginInfo(userId: string, clientIp?: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginIp: clientIp,
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
      },
    });
  }

  /**
   * 更新用户偏好设置
   */
  async updatePreferences(userId: string, preferences: Partial<UserPreferences>): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw SystemException.dataNotFound('用户不存在');
    }

    const updatedPreferences = { ...(user.preferences as any), ...preferences };
    await this.prisma.user.update({
      where: { id: userId },
      data: { preferences: updatedPreferences as any },
    });
  }

  /**
   * 发送邮箱验证码
   */
  async sendEmailVerificationCode(email: string): Promise<boolean> {
    // 检查邮箱是否已被注册
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw SystemException.emailExists('该邮箱已被注册');
    }

    // 调用邮件服务内部生成并发送 6 位验证码
    const result = await this.mailService.sendVerificationCode(email);
    if (!result.success || !result.code) {
      throw SystemException.operationFailed('验证码发送失败，请稍后重试');
    }

    // 将验证码存储到 Redis，有效期 10 分钟
    const cacheKey = emailVerificationKey(email);
    await this.cacheService.setWithMilliseconds(cacheKey, result.code, EMAIL_VERIFICATION_TTL_MS);

    return true;
  }

  /**
   * 为用户分配角色
   */
  async assignRole(userId: string, assignRoleDto: AssignRoleDto): Promise<UserRoleResponseDto> {
    // 验证用户是否存在
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw SystemException.dataNotFound('用户不存在');
    }

    // 验证角色是否存在
    const role = await this.prisma.role.findUnique({ where: { id: assignRoleDto.roleId } });
    if (!role) {
      throw SystemException.dataNotFound('角色不存在');
    }

    // 检查用户是否已经拥有该角色
    const existingUserRole = await this.prisma.userRole.findUnique({
      where: {
        uniq_user_role: {
          userId,
          roleId: assignRoleDto.roleId,
        },
      },
    });

    if (existingUserRole) {
      throw SystemException.resourceExists('用户已拥有该角色');
    }

    // 创建用户角色关系
    const userRole = await this.prisma.userRole.create({
      data: {
        userId,
        roleId: assignRoleDto.roleId,
      },
    });

    return new UserRoleResponseDto(userRole);
  }

  /**
   * 为用户分配多个角色
   */
  async assignRoles(
    userId: string,
    assignRolesDto: AssignRolesDto,
  ): Promise<UserRoleResponseDto[]> {
    // 验证用户是否存在
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw SystemException.dataNotFound('用户不存在');
    }

    // 验证所有角色是否存在
    const roles = await this.prisma.role.findMany({
      where: { id: { in: assignRolesDto.roleIds } },
    });

    if (roles.length !== assignRolesDto.roleIds.length) {
      const foundIds = roles.map((r) => r.id);
      const missingIds = assignRolesDto.roleIds.filter((id) => !foundIds.includes(id));
      throw SystemException.dataNotFound(`角色不存在: ${missingIds.join(', ')}`);
    }

    // 检查用户已有的角色
    const existingUserRoles = await this.prisma.userRole.findMany({
      where: {
        userId,
        roleId: { in: assignRolesDto.roleIds },
      },
    });

    const existingRoleIds = existingUserRoles.map((ur) => ur.roleId);
    const newRoleIds = assignRolesDto.roleIds.filter((id) => !existingRoleIds.includes(id));

    if (newRoleIds.length === 0) {
      throw SystemException.resourceExists('用户已拥有所有指定角色');
    }

    // 创建新的用户角色关系
    await this.prisma.userRole.createMany({
      data: newRoleIds.map((roleId) => ({ userId, roleId })),
    });

    const createdUserRoles = await this.prisma.userRole.findMany({
      where: {
        userId,
        roleId: { in: newRoleIds },
      },
    });

    return createdUserRoles.map((userRole) => new UserRoleResponseDto(userRole));
  }

  /**
   * 移除用户角色
   */
  async removeRole(userId: string, roleId: string): Promise<void> {
    const userRole = await this.prisma.userRole.findUnique({
      where: {
        uniq_user_role: {
          userId,
          roleId,
        },
      },
    });

    if (!userRole) {
      throw SystemException.dataNotFound('用户角色关系不存在');
    }

    await this.prisma.userRole.delete({
      where: {
        uniq_user_role: {
          userId,
          roleId,
        },
      },
    });
  }

  /**
   * 获取用户的所有角色
   */
  async getUserRoles(userId: string): Promise<any[]> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw SystemException.dataNotFound('用户不存在');
    }

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });

    return userRoles.map((ur) => ur.role);
  }

  /**
   * 检查用户是否拥有指定角色
   */
  async hasRole(userId: string, roleCode: string): Promise<boolean> {
    const userRole = await this.prisma.userRole.findFirst({
      where: {
        userId,
        role: { code: roleCode },
      },
    });

    return !!userRole;
  }

  /**
   * 获取用户的所有权限
   */
  async getUserPermissions(userId: string): Promise<any[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const uniquePermissions = new Map();
    userRoles.forEach((ur) => {
      ur.role.rolePermissions.forEach((rp) => {
        if (rp.permission) {
          uniquePermissions.set(rp.permission.id, rp.permission);
        }
      });
    });

    return Array.from(uniquePermissions.values());
  }

  /**
   * 检查用户是否拥有指定权限
   */
  async hasPermission(userId: string, action: string, resource: string): Promise<boolean> {
    const userRole = await this.prisma.userRole.findFirst({
      where: {
        userId,
        role: {
          rolePermissions: {
            some: {
              permission: {
                action,
                resource,
              },
            },
          },
        },
      },
    });

    return !!userRole;
  }

  /**
   * 邮箱验证码登录
   */
  async loginWithEmailCode(
    loginUserDto: LoginUserDto,
    clientIp?: string,
  ): Promise<LoginResponseDto> {
    const { email, emailVerificationCode } = loginUserDto;

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw SystemException.invalidCredentials('邮箱不存在');
    }

    if (!user.isActive) {
      throw SystemException.accountDisabled('账户已被禁用，请联系管理员');
    }

    const isValidCode = await this.validateEmailCodeForLogin(email, emailVerificationCode);
    if (!isValidCode) {
      throw SystemException.invalidVerificationCode('邮箱验证码无效或已过期');
    }

    await this.updateLoginInfo(user.id, clientIp);

    const accessToken = await this.authService.generateAccessToken(user.id, user.email);
    const refreshToken = await this.authService.generateRefreshToken(user.id, user.email);

    const updatedUser = await this.prisma.user.findUnique({ where: { id: user.id } });

    return new LoginResponseDto(updatedUser!, accessToken, refreshToken);
  }

  /**
   * 密码登录
   */
  async loginWithPassword(
    loginWithPasswordDto: LoginWithPasswordDto,
    keyId: string,
    clientIp?: string,
  ): Promise<LoginResponseDto> {
    const { email, password } = loginWithPasswordDto;

    if (!keyId) {
      throw SystemException.invalidParameter('密码必须加密传输，请先获取加密密钥');
    }

    const encryptionKey = await this.authService.getEncryptionKey(keyId);
    if (!encryptionKey) {
      throw SystemException.keyExpired('加密密钥已过期，请重新获取');
    }

    let decryptedPassword: string;
    try {
      decryptedPassword = CryptoUtil.decrypt(password, encryptionKey);
    } catch {
      throw SystemException.decryptionFailed('密码解密失败');
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw SystemException.invalidCredentials('邮箱或密码错误');
    }

    if (!user.isActive) {
      throw SystemException.accountDisabled('账户已被禁用，请联系管理员');
    }

    const isPasswordValid = await bcrypt.compare(decryptedPassword, user.password);
    if (!isPasswordValid) {
      throw SystemException.invalidCredentials('邮箱或密码错误');
    }

    await this.updateLoginInfo(user.id, clientIp);

    const accessToken = await this.authService.generateAccessToken(user.id, user.email);
    const refreshToken = await this.authService.generateRefreshToken(user.id, user.email);

    const updatedUser = await this.prisma.user.findUnique({ where: { id: user.id } });

    return new LoginResponseDto(updatedUser!, accessToken, refreshToken);
  }

  /**
   * 登出
   */
  async logout(userId: string): Promise<void> {
    await this.authService.logout(userId);
  }

  /**
   * 刷新token
   */
  async refreshTokens(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string } | null> {
    return await this.authService.refreshTokens(refreshToken);
  }

  /**
   * 获取加密密钥（用于前端密码加密）
   */
  async getEncryptionKey(): Promise<{ key: string; keyId: string }> {
    return await this.authService.generateEncryptionKey();
  }

  /**
   * 发送登录验证码
   */
  async sendLoginVerificationCode(email: string): Promise<boolean> {
    // 检查用户是否存在
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw SystemException.dataNotFound('用户不存在');
    }

    // 调用邮件服务发送验证码
    const result = await this.mailService.sendVerificationCode(email);
    if (!result.success || !result.code) {
      throw SystemException.operationFailed('验证码发送失败，请稍后重试');
    }

    // 将验证码存储到 Redis，有效期 10 分钟
    const cacheKey = loginVerificationKey(email);
    await this.cacheService.setWithMilliseconds(cacheKey, result.code, LOGIN_VERIFICATION_TTL_MS);

    return true;
  }

  /**
   * 查询用户列表
   */
  async queryUsers(queryUsersDto: QueryUsersDto): Promise<UserListResponseDto> {
    const {
      page = 1,
      limit = 10,
      search,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = queryUsersDto;

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder.toLowerCase() as 'asc' | 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return new UserListResponseDto({
      list: users.map((user) => new UserListItemDto(user)),
      total,
      page,
      limit,
    });
  }

  /**
   * 管理员创建用户
   */
  async createUser(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const { email, name, password, isActive = true, roleIds } = createUserDto;

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw SystemException.emailExists('该邮箱已被注册');
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const defaultPreferences: UserPreferences = {
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
    };

    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        emailVerified: true,
        preferences: defaultPreferences as any,
        isActive,
        loginCount: 0,
        ...(roleIds && roleIds.length > 0
          ? {
              userRoles: {
                create: roleIds.map((roleId) => ({ roleId })),
              },
            }
          : {}),
      },
    });

    return new UserResponseDto(user);
  }

  /**
   * 检查用户是否为超级管理员
   */
  async isSuperAdmin(userId: string): Promise<boolean> {
    return await this.hasRole(userId, 'SUPER_ADMIN');
  }

  /**
   * 检查用户是否为管理员
   */
  async isAdmin(userId: string): Promise<boolean> {
    const superAdmin = await this.isSuperAdmin(userId);
    if (superAdmin) {
      return true;
    }

    const userRole = await this.prisma.userRole.findFirst({
      where: {
        userId,
        role: {
          code: { startsWith: 'ADMIN' },
        },
      },
    });

    return !!userRole;
  }

  /**
   * 删除用户（支持批量）
   */
  async deleteUsers(currentUserId: string, deleteUsersDto: DeleteUsersDto): Promise<number> {
    const { userIds } = deleteUsersDto;

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
    });

    if (users.length !== userIds.length) {
      const foundIds = users.map((u) => u.id);
      const missingIds = userIds.filter((id) => !foundIds.includes(id));
      throw SystemException.dataNotFound(`用户不存在: ${missingIds.join(', ')}`);
    }

    if (userIds.includes(currentUserId)) {
      throw SystemException.operationFailed('不能删除自己');
    }

    const currentIsSuperAdmin = await this.isSuperAdmin(currentUserId);

    for (const user of users) {
      const userIsAdmin = await this.isAdmin(user.id);

      if (userIsAdmin && !currentIsSuperAdmin) {
        throw SystemException.operationFailed('只有超级管理员可以删除其他管理员用户');
      }
    }

    // 软删除
    await this.prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { deletedAt: new Date() },
    });

    // 删除关联的角色
    await this.prisma.userRole.deleteMany({
      where: { userId: { in: userIds } },
    });

    return userIds.length;
  }

  /**
   * 切换用户状态（支持批量）
   */
  async toggleUserStatus(
    currentUserId: string,
    toggleUserStatusDto: ToggleUserStatusDto,
  ): Promise<number> {
    const { userIds, isActive } = toggleUserStatusDto;

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
    });

    if (users.length !== userIds.length) {
      const foundIds = users.map((u) => u.id);
      const missingIds = userIds.filter((id) => !foundIds.includes(id));
      throw SystemException.dataNotFound(`用户不存在: ${missingIds.join(', ')}`);
    }

    if (userIds.includes(currentUserId) && !isActive) {
      throw SystemException.operationFailed('不能禁用自己');
    }

    await this.prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { isActive },
    });

    return userIds.length;
  }

  /**
   * 验证邮箱验证码（注册用）
   */
  private async validateEmailCode(email: string, code: string): Promise<boolean> {
    const cacheKey = emailVerificationKey(email);
    const cachedCode = await this.cacheService.get<string>(cacheKey);

    if (!cachedCode) {
      return false;
    }

    const codeStr = String(code).trim();
    const cachedCodeStr = String(cachedCode).trim();

    if (cachedCodeStr !== codeStr) {
      return false;
    }

    await this.cacheService.del(cacheKey);
    return true;
  }

  /**
   * 验证邮箱验证码（登录用）
   */
  private async validateEmailCodeForLogin(email: string, code: string): Promise<boolean> {
    const cacheKey = loginVerificationKey(email);
    const cachedCode = await this.cacheService.get<string>(cacheKey);

    if (!cachedCode) {
      return false;
    }

    if (cachedCode !== code) {
      return false;
    }

    await this.cacheService.del(cacheKey);
    return true;
  }
}
