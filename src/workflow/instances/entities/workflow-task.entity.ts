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
import { WorkflowInstance } from './workflow-instance.entity';
import { WorkflowTaskStatus, WorkflowTaskType } from '../enums/task-status.enum';

@Entity('workflow_tasks')
@Index(['instanceId'])
@Index(['status'])
@Index(['assigneeId'])
@Index(['nodeId'])
@Index(['createdAt'])
export class WorkflowTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'instance_id', type: 'uuid' })
  instanceId: string;

  @Column({ name: 'node_id' })
  nodeId: string;

  @Column({ name: 'node_name' })
  nodeName: string;

  @Column({
    type: 'enum',
    enum: WorkflowTaskType,
  })
  type: WorkflowTaskType;

  @Column({
    type: 'enum',
    enum: WorkflowTaskStatus,
    default: WorkflowTaskStatus.PENDING,
  })
  status: WorkflowTaskStatus;

  @Column({ name: 'assignee_id', type: 'uuid', nullable: true })
  assigneeId: string;

  @Column({ name: 'candidate_users', type: 'jsonb', default: [] })
  candidateUsers: string[];

  @Column({ name: 'candidate_groups', type: 'jsonb', default: [] })
  candidateGroups: string[];

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'form_key', nullable: true })
  formKey: string;

  @Column({ name: 'form_data', type: 'jsonb', default: {} })
  formData: Record<string, any>;

  @Column({ name: 'task_variables', type: 'jsonb', default: {} })
  taskVariables: Record<string, any>;

  @Column({ name: 'due_date', type: 'timestamp', nullable: true })
  dueDate: Date;

  @Column({ type: 'int', default: 50 })
  priority: number;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ name: 'duration_ms', type: 'bigint', nullable: true })
  durationMs: number;

  @Column({ name: 'completed_by', type: 'uuid', nullable: true })
  completedBy: string;

  @Column({ name: 'completion_comment', type: 'text', nullable: true })
  completionComment: string;

  @Column({ name: 'completion_variables', type: 'jsonb', default: {} })
  completionVariables: Record<string, any>;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;

  @Column({ name: 'max_retries', type: 'int', default: 3 })
  maxRetries: number;

  @Column({ name: 'execution_context', type: 'jsonb', default: {} })
  executionContext: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;

  // 关联关系
  @ManyToOne(() => WorkflowInstance, (instance) => instance.tasks, { lazy: true })
  @JoinColumn({ name: 'instance_id' })
  instance: Promise<WorkflowInstance>;

  @ManyToOne(() => User, { lazy: true })
  @JoinColumn({ name: 'assignee_id' })
  assignee: Promise<User>;

  @ManyToOne(() => User, { lazy: true })
  @JoinColumn({ name: 'completed_by' })
  completer: Promise<User>;
}
