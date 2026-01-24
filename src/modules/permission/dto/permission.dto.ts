import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Length, Min } from 'class-validator';
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
    description: '操作动作',
    example: 'read',
    minLength: 2,
    maxLength: 50,
  })
  @IsString({ message: '操作动作必须是字符串' })
  @IsNotEmpty({ message: '操作动作不能为空' })
  @Length(2, 50, { message: '操作动作长度必须在2-50个字符之间' })
  action: string;

  @ApiProperty({
    description: '资源名称',
    example: 'user',
    minLength: 2,
    maxLength: 100,
  })
  @IsString({ message: '资源名称必须是字符串' })
  @IsNotEmpty({ message: '资源名称不能为空' })
  @Length(2, 100, { message: '资源名称长度必须在2-100个字符之间' })
  resource: string;

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
    description: '操作动作',
    example: 'read',
  })
  action: string;

  @ApiProperty({
    description: '资源名称',
    example: 'user',
  })
  resource: string;

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
}
