import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { SystemException } from '@/common/exceptions';
import { WorkflowTask } from './entities/workflow-task.entity';
import { WorkflowInstance } from './entities/workflow-instance.entity';
import { WorkflowTaskStatus } from './enums/task-status.enum';
import {
  CompleteTaskDto,
  DelegateTaskDto,
  ReassignTaskDto,
  AddCandidatesDto,
  BulkTaskActionDto,
} from './dto/task-action.dto';
import { WorkflowTaskResponseDto } from './dto/instance-response.dto';
import { TaskEngineService } from './services/task-engine.service';

interface TaskQueryOptions {
  page?: number;
  limit?: number;
  status?: WorkflowTaskStatus;
  assigneeId?: string;
  instanceId?: string;
  definitionId?: string;
  nodeId?: string;
  candidateUserId?: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  createdFrom?: Date;
  createdTo?: Date;
  priority?: number;
  search?: string;
}

@Injectable()
export class WorkflowTaskService {
  private readonly logger = new Logger(WorkflowTaskService.name);

  constructor(
    @InjectRepository(WorkflowTask)
    private readonly taskRepository: Repository<WorkflowTask>,
    @InjectRepository(WorkflowInstance)
    private readonly instanceRepository: Repository<WorkflowInstance>,
    private readonly taskEngine: TaskEngineService,
  ) {}

