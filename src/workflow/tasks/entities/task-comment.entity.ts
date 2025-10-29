import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { WorkflowTask } from '@/workflow/instances/entities/workflow-task.entity';

@Entity('task_comments')
@Index(['taskId'])
@Index(['createdBy'])
@Index(['createdAt'])
export class TaskComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id', type: 'uuid' })
  taskId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'is_internal', default: false })
  isInternal: boolean;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;

  // 关联关系
  @ManyToOne(() => WorkflowTask, { lazy: true })
  @JoinColumn({ name: 'task_id' })
  task: Promise<WorkflowTask>;

  @ManyToOne(() => User, { lazy: true })
  @JoinColumn({ name: 'created_by' })
  creator: Promise<User>;
}
