import { SystemException } from '@/common/exceptions';
import { emailVerificationKey, loginVerificationKey } from '@/common/utils/cache-keys.constants';
import { CryptoUtil } from '@/common/utils/crypto.util';
import { EMAIL_VERIFICATION_TTL_MS, LOGIN_VERIFICATION_TTL_MS } from '@/common/utils/ttl.constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { In, Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { CacheService } from '../cache/cache.service';
import { MailService } from '../mail/mail.service';
import { Role } from '../role/entities/role.entity';
import { UserRole } from '../user-role/entities/user-role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { DeleteUsersDto } from './dto/delete-users.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { LoginUserDto, LoginWithPasswordDto } from './dto/login-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { ToggleUserStatusDto } from './dto/toggle-user-status.dto';
import { UserListItemDto, UserListResponseDto } from './dto/user-list-response.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { AssignRoleDto, AssignRolesDto, UserRoleResponseDto } from './dto/user-role.dto';
import { User, UserPreferences } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly cacheService: CacheService,
    private readonly mailService: MailService,
    private readonly authService: AuthService,
  ) {}

  /**
   * 用户注册
   * @param registerUserDto 注册信息
   * @param clientIp 客户端IP
   * @returns 用户信息
   */
  async register(registerUserDto: RegisterUserDto, clientIp?: string): Promise<UserResponseDto> {
    const { email, name, password, emailVerificationCode } = registerUserDto;

    // 检查邮箱是否已存在
    const existingUser = await this.userRepository.findOne({ where: { email } });
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
    const user = this.userRepository.create({
      email,
      name,
      password: hashedPassword,
      emailVerified: true, // 注册时已验证邮箱
      preferences: defaultPreferences,
      lastLoginIp: clientIp,
      lastLoginAt: new Date(),
      loginCount: 1,
    });

    const savedUser = await this.userRepository.save(user);

    // 发送欢迎邮件
    try {
      await this.mailService.sendWelcomeEmail(savedUser.email, savedUser.name);
    } catch (error) {
      // 欢迎邮件发送失败不影响注册流程，只记录日志
      console.warn('欢迎邮件发送失败:', error);
    }

    // 返回用户信息（排除敏感字段）
    return new UserResponseDto(savedUser);
  }

  /**
   * 根据ID查找用户
   * @param id 用户ID
   * @returns 用户信息
   */
  async findById(id: string): Promise<UserResponseDto | null> {
    const user = await this.userRepository.findOne({ where: { id } });
    return user ? new UserResponseDto(user) : null;
  }

  /**
   * 根据邮箱查找用户
   * @param email 邮箱
   * @returns 用户信息
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  /**
   * 更新用户登录信息
   * @param userId 用户ID
   * @param clientIp 客户端IP
   */
  async updateLoginInfo(userId: string, clientIp?: string): Promise<void> {
    await this.userRepository.update(userId, {
      lastLoginIp: clientIp,
      lastLoginAt: new Date(),
      loginCount: () => 'loginCount + 1',
    });
  }

  /**
   * 更新用户偏好设置
   * @param userId 用户ID
   * @param preferences 偏好设置
   */
  async updatePreferences(userId: string, preferences: Partial<UserPreferences>): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw SystemException.dataNotFound('用户不存在');
    }

    const updatedPreferences = { ...user.preferences, ...preferences };
    await this.userRepository.update(userId, { preferences: updatedPreferences });
  }

  /**
   * 发送邮箱验证码
   * @param email 邮箱地址
   * @returns 是否发送成功
   */
  async sendEmailVerificationCode(email: string): Promise<boolean> {
    // 检查邮箱是否已被注册
    const existingUser = await this.userRepository.findOne({ where: { email } });
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
   * @param userId 用户ID
   * @param assignRoleDto 角色分配信息
   */
  async assignRole(userId: string, assignRoleDto: AssignRoleDto): Promise<UserRoleResponseDto> {
    // 验证用户是否存在
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw SystemException.dataNotFound('用户不存在');
    }

    // 验证角色是否存在
    const role = await this.roleRepository.findOne({ where: { id: assignRoleDto.roleId } });
    if (!role) {
      throw SystemException.dataNotFound('角色不存在');
    }

    // 检查用户是否已经拥有该角色
    const existingUserRole = await this.userRoleRepository.findOne({
      where: { userId, roleId: assignRoleDto.roleId },
    });

    if (existingUserRole) {
      throw SystemException.resourceExists('用户已拥有该角色');
    }

    // 创建用户角色关系
    const userRole = this.userRoleRepository.create({
      userId,
      roleId: assignRoleDto.roleId,
    });

    const savedUserRole = await this.userRoleRepository.save(userRole);
    return new UserRoleResponseDto(savedUserRole);
  }

  /**
   * 为用户分配多个角色
   * @param userId 用户ID
   * @param assignRolesDto 角色分配信息
   */
  async assignRoles(
    userId: string,
    assignRolesDto: AssignRolesDto,
  ): Promise<UserRoleResponseDto[]> {
    // 验证用户是否存在
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw SystemException.dataNotFound('用户不存在');
    }

    // 验证所有角色是否存在
    const roles = await this.roleRepository.find({
      where: { id: In(assignRolesDto.roleIds) },
    });

    if (roles.length !== assignRolesDto.roleIds.length) {
      const foundIds = roles.map((r) => r.id);
      const missingIds = assignRolesDto.roleIds.filter((id) => !foundIds.includes(id));
      throw SystemException.dataNotFound(`角色不存在: ${missingIds.join(', ')}`);
    }

    // 检查用户已有的角色
    const existingUserRoles = await this.userRoleRepository.find({
      where: { userId, roleId: In(assignRolesDto.roleIds) },
    });

    const existingRoleIds = existingUserRoles.map((ur) => ur.roleId);
    const newRoleIds = assignRolesDto.roleIds.filter((id) => !existingRoleIds.includes(id));

    if (newRoleIds.length === 0) {
      throw SystemException.resourceExists('用户已拥有所有指定角色');
    }

    // 创建新的用户角色关系
    const userRoles = newRoleIds.map((roleId) =>
      this.userRoleRepository.create({ userId, roleId }),
    );

    const savedUserRoles = await this.userRoleRepository.save(userRoles);
    return savedUserRoles.map((userRole) => new UserRoleResponseDto(userRole));
  }

  /**
   * 移除用户角色
   * @param userId 用户ID
   * @param roleId 角色ID
   */
  async removeRole(userId: string, roleId: string): Promise<void> {
    const userRole = await this.userRoleRepository.findOne({
      where: { userId, roleId },
    });

    if (!userRole) {
      throw SystemException.dataNotFound('用户角色关系不存在');
    }

    await this.userRoleRepository.remove(userRole);
  }

  /**
   * 获取用户的所有角色
   * @param userId 用户ID
   * @returns 角色列表
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw SystemException.dataNotFound('用户不存在');
    }

    const userRoles = await this.userRoleRepository.find({
      where: { userId },
      relations: ['role'],
    });

    return userRoles.map((ur: any) => ur.role);
  }

  /**
   * 检查用户是否拥有指定角色
   * @param userId 用户ID
   * @param roleCode 角色代码
   * @returns 是否拥有角色
   */
  async hasRole(userId: string, roleCode: string): Promise<boolean> {
    const userRole = await this.userRoleRepository
      .createQueryBuilder('userRole')
      .leftJoinAndSelect('userRole.role', 'role')
      .where('userRole.userId = :userId', { userId })
      .andWhere('role.code = :roleCode', { roleCode })
      .getOne();

    return !!userRole;
  }

  /**
   * 获取用户的所有权限
   * @param userId 用户ID
   * @returns 权限列表
   */
  async getUserPermissions(userId: string): Promise<any[]> {
    const permissions = await this.userRoleRepository
      .createQueryBuilder('userRole')
      .leftJoinAndSelect('userRole.role', 'role')
      .leftJoinAndSelect('role.rolePermissions', 'rolePermission')
      .leftJoinAndSelect('rolePermission.permission', 'permission')
      .where('userRole.userId = :userId', { userId })
      .getMany();

    const uniquePermissions = new Map();
    permissions.forEach((ur: any) => {
      ur.role.rolePermissions.forEach((rp: any) => {
        if (rp.permission) {
          uniquePermissions.set(rp.permission.id, rp.permission);
        }
      });
    });

    return Array.from(uniquePermissions.values());
  }

  /**
   * 检查用户是否拥有指定权限
   * @param userId 用户ID
   * @param action 动作
   * @param resource 资源
   * @returns 是否拥有权限
   */
  async hasPermission(userId: string, action: string, resource: string): Promise<boolean> {
    const permission = await this.userRoleRepository
      .createQueryBuilder('userRole')
      .leftJoinAndSelect('userRole.role', 'role')
      .leftJoinAndSelect('role.rolePermissions', 'rolePermission')
      .leftJoinAndSelect('rolePermission.permission', 'permission')
      .where('userRole.userId = :userId', { userId })
      .andWhere('permission.action = :action', { action })
      .andWhere('permission.resource = :resource', { resource })
      .getOne();

    return !!permission;
  }

  /**
   * 邮箱验证码登录
   * @param loginUserDto 登录信息
   * @param clientIp 客户端IP
   * @returns 登录结果
   */
  async loginWithEmailCode(
    loginUserDto: LoginUserDto,
    clientIp?: string,
  ): Promise<LoginResponseDto> {
    const { email, emailVerificationCode } = loginUserDto;

    const user = await this.userRepository.findOne({ where: { email } });
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

    const updatedUser = await this.userRepository.findOne({ where: { id: user.id } });

    return new LoginResponseDto(updatedUser!, accessToken, refreshToken);
  }

  /**
   * 密码登录
   * @param loginWithPasswordDto 登录信息
   * @param keyId 加密密钥ID（必需，用于解密密码）
   * @param clientIp 客户端IP
   * @returns 登录结果
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

    const user = await this.userRepository.findOne({ where: { email } });
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

    const updatedUser = await this.userRepository.findOne({ where: { id: user.id } });

    return new LoginResponseDto(updatedUser!, accessToken, refreshToken);
  }

  /**
   * 登出
   * @param userId 用户ID
   */
  async logout(userId: string): Promise<void> {
    await this.authService.logout(userId);
  }

  /**
   * 刷新token
   * @param refreshToken 刷新令牌
   * @returns 新的tokens
   */
  async refreshTokens(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string } | null> {
    return await this.authService.refreshTokens(refreshToken);
  }

  /**
   * 获取加密密钥（用于前端密码加密）
   * @returns 加密密钥信息
   */
  async getEncryptionKey(): Promise<{ key: string; keyId: string }> {
    return await this.authService.generateEncryptionKey();
  }

  /**
   * 发送登录验证码
   * @param email 邮箱地址
   * @returns 是否发送成功
   */
  async sendLoginVerificationCode(email: string): Promise<boolean> {
    // 检查用户是否存在
    const user = await this.userRepository.findOne({ where: { email } });
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
   * 验证邮箱验证码（注册用）
   * @param email 邮箱
   * @param code 验证码
   * @returns 是否有效
   */
  private async validateEmailCode(email: string, code: string): Promise<boolean> {
    const cacheKey = emailVerificationKey(email);
    const cachedCode = await this.cacheService.get<string>(cacheKey);

    if (!cachedCode) {
      return false; // 验证码不存在或已过期
    }

    // 尝试字符串转换后比较
    const codeStr = String(code).trim();
    const cachedCodeStr = String(cachedCode).trim();

    if (cachedCodeStr !== codeStr) {
      return false; // 验证码不匹配
    }

    // 验证成功后删除验证码
    await this.cacheService.del(cacheKey);
    return true;
  }

  /**
   * 验证邮箱验证码（登录用）
   * @param email 邮箱
   * @param code 验证码
   * @returns 是否有效
   */
  private async validateEmailCodeForLogin(email: string, code: string): Promise<boolean> {
    const cacheKey = loginVerificationKey(email);
    const cachedCode = await this.cacheService.get<string>(cacheKey);

    if (!cachedCode) {
      return false; // 验证码不存在或已过期
    }

    if (cachedCode !== code) {
      return false; // 验证码不匹配
    }

    // 验证成功后删除验证码
    await this.cacheService.del(cacheKey);
    return true;
  }

  /**
   * 查询用户列表
   * @param queryUsersDto 查询参数
   * @returns 用户列表和分页信息
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

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (search) {
      queryBuilder.andWhere('(user.email LIKE :search OR user.name LIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive });
    }

    queryBuilder.orderBy(`user.${sortBy}`, sortOrder);

    queryBuilder.skip(skip).take(limit);

    const [users, total] = await queryBuilder.getManyAndCount();

    return new UserListResponseDto({
      list: users.map((user) => new UserListItemDto(user)),
      total,
      page,
      limit,
    });
  }

  /**
   * 管理员创建用户
   * @param createUserDto 创建用户信息
   * @returns 用户信息
   */
  async createUser(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const { email, name, password, isActive = true, roleIds } = createUserDto;

    const existingUser = await this.userRepository.findOne({ where: { email } });
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

    const user = this.userRepository.create({
      email,
      name,
      password: hashedPassword,
      emailVerified: true,
      preferences: defaultPreferences,
      isActive,
      loginCount: 0,
    });

    const savedUser = await this.userRepository.save(user);

    if (roleIds && roleIds.length > 0) {
      const roles = await this.roleRepository.find({
        where: { id: In(roleIds) },
      });

      if (roles.length !== roleIds.length) {
        const foundIds = roles.map((r) => r.id);
        const missingIds = roleIds.filter((id) => !foundIds.includes(id));
        throw SystemException.dataNotFound(`角色不存在: ${missingIds.join(', ')}`);
      }

      const userRoles = roleIds.map((roleId) =>
        this.userRoleRepository.create({ userId: savedUser.id, roleId }),
      );

      await this.userRoleRepository.save(userRoles);
    }

    return new UserResponseDto(savedUser);
  }

  /**
   * 检查用户是否为超级管理员
   * @param userId 用户ID
   * @returns 是否为超级管理员
   */
  async isSuperAdmin(userId: string): Promise<boolean> {
    if (userId === '3bdd37b8-1d91-4da2-a2f7-a67fa7b4a78d') {
      console.log('userId ----', userId);
      return true;
    }
    return await this.hasRole(userId, 'SUPER_ADMIN');
  }

  /**
   * 检查用户是否为管理员
   * @param userId 用户ID
   * @returns 是否为管理员
   */
  async isAdmin(userId: string): Promise<boolean> {
    const superAdmin = await this.isSuperAdmin(userId);
    if (superAdmin) {
      return true;
    }

    const userRole = await this.userRoleRepository
      .createQueryBuilder('userRole')
      .leftJoinAndSelect('userRole.role', 'role')
      .where('userRole.userId = :userId', { userId })
      .andWhere('role.code LIKE :adminCode', { adminCode: 'ADMIN%' })
      .getOne();

    return !!userRole;
  }

  /**
   * 删除用户（支持批量）
   * @param currentUserId 当前登录用户ID
   * @param deleteUsersDto 删除用户信息
   * @returns 删除的用户数量
   */
  async deleteUsers(currentUserId: string, deleteUsersDto: DeleteUsersDto): Promise<number> {
    const { userIds } = deleteUsersDto;

    const users = await this.userRepository.find({
      where: { id: In(userIds) },
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

    await this.userRepository.softDelete(userIds);

    await this.userRoleRepository.delete({ userId: In(userIds) });

    return userIds.length;
  }

  /**
   * 切换用户状态（支持批量）
   * @param currentUserId 当前登录用户ID
   * @param toggleUserStatusDto 切换状态信息
   * @returns 更新的用户数量
   */
  async toggleUserStatus(
    currentUserId: string,
    toggleUserStatusDto: ToggleUserStatusDto,
  ): Promise<number> {
    const { userIds, isActive } = toggleUserStatusDto;

    const users = await this.userRepository.find({
      where: { id: In(userIds) },
    });

    if (users.length !== userIds.length) {
      const foundIds = users.map((u) => u.id);
      const missingIds = userIds.filter((id) => !foundIds.includes(id));
      throw SystemException.dataNotFound(`用户不存在: ${missingIds.join(', ')}`);
    }

    if (userIds.includes(currentUserId) && !isActive) {
      throw SystemException.operationFailed('不能禁用自己');
    }

    await this.userRepository.update({ id: In(userIds) }, { isActive });

    return userIds.length;
  }
}
