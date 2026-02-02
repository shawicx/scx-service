import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { SystemExceptionFilter } from '@/common/filters/system-exception.filter';
import { AuthGuard } from '@/common/guards/auth.guard';
import { databaseConfig } from '@/config/database.config';
import { appConfig, swaggerConfig } from '@/config/env.config';
import mailConfig from '@/config/mail.config';
import redisConfig from '@/config/redis.config';
import { aiConfig } from '@/config/ai.config';
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

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true, // 全局可用
      cache: true, // 缓存配置
      expandVariables: true, // 支持环境变量展开
      load: [appConfig, swaggerConfig, databaseConfig, redisConfig, mailConfig, aiConfig], // 加载配置
    }),

    // 缓存模块
    CacheConfigModule,

    // AI 模块
    AiModule,

    // 数据库模块
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => configService.get('database'),
    }),

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

    // 日志模块
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get<boolean>('app.isProduction', false);

        const transports: winston.transport[] = [
          // 控制台输出
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.timestamp(),
              nestWinstonModuleUtilities.format.nestLike('SCX-Service', {
                colors: true,
                prettyPrint: true,
              }),
            ),
          }),
        ];

        // 生产环境添加文件日志
        if (isProduction) {
          // 错误日志
          transports.push(
            new winston.transports.File({
              filename: 'logs/error.log',
              level: 'error',
              format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
            }),
          );

          // 所有日志
          transports.push(
            new winston.transports.File({
              filename: 'logs/combined.log',
              format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
            }),
          );
        }

        return {
          level: isProduction ? 'info' : 'debug',
          transports,
        };
      },
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: ResponseInterceptor,
    // },
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
