import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { WorkflowDefinition } from '@/workflow/definitions/entities/workflow-definition.entity';
import { WorkflowTask } from './workflow-task.entity';
import { WorkflowInstanceStatus } from '../enums/instance-status.enum';

@Entity('workflow_instances')
@Index(['status'])
@Index(['definitionId'])
@Index(['startedBy'])
@Index(['startTime'])
export class WorkflowInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'definition_id', type: 'uuid' })
  definitionId: string;

  @Column({ name: 'definition_version', type: 'int' })
  definitionVersion: number;

  @Column({ name: 'business_key', nullable: true })
  businessKey: string;

  @Column({
    type: 'enum',
    enum: WorkflowInstanceStatus,
    default: WorkflowInstanceStatus.RUNNING,
  })
  status: WorkflowInstanceStatus;

  @Column({ name: 'current_node_id', nullable: true })
  currentNodeId: string;

  @Column({ type: 'jsonb', default: {} })
  variables: Record<string, any>;

  @Column({ name: 'execution_path', type: 'jsonb', default: [] })
  executionPath: Array<{
    nodeId: string;
    nodeName: string;
    timestamp: Date;
    variables?: Record<string, any>;
    result?: any;
  }>;

  @Column({ name: 'started_by', type: 'uuid' })
  startedBy: string;

  @Column({ name: 'start_time', type: 'timestamp' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamp', nullable: true })
  endTime: Date;

  @Column({ name: 'duration_ms', type: 'bigint', nullable: true })
  durationMs: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'error_stack', type: 'text', nullable: true })
  errorStack: string;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ name: 'parent_instance_id', type: 'uuid', nullable: true })
  parentInstanceId: string;

  @Column({ name: 'root_instance_id', type: 'uuid', nullable: true })
  rootInstanceId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;

  // 关联关系
  @ManyToOne(() => WorkflowDefinition, { lazy: true })
  @JoinColumn({ name: 'definition_id' })
  definition: Promise<WorkflowDefinition>;

  @ManyToOne(() => User, { lazy: true })
  @JoinColumn({ name: 'started_by' })
  starter: Promise<User>;

  @OneToMany(() => WorkflowTask, (task) => task.instance, { lazy: true })
  tasks: Promise<WorkflowTask[]>;

  @ManyToOne(() => WorkflowInstance, { lazy: true })
  @JoinColumn({ name: 'parent_instance_id' })
  parentInstance: Promise<WorkflowInstance>;

  @ManyToOne(() => WorkflowInstance, { lazy: true })
  @JoinColumn({ name: 'root_instance_id' })
  rootInstance: Promise<WorkflowInstance>;

  @OneToMany(() => WorkflowInstance, (instance) => instance.parentInstance, { lazy: true })
  childInstances: Promise<WorkflowInstance[]>;
}
