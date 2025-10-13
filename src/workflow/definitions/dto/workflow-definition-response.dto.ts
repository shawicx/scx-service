import { ApiProperty } from '@nestjs/swagger';
import { WorkflowDefinitionStatus } from '../entities/workflow-definition.entity';

export class WorkflowDefinitionResponseDto {
  @ApiProperty({ description: '流程定义ID' })
  id: string;

  @ApiProperty({ description: '流程定义名称' })
  name: string;

  @ApiProperty({ description: '流程定义描述' })
  description: string;

  @ApiProperty({ description: '流程定义JSON' })
  definition: any;

  @ApiProperty({ description: '版本号' })
  version: number;

  @ApiProperty({ description: '状态', enum: WorkflowDefinitionStatus })
  status: WorkflowDefinitionStatus;

  @ApiProperty({ description: '创建者ID' })
  createdBy: string;

  @ApiProperty({ description: '更新者ID' })
  updatedBy: string;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  @ApiProperty({ description: '创建者信息' })
  creator?: {
    id: string;
    email: string;
  };

  @ApiProperty({ description: '更新者信息' })
  updater?: {
    id: string;
    email: string;
  };
}

export class PaginatedWorkflowDefinitionResponseDto {
  @ApiProperty({ description: '流程定义列表', type: [WorkflowDefinitionResponseDto] })
  data: WorkflowDefinitionResponseDto[];

  @ApiProperty({ description: '总数量' })
  total: number;

  @ApiProperty({ description: '当前页码' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  limit: number;

  @ApiProperty({ description: '总页数' })
  totalPages: number;
}
