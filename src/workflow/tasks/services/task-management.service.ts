import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { SystemException } from '@/common/exceptions';
import { WorkflowTask } from '@/workflow/instances/entities/workflow-task.entity';
import { WorkflowInstance } from '@/workflow/instances/entities/workflow-instance.entity';
import { WorkflowDefinition } from '@/workflow/definitions/entities/workflow-definition.entity';
import { TaskComment } from '../entities/task-comment.entity';
import { TaskDelegation } from '../entities/task-delegation.entity';
import { WorkflowTaskStatus } from '@/workflow/instances/enums/task-status.enum';
import { TaskQueryDto } from '../dto/task-query.dto';
import { 
  TaskSummaryDto, 
  TaskDetailDto, 
  PaginatedTaskListDto 
} from '../dto/task-list-response.dto';
import {
  ClaimTaskDto,
  CompleteTaskDto,
  DelegateTaskDto,
  ReassignTaskDto,
  AddCandidatesDto,
  RemoveCandidatesDto,
  TransferTaskDto,
  BulkTaskActionDto,
  SetPriorityDto,
  SetDueDateDto,
} from '../dto/task-action.dto';
import { TaskNotificationService } from './task-notification.service';
import { User } from '@/modules/user/entities/user.entity';

@Injectable()
export class TaskManagementService {
  private readonly logger = new Logger(TaskManagementService.name);

  constructor(
    @InjectRepository(WorkflowTask)
    private readonly taskRepository: Repository<WorkflowTask>,
    @InjectRepository(WorkflowInstance)
    private readonly instanceRepository: Repository<WorkflowInstance>,
    @InjectRepository(WorkflowDefinition)
    private readonly definitionRepository: Repository<WorkflowDefinition>,
    @InjectRepository(TaskComment)
    private readonly commentRepository: Repository<TaskComment>,
    @InjectRepository(TaskDelegation)
    private readonly delegationRepository: Repository<TaskDelegation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationService: TaskNotificationService,
  ) {}

