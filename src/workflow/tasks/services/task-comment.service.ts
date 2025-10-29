import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { SystemException } from '@/common/exceptions';
import { TaskComment } from '../entities/task-comment.entity';
import { WorkflowTask } from '@/workflow/instances/entities/workflow-task.entity';
import {
  CreateTaskCommentDto,
  UpdateTaskCommentDto,
  TaskCommentResponseDto,
  PaginatedTaskCommentDto,
} from '../dto/task-comment.dto';

@Injectable()
export class TaskCommentService {
  private readonly logger = new Logger(TaskCommentService.name);

  constructor(
    @InjectRepository(TaskComment)
    private readonly commentRepository: Repository<TaskComment>,
    @InjectRepository(WorkflowTask)
    private readonly taskRepository: Repository<WorkflowTask>,
  ) {}

  /**
   * 创建任务评论
   */
  async createComment(
    taskId: string,
    createDto: CreateTaskCommentDto,
    userId: string,
  ): Promise<TaskCommentResponseDto> {
    // 验证任务是否存在
    const task = await this.taskRepository.findOne({
      where: { id: taskId, isDeleted: false },
    });

    if (!task) {
      throw SystemException.dataNotFound(`任务不存在 (ID: ${taskId})`);
    }

    // 检查用户是否有权限评论此任务
    if (!this.canUserCommentOnTask(task, userId)) {
      throw SystemException.insufficientPermission('您无权限对此任务进行评论');
    }

    // 创建评论
    const comment = this.commentRepository.create({
      taskId,
      content: createDto.content,
      isInternal: createDto.isInternal || false,
      createdBy: userId,
    });

    const savedComment = await this.commentRepository.save(comment);

    this.logger.log(`✅ 任务评论创建成功: ${savedComment.id} (任务: ${taskId}, 用户: ${userId})`);

    return this.toResponseDto(savedComment);
  }

  /**
   * 获取任务评论列表
   */
  async getTaskComments(
    taskId: string,
    page = 1,
    limit = 20,
    userId?: string,
    includeInternal = false,
  ): Promise<PaginatedTaskCommentDto> {
    // 验证任务是否存在
    const task = await this.taskRepository.findOne({
      where: { id: taskId, isDeleted: false },
    });

    if (!task) {
      throw SystemException.dataNotFound(`任务不存在 (ID: ${taskId})`);
    }

    // 检查用户是否有权限查看评论
    if (userId && !this.canUserViewTaskComments(task, userId, includeInternal)) {
      throw SystemException.insufficientPermission('您无权限查看此任务的评论');
    }

    const skip = (page - 1) * limit;

    const queryBuilder = this.createCommentQueryBuilder(taskId);

    // 如果不包含内部评论或用户无权限查看内部评论
    if (!includeInternal || (userId && !this.canUserViewInternalComments(task, userId))) {
      queryBuilder.andWhere('comment.isInternal = :isInternal', { isInternal: false });
    }

    // 分页
    queryBuilder.skip(skip).take(limit);

    // 排序：最新的在前
    queryBuilder.orderBy('comment.createdAt', 'DESC');

    const [comments, total] = await queryBuilder.getManyAndCount();

    return {
      data: comments.map((comment) => this.toResponseDto(comment)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取评论详情
   */
  async getComment(commentId: string, userId?: string): Promise<TaskCommentResponseDto> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId, isDeleted: false },
      relations: ['creator', 'task'],
    });

    if (!comment) {
      throw SystemException.dataNotFound(`评论不存在 (ID: ${commentId})`);
    }

    // 检查用户是否有权限查看此评论
    if (userId) {
      const task = await comment.task;
      if (!this.canUserViewTaskComments(task, userId, comment.isInternal)) {
        throw SystemException.insufficientPermission('您无权限查看此评论');
      }

      if (comment.isInternal && !this.canUserViewInternalComments(task, userId)) {
        throw SystemException.insufficientPermission('您无权限查看内部评论');
      }
    }

