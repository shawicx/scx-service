import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { User, UserPreferences } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly mailService: MailService,
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
    const cacheKey = `email_verification:${email}`;
    await this.cacheManager.set(cacheKey, result.code, 600000); // 10分钟 = 600000毫秒

    return true;
  }

  /**
   * 验证邮箱验证码
   * @param email 邮箱
   * @param code 验证码
   * @returns 是否有效
   */
  private async validateEmailCode(email: string, code: string): Promise<boolean> {
    const cacheKey = `email_verification:${email}`;
    const cachedCode = await this.cacheManager.get<string>(cacheKey);

    if (!cachedCode) {
      return false; // 验证码不存在或已过期
    }

    if (cachedCode !== code) {
      return false; // 验证码不匹配
    }

    // 验证成功后删除验证码
    await this.cacheManager.del(cacheKey);
    return true;
  }
}
