import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CreatePermissionDto,
  PermissionMenuTreeDto,
  PermissionQueryDto,
  PermissionResponseDto,
  PermissionTreeResponseDto,
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
    description: '创建新的权限，支持菜单和按钮类型',
  })
  @ApiBody({ type: CreatePermissionDto })
  @ApiResponse({
    status: 201,
    description: '权限创建成功',
    type: PermissionResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: '权限名称已存在',
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
  @ApiQuery({
    name: 'type',
    required: false,
    description: '按类型筛选（MENU/BUTTON）',
    example: 'MENU',
  })
  @ApiQuery({
    name: 'parentId',
    required: false,
    description: '按父权限ID筛选',
  })
  @ApiQuery({
    name: 'level',
    required: false,
    description: '按层级筛选',
    example: 1,
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
    @Query() queryDto: PermissionQueryDto,
  ): Promise<{ permissions: PermissionResponseDto[]; total: number }> {
    const { page = 1, limit = 10, ...filters } = queryDto;
    return await this.permissionService.findAll(filters, page, limit);
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
    description: '权限名称已存在',
  })
  async update(@Body() updatePermissionDto: UpdatePermissionDto): Promise<PermissionResponseDto> {
    return await this.permissionService.update(updatePermissionDto.id, updatePermissionDto);
  }

  @Get('tree')
  @ApiOperation({
    summary: '获取权限树',
    description: '获取完整的权限树形结构',
  })
  @ApiResponse({
    status: 200,
    description: '权限树获取成功',
    type: [PermissionTreeResponseDto],
  })
  async getTree(): Promise<PermissionTreeResponseDto[]> {
    return await this.permissionService.getTree();
  }

  @Get('menu-tree')
  @ApiOperation({
    summary: '获取菜单树',
    description: '获取菜单树形结构（不含按钮）',
  })
  @ApiResponse({
    status: 200,
    description: '菜单树获取成功',
    type: [PermissionMenuTreeDto],
  })
  async getMenuTree(): Promise<PermissionMenuTreeDto[]> {
    return await this.permissionService.getMenuTree();
  }

  @Get('level-1')
  @ApiOperation({
    summary: '获取一级菜单',
    description: '获取所有一级菜单',
  })
  @ApiResponse({
    status: 200,
    description: '一级菜单列表获取成功',
    type: [PermissionResponseDto],
  })
  async getFirstLevelMenus(): Promise<PermissionResponseDto[]> {
    return await this.permissionService.getFirstLevelMenus();
  }

  @Get('by-level')
  @ApiOperation({
    summary: '按层级获取权限',
    description: '根据层级获取权限列表',
  })
  @ApiQuery({
    name: 'level',
    description: '层级（0-3）',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: '权限列表获取成功',
    type: [PermissionResponseDto],
  })
  async getByLevel(@Query('level') level: string): Promise<PermissionResponseDto[]> {
    return await this.permissionService.getByLevel(+level);
  }

  @Get(':menuId/buttons')
  @ApiOperation({
    summary: '获取菜单下的按钮',
    description: '获取指定菜单下的所有按钮',
  })
  @ApiQuery({
    name: 'menuId',
    description: '菜单ID',
  })
  @ApiResponse({
    status: 200,
    description: '按钮列表获取成功',
    type: [PermissionResponseDto],
  })
  async getButtonsByMenuId(@Param('menuId') menuId: string): Promise<PermissionResponseDto[]> {
    return await this.permissionService.getButtonsByMenuId(menuId);
  }

  @Delete()
  @ApiOperation({
    summary: '删除权限',
    description: '删除权限及其子权限，如果权限已分配给角色则无法删除',
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
    await this.permissionService.deleteCascade(id);
    return { message: '权限删除成功' };
  }
}
