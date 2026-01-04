import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsNotEmpty, IsArray } from 'class-validator';

export class CompleteTaskDto {
  @ApiPropertyOptional({ description: '完成备注', example: '审批通过，同意申请' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({
    description: '完成时设置的变量',
    example: {
      approved: true,
      approverComment: '符合公司政策，批准申请',
      nextApprover: 'manager-456',
    },
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  @ApiPropertyOptional({
    description: '表单数据',
    example: {
      decision: 'approve',
      reason: '符合申请条件',
    },
  })
  @IsOptional()
  @IsObject()
  formData?: Record<string, any>;
}

export class ClaimTaskDto {
  @ApiPropertyOptional({ description: '认领备注' })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class DelegateTaskDto {
  @ApiProperty({ description: '委派给的用户ID', example: 'user-789' })
  @IsString()
  @IsNotEmpty()
  delegateToUserId: string;

  @ApiPropertyOptional({ description: '委派原因', example: '临时出差，委派给同事处理' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ReassignTaskDto {
  @ApiProperty({ description: '重新分配给的用户ID', example: 'user-456' })
  @IsString()
  @IsNotEmpty()
  assigneeId: string;

  @ApiPropertyOptional({ description: '重新分配原因', example: '原处理人离职，重新分配' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AddCandidatesDto {
  @ApiPropertyOptional({ description: '候选用户ID列表', example: ['user-123', 'user-456'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];

  @ApiPropertyOptional({ description: '候选用户组列表', example: ['group-managers', 'group-hr'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groupIds?: string[];
}

export class TaskCommentDto {
  @ApiProperty({ description: '评论内容', example: '需要补充更多资料' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: '是否为内部评论（不对申请人可见）', example: false })
  @IsOptional()
  isInternal?: boolean = false;
}

export class BulkTaskActionDto {
  @ApiProperty({ description: '任务ID列表', example: ['task-1', 'task-2', 'task-3'] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  taskIds: string[];

  @ApiProperty({ description: '操作类型', enum: ['complete', 'claim', 'cancel'] })
  @IsString()
  @IsNotEmpty()
  action: 'complete' | 'claim' | 'cancel';

  @ApiPropertyOptional({ description: '操作参数' })
  @IsOptional()
  @IsObject()
  params?: Record<string, any>;
}
