import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { SystemException } from '@/common/exceptions';
import {
  WorkflowDefinition,
  WorkflowDefinitionStatus,
} from './entities/workflow-definition.entity';
import { CreateWorkflowDefinitionDto } from './dto/create-workflow-definition.dto';
import { UpdateWorkflowDefinitionDto } from './dto/update-workflow-definition.dto';
import { WorkflowDefinitionQueryDto } from './dto/workflow-definition-query.dto';
import {
  WorkflowDefinitionResponseDto,
  PaginatedWorkflowDefinitionResponseDto,
} from './dto/workflow-definition-response.dto';
import { validateDefinition } from './schemas/workflow-definition.schema';

@Injectable()
export class WorkflowDefinitionService {
  private readonly logger = new Logger(WorkflowDefinitionService.name);

  constructor(
    @InjectRepository(WorkflowDefinition)
    private readonly workflowDefinitionRepository: Repository<WorkflowDefinition>,
  ) {}

  /**
   * 创建流程定义
   */
  async create(
    createDto: CreateWorkflowDefinitionDto,
    userId: string,
  ): Promise<WorkflowDefinitionResponseDto> {
    // 验证流程定义JSON结构
    const validation = validateDefinition(createDto.definition);
    if (!validation.valid) {
      throw SystemException.invalidParameter(
        `流程定义格式错误: ${validation.errors?.map((e) => e.message || e).join(', ')}`,
        { validationErrors: validation.errors },
      );
    }

    // 检查同名流程定义是否存在
    const existingDefinition = await this.workflowDefinitionRepository.findOne({
      where: { name: createDto.name, isDeleted: false },
    });

    if (existingDefinition) {
      throw SystemException.resourceExists(`流程定义 "${createDto.name}" 已存在`);
    }

    // 创建流程定义
    const workflowDefinition = this.workflowDefinitionRepository.create({
      ...createDto,
      createdBy: userId,
      updatedBy: userId,
      version: 1,
      status: WorkflowDefinitionStatus.DRAFT,
    });

    const savedDefinition = await this.workflowDefinitionRepository.save(workflowDefinition);

    this.logger.log(`✅ 流程定义创建成功: ${savedDefinition.name} (ID: ${savedDefinition.id})`);

    return this.toResponseDto(savedDefinition);
  }

