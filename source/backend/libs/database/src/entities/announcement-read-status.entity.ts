import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Announcement } from './announcement.entity';

@Entity('announcement_read_status')
@Unique(['announcementId', 'userId'])
export class AnnouncementReadStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'announcement_id', type: 'uniqueidentifier' })
  announcementId: string;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'read_at', type: 'datetime2' })
  readAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number;

  @Column({ name: 'is_deleted', type: 'bit', default: false })
  isDeleted: boolean;

  @ManyToOne(() => Announcement, (a) => a.readStatuses)
  @JoinColumn({ name: 'announcement_id' })
  announcement: Announcement;

  // No @ManyToOne to User (cross-database)
}
