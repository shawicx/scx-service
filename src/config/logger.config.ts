import { registerAs } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { utilities as nestWinstonModuleUtilities, WinstonModuleOptions } from 'nest-winston';
import * as path from 'path';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { accessLogFilter, excludeAccessFilter } from '@/common/loggers/access-log.transport';
import { createModuleTransport } from '@/common/loggers/module-log.transport';

/**
 * 日志配置注册（与环境变量绑定）
 */
export const loggerConfig = registerAs('logger', () => ({
  dir: process.env.LOG_DIR || 'logs',
  maxSize: process.env.LOG_MAX_SIZE || '20m',
  maxFiles: process.env.LOG_MAX_FILES || '14d',
  datePattern: process.env.LOG_DATE_PATTERN || 'YYYY-MM-DD',
  console: {
    enabled: process.env.LOG_CONSOLE_ENABLED !== 'false',
    colors: process.env.LOG_CONSOLE_COLORS !== 'false',
  },
}));

/**
 * @description 需要独立日志文件的模块列表
 */
const LOG_MODULES = [
  'AiService',
  'MailService',
  // 'UserService',
  // 'AuthService',
];

/**
 * @description 创建 Winston 日志配置
 * @param configService 配置服务
 * @returns WinstonModuleOptions
 */
export function createWinstonOptions(configService: ConfigService): WinstonModuleOptions {
  const isProduction = configService.get<boolean>('app.isProduction', false);
  const logDir = configService.get<string>('logger.dir', 'logs');
  const maxSize = configService.get<string>('logger.maxSize', '20m');
  const maxFiles = configService.get<string>('logger.maxFiles', '14d');
  const datePattern = configService.get<string>('logger.datePattern', 'YYYY-MM-DD');
  const consoleEnabled = configService.get<boolean>('logger.console.enabled', true);
  const consoleColors = configService.get<boolean>('logger.console.colors', true);

  const transports: winston.transport[] = [];

  // 1. 控制台输出
  if (consoleEnabled) {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          nestWinstonModuleUtilities.format.nestLike('SCX-Service', {
            colors: consoleColors,
            prettyPrint: !isProduction,
          }),
        ),
      }),
    );
  }

  // 2. 错误日志 - 仅 error 级别，按日期轮转
  transports.push(
    new DailyRotateFile({
      dirname: path.join(logDir, 'error'),
      filename: 'error-%DATE%.log',
      datePattern,
      level: 'error',
      maxSize,
      maxFiles,
      format: winston.format.combine(
        excludeAccessFilter(),
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  );

  // 3. 综合日志 - 全级别（排除 access），按日期轮转
  transports.push(
    new DailyRotateFile({
      dirname: path.join(logDir, 'combined'),
      filename: 'combined-%DATE%.log',
      datePattern,
      maxSize,
      maxFiles,
      format: winston.format.combine(
        excludeAccessFilter(),
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  );

  // 4. 访问日志 - HTTP 请求/响应，按日期轮转
  transports.push(
    new DailyRotateFile({
      dirname: path.join(logDir, 'access'),
      filename: 'access-%DATE%.log',
      datePattern,
      maxSize,
      maxFiles,
      level: 'info',
      format: winston.format.combine(
        accessLogFilter(),
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  );

  // 5. 模块日志 - 为高流量模块创建独立文件
  for (const moduleName of LOG_MODULES) {
    transports.push(createModuleTransport(moduleName, logDir, datePattern, maxSize, maxFiles));
  }

  return {
    level: isProduction ? 'info' : 'debug',
    transports,
  };
}
