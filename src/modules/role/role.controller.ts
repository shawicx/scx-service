import { Body, Controller, Delete, Get, Post, Put, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Permission } from '../permission/entities/permission.entity';
import {
  AssignPermissionsDto,
  CreateRoleDto,
  RoleResponseDto,
  UpdateRoleDto,
} from './dto/role.dto';
import { RoleService } from './role.service';

@ApiTags('角色管理')
@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @ApiOperation({
    summary: '创建角色',
    description: '创建新的角色，角色名称和代码必须唯一',
  })
  @ApiBody({ type: CreateRoleDto })
  @ApiResponse({
    status: 201,
    description: '角色创建成功',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: '角色名称或代码已存在',
  })
  async create(@Body() createRoleDto: CreateRoleDto): Promise<RoleResponseDto> {
    return await this.roleService.create(createRoleDto);
  }

  @Get()
  @ApiOperation({
    summary: '获取角色列表',
    description: '分页获取所有角色列表',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: '页码',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '每页数量',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: '角色列表获取成功',
    schema: {
      type: 'object',
      properties: {
        roles: {
          type: 'array',
          items: { $ref: '#/components/schemas/RoleResponseDto' },
        },
        total: { type: 'number', description: '总数量' },
      },
    },
  })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ): Promise<{ roles: RoleResponseDto[]; total: number }> {
    return await this.roleService.findAll(+page, +limit);
  }

  @Get('detail')
  @ApiOperation({
    summary: '获取角色详情',
    description: '根据角色ID获取角色详细信息',
  })
  @ApiQuery({
    name: 'id',
    description: '角色ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: '角色详情获取成功',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '角色不存在',
  })
  async findById(@Query('id') id: string): Promise<RoleResponseDto> {
    return await this.roleService.findById(id);
  }

  @Get('by-code')
  @ApiOperation({
    summary: '根据代码获取角色',
    description: '根据角色代码获取角色信息',
  })
  @ApiQuery({
    name: 'code',
    description: '角色代码',
    example: 'ROLE_ADMIN',
  })
  @ApiResponse({
    status: 200,
    description: '角色获取成功',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '角色不存在',
  })
  async findByCode(@Query('code') code: string): Promise<RoleResponseDto> {
    return await this.roleService.findByCode(code);
  }

  @Put()
  @ApiOperation({
    summary: '更新角色',
    description: '更新角色信息，系统内置角色无法修改',
  })
  @ApiBody({ type: UpdateRoleDto })
  @ApiResponse({
    status: 200,
    description: '角色更新成功',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '系统角色无法修改',
  })
  @ApiResponse({
    status: 404,
    description: '角色不存在',
  })
  @ApiResponse({
    status: 409,
    description: '角色名称或代码已存在',
  })
  async update(@Body() updateRoleDto: UpdateRoleDto): Promise<RoleResponseDto> {
    return await this.roleService.update(updateRoleDto.id, updateRoleDto);
  }

  @Delete()
  @ApiOperation({
    summary: '删除角色',
    description: '删除角色，系统内置角色无法删除',
  })
  @ApiQuery({
    name: 'id',
    description: '角色ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: '角色删除成功',
  })
  @ApiResponse({
    status: 400,
    description: '系统角色无法删除',
  })
  @ApiResponse({
    status: 404,
    description: '角色不存在',
  })
  async delete(@Query('id') id: string): Promise<{ message: string }> {
    await this.roleService.delete(id);
    return { message: '角色删除成功' };
  }

  @Post('assign-permissions')
  @ApiOperation({
    summary: '为角色分配权限',
    description: '为指定角色分配权限列表，会覆盖原有权限',
  })
  @ApiBody({ type: AssignPermissionsDto })
  @ApiResponse({
    status: 200,
    description: '权限分配成功',
  })
  @ApiResponse({
    status: 404,
    description: '角色或权限不存在',
  })
  async assignPermissions(
    @Body() assignPermissionsDto: AssignPermissionsDto,
  ): Promise<{ message: string }> {
    await this.roleService.assignPermissions(assignPermissionsDto.id, assignPermissionsDto);
    return { message: '权限分配成功' };
  }

  @Get('permissions')
  @ApiOperation({
    summary: '获取角色权限',
    description: '获取指定角色的所有权限列表',
  })
  @ApiQuery({
    name: 'id',
    description: '角色ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: '权限列表获取成功',
    type: [Permission],
  })
  @ApiResponse({
    status: 404,
    description: '角色不存在',
  })
  async getRolePermissions(@Query('id') id: string): Promise<Permission[]> {
    return await this.roleService.getRolePermissions(id);
  }

  @Delete('remove-permission')
  @ApiOperation({
    summary: '移除角色权限',
    description: '从角色中移除指定权限',
  })
  @ApiQuery({
    name: 'id',
    description: '角色ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'permissionId',
    description: '权限ID',
    example: '456e7890-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: '权限移除成功',
  })
  @ApiResponse({
    status: 404,
    description: '权限分配不存在',
  })
  async removePermission(
    @Query('id') id: string,
    @Query('permissionId') permissionId: string,
  ): Promise<{ message: string }> {
    await this.roleService.removePermission(id, permissionId);
    return { message: '权限移除成功' };
  }
}
