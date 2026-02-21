import { Injectable, Logger } from '@nestjs/common';
import { SystemException } from '@/common/exceptions';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Permission } from '../permission/entities/permission.entity';
import { RolePermission } from '../role-permission/entities/role-permission.entity';
import {
  AssignPermissionsDto,
  CreateRoleDto,
  RoleResponseDto,
  UpdateRoleDto,
} from './dto/role.dto';
import { Role } from './entities/role.entity';

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
  ) {}

  /**
   * Create a new role
   */
  async create(createRoleDto: CreateRoleDto): Promise<RoleResponseDto> {
    // Check if role with same name or code already exists
    const existingRole = await this.roleRepository.findOne({
      where: [{ name: createRoleDto.name }, { code: createRoleDto.code }],
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

    const role = this.roleRepository.create({
      ...createRoleDto,
      isSystem: createRoleDto.isSystem || false,
    });

    const savedRole = await this.roleRepository.save(role);
    this.logger.log(`✅ Role created: ${savedRole.name} (${savedRole.code})`);

    return new RoleResponseDto(savedRole);
  }

  /**
   * Find all roles with optional pagination
   */
  async findAll(page = 1, limit = 10): Promise<{ list: RoleResponseDto[]; total: number }> {
    const skip = (page - 1) * limit;

    const [roles, total] = await this.roleRepository.findAndCount({
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      list: roles.map((role) => new RoleResponseDto(role)),
      total,
    };
  }

  /**
   * Find role by ID
   */
  async findById(id: string): Promise<RoleResponseDto> {
    const role = await this.roleRepository.findOne({ where: { id } });

    if (!role) {
      throw SystemException.dataNotFound(`Role with ID '${id}' not found`);
    }

    return new RoleResponseDto(role);
  }

  /**
   * Find role by code
   */
  async findByCode(code: string): Promise<RoleResponseDto> {
    const role = await this.roleRepository.findOne({ where: { code } });

    if (!role) {
      throw SystemException.dataNotFound(`Role with code '${code}' not found`);
    }

    return new RoleResponseDto(role);
  }

  /**
   * Update role by ID
   */
  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<RoleResponseDto> {
    const role = await this.roleRepository.findOne({ where: { id } });

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
        const existingRole = await this.roleRepository.findOne({
          where: conflictConditions,
        });

        if (existingRole && existingRole.id !== id) {
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

    Object.assign(role, updateRoleDto);
    const updatedRole = await this.roleRepository.save(role);

    this.logger.log(`✅ Role updated: ${updatedRole.name} (${updatedRole.code})`);

    return new RoleResponseDto(updatedRole);
  }

  /**
   * Delete role by ID
   */
  async delete(id: string): Promise<void> {
    const role = await this.roleRepository.findOne({ where: { id } });

    if (!role) {
      throw SystemException.dataNotFound(`Role with ID '${id}' not found`);
    }

    if (role.isSystem) {
      throw SystemException.businessRuleViolation('Cannot delete system roles');
    }

    await this.roleRepository.remove(role);
    this.logger.log(`✅ Role deleted: ${role.name} (${role.code})`);
  }

  /**
   * Assign permissions to role
   */
  async assignPermissions(
    roleId: string,
    assignPermissionsDto: AssignPermissionsDto,
  ): Promise<void> {
    const role = await this.roleRepository.findOne({ where: { id: roleId } });

    if (!role) {
      throw SystemException.dataNotFound(`Role with ID '${roleId}' not found`);
    }

    // Verify all permissions exist
    const permissions = await this.permissionRepository.find({
      where: { id: In(assignPermissionsDto.permissionIds) },
    });

    if (permissions.length !== assignPermissionsDto.permissionIds.length) {
      const foundIds = permissions.map((p) => p.id);
      const missingIds = assignPermissionsDto.permissionIds.filter((id) => !foundIds.includes(id));
      throw SystemException.dataNotFound(`Permissions not found: ${missingIds.join(', ')}`);
    }

    // Remove existing role-permission assignments
    await this.rolePermissionRepository.delete({ roleId });

    // Create new role-permission assignments
    const rolePermissions = assignPermissionsDto.permissionIds.map((permissionId) =>
      this.rolePermissionRepository.create({
        roleId,
        permissionId,
      }),
    );

    await this.rolePermissionRepository.save(rolePermissions);

    this.logger.log(
      `✅ Permissions assigned to role ${role.name}: ${assignPermissionsDto.permissionIds.length} permissions`,
    );
  }

  /**
   * Get permissions assigned to role
   */
  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const role = await this.roleRepository.findOne({ where: { id: roleId } });

    if (!role) {
      throw SystemException.dataNotFound(`Role with ID '${roleId}' not found`);
    }

    const rolePermissions = await this.rolePermissionRepository.find({
      where: { roleId },
      relations: ['permission'],
    });

    return rolePermissions.map((rp: any) => rp.permission);
  }

  /**
   * Remove permission from role
   */
  async removePermission(roleId: string, permissionId: string): Promise<void> {
    const rolePermission = await this.rolePermissionRepository.findOne({
      where: { roleId, permissionId },
    });

    if (!rolePermission) {
      throw SystemException.dataNotFound(
        `Permission assignment not found for role '${roleId}' and permission '${permissionId}'`,
      );
    }

    await this.rolePermissionRepository.remove(rolePermission);

    this.logger.log(`✅ Permission removed from role: ${roleId} - ${permissionId}`);
  }
}
