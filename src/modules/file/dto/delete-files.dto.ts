import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class DeleteFilesDto {
  @ApiProperty({
    description: '要删除的文件 ID 列表',
    example: ['clxxxx123456', 'clxxxx789012'],
    type: [String],
  })
  @IsArray({ message: '文件 ID 列表必须是数组' })
  @ArrayMinSize(1, { message: '至少选择一个文件' })
  @IsString({ each: true, message: '文件 ID 必须是字符串' })
  ids: string[];
}
