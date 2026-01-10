import { Public } from '@/common/decorators/public.decorator';
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { Role } from '../role/entities/role.entity';
import { LoginResponseDto } from './dto/login-response.dto';
import { LoginUserDto, LoginWithPasswordDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { AssignRoleDto, AssignRolesDto, UserRoleResponseDto } from './dto/user-role.dto';
import { UserService } from './user.service';

@ApiTags('用户管理')
@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  @Public()
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
    const clientIp = this.getClientIp(request);
    return this.userService.register(registerUserDto, clientIp);
  }

  @Post('login')
  @Public()
  @ApiOperation({
    summary: '邮箱验证码登录',
    description: '使用邮箱和验证码登录',
  })
  @ApiBody({ type: LoginUserDto })
  @ApiResponse({
    status: 200,
    description: '登录成功',
    type: LoginResponseDto,
  })
  async login(
    @Body() loginUserDto: LoginUserDto,
    @Req() request: FastifyRequest,
  ): Promise<LoginResponseDto> {
    const clientIp = this.getClientIp(request);
    return this.userService.loginWithEmailCode(loginUserDto, clientIp);
  }

  @Post('login-password')
  @Public()
  @ApiOperation({
    summary: '密码登录',
    description: '使用邮箱和加密密码登录，密码必须使用获取的密钥进行加密',
  })
  @ApiBody({ type: LoginWithPasswordDto })
  @ApiResponse({
    status: 200,
    description: '登录成功',
    type: LoginResponseDto,
  })
  @ApiBadRequestResponse({
    description: '请求参数错误或密码错误',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: '邮箱或密码错误' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async loginWithPassword(
    @Body() loginWithPasswordDto: LoginWithPasswordDto,
    @Req() request: FastifyRequest,
  ): Promise<LoginResponseDto> {
    const clientIp = this.getClientIp(request);
    return this.userService.loginWithPassword(
      loginWithPasswordDto,
      loginWithPasswordDto.keyId,
      clientIp,
    );
  }

  @Post('logout')
  @ApiOperation({
    summary: '用户登出',
    description: '登出当前用户，清除登录令牌',
  })
  @ApiResponse({
    status: 200,
    description: '登出成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '登出成功' },
      },
    },
  })
  async logout(@Query('userId') userId: string): Promise<{ message: string }> {
    await this.userService.logout(userId);
    return { message: '登出成功' };
  }

  @Post('refresh-token')
  @ApiOperation({
    summary: '刷新访问令牌',
    description: '使用刷新令牌获取新的访问令牌',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: { type: 'string', description: '刷新令牌' },
      },
      required: ['refreshToken'],
    },
  })
  @ApiResponse({
    status: 200,
    description: '令牌刷新成功',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', description: '新的访问令牌' },
        refreshToken: { type: 'string', description: '新的刷新令牌' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: '刷新令牌无效或已过期',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: '刷新令牌无效或已过期' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async refreshToken(
    @Body() body: { refreshToken: string },
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tokens = await this.userService.refreshTokens(body.refreshToken);
    if (!tokens) {
      throw new Error('刷新令牌无效或已过期');
    }
    return tokens;
  }

  @Get('encryption-key')
  @Public()
  @ApiOperation({
    summary: '获取加密密钥',
    description: '获取用于密码加密的临时密钥',
  })
  @ApiResponse({
    status: 200,
    description: '加密密钥获取成功',
    schema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: '加密密钥' },
        keyId: { type: 'string', description: '密钥ID' },
      },
    },
  })
  async getEncryptionKey(): Promise<{ key: string; keyId: string }> {
    return this.userService.getEncryptionKey();
  }

  @Post('send-login-code')
  @Public()
  @ApiOperation({
    summary: '发送登录验证码',
    description: '向指定邮箱发送登录验证码',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email', description: '邮箱地址' },
      },
      required: ['email'],
    },
  })
  @ApiResponse({
    status: 200,
    description: '验证码发送成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '验证码已发送到您的邮箱' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: '邮箱格式无效',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: '邮箱格式无效' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async sendLoginCode(@Body() body: { email: string }): Promise<{ message: string }> {
    await this.userService.sendLoginVerificationCode(body.email);
    return { message: '验证码已发送到您的邮箱' };
  }

  @Post('send-email-code')
  @Public()
  @ApiOperation({
    summary: '发送邮箱验证码',
    description: '向指定邮箱发送验证码，用于用户注册验证',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email', description: '邮箱地址' },
      },
      required: ['email'],
    },
  })
  @ApiResponse({
    status: 200,
    description: '验证码发送成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '验证码已发送到您的邮箱' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: '邮箱格式无效',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: '邮箱格式无效' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async sendEmailCode(@Body() body: { email: string }): Promise<{ message: string }> {
    await this.userService.sendEmailVerificationCode(body.email);
    return { message: '验证码已发送到您的邮箱' };
  }

  @Post('assign-role')
  @ApiOperation({
    summary: '为用户分配角色',
    description: '为指定用户分配一个角色',
  })
  @ApiBody({ type: AssignRoleDto })
  @ApiResponse({
    status: 201,
    description: '角色分配成功',
    type: UserRoleResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '用户或角色不存在',
  })
  @ApiResponse({
    status: 409,
    description: '用户已拥有该角色',
  })
  async assignRole(@Body() assignRoleDto: AssignRoleDto): Promise<UserRoleResponseDto> {
    return await this.userService.assignRole(assignRoleDto.userId, assignRoleDto);
  }

  @Post('assign-roles-batch')
  @ApiOperation({
    summary: '为用户批量分配角色',
    description: '为指定用户分配多个角色',
  })
  @ApiBody({ type: AssignRolesDto })
  @ApiResponse({
    status: 201,
    description: '角色分配成功',
    type: [UserRoleResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: '用户或角色不存在',
  })
  @ApiResponse({
    status: 409,
    description: '用户已拥有所有指定角色',
  })
  async assignRoles(@Body() assignRolesDto: AssignRolesDto): Promise<UserRoleResponseDto[]> {
    return await this.userService.assignRoles(assignRolesDto.userId, assignRolesDto);
  }

  @Delete('remove-role')
  @ApiOperation({
    summary: '移除用户角色',
    description: '从用户中移除指定角色',
  })
  @ApiQuery({
    name: 'id',
    description: '用户ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'roleId',
    description: '角色ID',
    example: '456e7890-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: '角色移除成功',
  })
  @ApiResponse({
    status: 404,
    description: '用户角色关系不存在',
  })
  async removeRole(
    @Query('id') userId: string,
    @Query('roleId') roleId: string,
  ): Promise<{ message: string }> {
    await this.userService.removeRole(userId, roleId);
    return { message: '角色移除成功' };
  }

  @Get('roles')
  @ApiOperation({
    summary: '获取用户角色',
    description: '获取指定用户的所有角色列表',
  })
  @ApiQuery({
    name: 'id',
    description: '用户ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: '用户角色列表获取成功',
    type: [Role],
  })
  @ApiResponse({
    status: 404,
    description: '用户不存在',
  })
  async getUserRoles(@Query('id') userId: string): Promise<Role[]> {
    return await this.userService.getUserRoles(userId);
  }

  @Get('permissions')
  @ApiOperation({
    summary: '获取用户权限',
    description: '获取指定用户的所有权限列表',
  })
  @ApiQuery({
    name: 'id',
    description: '用户ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: '用户权限列表获取成功',
    schema: {
      type: 'array',
      items: { type: 'object' },
    },
  })
  async getUserPermissions(@Query('id') userId: string): Promise<any[]> {
    return await this.userService.getUserPermissions(userId);
  }

  @Get('check-role')
  @ApiOperation({
    summary: '检查用户角色',
    description: '检查用户是否拥有指定角色',
  })
  @ApiQuery({
    name: 'id',
    description: '用户ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'roleCode',
    description: '角色代码',
    example: 'ROLE_ADMIN',
  })
  @ApiResponse({
    status: 200,
    description: '检查结果',
    schema: {
      type: 'object',
      properties: {
        hasRole: { type: 'boolean' },
      },
    },
  })
  async checkUserRole(
    @Query('id') userId: string,
    @Query('roleCode') roleCode: string,
  ): Promise<{ hasRole: boolean }> {
    const hasRole = await this.userService.hasRole(userId, roleCode);
    return { hasRole };
  }

  @Get('check-permission')
  @ApiOperation({
    summary: '检查用户权限',
    description: '检查用户是否拥有指定权限',
  })
  @ApiQuery({
    name: 'id',
    description: '用户ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'action',
    description: '动作',
    example: 'read',
  })
  @ApiQuery({
    name: 'resource',
    description: '资源',
    example: 'user',
  })
  @ApiResponse({
    status: 200,
    description: '检查结果',
    schema: {
      type: 'object',
      properties: {
        hasPermission: { type: 'boolean' },
      },
    },
  })
  async checkUserPermission(
    @Query('id') userId: string,
    @Query('action') action: string,
    @Query('resource') resource: string,
  ): Promise<{ hasPermission: boolean }> {
    const hasPermission = await this.userService.hasPermission(userId, action, resource);
    return { hasPermission };
  }

  /**
   * 获取客户端真实IP地址
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
