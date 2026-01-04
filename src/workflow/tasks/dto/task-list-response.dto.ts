import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkflowTaskStatus, WorkflowTaskType } from '@/workflow/instances/enums/task-status.enum';

export class TaskSummaryDto {
  @ApiProperty({ description: '任务ID' })
  id: string;

  @ApiProperty({ description: '任务名称' })
  nodeName: string;

  @ApiProperty({ description: '任务类型', enum: WorkflowTaskType })
  type: WorkflowTaskType;

  @ApiProperty({ description: '任务状态', enum: WorkflowTaskStatus })
  status: WorkflowTaskStatus;

  @ApiPropertyOptional({ description: '任务描述' })
  description?: string;

  @ApiProperty({ description: '优先级' })
  priority: number;

  @ApiPropertyOptional({ description: '截止时间' })
  dueDate?: Date;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiPropertyOptional({ description: '开始时间' })
  startedAt?: Date;

  @ApiPropertyOptional({ description: '分配给的用户ID' })
  assigneeId?: string;

  @ApiProperty({ description: '候选用户列表' })
  candidateUsers: string[];

  @ApiProperty({ description: '候选用户组列表' })
  candidateGroups: string[];

  @ApiProperty({ description: '流程实例信息' })
  instance: {
    id: string;
    businessKey?: string;
    definitionName: string;
    startedBy: string;
    startTime: Date;
  };

  @ApiPropertyOptional({ description: '分配用户信息' })
  assignee?: {
    id: string;
    email: string;
  };

  @ApiPropertyOptional({ description: '是否逾期' })
  isOverdue?: boolean;

  @ApiPropertyOptional({ description: '剩余时间（小时）' })
  remainingHours?: number;
}

export class TaskDetailDto extends TaskSummaryDto {
  @ApiProperty({ description: '节点ID' })
  nodeId: string;

  @ApiPropertyOptional({ description: '表单Key' })
  formKey?: string;

  @ApiProperty({ description: '表单数据' })
  formData: Record<string, any>;

  @ApiProperty({ description: '任务变量' })
  taskVariables: Record<string, any>;

  @ApiPropertyOptional({ description: '完成时间' })
  completedAt?: Date;

  @ApiPropertyOptional({ description: '持续时间（毫秒）' })
  durationMs?: number;

  @ApiPropertyOptional({ description: '完成者信息' })
  completer?: {
    id: string;
    email: string;
  };

  @ApiPropertyOptional({ description: '完成备注' })
  completionComment?: string;

  @ApiProperty({ description: '执行上下文' })
  executionContext: Record<string, any>;

  @ApiProperty({ description: '评论数量' })
  commentCount: number;

  @ApiProperty({ description: '委派历史' })
  delegationHistory: Array<{
    fromUserId: string;
    toUserId: string;
    reason?: string;
    createdAt: Date;
    fromUserEmail: string;
    toUserEmail: string;
  }>;
}

export class PaginatedTaskListDto {
  @ApiProperty({ description: '任务列表', type: [TaskSummaryDto] })
  data: TaskSummaryDto[];

  @ApiProperty({ description: '总数量' })
  total: number;

  @ApiProperty({ description: '当前页码' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  limit: number;

  @ApiProperty({ description: '总页数' })
  totalPages: number;

  @ApiProperty({ description: '统计信息' })
  statistics: {
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
    highPriority: number;
  };
}
