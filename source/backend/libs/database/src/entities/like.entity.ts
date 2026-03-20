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
import { Post } from './post.entity';

@Entity('likes')
@Unique(['postId', 'userId'])
export class Like {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'post_id', type: 'uniqueidentifier' })
  postId: string;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number;

  @Column({ name: 'reaction_type', type: 'nvarchar', length: 20, default: "'like'" })
  reactionType: string;

  @Column({ name: 'is_deleted', type: 'bit', default: false })
  isDeleted: boolean;

  @ManyToOne(() => Post, (post) => post.likes)
  @JoinColumn({ name: 'post_id' })
  post: Post;

  // No @ManyToOne to User (cross-database)
}
