import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { appConfig, swaggerConfig } from '../config/env.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true, // 全局可用
      cache: true, // 缓存配置
      expandVariables: true, // 支持环境变量展开
      load: [appConfig, swaggerConfig], // 加载配置
    }),

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
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
