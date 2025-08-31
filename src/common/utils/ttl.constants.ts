/**
 * 统一的 TTL 常量（毫秒）
 */
export const ACCESS_TOKEN_TTL_MS = 2 * 60 * 60 * 1000; // 2小时
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7天
export const ENCRYPTION_KEY_TTL_MS = 5 * 60 * 1000; // 5分钟
export const EMAIL_VERIFICATION_TTL_MS = 10 * 60 * 1000; // 10分钟（注册验证码）
export const LOGIN_VERIFICATION_TTL_MS = 10 * 60 * 1000; // 10分钟（登录验证码）
