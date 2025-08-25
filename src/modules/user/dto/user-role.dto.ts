import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({
    description: '角色ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString({ message: '角色ID必须是字符串' })
  @IsNotEmpty({ message: '角色ID不能为空' })
  roleId: string;
}

export class AssignRolesDto {
  @ApiProperty({
    description: '角色ID列表',
    example: ['role-id-1', 'role-id-2'],
    type: [String],
  })
  @IsNotEmpty({ message: '角色ID列表不能为空' })
  @IsString({ each: true, message: '角色ID必须是字符串' })
  roleIds: string[];
}

export class UserRoleResponseDto {
  @ApiProperty({
    description: '用户角色关系ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: '用户ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: '角色ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  roleId: string;

  @ApiProperty({
    description: '创建时间',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  constructor(partial: Partial<UserRoleResponseDto>) {
    Object.assign(this, partial);
  }
}
