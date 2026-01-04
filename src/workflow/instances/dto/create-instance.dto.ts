import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreateInstanceDto {
  @ApiProperty({ description: '流程定义ID', example: 'def-123' })
  @IsString()
  @IsNotEmpty()
  definitionId: string;

  @ApiPropertyOptional({ description: '业务关键字，用于关联业务数据', example: 'LEAVE_001' })
  @IsOptional()
  @IsString()
  businessKey?: string;

  @ApiPropertyOptional({
    description: '初始流程变量',
    example: {
      applicant: 'user-123',
      department: 'IT',
      leaveType: 'annual',
      leaveDays: 3,
    },
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  @ApiPropertyOptional({ description: '流程优先级 (0-100)', example: 50, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  priority?: number;

  @ApiPropertyOptional({ description: '启动参数，传递给第一个任务', example: { autoAssign: true } })
  @IsOptional()
  @IsObject()
  startParams?: Record<string, any>;
}
