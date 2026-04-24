import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@/common/base/base.entity';
import { Role } from '../../role/entities/role.entity';
import { User } from '../../user/entities/user.entity';

@Entity('user_roles')
@Index('uniq_user_role', ['userId', 'roleId'], { unique: true })
export class UserRole extends BaseEntity {
  @Column({ type: 'char', length: 26 })
  userId: string;

  @Column({ type: 'char', length: 26 })
  roleId: string;

  @CreateDateColumn({ type: 'timestamp', precision: 6 })
  createdAt: Date;

  // 关系定义
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roleId' })
  role: Role;
}
