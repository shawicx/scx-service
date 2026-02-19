import { Injectable, Logger } from '@nestjs/common';
import { SystemException } from '@/common/exceptions';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository, SelectQueryBuilder } from 'typeorm';
import { RolePermission } from '../role-permission/entities/role-permission.entity';
import {
  CreatePermissionDto,
  PermissionMenuTreeDto,
  PermissionQueryDto,
  PermissionResponseDto,
  PermissionTreeResponseDto,
  UpdatePermissionDto,
} from './dto/permission.dto';
import { Permission } from './entities/permission.entity';

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
  ) {}

  /**
   * Create a new permission
   */
  async create(createPermissionDto: CreatePermissionDto): Promise<PermissionResponseDto> {
    const level = await this.calculateLevel(
      createPermissionDto.parentId || null,
      createPermissionDto.type,
    );

    const permission = this.permissionRepository.create({
      ...createPermissionDto,
      level,
    });

    const savedPermission = await this.permissionRepository.save(permission);

    this.logger.log(`✅ Permission created: ${savedPermission.name} (${savedPermission.type})`);

    return new PermissionResponseDto(savedPermission);
  }

  /**
   * Calculate level based on parent and type
   */
  async calculateLevel(parentId: string | null, type: 'MENU' | 'BUTTON'): Promise<number> {
    if (!parentId) {
      if (type === 'BUTTON') {
        throw SystemException.invalidParameter('按钮必须有父节点');
      }
      return 1;
    }

    const parent = await this.permissionRepository.findOne({ where: { id: parentId } });
    if (!parent) {
      throw SystemException.dataNotFound('父权限不存在');
    }

    if (type === 'BUTTON') {
      if (parent.level !== 2) {
        throw SystemException.invalidParameter('按钮必须挂在二级菜单下');
      }
      return 3;
    } else {
      if (parent.level !== 1) {
        throw SystemException.invalidParameter('二级菜单必须挂在一级菜单下');
      }
      return 2;
    }
  }

  /**
   * Find all permissions with optional filtering and pagination
   */
  async findAll(
    queryDto: PermissionQueryDto = {},
    page = 1,
    limit = 10,
  ): Promise<{ permissions: PermissionResponseDto[]; total: number }> {
    const skip = (page - 1) * limit;

    const queryBuilder: SelectQueryBuilder<Permission> = this.permissionRepository
      .createQueryBuilder('permission')
      .orderBy('permission.sort', 'ASC')
      .addOrderBy('permission.createdAt', 'DESC');

    if (queryDto.search) {
      queryBuilder.andWhere(
        '(permission.name LIKE :search OR permission.action LIKE :search OR permission.resource LIKE :search)',
        { search: `%${queryDto.search}%` },
      );
    }

    if (queryDto.action) {
      queryBuilder.andWhere('permission.action = :action', { action: queryDto.action });
    }

    if (queryDto.resource) {
      queryBuilder.andWhere('permission.resource = :resource', { resource: queryDto.resource });
    }

    if (queryDto.type) {
      queryBuilder.andWhere('permission.type = :type', { type: queryDto.type });
    }

    if (queryDto.parentId) {
      queryBuilder.andWhere('permission.parentId = :parentId', { parentId: queryDto.parentId });
    }

    if (queryDto.level !== undefined) {
      queryBuilder.andWhere('permission.level = :level', { level: queryDto.level });
    }

    queryBuilder.skip(skip).take(limit);

    const [permissions, total] = await queryBuilder.getManyAndCount();

    return {
      permissions: permissions.map((permission) => new PermissionResponseDto(permission)),
      total,
    };
  }

  /**
   * Find permission by ID
   */
  async findById(id: string): Promise<PermissionResponseDto> {
    const permission = await this.permissionRepository.findOne({ where: { id } });

    if (!permission) {
      throw SystemException.dataNotFound(`Permission with ID '${id}' not found`);
    }

    return new PermissionResponseDto(permission);
  }

  /**
   * Find permissions by action
   */
  async findByAction(action: string): Promise<PermissionResponseDto[]> {
    const permissions = await this.permissionRepository.find({
      where: { action },
      order: { createdAt: 'DESC' },
    });

    return permissions.map((permission) => new PermissionResponseDto(permission));
  }

  /**
   * Find permissions by resource
   */
  async findByResource(resource: string): Promise<PermissionResponseDto[]> {
    const permissions = await this.permissionRepository.find({
      where: { resource },
      order: { createdAt: 'DESC' },
    });

    return permissions.map((permission) => new PermissionResponseDto(permission));
  }

  /**
   * Update permission by ID
   */
  async update(
    id: string,
    updatePermissionDto: UpdatePermissionDto,
  ): Promise<PermissionResponseDto> {
    const permission = await this.permissionRepository.findOne({ where: { id } });

    if (!permission) {
      throw SystemException.dataNotFound(`Permission with ID '${id}' not found`);
    }

    if (updatePermissionDto.name && updatePermissionDto.name !== permission.name) {
      const existingPermission = await this.permissionRepository.findOne({
        where: { name: updatePermissionDto.name },
      });

      if (existingPermission && existingPermission.id !== id) {
        throw SystemException.resourceExists(
          `Permission with name '${updatePermissionDto.name}' already exists`,
        );
      }
    }

    const updateData: Partial<UpdatePermissionDto> = { ...updatePermissionDto };

    if (updatePermissionDto.parentId !== undefined || updatePermissionDto.type !== undefined) {
      const newParentId =
        updatePermissionDto.parentId !== undefined
          ? updatePermissionDto.parentId
          : permission.parentId;
      const newType =
        updatePermissionDto.type !== undefined ? updatePermissionDto.type : permission.type;

      if (newParentId !== permission.parentId || newType !== permission.type) {
        const level = await this.calculateLevel(newParentId, newType);
        updateData.level = level;
      }
    }

    Object.assign(permission, updateData);
    const updatedPermission = await this.permissionRepository.save(permission);

    this.logger.log(`✅ Permission updated: ${updatedPermission.name}`);

    return new PermissionResponseDto(updatedPermission);
  }

  /**
   * Delete permission by ID
   */
  async delete(id: string): Promise<void> {
    const permission = await this.permissionRepository.findOne({ where: { id } });

    if (!permission) {
      throw SystemException.dataNotFound(`Permission with ID '${id}' not found`);
    }

    const roleCount = await this.rolePermissionRepository.count({
      where: { permissionId: id },
    });

    if (roleCount > 0) {
      throw SystemException.resourceExists(
        `Cannot delete permission '${permission.name}' as it is assigned to ${roleCount} role(s)`,
      );
    }

    await this.permissionRepository.remove(permission);

    this.logger.log(
      `✅ Permission deleted: ${permission.name} (${permission.action}:${permission.resource})`,
    );
  }

  /**
   * Get all unique actions
   */
  async getUniqueActions(): Promise<string[]> {
    const result = await this.permissionRepository
      .createQueryBuilder('permission')
      .select('DISTINCT permission.action', 'action')
      .getRawMany();

    return result.map((row) => row.action).sort();
  }

  /**
   * Get all unique resources
   */
  async getUniqueResources(): Promise<string[]> {
    const result = await this.permissionRepository
      .createQueryBuilder('permission')
      .select('DISTINCT permission.resource', 'resource')
      .getRawMany();

    return result.map((row) => row.resource).sort();
  }

  /**
   * Search permissions by keyword
   */
  async search(keyword: string, limit = 10): Promise<PermissionResponseDto[]> {
    const permissions = await this.permissionRepository.find({
      where: [
        { name: Like(`%${keyword}%`) },
        { action: Like(`%${keyword}%`) },
        { resource: Like(`%${keyword}%`) },
        { description: Like(`%${keyword}%`) },
      ],
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return permissions.map((permission) => new PermissionResponseDto(permission));
  }

  /**
   * Get permission tree structure
   */
  async getTree(): Promise<PermissionTreeResponseDto[]> {
    const permissions = await this.permissionRepository.find({
      order: { sort: 'ASC', createdAt: 'DESC' },
    });

    return this.buildTree(permissions);
  }

  /**
   * Get menu tree (without buttons)
   */
  async getMenuTree(): Promise<PermissionMenuTreeDto[]> {
    const permissions = await this.permissionRepository.find({
      where: { type: 'MENU', status: 1, visible: 1 },
      order: { sort: 'ASC', createdAt: 'DESC' },
    });

    return this.buildMenuTree(permissions);
  }

  /**
   * Get buttons by menu ID
   */
  async getButtonsByMenuId(menuId: string): Promise<PermissionResponseDto[]> {
    const buttons = await this.permissionRepository.find({
      where: { parentId: menuId, type: 'BUTTON', status: 1 },
      order: { sort: 'ASC', createdAt: 'DESC' },
    });

    return buttons.map((button) => new PermissionResponseDto(button));
  }

  /**
   * Get permissions by level
   */
  async getByLevel(level: number): Promise<PermissionResponseDto[]> {
    const permissions = await this.permissionRepository.find({
      where: { level, status: 1 },
      order: { sort: 'ASC', createdAt: 'DESC' },
    });

    return permissions.map((permission) => new PermissionResponseDto(permission));
  }

  /**
   * Get first level menus
   */
  async getFirstLevelMenus(): Promise<PermissionResponseDto[]> {
    return this.getByLevel(1);
  }

  /**
   * Build tree from flat array
   */
  buildTree(
    permissions: Permission[],
    parentId: string | null = null,
  ): PermissionTreeResponseDto[] {
    return permissions
      .filter((p) => p.parentId === parentId)
      .map((permission) => {
        const dto = new PermissionResponseDto(permission) as PermissionTreeResponseDto;
        dto.children = this.buildTree(permissions, permission.id);
        return dto;
      });
  }

  /**
   * Build menu tree from permissions
   */
  buildMenuTree(
    permissions: Permission[],
    parentId: string | null = null,
  ): PermissionMenuTreeDto[] {
    return permissions
      .filter((p) => p.parentId === parentId)
      .map((permission) => {
        const dto = new PermissionMenuTreeDto({
          id: permission.id,
          name: permission.name,
          path: permission.path,
          icon: permission.icon,
        });
        dto.children = this.buildMenuTree(permissions, permission.id);
        return dto;
      });
  }

  /**
   * Delete permission and its children
   */
  async deleteCascade(id: string): Promise<void> {
    const permission = await this.permissionRepository.findOne({ where: { id } });

    if (!permission) {
      throw SystemException.dataNotFound(`Permission with ID '${id}' not found`);
    }

    await this.deleteChildren(id);

    await this.permissionRepository.remove(permission);

    this.logger.log(`✅ Permission deleted: ${permission.name}`);
  }

  /**
   * Recursively delete children
   */
  private async deleteChildren(parentId: string): Promise<void> {
    const children = await this.permissionRepository.find({ where: { parentId } });

    for (const child of children) {
      await this.deleteChildren(child.id);
      await this.permissionRepository.remove(child);
    }
  }
}
