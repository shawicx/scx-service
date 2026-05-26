import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/common/prisma/prisma.service';

interface UserPreferences {
  theme?: string;
  language?: string;
  timezone?: string;
  notifications?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
  };
  privacy?: {
    profileVisible?: boolean;
    showEmail?: boolean;
    showLastSeen?: boolean;
  };
}

const SUPER_ADMIN_ROLE_CODE = 'SUPER_ADMIN';
const SUPER_ADMIN_USER_NAME = 'scx-super-admin';
const SUPER_ADMIN_USER_EMAIL = 'scx-super-admin@system.internal';

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

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      await this.seed();
    } catch (error) {
      this.logger.error('数据初始化失败', error);
    }
  }

  private async seed() {
    // 1. 创建 SUPER_ADMIN 角色
    let superAdminRole = await this.prisma.role.findUnique({
      where: { code: SUPER_ADMIN_ROLE_CODE },
    });

    if (!superAdminRole) {
      superAdminRole = await this.prisma.role.create({
        data: {
          name: '超级管理员',
          code: SUPER_ADMIN_ROLE_CODE,
          description: '系统内置超级管理员角色，拥有所有权限',
          isSystem: true,
        },
      });
      this.logger.log('已创建 SUPER_ADMIN 角色');
    }

    // 2. 创建默认超级管理员用户
    let adminUser = await this.prisma.user.findUnique({
      where: { email: SUPER_ADMIN_USER_EMAIL },
    });

    if (!adminUser) {
      const initialPassword =
        this.configService.get<string>('ADMIN_INITIAL_PASSWORD') || 'changeme123';

      const hashedPassword = await bcrypt.hash(initialPassword, 12);

      adminUser = await this.prisma.user.create({
        data: {
          email: SUPER_ADMIN_USER_EMAIL,
          name: SUPER_ADMIN_USER_NAME,
          password: hashedPassword,
          emailVerified: true,
          isActive: true,
          loginCount: 0,
          preferences: defaultPreferences as any,
        },
      });
      this.logger.log(`已创建默认超级管理员用户: ${SUPER_ADMIN_USER_EMAIL}`);
    }

    // 3. 关联用户与角色
    const existingRelation = await this.prisma.userRole.findUnique({
      where: {
        uniq_user_role: {
          userId: adminUser.id,
          roleId: superAdminRole.id,
        },
      },
    });

    if (!existingRelation) {
      await this.prisma.userRole.create({
        data: {
          userId: adminUser.id,
          roleId: superAdminRole.id,
        },
      });
      this.logger.log('已关联超级管理员用户与角色');
    }
  }
}
