export const MAIL_TEMPLATES = {
  VERIFICATION_CODE: 'verification-code',
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password-reset',
} as const;

export type MailTemplateType = (typeof MAIL_TEMPLATES)[keyof typeof MAIL_TEMPLATES];

export interface VerificationCodeContext {
  code: string;
  appName: string;
  year: number;
}

export interface WelcomeContext {
  username: string;
  appName: string;
  year: number;
}

export interface PasswordResetContext {
  resetToken: string;
  resetUrl: string;
  appName: string;
  year: number;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  template: string;
  context?: Record<string, any>;
}

export interface SendHtmlMailOptions {
  to: string;
  subject: string;
  html: string;
}

export interface MailSendResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface VerificationCodeResult extends MailSendResult {
  code?: string;
}

export enum MailErrorType {
  TIMEOUT = 'TIMEOUT',
  AUTHENTICATION = 'AUTHENTICATION',
  NETWORK = 'NETWORK',
  TEMPLATE = 'TEMPLATE',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN',
}

export interface MailError {
  type: MailErrorType;
  message: string;
  originalError?: any;
}
