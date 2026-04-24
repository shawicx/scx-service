import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsString,
  Matches,
} from 'class-validator';

export class ToggleUserStatusDto {
  @ApiProperty({
    description: '要切换状态的用户ID列表（支持批量）',
    example: ['01ARZ3NDEKTSV4RRFFQ69G5FAV'],
    type: [String],
  })
  @IsArray({ message: '用户ID列表必须是数组' })
  @ArrayNotEmpty({ message: '用户ID列表不能为空' })
  @ArrayMaxSize(50, { message: '最多一次操作50个用户' })
  @IsString({ each: true, message: '用户ID必须是字符串' })
  @Matches(/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i, { each: true, message: '用户ID必须是有效的ULID' })
  userIds: string[];

  @ApiProperty({
    description: '目标状态',
    example: false,
  })
  @IsBoolean({ message: '目标状态必须是布尔值' })
  isActive: boolean;
}
