import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'type', type: 'nvarchar', length: 30 })
  type: string;

  @Column({ name: 'title', type: 'nvarchar', length: 200 })
  title: string;

  @Column({ name: 'message', type: 'nvarchar', length: 500 })
  message: string;

  @Column({ name: 'reference_type', type: 'nvarchar', length: 30, nullable: true })
  referenceType: string;

  @Column({ name: 'reference_id', type: 'uniqueidentifier', nullable: true })
  referenceId: string;

  @Column({ name: 'actor_id', type: 'int', nullable: true })
  actorId: number;

  @Column({ name: 'is_read', type: 'bit', default: false })
  isRead: boolean;

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
