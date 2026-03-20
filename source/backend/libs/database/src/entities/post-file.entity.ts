import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Post } from './post.entity';

@Entity('post_files')
export class PostFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'post_id', type: 'uniqueidentifier' })
  postId: string;

  @Column({ name: 'file_name', type: 'nvarchar', length: 255 })
  fileName: string;

  @Column({ name: 'storage_key', type: 'nvarchar', length: 500 })
  storageKey: string;

  @Column({ name: 'file_size', type: 'bigint' })
  fileSize: number;

  @Column({ name: 'mime_type', type: 'nvarchar', length: 100 })
  mimeType: string;

  @Column({ name: 'file_type', type: 'nvarchar', length: 20 })
  fileType: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number;

  @Column({ name: 'is_deleted', type: 'bit', default: false })
  isDeleted: boolean;

  @ManyToOne(() => Post, (post) => post.files)
  @JoinColumn({ name: 'post_id' })
  post: Post;
}
