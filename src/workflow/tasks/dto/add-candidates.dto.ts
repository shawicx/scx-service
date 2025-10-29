import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * 添加候选用户DTO
 */
export class AddCandidatesDto {
  @ApiPropertyOptional({
    description: '候选用户ID列表',
    example: ['user1-id', 'user2-id'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  userIds?: string[];

  @ApiPropertyOptional({
    description: '候选用户组ID列表',
    example: ['group1-id', 'group2-id'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  groupIds?: string[];

  @ApiPropertyOptional({
    description: '添加原因',
    example: '项目需要更多技术专家参与',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}