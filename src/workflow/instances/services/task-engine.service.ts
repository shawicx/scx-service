import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemException } from '@/common/exceptions';
import { WorkflowTask } from '../entities/workflow-task.entity';
import { WorkflowInstance } from '../entities/workflow-instance.entity';
import { WorkflowTaskStatus } from '../enums/task-status.enum';
import { CompleteTaskDto } from '../dto/task-action.dto';

@Injectable()
export class TaskEngineService {
  private readonly logger = new Logger(TaskEngineService.name);

  constructor(
    @InjectRepository(WorkflowTask)
    private readonly taskRepository: Repository<WorkflowTask>,
    @InjectRepository(WorkflowInstance)
    private readonly instanceRepository: Repository<WorkflowInstance>,
  ) {}

  /**
   * 自动分配任务
   */
  async autoAssignTask(taskId: string): Promise<void> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
    });

    if (!task) {
      throw SystemException.dataNotFound(`任务不存在 (ID: ${taskId})`);
    }

    if (task.status !== WorkflowTaskStatus.PENDING) {
      return; // 只处理待处理状态的任务
    }

    // 如果只有一个候选用户，自动分配
    if (task.candidateUsers.length === 1) {
      await this.assignTask(taskId, task.candidateUsers[0]);
      this.logger.log(`✅ 任务自动分配: ${taskId} -> ${task.candidateUsers[0]}`);
    }
    // 如果有候选用户组，可以实现组内负载均衡分配逻辑
    else if (task.candidateGroups.length > 0) {
      const assignee = await this.selectAssigneeFromGroups();
      if (assignee) {
        await this.assignTask(taskId, assignee);
        this.logger.log(`✅ 任务从组自动分配: ${taskId} -> ${assignee}`);
      }
    }
  }

  /**
   * 手动分配任务
   */
  async assignTask(taskId: string, assigneeId: string): Promise<void> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
    });

    if (!task) {
      throw SystemException.dataNotFound(`任务不存在 (ID: ${taskId})`);
    }

    if (task.status !== WorkflowTaskStatus.PENDING) {
      throw SystemException.businessRuleViolation(`任务状态不允许分配 (当前状态: ${task.status})`);
    }

    // 检查用户是否有权限处理此任务
    if (!this.canUserHandleTask(task, assigneeId)) {
      throw SystemException.insufficientPermission('用户无权限处理此任务');
    }

    await this.taskRepository.update(taskId, {
      assigneeId,
      status: WorkflowTaskStatus.IN_PROGRESS,
      startedAt: new Date(),
    });

    this.logger.log(`✅ 任务分配成功: ${taskId} -> ${assigneeId}`);
  }

  /**
   * 认领任务
   */
  async claimTask(taskId: string, userId: string): Promise<void> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
    });

    if (!task) {
      throw SystemException.dataNotFound(`任务不存在 (ID: ${taskId})`);
    }

    if (task.status !== WorkflowTaskStatus.PENDING) {
      throw SystemException.businessRuleViolation(`任务状态不允许认领 (当前状态: ${task.status})`);
    }

    if (task.assigneeId && task.assigneeId !== userId) {
      throw SystemException.businessRuleViolation('任务已被其他用户分配');
    }

    // 检查用户是否有权限认领此任务
    if (!this.canUserHandleTask(task, userId)) {
      throw SystemException.insufficientPermission('用户无权限认领此任务');
    }

    await this.taskRepository.update(taskId, {
      assigneeId: userId,
      status: WorkflowTaskStatus.IN_PROGRESS,
      startedAt: new Date(),
    });

    this.logger.log(`✅ 任务认领成功: ${taskId} -> ${userId}`);
  }

  /**
   * 完成任务
   */
  async completeTask(taskId: string, userId: string, completeDto: CompleteTaskDto): Promise<void> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['instance'],
    });

    if (!task) {
      throw SystemException.dataNotFound(`任务不存在 (ID: ${taskId})`);
    }

    if (
      task.status !== WorkflowTaskStatus.IN_PROGRESS &&
      task.status !== WorkflowTaskStatus.PENDING
    ) {
      throw SystemException.businessRuleViolation(`任务状态不允许完成 (当前状态: ${task.status})`);
    }

    if (task.assigneeId && task.assigneeId !== userId) {
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
    const instance = await task.instance;
    if (completeDto.variables) {
      const updatedVariables = { ...instance.variables, ...completeDto.variables };
      await this.instanceRepository.update(instance.id, {
        variables: updatedVariables,
      });
    }

    this.logger.log(`✅ 任务完成: ${taskId} (用户: ${userId}, 耗时: ${durationMs}ms)`);

    // 通知流程引擎继续执行
    // 这里可以发送事件或直接调用流程引擎
    await this.notifyTaskCompletion(task.instanceId, task.nodeId);
  }

  /**
   * 委派任务
   */
  async delegateTask(
    taskId: string,
    fromUserId: string,
    toUserId: string,
    reason?: string,
  ): Promise<void> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
    });

    if (!task) {
      throw SystemException.dataNotFound(`任务不存在 (ID: ${taskId})`);
    }

    if (task.assigneeId !== fromUserId) {
      throw SystemException.insufficientPermission('只有任务分配者才能委派任务');
    }

    if (task.status !== WorkflowTaskStatus.IN_PROGRESS) {
      throw SystemException.businessRuleViolation(`任务状态不允许委派 (当前状态: ${task.status})`);
    }

    // 检查目标用户是否有权限处理此任务
    if (!this.canUserHandleTask(task, toUserId)) {
      throw SystemException.insufficientPermission('目标用户无权限处理此任务');
    }

    await this.taskRepository.update(taskId, {
      assigneeId: toUserId,
      executionContext: {
        ...task.executionContext,
        delegationHistory: [
          ...(task.executionContext.delegationHistory || []),
          {
            fromUserId,
            toUserId,
            timestamp: new Date(),
            reason,
          },
        ],
      },
    });

    this.logger.log(`✅ 任务委派成功: ${taskId} (${fromUserId} -> ${toUserId})`);
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId: string, userId: string, reason?: string): Promise<void> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
    });

    if (!task) {
      throw SystemException.dataNotFound(`任务不存在 (ID: ${taskId})`);
    }

    if (
      task.status === WorkflowTaskStatus.COMPLETED ||
      task.status === WorkflowTaskStatus.CANCELLED
    ) {
      throw SystemException.businessRuleViolation(`任务状态不允许取消 (当前状态: ${task.status})`);
    }

    await this.taskRepository.update(taskId, {
      status: WorkflowTaskStatus.CANCELLED,
      completedAt: new Date(),
      completedBy: userId,
      completionComment: reason || '任务被取消',
    });

    this.logger.log(`✅ 任务取消: ${taskId} (用户: ${userId})`);
  }

  /**
   * 检查用户是否可以处理任务
   */
  private canUserHandleTask(task: WorkflowTask, userId: string): boolean {
    // 检查候选用户
    if (task.candidateUsers.includes(userId)) {
      return true;
    }

    // 检查候选用户组（需要实现用户组成员关系查询）
    if (task.candidateGroups.length > 0) {
      // TODO: 实现用户组成员关系检查
      // return this.userGroupService.isUserInAnyGroup(userId, task.candidateGroups);
      return true; // 临时返回true
    }

    // 如果没有指定候选用户和用户组，允许任何用户处理
    if (task.candidateUsers.length === 0 && task.candidateGroups.length === 0) {
      return true;
    }

    return false;
  }

  /**
   * 从用户组中选择分配者（负载均衡）
   */
  private async selectAssigneeFromGroups(): Promise<string | null> {
    // TODO: 实现基于负载均衡的用户选择算法
    // 1. 获取组内所有用户
    // 2. 查询每个用户当前的任务负载
    // 3. 选择负载最轻的用户
    // 4. 考虑用户的在线状态、工作时间等因素

    // 临时实现：返回第一个组的第一个用户
    return null;
  }

  /**
   * 通知任务完成，触发流程继续执行
   */
  private async notifyTaskCompletion(instanceId: string, nodeId: string): Promise<void> {
    // 这里可以发送事件给流程引擎或直接调用
    // 由于循环依赖问题，这里使用事件机制会更好
    this.logger.debug(`任务完成通知: 实例=${instanceId}, 节点=${nodeId}`);

    // TODO: 实现事件发送机制
    // this.eventEmitter.emit('task.completed', { instanceId, nodeId, variables });
  }

  /**
   * 获取用户的待办任务
   */
  async getUserTasks(userId: string, status?: WorkflowTaskStatus): Promise<WorkflowTask[]> {
    const query = this.taskRepository
      .createQueryBuilder('task')
      .where('task.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('(task.assigneeId = :userId OR :userId = ANY(task.candidateUsers))', { userId });

    if (status) {
      query.andWhere('task.status = :status', { status });
    }

    query.orderBy('task.priority', 'DESC').addOrderBy('task.createdAt', 'ASC');

    return query.getMany();
  }

  /**
   * 获取任务统计信息
   */
  async getTaskStatistics(userId?: string): Promise<Record<string, number>> {
    const query = this.taskRepository
      .createQueryBuilder('task')
      .select('task.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('task.isDeleted = :isDeleted', { isDeleted: false });

    if (userId) {
      query.andWhere('(task.assigneeId = :userId OR :userId = ANY(task.candidateUsers))', {
        userId,
      });
    }

    query.groupBy('task.status');

    const results = await query.getRawMany();

    const statistics: Record<string, number> = {};
    for (const result of results) {
      statistics[result.status] = parseInt(result.count, 10);
    }

    return statistics;
  }
}
