import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsInt, Min, Max, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { WorkflowInstanceStatus } from '../enums/instance-status.enum';

export class InstanceQueryDto {
  @ApiPropertyOptional({ description: '页码', example: 1, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', example: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: '流程定义ID过滤' })
  @IsOptional()
  @IsString()
  definitionId?: string;

  @ApiPropertyOptional({
    description: '实例状态过滤',
    enum: WorkflowInstanceStatus,
    example: WorkflowInstanceStatus.RUNNING,
  })
  @IsOptional()
  @IsEnum(WorkflowInstanceStatus)
  status?: WorkflowInstanceStatus;

  @ApiPropertyOptional({ description: '启动者ID过滤' })
  @IsOptional()
  @IsString()
  startedBy?: string;

  @ApiPropertyOptional({ description: '业务关键字搜索' })
  @IsOptional()
  @IsString()
  businessKey?: string;

  @ApiPropertyOptional({ description: '开始时间（起）', example: '2024-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startTimeFrom?: string;

  @ApiPropertyOptional({ description: '开始时间（止）', example: '2024-12-31T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  startTimeTo?: string;

  @ApiPropertyOptional({ description: '当前节点ID过滤' })
  @IsOptional()
  @IsString()
  currentNodeId?: string;

  @ApiPropertyOptional({ description: '是否包含变量数据', example: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  includeVariables?: boolean = false;

  @ApiPropertyOptional({ description: '是否包含任务数据', example: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  includeTasks?: boolean = false;
}
