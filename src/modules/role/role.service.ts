import { Injectable, Logger } from '@nestjs/common';
import { SystemException } from '@/common/exceptions';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  AssignPermissionsDto,
  CreateRoleDto,
  RoleResponseDto,
  UpdateRoleDto,
} from './dto/role.dto';

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new role
   */
  async create(createRoleDto: CreateRoleDto): Promise<RoleResponseDto> {
    // Check if role with same name or code already exists
    const existingRole = await this.prisma.role.findFirst({
      where: {
        OR: [{ name: createRoleDto.name }, { code: createRoleDto.code }],
      },
    });

    if (existingRole) {
      if (existingRole.name === createRoleDto.name) {
        throw SystemException.resourceExists(
          `Role with name '${createRoleDto.name}' already exists`,
        );
      }
      if (existingRole.code === createRoleDto.code) {
        throw SystemException.resourceExists(
          `Role with code '${createRoleDto.code}' already exists`,
        );
      }
    }

    const role = await this.prisma.role.create({
      data: {
        ...createRoleDto,
        isSystem: createRoleDto.isSystem || false,
      },
    });

    this.logger.log(`✅ Role created: ${role.name} (${role.code})`);

    return new RoleResponseDto(role);
  }

  /**
   * Find all roles with optional pagination
   */
  async findAll(page = 1, limit = 10): Promise<{ list: RoleResponseDto[]; total: number }> {
    const skip = (page - 1) * limit;

    const [roles, total] = await this.prisma.$transaction([
      this.prisma.role.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.role.count(),
    ]);

    return {
      list: roles.map((role) => new RoleResponseDto(role)),
      total,
    };
  }

  /**
   * Find role by ID
   */
  async findById(id: string): Promise<RoleResponseDto> {
    const role = await this.prisma.role.findUnique({ where: { id } });

    if (!role) {
      throw SystemException.dataNotFound(`Role with ID '${id}' not found`);
    }

    return new RoleResponseDto(role);
  }

  /**
   * Find role by code
   */
  async findByCode(code: string): Promise<RoleResponseDto> {
    const role = await this.prisma.role.findUnique({ where: { code } });

    if (!role) {
      throw SystemException.dataNotFound(`Role with code '${code}' not found`);
    }

    return new RoleResponseDto(role);
  }

  /**
   * Update role by ID
   */
  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<RoleResponseDto> {
    const role = await this.prisma.role.findUnique({ where: { id } });

    if (!role) {
      throw SystemException.dataNotFound(`Role with ID '${id}' not found`);
    }

    // Check if system role is being modified
    if (role.isSystem) {
      throw SystemException.businessRuleViolation('Cannot modify system roles');
    }

    // Check for conflicts if name or code is being updated
    if (updateRoleDto.name || updateRoleDto.code) {
      const conflictConditions = [];
      if (updateRoleDto.name && updateRoleDto.name !== role.name) {
        conflictConditions.push({ name: updateRoleDto.name });
      }
      if (updateRoleDto.code && updateRoleDto.code !== role.code) {
        conflictConditions.push({ code: updateRoleDto.code });
      }

      if (conflictConditions.length > 0) {
        const existingRole = await this.prisma.role.findFirst({
          where: {
            id: { not: id },
            OR: conflictConditions,
          },
        });

        if (existingRole) {
          if (existingRole.name === updateRoleDto.name) {
            throw SystemException.resourceExists(
              `Role with name '${updateRoleDto.name}' already exists`,
            );
          }
          if (existingRole.code === updateRoleDto.code) {
            throw SystemException.resourceExists(
              `Role with code '${updateRoleDto.code}' already exists`,
            );
          }
        }
      }
    }

    const updatedRole = await this.prisma.role.update({
      where: { id },
      data: updateRoleDto,
    });

    this.logger.log(`✅ Role updated: ${updatedRole.name} (${updatedRole.code})`);

    return new RoleResponseDto(updatedRole);
  }

  /**
   * Delete role by ID
   */
  async delete(id: string): Promise<void> {
    const role = await this.prisma.role.findUnique({ where: { id } });

    if (!role) {
      throw SystemException.dataNotFound(`Role with ID '${id}' not found`);
    }

    if (role.isSystem) {
      throw SystemException.businessRuleViolation('Cannot delete system roles');
    }

    await this.prisma.role.delete({ where: { id } });
    this.logger.log(`✅ Role deleted: ${role.name} (${role.code})`);
  }

  /**
   * Assign permissions to role
   */
  async assignPermissions(
    roleId: string,
    assignPermissionsDto: AssignPermissionsDto,
  ): Promise<void> {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });

    if (!role) {
      throw SystemException.dataNotFound(`Role with ID '${roleId}' not found`);
    }

    // Verify all permissions exist
    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: assignPermissionsDto.permissionIds } },
    });

    if (permissions.length !== assignPermissionsDto.permissionIds.length) {
      const foundIds = permissions.map((p) => p.id);
      const missingIds = assignPermissionsDto.permissionIds.filter((id) => !foundIds.includes(id));
      throw SystemException.dataNotFound(`Permissions not found: ${missingIds.join(', ')}`);
    }

    // Remove existing role-permission assignments
    await this.prisma.rolePermission.deleteMany({ where: { roleId } });

    // Create new role-permission assignments
    if (assignPermissionsDto.permissionIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: assignPermissionsDto.permissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        })),
      });
    }

    this.logger.log(
      `✅ Permissions assigned to role ${role.name}: ${assignPermissionsDto.permissionIds.length} permissions`,
    );
  }

  /**
   * Get permissions assigned to role
   */
  async getRolePermissions(roleId: string): Promise<any[]> {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });

    if (!role) {
      throw SystemException.dataNotFound(`Role with ID '${roleId}' not found`);
    }

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: true },
    });

    return rolePermissions.map((rp) => rp.permission);
  }

  /**
   * Remove permission from role
   */
  async removePermission(roleId: string, permissionId: string): Promise<void> {
    const rolePermission = await this.prisma.rolePermission.findUnique({
      where: {
        uniq_role_permission: {
          roleId,
          permissionId,
        },
      },
    });

    if (!rolePermission) {
      throw SystemException.dataNotFound(
        `Permission assignment not found for role '${roleId}' and permission '${permissionId}'`,
      );
    }

    await this.prisma.rolePermission.delete({
      where: {
        uniq_role_permission: {
          roleId,
          permissionId,
        },
      },
    });

    this.logger.log(`✅ Permission removed from role: ${roleId} - ${permissionId}`);
  }
}
