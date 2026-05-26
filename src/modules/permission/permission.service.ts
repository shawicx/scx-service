import { Injectable, Logger } from '@nestjs/common';
import { SystemException } from '@/common/exceptions';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  CreatePermissionDto,
  PermissionMenuTreeDto,
  PermissionQueryDto,
  PermissionResponseDto,
  PermissionTreeResponseDto,
  UpdatePermissionDto,
} from './dto/permission.dto';

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new permission
   */
  async create(createPermissionDto: CreatePermissionDto): Promise<PermissionResponseDto> {
    const level = await this.calculateLevel(
      createPermissionDto.parentId || null,
      createPermissionDto.type,
    );

    const permission = await this.prisma.permission.create({
      data: {
        ...createPermissionDto,
        level,
      },
    });

    this.logger.log(`✅ Permission created: ${permission.name} (${permission.type})`);

    return new PermissionResponseDto(permission as any);
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

    const parent = await this.prisma.permission.findUnique({ where: { id: parentId } });
    if (!parent) {
      throw SystemException.dataNotFound('父权限不存在');
    }

    if (type === 'BUTTON') {
      if (parent.level !== 1 && parent.level !== 2) {
        throw SystemException.invalidParameter('按钮必须挂在一级或二级菜单下');
      }
      return parent.level + 1;
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
  ): Promise<{ list: PermissionResponseDto[]; total: number }> {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (queryDto.search) {
      where.OR = [
        { name: { contains: queryDto.search, mode: 'insensitive' } },
        { action: { contains: queryDto.search, mode: 'insensitive' } },
        { resource: { contains: queryDto.search, mode: 'insensitive' } },
      ];
    }

    if (queryDto.action) {
      where.action = queryDto.action;
    }

    if (queryDto.resource) {
      where.resource = queryDto.resource;
    }

    if (queryDto.type) {
      where.type = queryDto.type;
    }

    if (queryDto.parentId) {
      where.parentId = queryDto.parentId;
    }

    if (queryDto.level !== undefined) {
      where.level = queryDto.level;
    }

    const [permissions, total] = await this.prisma.$transaction([
      this.prisma.permission.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.permission.count({ where }),
    ]);

    return {
      list: permissions.map((permission) => new PermissionResponseDto(permission as any)),
      total,
    };
  }

  /**
   * Find permission by ID
   */
  async findById(id: string): Promise<PermissionResponseDto> {
    const permission = await this.prisma.permission.findUnique({ where: { id } });

    if (!permission) {
      throw SystemException.dataNotFound(`Permission with ID '${id}' not found`);
    }

    return new PermissionResponseDto(permission as any);
  }

  /**
   * Find permissions by action
   */
  async findByAction(action: string): Promise<PermissionResponseDto[]> {
    const permissions = await this.prisma.permission.findMany({
      where: { action },
      orderBy: { createdAt: 'desc' },
    });

    return permissions.map((permission) => new PermissionResponseDto(permission as any));
  }

  /**
   * Find permissions by resource
   */
  async findByResource(resource: string): Promise<PermissionResponseDto[]> {
    const permissions = await this.prisma.permission.findMany({
      where: { resource },
      orderBy: { createdAt: 'desc' },
    });

    return permissions.map((permission) => new PermissionResponseDto(permission as any));
  }

  /**
   * Update permission by ID
   */
  async update(
    id: string,
    updatePermissionDto: UpdatePermissionDto,
  ): Promise<PermissionResponseDto> {
    const permission = await this.prisma.permission.findUnique({ where: { id } });

    if (!permission) {
      throw SystemException.dataNotFound(`Permission with ID '${id}' not found`);
    }

    if (updatePermissionDto.name && updatePermissionDto.name !== permission.name) {
      const existingPermission = await this.prisma.permission.findUnique({
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
        const level = await this.calculateLevel(newParentId, newType as 'MENU' | 'BUTTON');
        updateData.level = level;
      }
    }

    const updatedPermission = await this.prisma.permission.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`✅ Permission updated: ${updatedPermission.name}`);

    return new PermissionResponseDto(updatedPermission);
  }

  /**
   * Delete permission by ID
   */
  async delete(id: string): Promise<void> {
    const permission = await this.prisma.permission.findUnique({ where: { id } });

    if (!permission) {
      throw SystemException.dataNotFound(`Permission with ID '${id}' not found`);
    }

    const roleCount = await this.prisma.rolePermission.count({
      where: { permissionId: id },
    });

    if (roleCount > 0) {
      throw SystemException.resourceExists(
        `Cannot delete permission '${permission.name}' as it is assigned to ${roleCount} role(s)`,
      );
    }

    await this.prisma.permission.delete({ where: { id } });

    this.logger.log(
      `✅ Permission deleted: ${permission.name} (${permission.action}:${permission.resource})`,
    );
  }

  /**
   * Get all unique actions
   */
  async getUniqueActions(): Promise<string[]> {
    const permissions = await this.prisma.permission.findMany({
      where: { action: { not: null } },
      select: { action: true },
      distinct: ['action'],
    });

    return permissions
      .map((p) => p.action)
      .filter((a): a is string => a !== null)
      .sort();
  }

  /**
   * Get all unique resources
   */
  async getUniqueResources(): Promise<string[]> {
    const permissions = await this.prisma.permission.findMany({
      where: { resource: { not: null } },
      select: { resource: true },
      distinct: ['resource'],
    });

    return permissions
      .map((p) => p.resource)
      .filter((r): r is string => r !== null)
      .sort();
  }

  /**
   * Search permissions by keyword
   */
  async search(keyword: string, limit = 10): Promise<PermissionResponseDto[]> {
    const permissions = await this.prisma.permission.findMany({
      where: {
        OR: [
          { name: { contains: keyword, mode: 'insensitive' } },
          { action: { contains: keyword, mode: 'insensitive' } },
          { resource: { contains: keyword, mode: 'insensitive' } },
          { description: { contains: keyword, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return permissions.map((permission) => new PermissionResponseDto(permission as any));
  }

  /**
   * Get permission tree structure
   */
  async getTree(): Promise<PermissionTreeResponseDto[]> {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
    });

    return this.buildTree(permissions);
  }

  /**
   * Get menu tree (without buttons)
   */
  async getMenuTree(): Promise<PermissionMenuTreeDto[]> {
    const permissions = await this.prisma.permission.findMany({
      where: { type: 'MENU', status: 1, visible: 1 },
      orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
    });

    return this.buildMenuTree(permissions);
  }

  /**
   * Get buttons by menu ID
   */
  async getButtonsByMenuId(menuId: string): Promise<PermissionResponseDto[]> {
    const buttons = await this.prisma.permission.findMany({
      where: { parentId: menuId, type: 'BUTTON', status: 1 },
      orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
    });

    return buttons.map((button) => new PermissionResponseDto(button));
  }

  /**
   * Get permissions by level
   */
  async getByLevel(level: number): Promise<PermissionResponseDto[]> {
    const permissions = await this.prisma.permission.findMany({
      where: { level, status: 1 },
      orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
    });

    return permissions.map((permission) => new PermissionResponseDto(permission as any));
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
  buildTree(permissions: any[], parentId: string | null = null): PermissionTreeResponseDto[] {
    return permissions
      .filter((p) => p.parentId === parentId)
      .map((permission) => {
        const dto = new PermissionResponseDto(permission as any) as PermissionTreeResponseDto;
        dto.children = this.buildTree(permissions, permission.id);
        return dto;
      });
  }

  /**
   * Build menu tree from permissions
   */
  buildMenuTree(permissions: any[], parentId: string | null = null): PermissionMenuTreeDto[] {
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
    const permission = await this.prisma.permission.findUnique({ where: { id } });

    if (!permission) {
      throw SystemException.dataNotFound(`Permission with ID '${id}' not found`);
    }

    await this.deleteChildren(id);

    await this.prisma.permission.delete({ where: { id } });

    this.logger.log(`✅ Permission deleted: ${permission.name}`);
  }

  /**
   * Recursively delete children
   */
  private async deleteChildren(parentId: string): Promise<void> {
    const children = await this.prisma.permission.findMany({ where: { parentId } });

    for (const child of children) {
      await this.deleteChildren(child.id);
      await this.prisma.permission.delete({ where: { id: child.id } });
    }
  }
}
