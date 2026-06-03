import { ApiProperty } from '@nestjs/swagger';
import { FileResponseDto } from './file-response.dto';

export class FileListResponseDto {
  @ApiProperty({
    description: '文件列表',
    type: [FileResponseDto],
  })
  list: FileResponseDto[];

  @ApiProperty({
    description: '总数',
    example: 50,
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

  constructor(partial: Partial<FileListResponseDto>) {
    Object.assign(this, partial);
  }
}
