import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Post,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { RegisterUserDto } from './dto/register-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserService } from './user.service';

@ApiTags('用户管理')
@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  @ApiOperation({
    summary: '用户注册',
    description: '通过邮箱、用户名和邮箱验证码注册新用户',
  })
  @ApiBody({ type: RegisterUserDto })
  @ApiResponse({
    status: 201,
    description: '注册成功',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: '请求参数错误或邮箱验证码无效',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: '邮箱验证码无效或已过期' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiConflictResponse({
    description: '邮箱已被注册',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: '该邮箱已被注册' },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  })
  async register(
    @Body() registerUserDto: RegisterUserDto,
    @Req() request: FastifyRequest,
  ): Promise<UserResponseDto> {
    // 获取客户端IP
    const clientIp = this.getClientIp(request);
    return this.userService.register(registerUserDto, clientIp);
  }

  @Get()
  @ApiOperation({
    summary: '获取用户信息',
    description: '通过查询参数获取用户详细信息',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '用户不存在',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: '用户不存在' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async findUser(@Req() request: FastifyRequest): Promise<UserResponseDto> {
    const query = request.query as Record<string, string>;
    const { id } = query;
    const { email } = query;

    if (!id && !email) {
      throw new Error('请提供用户ID或邮箱');
    }

    let user: UserResponseDto | null = null;

    if (id) {
      user = await this.userService.findById(id);
    } else if (email) {
      const foundUser = await this.userService.findByEmail(email);
      user = foundUser ? new UserResponseDto(foundUser) : null;
    }

    if (!user) {
      throw new Error('用户不存在');
    }

    return user;
  }

  @Post('send-email-code')
  @ApiOperation({
    summary: '发送邮箱验证码',
    description: '向指定邮箱发送验证码，用于用户注册验证',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
          description: '邮箱地址',
          example: 'user@example.com',
        },
      },
      required: ['email'],
    },
  })
  @ApiResponse({
    status: 201,
    description: '验证码发送成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '验证码已发送到您的邮箱' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: '邮箱格式错误或发送失败',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: '验证码发送失败，请稍后重试' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiConflictResponse({
    description: '邮箱已被注册',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: '该邮箱已被注册' },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  })
  async sendEmailCode(@Body() body: { email: string }): Promise<{ message: string }> {
    await this.userService.sendEmailVerificationCode(body.email);
    return { message: '验证码已发送到您的邮箱' };
  }

  /**
   * 获取客户端真实IP地址
   * @param request 请求对象
   * @returns IP地址
   */
  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      '127.0.0.1'
    );
  }
}
