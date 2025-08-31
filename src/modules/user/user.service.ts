import { emailVerificationKey, loginVerificationKey } from '@/common/utils/cache-keys.constants';
import { CryptoUtil } from '@/common/utils/crypto.util';
import { EMAIL_VERIFICATION_TTL_MS, LOGIN_VERIFICATION_TTL_MS } from '@/common/utils/ttl.constants';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { In, Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { CacheService } from '../cache/cache.service';
import { MailService } from '../mail/mail.service';
import { Role } from '../role/entities/role.entity';
import { UserRole } from '../user-role/entities/user-role.entity';
import { LoginResponseDto } from './dto/login-response.dto';
import { LoginUserDto, LoginWithPasswordDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
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
      throw new ConflictException('该邮箱已被注册');
    }

    // 验证邮箱验证码
    const isValidCode = await this.validateEmailCode(email, emailVerificationCode);
    if (!isValidCode) {
      throw new BadRequestException('邮箱验证码无效或已过期');
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
      throw new BadRequestException('用户不存在');
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
      throw new ConflictException('该邮箱已被注册');
    }

    // 调用邮件服务内部生成并发送 6 位验证码
    const result = await this.mailService.sendVerificationCode(email);
    if (!result.success || !result.code) {
      throw new BadRequestException('验证码发送失败，请稍后重试');
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
      throw new NotFoundException('用户不存在');
    }

    // 验证角色是否存在
    const role = await this.roleRepository.findOne({ where: { id: assignRoleDto.roleId } });
    if (!role) {
      throw new NotFoundException('角色不存在');
    }

    // 检查用户是否已经拥有该角色
    const existingUserRole = await this.userRoleRepository.findOne({
      where: { userId, roleId: assignRoleDto.roleId },
    });

    if (existingUserRole) {
      throw new ConflictException('用户已拥有该角色');
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
      throw new NotFoundException('用户不存在');
    }

    // 验证所有角色是否存在
    const roles = await this.roleRepository.find({
      where: { id: In(assignRolesDto.roleIds) },
    });

    if (roles.length !== assignRolesDto.roleIds.length) {
      const foundIds = roles.map((r) => r.id);
      const missingIds = assignRolesDto.roleIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(`角色不存在: ${missingIds.join(', ')}`);
    }

    // 检查用户已有的角色
    const existingUserRoles = await this.userRoleRepository.find({
      where: { userId, roleId: In(assignRolesDto.roleIds) },
    });

    const existingRoleIds = existingUserRoles.map((ur) => ur.roleId);
    const newRoleIds = assignRolesDto.roleIds.filter((id) => !existingRoleIds.includes(id));

    if (newRoleIds.length === 0) {
      throw new ConflictException('用户已拥有所有指定角色');
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
      throw new NotFoundException('用户角色关系不存在');
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
      throw new NotFoundException('用户不存在');
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

    // 查找用户
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('邮箱不存在');
    }

    // 验证邮箱验证码
    const isValidCode = await this.validateEmailCodeForLogin(email, emailVerificationCode);
    if (!isValidCode) {
      throw new UnauthorizedException('邮箱验证码无效或已过期');
    }

    // 更新登录信息
    await this.updateLoginInfo(user.id, clientIp);

    // 生成tokens
    const accessToken = await this.authService.generateAccessToken(user.id, user.email);
    const refreshToken = await this.authService.generateRefreshToken(user.id, user.email);

    // 重新获取更新后的用户信息
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

    // 强制要求提供 keyId
    if (!keyId) {
      throw new BadRequestException('密码必须加密传输，请先获取加密密钥');
    }

    // 获取加密密钥并解密密码
    const encryptionKey = await this.authService.getEncryptionKey(keyId);
    if (!encryptionKey) {
      throw new BadRequestException('加密密钥已过期，请重新获取');
    }

    let decryptedPassword: string;
    try {
      decryptedPassword = CryptoUtil.decrypt(password, encryptionKey);
    } catch {
      throw new BadRequestException('密码解密失败');
    }

    // 查找用户
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(decryptedPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 更新登录信息
    await this.updateLoginInfo(user.id, clientIp);

    // 生成tokens
    const accessToken = await this.authService.generateAccessToken(user.id, user.email);
    const refreshToken = await this.authService.generateRefreshToken(user.id, user.email);

    // 重新获取更新后的用户信息
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
      throw new NotFoundException('用户不存在');
    }

    // 调用邮件服务发送验证码
    const result = await this.mailService.sendVerificationCode(email);
    if (!result.success || !result.code) {
      throw new BadRequestException('验证码发送失败，请稍后重试');
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

    if (cachedCode !== code) {
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
}
