/*
 * @Author: shawicx d35f3153@proton.me
 * @Description:
 */
import { Public } from '@/common/decorators/public.decorator';
import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  MailSendResponseDto,
  SendHtmlEmailDto,
  SendPasswordResetDto,
  SendVerificationCodeDto,
  SendWelcomeEmailDto,
  VerificationCodeResponseDto,
} from './dto/send-mail.dto';
import { MailService } from './mail.service';

@ApiTags('邮箱服务')
@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('send-verification-code')
  @Public()
  @ApiOperation({
    summary: '发送验证码邮件',
    description: '发送邮箱验证码（服务端内部生成6位数字）',
  })
  @ApiBody({ type: SendVerificationCodeDto })
  @ApiResponse({
    status: 200,
    description: '发送结果',
    type: VerificationCodeResponseDto,
  })
  async sendVerificationCode(
    @Body() body: SendVerificationCodeDto,
  ): Promise<VerificationCodeResponseDto> {
    return await this.mailService.sendVerificationCode(body.email);
  }

  @Post('send-welcome-email')
  @Public()
  @ApiOperation({
    summary: '发送欢迎邮件',
    description: '发送用户注册欢迎邮件',
  })
  @ApiBody({ type: SendWelcomeEmailDto })
  @ApiResponse({
    status: 200,
    description: '发送结果',
    type: MailSendResponseDto,
  })
  async sendWelcomeEmail(@Body() body: SendWelcomeEmailDto): Promise<MailSendResponseDto> {
    return await this.mailService.sendWelcomeEmail(body.email, body.username);
  }

  @Post('send-password-reset')
  @Public()
  @ApiOperation({
    summary: '发送密码重置邮件',
    description: '发送密码重置链接邮件',
  })
  @ApiBody({ type: SendPasswordResetDto })
  @ApiResponse({
    status: 200,
    description: '发送结果',
    type: MailSendResponseDto,
  })
  async sendPasswordResetEmail(@Body() body: SendPasswordResetDto): Promise<MailSendResponseDto> {
    return await this.mailService.sendPasswordResetEmail(
      body.email,
      body.resetToken,
      body.resetUrl,
    );
  }

  @Post('send-html-email')
  @Public()
  @ApiOperation({
    summary: '发送HTML邮件',
    description: '发送自定义HTML内容邮件',
  })
  @ApiBody({ type: SendHtmlEmailDto })
  @ApiResponse({
    status: 200,
    description: '发送结果',
    type: MailSendResponseDto,
  })
  async sendHtmlEmail(@Body() body: SendHtmlEmailDto): Promise<MailSendResponseDto> {
    return await this.mailService.sendHtmlMail(body.email, body.subject, body.html);
  }
}
