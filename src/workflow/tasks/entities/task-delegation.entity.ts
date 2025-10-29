import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { WorkflowTask } from '@/workflow/instances/entities/workflow-task.entity';

@Entity('task_delegations')
@Index(['taskId'])
@Index(['fromUserId'])
@Index(['toUserId'])
@Index(['createdAt'])
export class TaskDelegation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id', type: 'uuid' })
  taskId: string;

  @Column({ name: 'from_user_id', type: 'uuid' })
  fromUserId: string;

  @Column({ name: 'to_user_id', type: 'uuid' })
  toUserId: string;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ name: 'delegated_by', type: 'uuid' })
  delegatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  // 关联关系
  @ManyToOne(() => WorkflowTask, { lazy: true })
  @JoinColumn({ name: 'task_id' })
  task: Promise<WorkflowTask>;

  @ManyToOne(() => User, { lazy: true })
  @JoinColumn({ name: 'from_user_id' })
  fromUser: Promise<User>;

  @ManyToOne(() => User, { lazy: true })
  @JoinColumn({ name: 'to_user_id' })
  toUser: Promise<User>;

  @ManyToOne(() => User, { lazy: true })
  @JoinColumn({ name: 'delegated_by' })
  delegator: Promise<User>;
}
