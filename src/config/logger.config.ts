import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { LoggerOptions } from 'winston';

/**
 * 创建日志配置
 * @param isProduction 是否为生产环境
 * @returns Winston日志配置
 */
export function createLoggerConfig(isProduction = false): LoggerOptions {
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
}

/**
 * 创建Winston日志实例
 * @param isProduction 是否为生产环境
 * @returns Winston日志实例
 */
export function createWinstonLogger(isProduction = false) {
  return WinstonModule.createLogger(createLoggerConfig(isProduction));
}
