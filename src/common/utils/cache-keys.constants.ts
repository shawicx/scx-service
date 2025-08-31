/**
 * Redis Key 构造工具，统一管理 key 命名
 */
export const accessTokenKey = (userId: string) => `access_token:${userId}`;
export const refreshTokenKey = (userId: string) => `refresh_token:${userId}`;
export const encryptionKeyKey = (keyId: string) => `encryption_key:${keyId}`;
export const emailVerificationKey = (email: string) => `email_verification:${email}`;
export const loginVerificationKey = (email: string) => `login_verification:${email}`;
