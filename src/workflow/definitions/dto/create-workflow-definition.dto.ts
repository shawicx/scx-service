import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject, IsOptional, MaxLength } from 'class-validator';

export class CreateWorkflowDefinitionDto {
  @ApiProperty({ description: '流程定义名称', example: '请假审批流程' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: '流程定义描述',
    example: '员工请假审批流程，包含申请、主管审批、HR备案等环节',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: '流程定义JSON，包含节点、连线、配置等信息',
    example: {
      nodes: [
        { id: 'start', type: 'start', name: '开始' },
        { id: 'task1', type: 'userTask', name: '申请请假' },
        { id: 'end', type: 'end', name: '结束' },
      ],
      edges: [
        { source: 'start', target: 'task1' },
        { source: 'task1', target: 'end' },
      ],
    },
  })
  @IsObject()
  @IsNotEmpty()
  definition: any;
}
