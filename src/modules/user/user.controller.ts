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

  @Post('assign-role')
  @ApiOperation({
    summary: '为用户分配角色',
    description: '为指定用户分配一个角色',
  })
  @ApiQuery({
    name: 'id',
    description: '用户ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
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
  async assignRole(
    @Query('id') userId: string,
    @Body() assignRoleDto: AssignRoleDto,
  ): Promise<UserRoleResponseDto> {
    return await this.userService.assignRole(userId, assignRoleDto);
  }

  @Post('assign-roles-batch')
  @ApiOperation({
    summary: '为用户批量分配角色',
    description: '为指定用户分配多个角色',
  })
  @ApiQuery({
    name: 'id',
    description: '用户ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
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
  async assignRoles(
    @Query('id') userId: string,
    @Body() assignRolesDto: AssignRolesDto,
  ): Promise<UserRoleResponseDto[]> {
    return await this.userService.assignRoles(userId, assignRolesDto);
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
}
