import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class MailSendResponseDto {
  @ApiProperty({
    description: '发送是否成功',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: '发送结果消息',
    example: '邮件发送成功',
  })
  message: string;

  @ApiProperty({
    description: '错误信息（发送失败时）',
    example: '邮件服务器连接超时',
    required: false,
  })
  error?: string;
}

export class VerificationCodeResponseDto extends MailSendResponseDto {
  @ApiProperty({
    description: '验证码（仅用于开发环境调试，生产环境不返回）',
    example: '123456',
    required: false,
  })
  code?: string;
}

export class SendVerificationCodeDto {
  @ApiProperty({
    description: '收件人邮箱',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email: string;
}

export class SendWelcomeEmailDto {
  @ApiProperty({
    description: '收件人邮箱',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email: string;

  @ApiProperty({
    description: '用户名',
    example: '张三',
  })
  @IsString({ message: '用户名必须是字符串' })
  @IsNotEmpty({ message: '用户名不能为空' })
  username: string;
}

export class SendPasswordResetDto {
  @ApiProperty({
    description: '收件人邮箱',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email: string;

  @ApiProperty({
    description: '重置令牌',
    example: 'abc123def456',
  })
  @IsString({ message: '重置令牌必须是字符串' })
  @IsNotEmpty({ message: '重置令牌不能为空' })
  resetToken: string;

  @ApiProperty({
    description: '重置链接',
    example: 'https://example.com/reset-password?token=abc123def456',
  })
  @IsString({ message: '重置链接必须是字符串' })
  @IsNotEmpty({ message: '重置链接不能为空' })
  resetUrl: string;
}

export class SendHtmlEmailDto {
  @ApiProperty({
    description: '收件人邮箱',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email: string;

  @ApiProperty({
    description: '邮件主题',
    example: '重要通知',
  })
  @IsString({ message: '邮件主题必须是字符串' })
  @IsNotEmpty({ message: '邮件主题不能为空' })
  subject: string;

  @ApiProperty({
    description: 'HTML内容',
    example: '<h1>Hello World</h1><p>这是一封测试邮件</p>',
  })
  @IsString({ message: 'HTML内容必须是字符串' })
  @IsNotEmpty({ message: 'HTML内容不能为空' })
  html: string;
}
