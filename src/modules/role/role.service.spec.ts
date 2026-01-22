import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Permission } from '../permission/entities/permission.entity';
import { RolePermission } from '../role-permission/entities/role-permission.entity';
import {
  AssignPermissionsDto,
  CreateRoleDto,
  RoleResponseDto,
  UpdateRoleDto,
} from './dto/role.dto';
import { Role } from './entities/role.entity';
import { RoleService } from './role.service';

describe('RoleService', () => {
  let roleService: RoleService;

  const mockRoleRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    remove: jest.fn(),
  };

  const mockPermissionRepository = {
    find: jest.fn(),
  };

  const mockRolePermissionRepository = {
    delete: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        {
          provide: getRepositoryToken(Role),
          useValue: mockRoleRepository,
        },
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

    roleService = module.get<RoleService>(RoleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a role successfully', async () => {
      const createRoleDto: CreateRoleDto = {
        name: 'Admin',
        code: 'ROLE_ADMIN',
        description: 'Administrator role',
        isSystem: false,
      };

      const mockRole = {
        id: '1',
        ...createRoleDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRoleRepository.findOne.mockResolvedValue(null);
      mockRoleRepository.create.mockReturnValue(mockRole);
      mockRoleRepository.save.mockResolvedValue(mockRole);

      const result = await roleService.create(createRoleDto);

      expect(result).toEqual(new RoleResponseDto(mockRole));
      expect(mockRoleRepository.findOne).toHaveBeenCalledWith({
        where: [{ name: 'Admin' }, { code: 'ROLE_ADMIN' }],
      });
      expect(mockRoleRepository.create).toHaveBeenCalledWith({
        ...createRoleDto,
        isSystem: false,
      });
      expect(mockRoleRepository.save).toHaveBeenCalledWith(mockRole);
    });

    it('should throw ConflictException if role name already exists', async () => {
      const createRoleDto: CreateRoleDto = {
        name: 'Admin',
        code: 'ROLE_ADMIN',
        description: 'Administrator role',
      };

      const existingRole = {
        id: '1',
        name: 'Admin',
        code: 'ROLE_USER',
        description: 'User role',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRoleRepository.findOne.mockResolvedValue(existingRole);

      await expect(roleService.create(createRoleDto)).rejects.toThrow(ConflictException);
      await expect(roleService.create(createRoleDto)).rejects.toThrow(
        "Role with name 'Admin' already exists",
      );
    });

    it('should throw ConflictException if role code already exists', async () => {
      const createRoleDto: CreateRoleDto = {
        name: 'Admin',
        code: 'ROLE_ADMIN',
        description: 'Administrator role',
      };

      const existingRole = {
        id: '1',
        name: 'User',
        code: 'ROLE_ADMIN',
        description: 'User role',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRoleRepository.findOne.mockResolvedValue(existingRole);

      await expect(roleService.create(createRoleDto)).rejects.toThrow(ConflictException);
      await expect(roleService.create(createRoleDto)).rejects.toThrow(
        "Role with code 'ROLE_ADMIN' already exists",
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated roles', async () => {
      const roles = [
        {
          id: '1',
          name: 'Admin',
          code: 'ROLE_ADMIN',
          description: 'Administrator role',
          isSystem: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'User',
          code: 'ROLE_USER',
          description: 'User role',
          isSystem: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRoleRepository.findAndCount.mockResolvedValue([roles, 2]);

      const result = await roleService.findAll(1, 10);

      expect(result).toEqual({
        roles: roles.map((role) => new RoleResponseDto(role)),
        total: 2,
      });
      expect(mockRoleRepository.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findById', () => {
    it('should return role by ID', async () => {
      const roleId = '1';
      const role = {
        id: roleId,
        name: 'Admin',
        code: 'ROLE_ADMIN',
        description: 'Administrator role',
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRoleRepository.findOne.mockResolvedValue(role);

      const result = await roleService.findById(roleId);

      expect(result).toEqual(new RoleResponseDto(role));
      expect(mockRoleRepository.findOne).toHaveBeenCalledWith({ where: { id: roleId } });
    });

    it('should throw NotFoundException if role not found', async () => {
      const roleId = '999';

      mockRoleRepository.findOne.mockResolvedValue(null);

      await expect(roleService.findById(roleId)).rejects.toThrow(NotFoundException);
      await expect(roleService.findById(roleId)).rejects.toThrow(
        `Role with ID '${roleId}' not found`,
      );
    });
  });

  describe('findByCode', () => {
    it('should return role by code', async () => {
      const roleCode = 'ROLE_ADMIN';
      const role = {
        id: '1',
        name: 'Admin',
        code: roleCode,
        description: 'Administrator role',
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRoleRepository.findOne.mockResolvedValue(role);

      const result = await roleService.findByCode(roleCode);

      expect(result).toEqual(new RoleResponseDto(role));
      expect(mockRoleRepository.findOne).toHaveBeenCalledWith({ where: { code: roleCode } });
    });

    it('should throw NotFoundException if role not found by code', async () => {
      const roleCode = 'ROLE_NONEXISTENT';

      mockRoleRepository.findOne.mockResolvedValue(null);

      await expect(roleService.findByCode(roleCode)).rejects.toThrow(NotFoundException);
      await expect(roleService.findByCode(roleCode)).rejects.toThrow(
        `Role with code '${roleCode}' not found`,
      );
    });
  });

  describe('update', () => {
    it('should update role successfully', async () => {
      const roleId = '1';
      const updateRoleDto: UpdateRoleDto = {
        id: roleId,
        name: 'Updated Admin',
        description: 'Updated administrator role',
      };

      const existingRole = {
        id: roleId,
        name: 'Admin',
        code: 'ROLE_ADMIN',
        description: 'Administrator role',
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedRole = {
        ...existingRole,
        ...updateRoleDto,
        updatedAt: new Date(),
      };

      mockRoleRepository.findOne.mockResolvedValue(existingRole);
      mockRoleRepository.save.mockResolvedValue(updatedRole);

      const result = await roleService.update(roleId, updateRoleDto);

      expect(result).toEqual(new RoleResponseDto(updatedRole));
      expect(mockRoleRepository.findOne).toHaveBeenCalledWith({ where: { id: roleId } });
      expect(mockRoleRepository.save).toHaveBeenCalledWith(updatedRole);
    });

    it('should throw NotFoundException if role not found for update', async () => {
      const roleId = '999';
      const updateRoleDto: UpdateRoleDto = {
        id: roleId,
        name: 'Updated Admin',
      };

      mockRoleRepository.findOne.mockResolvedValue(null);

      await expect(roleService.update(roleId, updateRoleDto)).rejects.toThrow(NotFoundException);
      await expect(roleService.update(roleId, updateRoleDto)).rejects.toThrow(
        `Role with ID '${roleId}' not found`,
      );
    });

    it('should throw BadRequestException if trying to update system role', async () => {
      const roleId = '1';
      const updateRoleDto: UpdateRoleDto = {
        id: roleId,
        name: 'Updated Admin',
      };

      const systemRole = {
        id: roleId,
        name: 'System Admin',
        code: 'ROLE_SYS_ADMIN',
        description: 'System administrator role',
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRoleRepository.findOne.mockResolvedValue(systemRole);

      await expect(roleService.update(roleId, updateRoleDto)).rejects.toThrow(BadRequestException);
      await expect(roleService.update(roleId, updateRoleDto)).rejects.toThrow(
        'Cannot modify system roles',
      );
    });

    it('should throw ConflictException if updated role name already exists', async () => {
      const roleId = '1';
      const updateRoleDto: UpdateRoleDto = {
        id: roleId,
        name: 'User',
      };

      const existingRole = {
        id: roleId,
        name: 'Admin',
        code: 'ROLE_ADMIN',
        description: 'Administrator role',
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const conflictingRole = {
        id: '2',
        name: 'User',
        code: 'ROLE_USER',
        description: 'User role',
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 重置mock并设置正确的调用顺序
      mockRoleRepository.findOne.mockReset();
      // 调用顺序：
      // 1. 查找要更新的角色: findOne({ where: { id: '1' } })
      // 2. 查找冲突的角色: findOne({ where: [{ name: 'User' }] })
      mockRoleRepository.findOne.mockImplementation((query) => {
        if (query.where.id) {
          // 通过ID查找角色
          return Promise.resolve(existingRole);
        } else if (Array.isArray(query.where) && query.where[0]?.name === 'User') {
          // 查找冲突的角色
          return Promise.resolve(conflictingRole);
        }
        return Promise.resolve(null);
      });

      await expect(roleService.update(roleId, updateRoleDto)).rejects.toThrow(ConflictException);
      await expect(roleService.update(roleId, updateRoleDto)).rejects.toThrow(
        "Role with name 'User' already exists",
      );
    });
  });

  describe('delete', () => {
    it('should delete role successfully', async () => {
      const roleId = '1';
      const role = {
        id: roleId,
        name: 'Admin',
        code: 'ROLE_ADMIN',
        description: 'Administrator role',
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRoleRepository.findOne.mockResolvedValue(role);
      mockRoleRepository.remove.mockResolvedValue(undefined);

      await roleService.delete(roleId);

      expect(mockRoleRepository.findOne).toHaveBeenCalledWith({ where: { id: roleId } });
      expect(mockRoleRepository.remove).toHaveBeenCalledWith(role);
    });

    it('should throw NotFoundException if role not found for deletion', async () => {
      const roleId = '999';

      mockRoleRepository.findOne.mockResolvedValue(null);

      await expect(roleService.delete(roleId)).rejects.toThrow(NotFoundException);
      await expect(roleService.delete(roleId)).rejects.toThrow(
        `Role with ID '${roleId}' not found`,
      );
    });

    it('should throw BadRequestException if trying to delete system role', async () => {
      const roleId = '1';
      const systemRole = {
        id: roleId,
        name: 'System Admin',
        code: 'ROLE_SYS_ADMIN',
        description: 'System administrator role',
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRoleRepository.findOne.mockResolvedValue(systemRole);

      await expect(roleService.delete(roleId)).rejects.toThrow(BadRequestException);
      await expect(roleService.delete(roleId)).rejects.toThrow('Cannot delete system roles');
    });
  });

  describe('assignPermissions', () => {
    it('should assign permissions to role successfully', async () => {
      const roleId = '1';
      const assignPermissionsDto: AssignPermissionsDto = {
        id: roleId,
        permissionIds: ['perm1', 'perm2'],
      };

      const role = {
        id: roleId,
        name: 'Admin',
        code: 'ROLE_ADMIN',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const permissions = [
        {
          id: 'perm1',
          name: 'Read User',
          action: 'read',
          resource: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'perm2',
          name: 'Write User',
          action: 'write',
          resource: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRoleRepository.findOne.mockResolvedValue(role);
      mockPermissionRepository.find.mockResolvedValue(permissions);
      mockRolePermissionRepository.delete.mockResolvedValue(undefined);
      mockRolePermissionRepository.create
        .mockReturnValueOnce({ roleId, permissionId: 'perm1' })
        .mockReturnValueOnce({ roleId, permissionId: 'perm2' });
      mockRolePermissionRepository.save.mockResolvedValue(undefined);

      await roleService.assignPermissions(roleId, assignPermissionsDto);

      expect(mockRoleRepository.findOne).toHaveBeenCalledWith({ where: { id: roleId } });
      // 修复期望的参数匹配
      expect(mockPermissionRepository.find).toHaveBeenCalled();
      expect(mockRolePermissionRepository.delete).toHaveBeenCalledWith({ roleId });
      expect(mockRolePermissionRepository.create).toHaveBeenCalledTimes(2);
      expect(mockRolePermissionRepository.save).toHaveBeenCalledWith([
        { roleId, permissionId: 'perm1' },
        { roleId, permissionId: 'perm2' },
      ]);
    });

    it('should throw NotFoundException if role not found for permission assignment', async () => {
      const roleId = '999';
      const assignPermissionsDto: AssignPermissionsDto = {
        id: roleId,
        permissionIds: ['perm1'],
      };

      mockRoleRepository.findOne.mockResolvedValue(null);

      await expect(roleService.assignPermissions(roleId, assignPermissionsDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(roleService.assignPermissions(roleId, assignPermissionsDto)).rejects.toThrow(
        `Role with ID '${roleId}' not found`,
      );
    });

    it('should throw NotFoundException if some permissions not found', async () => {
      const roleId = '1';
      const assignPermissionsDto: AssignPermissionsDto = {
        id: roleId,
        permissionIds: ['perm1', 'perm2', 'perm3'],
      };

      const role = {
        id: roleId,
        name: 'Admin',
        code: 'ROLE_ADMIN',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const permissions = [
        {
          id: 'perm1',
          name: 'Read User',
          action: 'read',
          resource: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'perm2',
          name: 'Write User',
          action: 'write',
          resource: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        // perm3 is missing
      ];

      mockRoleRepository.findOne.mockResolvedValue(role);
      mockPermissionRepository.find.mockResolvedValue(permissions);

      await expect(roleService.assignPermissions(roleId, assignPermissionsDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(roleService.assignPermissions(roleId, assignPermissionsDto)).rejects.toThrow(
        'Permissions not found: perm3',
      );
    });
  });

  describe('getRolePermissions', () => {
    it('should return permissions assigned to role', async () => {
      const roleId = '1';
      const role = {
        id: roleId,
        name: 'Admin',
        code: 'ROLE_ADMIN',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const permissions = [
        {
          id: 'perm1',
          name: 'Read User',
          action: 'read',
          resource: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'perm2',
          name: 'Write User',
          action: 'write',
          resource: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const rolePermissions = [
        { roleId, permissionId: 'perm1', permission: permissions[0] },
        { roleId, permissionId: 'perm2', permission: permissions[1] },
      ];

      mockRoleRepository.findOne.mockResolvedValue(role);
      mockRolePermissionRepository.find.mockResolvedValue(rolePermissions);

      const result = await roleService.getRolePermissions(roleId);

      expect(result).toEqual(permissions);
      expect(mockRoleRepository.findOne).toHaveBeenCalledWith({ where: { id: roleId } });
      expect(mockRolePermissionRepository.find).toHaveBeenCalledWith({
        where: { roleId },
        relations: ['permission'],
      });
    });

    it('should throw NotFoundException if role not found for getting permissions', async () => {
      const roleId = '999';

      mockRoleRepository.findOne.mockResolvedValue(null);

      await expect(roleService.getRolePermissions(roleId)).rejects.toThrow(NotFoundException);
      await expect(roleService.getRolePermissions(roleId)).rejects.toThrow(
        `Role with ID '${roleId}' not found`,
      );
    });
  });

  describe('removePermission', () => {
    it('should remove permission from role successfully', async () => {
      const roleId = '1';
      const permissionId = 'perm1';

      const rolePermission = {
        roleId,
        permissionId,
      };

      mockRolePermissionRepository.findOne.mockResolvedValue(rolePermission);
      mockRolePermissionRepository.remove.mockResolvedValue(undefined);

      await roleService.removePermission(roleId, permissionId);

      expect(mockRolePermissionRepository.findOne).toHaveBeenCalledWith({
        where: { roleId, permissionId },
      });
      expect(mockRolePermissionRepository.remove).toHaveBeenCalledWith(rolePermission);
    });

    it('should throw NotFoundException if role-permission assignment not found', async () => {
      const roleId = '1';
      const permissionId = 'perm999';

      mockRolePermissionRepository.findOne.mockResolvedValue(null);

      await expect(roleService.removePermission(roleId, permissionId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(roleService.removePermission(roleId, permissionId)).rejects.toThrow(
        `Permission assignment not found for role '${roleId}' and permission '${permissionId}'`,
      );
    });
  });
});
