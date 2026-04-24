import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@/common/base/base.entity';
import { Permission } from '../../permission/entities/permission.entity';
import { Role } from '../../role/entities/role.entity';

@Entity('role_permissions')
@Index('uniq_role_permission', ['roleId', 'permissionId'], { unique: true })
export class RolePermission extends BaseEntity {
  @Column({ type: 'char', length: 26 })
  roleId: string;

  @Column({ type: 'char', length: 26 })
  permissionId: string;

  @CreateDateColumn({ type: 'timestamp', precision: 6 })
  createdAt: Date;

  // 关系定义
  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @ManyToOne(() => Permission, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permissionId' })
  permission: Permission;
}