  /**
   * 获取任务列表（支持多种筛选条件）
   */
  async findTasks(query: TaskQueryDto, currentUserId?: string): Promise<PaginatedTaskListDto> {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.createTaskQueryBuilder();
    await this.applyTaskFilters(queryBuilder, query, currentUserId);

    // 分页
    queryBuilder.skip(skip).take(limit);

    // 排序：优先级降序，创建时间升序
    queryBuilder
      .orderBy('task.priority', 'DESC')
      .addOrderBy('task.createdAt', 'ASC');

    const [tasks, total] = await queryBuilder.getManyAndCount();

    // 计算统计信息
    const statistics = await this.getTaskStatistics(query, currentUserId);

    return {
      data: tasks.map(task => this.toTaskSummaryDto(task)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      statistics,
    };
  }

  /**
   * 获取我的待办任务
   */
  async getMyTodoTasks(userId: string, query: Partial<TaskQueryDto> = {}): Promise<PaginatedTaskListDto> {
    const todoQuery: TaskQueryDto = {
      ...query,
      myTasks: true,
      statuses: query.statuses || [WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS],
      includeCandidateTasks: true,
    };

    return this.findTasks(todoQuery, userId);
  }

  /**
   * 获取我的已办任务
   */
  async getMyCompletedTasks(userId: string, query: Partial<TaskQueryDto> = {}): Promise<PaginatedTaskListDto> {
    const completedQuery: TaskQueryDto = {
      ...query,
      assigneeId: userId,
      statuses: [WorkflowTaskStatus.COMPLETED, WorkflowTaskStatus.CANCELLED],
    };

    return this.findTasks(completedQuery, userId);
  }

  /**
   * 获取任务详情
   */
  async getTaskDetail(taskId: string, userId?: string): Promise<TaskDetailDto> {
    const task = await this.findTaskWithRelations(taskId);

    // 检查用户是否有权限查看此任务
    if (userId && !this.canUserAccessTask(task, userId)) {
      throw SystemException.insufficientPermission('您无权限查看此任务');
    }

    // 获取评论数量
    const commentCount = await this.commentRepository.count({
      where: { taskId, isDeleted: false },
    });

    // 获取委派历史
    const delegationHistory = await this.getDelegationHistory(taskId);

    return this.toTaskDetailDto(task, commentCount, delegationHistory);
  }

  /**
   * 认领任务
   */
  async claimTask(taskId: string, userId: string, claimDto: ClaimTaskDto = {}): Promise<TaskDetailDto> {
    const task = await this.findTaskWithRelations(taskId);

    // 验证任务状态
    if (task.status !== WorkflowTaskStatus.PENDING) {
      throw SystemException.businessRuleViolation(`任务状态不允许认领 (当前状态: ${task.status})`);
    }

    // 检查用户是否有权限认领
    if (!this.canUserClaimTask(task, userId)) {
      throw SystemException.insufficientPermission('您无权限认领此任务');
    }

    // 如果任务已分配给其他人
    if (task.assigneeId && task.assigneeId !== userId) {
      throw SystemException.businessRuleViolation('任务已被其他用户分配');
    }

    // 更新任务状态
    await this.taskRepository.update(taskId, {
      assigneeId: userId,
      status: WorkflowTaskStatus.IN_PROGRESS,
      startedAt: new Date(),
    });

    // 记录操作日志
    if (claimDto.comment) {
      await this.commentRepository.save({
        taskId,
        content: `任务已认领：${claimDto.comment}`,
        createdBy: userId,
        isInternal: false,
      });
    }

    // 发送通知
    await this.notificationService.notifyTaskClaimed(taskId, userId);

    this.logger.log(`✅ 任务认领成功: ${taskId} -> ${userId}`);

    return this.getTaskDetail(taskId);
  }

  /**
   * 完成任务
   */
  async completeTask(taskId: string, userId: string, completeDto: CompleteTaskDto): Promise<TaskDetailDto> {
    const task = await this.findTaskWithRelations(taskId);

    // 验证任务状态
    if (task.status !== WorkflowTaskStatus.IN_PROGRESS && task.status !== WorkflowTaskStatus.PENDING) {
      throw SystemException.businessRuleViolation(`任务状态不允许完成 (当前状态: ${task.status})`);
    }

    // 检查用户权限
    if (task.assigneeId && task.assigneeId !== userId && !completeDto.forceComplete) {
      throw SystemException.insufficientPermission('只有任务分配者才能完成任务');
    }

    const completedAt = new Date();
    const durationMs = task.startedAt ? completedAt.getTime() - task.startedAt.getTime() : 0;

    // 更新任务状态
    await this.taskRepository.update(taskId, {
      status: WorkflowTaskStatus.COMPLETED,
      completedAt,
      durationMs,
      completedBy: userId,
      completionComment: completeDto.comment,
      completionVariables: completeDto.variables || {},
      formData: { ...task.formData, ...completeDto.formData },
    });

    // 更新流程实例变量
    if (completeDto.variables) {
      const instance = await task.instance;
      const updatedVariables = { ...instance.variables, ...completeDto.variables };
      await this.instanceRepository.update(instance.id, {
        variables: updatedVariables,
      });
    }

    // 记录完成日志
    if (completeDto.comment) {
      await this.commentRepository.save({
        taskId,
        content: `任务已完成：${completeDto.comment}`,
        createdBy: userId,
        isInternal: false,
      });
    }

    // 发送通知
    await this.notificationService.notifyTaskCompleted(taskId, userId);

    // TODO: 通知工作流引擎继续执行
    // 这里需要通过事件机制或其他方式来通知工作流引擎
    // 避免循环依赖问题
    this.logger.log(`任务完成，需要通知工作流引擎继续执行: 实例=${(await task.instance).id}, 节点=${task.nodeId}`);

    this.logger.log(`✅ 任务完成: ${taskId} (用户: ${userId}, 耗时: ${durationMs}ms)`);

    return this.getTaskDetail(taskId);
  }

  /**
   * 委派任务
   */
  async delegateTask(taskId: string, fromUserId: string, delegateDto: DelegateTaskDto): Promise<TaskDetailDto> {
    const task = await this.findTaskWithRelations(taskId);

    // 验证权限
    if (task.assigneeId !== fromUserId) {
      throw SystemException.insufficientPermission('只有任务分配者才能委派任务');
    }

    if (task.status !== WorkflowTaskStatus.IN_PROGRESS) {
      throw SystemException.businessRuleViolation(`任务状态不允许委派 (当前状态: ${task.status})`);
    }

    // 检查目标用户是否有权限处理此任务
    if (!this.canUserHandleTask(task, delegateDto.toUserId)) {
      throw SystemException.insufficientPermission('目标用户无权限处理此任务');
    }

    // 记录委派历史
    await this.delegationRepository.save({
      taskId,
      fromUserId,
      toUserId: delegateDto.toUserId,
      reason: delegateDto.reason,
      delegatedBy: fromUserId,
    });

    // 更新任务分配
    const updateData: any = {
      assigneeId: delegateDto.toUserId,
    };

    // 如果不保留原分配者权限，则从候选用户中移除
    if (!delegateDto.keepOriginalAssignee) {
      updateData.candidateUsers = task.candidateUsers.filter(id => id !== fromUserId);
    }

    await this.taskRepository.update(taskId, updateData);

    // 记录委派日志
    await this.commentRepository.save({
      taskId,
      content: `任务已委派给其他用户${delegateDto.reason ? `：${delegateDto.reason}` : ''}`,
      createdBy: fromUserId,
      isInternal: false,
    });

    // 发送通知
    await this.notificationService.notifyTaskDelegated(taskId, fromUserId, delegateDto.toUserId);

    this.logger.log(`✅ 任务委派成功: ${taskId} (${fromUserId} -> ${delegateDto.toUserId})`);

    return this.getTaskDetail(taskId);
  }

  /**
   * 重新分配任务
   */
  async reassignTask(taskId: string, reassignDto: ReassignTaskDto, operatorId: string): Promise<TaskDetailDto> {
    const task = await this.findTaskWithRelations(taskId);

    if (task.status !== WorkflowTaskStatus.PENDING && task.status !== WorkflowTaskStatus.IN_PROGRESS) {
      throw SystemException.businessRuleViolation(`任务状态不允许重新分配 (当前状态: ${task.status})`);
    }

    // 检查目标用户权限
    if (!this.canUserHandleTask(task, reassignDto.assigneeId)) {
      throw SystemException.insufficientPermission('目标用户无权限处理此任务');
    }

    await this.taskRepository.update(taskId, {
      assigneeId: reassignDto.assigneeId,
      status: WorkflowTaskStatus.IN_PROGRESS,
      startedAt: new Date(),
    });

    // 记录操作日志
    await this.commentRepository.save({
      taskId,
      content: `任务已重新分配${reassignDto.reason ? `：${reassignDto.reason}` : ''}`,
      createdBy: operatorId,
      isInternal: false,
    });

    // 发送通知
    await this.notificationService.notifyTaskReassigned(taskId, reassignDto.assigneeId, operatorId);

    this.logger.log(`✅ 任务重新分配: ${taskId} -> ${reassignDto.assigneeId} (操作者: ${operatorId})`);

    return this.getTaskDetail(taskId);
  }

  /**
   * 批量操作任务
   */
  async bulkActionTasks(bulkDto: BulkTaskActionDto, userId: string): Promise<{
    success: string[];
    failed: Array<{ taskId: string; error: string }>;
  }> {
    const results = {
      success: [] as string[],
      failed: [] as Array<{ taskId: string; error: string }>,
    };

    for (const taskId of bulkDto.taskIds) {
      try {
        switch (bulkDto.action) {
          case 'claim':
            await this.claimTask(taskId, userId, { comment: bulkDto.comment });
            break;
          case 'complete':
            await this.completeTask(taskId, userId, { 
              comment: bulkDto.comment,
              ...bulkDto.params 
            });
            break;
          case 'delegate':
            if (!bulkDto.params?.toUserId) {
              throw new Error('委派操作需要指定目标用户');
            }
            await this.delegateTask(taskId, userId, {
              toUserId: bulkDto.params.toUserId,
              reason: bulkDto.comment,
            });
            break;
          case 'reassign':
            if (!bulkDto.params?.assigneeId) {
              throw new Error('重新分配操作需要指定分配者');
            }
            await this.reassignTask(taskId, {
              assigneeId: bulkDto.params.assigneeId,
              reason: bulkDto.comment,
            }, userId);
            break;
          case 'cancel':
            await this.cancelTask(taskId, userId, bulkDto.comment);
            break;
          default:
            throw new Error(`不支持的批量操作: ${bulkDto.action}`);
        }
        results.success.push(taskId);
      } catch (error) {
        results.failed.push({
          taskId,
          error: error.message,
        });
      }
    }

    this.logger.log(`✅ 批量任务操作完成: 成功=${results.success.length}, 失败=${results.failed.length}`);

    return results;
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId: string, userId: string, reason?: string): Promise<TaskDetailDto> {
    const task = await this.findTaskWithRelations(taskId);

    if (task.status === WorkflowTaskStatus.COMPLETED || task.status === WorkflowTaskStatus.CANCELLED) {
      throw SystemException.businessRuleViolation(`任务状态不允许取消 (当前状态: ${task.status})`);
    }

    await this.taskRepository.update(taskId, {
      status: WorkflowTaskStatus.CANCELLED,
      completedAt: new Date(),
      completedBy: userId,
      completionComment: reason || '任务被取消',
    });

    // 记录取消日志
    await this.commentRepository.save({
      taskId,
      content: `任务已取消${reason ? `：${reason}` : ''}`,
      createdBy: userId,
      isInternal: false,
    });

    this.logger.log(`✅ 任务取消: ${taskId} (用户: ${userId})`);

    return this.getTaskDetail(taskId);
  }

  /**
   * 设置任务优先级
   */
  async setTaskPriority(taskId: string, priorityDto: SetPriorityDto, userId: string): Promise<TaskDetailDto> {
    const task = await this.findTaskWithRelations(taskId);

    await this.taskRepository.update(taskId, {
      priority: priorityDto.priority,
    });

    // 记录操作日志
    await this.commentRepository.save({
      taskId,
      content: `任务优先级已调整为 ${priorityDto.priority}${priorityDto.reason ? `：${priorityDto.reason}` : ''}`,
      createdBy: userId,
      isInternal: true,
    });

    this.logger.log(`✅ 任务优先级调整: ${taskId} -> ${priorityDto.priority}`);

    return this.getTaskDetail(taskId);
  }

  /**
   * 设置任务截止时间
   */
  async setTaskDueDate(taskId: string, dueDateDto: SetDueDateDto, userId: string): Promise<TaskDetailDto> {
    const task = await this.findTaskWithRelations(taskId);

    await this.taskRepository.update(taskId, {
      dueDate: dueDateDto.dueDate,
    });

    // 记录操作日志
    const dueDateStr = dueDateDto.dueDate ? dueDateDto.dueDate.toISOString() : '无限期';
    await this.commentRepository.save({
      taskId,
      content: `任务截止时间已调整为 ${dueDateStr}${dueDateDto.reason ? `：${dueDateDto.reason}` : ''}`,
      createdBy: userId,
      isInternal: true,
    });

    this.logger.log(`✅ 任务截止时间调整: ${taskId} -> ${dueDateStr}`);

    return this.getTaskDetail(taskId);
  }

  // 私有辅助方法
  private createTaskQueryBuilder(): SelectQueryBuilder<WorkflowTask> {
    return this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.instance', 'instance')
      .leftJoinAndSelect('instance.definition', 'definition')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .where('task.isDeleted = :isDeleted', { isDeleted: false });
  }

  private async applyTaskFilters(
    queryBuilder: SelectQueryBuilder<WorkflowTask>,
    query: TaskQueryDto,
    currentUserId?: string,
  ): Promise<void> {
    // 用户相关筛选
    if (query.myTasks && currentUserId) {
      if (query.includeCandidateTasks) {
        queryBuilder.andWhere(
          '(task.assigneeId = :userId OR :userId = ANY(task.candidateUsers))',
          { userId: currentUserId }
        );
      } else {
        queryBuilder.andWhere('task.assigneeId = :userId', { userId: currentUserId });
      }
    } else if (query.assigneeId) {
      queryBuilder.andWhere('task.assigneeId = :assigneeId', { assigneeId: query.assigneeId });
    }

    // 状态筛选
    if (query.statuses && query.statuses.length > 0) {
      queryBuilder.andWhere('task.status IN (:...statuses)', { statuses: query.statuses });
    }

    // 实例和定义筛选
    if (query.instanceId) {
      queryBuilder.andWhere('task.instanceId = :instanceId', { instanceId: query.instanceId });
    }

    if (query.definitionId) {
      queryBuilder.andWhere('instance.definitionId = :definitionId', { definitionId: query.definitionId });
    }

    if (query.nodeId) {
      queryBuilder.andWhere('task.nodeId = :nodeId', { nodeId: query.nodeId });
    }

    // 搜索
    if (query.search) {
      queryBuilder.andWhere(
        '(task.nodeName ILIKE :search OR task.description ILIKE :search)',
        { search: `%${query.search}%` }
      );
    }

    // 优先级筛选
    if (query.priorityMin !== undefined) {
      queryBuilder.andWhere('task.priority >= :priorityMin', { priorityMin: query.priorityMin });
    }

    if (query.priorityMax !== undefined) {
      queryBuilder.andWhere('task.priority <= :priorityMax', { priorityMax: query.priorityMax });
    }

    // 时间筛选
    if (query.dueDateFrom) {
      queryBuilder.andWhere('task.dueDate >= :dueDateFrom', { dueDateFrom: new Date(query.dueDateFrom) });
    }

    if (query.dueDateTo) {
      queryBuilder.andWhere('task.dueDate <= :dueDateTo', { dueDateTo: new Date(query.dueDateTo) });
    }

    if (query.createdFrom) {
      queryBuilder.andWhere('task.createdAt >= :createdFrom', { createdFrom: new Date(query.createdFrom) });
    }

    if (query.createdTo) {
      queryBuilder.andWhere('task.createdAt <= :createdTo', { createdTo: new Date(query.createdTo) });
    }

    // 逾期筛选
    if (query.overdue) {
      queryBuilder.andWhere('task.dueDate < :now', { now: new Date() });
      queryBuilder.andWhere('task.status IN (:...activeStatuses)', { 
        activeStatuses: [WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS] 
      });
    }
  }

  private async getTaskStatistics(query: TaskQueryDto, currentUserId?: string): Promise<any> {
    const baseQuery = this.createTaskQueryBuilder();
    await this.applyTaskFilters(baseQuery, { ...query, statuses: undefined, overdue: undefined }, currentUserId);

    const stats = await baseQuery
      .select('task.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('task.status')
      .getRawMany();

    const overdueCount = await baseQuery
      .clone()
      .andWhere('task.dueDate < :now', { now: new Date() })
      .andWhere('task.status IN (:...activeStatuses)', { 
        activeStatuses: [WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS] 
      })
      .getCount();

    const highPriorityCount = await baseQuery
      .clone()
      .andWhere('task.priority >= :highPriority', { highPriority: 80 })
      .getCount();

    const result: any = {
      pending: 0,
      inProgress: 0,
      completed: 0,
      overdue: overdueCount,
      highPriority: highPriorityCount,
    };

    stats.forEach(stat => {
      const count = parseInt(stat.count, 10);
      switch (stat.status) {
        case WorkflowTaskStatus.PENDING:
          result.pending = count;
          break;
        case WorkflowTaskStatus.IN_PROGRESS:
          result.inProgress = count;
          break;
        case WorkflowTaskStatus.COMPLETED:
          result.completed = count;
          break;
      }
    });

    return result;
  }

  private async findTaskWithRelations(taskId: string): Promise<WorkflowTask> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId, isDeleted: false },
      relations: ['instance', 'assignee', 'completer'],
    });

    if (!task) {
      throw SystemException.dataNotFound(`任务不存在 (ID: ${taskId})`);
    }

    return task;
  }

  private canUserAccessTask(task: WorkflowTask, userId: string): boolean {
    return task.assigneeId === userId || 
           task.candidateUsers.includes(userId) ||
           task.candidateGroups.length > 0; // TODO: 实现用户组权限检查
  }

  private canUserClaimTask(task: WorkflowTask, userId: string): boolean {
    return task.candidateUsers.includes(userId) ||
           task.candidateGroups.length > 0 || // TODO: 实现用户组权限检查
           (!task.assigneeId && task.candidateUsers.length === 0 && task.candidateGroups.length === 0);
  }

  private canUserHandleTask(task: WorkflowTask, userId: string): boolean {
    return this.canUserClaimTask(task, userId);
  }

  private async getDelegationHistory(taskId: string): Promise<any[]> {
    const delegations = await this.delegationRepository.find({
      where: { taskId },
      relations: ['fromUser', 'toUser'],
      order: { createdAt: 'DESC' },
    });

    return delegations.map(delegation => ({
      fromUserId: delegation.fromUserId,
      toUserId: delegation.toUserId,
      reason: delegation.reason,
      createdAt: delegation.createdAt,
      fromUserEmail: (delegation as any).fromUser?.email,
      toUserEmail: (delegation as any).toUser?.email,
    }));
  }

  private toTaskSummaryDto(task: WorkflowTask): TaskSummaryDto {
    const now = new Date();
    const isOverdue = task.dueDate && task.dueDate < now;
    const remainingHours = task.dueDate ? Math.max(0, (task.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60)) : undefined;

    return {
      id: task.id,
      nodeName: task.nodeName,
      type: task.type,
      status: task.status,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      assigneeId: task.assigneeId,
      candidateUsers: task.candidateUsers,
      candidateGroups: task.candidateGroups,
      instance: {
        id: (task as any).instance.id,
        businessKey: (task as any).instance.businessKey,
        definitionName: (task as any).instance.definition?.name,
        startedBy: (task as any).instance.startedBy,
        startTime: (task as any).instance.startTime,
      },
      assignee: task.assigneeId && (task as any).assignee ? {
        id: (task as any).assignee.id,
        email: (task as any).assignee.email,
      } : undefined,
      isOverdue,
      remainingHours,
    };
  }

  private toTaskDetailDto(task: WorkflowTask, commentCount: number, delegationHistory: any[]): TaskDetailDto {
    const summary = this.toTaskSummaryDto(task);

    return {
      ...summary,
      nodeId: task.nodeId,
      formKey: task.formKey,
      formData: task.formData,
      taskVariables: task.taskVariables,
      completedAt: task.completedAt,
      durationMs: task.durationMs,
      completer: task.completedBy && (task as any).completer ? {
        id: (task as any).completer.id,
        email: (task as any).completer.email,
      } : undefined,
      completionComment: task.completionComment,
      executionContext: task.executionContext,
      commentCount,
      delegationHistory,
    };
  }

  /**
   * 添加候选用户/用户组
   */
  async addCandidates(taskId: string, candidatesDto: AddCandidatesDto, operatorId: string): Promise<TaskDetailDto> {
    const task = await this.findTaskWithRelations(taskId);

    // 验证任务状态
    if (task.status === WorkflowTaskStatus.COMPLETED || task.status === WorkflowTaskStatus.CANCELLED) {
      throw SystemException.businessRuleViolation(`任务状态不允许修改候选人 (当前状态: ${task.status})`);
    }

    // 合并候选用户
    const newCandidateUsers = candidatesDto.userIds 
      ? [...new Set([...task.candidateUsers, ...candidatesDto.userIds])]
      : task.candidateUsers;

    // 合并候选用户组
    const newCandidateGroups = candidatesDto.groupIds
      ? [...new Set([...task.candidateGroups, ...candidatesDto.groupIds])]
      : task.candidateGroups;

    // 更新任务
    await this.taskRepository.update(taskId, {
      candidateUsers: newCandidateUsers,
      candidateGroups: newCandidateGroups,
    });

    // 记录操作日志
    if (candidatesDto.reason) {
      await this.commentRepository.save({
        taskId,
        content: `添加候选人：${candidatesDto.reason}`,
        createdBy: operatorId,
        isInternal: true,
      });
    }

    // 发送通知给新添加的候选用户
    if (candidatesDto.userIds) {
      await this.notificationService.notifyNewCandidates(taskId, candidatesDto.userIds);
    }

    this.logger.log(`✅ 添加任务候选人成功: ${taskId} (操作者: ${operatorId})`);

    return this.getTaskDetail(taskId);
  }

  /**
   * 移除候选用户/用户组
   */
  async removeCandidates(taskId: string, candidatesDto: RemoveCandidatesDto, operatorId: string): Promise<TaskDetailDto> {
    const task = await this.findTaskWithRelations(taskId);

    // 验证任务状态
    if (task.status === WorkflowTaskStatus.COMPLETED || task.status === WorkflowTaskStatus.CANCELLED) {
      throw SystemException.businessRuleViolation(`任务状态不允许修改候选人 (当前状态: ${task.status})`);
    }

    // 移除候选用户
    const newCandidateUsers = candidatesDto.userIds
      ? task.candidateUsers.filter(userId => !candidatesDto.userIds.includes(userId))
      : task.candidateUsers;

    // 移除候选用户组
    const newCandidateGroups = candidatesDto.groupIds
      ? task.candidateGroups.filter(groupId => !candidatesDto.groupIds.includes(groupId))
      : task.candidateGroups;

    // 检查是否移除了当前分配者
    if (task.assigneeId && candidatesDto.userIds && candidatesDto.userIds.includes(task.assigneeId)) {
      // 如果移除了当前分配者，需要将任务状态重置为待处理
      await this.taskRepository.update(taskId, {
        candidateUsers: newCandidateUsers,
        candidateGroups: newCandidateGroups,
        assigneeId: null,
        status: WorkflowTaskStatus.PENDING,
        startedAt: null,
      });
    } else {
      // 只更新候选人列表
      await this.taskRepository.update(taskId, {
        candidateUsers: newCandidateUsers,
        candidateGroups: newCandidateGroups,
      });
    }

    // 记录操作日志
    if (candidatesDto.reason) {
      await this.commentRepository.save({
        taskId,
        content: `移除候选人：${candidatesDto.reason}`,
        createdBy: operatorId,
        isInternal: true,
      });
    }

    this.logger.log(`✅ 移除任务候选人成功: ${taskId} (操作者: ${operatorId})`);

    return this.getTaskDetail(taskId);
  }

  /**
   * 转移任务
   */
  async transferTask(taskId: string, transferDto: TransferTaskDto, operatorId: string): Promise<TaskDetailDto> {
    const task = await this.findTaskWithRelations(taskId);

    // 验证任务状态
    if (task.status === WorkflowTaskStatus.COMPLETED || task.status === WorkflowTaskStatus.CANCELLED) {
      throw SystemException.businessRuleViolation(`任务状态不允许转移 (当前状态: ${task.status})`);
    }

    // 验证目标用户权限
    if (!this.canUserHandleTask(task, transferDto.toUserId)) {
      throw SystemException.businessRuleViolation('目标用户无权限处理此任务');
    }

    // 更新任务分配
    await this.taskRepository.update(taskId, {
      assigneeId: transferDto.toUserId,
      status: WorkflowTaskStatus.TRANSFERRED,
      candidateUsers: task.candidateUsers.includes(transferDto.toUserId) 
        ? task.candidateUsers 
        : [...task.candidateUsers, transferDto.toUserId],
    });

    // 记录转移历史
    await this.delegationRepository.save({
      taskId,
      fromUserId: task.assigneeId || operatorId,
      toUserId: transferDto.toUserId,
      reason: transferDto.reason,
      delegatedBy: operatorId,
    });

    // 记录操作日志
    await this.commentRepository.save({
      taskId,
      content: `任务已转移给用户 ${transferDto.toUserId}${transferDto.reason ? `：${transferDto.reason}` : ''}`,
      createdBy: operatorId,
      isInternal: false,
    });

    // 发送通知
    if (transferDto.sendNotification) {
      await this.notificationService.notifyTaskTransferred(taskId, transferDto.toUserId, operatorId);
    }

    this.logger.log(`✅ 任务转移成功: ${taskId} -> ${transferDto.toUserId} (操作者: ${operatorId})`);

    return this.getTaskDetail(taskId);
  }
}