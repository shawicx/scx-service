import * as winston from 'winston';

/**
 * @description 仅通过 logType === 'access' 的日志
 */
export const accessLogFilter = winston.format((info) => {
  if (info.logType === 'access') {
    return info;
  }
  return false;
});

/**
 * @description 排除 access 日志，仅通过非 access 类型的日志
 */
export const excludeAccessFilter = winston.format((info) => {
  if (info.logType === 'access') {
    return false;
  }
  return info;
});
