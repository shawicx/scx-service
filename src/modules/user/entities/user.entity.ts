import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
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

  @Column({ type: 'datetime', nullable: true })
  emailVerificationExpiry: Date;

  @Column({ type: 'json', nullable: true })
  preferences: UserPreferences;

  @Column({ type: 'varchar', length: 45, nullable: true })
  @Index()
  lastLoginIp: string;

  @Column({ type: 'datetime', nullable: true })
  lastLoginAt: Date;

  @Column({ type: 'int', default: 1 })
  loginCount: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
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
}
