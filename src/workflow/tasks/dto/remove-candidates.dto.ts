import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * 移除候选用户DTO
 */
export class RemoveCandidatesDto {
  @ApiPropertyOptional({
    description: '要移除的候选用户ID列表',
    example: ['user1-id', 'user2-id'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  userIds?: string[];

  @ApiPropertyOptional({
    description: '要移除的候选用户组ID列表',
    example: ['group1-id', 'group2-id'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  groupIds?: string[];

  @ApiPropertyOptional({
    description: '移除原因',
    example: '用户不再负责此类任务',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}