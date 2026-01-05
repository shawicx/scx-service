/*
 * @Author: shawicx d35f3153@proton.me
 * @Date: 2025-08-23 20:31:00
 * @LastEditors: shawicx d35f3153@proton.me
 * @LastEditTime: 2025-08-23 21:55:54
 * @Description:
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  @Index({ unique: true })
  name: string;

  @Column({ length: 50 })
  @Index({ unique: true })
  code: string;

  @Column({ length: 255, nullable: true })
  description: string;

  @Column({ type: 'boolean', default: false, comment: '是否系统内置角色' })
  isSystem: boolean;

  @CreateDateColumn({ type: 'timestamp', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', precision: 6 })
  updatedAt: Date;

  // 关系定义
  @OneToMany('UserRole', 'role')
  userRoles: any[];

  @OneToMany('RolePermission', 'role')
  rolePermissions: any[];

  @ManyToMany('Permission', 'roles')
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'roleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permissionId', referencedColumnName: 'id' },
  })
  permissions: any[];
}
