import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository, SelectQueryBuilder } from 'typeorm';
import { RolePermission } from '../role-permission/entities/role-permission.entity';
import {
  CreatePermissionDto,
  PermissionQueryDto,
  PermissionResponseDto,
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
    // Check if permission with same name already exists
    const existingPermission = await this.permissionRepository.findOne({
      where: { name: createPermissionDto.name },
    });

    if (existingPermission) {
      throw new ConflictException(
        `Permission with name '${createPermissionDto.name}' already exists`,
      );
    }

    // Check if action-resource combination already exists
    const existingActionResource = await this.permissionRepository.findOne({
      where: {
        action: createPermissionDto.action,
        resource: createPermissionDto.resource,
      },
    });

    if (existingActionResource) {
      throw new ConflictException(
        `Permission with action '${createPermissionDto.action}' and resource '${createPermissionDto.resource}' already exists`,
      );
    }

    const permission = this.permissionRepository.create(createPermissionDto);
    const savedPermission = await this.permissionRepository.save(permission);

    this.logger.log(
      `✅ Permission created: ${savedPermission.name} (${savedPermission.action}:${savedPermission.resource})`,
    );

    return new PermissionResponseDto(savedPermission);
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
      .orderBy('permission.createdAt', 'DESC');

    // Apply filters
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

    // Apply pagination
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
      throw new NotFoundException(`Permission with ID '${id}' not found`);
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
      throw new NotFoundException(`Permission with ID '${id}' not found`);
    }

    // Check for conflicts if name is being updated
    if (updatePermissionDto.name && updatePermissionDto.name !== permission.name) {
      const existingPermission = await this.permissionRepository.findOne({
        where: { name: updatePermissionDto.name },
      });

      if (existingPermission && existingPermission.id !== id) {
        throw new ConflictException(
          `Permission with name '${updatePermissionDto.name}' already exists`,
        );
      }
    }

    // Check for action-resource combination conflicts
    if (updatePermissionDto.action || updatePermissionDto.resource) {
      const action = updatePermissionDto.action || permission.action;
      const resource = updatePermissionDto.resource || permission.resource;

      if (action !== permission.action || resource !== permission.resource) {
        const existingActionResource = await this.permissionRepository.findOne({
          where: { action, resource },
        });

        if (existingActionResource && existingActionResource.id !== id) {
          throw new ConflictException(
            `Permission with action '${action}' and resource '${resource}' already exists`,
          );
        }
      }
    }

    Object.assign(permission, updatePermissionDto);
    const updatedPermission = await this.permissionRepository.save(permission);

    this.logger.log(
      `✅ Permission updated: ${updatedPermission.name} (${updatedPermission.action}:${updatedPermission.resource})`,
    );

    return new PermissionResponseDto(updatedPermission);
  }

  /**
   * Delete permission by ID
   */
  async delete(id: string): Promise<void> {
    const permission = await this.permissionRepository.findOne({ where: { id } });

    if (!permission) {
      throw new NotFoundException(`Permission with ID '${id}' not found`);
    }

    // Check if permission is assigned to any roles
    const roleCount = await this.rolePermissionRepository.count({
      where: { permissionId: id },
    });

    if (roleCount > 0) {
      throw new ConflictException(
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
}
