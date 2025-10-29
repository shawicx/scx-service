import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty, IsBoolean } from 'class-validator';

export class CreateTaskCommentDto {
  @ApiProperty({ description: '评论内容', example: '需要补充更多材料才能通过审批' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    description: '是否为内部评论（不对申请人可见）',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean = false;
}

export class UpdateTaskCommentDto {
  @ApiProperty({ description: '评论内容', example: '已补充相关材料，可以继续处理' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class TaskCommentResponseDto {
  @ApiProperty({ description: '评论ID' })
  id: string;

  @ApiProperty({ description: '任务ID' })
  taskId: string;

  @ApiProperty({ description: '评论内容' })
  content: string;

  @ApiProperty({ description: '是否为内部评论' })
  isInternal: boolean;

  @ApiProperty({ description: '创建者ID' })
  createdBy: string;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  @ApiProperty({ description: '创建者信息' })
  creator: {
    id: string;
    email: string;
  };
}

export class PaginatedTaskCommentDto {
  @ApiProperty({ description: '评论列表', type: [TaskCommentResponseDto] })
  data: TaskCommentResponseDto[];

  @ApiProperty({ description: '总数量' })
  total: number;

  @ApiProperty({ description: '当前页码' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  limit: number;

  @ApiProperty({ description: '总页数' })
  totalPages: number;
}
