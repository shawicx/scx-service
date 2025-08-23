import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig = registerAs('database', (): TypeOrmModuleOptions => {
  const isProduction = process.env.NODE_ENV === 'production';
  // 统一使用 MySQL 配置
  return {
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'scx',
    password: process.env.DB_PASSWORD || 'b696a68e45c4',
    database: process.env.DB_DATABASE || 'scx-service',
    entities: [`${__dirname}/../**/*.entity{.ts,.js}`],
    synchronize: !isProduction, // 开发环境自动同步，生产环境禁用
    logging: !isProduction, // 开发环境启用日志
    timezone: '+08:00',
    charset: 'utf8mb4',
  };
});
