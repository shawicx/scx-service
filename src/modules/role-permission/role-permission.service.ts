import { Injectable, Logger } from '@nestjs/common';
import { SystemException } from '@/common/exceptions';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class RolePermissionService {
  private readonly logger = new Logger(RolePermissionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create role-permission assignment
   */
  async create(roleId: string, permissionId: string): Promise<any> {
    // Verify role exists
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw SystemException.dataNotFound(`Role with ID '${roleId}' not found`);
    }

    // Verify permission exists
    const permission = await this.prisma.permission.findUnique({ where: { id: permissionId } });
    if (!permission) {
      throw SystemException.dataNotFound(`Permission with ID '${permissionId}' not found`);
    }

    // Check if assignment already exists
    const existingAssignment = await this.prisma.rolePermission.findUnique({
      where: {
        uniq_role_permission: { roleId, permissionId },
      },
    });

    if (existingAssignment) {
      throw SystemException.resourceExists('Role already has this permission');
    }

    const rolePermission = await this.prisma.rolePermission.create({
      data: { roleId, permissionId },
    });

    this.logger.log(`✅ Role permission assigned: Role ${roleId} -> Permission ${permissionId}`);
    return rolePermission;
  }

  /**
   * Bulk create role-permission assignments
   */
  async createBulk(roleId: string, permissionIds: string[]): Promise<any[]> {
    // Verify role exists
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw SystemException.dataNotFound(`Role with ID '${roleId}' not found`);
    }

    // Verify all permissions exist
    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: permissionIds } },
    });

    if (permissions.length !== permissionIds.length) {
      const foundIds = permissions.map((p) => p.id);
      const missingIds = permissionIds.filter((id) => !foundIds.includes(id));
      throw SystemException.dataNotFound(`Permissions not found: ${missingIds.join(', ')}`);
    }

    // Check existing assignments
    const existingAssignments = await this.prisma.rolePermission.findMany({
      where: { roleId, permissionId: { in: permissionIds } },
    });

    const existingPermissionIds = existingAssignments.map((rp) => rp.permissionId);
    const newPermissionIds = permissionIds.filter((id) => !existingPermissionIds.includes(id));

    if (newPermissionIds.length === 0) {
      throw SystemException.resourceExists('Role already has all specified permissions');
    }

    // Create new assignments
    await this.prisma.rolePermission.createMany({
      data: newPermissionIds.map((permissionId) => ({ roleId, permissionId })),
    });

    const created = await this.prisma.rolePermission.findMany({
      where: { roleId, permissionId: { in: newPermissionIds } },
    });

    this.logger.log(
      `✅ Bulk role permissions assigned: Role ${roleId} -> ${newPermissionIds.length} permissions`,
    );
    return created;
  }

  /**
   * Replace all role permissions (remove existing and add new)
   */
  async replacePermissions(roleId: string, permissionIds: string[]): Promise<any[]> {
    // Verify role exists
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw SystemException.dataNotFound(`Role with ID '${roleId}' not found`);
    }

    // Verify all permissions exist
    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: permissionIds } },
    });

    if (permissions.length !== permissionIds.length) {
      const foundIds = permissions.map((p) => p.id);
      const missingIds = permissionIds.filter((id) => !foundIds.includes(id));
      throw SystemException.dataNotFound(`Permissions not found: ${missingIds.join(', ')}`);
    }

    // Remove existing assignments
    await this.prisma.rolePermission.deleteMany({ where: { roleId } });

    // Create new assignments
    if (permissionIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
      });
    }

    const created = await this.prisma.rolePermission.findMany({
      where: { roleId },
    });

    this.logger.log(
      `✅ Role permissions replaced: Role ${roleId} -> ${permissionIds.length} permissions`,
    );
    return created;
  }

  /**
   * Find all role-permission assignments with optional pagination
   */
  async findAll(page = 1, limit = 10): Promise<{ list: any[]; total: number }> {
    const skip = (page - 1) * limit;

    const [rolePermissions, total] = await this.prisma.$transaction([
      this.prisma.rolePermission.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { role: true, permission: true },
      }),
      this.prisma.rolePermission.count(),
    ]);

    return { list: rolePermissions, total };
  }

  /**
   * Find role-permission assignments by role ID
   */
  async findByRoleId(roleId: string): Promise<any[]> {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw SystemException.dataNotFound(`Role with ID '${roleId}' not found`);
    }

    return await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find role-permission assignments by permission ID
   */
  async findByPermissionId(permissionId: string): Promise<any[]> {
    const permission = await this.prisma.permission.findUnique({ where: { id: permissionId } });
    if (!permission) {
      throw SystemException.dataNotFound(`Permission with ID '${permissionId}' not found`);
    }

    return await this.prisma.rolePermission.findMany({
      where: { permissionId },
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find specific role-permission assignment
   */
  async findByRoleAndPermission(roleId: string, permissionId: string): Promise<any | null> {
    return await this.prisma.rolePermission.findUnique({
      where: {
        uniq_role_permission: { roleId, permissionId },
      },
      include: { role: true, permission: true },
    });
  }

  /**
   * Delete role-permission assignment
   */
  async delete(roleId: string, permissionId: string): Promise<void> {
    const rolePermission = await this.prisma.rolePermission.findUnique({
      where: {
        uniq_role_permission: { roleId, permissionId },
      },
    });

    if (!rolePermission) {
      throw SystemException.dataNotFound(
        `Role permission assignment not found for role '${roleId}' and permission '${permissionId}'`,
      );
    }

    await this.prisma.rolePermission.delete({
      where: {
        uniq_role_permission: { roleId, permissionId },
      },
    });
    this.logger.log(`✅ Role permission removed: Role ${roleId} -> Permission ${permissionId}`);
  }

  /**
   * Delete all role-permission assignments for a role
   */
  async deleteByRoleId(roleId: string): Promise<void> {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw SystemException.dataNotFound(`Role with ID '${roleId}' not found`);
    }

    const result = await this.prisma.rolePermission.deleteMany({ where: { roleId } });
    this.logger.log(
      `✅ All role permissions removed for role ${roleId}: ${result.count} assignments`,
    );
  }

  /**
   * Delete all role-permission assignments for a permission
   */
  async deleteByPermissionId(permissionId: string): Promise<void> {
    const permission = await this.prisma.permission.findUnique({ where: { id: permissionId } });
    if (!permission) {
      throw SystemException.dataNotFound(`Permission with ID '${permissionId}' not found`);
    }

    const result = await this.prisma.rolePermission.deleteMany({ where: { permissionId } });
    this.logger.log(
      `✅ All role permissions removed for permission ${permissionId}: ${result.count} assignments`,
    );
  }

  /**
   * Count role-permission assignments
   */
  async count(): Promise<number> {
    return await this.prisma.rolePermission.count();
  }

  /**
   * Count assignments by role ID
   */
  async countByRoleId(roleId: string): Promise<number> {
    return await this.prisma.rolePermission.count({ where: { roleId } });
  }

  /**
   * Count assignments by permission ID
   */
  async countByPermissionId(permissionId: string): Promise<number> {
    return await this.prisma.rolePermission.count({ where: { permissionId } });
  }

  /**
   * Check if role has specific permission
   */
  async hasPermission(roleId: string, permissionId: string): Promise<boolean> {
    const assignment = await this.prisma.rolePermission.findUnique({
      where: {
        uniq_role_permission: { roleId, permissionId },
      },
    });
    return !!assignment;
  }

  /**
   * Get permissions for role
   */
  async getPermissionsByRole(roleId: string): Promise<any[]> {
    const assignments = await this.findByRoleId(roleId);
    return assignments.map((assignment: any) => assignment.permission);
  }

  /**
   * Get roles for permission
   */
  async getRolesByPermission(permissionId: string): Promise<any[]> {
    const assignments = await this.findByPermissionId(permissionId);
    return assignments.map((assignment: any) => assignment.role);
  }
}
