import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { SystemException } from '@/common/exceptions';
import { WorkflowInstance } from './entities/workflow-instance.entity';
import { WorkflowTask } from './entities/workflow-task.entity';
import { WorkflowDefinition } from '../definitions/entities/workflow-definition.entity';
import { WorkflowInstanceStatus } from './enums/instance-status.enum';
import { WorkflowTaskStatus } from './enums/task-status.enum';
import { CreateInstanceDto } from './dto/create-instance.dto';
import { InstanceQueryDto } from './dto/instance-query.dto';
import {
  WorkflowInstanceResponseDto,
  PaginatedInstanceResponseDto,
} from './dto/instance-response.dto';
import { WorkflowEngineService } from './services/workflow-engine.service';

@Injectable()
export class WorkflowInstanceService {
  private readonly logger = new Logger(WorkflowInstanceService.name);

  constructor(
    @InjectRepository(WorkflowInstance)
    private readonly instanceRepository: Repository<WorkflowInstance>,
    @InjectRepository(WorkflowTask)
    private readonly taskRepository: Repository<WorkflowTask>,
    @InjectRepository(WorkflowDefinition)
    private readonly definitionRepository: Repository<WorkflowDefinition>,
    private readonly workflowEngine: WorkflowEngineService,
  ) {}

  /**
   * 启动流程实例
   */
  async startInstance(
    createDto: CreateInstanceDto,
    startedBy: string,
  ): Promise<WorkflowInstanceResponseDto> {
    const instance = await this.workflowEngine.startInstance(
      createDto.definitionId,
      createDto.variables || {},
      startedBy,
      createDto.businessKey,
      createDto.priority || 50,
      createDto.startParams || {},
    );

    return this.toResponseDto(instance);
  }

