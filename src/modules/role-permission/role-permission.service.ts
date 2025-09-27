import { Injectable, Logger } from '@nestjs/common';
import { SystemException } from '@/common/exceptions';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Permission } from '../permission/entities/permission.entity';
import { Role } from '../role/entities/role.entity';
import { RolePermission } from './entities/role-permission.entity';

@Injectable()
export class RolePermissionService {
  private readonly logger = new Logger(RolePermissionService.name);

  constructor(
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  /**
   * Create role-permission assignment
   */
  async create(roleId: string, permissionId: string): Promise<RolePermission> {
    // Verify role exists
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw SystemException.dataNotFound(`Role with ID '${roleId}' not found`);
    }

    // Verify permission exists
    const permission = await this.permissionRepository.findOne({ where: { id: permissionId } });
    if (!permission) {
      throw SystemException.dataNotFound(`Permission with ID '${permissionId}' not found`);
    }

    // Check if assignment already exists
    const existingAssignment = await this.rolePermissionRepository.findOne({
      where: { roleId, permissionId },
    });

    if (existingAssignment) {
      throw SystemException.resourceExists('Role already has this permission');
    }

    const rolePermission = this.rolePermissionRepository.create({ roleId, permissionId });
    const savedRolePermission = await this.rolePermissionRepository.save(rolePermission);

    this.logger.log(`✅ Role permission assigned: Role ${roleId} -> Permission ${permissionId}`);
    return savedRolePermission;
  }

  /**
   * Bulk create role-permission assignments
   */
  async createBulk(roleId: string, permissionIds: string[]): Promise<RolePermission[]> {
    // Verify role exists
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw SystemException.dataNotFound(`Role with ID '${roleId}' not found`);
    }

    // Verify all permissions exist
    const permissions = await this.permissionRepository.find({
      where: { id: In(permissionIds) },
    });

    if (permissions.length !== permissionIds.length) {
      const foundIds = permissions.map((p) => p.id);
      const missingIds = permissionIds.filter((id) => !foundIds.includes(id));
      throw SystemException.dataNotFound(`Permissions not found: ${missingIds.join(', ')}`);
    }

    // Check existing assignments
    const existingAssignments = await this.rolePermissionRepository.find({
      where: { roleId, permissionId: In(permissionIds) },
    });

    const existingPermissionIds = existingAssignments.map((rp) => rp.permissionId);
    const newPermissionIds = permissionIds.filter((id) => !existingPermissionIds.includes(id));

    if (newPermissionIds.length === 0) {
      throw SystemException.resourceExists('Role already has all specified permissions');
    }

    // Create new assignments
    const rolePermissions = newPermissionIds.map((permissionId) =>
      this.rolePermissionRepository.create({ roleId, permissionId }),
    );

    const savedRolePermissions = await this.rolePermissionRepository.save(rolePermissions);

