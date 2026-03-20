import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('push_subscriptions')
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'endpoint', type: 'nvarchar', length: 500, unique: true })
  endpoint: string;

  @Column({ name: 'p256dh', type: 'nvarchar', length: 255 })
  p256dh: string;

  @Column({ name: 'auth', type: 'nvarchar', length: 255 })
  auth: string;

  @Column({ name: 'user_agent', type: 'nvarchar', length: 500, nullable: true })
  userAgent: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number;

  @Column({ name: 'is_deleted', type: 'bit', default: false })
  isDeleted: boolean;

  // No @ManyToOne to User (cross-database)
}