  /**
   * 获取任务列表（分页）
   */
  async findAll(options: TaskQueryOptions = {}): Promise<{
    data: WorkflowTaskResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const queryBuilder = this.createQueryBuilder();
    this.applyFilters(queryBuilder, options);

    // 分页
    queryBuilder.skip(skip).take(limit);

    // 排序：优先级高的在前，创建时间早的在前
    queryBuilder.orderBy('task.priority', 'DESC').addOrderBy('task.createdAt', 'ASC');

    const [tasks, total] = await queryBuilder.getManyAndCount();

    return {
      data: tasks.map((task) => this.toResponseDto(task)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 根据ID获取任务详情
   */
  async findOne(id: string): Promise<WorkflowTaskResponseDto> {
    const task = await this.findTaskById(id);
    return this.toResponseDto(task);
  }

  /**
   * 获取用户的待办任务
   */
  async getUserTodoTasks(
    userId: string,
    options: TaskQueryOptions = {},
  ): Promise<{
    data: WorkflowTaskResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryOptions = {
      ...options,
      candidateUserId: userId,
      status: options.status || WorkflowTaskStatus.PENDING,
    };

    // 查询分配给用户或用户在候选列表中的任务
    const { page = 1, limit = 10 } = queryOptions;
    const skip = (page - 1) * limit;

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.instance', 'instance')
      .leftJoinAndSelect('instance.definition', 'definition')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .where('task.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('(task.assigneeId = :userId OR :userId = ANY(task.candidateUsers))', { userId });

    if (queryOptions.status) {
      queryBuilder.andWhere('task.status = :status', { status: queryOptions.status });
    }

    // 应用其他过滤条件
    this.applyFilters(queryBuilder, queryOptions);

    queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('task.priority', 'DESC')
      .addOrderBy('task.createdAt', 'ASC');

    const [tasks, total] = await queryBuilder.getManyAndCount();

    return {
      data: tasks.map((task) => this.toResponseDto(task)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取用户已完成的任务
   */
  async getUserCompletedTasks(
    userId: string,
    options: TaskQueryOptions = {},
  ): Promise<{
    data: WorkflowTaskResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryOptions = {
      ...options,
      status: WorkflowTaskStatus.COMPLETED,
    };

    const { page = 1, limit = 10 } = queryOptions;
    const skip = (page - 1) * limit;

    const queryBuilder = this.createQueryBuilder().andWhere('task.completedBy = :userId', {
      userId,
    });

    this.applyFilters(queryBuilder, queryOptions);

    queryBuilder.skip(skip).take(limit).orderBy('task.completedAt', 'DESC');

    const [tasks, total] = await queryBuilder.getManyAndCount();

    return {
      data: tasks.map((task) => this.toResponseDto(task)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 认领任务
   */
  async claimTask(taskId: string, userId: string): Promise<WorkflowTaskResponseDto> {
    await this.taskEngine.claimTask(taskId, userId);

    this.logger.log(`✅ 任务认领成功: ${taskId} -> ${userId}`);

    return this.findOne(taskId);
  }

  /**
   * 完成任务
   */
  async completeTask(
    taskId: string,
    userId: string,
    completeDto: CompleteTaskDto,
  ): Promise<WorkflowTaskResponseDto> {
    await this.taskEngine.completeTask(taskId, userId, completeDto);

    this.logger.log(`✅ 任务完成: ${taskId} (用户: ${userId})`);

    return this.findOne(taskId);
  }

  /**
   * 委派任务
   */
  async delegateTask(
    taskId: string,
    fromUserId: string,
    delegateDto: DelegateTaskDto,
  ): Promise<WorkflowTaskResponseDto> {
    await this.taskEngine.delegateTask(
      taskId,
      fromUserId,
      delegateDto.delegateToUserId,
      delegateDto.reason,
    );

    this.logger.log(`✅ 任务委派: ${taskId} (${fromUserId} -> ${delegateDto.delegateToUserId})`);

    return this.findOne(taskId);
  }

  /**
   * 重新分配任务
   */
  async reassignTask(
    taskId: string,
    reassignDto: ReassignTaskDto,
    operatorId: string,
  ): Promise<WorkflowTaskResponseDto> {
    const task = await this.findTaskById(taskId);

    if (
      task.status !== WorkflowTaskStatus.PENDING &&
      task.status !== WorkflowTaskStatus.IN_PROGRESS
    ) {
      throw SystemException.businessRuleViolation(
        `任务状态不允许重新分配 (当前状态: ${task.status})`,
      );
    }

    await this.taskRepository.update(taskId, {
      assigneeId: reassignDto.assigneeId,
      status: WorkflowTaskStatus.IN_PROGRESS,
      executionContext: {
        ...task.executionContext,
        reassignmentHistory: [
          ...(task.executionContext.reassignmentHistory || []),
          {
            fromUserId: task.assigneeId,
            toUserId: reassignDto.assigneeId,
            operatorId,
            timestamp: new Date(),
            reason: reassignDto.reason,
          },
        ],
      },
    });

    this.logger.log(
      `✅ 任务重新分配: ${taskId} -> ${reassignDto.assigneeId} (操作者: ${operatorId})`,
    );

    return this.findOne(taskId);
  }

  /**
   * 添加候选用户
   */
  async addCandidates(
    taskId: string,
    addCandidatesDto: AddCandidatesDto,
    operatorId: string,
  ): Promise<WorkflowTaskResponseDto> {
    const task = await this.findTaskById(taskId);

    if (task.status !== WorkflowTaskStatus.PENDING) {
      throw SystemException.businessRuleViolation(
        `只能为待处理状态的任务添加候选用户 (当前状态: ${task.status})`,
      );
    }

    const updatedCandidateUsers = addCandidatesDto.userIds
      ? [...new Set([...task.candidateUsers, ...addCandidatesDto.userIds])]
      : task.candidateUsers;

    const updatedCandidateGroups = addCandidatesDto.groupIds
      ? [...new Set([...task.candidateGroups, ...addCandidatesDto.groupIds])]
      : task.candidateGroups;

    await this.taskRepository.update(taskId, {
      candidateUsers: updatedCandidateUsers,
      candidateGroups: updatedCandidateGroups,
    });

    this.logger.log(`✅ 任务候选用户更新: ${taskId} (操作者: ${operatorId})`);

    return this.findOne(taskId);
  }

  /**
   * 取消任务
   */
  async cancelTask(
    taskId: string,
    userId: string,
    reason?: string,
  ): Promise<WorkflowTaskResponseDto> {
    await this.taskEngine.cancelTask(taskId, userId, reason);

    this.logger.log(`✅ 任务取消: ${taskId} (用户: ${userId})`);

    return this.findOne(taskId);
  }

  /**
   * 批量操作任务
   */
  async bulkAction(
    bulkActionDto: BulkTaskActionDto,
    userId: string,
  ): Promise<{
    success: string[];
    failed: Array<{ taskId: string; error: string }>;
  }> {
    const results = {
      success: [] as string[],
      failed: [] as Array<{ taskId: string; error: string }>,
    };

    for (const taskId of bulkActionDto.taskIds) {
      try {
        switch (bulkActionDto.action) {
          case 'complete':
            await this.completeTask(
              taskId,
              userId,
              (bulkActionDto.params as CompleteTaskDto) || {},
            );
            break;
          case 'claim':
            await this.claimTask(taskId, userId);
            break;
          case 'cancel':
            await this.cancelTask(taskId, userId, bulkActionDto.params?.reason);
            break;
          default:
            throw SystemException.invalidParameter(`不支持的批量操作: ${bulkActionDto.action}`);
        }
        results.success.push(taskId);
      } catch (error) {
        results.failed.push({
          taskId,
          error: error.message,
        });
      }
    }

    this.logger.log(
      `✅ 批量任务操作完成: 成功=${results.success.length}, 失败=${results.failed.length}`,
    );

    return results;
  }

  /**
   * 获取任务统计信息
   */
  async getTaskStatistics(
    userId?: string,
    definitionId?: string,
  ): Promise<{
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    overdue: number;
    avgCompletionTime: number;
  }> {
    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .where('task.isDeleted = :isDeleted', { isDeleted: false });

    if (userId) {
      queryBuilder.andWhere('(task.assigneeId = :userId OR :userId = ANY(task.candidateUsers))', {
        userId,
      });
    }

    if (definitionId) {
      queryBuilder
        .leftJoin('task.instance', 'instance')
        .andWhere('instance.definitionId = :definitionId', { definitionId });
    }

    // 按状态统计
    const statusStats = await queryBuilder
      .clone()
      .select('task.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('task.status')
      .getRawMany();

    const byStatus: Record<string, number> = {};
    statusStats.forEach((stat) => {
      byStatus[stat.status] = parseInt(stat.count);
    });

    // 按优先级统计
    const priorityStats = await queryBuilder
      .clone()
      .select('task.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .groupBy('task.priority')
      .getRawMany();

    const byPriority: Record<string, number> = {};
    priorityStats.forEach((stat) => {
      byPriority[stat.priority] = parseInt(stat.count);
    });

    // 逾期任务统计
    const overdueCount = await queryBuilder
      .clone()
      .andWhere('task.dueDate < :now', { now: new Date() })
      .andWhere('task.status IN (:...activeStatuses)', {
        activeStatuses: [WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS],
      })
      .getCount();

    // 平均完成时间
    const avgTimeResult = await queryBuilder
      .clone()
      .select('AVG(task.durationMs)', 'avgTime')
      .where('task.status = :status', { status: WorkflowTaskStatus.COMPLETED })
      .andWhere('task.durationMs IS NOT NULL')
      .getRawOne();

    const avgCompletionTime = avgTimeResult?.avgTime ? parseFloat(avgTimeResult.avgTime) : 0;

    return {
      byStatus,
      byPriority,
      overdue: overdueCount,
      avgCompletionTime,
    };
  }

  /**
   * 根据ID查找任务
   */
  private async findTaskById(id: string): Promise<WorkflowTask> {
    const task = await this.taskRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['instance', 'assignee', 'completer'],
    });

    if (!task) {
      throw SystemException.dataNotFound(`任务不存在 (ID: ${id})`);
    }

    return task;
  }

  /**
   * 创建查询构建器
   */
  private createQueryBuilder(): SelectQueryBuilder<WorkflowTask> {
    return this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.instance', 'instance')
      .leftJoinAndSelect('instance.definition', 'definition')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.completer', 'completer')
      .where('task.isDeleted = :isDeleted', { isDeleted: false });
  }

  /**
   * 应用查询过滤条件
   */
  private applyFilters(
    queryBuilder: SelectQueryBuilder<WorkflowTask>,
    options: TaskQueryOptions,
  ): void {
    if (options.status) {
      queryBuilder.andWhere('task.status = :status', { status: options.status });
    }

    if (options.assigneeId) {
      queryBuilder.andWhere('task.assigneeId = :assigneeId', { assigneeId: options.assigneeId });
    }

    if (options.instanceId) {
      queryBuilder.andWhere('task.instanceId = :instanceId', { instanceId: options.instanceId });
    }

    if (options.definitionId) {
      queryBuilder.andWhere('instance.definitionId = :definitionId', {
        definitionId: options.definitionId,
      });
    }

    if (options.nodeId) {
      queryBuilder.andWhere('task.nodeId = :nodeId', { nodeId: options.nodeId });
    }

    if (options.dueDateFrom) {
      queryBuilder.andWhere('task.dueDate >= :dueDateFrom', { dueDateFrom: options.dueDateFrom });
    }

    if (options.dueDateTo) {
      queryBuilder.andWhere('task.dueDate <= :dueDateTo', { dueDateTo: options.dueDateTo });
    }

    if (options.createdFrom) {
      queryBuilder.andWhere('task.createdAt >= :createdFrom', { createdFrom: options.createdFrom });
    }

    if (options.createdTo) {
      queryBuilder.andWhere('task.createdAt <= :createdTo', { createdTo: options.createdTo });
    }

    if (options.priority !== undefined) {
      queryBuilder.andWhere('task.priority = :priority', { priority: options.priority });
    }

    if (options.search) {
      queryBuilder.andWhere('(task.nodeName ILIKE :search OR task.description ILIKE :search)', {
        search: `%${options.search}%`,
      });
    }
  }

  /**
   * 转换为响应DTO
   */
  private toResponseDto(task: WorkflowTask): WorkflowTaskResponseDto {
    return {
      id: task.id,
      nodeId: task.nodeId,
      nodeName: task.nodeName,
      type: task.type,
      status: task.status,
      description: task.description,
      assigneeId: task.assigneeId,
      candidateUsers: task.candidateUsers,
      candidateGroups: task.candidateGroups,
      formKey: task.formKey,
      formData: task.formData,
      taskVariables: task.taskVariables,
      dueDate: task.dueDate,
      priority: task.priority,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      durationMs: task.durationMs,
      createdAt: task.createdAt,
      assignee:
        task.assigneeId && (task as any).assignee
          ? {
              id: (task as any).assignee.id,
              email: (task as any).assignee.email,
            }
          : undefined,
      completer:
        task.completedBy && (task as any).completer
          ? {
              id: (task as any).completer.id,
              email: (task as any).completer.email,
            }
          : undefined,
    };
  }
}
