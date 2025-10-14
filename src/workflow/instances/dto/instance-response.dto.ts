import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkflowInstanceStatus } from '../enums/instance-status.enum';
import { WorkflowTaskStatus, WorkflowTaskType } from '../enums/task-status.enum';

export class WorkflowTaskResponseDto {
  @ApiProperty({ description: '任务ID' })
  id: string;

  @ApiProperty({ description: '节点ID' })
  nodeId: string;

  @ApiProperty({ description: '节点名称' })
  nodeName: string;

  @ApiProperty({ description: '任务类型', enum: WorkflowTaskType })
  type: WorkflowTaskType;

  @ApiProperty({ description: '任务状态', enum: WorkflowTaskStatus })
  status: WorkflowTaskStatus;

  @ApiPropertyOptional({ description: '任务描述' })
  description?: string;

  @ApiPropertyOptional({ description: '分配给的用户ID' })
  assigneeId?: string;

  @ApiProperty({ description: '候选用户列表' })
  candidateUsers: string[];

  @ApiProperty({ description: '候选用户组列表' })
  candidateGroups: string[];

  @ApiPropertyOptional({ description: '表单Key' })
  formKey?: string;

  @ApiProperty({ description: '表单数据' })
  formData: Record<string, any>;

  @ApiProperty({ description: '任务变量' })
  taskVariables: Record<string, any>;

  @ApiPropertyOptional({ description: '截止时间' })
  dueDate?: Date;

  @ApiProperty({ description: '优先级' })
  priority: number;

  @ApiPropertyOptional({ description: '开始时间' })
  startedAt?: Date;

  @ApiPropertyOptional({ description: '完成时间' })
  completedAt?: Date;

  @ApiPropertyOptional({ description: '持续时间（毫秒）' })
  durationMs?: number;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiPropertyOptional({ description: '分配用户信息' })
  assignee?: {
    id: string;
    email: string;
  };

  @ApiPropertyOptional({ description: '完成用户信息' })
  completer?: {
    id: string;
    email: string;
  };
}

export class WorkflowInstanceResponseDto {
  @ApiProperty({ description: '实例ID' })
  id: string;

  @ApiProperty({ description: '流程定义ID' })
  definitionId: string;

  @ApiProperty({ description: '流程定义版本' })
  definitionVersion: number;

  @ApiPropertyOptional({ description: '业务关键字' })
  businessKey?: string;

  @ApiProperty({ description: '实例状态', enum: WorkflowInstanceStatus })
  status: WorkflowInstanceStatus;

  @ApiPropertyOptional({ description: '当前节点ID' })
  currentNodeId?: string;

  @ApiProperty({ description: '流程变量' })
  variables: Record<string, any>;

  @ApiProperty({
    description: '执行路径',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        nodeId: { type: 'string' },
        nodeName: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
        variables: { type: 'object' },
        result: { type: 'object' },
      },
    },
  })
  executionPath: Array<{
    nodeId: string;
    nodeName: string;
    timestamp: Date;
    variables?: Record<string, any>;
    result?: any;
  }>;

  @ApiProperty({ description: '启动者ID' })
  startedBy: string;

  @ApiProperty({ description: '开始时间' })
  startTime: Date;

  @ApiPropertyOptional({ description: '结束时间' })
  endTime?: Date;

  @ApiPropertyOptional({ description: '持续时间（毫秒）' })
  durationMs?: number;

  @ApiPropertyOptional({ description: '错误信息' })
  errorMessage?: string;

  @ApiProperty({ description: '优先级' })
  priority: number;

  @ApiPropertyOptional({ description: '父实例ID' })
  parentInstanceId?: string;

  @ApiPropertyOptional({ description: '根实例ID' })
  rootInstanceId?: string;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: '流程定义信息' })
  definition?: {
    id: string;
    name: string;
    version: number;
  };

  @ApiPropertyOptional({ description: '启动者信息' })
  starter?: {
    id: string;
    email: string;
  };

  @ApiPropertyOptional({ description: '任务列表' })
  tasks?: WorkflowTaskResponseDto[];
}

export class PaginatedInstanceResponseDto {
  @ApiProperty({ description: '实例列表', type: [WorkflowInstanceResponseDto] })
  data: WorkflowInstanceResponseDto[];

  @ApiProperty({ description: '总数量' })
  total: number;

  @ApiProperty({ description: '当前页码' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  limit: number;

  @ApiProperty({ description: '总页数' })
  totalPages: number;
}
