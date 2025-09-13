import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    description: '角色名称',
    example: 'Administrator',
    minLength: 2,
    maxLength: 50,
  })
  @IsString({ message: '角色名称必须是字符串' })
  @IsNotEmpty({ message: '角色名称不能为空' })
  @Length(2, 50, { message: '角色名称长度必须在2-50个字符之间' })
  name: string;

  @ApiProperty({
    description: '角色代码，用于程序中识别角色',
    example: 'ROLE_ADMIN',
    minLength: 2,
    maxLength: 50,
  })
  @IsString({ message: '角色代码必须是字符串' })
  @IsNotEmpty({ message: '角色代码不能为空' })
  @Length(2, 50, { message: '角色代码长度必须在2-50个字符之间' })
  code: string;

  @ApiProperty({
    description: '角色描述',
    example: '系统管理员，拥有所有权限',
    required: false,
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: '角色描述必须是字符串' })
  @Length(0, 255, { message: '角色描述不能超过255个字符' })
  description?: string;

  @ApiProperty({
    description: '是否为系统内置角色',
    example: false,
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isSystem必须是布尔值' })
  isSystem?: boolean;
}

export class UpdateRoleDto {
  @ApiProperty({
    description: '角色ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString({ message: '角色ID必须是字符串' })
  @IsNotEmpty({ message: '角色ID不能为空' })
  id: string;

  @ApiProperty({
    description: '角色名称',
    example: 'Administrator',
    minLength: 2,
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString({ message: '角色名称必须是字符串' })
  @Length(2, 50, { message: '角色名称长度必须在2-50个字符之间' })
  name?: string;

  @ApiProperty({
    description: '角色代码，用于程序中识别角色',
    example: 'ROLE_ADMIN',
    minLength: 2,
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString({ message: '角色代码必须是字符串' })
  @Length(2, 50, { message: '角色代码长度必须在2-50个字符之间' })
  code?: string;

  @ApiProperty({
    description: '角色描述',
    example: '系统管理员，拥有所有权限',
    required: false,
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: '角色描述必须是字符串' })
  @Length(0, 255, { message: '角色描述不能超过255个字符' })
  description?: string;

  @ApiProperty({
    description: '是否为系统内置角色',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isSystem必须是布尔值' })
  isSystem?: boolean;
}

export class RoleResponseDto {
  @ApiProperty({
    description: '角色ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: '角色名称',
    example: 'Administrator',
  })
  name: string;

  @ApiProperty({
    description: '角色代码',
    example: 'ROLE_ADMIN',
  })
  code: string;

  @ApiProperty({
    description: '角色描述',
    example: '系统管理员，拥有所有权限',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: '是否为系统内置角色',
    example: false,
  })
  isSystem: boolean;

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

  constructor(partial: Partial<RoleResponseDto>) {
    Object.assign(this, partial);
  }
}

export class AssignPermissionsDto {
  @ApiProperty({
    description: '角色ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString({ message: '角色ID必须是字符串' })
  @IsNotEmpty({ message: '角色ID不能为空' })
  id: string;

  @ApiProperty({
    description: '权限ID列表',
    example: ['perm-id-1', 'perm-id-2'],
    type: [String],
  })
  @IsNotEmpty({ message: '权限ID列表不能为空' })
  @IsString({ each: true, message: '权限ID必须是字符串' })
  permissionIds: string[];
}
