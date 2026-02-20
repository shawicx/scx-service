import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  @Index({ unique: true })
  name: string;

  @Column({ length: 50, nullable: true, comment: '动作，如 read, write, delete' })
  action: string | null;

  @Column({ length: 100, nullable: true, comment: '资源，如 user, workflow, task' })
  resource: string | null;

  @Column({ length: 255, nullable: true })
  description: string;

  @Column({
    length: 20,
    comment: '权限类型：MENU-菜单, BUTTON-按钮',
    default: 'BUTTON',
  })
  type: 'MENU' | 'BUTTON';

  @Column({ type: 'uuid', nullable: true, comment: '父权限ID（树形结构）' })
  @Index()
  parentId: string | null;

  @Column({
    type: 'int',
    default: 0,
    comment: '层级：0-根菜单, 1-一级菜单, 2-二级菜单或一级菜单下的按钮, 3-二级菜单下的按钮',
  })
  @Index()
  level: number;

  @Column({ length: 200, nullable: true, comment: '路由路径（菜单用）' })
  path: string | null;

  @Column({ length: 100, nullable: true, comment: '图标（菜单用）' })
  icon: string | null;

  @Column({ type: 'int', default: 0, comment: '排序号' })
  sort: number;

  @Column({ type: 'smallint', default: 1, comment: '是否可见：0-隐藏, 1-显示' })
  visible: number;

  @Column({ type: 'smallint', default: 1, comment: '状态：0-禁用, 1-启用' })
  status: number;

  @CreateDateColumn({ type: 'timestamp', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', precision: 6 })
  updatedAt: Date;

  // 关系定义
  @OneToMany('RolePermission', 'permission')
  rolePermissions: any[];

  // 树形结构关系
  @ManyToOne(() => Permission, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentId' })
  parent: Permission | null;

  @OneToMany(() => Permission, (p) => p.parent)
  children: Permission[];
}
