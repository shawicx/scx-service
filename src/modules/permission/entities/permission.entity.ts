import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('permissions')
@Index('uniq_action_resource', ['action', 'resource'], { unique: true })
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  @Index({ unique: true })
  name: string;

  @Column({ length: 50, comment: '动作，如 read, write, delete' })
  action: string;

  @Column({ length: 100, comment: '资源，如 user, workflow, task' })
  resource: string;

  @Column({ length: 255, nullable: true })
  description: string;

  @CreateDateColumn({ type: 'timestamp', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', precision: 6 })
  updatedAt: Date;

  // 关系定义
  @OneToMany('RolePermission', 'permission')
  rolePermissions: any[];
}
