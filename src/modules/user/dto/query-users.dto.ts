import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class QueryUsersDto {
  @ApiProperty({
    description: '页码',
    example: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: '页码必须是数字' })
  page?: number = 1;

  @ApiProperty({
    description: '每页数量',
    example: 10,
    default: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: '每页数量必须是数字' })
  limit?: number = 10;

  @ApiProperty({
    description: '搜索关键词（邮箱或姓名）',
    example: 'john@example.com',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '搜索关键词必须是字符串' })
  search?: string;

  @ApiProperty({
    description: '启用状态筛选',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: '启用状态必须是布尔值' })
  isActive?: boolean;

  @ApiProperty({
    description: '排序字段',
    example: 'createdAt',
    enum: ['createdAt', 'updatedAt', 'name', 'email'],
    required: false,
  })
  @IsOptional()
  @IsString({ message: '排序字段必须是字符串' })
  sortBy?: string = 'createdAt';

  @ApiProperty({
    description: '排序方向',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    required: false,
  })
  @IsOptional()
  @IsString({ message: '排序方向必须是字符串' })
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
