import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { SystemExceptionFilter } from '@/common/filters/system-exception.filter';
import { AuthGuard } from '@/common/guards/auth.guard';
import { LoggingInterceptor } from '@/common/interceptors/logging.interceptor';
import { TransformInterceptor } from '@/common/interceptors/transform.interceptor';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { appConfig, swaggerConfig } from '@/config/env.config';
import { aiConfig } from '@/config/ai.config';
import { loggerConfig, createWinstonOptions } from '@/config/logger.config';
import mailConfig from '@/config/mail.config';
import redisConfig from '@/config/redis.config';
import { AuthModule } from '@/modules/auth/auth.module';
import { CacheConfigModule } from '@/modules/cache/cache.module';
import { MailModule } from '@/modules/mail/mail.module';
import { PermissionModule } from '@/modules/permission/permission.module';
import { RolePermissionModule } from '@/modules/role-permission/role-permission.module';
import { RoleModule } from '@/modules/role/role.module';
import { UserRoleModule } from '@/modules/user-role/user-role.module';
import { UserModule } from '@/modules/user/user.module';
import { AiModule } from '@/modules/ai/ai.module';
import { HealthModule } from '@/modules/health/health.module';
import { SeedModule } from '@/modules/seed/seed.module';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true, // 全局可用
      cache: true, // 缓存配置
      expandVariables: true, // 支持环境变量展开
      load: [appConfig, swaggerConfig, redisConfig, mailConfig, aiConfig, loggerConfig], // 加载配置
    }),

    // Prisma 模块
    PrismaModule,

    // 缓存模块
    CacheConfigModule,

    // AI 模块
    AiModule,

    // 认证模块
    AuthModule,

    // 业务模块
    UserModule,
    MailModule,

    // RBAC 模块
    RoleModule,
    PermissionModule,
    UserRoleModule,
    RolePermissionModule,

    // 健康检查模块
    HealthModule,

    // 数据初始化
    SeedModule,

    // 日志模块
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => createWinstonOptions(configService),
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: SystemExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