  /**
   * 获取流程实例列表（分页）
   */
  async findAll(query: InstanceQueryDto): Promise<PaginatedInstanceResponseDto> {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.createQueryBuilder();

    // 应用查询条件
    this.applyFilters(queryBuilder, query);

    // 分页
    queryBuilder.skip(skip).take(limit);

    // 排序
    queryBuilder.orderBy('instance.startTime', 'DESC');

    const [instances, total] = await queryBuilder.getManyAndCount();

    // 如果需要包含任务信息，额外查询
    let instancesWithTasks = instances;
    if (query.includeTasks) {
      instancesWithTasks = await this.loadInstanceTasks(instances);
    }

    return {
      data: instancesWithTasks.map((instance) =>
        this.toResponseDto(instance, query.includeVariables),
      ),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 根据ID获取流程实例详情
   */
  async findOne(
    id: string,
    includeVariables = true,
    includeTasks = true,
  ): Promise<WorkflowInstanceResponseDto> {
    const instance = await this.findInstanceById(id);

    if (includeTasks) {
      const tasks = await this.taskRepository.find({
        where: { instanceId: id, isDeleted: false },
        relations: ['assignee', 'completer'],
        order: { createdAt: 'ASC' },
      });

      // 临时附加任务数据
      (instance as any).tasks = tasks;
    }

    return this.toResponseDto(instance, includeVariables);
  }

  /**
   * 暂停流程实例
   */
  async suspendInstance(id: string, userId: string): Promise<WorkflowInstanceResponseDto> {
    const instance = await this.findInstanceById(id);

    if (instance.status !== WorkflowInstanceStatus.RUNNING) {
      throw SystemException.businessRuleViolation(
        `只能暂停运行中的流程实例 (当前状态: ${instance.status})`,
      );
    }

    await this.instanceRepository.update(id, {
      status: WorkflowInstanceStatus.SUSPENDED,
    });

    // 暂停所有进行中的任务
    await this.taskRepository.update(
      { instanceId: id, status: WorkflowTaskStatus.IN_PROGRESS },
      { status: WorkflowTaskStatus.WAITING },
    );

    this.logger.log(`✅ 流程实例暂停: ${id} (用户: ${userId})`);

    return this.findOne(id);
  }

  /**
   * 恢复流程实例
   */
  async resumeInstance(id: string, userId: string): Promise<WorkflowInstanceResponseDto> {
    const instance = await this.findInstanceById(id);

    if (instance.status !== WorkflowInstanceStatus.SUSPENDED) {
      throw SystemException.businessRuleViolation(
        `只能恢复已暂停的流程实例 (当前状态: ${instance.status})`,
      );
    }

    await this.instanceRepository.update(id, {
      status: WorkflowInstanceStatus.RUNNING,
    });

    // 恢复等待中的任务
    await this.taskRepository.update(
      { instanceId: id, status: WorkflowTaskStatus.WAITING },
      { status: WorkflowTaskStatus.IN_PROGRESS },
    );

    this.logger.log(`✅ 流程实例恢复: ${id} (用户: ${userId})`);

    // 继续执行流程
    if (instance.currentNodeId) {
      setImmediate(() => this.workflowEngine.executeFromNode(id, instance.currentNodeId));
    }

    return this.findOne(id);
  }

  /**
   * 终止流程实例
   */
  async terminateInstance(
    id: string,
    userId: string,
    reason?: string,
  ): Promise<WorkflowInstanceResponseDto> {
    const instance = await this.findInstanceById(id);

    if (
      instance.status === WorkflowInstanceStatus.COMPLETED ||
      instance.status === WorkflowInstanceStatus.TERMINATED
    ) {
      throw SystemException.businessRuleViolation(
        `流程实例已结束，不能终止 (当前状态: ${instance.status})`,
      );
    }

    const endTime = new Date();
    const durationMs = endTime.getTime() - instance.startTime.getTime();

    await this.instanceRepository.update(id, {
      status: WorkflowInstanceStatus.TERMINATED,
      endTime,
      durationMs,
      errorMessage: reason || '流程被手动终止',
    });

    // 取消所有未完成的任务
    await this.taskRepository.update(
      {
        instanceId: id,
        status: [
          WorkflowTaskStatus.PENDING,
          WorkflowTaskStatus.IN_PROGRESS,
          WorkflowTaskStatus.WAITING,
        ] as any,
      },
      {
        status: WorkflowTaskStatus.CANCELLED,
        completedAt: endTime,
        completionComment: '流程被终止',
      },
    );

    this.logger.log(`✅ 流程实例终止: ${id} (用户: ${userId}, 原因: ${reason})`);

    return this.findOne(id);
  }

  /**
   * 删除流程实例
   */
  async deleteInstance(id: string, userId: string): Promise<void> {
    const instance = await this.findInstanceById(id);

    if (instance.status === WorkflowInstanceStatus.RUNNING) {
      throw SystemException.businessRuleViolation('不能删除运行中的流程实例，请先终止');
    }

    // 软删除实例和相关任务
    await this.instanceRepository.update(id, { isDeleted: true });
    await this.taskRepository.update({ instanceId: id }, { isDeleted: true });

    this.logger.log(`✅ 流程实例删除: ${id} (用户: ${userId})`);
  }

  /**
   * 获取流程实例统计信息
   */
  async getStatistics(definitionId?: string): Promise<Record<string, number>> {
    const query = this.instanceRepository
      .createQueryBuilder('instance')
      .select('instance.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('instance.isDeleted = :isDeleted', { isDeleted: false });

    if (definitionId) {
      query.andWhere('instance.definitionId = :definitionId', { definitionId });
    }

    query.groupBy('instance.status');

    const results = await query.getRawMany();

    const statistics: Record<string, number> = {};
    for (const result of results) {
      statistics[result.status] = parseInt(result.count, 10);
    }

    return statistics;
  }

  /**
   * 获取流程实例执行历史
   */
  async getExecutionHistory(id: string): Promise<any[]> {
    const instance = await this.findInstanceById(id);
    return instance.executionPath || [];
  }

  /**
   * 更新流程实例变量
   */
  async updateVariables(
    id: string,
    variables: Record<string, any>,
    userId: string,
  ): Promise<WorkflowInstanceResponseDto> {
    const instance = await this.findInstanceById(id);

    const updatedVariables = { ...instance.variables, ...variables };

    await this.instanceRepository.update(id, {
      variables: updatedVariables,
    });

    this.logger.log(`✅ 流程实例变量更新: ${id} (用户: ${userId})`);

    return this.findOne(id);
  }

  /**
   * 根据业务键查找流程实例
   */
  async findByBusinessKey(businessKey: string): Promise<WorkflowInstanceResponseDto[]> {
    const instances = await this.instanceRepository.find({
      where: { businessKey, isDeleted: false },
      relations: ['definition', 'starter'],
      order: { startTime: 'DESC' },
    });

    return instances.map((instance) => this.toResponseDto(instance));
  }

  /**
   * 重启失败的流程实例
   */
  async retryInstance(id: string, userId: string): Promise<WorkflowInstanceResponseDto> {
    const instance = await this.findInstanceById(id);

    if (instance.status !== WorkflowInstanceStatus.ERROR) {
      throw SystemException.businessRuleViolation(
        `只能重试错误状态的流程实例 (当前状态: ${instance.status})`,
      );
    }

    await this.instanceRepository.update(id, {
      status: WorkflowInstanceStatus.RUNNING,
      errorMessage: null,
      errorStack: null,
    });

    this.logger.log(`✅ 流程实例重试: ${id} (用户: ${userId})`);

    // 从当前节点继续执行
    if (instance.currentNodeId) {
      setImmediate(() => this.workflowEngine.executeFromNode(id, instance.currentNodeId));
    }

    return this.findOne(id);
  }

  /**
   * 根据ID查找流程实例（包含关联数据）
   */
  private async findInstanceById(id: string): Promise<WorkflowInstance> {
    const instance = await this.instanceRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['definition', 'starter'],
    });

    if (!instance) {
      throw SystemException.dataNotFound(`流程实例不存在 (ID: ${id})`);
    }

    return instance;
  }

  /**
   * 创建查询构建器
   */
  private createQueryBuilder(): SelectQueryBuilder<WorkflowInstance> {
    return this.instanceRepository
      .createQueryBuilder('instance')
      .leftJoinAndSelect('instance.definition', 'definition')
      .leftJoinAndSelect('instance.starter', 'starter')
      .where('instance.isDeleted = :isDeleted', { isDeleted: false });
  }

  /**
   * 应用查询过滤条件
   */
  private applyFilters(
    queryBuilder: SelectQueryBuilder<WorkflowInstance>,
    query: InstanceQueryDto,
  ): void {
    if (query.definitionId) {
      queryBuilder.andWhere('instance.definitionId = :definitionId', {
        definitionId: query.definitionId,
      });
    }

    if (query.status) {
      queryBuilder.andWhere('instance.status = :status', { status: query.status });
    }

    if (query.startedBy) {
      queryBuilder.andWhere('instance.startedBy = :startedBy', { startedBy: query.startedBy });
    }

    if (query.businessKey) {
      queryBuilder.andWhere('instance.businessKey ILIKE :businessKey', {
        businessKey: `%${query.businessKey}%`,
      });
    }

    if (query.currentNodeId) {
      queryBuilder.andWhere('instance.currentNodeId = :currentNodeId', {
        currentNodeId: query.currentNodeId,
      });
    }

    if (query.startTimeFrom) {
      queryBuilder.andWhere('instance.startTime >= :startTimeFrom', {
        startTimeFrom: new Date(query.startTimeFrom),
      });
    }

    if (query.startTimeTo) {
      queryBuilder.andWhere('instance.startTime <= :startTimeTo', {
        startTimeTo: new Date(query.startTimeTo),
      });
    }
  }

  /**
   * 加载实例的任务信息
   */
  private async loadInstanceTasks(instances: WorkflowInstance[]): Promise<WorkflowInstance[]> {
    const instanceIds = instances.map((instance) => instance.id);

    if (instanceIds.length === 0) {
      return instances;
    }

    const tasks = await this.taskRepository.find({
      where: { instanceId: instanceIds as any, isDeleted: false },
      relations: ['assignee', 'completer'],
      order: { createdAt: 'ASC' },
    });

    // 将任务按实例ID分组
    const tasksByInstance = tasks.reduce(
      (acc, task) => {
        if (!acc[task.instanceId]) {
          acc[task.instanceId] = [];
        }
        acc[task.instanceId].push(task);
        return acc;
      },
      {} as unknown as Record<string, WorkflowTask[]>,
    );

    // 将任务附加到对应的实例
    instances.forEach((instance) => {
      // eslint-disable-next-line no-param-reassign
      (instance as any).tasks = tasksByInstance[instance.id] || [];
    });

    return instances;
  }

  /**
   * 转换为响应DTO
   */
  private toResponseDto(
    instance: WorkflowInstance,
    includeVariables = true,
  ): WorkflowInstanceResponseDto {
    const response: WorkflowInstanceResponseDto = {
      id: instance.id,
      definitionId: instance.definitionId,
      definitionVersion: instance.definitionVersion,
      businessKey: instance.businessKey,
      status: instance.status,
      currentNodeId: instance.currentNodeId,
      variables: includeVariables ? instance.variables : {},
      executionPath: instance.executionPath || [],
      startedBy: instance.startedBy,
      startTime: instance.startTime,
      endTime: instance.endTime,
      durationMs: instance.durationMs,
      errorMessage: instance.errorMessage,
      priority: instance.priority,
      parentInstanceId: instance.parentInstanceId,
      rootInstanceId: instance.rootInstanceId,
      createdAt: instance.createdAt,
      updatedAt: instance.updatedAt,
    };

    // 添加关联数据
    if ((instance as any).definition) {
      response.definition = {
        id: (instance as any).definition.id,
        name: (instance as any).definition.name,
        version: (instance as any).definition.version,
      };
    }

    if ((instance as any).starter) {
      response.starter = {
        id: (instance as any).starter.id,
        email: (instance as any).starter.email,
      };
    }

    if ((instance as any).tasks) {
      response.tasks = (instance as any).tasks.map(this.toTaskResponseDto);
    }

    return response;
  }

  /**
   * 转换任务为响应DTO
   */
  private toTaskResponseDto(task: WorkflowTask): any {
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
