import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AnnouncementReadStatus } from './announcement-read-status.entity';

@Entity('announcements')
export class Announcement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'title', type: 'nvarchar', length: 200 })
  title: string;

  @Column({ name: 'content', type: 'nvarchar', length: 'MAX' })
  content: string;

  @Column({ name: 'is_pinned', type: 'bit', default: false })
  isPinned: boolean;

  @Column({ name: 'publish_at', type: 'datetime2', nullable: true })
  publishAt: Date;

  @Column({ name: 'expires_at', type: 'datetime2', nullable: true })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number;

  @Column({ name: 'is_deleted', type: 'bit', default: false })
  isDeleted: boolean;

  // No @ManyToOne to User (cross-database)

  @OneToMany(() => AnnouncementReadStatus, (ars) => ars.announcement)
  readStatuses: AnnouncementReadStatus[];
}
