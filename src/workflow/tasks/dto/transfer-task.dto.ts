import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * 转移任务DTO
 */
export class TransferTaskDto {
  @ApiProperty({
    description: '目标用户ID',
    example: 'user-id-123',
  })
  @IsUUID('4')
  toUserId: string;

  @ApiPropertyOptional({
    description: '转移原因',
    example: '当前负责人临时有其他紧急任务',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: '是否发送通知',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  sendNotification?: boolean = true;
}