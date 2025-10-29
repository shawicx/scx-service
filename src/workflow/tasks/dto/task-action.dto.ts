import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsNotEmpty, IsArray, IsBoolean } from 'class-validator';

export class ClaimTaskDto {
  @ApiPropertyOptional({ description: '认领备注', example: '我来处理这个任务' })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class CompleteTaskDto {
  @ApiPropertyOptional({ description: '完成备注', example: '审批通过，符合要求' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({
    description: '完成时设置的变量',
    example: {
      approved: true,
      approverComment: '符合公司政策',
      nextStep: 'manager_review',
    },
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  @ApiPropertyOptional({
    description: '表单数据',
    example: {
      decision: 'approve',
      amount: 5000,
      reason: '符合预算',
    },
  })
  @IsOptional()
  @IsObject()
  formData?: Record<string, any>;

  @ApiPropertyOptional({ description: '是否强制完成（跳过验证）', example: false })
  @IsOptional()
  @IsBoolean()
  forceComplete?: boolean = false;
}

export class DelegateTaskDto {
  @ApiProperty({ description: '委派给的用户ID', example: 'user-789' })
  @IsString()
  @IsNotEmpty()
  toUserId: string;

  @ApiPropertyOptional({ description: '委派原因', example: '临时出差，委派给同事处理' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: '是否保留原分配者权限', example: false })
  @IsOptional()
  @IsBoolean()
  keepOriginalAssignee?: boolean = false;
}

export class ReassignTaskDto {
  @ApiProperty({ description: '重新分配给的用户ID', example: 'user-456' })
  @IsString()
  @IsNotEmpty()
  assigneeId: string;

  @ApiPropertyOptional({ description: '重新分配原因', example: '原处理人离职' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AddCandidatesDto {
  @ApiPropertyOptional({
    description: '添加的候选用户ID列表',
    example: ['user-123', 'user-456'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];

  @ApiPropertyOptional({
    description: '添加的候选用户组ID列表',
    example: ['group-managers', 'group-hr'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groupIds?: string[];

  @ApiPropertyOptional({ description: '操作原因' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RemoveCandidatesDto {
  @ApiPropertyOptional({
    description: '移除的候选用户ID列表',
    example: ['user-123'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];

  @ApiPropertyOptional({
    description: '移除的候选用户组ID列表',
    example: ['group-temp'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groupIds?: string[];

  @ApiPropertyOptional({ description: '操作原因' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class TransferTaskDto {
  @ApiProperty({ description: '转移给的用户ID', example: 'user-999' })
  @IsString()
  @IsNotEmpty()
  toUserId: string;

  @ApiPropertyOptional({ description: '转移原因', example: '工作调整，转移给相关负责人' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: '是否发送通知', example: true })
  @IsOptional()
  @IsBoolean()
  sendNotification?: boolean = true;
}

export class BulkTaskActionDto {
  @ApiProperty({
    description: '任务ID列表',
    example: ['task-1', 'task-2', 'task-3'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  taskIds: string[];

  @ApiProperty({
    description: '批量操作类型',
    enum: ['claim', 'complete', 'delegate', 'reassign', 'cancel'],
    example: 'claim',
  })
  @IsString()
  @IsNotEmpty()
  action: 'claim' | 'complete' | 'delegate' | 'reassign' | 'cancel';

  @ApiPropertyOptional({ description: '操作参数' })
  @IsOptional()
  @IsObject()
  params?: Record<string, any>;

  @ApiPropertyOptional({ description: '批量操作备注' })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class SetPriorityDto {
  @ApiProperty({ description: '新的优先级', example: 80, minimum: 0, maximum: 100 })
  @IsNotEmpty()
  priority: number;

  @ApiPropertyOptional({ description: '优先级调整原因' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SetDueDateDto {
  @ApiPropertyOptional({ description: '新的截止时间', example: '2024-12-31T23:59:59.999Z' })
  @IsOptional()
  dueDate?: Date;

  @ApiPropertyOptional({ description: '截止时间调整原因' })
  @IsOptional()
  @IsString()
  reason?: string;
}
