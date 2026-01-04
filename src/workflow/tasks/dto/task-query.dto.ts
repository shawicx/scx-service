import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsArray,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { WorkflowTaskStatus } from '@/workflow/instances/enums/task-status.enum';

export class TaskQueryDto {
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

  @ApiPropertyOptional({
    description: '任务状态过滤',
    enum: WorkflowTaskStatus,
    isArray: true,
    example: [WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(WorkflowTaskStatus, { each: true })
  statuses?: WorkflowTaskStatus[];

  @ApiPropertyOptional({ description: '分配给的用户ID' })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional({ description: '流程实例ID过滤' })
  @IsOptional()
  @IsString()
  instanceId?: string;

  @ApiPropertyOptional({ description: '流程定义ID过滤' })
  @IsOptional()
  @IsString()
  definitionId?: string;

  @ApiPropertyOptional({ description: '节点ID过滤' })
  @IsOptional()
  @IsString()
  nodeId?: string;

  @ApiPropertyOptional({ description: '任务名称搜索' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '优先级最小值', minimum: 0 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  priorityMin?: number;

  @ApiPropertyOptional({ description: '优先级最大值', maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Max(100)
  priorityMax?: number;

  @ApiPropertyOptional({ description: '截止时间开始', example: '2024-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dueDateFrom?: string;

  @ApiPropertyOptional({ description: '截止时间结束', example: '2024-12-31T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  dueDateTo?: string;

  @ApiPropertyOptional({ description: '创建时间开始', example: '2024-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional({ description: '创建时间结束', example: '2024-12-31T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  createdTo?: string;

  @ApiPropertyOptional({ description: '是否只查询我的任务', example: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  myTasks?: boolean = false;

  @ApiPropertyOptional({ description: '是否包含候选任务', example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  includeCandidateTasks?: boolean = true;

  @ApiPropertyOptional({ description: '是否逾期任务', example: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  overdue?: boolean;
}
