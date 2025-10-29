import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@/common/guards/auth.guard';
import { WorkflowInstanceService } from './workflow-instance.service';
import { CreateInstanceDto } from './dto/create-instance.dto';
import { InstanceQueryDto } from './dto/instance-query.dto';
import {
  WorkflowInstanceResponseDto,
  PaginatedInstanceResponseDto,
} from './dto/instance-response.dto';

@ApiTags('流程实例管理')
@ApiBearerAuth()
@Controller('workflow/instances')
@UseGuards(AuthGuard)
export class WorkflowInstanceController {
  constructor(private readonly instanceService: WorkflowInstanceService) {}

  @Post()
  @ApiOperation({ summary: '启动流程实例' })
  @ApiResponse({
    status: 201,
    description: '流程实例启动成功',
    type: WorkflowInstanceResponseDto,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 404, description: '流程定义不存在' })
  async startInstance(
    @Body() createInstanceDto: CreateInstanceDto,
    @Request() req: any,
  ): Promise<WorkflowInstanceResponseDto> {
    return this.instanceService.startInstance(createInstanceDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: '获取流程实例列表' })
  @ApiResponse({
    status: 200,
    description: '流程实例列表获取成功',
    type: PaginatedInstanceResponseDto,
  })
  async findAll(@Query() query: InstanceQueryDto): Promise<PaginatedInstanceResponseDto> {
    return this.instanceService.findAll(query);
  }

  @Get('statistics')
  @ApiOperation({ summary: '获取流程实例统计信息' })
  @ApiQuery({ name: 'definitionId', required: false, description: '流程定义ID过滤' })
  @ApiResponse({
    status: 200,
    description: '统计信息获取成功',
    schema: {
      type: 'object',
      additionalProperties: { type: 'number' },
    },
  })
  async getStatistics(
    @Query('definitionId') definitionId?: string,
  ): Promise<Record<string, number>> {
    return this.instanceService.getStatistics(definitionId);
  }

  @Get('business-key/:businessKey')
  @ApiOperation({ summary: '根据业务键查找流程实例' })
  @ApiParam({ name: 'businessKey', description: '业务关键字' })
  @ApiResponse({
    status: 200,
    description: '流程实例查找成功',
    type: [WorkflowInstanceResponseDto],
  })
  async findByBusinessKey(
    @Param('businessKey') businessKey: string,
  ): Promise<WorkflowInstanceResponseDto[]> {
    return this.instanceService.findByBusinessKey(businessKey);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取流程实例详情' })
  @ApiParam({ name: 'id', description: '流程实例ID' })
  @ApiQuery({
    name: 'includeVariables',
    required: false,
    type: Boolean,
    description: '是否包含变量数据',
  })
  @ApiQuery({
    name: 'includeTasks',
    required: false,
    type: Boolean,
    description: '是否包含任务数据',
  })
  @ApiResponse({
    status: 200,
    description: '流程实例详情获取成功',
    type: WorkflowInstanceResponseDto,
  })
  @ApiResponse({ status: 404, description: '流程实例不存在' })
  async findOne(
    @Param('id') id: string,
    @Query('includeVariables') includeVariables?: boolean,
    @Query('includeTasks') includeTasks?: boolean,
  ): Promise<WorkflowInstanceResponseDto> {
    return this.instanceService.findOne(id, includeVariables !== false, includeTasks !== false);
  }

  @Post(':id/suspend')
  @ApiOperation({ summary: '暂停流程实例' })
  @ApiParam({ name: 'id', description: '流程实例ID' })
  @ApiResponse({
    status: 200,
    description: '流程实例暂停成功',
    type: WorkflowInstanceResponseDto,
  })
  @ApiResponse({ status: 400, description: '流程实例状态不允许暂停' })
  @ApiResponse({ status: 404, description: '流程实例不存在' })
  async suspend(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Request() req: any,
  ): Promise<WorkflowInstanceResponseDto> {
    return this.instanceService.suspendInstance(id, req.user.id);
  }

  @Post(':id/resume')
  @ApiOperation({ summary: '恢复流程实例' })
  @ApiParam({ name: 'id', description: '流程实例ID' })
  @ApiResponse({
    status: 200,
    description: '流程实例恢复成功',
    type: WorkflowInstanceResponseDto,
  })
  @ApiResponse({ status: 400, description: '流程实例状态不允许恢复' })
  @ApiResponse({ status: 404, description: '流程实例不存在' })
  async resume(@Param('id') id: string, @Request() req: any): Promise<WorkflowInstanceResponseDto> {
    return this.instanceService.resumeInstance(id, req.user.id);
  }

  @Post(':id/terminate')
  @ApiOperation({ summary: '终止流程实例' })
  @ApiParam({ name: 'id', description: '流程实例ID' })
  @ApiResponse({
    status: 200,
    description: '流程实例终止成功',
    type: WorkflowInstanceResponseDto,
  })
  @ApiResponse({ status: 400, description: '流程实例状态不允许终止' })
  @ApiResponse({ status: 404, description: '流程实例不存在' })
  async terminate(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Request() req: any,
  ): Promise<WorkflowInstanceResponseDto> {
    return this.instanceService.terminateInstance(id, req.user.id, body.reason);
  }

  @Post(':id/retry')
  @ApiOperation({ summary: '重试失败的流程实例' })
  @ApiParam({ name: 'id', description: '流程实例ID' })
  @ApiResponse({
    status: 200,
    description: '流程实例重试成功',
    type: WorkflowInstanceResponseDto,
  })
  @ApiResponse({ status: 400, description: '只能重试错误状态的流程实例' })
  @ApiResponse({ status: 404, description: '流程实例不存在' })
  async retry(@Param('id') id: string, @Request() req: any): Promise<WorkflowInstanceResponseDto> {
    return this.instanceService.retryInstance(id, req.user.id);
  }

  @Put(':id/variables')
  @ApiOperation({ summary: '更新流程实例变量' })
  @ApiParam({ name: 'id', description: '流程实例ID' })
  @ApiResponse({
    status: 200,
    description: '流程变量更新成功',
    type: WorkflowInstanceResponseDto,
  })
  @ApiResponse({ status: 404, description: '流程实例不存在' })
  async updateVariables(
    @Param('id') id: string,
    @Body() variables: Record<string, any>,
    @Request() req: any,
  ): Promise<WorkflowInstanceResponseDto> {
    return this.instanceService.updateVariables(id, variables, req.user.id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: '获取流程实例执行历史' })
  @ApiParam({ name: 'id', description: '流程实例ID' })
  @ApiResponse({
    status: 200,
    description: '执行历史获取成功',
    schema: {
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
    },
  })
  @ApiResponse({ status: 404, description: '流程实例不存在' })
  async getExecutionHistory(@Param('id') id: string): Promise<any[]> {
    return this.instanceService.getExecutionHistory(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除流程实例' })
  @ApiParam({ name: 'id', description: '流程实例ID' })
  @ApiResponse({ status: 200, description: '流程实例删除成功' })
  @ApiResponse({ status: 400, description: '不能删除运行中的流程实例' })
  @ApiResponse({ status: 404, description: '流程实例不存在' })
  async remove(@Param('id') id: string, @Request() req: any): Promise<{ message: string }> {
    await this.instanceService.deleteInstance(id, req.user.id);
    return { message: '流程实例删除成功' };
  }
}
