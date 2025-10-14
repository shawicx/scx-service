import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@/common/guards/auth.guard';
import { WorkflowTaskService } from './workflow-task.service';
import { WorkflowTaskStatus } from './enums/task-status.enum';
import {
  CompleteTaskDto,
  ClaimTaskDto,
  DelegateTaskDto,
  ReassignTaskDto,
  AddCandidatesDto,
  BulkTaskActionDto,
} from './dto/task-action.dto';
import { WorkflowTaskResponseDto } from './dto/instance-response.dto';

@ApiTags('工作流任务管理')
@ApiBearerAuth()
@Controller('workflow/tasks')
@UseGuards(AuthGuard)
export class WorkflowTaskController {
  constructor(private readonly taskService: WorkflowTaskService) {}

  @Get()
  @ApiOperation({ summary: '获取任务列表' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: WorkflowTaskStatus,
    description: '任务状态过滤',
  })
  @ApiQuery({ name: 'assigneeId', required: false, type: String, description: '分配者ID过滤' })
  @ApiQuery({ name: 'instanceId', required: false, type: String, description: '流程实例ID过滤' })
  @ApiQuery({ name: 'definitionId', required: false, type: String, description: '流程定义ID过滤' })
  @ApiQuery({ name: 'search', required: false, type: String, description: '搜索关键字' })
  @ApiResponse({
    status: 200,
    description: '任务列表获取成功',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/WorkflowTaskResponseDto' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async findAll(@Query() query: any) {
    return this.taskService.findAll(query);
  }

  @Get('my-todo')
  @ApiOperation({ summary: '获取我的待办任务' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: WorkflowTaskStatus,
    description: '任务状态过滤',
  })
  @ApiResponse({
    status: 200,
    description: '待办任务获取成功',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/WorkflowTaskResponseDto' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async getMyTodoTasks(@Query() query: any, @Request() req: any) {
    return this.taskService.getUserTodoTasks(req.user.id, query);
  }

  @Get('my-completed')
  @ApiOperation({ summary: '获取我已完成的任务' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量' })
  @ApiResponse({
    status: 200,
    description: '已完成任务获取成功',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/WorkflowTaskResponseDto' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async getMyCompletedTasks(@Query() query: any, @Request() req: any) {
    return this.taskService.getUserCompletedTasks(req.user.id, query);
  }

  @Get('statistics')
  @ApiOperation({ summary: '获取任务统计信息' })
  @ApiQuery({ name: 'definitionId', required: false, type: String, description: '流程定义ID过滤' })
  @ApiResponse({
    status: 200,
    description: '任务统计信息获取成功',
    schema: {
      type: 'object',
      properties: {
        byStatus: { type: 'object', additionalProperties: { type: 'number' } },
        byPriority: { type: 'object', additionalProperties: { type: 'number' } },
        overdue: { type: 'number' },
        avgCompletionTime: { type: 'number' },
      },
    },
  })
  async getStatistics(@Query('definitionId') definitionId?: string, @Request() req?: any) {
    return this.taskService.getTaskStatistics(req?.user?.id, definitionId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取任务详情' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({
    status: 200,
    description: '任务详情获取成功',
    type: WorkflowTaskResponseDto,
  })
  @ApiResponse({ status: 404, description: '任务不存在' })
  async findOne(@Param('id') id: string): Promise<WorkflowTaskResponseDto> {
    return this.taskService.findOne(id);
  }

  @Post(':id/claim')
  @ApiOperation({ summary: '认领任务' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({
    status: 200,
    description: '任务认领成功',
    type: WorkflowTaskResponseDto,
  })
  @ApiResponse({ status: 400, description: '任务状态不允许认领或用户无权限' })
  @ApiResponse({ status: 404, description: '任务不存在' })
  async claimTask(
    @Param('id') id: string,
    @Body() claimDto: ClaimTaskDto,
    @Request() req: any,
  ): Promise<WorkflowTaskResponseDto> {
    return this.taskService.claimTask(id, req.user.id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: '完成任务' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({
    status: 200,
    description: '任务完成成功',
    type: WorkflowTaskResponseDto,
  })
  @ApiResponse({ status: 400, description: '任务状态不允许完成或用户无权限' })
  @ApiResponse({ status: 404, description: '任务不存在' })
  async completeTask(
    @Param('id') id: string,
    @Body() completeDto: CompleteTaskDto,
    @Request() req: any,
  ): Promise<WorkflowTaskResponseDto> {
    return this.taskService.completeTask(id, req.user.id, completeDto);
  }

  @Post(':id/delegate')
  @ApiOperation({ summary: '委派任务' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({
    status: 200,
    description: '任务委派成功',
    type: WorkflowTaskResponseDto,
  })
  @ApiResponse({ status: 400, description: '任务状态不允许委派或用户无权限' })
  @ApiResponse({ status: 404, description: '任务不存在' })
  async delegateTask(
    @Param('id') id: string,
    @Body() delegateDto: DelegateTaskDto,
    @Request() req: any,
  ): Promise<WorkflowTaskResponseDto> {
    return this.taskService.delegateTask(id, req.user.id, delegateDto);
  }

  @Put(':id/reassign')
  @ApiOperation({ summary: '重新分配任务' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({
    status: 200,
    description: '任务重新分配成功',
    type: WorkflowTaskResponseDto,
  })
  @ApiResponse({ status: 400, description: '任务状态不允许重新分配' })
  @ApiResponse({ status: 404, description: '任务不存在' })
  async reassignTask(
    @Param('id') id: string,
    @Body() reassignDto: ReassignTaskDto,
    @Request() req: any,
  ): Promise<WorkflowTaskResponseDto> {
    return this.taskService.reassignTask(id, reassignDto, req.user.id);
  }

  @Put(':id/candidates')
  @ApiOperation({ summary: '添加任务候选用户' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({
    status: 200,
    description: '候选用户添加成功',
    type: WorkflowTaskResponseDto,
  })
  @ApiResponse({ status: 400, description: '任务状态不允许添加候选用户' })
  @ApiResponse({ status: 404, description: '任务不存在' })
  async addCandidates(
    @Param('id') id: string,
    @Body() addCandidatesDto: AddCandidatesDto,
    @Request() req: any,
  ): Promise<WorkflowTaskResponseDto> {
    return this.taskService.addCandidates(id, addCandidatesDto, req.user.id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: '取消任务' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({
    status: 200,
    description: '任务取消成功',
    type: WorkflowTaskResponseDto,
  })
  @ApiResponse({ status: 400, description: '任务状态不允许取消' })
  @ApiResponse({ status: 404, description: '任务不存在' })
  async cancelTask(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Request() req: any,
  ): Promise<WorkflowTaskResponseDto> {
    return this.taskService.cancelTask(id, req.user.id, body.reason);
  }

  @Post('bulk-action')
  @ApiOperation({ summary: '批量操作任务' })
  @ApiResponse({
    status: 200,
    description: '批量操作完成',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'array', items: { type: 'string' } },
        failed: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              taskId: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async bulkAction(
    @Body() bulkActionDto: BulkTaskActionDto,
    @Request() req: any,
  ): Promise<{
    success: string[];
    failed: Array<{ taskId: string; error: string }>;
  }> {
    return this.taskService.bulkAction(bulkActionDto, req.user.id);
  }
}
