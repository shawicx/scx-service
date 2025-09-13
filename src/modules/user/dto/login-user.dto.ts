/*
 * @Author: shawicx d35f3153@proton.me
 * @Description:
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginUserDto {
  @ApiProperty({
    description: '邮箱地址',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;

  @ApiProperty({
    description: '邮箱验证码',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString({ message: '验证码必须是字符串' })
  @MinLength(6, { message: '验证码长度为6位' })
  emailVerificationCode: string;
}

export class LoginWithPasswordDto {
  @ApiProperty({
    description: '邮箱地址',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;

  @ApiProperty({
    description: '密码',
    example: 'Password123!',
    minLength: 6,
  })
  @IsString({ message: '密码必须是字符串' })
  @MinLength(6, { message: '密码至少6位' })
  password: string;

  @ApiProperty({
    description: '加密密钥ID（必需，用于解密密码）',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString({ message: '密钥ID必须是字符串' })
  keyId: string;
}
