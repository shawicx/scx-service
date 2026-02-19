import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePermissionDto {
  @ApiProperty({
    description: '权限名称',
    example: '查看用户',
    minLength: 2,
    maxLength: 100,
  })
  @IsString({ message: '权限名称必须是字符串' })
  @IsNotEmpty({ message: '权限名称不能为空' })
  @Length(2, 100, { message: '权限名称长度必须在2-100个字符之间' })
  name: string;

  @ApiProperty({
    description: '权限类型',
    example: 'MENU',
    enum: ['MENU', 'BUTTON'],
  })
  @IsString({ message: '权限类型必须是字符串' })
  @IsIn(['MENU', 'BUTTON'], { message: '权限类型必须是MENU或BUTTON' })
  @IsNotEmpty({ message: '权限类型不能为空' })
  type: 'MENU' | 'BUTTON';

  @ApiProperty({
    description: '操作动作',
    example: 'read',
    minLength: 2,
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString({ message: '操作动作必须是字符串' })
  @Length(2, 50, { message: '操作动作长度必须在2-50个字符之间' })
  action?: string;

  @ApiProperty({
    description: '资源名称',
    example: 'user',
    minLength: 2,
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString({ message: '资源名称必须是字符串' })
  @Length(2, 100, { message: '资源名称长度必须在2-100个字符之间' })
  resource?: string;

  @ApiProperty({
    description: '父权限ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '父权限ID必须是字符串' })
  parentId?: string | null;

  @ApiProperty({
    description: '路由路径（菜单用）',
    example: '/user',
    required: false,
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: '路由路径必须是字符串' })
  @Length(0, 200, { message: '路由路径不能超过200个字符' })
  path?: string;

  @ApiProperty({
    description: '图标（菜单用）',
    example: 'UserOutlined',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: '图标必须是字符串' })
  @Length(0, 100, { message: '图标不能超过100个字符' })
  icon?: string;

  @ApiProperty({
    description: '排序号',
    example: 0,
    required: false,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '排序号必须是整数' })
  @Min(0, { message: '排序号不能小于0' })
  sort?: number;

  @ApiProperty({
    description: '是否可见',
    example: 1,
    required: false,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '是否可见必须是整数' })
  @Min(0, { message: '是否可见只能是0或1' })
  @Max(1, { message: '是否可见只能是0或1' })
  visible?: number;

  @ApiProperty({
    description: '状态',
    example: 1,
    required: false,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '状态必须是整数' })
  @Min(0, { message: '状态只能是0或1' })
  @Max(1, { message: '状态只能是0或1' })
  status?: number;

  @ApiProperty({
    description: '权限描述',
    example: '允许查看系统中的用户信息',
    required: false,
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: '权限描述必须是字符串' })
  @Length(0, 255, { message: '权限描述不能超过255个字符' })
  description?: string;
}

export class UpdatePermissionDto {
  @ApiProperty({
    description: '权限ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString({ message: '权限ID必须是字符串' })
  @IsNotEmpty({ message: '权限ID不能为空' })
  id: string;

  @ApiProperty({
    description: '权限名称',
    example: '查看用户',
    minLength: 2,
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString({ message: '权限名称必须是字符串' })
  @Length(2, 100, { message: '权限名称长度必须在2-100个字符之间' })
  name?: string;

  @ApiProperty({
    description: '权限类型',
    example: 'MENU',
    enum: ['MENU', 'BUTTON'],
    required: false,
  })
  @IsOptional()
  @IsString({ message: '权限类型必须是字符串' })
  @IsIn(['MENU', 'BUTTON'], { message: '权限类型必须是MENU或BUTTON' })
  type?: 'MENU' | 'BUTTON';

  @ApiProperty({
    description: '操作动作',
    example: 'read',
    minLength: 2,
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString({ message: '操作动作必须是字符串' })
  @Length(2, 50, { message: '操作动作长度必须在2-50个字符之间' })
  action?: string;

  @ApiProperty({
    description: '资源名称',
    example: 'user',
    minLength: 2,
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString({ message: '资源名称必须是字符串' })
  @Length(2, 100, { message: '资源名称长度必须在2-100个字符之间' })
  resource?: string;

  @ApiProperty({
    description: '父权限ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '父权限ID必须是字符串' })
  parentId?: string | null;

  @ApiProperty({
    description: '路由路径（菜单用）',
    example: '/user',
    required: false,
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: '路由路径必须是字符串' })
  @Length(0, 200, { message: '路由路径不能超过200个字符' })
  path?: string;

  @ApiProperty({
    description: '图标（菜单用）',
    example: 'UserOutlined',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: '图标必须是字符串' })
  @Length(0, 100, { message: '图标不能超过100个字符' })
  icon?: string;

  @ApiProperty({
    description: '排序号',
    example: 0,
    required: false,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '排序号必须是整数' })
  @Min(0, { message: '排序号不能小于0' })
  sort?: number;

  @ApiProperty({
    description: '是否可见',
    example: 1,
    required: false,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '是否可见必须是整数' })
  @Min(0, { message: '是否可见只能是0或1' })
  @Max(1, { message: '是否可见只能是0或1' })
  visible?: number;

  @ApiProperty({
    description: '状态',
    example: 1,
    required: false,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '状态必须是整数' })
  @Min(0, { message: '状态只能是0或1' })
  @Max(1, { message: '状态只能是0或1' })
  status?: number;

  @ApiProperty({
    description: '权限描述',
    example: '允许查看系统中的用户信息',
    required: false,
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: '权限描述必须是字符串' })
  @Length(0, 255, { message: '权限描述不能超过255个字符' })
  description?: string;

  @ApiProperty({
    description: '层级（自动计算）',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '层级必须是整数' })
  level?: number;
}

export class PermissionResponseDto {
  @ApiProperty({
    description: '权限ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: '权限名称',
    example: '查看用户',
  })
  name: string;

  @ApiProperty({
    description: '权限类型',
    example: 'MENU',
    enum: ['MENU', 'BUTTON'],
  })
  type: 'MENU' | 'BUTTON';

  @ApiProperty({
    description: '操作动作',
    example: 'read',
    nullable: true,
  })
  action: string | null;

  @ApiProperty({
    description: '资源名称',
    example: 'user',
    nullable: true,
  })
  resource: string | null;

  @ApiProperty({
    description: '父权限ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  parentId: string | null;

  @ApiProperty({
    description: '层级',
    example: 1,
  })
  level: number;

  @ApiProperty({
    description: '路由路径（菜单用）',
    example: '/user',
    nullable: true,
  })
  path: string | null;

  @ApiProperty({
    description: '图标（菜单用）',
    example: 'UserOutlined',
    nullable: true,
  })
  icon: string | null;

  @ApiProperty({
    description: '排序号',
    example: 0,
  })
  sort: number;

  @ApiProperty({
    description: '是否可见',
    example: 1,
  })
  visible: number;

  @ApiProperty({
    description: '状态',
    example: 1,
  })
  status: number;

  @ApiProperty({
    description: '权限描述',
    example: '允许查看系统中的用户信息',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: '创建时间',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '更新时间',
    example: '2023-01-01T00:00:00.000Z',
  })
  updatedAt: Date;

  constructor(partial: Partial<PermissionResponseDto>) {
    Object.assign(this, partial);
  }
}

export class PermissionQueryDto {
  @ApiProperty({
    description: '页码',
    example: 1,
    required: false,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码必须大于0' })
  page?: number = 1;

  @ApiProperty({
    description: '每页数量',
    example: 10,
    required: false,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量必须大于0' })
  limit?: number = 10;

  @ApiProperty({
    description: '搜索关键词（权限名称、动作或资源）',
    example: 'user',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '搜索关键词必须是字符串' })
  search?: string;

  @ApiProperty({
    description: '按动作筛选',
    example: 'read',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '动作筛选必须是字符串' })
  action?: string;

  @ApiProperty({
    description: '按资源筛选',
    example: 'user',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '资源筛选必须是字符串' })
  resource?: string;

  @ApiProperty({
    description: '按类型筛选',
    example: 'MENU',
    enum: ['MENU', 'BUTTON'],
    required: false,
  })
  @IsOptional()
  @IsString({ message: '类型筛选必须是字符串' })
  @IsIn(['MENU', 'BUTTON'], { message: '类型筛选只能是MENU或BUTTON' })
  type?: 'MENU' | 'BUTTON';

  @ApiProperty({
    description: '按父权限ID筛选',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '父权限ID筛选必须是字符串' })
  parentId?: string;

  @ApiProperty({
    description: '按层级筛选',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '层级筛选必须是整数' })
  level?: number;
}

export class PermissionTreeResponseDto extends PermissionResponseDto {
  @ApiProperty({
    description: '子权限列表',
    type: [PermissionTreeResponseDto],
    nullable: true,
  })
  children?: PermissionTreeResponseDto[];
}

export class PermissionMenuTreeDto {
  @ApiProperty({
    description: '权限ID',
  })
  id: string;

  @ApiProperty({
    description: '权限名称',
  })
  name: string;

  @ApiProperty({
    description: '路由路径',
    nullable: true,
  })
  path: string | null;

  @ApiProperty({
    description: '图标',
    nullable: true,
  })
  icon: string | null;

  @ApiProperty({
    description: '子菜单列表',
    type: [PermissionMenuTreeDto],
    nullable: true,
  })
  children?: PermissionMenuTreeDto[];

  constructor(partial: Partial<PermissionMenuTreeDto>) {
    Object.assign(this, partial);
  }
}
