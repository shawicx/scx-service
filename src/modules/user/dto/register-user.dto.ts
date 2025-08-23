import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class RegisterUserDto {
  @ApiProperty({
    description: '用户邮箱',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email: string;

  @ApiProperty({
    description: '用户名称',
    example: '张三',
    minLength: 2,
    maxLength: 50,
  })
  @IsString({ message: '用户名称必须是字符串' })
  @IsNotEmpty({ message: '用户名称不能为空' })
  @Length(2, 50, { message: '用户名称长度必须在2-50个字符之间' })
  name: string;

  @ApiProperty({
    description: '密码',
    example: 'Password123!',
    minLength: 8,
    maxLength: 50,
  })
  @IsString({ message: '密码必须是字符串' })
  @IsNotEmpty({ message: '密码不能为空' })
  @Length(8, 50, { message: '密码长度必须在8-50个字符之间' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: '密码必须包含至少一个大写字母、一个小写字母、一个数字和一个特殊字符',
  })
  password: string;

  @ApiProperty({
    description: '邮箱验证码',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString({ message: '验证码必须是字符串' })
  @IsNotEmpty({ message: '验证码不能为空' })
  @Length(6, 6, { message: '验证码必须是6位数字' })
  @Matches(/^\d{6}$/, { message: '验证码必须是6位数字' })
  emailVerificationCode: string;
}
