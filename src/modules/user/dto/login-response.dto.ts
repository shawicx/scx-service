import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

export class LoginResponseDto {
  @ApiProperty({
    description: '用户ID',
    example: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: '邮箱地址',
    example: 'user@example.com',
  })
  @Expose()
  email: string;

  @ApiProperty({
    description: '用户名',
    example: 'John Doe',
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
  })
  @Expose()
  preferences: any;

  @ApiProperty({
    description: '上次登录时间',
    example: '2023-12-01T10:00:00Z',
  })
  @Expose()
  lastLoginAt: Date;

  @ApiProperty({
    description: '登录次数',
    example: 5,
  })
  @Expose()
  loginCount: number;

  @ApiProperty({
    description: '访问令牌',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @Expose()
  accessToken?: string;

  @ApiProperty({
    description: '刷新令牌',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @Expose()
  refreshToken?: string;

  @Exclude()
  password: string;

  @Exclude()
  emailVerificationCode: string;

  @Exclude()
  emailVerificationExpiry: Date;

  constructor(user: any, accessToken?: string, refreshToken?: string) {
    this.id = user.id;
    this.email = user.email;
    this.name = user.name;
    this.emailVerified = user.emailVerified;
    this.preferences = user.preferences;
    this.lastLoginAt = user.lastLoginAt;
    this.loginCount = user.loginCount;
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }
}
