import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MAIL_TEMPLATES,
  MailError,
  MailErrorType,
  MailSendResult,
  VerificationCodeResult,
} from './interfaces/mail.interface';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly appName: string;
  private readonly timeout: number;

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {
    // 缓存常用配置
    this.appName = this.configService.get('app.name', 'SCX Service');
    this.timeout = this.configService.get('mail.transport.socketTimeout', 30000);
    // 启动时打印邮件配置信息
    this.logMailConfiguration();
  }

  /**
   * 发送邮箱验证码（内部生成 6 位数字）
   * @param to 收件人邮箱
   * @returns 发送结果与验证码
   */
  async sendVerificationCode(to: string): Promise<VerificationCodeResult> {
    // 生成 6 位数字验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      const mailOptions = {
        to,
        subject: `【${this.appName}】您的验证码`,
        template: MAIL_TEMPLATES.VERIFICATION_CODE,
        context: {
          code,
          appName: this.appName,
          year: new Date().getFullYear(),
        },
      };

      await this.sendMailWithTimeout(mailOptions, this.timeout);
      this.logger.log(`✅ 验证码邮件发送成功: ${to}`);

      // 在开发环境下返回验证码用于调试
      const isDevelopment = this.configService.get('NODE_ENV') !== 'production';

      return {
        success: true,
        message: '验证码邮件发送成功',
        code: isDevelopment ? code : undefined,
      };
    } catch (error: any) {
      const mailError = this.parseMailError(error);
      this.logger.error('❌ 发送验证码邮件失败:', {
        error: mailError.message,
        type: mailError.type,
        to,
      });

      return {
        success: false,
        message: '验证码邮件发送失败',
        error: mailError.message,
      };
    }
  }

  /**
   * 发送欢迎邮件
   * @param to 收件人邮箱
   * @param username 用户名
   * @returns 发送结果
   */
  async sendWelcomeEmail(to: string, username: string): Promise<MailSendResult> {
    try {
      const mailOptions = {
        to,
        subject: `欢迎加入 ${this.appName}！`,
        template: MAIL_TEMPLATES.WELCOME,
        context: {
          username,
          appName: this.appName,
          year: new Date().getFullYear(),
        },
      };

      await this.sendMailWithTimeout(mailOptions, this.timeout);
      this.logger.log(`✅ 欢迎邮件发送成功: ${to}`);

      return {
        success: true,
        message: '欢迎邮件发送成功',
      };
    } catch (error: any) {
      const mailError = this.parseMailError(error);
      this.logger.error('❌ 发送欢迎邮件失败:', {
        error: mailError.message,
        type: mailError.type,
        to,
      });

      return {
        success: false,
        message: '欢迎邮件发送失败',
        error: mailError.message,
      };
    }
  }

  /**
   * 发送密码重置邮件
   * @param to 收件人邮箱
   * @param resetToken 重置令牌
   * @param resetUrl 重置链接
   * @returns 发送结果
   */
  async sendPasswordResetEmail(
    to: string,
    resetToken: string,
    resetUrl: string,
  ): Promise<MailSendResult> {
    try {
      const mailOptions = {
        to,
        subject: `【${this.appName}】密码重置请求`,
        template: MAIL_TEMPLATES.PASSWORD_RESET,
        context: {
          resetToken,
          resetUrl,
          appName: this.appName,
          year: new Date().getFullYear(),
        },
      };

      await this.sendMailWithTimeout(mailOptions, this.timeout);
      this.logger.log(`✅ 密码重置邮件发送成功: ${to}`);

      return {
        success: true,
        message: '密码重置邮件发送成功',
      };
    } catch (error: any) {
      const mailError = this.parseMailError(error);
      this.logger.error('❌ 发送密码重置邮件失败:', {
        error: mailError.message,
        type: mailError.type,
        to,
      });

      return {
        success: false,
        message: '密码重置邮件发送失败',
        error: mailError.message,
      };
    }
  }

  /**
   * 发送通用邮件
   * @param to 收件人邮箱
   * @param subject 邮件主题
   * @param template 模板名称
   * @param context 模板变量
   * @returns 发送结果
   */
  async sendMail(
    to: string,
    subject: string,
    template: string,
    context: Record<string, any> = {},
  ): Promise<MailSendResult> {
    try {
      const mailOptions = {
        to,
        subject,
        template,
        context: {
          ...context,
          appName: this.appName,
          year: new Date().getFullYear(),
        },
      };

      await this.sendMailWithTimeout(mailOptions, this.timeout);
      this.logger.log(`✅ 邮件发送成功: ${to} - ${subject}`);

      return {
        success: true,
        message: '邮件发送成功',
      };
    } catch (error: any) {
      const mailError = this.parseMailError(error);
      this.logger.error('❌ 发送邮件失败:', {
        error: mailError.message,
        type: mailError.type,
        to,
        subject,
        template,
      });

      return {
        success: false,
        message: '邮件发送失败',
        error: mailError.message,
      };
    }
  }

  /**
   * 发送HTML邮件
   * @param to 收件人邮箱
   * @param subject 邮件主题
   * @param html HTML内容
   * @returns 发送结果
   */
  async sendHtmlMail(to: string, subject: string, html: string): Promise<MailSendResult> {
    try {
      const mailOptions = {
        to,
        subject,
        html,
      };

      await this.sendMailWithTimeout(mailOptions, this.timeout);
      this.logger.log(`✅ HTML邮件发送成功: ${to} - ${subject}`);

      return {
        success: true,
        message: 'HTML邮件发送成功',
      };
    } catch (error: any) {
      const mailError = this.parseMailError(error);
      this.logger.error('❌ 发送HTML邮件失败:', {
        error: mailError.message,
        type: mailError.type,
        to,
        subject,
      });

      return {
        success: false,
        message: 'HTML邮件发送失败',
        error: mailError.message,
      };
    }
  }

  /**
   * 测试邮件配置
   * @returns 测试结果
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    const timeout = this.configService.get('mail.transport.socketTimeout', 30000);

    try {
      const testEmail = this.configService.get('mail.defaults.from') || process.env.MAIL_FROM;

      if (!testEmail) {
        throw new Error('邮件发件人地址未配置');
      }

      const mailOptions = {
        to: testEmail,
        subject: '邮件配置测试',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">邮件配置测试成功</h2>
            <p>如果您收到这封邮件，说明邮件配置正常工作。</p>
            <p>测试时间: ${new Date().toLocaleString('zh-CN')}</p>
          </div>
        `,
      };

      await this.sendMailWithTimeout(mailOptions, timeout);
      this.logger.log('✅ 邮件配置测试成功');
      return {
        success: true,
        message: '邮件配置测试成功',
      };
    } catch (error: any) {
      this.logger.error('❌ 邮件配置测试失败:', {
        error: error.message,
        isTimeout: error.message.includes('超时'),
      });
      return {
        success: false,
        message: `邮件配置测试失败: ${error.message}`,
      };
    }
  }

  /**
   * 打印邮件配置信息（用于调试）
   */
  private logMailConfiguration(): void {
    const mailConfig = this.configService.get('mail');

    const debugConfig = {
      host: mailConfig?.transport?.host || process.env.MAIL_HOST,
      port: mailConfig?.transport?.port || process.env.MAIL_PORT,
      secure: mailConfig?.transport?.secure || process.env.MAIL_SECURE === 'true',
      from: mailConfig?.defaults?.from || process.env.MAIL_FROM,
      user: mailConfig?.transport?.auth?.user || process.env.MAIL_USER,
      passwordConfigured: !!(mailConfig?.transport?.auth?.pass || process.env.MAIL_PASSWORD),
      socketTimeout: mailConfig?.transport?.socketTimeout || 30000,
    };

    this.logger.log('📧 邮件配置:', debugConfig);
  }

  /**
   * 带超时的邮件发送
   */
  private async sendMailWithTimeout(
    mailOptions: Record<string, any>,
    timeoutMs = 30000,
  ): Promise<any> {
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`邮件发送超时 (${timeoutMs}ms)`)), timeoutMs);
    });

    const sendPromise = this.mailerService.sendMail(mailOptions);
    return Promise.race([sendPromise, timeout]);
  }

  /**
   * 解析邮件错误类型
   */
  private parseMailError(error: any): MailError {
    const message = error?.message || '未知错误';

    let type: MailErrorType;

    if (message.includes('超时') || message.includes('timeout')) {
      type = MailErrorType.TIMEOUT;
    } else if (message.includes('Authentication') || message.includes('auth')) {
      type = MailErrorType.AUTHENTICATION;
    } else if (message.includes('ENOTFOUND') || message.includes('ECONNREFUSED')) {
      type = MailErrorType.NETWORK;
    } else if (message.includes('template') || message.includes('Template')) {
      type = MailErrorType.TEMPLATE;
    } else if (message.includes('Invalid') || message.includes('validation')) {
      type = MailErrorType.VALIDATION;
    } else {
      type = MailErrorType.UNKNOWN;
    }

    return {
      type,
      message,
      originalError: error,
    };
  }
}
