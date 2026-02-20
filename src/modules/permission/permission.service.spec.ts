import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  CreatePermissionDto,
  PermissionMenuTreeDto,
  PermissionQueryDto,
  PermissionResponseDto,
  UpdatePermissionDto,
} from './dto/permission.dto';
import { Permission } from './entities/permission.entity';
import { PermissionService } from './permission.service';
import { RolePermission } from '../role-permission/entities/role-permission.entity';

describe('PermissionService', () => {
  let permissionService: PermissionService;

  const mockPermissionRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockRolePermissionRepository = {
    count: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionService,
        {
          provide: getRepositoryToken(Permission),
          useValue: mockPermissionRepository,
        },
        {
          provide: getRepositoryToken(RolePermission),
          useValue: mockRolePermissionRepository,
        },
      ],
    }).compile();

    permissionService = module.get<PermissionService>(PermissionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateLevel', () => {
    it('should return level 1 for top-level menu without parent', async () => {
      mockPermissionRepository.findOne.mockResolvedValue(null);

      const level = await permissionService.calculateLevel(null, 'MENU');
      expect(level).toBe(1);
    });

    it('should throw error for button without parent', async () => {
      await expect(permissionService.calculateLevel(null, 'BUTTON')).rejects.toThrow();
    });

    it('should return level 2 for second-level menu under level 1 menu', async () => {
      const mockParent = { id: '1', level: 1 };
      mockPermissionRepository.findOne.mockResolvedValue(mockParent);

      const level = await permissionService.calculateLevel('1', 'MENU');
      expect(level).toBe(2);
    });

    it('should return level 3 for button under level 2 menu', async () => {
      const mockParent = { id: '1', level: 2 };
      mockPermissionRepository.findOne.mockResolvedValue(mockParent);

      const level = await permissionService.calculateLevel('1', 'BUTTON');
      expect(level).toBe(3);
    });

    it('should return level 2 for button under level 1 menu', async () => {
      const mockParent = { id: '1', level: 1 };
      mockPermissionRepository.findOne.mockResolvedValue(mockParent);

      const level = await permissionService.calculateLevel('1', 'BUTTON');
      expect(level).toBe(2);
    });

    it('should throw error for second-level menu not under level 1 menu', async () => {
      const mockParent = { id: '1', level: 2 };
      mockPermissionRepository.findOne.mockResolvedValue(mockParent);

      await expect(permissionService.calculateLevel('1', 'MENU')).rejects.toThrow();
    });

    it('should throw error if parent not found', async () => {
      mockPermissionRepository.findOne.mockResolvedValue(null);

      await expect(permissionService.calculateLevel('nonexistent', 'MENU')).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('should create a top-level menu successfully', async () => {
      const createPermissionDto: CreatePermissionDto = {
        name: 'User Management',
        type: 'MENU',
        path: '/user',
        icon: 'UserOutlined',
        sort: 1,
      };

      const mockSavedPermission = {
        id: '1',
        ...createPermissionDto,
        level: 1,
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPermissionRepository.create.mockReturnValue(mockSavedPermission);
      mockPermissionRepository.save.mockResolvedValue(mockSavedPermission);

      const result = await permissionService.create(createPermissionDto);

      expect(result).toBeInstanceOf(PermissionResponseDto);
      expect(result.level).toBe(1);
      expect(result.name).toBe('User Management');
    });

    it('should create a second-level menu successfully', async () => {
      const createPermissionDto: CreatePermissionDto = {
        name: 'User List',
        type: 'MENU',
        parentId: '1',
        path: '/user/list',
      };

      const mockParent = { id: '1', level: 1 };
      const mockSavedPermission = {
        id: '2',
        ...createPermissionDto,
        level: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPermissionRepository.findOne.mockResolvedValue(mockParent);
      mockPermissionRepository.create.mockReturnValue(mockSavedPermission);
      mockPermissionRepository.save.mockResolvedValue(mockSavedPermission);

      const result = await permissionService.create(createPermissionDto);

      expect(result.level).toBe(2);
      expect(result.name).toBe('User List');
    });

    it('should create a button successfully', async () => {
      const createPermissionDto: CreatePermissionDto = {
        name: 'Create User',
        type: 'BUTTON',
        parentId: '2',
        action: 'create',
        resource: 'user',
      };

      const mockParent = { id: '2', level: 2 };
      const mockSavedPermission = {
        id: '3',
        ...createPermissionDto,
        level: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPermissionRepository.findOne.mockResolvedValue(mockParent);
      mockPermissionRepository.create.mockReturnValue(mockSavedPermission);
      mockPermissionRepository.save.mockResolvedValue(mockSavedPermission);

      const result = await permissionService.create(createPermissionDto);

      expect(result.level).toBe(3);
      expect(result.name).toBe('Create User');
    });
  });

  describe('findAll', () => {
    it('should return paginated permissions', async () => {
      const mockPermissions = [
        {
          id: '1',
          name: 'User Management',
          type: 'MENU',
          level: 1,
          sort: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'User List',
          type: 'MENU',
          level: 2,
          parentId: '1',
          sort: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockQueryBuilder = {
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockPermissions, 2]),
      };

      mockPermissionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await permissionService.findAll({}, 1, 10);

      expect(result.permissions).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.permissions[0]).toBeInstanceOf(PermissionResponseDto);
    });

    it('should filter by type', async () => {
      const mockQueryBuilder = {
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockPermissionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const queryDto: PermissionQueryDto = {
        type: 'MENU',
        page: 1,
        limit: 10,
      };

      await permissionService.findAll(queryDto, 1, 10);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('permission.type = :type', {
        type: 'MENU',
      });
    });

    it('should filter by level', async () => {
      const mockQueryBuilder = {
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockPermissionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const queryDto: PermissionQueryDto = {
        level: 1,
        page: 1,
        limit: 10,
      };

      await permissionService.findAll(queryDto, 1, 10);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('permission.level = :level', {
        level: 1,
      });
    });
  });

  describe('findById', () => {
    it('should return permission by id', async () => {
      const mockPermission = {
        id: '1',
        name: 'User Management',
        type: 'MENU',
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPermissionRepository.findOne.mockResolvedValue(mockPermission);

      const result = await permissionService.findById('1');

      expect(result).toBeInstanceOf(PermissionResponseDto);
      expect(result.id).toBe('1');
      expect(result.name).toBe('User Management');
    });

    it('should throw error if permission not found', async () => {
      mockPermissionRepository.findOne.mockResolvedValue(null);

      await expect(permissionService.findById('nonexistent')).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update permission successfully', async () => {
      const existingPermission = {
        id: '1',
        name: 'User Management',
        type: 'MENU',
        level: 1,
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatePermissionDto: UpdatePermissionDto = {
        id: '1',
        name: 'User Management Updated',
      };

      const updatedPermission = {
        ...existingPermission,
        name: 'User Management Updated',
      };

      mockPermissionRepository.findOne.mockResolvedValue(existingPermission);
      mockPermissionRepository.save.mockResolvedValue(updatedPermission);

      const result = await permissionService.update('1', updatePermissionDto);

      expect(result.name).toBe('User Management Updated');
    });

    it('should recalculate level when parentId changes', async () => {
      const existingPermission = {
        id: '2',
        name: 'User List',
        type: 'MENU',
        level: 1,
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatePermissionDto: UpdatePermissionDto = {
        id: '2',
        parentId: '1',
      };

      const mockParent = { id: '1', level: 1 };
      const updatedPermission = {
        ...existingPermission,
        parentId: '1',
        level: 2,
      };

      mockPermissionRepository.findOne
        .mockResolvedValueOnce(existingPermission)
        .mockResolvedValueOnce(mockParent);
      mockPermissionRepository.save.mockResolvedValue(updatedPermission);

      const result = await permissionService.update('2', updatePermissionDto);

      expect(result.level).toBe(2);
      expect(result.parentId).toBe('1');
    });

    it('should throw error if permission not found', async () => {
      mockPermissionRepository.findOne.mockResolvedValue(null);

      const updatePermissionDto: UpdatePermissionDto = {
        id: '1',
        name: 'Updated',
      };

      await expect(permissionService.update('1', updatePermissionDto)).rejects.toThrow();
    });
  });

  describe('deleteCascade', () => {
    it('should delete permission and its children', async () => {
      const mockPermission = {
        id: '1',
        name: 'User Management',
        type: 'MENU',
        level: 1,
      };

      const mockChild = {
        id: '2',
        name: 'User List',
        type: 'MENU',
        level: 2,
        parentId: '1',
      };

      mockPermissionRepository.findOne.mockResolvedValue(mockPermission);
      mockPermissionRepository.find.mockResolvedValueOnce([mockChild]).mockResolvedValueOnce([]);
      mockPermissionRepository.remove.mockResolvedValue(mockPermission);

      await permissionService.deleteCascade('1');

      expect(mockPermissionRepository.remove).toHaveBeenCalledTimes(2);
    });

    it('should throw error if permission not found', async () => {
      mockPermissionRepository.findOne.mockResolvedValue(null);

      await expect(permissionService.deleteCascade('nonexistent')).rejects.toThrow();
    });
  });

  describe('getTree', () => {
    it('should return permission tree structure', async () => {
      const mockPermissions = [
        {
          id: '1',
          name: 'User Management',
          type: 'MENU',
          level: 1,
          parentId: null,
          sort: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'User List',
          type: 'MENU',
          level: 2,
          parentId: '1',
          sort: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '3',
          name: 'Create User',
          type: 'BUTTON',
          level: 3,
          parentId: '2',
          sort: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPermissionRepository.find.mockResolvedValue(mockPermissions);

      const result = await permissionService.getTree();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('User Management');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].name).toBe('User List');
      expect(result[0].children[0].children).toHaveLength(1);
      expect(result[0].children[0].children[0].name).toBe('Create User');
    });
  });

  describe('getMenuTree', () => {
    it('should return menu tree without buttons', async () => {
      const mockPermissions = [
        {
          id: '1',
          name: 'User Management',
          type: 'MENU',
          level: 1,
          parentId: null,
          path: '/user',
          icon: 'UserOutlined',
          sort: 1,
          status: 1,
          visible: 1,
        },
        {
          id: '2',
          name: 'User List',
          type: 'MENU',
          level: 2,
          parentId: '1',
          path: '/user/list',
          icon: 'ListOutlined',
          sort: 1,
          status: 1,
          visible: 1,
        },
      ];

      mockPermissionRepository.find.mockResolvedValue(mockPermissions);

      const result = await permissionService.getMenuTree();

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(PermissionMenuTreeDto);
      expect(result[0].name).toBe('User Management');
      expect(result[0].path).toBe('/user');
      expect(result[0].icon).toBe('UserOutlined');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].name).toBe('User List');
    });
  });

  describe('getButtonsByMenuId', () => {
    it('should return buttons for given menu', async () => {
      const mockButtons = [
        {
          id: '3',
          name: 'Create User',
          type: 'BUTTON',
          level: 3,
          parentId: '2',
          action: 'create',
          resource: 'user',
          sort: 1,
          status: 1,
        },
        {
          id: '4',
          name: 'Delete User',
          type: 'BUTTON',
          level: 3,
          parentId: '2',
          action: 'delete',
          resource: 'user',
          sort: 2,
          status: 1,
        },
      ];

      mockPermissionRepository.find.mockResolvedValue(mockButtons);

      const result = await permissionService.getButtonsByMenuId('2');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Create User');
      expect(result[1].name).toBe('Delete User');
      expect(result.every((r) => r.type === 'BUTTON')).toBe(true);
    });
  });

  describe('getByLevel', () => {
    it('should return permissions by level', async () => {
      const mockPermissions = [
        {
          id: '1',
          name: 'User Management',
          type: 'MENU',
          level: 1,
          sort: 1,
          status: 1,
        },
        {
          id: '2',
          name: 'Role Management',
          type: 'MENU',
          level: 1,
          sort: 2,
          status: 1,
        },
      ];

      mockPermissionRepository.find.mockResolvedValue(mockPermissions);

      const result = await permissionService.getByLevel(1);

      expect(result).toHaveLength(2);
      expect(result.every((r) => r.level === 1)).toBe(true);
    });
  });

  describe('getFirstLevelMenus', () => {
    it('should return first level menus', async () => {
      const mockPermissions = [
        {
          id: '1',
          name: 'User Management',
          type: 'MENU',
          level: 1,
          sort: 1,
          status: 1,
        },
        {
          id: '2',
          name: 'Role Management',
          type: 'MENU',
          level: 1,
          sort: 2,
          status: 1,
        },
      ];

      mockPermissionRepository.find.mockResolvedValue(mockPermissions);

      const result = await permissionService.getFirstLevelMenus();

      expect(result).toHaveLength(2);
      expect(result.every((r) => r.level === 1)).toBe(true);
    });
  });

  describe('buildTree', () => {
    it('should build tree from flat array', () => {
      const permissions: Permission[] = [
        {
          id: '1',
          name: 'User Management',
          type: 'MENU',
          level: 1,
          parentId: null,
          sort: 1,
        },
        {
          id: '2',
          name: 'User List',
          type: 'MENU',
          level: 2,
          parentId: '1',
          sort: 1,
        },
        {
          id: '3',
          name: 'Create User',
          type: 'BUTTON',
          level: 3,
          parentId: '2',
          sort: 1,
        },
      ] as Permission[];

      const result = permissionService.buildTree(permissions);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].id).toBe('2');
      expect(result[0].children[0].children).toHaveLength(1);
      expect(result[0].children[0].children[0].id).toBe('3');
    });
  });

  describe('buildMenuTree', () => {
    it('should build menu tree from permissions', () => {
      const permissions: Permission[] = [
        {
          id: '1',
          name: 'User Management',
          type: 'MENU',
          level: 1,
          parentId: null,
          path: '/user',
          icon: 'UserOutlined',
          sort: 1,
        },
        {
          id: '2',
          name: 'User List',
          type: 'MENU',
          level: 2,
          parentId: '1',
          path: '/user/list',
          icon: 'ListOutlined',
          sort: 1,
        },
      ] as Permission[];

      const result = permissionService.buildMenuTree(permissions);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(PermissionMenuTreeDto);
      expect(result[0].name).toBe('User Management');
      expect(result[0].path).toBe('/user');
      expect(result[0].icon).toBe('UserOutlined');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].name).toBe('User List');
    });
  });
});
