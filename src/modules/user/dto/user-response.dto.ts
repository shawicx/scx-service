import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';
import { UserPreferences } from '../entities/user.entity';

export class UserResponseDto {
  @ApiProperty({
    description: '用户ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: '用户邮箱',
    example: 'user@example.com',
  })
  @Expose()
  email: string;

  @ApiProperty({
    description: '用户名称',
    example: '张三',
  })
  @Expose()
  name: string;

  @ApiProperty({
    description: '邮箱是否已验证',
    example: true,
  })
  @Expose()
  emailVerified: boolean;

  @ApiProperty({
    description: '用户偏好设置',
    example: {
      theme: 'light',
      language: 'zh-CN',
      timezone: 'Asia/Shanghai',
      notifications: {
        email: true,
        push: true,
        sms: false,
      },
      privacy: {
        profileVisible: true,
        showEmail: false,
        showLastSeen: true,
      },
    },
  })
  @Expose()
  preferences: UserPreferences;

  @ApiProperty({
    description: '最后登录IP',
    example: '192.168.1.1',
  })
  @Expose()
  lastLoginIp: string;

  @ApiProperty({
    description: '最后登录时间',
    example: '2023-12-01T10:00:00Z',
  })
  @Expose()
  @Transform(({ value }) => value?.toISOString())
  lastLoginAt: Date;

  @ApiProperty({
    description: '登录次数',
    example: 10,
  })
  @Expose()
  loginCount: number;

  @ApiProperty({
    description: '账户是否激活',
    example: true,
  })
  @Expose()
  isActive: boolean;

  @ApiProperty({
    description: '创建时间',
    example: '2023-11-01T10:00:00Z',
  })
  @Expose()
  @Transform(({ value }) => value?.toISOString())
  createdAt: Date;

  @ApiProperty({
    description: '更新时间',
    example: '2023-12-01T10:00:00Z',
  })
  @Expose()
  @Transform(({ value }) => value?.toISOString())
  updatedAt: Date;

  // 排除敏感字段
  @Exclude()
  password: string;

  @Exclude()
  emailVerificationCode: string;

  @Exclude()
  emailVerificationExpiry: Date;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
