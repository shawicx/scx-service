import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemException } from '@/common/exceptions';
import { WorkflowInstance } from '../entities/workflow-instance.entity';
import { WorkflowTask } from '../entities/workflow-task.entity';
import { WorkflowDefinition } from '@/workflow/definitions/entities/workflow-definition.entity';
import { WorkflowInstanceStatus } from '../enums/instance-status.enum';
import { WorkflowTaskStatus, WorkflowTaskType } from '../enums/task-status.enum';
import { NodeExecutorService } from './node-executor.service';
import { TaskEngineService } from './task-engine.service';

interface ExecutionContext {
  instance: WorkflowInstance;
  definition: any;
  currentNode: any;
  variables: Record<string, any>;
  executionPath: Array<{
    nodeId: string;
    nodeName: string;
    timestamp: Date;
    variables?: Record<string, any>;
    result?: any;
  }>;
}

@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(
    @InjectRepository(WorkflowInstance)
    private readonly instanceRepository: Repository<WorkflowInstance>,
    @InjectRepository(WorkflowTask)
    private readonly taskRepository: Repository<WorkflowTask>,
    @InjectRepository(WorkflowDefinition)
    private readonly definitionRepository: Repository<WorkflowDefinition>,
    private readonly nodeExecutor: NodeExecutorService,
    private readonly taskEngine: TaskEngineService,
  ) {}

  /**
   * 启动流程实例
   */
  async startInstance(
    definitionId: string,
    variables: Record<string, any> = {},
    startedBy: string,
    businessKey?: string,
    priority = 50,
    startParams: Record<string, any> = {},
  ): Promise<WorkflowInstance> {
    // 获取流程定义
    const definition = await this.definitionRepository.findOne({
      where: { id: definitionId, isDeleted: false },
    });

    if (!definition) {
      throw SystemException.dataNotFound(`流程定义不存在 (ID: ${definitionId})`);
    }

    if (definition.status !== 'published') {
      throw SystemException.businessRuleViolation('只能启动已发布的流程定义');
    }

    // 查找开始节点
    const startNode = this.findStartNode(definition.definition);
    if (!startNode) {
      throw SystemException.invalidParameter('流程定义中没有找到开始节点');
    }

    // 创建流程实例
    const instance = this.instanceRepository.create({
      definitionId: definition.id,
      definitionVersion: definition.version,
      businessKey,
      status: WorkflowInstanceStatus.RUNNING,
      currentNodeId: startNode.id,
      variables: { ...variables, ...startParams },
      executionPath: [
        {
          nodeId: startNode.id,
          nodeName: startNode.name,
          timestamp: new Date(),
          variables: { ...variables, ...startParams },
        },
      ],
      startedBy,
      startTime: new Date(),
      priority,
    });

    const savedInstance = await this.instanceRepository.save(instance);

    this.logger.log(`✅ 流程实例启动成功: ${definition.name} (实例ID: ${savedInstance.id})`);

    // 异步执行流程（从开始节点的下一个节点开始）
    setImmediate(() => this.executeFromNode(savedInstance.id, startNode.id));

    return savedInstance;
  }

  /**
   * 从指定节点继续执行流程
   */
  async executeFromNode(instanceId: string, fromNodeId: string): Promise<void> {
    try {
      const instance = await this.instanceRepository.findOne({
        where: { id: instanceId },
      });

      if (!instance) {
        throw SystemException.dataNotFound(`流程实例不存在 (ID: ${instanceId})`);
      }

      if (instance.status !== WorkflowInstanceStatus.RUNNING) {
        this.logger.warn(
          `流程实例状态不是运行中，跳过执行: ${instanceId} (状态: ${instance.status})`,
        );
        return;
      }

      // 获取流程定义
      const definition = await this.definitionRepository.findOne({
        where: { id: instance.definitionId },
      });

      if (!definition) {
        throw SystemException.dataNotFound(`流程定义不存在 (ID: ${instance.definitionId})`);
      }

      // 构建执行上下文
      const context: ExecutionContext = {
        instance,
        definition: definition.definition,
        currentNode: null,
        variables: instance.variables,
        executionPath: [...instance.executionPath],
      };

      // 查找下一个要执行的节点
      const nextNodes = this.findNextNodes(context.definition, fromNodeId);

      for (const nextNode of nextNodes) {
        await this.executeNode(context, nextNode);
      }
    } catch (error) {
      this.logger.error(`流程执行失败: ${instanceId}`, error.stack);
      await this.handleExecutionError(instanceId, error);
    }
  }

  /**
   * 执行单个节点
   */
  private async executeNode(context: ExecutionContext, node: any): Promise<void> {
    context.currentNode = node;

    this.logger.debug(`执行节点: ${node.id} (${node.name}) - 类型: ${node.type}`);

    // 添加到执行路径
    context.executionPath.push({
      nodeId: node.id,
      nodeName: node.name,
      timestamp: new Date(),
      variables: { ...context.variables },
    });

    let executionResult: any = null;

    try {
      // 根据节点类型执行相应逻辑
      switch (node.type) {
        case 'start':
          // 开始节点，直接继续
          break;

        case 'end':
          // 结束节点，完成流程
          await this.completeInstance(context.instance);
          return;

        case 'userTask':
          // 用户任务，创建任务后暂停执行
          await this.createUserTask(context, node);
          return; // 等待用户完成任务

        case 'serviceTask':
        case 'scriptTask':
          // 服务任务/脚本任务，自动执行
          executionResult = await this.nodeExecutor.executeServiceTask(context, node);
          break;

        case 'exclusiveGateway': {
          // 排他网关，根据条件选择一条路径
          const selectedPath = await this.evaluateGatewayConditions(context, node);
          if (selectedPath) {
            await this.executeNode(context, selectedPath);
          }
          return;
        }

        case 'parallelGateway':
          // 并行网关，创建多个并行分支
          await this.handleParallelGateway(context, node);
          return;

        case 'inclusiveGateway':
          // 包容网关，根据条件创建多个分支
          await this.handleInclusiveGateway(context, node);
          return;

        default:
          this.logger.warn(`未知的节点类型: ${node.type} (节点ID: ${node.id})`);
      }

      // 更新执行结果
      context.executionPath[context.executionPath.length - 1].result = executionResult;

      // 保存实例状态
      await this.updateInstanceState(context);

      // 继续执行下一个节点
      const nextNodes = this.findNextNodes(context.definition, node.id);
      for (const nextNode of nextNodes) {
        await this.executeNode(context, nextNode);
      }
    } catch (error) {
      this.logger.error(`节点执行失败: ${node.id} (${node.name})`, error.stack);

      // 记录错误到执行路径
      context.executionPath[context.executionPath.length - 1].result = {
        error: error.message,
        stack: error.stack,
      };

      throw error;
    }
  }

  /**
   * 创建用户任务
   */
  private async createUserTask(context: ExecutionContext, node: any): Promise<void> {
    const task = this.taskRepository.create({
      instanceId: context.instance.id,
      nodeId: node.id,
      nodeName: node.name,
      type: WorkflowTaskType.USER_TASK,
      status: WorkflowTaskStatus.PENDING,
      description: node.config?.description,
      formKey: node.config?.formKey,
      formData: node.config?.formData || {},
      taskVariables: node.config?.variables || {},
      candidateUsers: node.config?.candidateUsers || [],
      candidateGroups: node.config?.candidateGroups || [],
      priority: node.config?.priority || context.instance.priority,
      dueDate: node.config?.dueDate ? new Date(node.config.dueDate) : null,
      executionContext: {
        variables: context.variables,
        nodePath: context.executionPath.map((p) => p.nodeId),
      },
    });

    await this.taskRepository.save(task);

    // 更新实例当前节点
    context.instance.currentNodeId = node.id;
    await this.updateInstanceState(context);

    // 尝试自动分配任务
    await this.taskEngine.autoAssignTask(task.id);

    this.logger.log(`✅ 用户任务创建成功: ${node.name} (任务ID: ${task.id})`);
  }

  /**
   * 完成流程实例
   */
  private async completeInstance(instance: WorkflowInstance): Promise<void> {
    const endTime = new Date();
    const durationMs = endTime.getTime() - instance.startTime.getTime();

    await this.instanceRepository.update(instance.id, {
      status: WorkflowInstanceStatus.COMPLETED,
      endTime,
      durationMs,
      currentNodeId: null,
    });

    this.logger.log(`✅ 流程实例完成: ${instance.id} (耗时: ${durationMs}ms)`);
  }

  /**
   * 处理执行错误
   */
  private async handleExecutionError(instanceId: string, error: any): Promise<void> {
    await this.instanceRepository.update(instanceId, {
      status: WorkflowInstanceStatus.ERROR,
      errorMessage: error.message,
      errorStack: error.stack,
    });
  }

  /**
   * 更新实例状态
   */
  private async updateInstanceState(context: ExecutionContext): Promise<void> {
    await this.instanceRepository.update(context.instance.id, {
      variables: context.variables,
      executionPath: context.executionPath,
      currentNodeId: context.instance.currentNodeId,
    });
  }

  /**
   * 查找开始节点
   */
  private findStartNode(definition: any): any {
    return definition.nodes?.find((node: any) => node.type === 'start');
  }

  /**
   * 查找下一个节点
   */
  private findNextNodes(definition: any, currentNodeId: string): any[] {
    const edges = definition.edges?.filter((edge: any) => edge.source === currentNodeId) || [];
    return edges
      .map((edge: any) => definition.nodes?.find((node: any) => node.id === edge.target))
      .filter(Boolean);
  }

  /**
   * 评估网关条件
   */
  private async evaluateGatewayConditions(context: ExecutionContext, gateway: any): Promise<any> {
    // 这里实现条件表达式评估逻辑
    // 可以使用表达式引擎如 expr-eval 或自定义解析器
    const outgoingEdges =
      context.definition.edges?.filter((edge: any) => edge.source === gateway.id) || [];

    for (const edge of outgoingEdges) {
      if (this.evaluateCondition(edge.condition, context.variables)) {
        return context.definition.nodes?.find((node: any) => node.id === edge.target);
      }
    }

    return null;
  }

  /**
   * 简单条件评估（可扩展为更复杂的表达式引擎）
   */
  private evaluateCondition(condition: string, variables: Record<string, any>): boolean {
    if (!condition) return true;

    try {
      // 简单的条件评估实现
      // 实际项目中可以使用 expr-eval 等表达式引擎
      // eslint-disable-next-line no-new-func
      const func = new Function('variables', `with(variables) { return ${condition}; }`);
      return func(variables);
    } catch (error) {
      this.logger.warn(`条件表达式评估失败: ${condition}`, error.message);
      return false;
    }
  }

  /**
   * 处理并行网关
   */
  private async handleParallelGateway(context: ExecutionContext, gateway: any): Promise<void> {
    // 并行网关逻辑：创建多个并行执行分支
    const nextNodes = this.findNextNodes(context.definition, gateway.id);

    // 并行执行所有分支
    const promises = nextNodes.map((node) => this.executeNode({ ...context }, node));
    await Promise.all(promises);
  }

  /**
   * 处理包容网关
   */
  private async handleInclusiveGateway(context: ExecutionContext, gateway: any): Promise<void> {
    // 包容网关逻辑：根据条件选择性创建分支
    const outgoingEdges =
      context.definition.edges?.filter((edge: any) => edge.source === gateway.id) || [];

    const validBranches = [];
    for (const edge of outgoingEdges) {
      if (this.evaluateCondition(edge.condition, context.variables)) {
        const targetNode = context.definition.nodes?.find((node: any) => node.id === edge.target);
        if (targetNode) {
          validBranches.push(targetNode);
        }
      }
    }

    // 并行执行所有有效分支
    const promises = validBranches.map((node) => this.executeNode({ ...context }, node));
    await Promise.all(promises);
  }
}
