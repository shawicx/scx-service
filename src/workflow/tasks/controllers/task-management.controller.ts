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
import { TaskManagementService } from '../services/task-management.service';
import { TaskQueryDto } from '../dto/task-query.dto';
import { TaskDetailDto, PaginatedTaskListDto } from '../dto/task-list-response.dto';
import {
  ClaimTaskDto,
  CompleteTaskDto,
  DelegateTaskDto,
  ReassignTaskDto,
  BulkTaskActionDto,
  SetPriorityDto,
  SetDueDateDto,
} from '../dto/task-action.dto';
import { AddCandidatesDto } from '../dto/add-candidates.dto';
import { RemoveCandidatesDto } from '../dto/remove-candidates.dto';
import { TransferTaskDto } from '../dto/transfer-task.dto';

/**
 * 任务管理控制器
 */
@ApiTags('任务管理')
@ApiBearerAuth()
@Controller('workflow/task-management')
@UseGuards(AuthGuard)
export class TaskManagementController {
  constructor(private readonly taskManagementService: TaskManagementService) {}

  @Get()
  @ApiOperation({ summary: '获取任务列表' })
  @ApiResponse({
    status: 200,
    description: '任务列表获取成功',
    type: PaginatedTaskListDto,
  })
  async findTasks(
    @Query() query: TaskQueryDto,
    @Request() req: any,
  ): Promise<PaginatedTaskListDto> {
    return this.taskManagementService.findTasks(query, req.user.id);
  }

  @Get('my-todo')
  @ApiOperation({ summary: '获取我的待办任务' })
  @ApiResponse({
    status: 200,
    description: '待办任务列表获取成功',
    type: PaginatedTaskListDto,
  })
  async getMyTodoTasks(
    @Query() query: Partial<TaskQueryDto>,
    @Request() req: any,
  ): Promise<PaginatedTaskListDto> {
    return this.taskManagementService.getMyTodoTasks(req.user.id, query);
  }

  @Get('my-completed')
  @ApiOperation({ summary: '获取我的已办任务' })
  @ApiResponse({
    status: 200,
    description: '已办任务列表获取成功',
    type: PaginatedTaskListDto,
  })
  async getMyCompletedTasks(
    @Query() query: Partial<TaskQueryDto>,
    @Request() req: any,
  ): Promise<PaginatedTaskListDto> {
    return this.taskManagementService.getMyCompletedTasks(req.user.id, query);
  }

  @Get('statistics')
  @ApiOperation({ summary: '获取任务统计信息' })
  @ApiQuery({ name: 'scope', required: false, enum: ['all', 'my'], description: '统计范围' })
  @ApiResponse({
    status: 200,
    description: '任务统计信息获取成功',
    schema: {
      type: 'object',
      properties: {
        pending: { type: 'number' },
        inProgress: { type: 'number' },
        completed: { type: 'number' },
        overdue: { type: 'number' },
        highPriority: { type: 'number' },
      },
    },
  })
  async getTaskStatistics(
    @Query('scope') scope: 'all' | 'my' = 'my',
    @Request() req: any,
  ): Promise<any> {
    const query = scope === 'my' ? { myTasks: true } : {};
    const result = await this.taskManagementService.findTasks(
      { ...query, limit: 0 } as TaskQueryDto,
      req.user.id,
    );
    return result.statistics;
  }