    this.logger.log(
      `✅ Bulk role permissions assigned: Role ${roleId} -> ${newPermissionIds.length} permissions`,
    );
    return savedRolePermissions;
  }

  /**
   * Replace all role permissions (remove existing and add new)
   */
  async replacePermissions(roleId: string, permissionIds: string[]): Promise<RolePermission[]> {
    // Verify role exists
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw SystemException.dataNotFound(`Role with ID '${roleId}' not found`);
    }

    // Verify all permissions exist
    const permissions = await this.permissionRepository.find({
      where: { id: In(permissionIds) },
    });

    if (permissions.length !== permissionIds.length) {
      const foundIds = permissions.map((p) => p.id);
      const missingIds = permissionIds.filter((id) => !foundIds.includes(id));
      throw SystemException.dataNotFound(`Permissions not found: ${missingIds.join(', ')}`);
    }

    // Remove existing assignments
    await this.rolePermissionRepository.delete({ roleId });

    // Create new assignments
    const rolePermissions = permissionIds.map((permissionId) =>
      this.rolePermissionRepository.create({ roleId, permissionId }),
    );

    const savedRolePermissions = await this.rolePermissionRepository.save(rolePermissions);

    this.logger.log(
      `✅ Role permissions replaced: Role ${roleId} -> ${permissionIds.length} permissions`,
    );
    return savedRolePermissions;
  }

  /**
   * Find all role-permission assignments with optional pagination
   */
  async findAll(
    page = 1,
    limit = 10,
  ): Promise<{ rolePermissions: RolePermission[]; total: number }> {
    const skip = (page - 1) * limit;

    const [rolePermissions, total] = await this.rolePermissionRepository.findAndCount({
      relations: ['role', 'permission'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { rolePermissions, total };
  }

  /**
   * Find role-permission assignments by role ID
   */
  async findByRoleId(roleId: string): Promise<RolePermission[]> {
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw SystemException.dataNotFound(`Role with ID '${roleId}' not found`);
    }

    return await this.rolePermissionRepository.find({
      where: { roleId },
      relations: ['permission'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find role-permission assignments by permission ID
   */
  async findByPermissionId(permissionId: string): Promise<RolePermission[]> {
    const permission = await this.permissionRepository.findOne({ where: { id: permissionId } });
    if (!permission) {
      throw SystemException.dataNotFound(`Permission with ID '${permissionId}' not found`);
    }

    return await this.rolePermissionRepository.find({
      where: { permissionId },
      relations: ['role'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find specific role-permission assignment
   */
  async findByRoleAndPermission(
    roleId: string,
    permissionId: string,
  ): Promise<RolePermission | null> {
    return await this.rolePermissionRepository.findOne({
      where: { roleId, permissionId },
      relations: ['role', 'permission'],
    });
  }

  /**
   * Delete role-permission assignment
   */
  async delete(roleId: string, permissionId: string): Promise<void> {
    const rolePermission = await this.rolePermissionRepository.findOne({
      where: { roleId, permissionId },
    });

    if (!rolePermission) {
      throw SystemException.dataNotFound(
        `Role permission assignment not found for role '${roleId}' and permission '${permissionId}'`,
      );
    }

    await this.rolePermissionRepository.remove(rolePermission);
    this.logger.log(`✅ Role permission removed: Role ${roleId} -> Permission ${permissionId}`);
  }

  /**
   * Delete all role-permission assignments for a role
   */
  async deleteByRoleId(roleId: string): Promise<void> {
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw SystemException.dataNotFound(`Role with ID '${roleId}' not found`);
    }

    const result = await this.rolePermissionRepository.delete({ roleId });
    this.logger.log(
      `✅ All role permissions removed for role ${roleId}: ${result.affected} assignments`,
    );
  }

  /**
   * Delete all role-permission assignments for a permission
   */
  async deleteByPermissionId(permissionId: string): Promise<void> {
    const permission = await this.permissionRepository.findOne({ where: { id: permissionId } });
    if (!permission) {
      throw SystemException.dataNotFound(`Permission with ID '${permissionId}' not found`);
    }

    const result = await this.rolePermissionRepository.delete({ permissionId });
    this.logger.log(
      `✅ All role permissions removed for permission ${permissionId}: ${result.affected} assignments`,
    );
  }

  /**
   * Count role-permission assignments
   */
  async count(): Promise<number> {
    return await this.rolePermissionRepository.count();
  }

  /**
   * Count assignments by role ID
   */
  async countByRoleId(roleId: string): Promise<number> {
    return await this.rolePermissionRepository.count({ where: { roleId } });
  }

  /**
   * Count assignments by permission ID
   */
  async countByPermissionId(permissionId: string): Promise<number> {
    return await this.rolePermissionRepository.count({ where: { permissionId } });
  }

  /**
   * Check if role has specific permission
   */
  async hasPermission(roleId: string, permissionId: string): Promise<boolean> {
    const assignment = await this.rolePermissionRepository.findOne({
      where: { roleId, permissionId },
    });
    return !!assignment;
  }

  /**
   * Get permissions for role
   */
  async getPermissionsByRole(roleId: string): Promise<Permission[]> {
    const assignments = await this.findByRoleId(roleId);
    return assignments.map((assignment: any) => assignment.permission);
  }

  /**
   * Get roles for permission
   */
  async getRolesByPermission(permissionId: string): Promise<Role[]> {
    const assignments = await this.findByPermissionId(permissionId);
    return assignments.map((assignment: any) => assignment.role);
  }
}
