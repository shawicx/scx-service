import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';
import { AiProviderType } from '../interfaces/ai-provider.interface';

@Entity('ai_requests')
export class AiRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'varchar', length: 20 })
  @Index()
  provider: AiProviderType;

  @Column({ type: 'json' })
  messages: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  response: Record<string, any> | null;

  @Column({ type: 'int' })
  promptTokens: number;

  @Column({ type: 'int' })
  completionTokens: number;

  @Column({ type: 'int' })
  totalTokens: number;

  @Column({ type: 'int' })
  duration: number; // 毫秒

  @Column({ type: 'boolean', default: false })
  isStream: boolean;

  @Column({ type: 'varchar', length: 20, nullable: true })
  finishReason: string | null;

  @Column({ type: 'boolean', default: false })
  isCached: boolean;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
