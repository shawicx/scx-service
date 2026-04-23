import * as path from 'path';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';

/**
 * @description 创建按模块过滤的日志 transport
 * 通过匹配 context 字段（nest-winston 自动传递类名作为 context）过滤日志
 */
export function createModuleTransport(
  moduleName: string,
  logDir: string,
  datePattern: string,
  maxSize: string,
  maxFiles: string,
): DailyRotateFile {
  const moduleFilter = winston.format((info) => {
    if (info.context === moduleName || info.module === moduleName) {
      return info;
    }
    return false;
  });

  return new DailyRotateFile({
    dirname: path.join(logDir, 'modules', moduleName.toLowerCase()),
    filename: `${moduleName.toLowerCase()}-%DATE%.log`,
    datePattern,
    maxSize,
    maxFiles,
    format: winston.format.combine(
      moduleFilter(),
      winston.format.timestamp(),
      winston.format.json(),
    ),
  });
}