  @Get(':id')
  @ApiOperation({ summary: '获取任务详情' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({
    status: 200,
    description: '任务详情获取成功',
    type: TaskDetailDto,
  })
  @ApiResponse({ status: 404, description: '任务不存在' })
  @ApiResponse({ status: 403, description: '无权限查看此任务' })
  async getTaskDetail(@Param('id') id: string, @Request() req: any): Promise<TaskDetailDto> {
    return this.taskManagementService.getTaskDetail(id, req.user.id);
  }

  @Post(':id/claim')
  @ApiOperation({ summary: '认领任务' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({
    status: 200,
    description: '任务认领成功',
    type: TaskDetailDto,
  })
  @ApiResponse({ status: 400, description: '任务状态不允许认领或用户无权限' })
  @ApiResponse({ status: 404, description: '任务不存在' })
  async claimTask(
    @Param('id') id: string,
    @Body() claimDto: ClaimTaskDto,
    @Request() req: any,
  ): Promise<TaskDetailDto> {
    return this.taskManagementService.claimTask(id, req.user.id, claimDto);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: '完成任务' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({
    status: 200,
    description: '任务完成成功',
    type: TaskDetailDto,
  })
  @ApiResponse({ status: 400, description: '任务状态不允许完成或用户无权限' })
  @ApiResponse({ status: 404, description: '任务不存在' })
  async completeTask(
    @Param('id') id: string,
    @Body() completeDto: CompleteTaskDto,
    @Request() req: any,
  ): Promise<TaskDetailDto> {
    return this.taskManagementService.completeTask(id, req.user.id, completeDto);
  }

  @Post(':id/delegate')
  @ApiOperation({ summary: '委派任务' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({
    status: 200,
    description: '任务委派成功',
    type: TaskDetailDto,
  })
  @ApiResponse({ status: 400, description: '任务状态不允许委派或用户无权限' })
  @ApiResponse({ status: 404, description: '任务不存在' })
  async delegateTask(
    @Param('id') id: string,
    @Body() delegateDto: DelegateTaskDto,
    @Request() req: any,
  ): Promise<TaskDetailDto> {
    return this.taskManagementService.delegateTask(id, req.user.id, delegateDto);
  }

  @Put(':id/reassign')
  @ApiOperation({ summary: '重新分配任务' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({
    status: 200,
    description: '任务重新分配成功',
    type: TaskDetailDto,
  })
  @ApiResponse({ status: 400, description: '任务状态不允许重新分配' })
  @ApiResponse({ status: 404, description: '任务不存在' })
  async reassignTask(
    @Param('id') id: string,
    @Body() reassignDto: ReassignTaskDto,
    @Request() req: any,
  ): Promise<TaskDetailDto> {
    return this.taskManagementService.reassignTask(id, reassignDto, req.user.id);
  }

  @Post(':id/candidates')
  @ApiOperation({ summary: '添加任务候选用户/用户组' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({
    status: 200,
    description: '候选用户添加成功',
    type: TaskDetailDto,
  })
  @ApiResponse({ status: 400, description: '任务状态不允许添加候选用户' })
  @ApiResponse({ status: 404, description: '任务不存在' })
  async addCandidates(
    @Param('id') id: string,
    @Body() addCandidatesDto: AddCandidatesDto,
    @Request() req: any,
  ): Promise<TaskDetailDto> {
    return this.taskManagementService.addCandidates(id, addCandidatesDto, req.user.id);
  }

  @Delete(':id/candidates')
  @ApiOperation({ summary: '移除任务候选用户/用户组' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({
    status: 200,
    description: '候选用户移除成功',
    type: TaskDetailDto,
  })
  @ApiResponse({ status: 400, description: '任务状态不允许移除候选用户' })
  @ApiResponse({ status: 404, description: '任务不存在' })
  async removeCandidates(
    @Param('id') id: string,
    @Body() removeCandidatesDto: RemoveCandidatesDto,
    @Request() req: any,
  ): Promise<TaskDetailDto> {
    return this.taskManagementService.removeCandidates(id, removeCandidatesDto, req.user.id);
  }

  @Post(':id/transfer')
  @ApiOperation({ summary: '转移任务' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({
    status: 200,
    description: '任务转移成功',
    type: TaskDetailDto,
  })
  @ApiResponse({ status: 400, description: '任务状态不允许转移' })
  @ApiResponse({ status: 404, description: '任务不存在' })
  async transferTask(
    @Param('id') id: string,
    @Body() transferDto: TransferTaskDto,
    @Request() req: any,
  ): Promise<TaskDetailDto> {
    return this.taskManagementService.transferTask(id, transferDto, req.user.id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: '取消任务' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({
    status: 200,
    description: '任务取消成功',
    type: TaskDetailDto,
  })
  @ApiResponse({ status: 400, description: '任务状态不允许取消' })
  @ApiResponse({ status: 404, description: '任务不存在' })
  async cancelTask(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Request() req: any,
  ): Promise<TaskDetailDto> {
    return this.taskManagementService.cancelTask(id, req.user.id, body.reason);
  }

  @Put(':id/priority')
  @ApiOperation({ summary: '设置任务优先级' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({
    status: 200,
    description: '任务优先级设置成功',
    type: TaskDetailDto,
  })
  @ApiResponse({ status: 404, description: '任务不存在' })
  async setTaskPriority(
    @Param('id') id: string,
    @Body() priorityDto: SetPriorityDto,
    @Request() req: any,
  ): Promise<TaskDetailDto> {
    return this.taskManagementService.setTaskPriority(id, priorityDto, req.user.id);
  }

  @Put(':id/due-date')
  @ApiOperation({ summary: '设置任务截止时间' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({
    status: 200,
    description: '任务截止时间设置成功',
    type: TaskDetailDto,
  })
  @ApiResponse({ status: 404, description: '任务不存在' })
  async setTaskDueDate(
    @Param('id') id: string,
    @Body() dueDateDto: SetDueDateDto,
    @Request() req: any,
  ): Promise<TaskDetailDto> {
    return this.taskManagementService.setTaskDueDate(id, dueDateDto, req.user.id);
  }

  @Post('bulk-action')
  @ApiOperation({ summary: '批量操作任务' })
  @ApiResponse({
    status: 200,
    description: '批量操作完成',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'array',
          items: { type: 'string' },
          description: '成功处理的任务ID列表',
        },
        failed: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              taskId: { type: 'string' },
              error: { type: 'string' },
            },
          },
          description: '处理失败的任务列表',
        },
      },
    },
  })
  async bulkActionTasks(
    @Body() bulkActionDto: BulkTaskActionDto,
    @Request() req: any,
  ): Promise<{
    success: string[];
    failed: Array<{ taskId: string; error: string }>;
  }> {
    return this.taskManagementService.bulkActionTasks(bulkActionDto, req.user.id);
  }

}
