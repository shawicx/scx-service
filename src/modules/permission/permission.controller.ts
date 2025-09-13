import { Body, Controller, Delete, Get, Post, Put, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CreatePermissionDto,
  PermissionQueryDto,
  PermissionResponseDto,
  UpdatePermissionDto,
} from './dto/permission.dto';
import { PermissionService } from './permission.service';

@ApiTags('权限管理')
@Controller('permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Post()
  @ApiOperation({
    summary: '创建权限',
    description: '创建新的权限，权限名称和动作-资源组合必须唯一',
  })
  @ApiBody({ type: CreatePermissionDto })
  @ApiResponse({
    status: 201,
    description: '权限创建成功',
    type: PermissionResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: '权限名称或动作-资源组合已存在',
  })
  async create(@Body() createPermissionDto: CreatePermissionDto): Promise<PermissionResponseDto> {
    return await this.permissionService.create(createPermissionDto);
  }

  @Get()
  @ApiOperation({
    summary: '获取权限列表',
    description: '分页获取权限列表，支持搜索和筛选',
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
  @ApiQuery({
    name: 'search',
    required: false,
    description: '搜索关键词（权限名称、动作或资源）',
    example: 'user',
  })
  @ApiQuery({
    name: 'action',
    required: false,
    description: '按动作筛选',
    example: 'read',
  })
  @ApiQuery({
    name: 'resource',
    required: false,
    description: '按资源筛选',
    example: 'user',
  })
  @ApiResponse({
    status: 200,
    description: '权限列表获取成功',
    schema: {
      type: 'object',
      properties: {
        permissions: {
          type: 'array',
          items: { $ref: '#/components/schemas/PermissionResponseDto' },
        },
        total: { type: 'number', description: '总数量' },
      },
    },
  })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query() queryDto: PermissionQueryDto = {},
  ): Promise<{ permissions: PermissionResponseDto[]; total: number }> {
    return await this.permissionService.findAll(queryDto, +page, +limit);
  }

  @Get('search')
  @ApiOperation({
    summary: '搜索权限',
    description: '根据关键词搜索权限',
  })
  @ApiQuery({
    name: 'keyword',
    description: '搜索关键词',
    example: 'user',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '返回数量限制',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: '搜索结果',
    type: [PermissionResponseDto],
  })
  async search(
    @Query('keyword') keyword: string,
    @Query('limit') limit = 10,
  ): Promise<PermissionResponseDto[]> {
    return await this.permissionService.search(keyword, +limit);
  }

  @Get('actions')
  @ApiOperation({
    summary: '获取所有动作',
    description: '获取系统中所有唯一的动作列表',
  })
  @ApiResponse({
    status: 200,
    description: '动作列表获取成功',
    schema: {
      type: 'array',
      items: { type: 'string' },
    },
  })
  async getUniqueActions(): Promise<string[]> {
    return await this.permissionService.getUniqueActions();
  }

  @Get('resources')
  @ApiOperation({
    summary: '获取所有资源',
    description: '获取系统中所有唯一的资源列表',
  })
  @ApiResponse({
    status: 200,
    description: '资源列表获取成功',
    schema: {
      type: 'array',
      items: { type: 'string' },
    },
  })
  async getUniqueResources(): Promise<string[]> {
    return await this.permissionService.getUniqueResources();
  }

  @Get('by-action')
  @ApiOperation({
    summary: '根据动作获取权限',
    description: '根据动作获取相关权限列表',
  })
  @ApiQuery({
    name: 'action',
    description: '动作名称',
    example: 'read',
  })
  @ApiResponse({
    status: 200,
    description: '权限列表获取成功',
    type: [PermissionResponseDto],
  })
  async findByAction(@Query('action') action: string): Promise<PermissionResponseDto[]> {
    return await this.permissionService.findByAction(action);
  }

  @Get('by-resource')
  @ApiOperation({
    summary: '根据资源获取权限',
    description: '根据资源获取相关权限列表',
  })
  @ApiQuery({
    name: 'resource',
    description: '资源名称',
    example: 'user',
  })
  @ApiResponse({
    status: 200,
    description: '权限列表获取成功',
    type: [PermissionResponseDto],
  })
  async findByResource(@Query('resource') resource: string): Promise<PermissionResponseDto[]> {
    return await this.permissionService.findByResource(resource);
  }

  @Get('detail')
  @ApiOperation({
    summary: '获取权限详情',
    description: '根据权限ID获取权限详细信息',
  })
  @ApiQuery({
    name: 'id',
    description: '权限ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: '权限详情获取成功',
    type: PermissionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '权限不存在',
  })
  async findById(@Query('id') id: string): Promise<PermissionResponseDto> {
    return await this.permissionService.findById(id);
  }

  @Put()
  @ApiOperation({
    summary: '更新权限',
    description: '更新权限信息',
  })
  @ApiBody({ type: UpdatePermissionDto })
  @ApiResponse({
    status: 200,
    description: '权限更新成功',
    type: PermissionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '权限不存在',
  })
  @ApiResponse({
    status: 409,
    description: '权限名称或动作-资源组合已存在',
  })
  async update(@Body() updatePermissionDto: UpdatePermissionDto): Promise<PermissionResponseDto> {
    return await this.permissionService.update(updatePermissionDto.id, updatePermissionDto);
  }

  @Delete()
  @ApiOperation({
    summary: '删除权限',
    description: '删除权限，如果权限已分配给角色则无法删除',
  })
  @ApiQuery({
    name: 'id',
    description: '权限ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: '权限删除成功',
  })
  @ApiResponse({
    status: 404,
    description: '权限不存在',
  })
  @ApiResponse({
    status: 409,
    description: '权限已分配给角色，无法删除',
  })
  async delete(@Query('id') id: string): Promise<{ message: string }> {
    await this.permissionService.delete(id);
    return { message: '权限删除成功' };
  }
}
