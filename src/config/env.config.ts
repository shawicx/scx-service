import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  isProduction: process.env.NODE_ENV === 'production',
}));

export const swaggerConfig = registerAs('swagger', () => ({
  enabled: process.env.SWAGGER_ENABLED !== 'false',
  title: process.env.SWAGGER_TITLE || 'SCX Service API',
  description: process.env.SWAGGER_DESCRIPTION || 'SCX Service API Documentation',
  version: process.env.SWAGGER_VERSION || '1.0',
  path: process.env.SWAGGER_PATH || 'api/docs',
}));
