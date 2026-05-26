import { Injectable, Logger } from '@nestjs/common';
import { SystemException } from '@/common/exceptions';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class UserRoleService {
  private readonly logger = new Logger(UserRoleService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create user-role assignment
   */
  async create(userId: string, roleId: string): Promise<any> {
    // Verify user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw SystemException.dataNotFound(`User with ID '${userId}' not found`);
    }

    // Verify role exists
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw SystemException.dataNotFound(`Role with ID '${roleId}' not found`);
    }

    // Check if assignment already exists
    const existingAssignment = await this.prisma.userRole.findUnique({
      where: {
        uniq_user_role: { userId, roleId },
      },
    });

    if (existingAssignment) {
      throw SystemException.resourceExists('User already has this role');
    }

    const userRole = await this.prisma.userRole.create({
      data: { userId, roleId },
    });

    this.logger.log(`✅ User role assigned: User ${userId} -> Role ${roleId}`);
    return userRole;
  }

  /**
   * Bulk create user-role assignments
   */
  async createBulk(userId: string, roleIds: string[]): Promise<any[]> {
    // Verify user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw SystemException.dataNotFound(`User with ID '${userId}' not found`);
    }

    // Verify all roles exist
    const roles = await this.prisma.role.findMany({
      where: { id: { in: roleIds } },
    });

    if (roles.length !== roleIds.length) {
      const foundIds = roles.map((r) => r.id);
      const missingIds = roleIds.filter((id) => !foundIds.includes(id));
      throw SystemException.dataNotFound(`Roles not found: ${missingIds.join(', ')}`);
    }

    // Check existing assignments
    const existingAssignments = await this.prisma.userRole.findMany({
      where: { userId, roleId: { in: roleIds } },
    });

    const existingRoleIds = existingAssignments.map((ua) => ua.roleId);
    const newRoleIds = roleIds.filter((id) => !existingRoleIds.includes(id));

    if (newRoleIds.length === 0) {
      throw SystemException.resourceExists('User already has all specified roles');
    }

    // Create new assignments
    await this.prisma.userRole.createMany({
      data: newRoleIds.map((roleId) => ({ userId, roleId })),
    });

    const created = await this.prisma.userRole.findMany({
      where: { userId, roleId: { in: newRoleIds } },
    });

    this.logger.log(`✅ Bulk user roles assigned: User ${userId} -> ${newRoleIds.length} roles`);
    return created;
  }

  /**
   * Find all user-role assignments with optional pagination
   */
  async findAll(page = 1, limit = 10): Promise<{ list: any[]; total: number }> {
    const skip = (page - 1) * limit;

    const [userRoles, total] = await this.prisma.$transaction([
      this.prisma.userRole.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: true, role: true },
      }),
      this.prisma.userRole.count(),
    ]);

    return { list: userRoles, total };
  }

  /**
   * Find user-role assignments by user ID
   */
  async findByUserId(userId: string): Promise<any[]> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw SystemException.dataNotFound(`User with ID '${userId}' not found`);
    }

    return await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find user-role assignments by role ID
   */
  async findByRoleId(roleId: string): Promise<any[]> {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw SystemException.dataNotFound(`Role with ID '${roleId}' not found`);
    }

    return await this.prisma.userRole.findMany({
      where: { roleId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find specific user-role assignment
   */
  async findByUserAndRole(userId: string, roleId: string): Promise<any | null> {
    return await this.prisma.userRole.findUnique({
      where: {
        uniq_user_role: { userId, roleId },
      },
      include: { user: true, role: true },
    });
  }

  /**
   * Delete user-role assignment
   */
  async delete(userId: string, roleId: string): Promise<void> {
    const userRole = await this.prisma.userRole.findUnique({
      where: {
        uniq_user_role: { userId, roleId },
      },
    });

    if (!userRole) {
      throw SystemException.dataNotFound(
        `User role assignment not found for user '${userId}' and role '${roleId}'`,
      );
    }

    await this.prisma.userRole.delete({
      where: {
        uniq_user_role: { userId, roleId },
      },
    });
    this.logger.log(`✅ User role removed: User ${userId} -> Role ${roleId}`);
  }

  /**
   * Delete all user-role assignments for a user
   */
  async deleteByUserId(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw SystemException.dataNotFound(`User with ID '${userId}' not found`);
    }

    const result = await this.prisma.userRole.deleteMany({ where: { userId } });
    this.logger.log(`✅ All user roles removed for user ${userId}: ${result.count} assignments`);
  }

  /**
   * Delete all user-role assignments for a role
   */
  async deleteByRoleId(roleId: string): Promise<void> {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw SystemException.dataNotFound(`Role with ID '${roleId}' not found`);
    }

    const result = await this.prisma.userRole.deleteMany({ where: { roleId } });
    this.logger.log(`✅ All user roles removed for role ${roleId}: ${result.count} assignments`);
  }

  /**
   * Count user-role assignments
   */
  async count(): Promise<number> {
    return await this.prisma.userRole.count();
  }

  /**
   * Count assignments by user ID
   */
  async countByUserId(userId: string): Promise<number> {
    return await this.prisma.userRole.count({ where: { userId } });
  }

  /**
   * Count assignments by role ID
   */
  async countByRoleId(roleId: string): Promise<number> {
    return await this.prisma.userRole.count({ where: { roleId } });
  }
}
