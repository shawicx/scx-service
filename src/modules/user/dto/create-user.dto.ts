import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class CreateUserDto {
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
    description: '是否启用',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: '启用状态必须是布尔值' })
  isActive?: boolean = true;

  @ApiProperty({
    description: '初始角色ID列表',
    example: ['role-id-1', 'role-id-2'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray({ message: '角色ID列表必须是数组' })
  @IsString({ each: true, message: '角色ID必须是字符串' })
  @ArrayMaxSize(10, { message: '最多分配10个角色' })
  roleIds?: string[];
}
