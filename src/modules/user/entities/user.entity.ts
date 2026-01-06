import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  @Index({ unique: true })
  email: string;

  @Column({ length: 50 })
  name: string;

  @Column({ length: 255 })
  password: string;

  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ type: 'varchar', length: 6, nullable: true })
  emailVerificationCode: string;

  @Column({ type: 'timestamp', nullable: true })
  emailVerificationExpiry: Date;

  @Column({ type: 'json', nullable: true })
  preferences: UserPreferences;

  @Column({ type: 'varchar', length: 45, nullable: true })
  @Index()
  lastLoginIp: string;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @Column({ type: 'int', default: 1 })
  loginCount: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // 关系定义
  @OneToMany('UserRole', 'user')
  userRoles: any[];
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacy: {
    profileVisible: boolean;
    showEmail: boolean;
    showLastSeen: boolean;
  };
  // AI 配置
  ai?: {
    defaultProvider?: 'copilot' | 'glm' | 'qwen';
    providers?: {
      copilot?: {
        apiKey: string;
        enabled: boolean;
        baseUrl?: string;
      };
      glm?: {
        apiKey: string;
        enabled: boolean;
        baseUrl?: string;
      };
      qwen?: {
        apiKey: string;
        enabled: boolean;
        baseUrl?: string;
      };
    };
  };
}
