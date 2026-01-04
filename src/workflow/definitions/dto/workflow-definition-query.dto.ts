import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { WorkflowDefinitionStatus } from '../entities/workflow-definition.entity';

export class WorkflowDefinitionQueryDto {
  @ApiPropertyOptional({ description: '页码', example: 1, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', example: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: '流程名称关键字搜索' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: '流程状态过滤',
    enum: WorkflowDefinitionStatus,
    example: WorkflowDefinitionStatus.PUBLISHED,
  })
  @IsOptional()
  @IsEnum(WorkflowDefinitionStatus)
  status?: WorkflowDefinitionStatus;

  @ApiPropertyOptional({ description: '创建者ID过滤' })
  @IsOptional()
  @IsString()
  createdBy?: string;
}
