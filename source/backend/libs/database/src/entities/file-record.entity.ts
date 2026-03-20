import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('file_records')
export class FileRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'uploaded_by', type: 'int' })
  uploadedBy: number;

  @Column({ name: 'original_name', type: 'nvarchar', length: 255 })
  originalName: string;

  @Column({ name: 'mime_type', type: 'nvarchar', length: 100 })
  mimeType: string;

  @Column({ name: 'size', type: 'bigint' })
  size: number;

  @Column({ name: 'object_key', type: 'nvarchar', length: 500 })
  objectKey: string;

  @Column({ name: 'thumbnail_key', type: 'nvarchar', length: 500, nullable: true })
  thumbnailKey: string;

  @Column({ name: 'category', type: 'nvarchar', length: 20 })
  category: string; // 'image', 'video', 'document', 'other'

  @Column({ name: 'is_compressed', type: 'bit', default: false })
  isCompressed: boolean;

  @CreateDateColumn({ name: 'uploaded_at', type: 'datetime2' })
  uploadedAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;

  @Column({ name: 'is_deleted', type: 'bit', default: false })
  isDeleted: boolean;

  // No @ManyToOne to User (cross-database)
}
