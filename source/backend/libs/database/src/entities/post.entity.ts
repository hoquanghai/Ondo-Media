import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PostFile } from './post-file.entity';
import { Like } from './like.entity';
import { Comment } from './comment.entity';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'title', type: 'nvarchar', length: 200, nullable: true })
  title: string;

  @Column({ name: 'content', type: 'nvarchar', length: 'MAX' })
  content: string;

  @Column({ name: 'post_date', type: 'date' })
  postDate: string;

  @Column({ name: 'like_count', type: 'int', default: 0 })
  likeCount: number;

  @Column({ name: 'comment_count', type: 'int', default: 0 })
  commentCount: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number;

  @Column({ name: 'is_deleted', type: 'bit', default: false })
  isDeleted: boolean;

  // Note: No @ManyToOne to User because User is in DR database (cross-db FK not supported)
  // User data is joined at the application level when needed

  @OneToMany(() => PostFile, (pf) => pf.post)
  files: PostFile[];

  @OneToMany(() => Like, (like) => like.post)
  likes: Like[];

  @OneToMany(() => Comment, (comment) => comment.post)
  comments: Comment[];
}
