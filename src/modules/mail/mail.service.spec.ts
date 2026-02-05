import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';

describe('MailService', () => {
  let mailService: MailService;
  let mailerService: MailerService;

  const mockMailerService = {
    sendMail: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: MailerService,
          useValue: mockMailerService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    mailService = module.get<MailService>(MailService);
    mailerService = module.get<MailerService>(MailerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendVerificationCode', () => {
    it('should send verification code successfully', async () => {
      const to = 'serve.suitor386@passinbox.com';

      // Mock config values
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'app.name':
            return 'SCX Service';
          case 'mail.transport.socketTimeout':
            return 30000;
          case 'NODE_ENV':
            return 'production';
          default:
            return undefined;
        }
      });

      mockMailerService.sendMail.mockResolvedValue({ messageId: 'mock-message-id' });

      const result = await mailService.sendVerificationCode(to);

      expect(result).toEqual({
        success: true,
        message: '验证码邮件发送成功',
        code: expect.any(String),
      });
      expect(mailerService.sendMail).toHaveBeenCalled();
    });

    it('should return code in development environment', async () => {
      const to = 'serve.suitor386@passinbox.com';

      // Mock config values
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'app.name':
            return 'SCX Service';
          case 'mail.transport.socketTimeout':
            return 30000;
          case 'NODE_ENV':
            return 'development';
          default:
            return undefined;
        }
      });

      mockMailerService.sendMail.mockResolvedValue({ messageId: 'mock-message-id' });

      const result = await mailService.sendVerificationCode(to);

      expect(result.success).toBe(true);
      expect(result.message).toBe('验证码邮件发送成功');
      expect(result.code).toBeDefined();
      expect(result.code).toHaveLength(6);
      expect(/^[0-9]{6}$/.test(result.code!)).toBe(true);
    });

    it('should handle send mail error', async () => {
      const to = 'serve.suitor386@passinbox.com';

      // Mock config values
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'app.name':
            return 'SCX Service';
          case 'mail.transport.socketTimeout':
            return 30000;
          case 'NODE_ENV':
            return 'production';
          default:
            return undefined;
        }
      });

      mockMailerService.sendMail.mockRejectedValue(new Error('Network error'));

      const result = await mailService.sendVerificationCode(to);

      expect(result).toEqual({
        success: false,
        message: '验证码邮件发送失败',
        error: 'Network error',
      });
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email successfully', async () => {
      const to = 'serve.suitor386@passinbox.com';
      const username = 'Test User';

      // Mock config values
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'app.name':
            return 'SCX Service';
          case 'mail.transport.socketTimeout':
            return 30000;
          default:
            return undefined;
        }
      });

      mockMailerService.sendMail.mockResolvedValue({ messageId: 'mock-message-id' });

      const result = await mailService.sendWelcomeEmail(to, username);

      expect(result).toEqual({
        success: true,
        message: '欢迎邮件发送成功',
      });
      expect(mailerService.sendMail).toHaveBeenCalled();
    });

    it('should handle send welcome email error', async () => {
      const to = 'serve.suitor386@passinbox.com';
      const username = 'Test User';

      // Mock config values
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'app.name':
            return 'SCX Service';
          case 'mail.transport.socketTimeout':
            return 30000;
          default:
            return undefined;
        }
      });

      mockMailerService.sendMail.mockRejectedValue(new Error('Template error'));

      const result = await mailService.sendWelcomeEmail(to, username);

      expect(result).toEqual({
        success: false,
        message: '欢迎邮件发送失败',
        error: 'Template error',
      });
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', async () => {
      const to = 'serve.suitor386@passinbox.com';
      const resetToken = 'reset-token';
      const resetUrl = 'https://example.com/reset';

      // Mock config values
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'app.name':
            return 'SCX Service';
          case 'mail.transport.socketTimeout':
            return 30000;
          default:
            return undefined;
        }
      });

      mockMailerService.sendMail.mockResolvedValue({ messageId: 'mock-message-id' });

      const result = await mailService.sendPasswordResetEmail(to, resetToken, resetUrl);

      expect(result).toEqual({
        success: true,
        message: '密码重置邮件发送成功',
      });
      expect(mailerService.sendMail).toHaveBeenCalled();
    });

    it('should handle send password reset email error', async () => {
      const to = 'serve.suitor386@passinbox.com';
      const resetToken = 'reset-token';
      const resetUrl = 'https://example.com/reset';

      // Mock config values
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'app.name':
            return 'SCX Service';
          case 'mail.transport.socketTimeout':
            return 30000;
          default:
            return undefined;
        }
      });

      mockMailerService.sendMail.mockRejectedValue(new Error('Authentication error'));

      const result = await mailService.sendPasswordResetEmail(to, resetToken, resetUrl);

      expect(result).toEqual({
        success: false,
        message: '密码重置邮件发送失败',
        error: 'Authentication error',
      });
    });
  });

  describe('sendMail', () => {
    it('should send generic mail successfully', async () => {
      const to = 'serve.suitor386@passinbox.com';
      const subject = 'Test Subject';
      const template = 'test-template';
      const context = { name: 'Test' };

      // Mock config values
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'app.name':
            return 'SCX Service';
          case 'mail.transport.socketTimeout':
            return 30000;
          default:
            return undefined;
        }
      });

      mockMailerService.sendMail.mockResolvedValue({ messageId: 'mock-message-id' });

      const result = await mailService.sendMail(to, subject, template, context);

      expect(result).toEqual({
        success: true,
        message: '邮件发送成功',
      });
      expect(mailerService.sendMail).toHaveBeenCalled();
    });
  });

  describe('sendHtmlMail', () => {
    it('should send HTML mail successfully', async () => {
      const to = 'serve.suitor386@passinbox.com';
      const subject = 'Test Subject';
      const html = '<h1>Test</h1>';

      // Mock config values
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'app.name':
            return 'SCX Service';
          case 'mail.transport.socketTimeout':
            return 30000;
          default:
            return undefined;
        }
      });

      mockMailerService.sendMail.mockResolvedValue({ messageId: 'mock-message-id' });

      const result = await mailService.sendHtmlMail(to, subject, html);

      expect(result).toEqual({
        success: true,
        message: 'HTML邮件发送成功',
      });
      expect(mailerService.sendMail).toHaveBeenCalled();
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      // Mock config values
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'mail.defaults.from':
            return 'serve.suitor386@passinbox.com';
          case 'mail.transport.socketTimeout':
            return 30000;
          default:
            return undefined;
        }
      });

      mockMailerService.sendMail.mockResolvedValue({ messageId: 'mock-message-id' });

      const result = await mailService.testConnection();

      expect(result).toEqual({
        success: true,
        message: '邮件配置测试成功',
      });
      expect(mailerService.sendMail).toHaveBeenCalled();
    });

    it('should fail test connection when MAIL_FROM not configured', async () => {
      // Mock config values
      mockConfigService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'mail.defaults.from':
            return undefined;
          case 'MAIL_FROM':
            return undefined;
          default:
            return undefined;
        }
      });

      const result = await mailService.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('邮件配置测试失败');
    });
  });

  describe('parseMailError', () => {
    it('should parse timeout error', () => {
      const error = new Error('邮件发送超时 (30000ms)');
      const result = (mailService as any).parseMailError(error);

      expect(result.type).toBe('TIMEOUT');
      expect(result.message).toBe('邮件发送超时 (30000ms)');
    });

    it('should parse authentication error', () => {
      const error = new Error('Authentication failed');
      const result = (mailService as any).parseMailError(error);

      expect(result.type).toBe('AUTHENTICATION');
      expect(result.message).toBe('Authentication failed');
    });

    it('should parse network error', () => {
      const error = new Error('getaddrinfo ENOTFOUND smtp.example.com');
      const result = (mailService as any).parseMailError(error);

      expect(result.type).toBe('NETWORK');
      expect(result.message).toBe('getaddrinfo ENOTFOUND smtp.example.com');
    });

    it('should parse template error', () => {
      const error = new Error('Template not found');
      const result = (mailService as any).parseMailError(error);

      expect(result.type).toBe('TEMPLATE');
      expect(result.message).toBe('Template not found');
    });

    it('should parse validation error', () => {
      const error = new Error('Invalid email address');
      const result = (mailService as any).parseMailError(error);

      expect(result.type).toBe('VALIDATION');
      expect(result.message).toBe('Invalid email address');
    });

    it('should parse unknown error', () => {
      const error = new Error('Unknown error');
      const result = (mailService as any).parseMailError(error);

      expect(result.type).toBe('UNKNOWN');
      expect(result.message).toBe('Unknown error');
    });
  });
});
