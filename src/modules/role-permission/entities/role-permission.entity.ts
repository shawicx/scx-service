import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Permission } from '../../permission/entities/permission.entity';
import { Role } from '../../role/entities/role.entity';

@Entity('role_permissions')
@Index('uniq_role_permission', ['roleId', 'permissionId'], { unique: true })
export class RolePermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 36 })
  roleId: string;

  @Column('varchar', { length: 36 })
  permissionId: string;

  @CreateDateColumn({ type: 'datetime', precision: 6 })
  createdAt: Date;

  // 关系定义
  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @ManyToOne(() => Permission, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permissionId' })
  permission: Permission;
}