  /**
   * 获取流程定义列表（分页）
   */
  async findAll(
    query: WorkflowDefinitionQueryDto,
  ): Promise<PaginatedWorkflowDefinitionResponseDto> {
    const { page = 1, limit = 10, search, status, createdBy } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.createQueryBuilder();

    // 搜索条件
    if (search) {
      queryBuilder.andWhere(
        '(definition.name ILIKE :search OR definition.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      queryBuilder.andWhere('definition.status = :status', { status });
    }

    if (createdBy) {
      queryBuilder.andWhere('definition.createdBy = :createdBy', { createdBy });
    }

    // 分页
    queryBuilder.skip(skip).take(limit);

    // 排序
    queryBuilder.orderBy('definition.updatedAt', 'DESC');

    const [definitions, total] = await queryBuilder.getManyAndCount();

    return {
      data: definitions.map((def) => this.toResponseDto(def)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 根据ID获取流程定义详情
   */
  async findOne(id: string): Promise<WorkflowDefinitionResponseDto> {
    const definition = await this.findDefinitionById(id);
    return this.toResponseDto(definition);
  }

  /**
   * 更新流程定义
   */
  async update(
    id: string,
    updateDto: UpdateWorkflowDefinitionDto,
    userId: string,
  ): Promise<WorkflowDefinitionResponseDto> {
    const definition = await this.findDefinitionById(id);

    // 已发布的流程定义不能编辑
    if (definition.status === WorkflowDefinitionStatus.PUBLISHED) {
      throw SystemException.businessRuleViolation('已发布的流程定义不能编辑，请创建新版本');
    }

    // 如果更新了定义内容，需要验证
    if (updateDto.definition) {
      const validation = validateDefinition(updateDto.definition);
      if (!validation.valid) {
        throw SystemException.invalidParameter(
          `流程定义格式错误: ${validation.errors?.map((e) => e.message || e).join(', ')}`,
          { validationErrors: validation.errors },
        );
      }
    }

    // 检查名称重复（排除自己）
    if (updateDto.name && updateDto.name !== definition.name) {
      const existingDefinition = await this.workflowDefinitionRepository.findOne({
        where: { name: updateDto.name, isDeleted: false },
      });

      if (existingDefinition && existingDefinition.id !== id) {
        throw SystemException.resourceExists(`流程定义 "${updateDto.name}" 已存在`);
      }
    }

    // 更新流程定义
    Object.assign(definition, updateDto, { updatedBy: userId });
    const updatedDefinition = await this.workflowDefinitionRepository.save(definition);

    this.logger.log(`✅ 流程定义更新成功: ${updatedDefinition.name} (ID: ${updatedDefinition.id})`);

    return this.toResponseDto(updatedDefinition);
  }

  /**
   * 发布流程定义
   */
  async publish(id: string, userId: string): Promise<WorkflowDefinitionResponseDto> {
    const definition = await this.findDefinitionById(id);

    if (definition.status === WorkflowDefinitionStatus.PUBLISHED) {
      throw SystemException.businessRuleViolation('流程定义已经是发布状态');
    }

    if (definition.status === WorkflowDefinitionStatus.ARCHIVED) {
      throw SystemException.businessRuleViolation('已归档的流程定义不能发布');
    }

    // 验证流程定义是否完整
    const validation = validateDefinition(definition.definition);
    if (!validation.valid) {
      throw SystemException.invalidParameter(
        `流程定义格式错误，无法发布: ${validation.errors?.map((e) => e.message || e).join(', ')}`,
        { validationErrors: validation.errors },
      );
    }

    // 发布流程定义
    definition.status = WorkflowDefinitionStatus.PUBLISHED;
    definition.updatedBy = userId;

    const publishedDefinition = await this.workflowDefinitionRepository.save(definition);

    this.logger.log(
      `✅ 流程定义发布成功: ${publishedDefinition.name} (ID: ${publishedDefinition.id})`,
    );

    return this.toResponseDto(publishedDefinition);
  }

  /**
   * 归档流程定义
   */
  async archive(id: string, userId: string): Promise<WorkflowDefinitionResponseDto> {
    const definition = await this.findDefinitionById(id);

    if (definition.status === WorkflowDefinitionStatus.ARCHIVED) {
      throw SystemException.businessRuleViolation('流程定义已经是归档状态');
    }

    // 归档流程定义
    definition.status = WorkflowDefinitionStatus.ARCHIVED;
    definition.updatedBy = userId;

    const archivedDefinition = await this.workflowDefinitionRepository.save(definition);

    this.logger.log(
      `✅ 流程定义归档成功: ${archivedDefinition.name} (ID: ${archivedDefinition.id})`,
    );

    return this.toResponseDto(archivedDefinition);
  }

  /**
   * 获取流程定义版本历史
   */
  async getVersions(definitionId: string): Promise<WorkflowDefinitionResponseDto[]> {
    // 先获取当前定义以确保存在
    await this.findDefinitionById(definitionId);

    // 获取同名的所有版本（按版本号排序）
    const definition = await this.workflowDefinitionRepository.findOne({
      where: { id: definitionId },
      select: ['name'],
    });

    const versions = await this.workflowDefinitionRepository.find({
      where: { name: definition.name, isDeleted: false },
      relations: ['creator', 'updater'],
      order: { version: 'DESC' },
    });

    return versions.map((version) => this.toResponseDto(version));
  }

  /**
   * 软删除流程定义
   */
  async remove(id: string, userId: string): Promise<void> {
    const definition = await this.findDefinitionById(id);

    if (definition.status === WorkflowDefinitionStatus.PUBLISHED) {
      throw SystemException.businessRuleViolation('已发布的流程定义不能删除，请先归档');
    }

    // 软删除
    definition.isDeleted = true;
    definition.updatedBy = userId;

    await this.workflowDefinitionRepository.save(definition);

    this.logger.log(`✅ 流程定义删除成功: ${definition.name} (ID: ${definition.id})`);
  }

  /**
   * 根据ID查找流程定义（包含关联数据）
   */
  private async findDefinitionById(id: string): Promise<WorkflowDefinition> {
    const definition = await this.workflowDefinitionRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['creator', 'updater'],
    });

    if (!definition) {
      throw SystemException.dataNotFound(`流程定义不存在 (ID: ${id})`);
    }

    return definition;
  }

  /**
   * 创建查询构建器
   */
  private createQueryBuilder(): SelectQueryBuilder<WorkflowDefinition> {
    return this.workflowDefinitionRepository
      .createQueryBuilder('definition')
      .leftJoinAndSelect('definition.creator', 'creator')
      .leftJoinAndSelect('definition.updater', 'updater')
      .where('definition.isDeleted = :isDeleted', { isDeleted: false });
  }

  /**
   * 转换为响应DTO
   */
  private toResponseDto(definition: WorkflowDefinition): WorkflowDefinitionResponseDto {
    return {
      id: definition.id,
      name: definition.name,
      description: definition.description,
      definition: definition.definition,
      version: definition.version,
      status: definition.status,
      createdBy: definition.createdBy,
      updatedBy: definition.updatedBy,
      createdAt: definition.createdAt,
      updatedAt: definition.updatedAt,
      creator: definition.creator
        ? {
            id: definition.creator.id,
            email: definition.creator.email,
          }
        : undefined,
      updater: definition.updater
        ? {
            id: definition.updater.id,
            email: definition.updater.email,
          }
        : undefined,
    };
  }
}
