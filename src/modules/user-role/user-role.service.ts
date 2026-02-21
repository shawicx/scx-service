import { Injectable, Logger } from '@nestjs/common';
import { SystemException } from '@/common/exceptions';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from '../role/entities/role.entity';
import { User } from '../user/entities/user.entity';
import { UserRole } from './entities/user-role.entity';

@Injectable()
export class UserRoleService {
  private readonly logger = new Logger(UserRoleService.name);

  constructor(
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  /**
   * Create user-role assignment
   */
  async create(userId: string, roleId: string): Promise<UserRole> {
    // Verify user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw SystemException.dataNotFound(`User with ID '${userId}' not found`);
    }

    // Verify role exists
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw SystemException.dataNotFound(`Role with ID '${roleId}' not found`);
    }

    // Check if assignment already exists
    const existingAssignment = await this.userRoleRepository.findOne({
      where: { userId, roleId },
    });

    if (existingAssignment) {
      throw SystemException.resourceExists('User already has this role');
    }

    const userRole = this.userRoleRepository.create({ userId, roleId });
    const savedUserRole = await this.userRoleRepository.save(userRole);

    this.logger.log(`✅ User role assigned: User ${userId} -> Role ${roleId}`);
    return savedUserRole;
  }

  /**
   * Bulk create user-role assignments
   */
  async createBulk(userId: string, roleIds: string[]): Promise<UserRole[]> {
    // Verify user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw SystemException.dataNotFound(`User with ID '${userId}' not found`);
    }

    // Verify all roles exist
    const roles = await this.roleRepository.find({
      where: { id: In(roleIds) },
    });

    if (roles.length !== roleIds.length) {
      const foundIds = roles.map((r) => r.id);
      const missingIds = roleIds.filter((id) => !foundIds.includes(id));
      throw SystemException.dataNotFound(`Roles not found: ${missingIds.join(', ')}`);
    }

    // Check existing assignments
    const existingAssignments = await this.userRoleRepository.find({
      where: { userId, roleId: In(roleIds) },
    });

    const existingRoleIds = existingAssignments.map((ua) => ua.roleId);
    const newRoleIds = roleIds.filter((id) => !existingRoleIds.includes(id));

    if (newRoleIds.length === 0) {
      throw SystemException.resourceExists('User already has all specified roles');
    }

    // Create new assignments
    const userRoles = newRoleIds.map((roleId) =>
      this.userRoleRepository.create({ userId, roleId }),
    );

    const savedUserRoles = await this.userRoleRepository.save(userRoles);

    this.logger.log(`✅ Bulk user roles assigned: User ${userId} -> ${newRoleIds.length} roles`);
    return savedUserRoles;
  }

  /**
   * Find all user-role assignments with optional pagination
   */
  async findAll(page = 1, limit = 10): Promise<{ list: UserRole[]; total: number }> {
    const skip = (page - 1) * limit;

    const [userRoles, total] = await this.userRoleRepository.findAndCount({
      relations: ['user', 'role'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { list: userRoles, total };
  }

  /**
   * Find user-role assignments by user ID
   */
  async findByUserId(userId: string): Promise<UserRole[]> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw SystemException.dataNotFound(`User with ID '${userId}' not found`);
    }

    return await this.userRoleRepository.find({
      where: { userId },
      relations: ['role'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find user-role assignments by role ID
   */
  async findByRoleId(roleId: string): Promise<UserRole[]> {
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw SystemException.dataNotFound(`Role with ID '${roleId}' not found`);
    }

    return await this.userRoleRepository.find({
      where: { roleId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find specific user-role assignment
   */
  async findByUserAndRole(userId: string, roleId: string): Promise<UserRole | null> {
    return await this.userRoleRepository.findOne({
      where: { userId, roleId },
      relations: ['user', 'role'],
    });
  }

  /**
   * Delete user-role assignment
   */
  async delete(userId: string, roleId: string): Promise<void> {
    const userRole = await this.userRoleRepository.findOne({
      where: { userId, roleId },
    });

    if (!userRole) {
      throw SystemException.dataNotFound(
        `User role assignment not found for user '${userId}' and role '${roleId}'`,
      );
    }

    await this.userRoleRepository.remove(userRole);
    this.logger.log(`✅ User role removed: User ${userId} -> Role ${roleId}`);
  }

  /**
   * Delete all user-role assignments for a user
   */
  async deleteByUserId(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw SystemException.dataNotFound(`User with ID '${userId}' not found`);
    }

    const result = await this.userRoleRepository.delete({ userId });
    this.logger.log(`✅ All user roles removed for user ${userId}: ${result.affected} assignments`);
  }

  /**
   * Delete all user-role assignments for a role
   */
  async deleteByRoleId(roleId: string): Promise<void> {
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw SystemException.dataNotFound(`Role with ID '${roleId}' not found`);
    }

    const result = await this.userRoleRepository.delete({ roleId });
    this.logger.log(`✅ All user roles removed for role ${roleId}: ${result.affected} assignments`);
  }

  /**
   * Count user-role assignments
   */
  async count(): Promise<number> {
    return await this.userRoleRepository.count();
  }

  /**
   * Count assignments by user ID
   */
  async countByUserId(userId: string): Promise<number> {
    return await this.userRoleRepository.count({ where: { userId } });
  }

  /**
   * Count assignments by role ID
   */
  async countByRoleId(roleId: string): Promise<number> {
    return await this.userRoleRepository.count({ where: { roleId } });
  }
}
