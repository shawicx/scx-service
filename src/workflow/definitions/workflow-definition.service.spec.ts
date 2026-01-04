import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WorkflowDefinitionService } from './workflow-definition.service';
import {
  WorkflowDefinition,
  WorkflowDefinitionStatus,
} from './entities/workflow-definition.entity';
import { SystemException } from '@/common/exceptions';

describe('WorkflowDefinitionService', () => {
  let service: WorkflowDefinitionService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowDefinitionService,
        {
          provide: getRepositoryToken(WorkflowDefinition),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<WorkflowDefinitionService>(WorkflowDefinitionService);

    // 重置所有mock
    jest.clearAllMocks();
    mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      name: '测试流程',
      description: '这是一个测试流程',
      definition: {
        nodes: [
          { id: 'start', type: 'start', name: '开始' },
          { id: 'end', type: 'end', name: '结束' },
        ],
        edges: [{ source: 'start', target: 'end' }],
      },
    };

    it('应该成功创建流程定义', async () => {
      const userId = 'user-123';
      const savedDefinition = {
        id: 'def-123',
        ...createDto,
        version: 1,
        status: WorkflowDefinitionStatus.DRAFT,
        createdBy: userId,
        updatedBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      };

      mockRepository.findOne.mockResolvedValue(null); // 名称不重复
      mockRepository.create.mockReturnValue(savedDefinition);
      mockRepository.save.mockResolvedValue(savedDefinition);

      const result = await service.create(createDto, userId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { name: createDto.name, isDeleted: false },
      });
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createDto,
        createdBy: userId,
        updatedBy: userId,
        version: 1,
        status: WorkflowDefinitionStatus.DRAFT,
      });
      expect(result.name).toBe(createDto.name);
      expect(result.status).toBe(WorkflowDefinitionStatus.DRAFT);
    });

    it('应该在名称重复时抛出异常', async () => {
      const userId = 'user-123';
      const existingDefinition = { id: 'existing-def' };

      mockRepository.findOne.mockResolvedValue(existingDefinition);

      await expect(service.create(createDto, userId)).rejects.toThrow(SystemException);
    });

    it('应该在流程定义格式错误时抛出异常', async () => {
      const userId = 'user-123';
      const invalidDto = {
        ...createDto,
        definition: { invalid: 'structure' }, // 缺少必要的nodes和edges
      };

      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.create(invalidDto, userId)).rejects.toThrow(SystemException);
    });
  });

  describe('findAll', () => {
    it('应该返回分页的流程定义列表', async () => {
      const query = { page: 1, limit: 10 };
      const definitions = [
        {
          id: 'def-1',
          name: '流程1',
          status: WorkflowDefinitionStatus.DRAFT,
        },
        {
          id: 'def-2',
          name: '流程2',
          status: WorkflowDefinitionStatus.PUBLISHED,
        },
      ];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([definitions, 2]);

      const result = await service.findAll(query);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('应该支持搜索过滤', async () => {
      const query = { page: 1, limit: 10, search: '测试' };

      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(query);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(definition.name ILIKE :search OR definition.description ILIKE :search)',
        { search: '%测试%' },
      );
    });
  });

  describe('publish', () => {
    it('应该成功发布流程定义', async () => {
      const definitionId = 'def-123';
      const userId = 'user-123';
      const definition = {
        id: definitionId,
        name: '测试流程',
        status: WorkflowDefinitionStatus.DRAFT,
        definition: {
          nodes: [
            { id: 'start', type: 'start', name: '开始' },
            { id: 'end', type: 'end', name: '结束' },
          ],
          edges: [{ source: 'start', target: 'end' }],
        },
      };

      mockRepository.findOne.mockResolvedValue(definition);
      mockRepository.save.mockResolvedValue({
        ...definition,
        status: WorkflowDefinitionStatus.PUBLISHED,
      });

      const result = await service.publish(definitionId, userId);

      expect(result.status).toBe(WorkflowDefinitionStatus.PUBLISHED);
      expect(mockRepository.save).toHaveBeenCalledWith({
        ...definition,
        status: WorkflowDefinitionStatus.PUBLISHED,
        updatedBy: userId,
      });
    });

    it('应该在流程定义已发布时抛出异常', async () => {
      const definitionId = 'def-123';
      const userId = 'user-123';
      const definition = {
        id: definitionId,
        status: WorkflowDefinitionStatus.PUBLISHED,
      };

      mockRepository.findOne.mockResolvedValue(definition);

      await expect(service.publish(definitionId, userId)).rejects.toThrow(SystemException);
    });
  });

  describe('archive', () => {
    it('应该成功归档流程定义', async () => {
      const definitionId = 'def-123';
      const userId = 'user-123';
      const definition = {
        id: definitionId,
        name: '测试流程',
        status: WorkflowDefinitionStatus.PUBLISHED,
      };

      mockRepository.findOne.mockResolvedValue(definition);
      mockRepository.save.mockResolvedValue({
        ...definition,
        status: WorkflowDefinitionStatus.ARCHIVED,
      });

      const result = await service.archive(definitionId, userId);

      expect(result.status).toBe(WorkflowDefinitionStatus.ARCHIVED);
    });
  });

  describe('remove', () => {
    it('应该成功软删除草稿状态的流程定义', async () => {
      const definitionId = 'def-123';
      const userId = 'user-123';
      const definition = {
        id: definitionId,
        name: '测试流程',
        status: WorkflowDefinitionStatus.DRAFT,
        isDeleted: false,
      };

      mockRepository.findOne.mockResolvedValue(definition);
      mockRepository.save.mockResolvedValue({
        ...definition,
        isDeleted: true,
      });

      await service.remove(definitionId, userId);

      expect(mockRepository.save).toHaveBeenCalledWith({
        ...definition,
        isDeleted: true,
        updatedBy: userId,
      });
    });

    it('应该在尝试删除已发布的流程定义时抛出异常', async () => {
      const definitionId = 'def-123';
      const userId = 'user-123';
      const definition = {
        id: definitionId,
        status: WorkflowDefinitionStatus.PUBLISHED,
      };

      mockRepository.findOne.mockResolvedValue(definition);

      await expect(service.remove(definitionId, userId)).rejects.toThrow(SystemException);
    });
  });
});