    return this.toResponseDto(comment);
  }

  /**
   * 更新评论
   */
  async updateComment(
    commentId: string,
    updateDto: UpdateTaskCommentDto,
    userId: string,
  ): Promise<TaskCommentResponseDto> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId, isDeleted: false },
      relations: ['creator'],
    });

    if (!comment) {
      throw SystemException.dataNotFound(`评论不存在 (ID: ${commentId})`);
    }

    // 只有评论创建者可以编辑
    if (comment.createdBy !== userId) {
      throw SystemException.insufficientPermission('只有评论创建者可以编辑评论');
    }

    // 检查评论是否在可编辑时间范围内（例如：创建后15分钟内）
    const editTimeLimit = 15 * 60 * 1000; // 15分钟
    const timeSinceCreation = Date.now() - comment.createdAt.getTime();

    if (timeSinceCreation > editTimeLimit) {
      throw SystemException.businessRuleViolation('评论创建超过15分钟后不可编辑');
    }

    // 更新评论
    await this.commentRepository.update(commentId, {
      content: updateDto.content,
    });

    this.logger.log(`✅ 任务评论更新成功: ${commentId} (用户: ${userId})`);

    return this.getComment(commentId);
  }

  /**
   * 删除评论
   */
  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId, isDeleted: false },
      relations: ['task'],
    });

    if (!comment) {
      throw SystemException.dataNotFound(`评论不存在 (ID: ${commentId})`);
    }

    // 检查删除权限：评论创建者或任务负责人
    const task = await comment.task;
    const canDelete =
      comment.createdBy === userId ||
      task.assigneeId === userId ||
      this.isTaskManager(task, userId); // TODO: 实现任务管理员权限检查

    if (!canDelete) {
      throw SystemException.insufficientPermission('您无权限删除此评论');
    }

    // 软删除评论
    await this.commentRepository.update(commentId, {
      isDeleted: true,
    });

    this.logger.log(`✅ 任务评论删除成功: ${commentId} (用户: ${userId})`);
  }

  /**
   * 获取任务评论统计
   */
  async getTaskCommentStats(taskId: string): Promise<{
    total: number;
    internal: number;
    external: number;
    recent: number; // 最近24小时
  }> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId, isDeleted: false },
    });

    if (!task) {
      throw SystemException.dataNotFound(`任务不存在 (ID: ${taskId})`);
    }

    const baseQuery = this.commentRepository
      .createQueryBuilder('comment')
      .where('comment.taskId = :taskId', { taskId })
      .andWhere('comment.isDeleted = :isDeleted', { isDeleted: false });

    const [total, internal, external] = await Promise.all([
      baseQuery.getCount(),
      baseQuery
        .clone()
        .andWhere('comment.isInternal = :isInternal', { isInternal: true })
        .getCount(),
      baseQuery
        .clone()
        .andWhere('comment.isInternal = :isInternal', { isInternal: false })
        .getCount(),
    ]);

    // 最近24小时的评论
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recent = await baseQuery
      .clone()
      .andWhere('comment.createdAt >= :yesterday', { yesterday })
      .getCount();

    return {
      total,
      internal,
      external,
      recent,
    };
  }

  /**
   * 批量删除任务的所有评论
   */
  async deleteTaskComments(taskId: string, userId: string): Promise<void> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId, isDeleted: false },
    });

    if (!task) {
      throw SystemException.dataNotFound(`任务不存在 (ID: ${taskId})`);
    }

    // 检查权限：只有任务负责人或管理员可以批量删除
    if (task.assigneeId !== userId && !this.isTaskManager(task, userId)) {
      throw SystemException.insufficientPermission('您无权限批量删除评论');
    }

    // 软删除所有评论
    await this.commentRepository.update({ taskId, isDeleted: false }, { isDeleted: true });

    this.logger.log(`✅ 任务评论批量删除成功: ${taskId} (用户: ${userId})`);
  }

  // 私有辅助方法
  private createCommentQueryBuilder(taskId: string): SelectQueryBuilder<TaskComment> {
    return this.commentRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.creator', 'creator')
      .where('comment.taskId = :taskId', { taskId })
      .andWhere('comment.isDeleted = :isDeleted', { isDeleted: false });
  }

  private canUserCommentOnTask(task: WorkflowTask, userId: string): boolean {
    // 任务分配者、候选用户、相关流程参与者可以评论
    return (
      task.assigneeId === userId ||
      task.candidateUsers.includes(userId) ||
      task.candidateGroups.length > 0
    ); // TODO: 实现用户组权限检查
  }

  private canUserViewTaskComments(
    task: WorkflowTask,
    userId: string,
    includeInternal: boolean,
  ): boolean {
    // 基本查看权限：任务相关人员
    const basicAccess =
      task.assigneeId === userId ||
      task.candidateUsers.includes(userId) ||
      task.candidateGroups.length > 0; // TODO: 实现用户组权限检查

    if (!includeInternal) {
      return basicAccess;
    }

    // 查看内部评论需要更高权限
    return basicAccess && this.canUserViewInternalComments(task, userId);
  }

  private canUserViewInternalComments(task: WorkflowTask, userId: string): boolean {
    // 内部评论查看权限：任务负责人、管理员
    return task.assigneeId === userId || this.isTaskManager(task, userId);
  }

  private isTaskManager(task: WorkflowTask, userId: string): boolean {
    // TODO: 实现任务管理员权限检查
    // 可以基于角色、用户组或其他业务规则
    return false;
  }

  private toResponseDto(comment: TaskComment): TaskCommentResponseDto {
    return {
      id: comment.id,
      taskId: comment.taskId,
      content: comment.content,
      isInternal: comment.isInternal,
      createdBy: comment.createdBy,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      creator: (comment as any).creator
        ? {
            id: (comment as any).creator.id,
            email: (comment as any).creator.email,
          }
        : {
            id: comment.createdBy,
            email: 'Unknown User',
          },
    };
  }
}
