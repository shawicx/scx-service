import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class UserListItemDto {
  @ApiProperty({
    description: '用户ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: '用户邮箱',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: '用户名称',
    example: '张三',
  })
  name: string;

  @ApiProperty({
    description: '邮箱是否已验证',
    example: true,
  })
  emailVerified: boolean;

  @ApiProperty({
    description: '最后登录IP',
    example: '192.168.1.1',
  })
  lastLoginIp: string;

  @ApiProperty({
    description: '最后登录时间',
    example: '2023-12-01T10:00:00Z',
  })
  @Transform(({ value }) => value?.toISOString())
  lastLoginAt: Date;

  @ApiProperty({
    description: '登录次数',
    example: 10,
  })
  loginCount: number;

  @ApiProperty({
    description: '账户是否激活',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: '创建时间',
    example: '2023-11-01T10:00:00Z',
  })
  @Transform(({ value }) => value?.toISOString())
  createdAt: Date;

  @ApiProperty({
    description: '更新时间',
    example: '2023-12-01T10:00:00Z',
  })
  @Transform(({ value }) => value?.toISOString())
  updatedAt: Date;

  constructor(partial: Partial<UserListItemDto>) {
    Object.assign(this, partial);
  }
}

export class UserListResponseDto {
  @ApiProperty({
    description: '用户列表',
    type: [UserListItemDto],
  })
  users: UserListItemDto[];

  @ApiProperty({
    description: '总数',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: '当前页码',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: '每页数量',
    example: 10,
  })
  limit: number;

  constructor(partial: Partial<UserListResponseDto>) {
    Object.assign(this, partial);
  }
}
