import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsString, IsUUID } from 'class-validator';

export class DeleteUsersDto {
  @ApiProperty({
    description: '要删除的用户ID列表（支持批量）',
    example: ['user-id-1', 'user-id-2'],
    type: [String],
  })
  @IsArray({ message: '用户ID列表必须是数组' })
  @ArrayNotEmpty({ message: '用户ID列表不能为空' })
  @ArrayMaxSize(50, { message: '最多一次删除50个用户' })
  @IsString({ each: true, message: '用户ID必须是字符串' })
  @IsUUID('4', { each: true, message: '用户ID必须是有效的UUID' })
  userIds: string[];
}
