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
import { TaskCommentService } from '../services/task-comment.service';
import {
  CreateTaskCommentDto,
  UpdateTaskCommentDto,
  TaskCommentResponseDto,
  PaginatedTaskCommentDto,
} from '../dto/task-comment.dto';

@ApiTags('任务评论')
@ApiBearerAuth()
@Controller('workflow/tasks/:taskId/comments')
@UseGuards(AuthGuard)
export class TaskCommentController {
  constructor(private readonly commentService: TaskCommentService) {}

  @Post()
  @ApiOperation({ summary: '创建任务评论' })
  @ApiParam({ name: 'taskId', description: '任务ID' })
  @ApiResponse({
    status: 201,
    description: '评论创建成功',
    type: TaskCommentResponseDto,
  })
  @ApiResponse({ status: 404, description: '任务不存在' })
  @ApiResponse({ status: 403, description: '无权限评论此任务' })
  async createComment(
    @Param('taskId') taskId: string,
    @Body() createDto: CreateTaskCommentDto,
    @Request() req: any,
  ): Promise<TaskCommentResponseDto> {
    return this.commentService.createComment(taskId, createDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: '获取任务评论列表' })
  @ApiParam({ name: 'taskId', description: '任务ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量' })
  @ApiQuery({
    name: 'includeInternal',
    required: false,
    type: Boolean,
    description: '是否包含内部评论',
  })
  @ApiResponse({
    status: 200,
    description: '评论列表获取成功',
    type: PaginatedTaskCommentDto,
  })
  @ApiResponse({ status: 404, description: '任务不存在' })
  @ApiResponse({ status: 403, description: '无权限查看此任务评论' })
  async getTaskComments(
    @Param('taskId') taskId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('includeInternal') includeInternal?: boolean,
    @Request() req?: any,
  ): Promise<PaginatedTaskCommentDto> {
    return this.commentService.getTaskComments(
      taskId,
      page || 1,
      limit || 20,
      req?.user?.id,
      includeInternal || false,
    );
  }

  @Get('statistics')
  @ApiOperation({ summary: '获取任务评论统计' })
  @ApiParam({ name: 'taskId', description: '任务ID' })
  @ApiResponse({
    status: 200,
    description: '评论统计获取成功',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number', description: '总评论数' },
        internal: { type: 'number', description: '内部评论数' },
        external: { type: 'number', description: '外部评论数' },
        recent: { type: 'number', description: '最近24小时评论数' },
      },
    },
  })
  @ApiResponse({ status: 404, description: '任务不存在' })
  async getCommentStats(@Param('taskId') taskId: string): Promise<{
    total: number;
    internal: number;
    external: number;
    recent: number;
  }> {
    return this.commentService.getTaskCommentStats(taskId);
  }

  @Get(':commentId')
  @ApiOperation({ summary: '获取评论详情' })
  @ApiParam({ name: 'taskId', description: '任务ID' })
  @ApiParam({ name: 'commentId', description: '评论ID' })
  @ApiResponse({
    status: 200,
    description: '评论详情获取成功',
    type: TaskCommentResponseDto,
  })
  @ApiResponse({ status: 404, description: '评论不存在' })
  @ApiResponse({ status: 403, description: '无权限查看此评论' })
  async getComment(
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
    @Request() req: any,
  ): Promise<TaskCommentResponseDto> {
    return this.commentService.getComment(commentId, req.user.id);
  }

  @Put(':commentId')
  @ApiOperation({ summary: '更新评论' })
  @ApiParam({ name: 'taskId', description: '任务ID' })
  @ApiParam({ name: 'commentId', description: '评论ID' })
  @ApiResponse({
    status: 200,
    description: '评论更新成功',
    type: TaskCommentResponseDto,
  })
  @ApiResponse({ status: 404, description: '评论不存在' })
  @ApiResponse({ status: 403, description: '只有评论创建者可以编辑' })
  @ApiResponse({ status: 400, description: '评论创建超过15分钟后不可编辑' })
  async updateComment(
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
    @Body() updateDto: UpdateTaskCommentDto,
    @Request() req: any,
  ): Promise<TaskCommentResponseDto> {
    return this.commentService.updateComment(commentId, updateDto, req.user.id);
  }

  @Delete(':commentId')
  @ApiOperation({ summary: '删除评论' })
  @ApiParam({ name: 'taskId', description: '任务ID' })
  @ApiParam({ name: 'commentId', description: '评论ID' })
  @ApiResponse({ status: 200, description: '评论删除成功' })
  @ApiResponse({ status: 404, description: '评论不存在' })
  @ApiResponse({ status: 403, description: '无权限删除此评论' })
  async deleteComment(
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    await this.commentService.deleteComment(commentId, req.user.id);
    return { message: '评论删除成功' };
  }

  @Delete()
  @ApiOperation({ summary: '批量删除任务的所有评论' })
  @ApiParam({ name: 'taskId', description: '任务ID' })
  @ApiResponse({ status: 200, description: '评论批量删除成功' })
  @ApiResponse({ status: 404, description: '任务不存在' })
  @ApiResponse({ status: 403, description: '无权限批量删除评论' })
  async deleteTaskComments(
    @Param('taskId') taskId: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    await this.commentService.deleteTaskComments(taskId, req.user.id);
    return { message: '任务评论批量删除成功' };
  }
}

// 单独的评论管理控制器，用于跨任务的评论操作
@ApiTags('评论管理')
@ApiBearerAuth()
@Controller('workflow/comments')
@UseGuards(AuthGuard)
export class CommentManagementController {
  constructor(private readonly commentService: TaskCommentService) {}

  @Get(':id')
  @ApiOperation({ summary: '根据ID获取评论详情' })
  @ApiParam({ name: 'id', description: '评论ID' })
  @ApiResponse({
    status: 200,
    description: '评论详情获取成功',
    type: TaskCommentResponseDto,
  })
  @ApiResponse({ status: 404, description: '评论不存在' })
  @ApiResponse({ status: 403, description: '无权限查看此评论' })
  async getCommentById(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<TaskCommentResponseDto> {
    return this.commentService.getComment(id, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: '根据ID更新评论' })
  @ApiParam({ name: 'id', description: '评论ID' })
  @ApiResponse({
    status: 200,
    description: '评论更新成功',
    type: TaskCommentResponseDto,
  })
  @ApiResponse({ status: 404, description: '评论不存在' })
  @ApiResponse({ status: 403, description: '只有评论创建者可以编辑' })
  async updateCommentById(
    @Param('id') id: string,
    @Body() updateDto: UpdateTaskCommentDto,
    @Request() req: any,
  ): Promise<TaskCommentResponseDto> {
    return this.commentService.updateComment(id, updateDto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '根据ID删除评论' })
  @ApiParam({ name: 'id', description: '评论ID' })
  @ApiResponse({ status: 200, description: '评论删除成功' })
  @ApiResponse({ status: 404, description: '评论不存在' })
  @ApiResponse({ status: 403, description: '无权限删除此评论' })
  async deleteCommentById(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    await this.commentService.deleteComment(id, req.user.id);
    return { message: '评论删除成功' };
  }
}
