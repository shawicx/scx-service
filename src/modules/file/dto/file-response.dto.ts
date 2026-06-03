import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';

export class FileResponseDto {
  @ApiProperty({
    description: '文件 ID',
    example: 'clxxxx123456',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: '上传者 ID',
    example: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
  })
  @Expose()
  userId: string;

  @ApiProperty({
    description: '原始文件名',
    example: 'report.pdf',
  })
  @Expose()
  originalName: string;

  @ApiProperty({
    description: 'MIME 类型',
    example: 'application/pdf',
  })
  @Expose()
  mimeType: string;

  @ApiProperty({
    description: '文件大小（字节）',
    example: 1024000,
  })
  @Expose()
  size: number;

  @ApiProperty({
    description: '存储路径',
    example: '/uploads/2026/06/clxxxx123456.pdf',
  })
  @Expose()
  path: string;

  @ApiProperty({
    description: '访问地址',
    example: '/api/files/static/2026/06/clxxxx123456.pdf',
  })
  @Expose()
  url: string;

  @ApiProperty({
    description: '创建时间',
    example: '2026-06-02T10:00:00.000Z',
  })
  @Expose()
  @Transform(({ value }) => value?.toISOString())
  createdAt: Date;

  @ApiProperty({
    description: '删除时间（软删除）',
    example: null,
    required: false,
  })
  @Expose()
  @Transform(({ value }) => value?.toISOString() ?? null)
  deletedAt: Date | null;

  constructor(partial: Partial<FileResponseDto>) {
    Object.assign(this, partial);
  }
}
