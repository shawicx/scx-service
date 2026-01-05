import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig = registerAs('database', (): TypeOrmModuleOptions => {
  const isProduction = process.env.NODE_ENV === 'production';
  // 统一使用 PostgreSQL 配置
  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'scx',
    password: process.env.DB_PASSWORD || 'b696a68e45c4',
    database: process.env.DB_DATABASE || 'scx-service',
    entities: [`${__dirname}/../**/*.entity{.ts,.js}`],
    synchronize: !isProduction, // 开发环境自动同步，生产环境禁用
    logging: !isProduction, // 开发环境启用日志
    extra: {
      max: 20, // 连接池最大连接数
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    },
  };
});
