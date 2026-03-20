# Phase 04 — Timeline & Posts

## Objectives

- Create the `post-service` microservice (port 3003, NestJS TCP transport).
- Implement Post CRUD with `post_date` supporting backdating.
- Build timeline queries: posts grouped by date with cursor-based pagination.
- Provide date-counts endpoint: post counts per date within a range.
- Implement like system with unique constraint per user per post and denormalized `like_count`.
- Implement comment CRUD on posts.
- Publish domain events via Redis Pub/Sub: `post.created`, `post.liked`, `post.commented`.
- Cache timeline results by date in Redis.

---

## Prerequisites

- Phases 01-03 complete.
- Posts, post_likes, and comments tables migrated.
- Redis running for caching and Pub/Sub.

### Additional Packages

```bash
pnpm add ioredis
```

---

## Tasks

### 1. Scaffold the Post Service

```bash
nest generate app post-service
```

#### `apps/post-service/src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { PostServiceModule } from './post-service.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    PostServiceModule,
    {
      transport: Transport.TCP,
      options: { host: '0.0.0.0', port: 3003 },
    },
  );
  await app.listen();
  console.log('Post service listening on TCP port 3003');
}
bootstrap();
```

### 2. Post Entity

**File**: `libs/database/src/entities/post.entity.ts`

```typescript
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  JoinColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { PostLike } from './post-like.entity';
import { Comment } from './comment.entity';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ type: 'nvarchar', length: 4000 })
  content: string;

  @Column({ type: 'date' })
  post_date: Date; // Supports backdating — the date the post is "for"

  @Column({ type: 'simple-json', nullable: true })
  attachments: string[]; // File IDs or URLs

  @Column({ default: 0 })
  like_count: number; // Denormalized for performance

  @Column({ default: 0 })
  comment_count: number; // Denormalized for performance

  @OneToMany(() => PostLike, (pl) => pl.post)
  likes: PostLike[];

  @OneToMany(() => Comment, (c) => c.post)
  comments: Comment[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
```

**File**: `libs/database/src/entities/post-like.entity.ts`

```typescript
import {
  CreateDateColumn,
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Post } from './post.entity';

@Entity('post_likes')
@Unique(['user', 'post'])
export class PostLike {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Post, (p) => p.likes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @CreateDateColumn()
  created_at: Date;
}
```

**File**: `libs/database/src/entities/comment.entity.ts`

```typescript
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Post } from './post.entity';

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Post, (p) => p.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ type: 'nvarchar', length: 2000 })
  content: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
```

### 3. Post Service Module

**File**: `apps/post-service/src/post-service.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@app/database';
import { Post } from '@app/database/entities/post.entity';
import { PostLike } from '@app/database/entities/post-like.entity';
import { Comment } from '@app/database/entities/comment.entity';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { LikeService } from './like.service';
import { CommentService } from './comment.service';
import { TimelineCacheService } from './timeline-cache.service';
import { EventPublisher } from './event-publisher.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    TypeOrmModule.forFeature([Post, PostLike, Comment]),
  ],
  controllers: [PostController],
  providers: [
    PostService,
    LikeService,
    CommentService,
    TimelineCacheService,
    EventPublisher,
  ],
})
export class PostServiceModule {}
```

### 4. Post Service Controller (TCP)

**File**: `apps/post-service/src/post.controller.ts`

```typescript
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PostService } from './post.service';
import { LikeService } from './like.service';
import { CommentService } from './comment.service';

@Controller()
export class PostController {
  constructor(
    private readonly postService: PostService,
    private readonly likeService: LikeService,
    private readonly commentService: CommentService,
  ) {}

  // --- Post CRUD ---

  @MessagePattern('post.create')
  async create(@Payload() data: {
    authorId: string;
    content: string;
    postDate: string;
    attachments?: string[];
  }) {
    return this.postService.create(data);
  }

  @MessagePattern('post.update')
  async update(@Payload() data: { id: string; userId: string; content: string }) {
    return this.postService.update(data.id, data.userId, data.content);
  }

  @MessagePattern('post.delete')
  async delete(@Payload() data: { id: string; userId: string }) {
    return this.postService.delete(data.id, data.userId);
  }

  @MessagePattern('post.findById')
  async findById(@Payload() data: { id: string }) {
    return this.postService.findById(data.id);
  }

  // --- Timeline ---

  @MessagePattern('post.timeline')
  async timeline(@Payload() data: {
    date: string;
    page: number;
    limit: number;
  }) {
    return this.postService.getTimeline(data);
  }

  @MessagePattern('post.dateCounts')
  async dateCounts(@Payload() data: { startDate: string; endDate: string }) {
    return this.postService.getDateCounts(data.startDate, data.endDate);
  }

  // --- Likes ---

  @MessagePattern('post.like')
  async like(@Payload() data: { postId: string; userId: string }) {
    return this.likeService.like(data.postId, data.userId);
  }

  @MessagePattern('post.unlike')
  async unlike(@Payload() data: { postId: string; userId: string }) {
    return this.likeService.unlike(data.postId, data.userId);
  }

  // --- Comments ---

  @MessagePattern('post.addComment')
  async addComment(@Payload() data: {
    postId: string;
    authorId: string;
    content: string;
  }) {
    return this.commentService.create(data);
  }

  @MessagePattern('post.updateComment')
  async updateComment(@Payload() data: {
    commentId: string;
    userId: string;
    content: string;
  }) {
    return this.commentService.update(data);
  }

  @MessagePattern('post.deleteComment')
  async deleteComment(@Payload() data: { commentId: string; userId: string }) {
    return this.commentService.delete(data.commentId, data.userId);
  }

  @MessagePattern('post.getComments')
  async getComments(@Payload() data: { postId: string; page: number; limit: number }) {
    return this.commentService.findByPost(data);
  }
}
```

### 5. Post Service Logic

**File**: `apps/post-service/src/post.service.ts`

```typescript
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Post } from '@app/database/entities/post.entity';
import { PaginatedResponseDto } from '@app/common';
import { TimelineCacheService } from './timeline-cache.service';
import { EventPublisher } from './event-publisher.service';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
    private readonly cache: TimelineCacheService,
    private readonly events: EventPublisher,
  ) {}

  async create(data: {
    authorId: string;
    content: string;
    postDate: string;
    attachments?: string[];
  }) {
    const post = this.postRepo.create({
      author: { id: data.authorId } as any,
      content: data.content,
      post_date: new Date(data.postDate),
      attachments: data.attachments ?? [],
    });
    const saved = await this.postRepo.save(post);

    // Invalidate cache for this date
    await this.cache.invalidate(data.postDate);

    // Publish event
    await this.events.publish('post.created', {
      postId: saved.id,
      authorId: data.authorId,
      postDate: data.postDate,
    });

    return saved;
  }

  async update(id: string, userId: string, content: string) {
    const post = await this.postRepo.findOne({
      where: { id },
      relations: ['author'],
    });
    if (!post) throw new NotFoundException('Post not found');
    if (post.author.id !== userId) {
      throw new ForbiddenException('Cannot edit another user\'s post');
    }

    post.content = content;
    const saved = await this.postRepo.save(post);
    await this.cache.invalidate(post.post_date.toString());
    return saved;
  }

  async delete(id: string, userId: string) {
    const post = await this.postRepo.findOne({
      where: { id },
      relations: ['author'],
    });
    if (!post) throw new NotFoundException('Post not found');
    if (post.author.id !== userId) {
      throw new ForbiddenException('Cannot delete another user\'s post');
    }

    await this.postRepo.softDelete(id);
    await this.cache.invalidate(post.post_date.toString());
    return { deleted: true };
  }

  async findById(id: string) {
    const post = await this.postRepo.findOne({
      where: { id },
      relations: ['author', 'comments', 'comments.author'],
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async getTimeline(params: { date: string; page: number; limit: number }) {
    const { date, page = 1, limit = 20 } = params;

    // Try cache first
    const cached = await this.cache.get(date, page, limit);
    if (cached) return cached;

    const [items, total] = await this.postRepo.findAndCount({
      where: { post_date: new Date(date) as any },
      relations: ['author'],
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });

    const result = PaginatedResponseDto.from(items, total, page, limit);

    // Cache result
    await this.cache.set(date, page, limit, result);
    return result;
  }

  async getDateCounts(startDate: string, endDate: string) {
    const rows = await this.postRepo
      .createQueryBuilder('post')
      .select('CAST(post.post_date AS DATE)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('post.post_date BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .andWhere('post.deleted_at IS NULL')
      .groupBy('CAST(post.post_date AS DATE)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return rows.map((r) => ({
      date: r.date,
      count: parseInt(r.count, 10),
    }));
  }
}
```

### 6. Like Service

**File**: `apps/post-service/src/like.service.ts`

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '@app/database/entities/post.entity';
import { PostLike } from '@app/database/entities/post-like.entity';
import { EventPublisher } from './event-publisher.service';

@Injectable()
export class LikeService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
    @InjectRepository(PostLike)
    private readonly likeRepo: Repository<PostLike>,
    private readonly events: EventPublisher,
  ) {}

  async like(postId: string, userId: string) {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    // Unique constraint prevents duplicates — catch and ignore
    try {
      const like = this.likeRepo.create({
        user: { id: userId } as any,
        post: { id: postId } as any,
      });
      await this.likeRepo.save(like);

      // Denormalize count
      await this.postRepo.increment({ id: postId }, 'like_count', 1);

      // Publish event
      await this.events.publish('post.liked', {
        postId,
        likerId: userId,
        postAuthorId: post.author?.id,
      });
    } catch (err: any) {
      // Duplicate — user already liked
      if (err?.code === 'EREQUEST' || err?.number === 2627) {
        return { alreadyLiked: true };
      }
      throw err;
    }

    return { liked: true };
  }

  async unlike(postId: string, userId: string) {
    const result = await this.likeRepo.delete({
      user: { id: userId } as any,
      post: { id: postId } as any,
    });

    if (result.affected && result.affected > 0) {
      await this.postRepo.decrement({ id: postId }, 'like_count', 1);
    }

    return { unliked: true };
  }
}
```

### 7. Comment Service

**File**: `apps/post-service/src/comment.service.ts`

```typescript
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '@app/database/entities/post.entity';
import { Comment } from '@app/database/entities/comment.entity';
import { PaginatedResponseDto } from '@app/common';
import { EventPublisher } from './event-publisher.service';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
    private readonly events: EventPublisher,
  ) {}

  async create(data: { postId: string; authorId: string; content: string }) {
    const post = await this.postRepo.findOne({ where: { id: data.postId } });
    if (!post) throw new NotFoundException('Post not found');

    const comment = this.commentRepo.create({
      post: { id: data.postId } as any,
      author: { id: data.authorId } as any,
      content: data.content,
    });
    const saved = await this.commentRepo.save(comment);

    // Denormalize count
    await this.postRepo.increment({ id: data.postId }, 'comment_count', 1);

    // Publish event
    await this.events.publish('post.commented', {
      postId: data.postId,
      commentId: saved.id,
      authorId: data.authorId,
      postAuthorId: post.author?.id,
    });

    return saved;
  }

  async update(data: { commentId: string; userId: string; content: string }) {
    const comment = await this.commentRepo.findOne({
      where: { id: data.commentId },
      relations: ['author'],
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.author.id !== data.userId) {
      throw new ForbiddenException('Cannot edit another user\'s comment');
    }

    comment.content = data.content;
    return this.commentRepo.save(comment);
  }

  async delete(commentId: string, userId: string) {
    const comment = await this.commentRepo.findOne({
      where: { id: commentId },
      relations: ['author', 'post'],
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.author.id !== userId) {
      throw new ForbiddenException('Cannot delete another user\'s comment');
    }

    await this.commentRepo.softDelete(commentId);
    await this.postRepo.decrement({ id: comment.post.id }, 'comment_count', 1);
    return { deleted: true };
  }

  async findByPost(params: { postId: string; page: number; limit: number }) {
    const { postId, page = 1, limit = 20 } = params;
    const [items, total] = await this.commentRepo.findAndCount({
      where: { post: { id: postId } },
      relations: ['author'],
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'ASC' },
    });
    return PaginatedResponseDto.from(items, total, page, limit);
  }
}
```

### 8. Redis Timeline Cache

**File**: `apps/post-service/src/timeline-cache.service.ts`

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class TimelineCacheService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis;
  private readonly TTL = 300; // 5 minutes

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.redis = new Redis({
      host: this.config.get('REDIS_HOST', 'localhost'),
      port: this.config.get('REDIS_PORT', 6379),
    });
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  private key(date: string, page: number, limit: number) {
    return `timeline:${date}:${page}:${limit}`;
  }

  async get(date: string, page: number, limit: number) {
    const data = await this.redis.get(this.key(date, page, limit));
    return data ? JSON.parse(data) : null;
  }

  async set(date: string, page: number, limit: number, value: any) {
    await this.redis.set(
      this.key(date, page, limit),
      JSON.stringify(value),
      'EX',
      this.TTL,
    );
  }

  async invalidate(date: string) {
    const pattern = `timeline:${date}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

### 9. Redis Event Publisher

**File**: `apps/post-service/src/event-publisher.service.ts`

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class EventPublisher implements OnModuleInit, OnModuleDestroy {
  private redis: Redis;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.redis = new Redis({
      host: this.config.get('REDIS_HOST', 'localhost'),
      port: this.config.get('REDIS_PORT', 6379),
    });
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  async publish(channel: string, data: any) {
    await this.redis.publish(channel, JSON.stringify(data));
  }
}
```

### 10. API Gateway Timeline Controllers

**File**: `apps/api-gateway/src/posts/posts.controller.ts`

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { CurrentUser, JwtAuthGuard, SERVICE_TOKENS } from '@app/common';

@ApiTags('Posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/posts')
export class PostsController {
  constructor(
    @Inject(SERVICE_TOKENS.POST_SERVICE)
    private readonly postClient: ClientProxy,
  ) {}

  @Post()
  async create(
    @CurrentUser('sub') userId: string,
    @Body() body: { content: string; postDate: string; attachments?: string[] },
  ) {
    return firstValueFrom(
      this.postClient.send('post.create', { ...body, authorId: userId }),
    );
  }

  @Get('timeline')
  async timeline(
    @Query('date') date: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return firstValueFrom(
      this.postClient.send('post.timeline', { date, page, limit }),
    );
  }

  @Get('date-counts')
  async dateCounts(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return firstValueFrom(
      this.postClient.send('post.dateCounts', { startDate, endDate }),
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return firstValueFrom(this.postClient.send('post.findById', { id }));
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() body: { content: string },
  ) {
    return firstValueFrom(
      this.postClient.send('post.update', { id, userId, content: body.content }),
    );
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return firstValueFrom(
      this.postClient.send('post.delete', { id, userId }),
    );
  }

  // --- Likes ---

  @Post(':id/like')
  async like(
    @Param('id') postId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return firstValueFrom(
      this.postClient.send('post.like', { postId, userId }),
    );
  }

  @Delete(':id/like')
  async unlike(
    @Param('id') postId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return firstValueFrom(
      this.postClient.send('post.unlike', { postId, userId }),
    );
  }

  // --- Comments ---

  @Get(':id/comments')
  async getComments(
    @Param('id') postId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return firstValueFrom(
      this.postClient.send('post.getComments', { postId, page, limit }),
    );
  }

  @Post(':id/comments')
  async addComment(
    @Param('id') postId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: { content: string },
  ) {
    return firstValueFrom(
      this.postClient.send('post.addComment', {
        postId,
        authorId: userId,
        content: body.content,
      }),
    );
  }

  @Patch('comments/:commentId')
  async updateComment(
    @Param('commentId') commentId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: { content: string },
  ) {
    return firstValueFrom(
      this.postClient.send('post.updateComment', {
        commentId,
        userId,
        content: body.content,
      }),
    );
  }

  @Delete('comments/:commentId')
  async deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return firstValueFrom(
      this.postClient.send('post.deleteComment', { commentId, userId }),
    );
  }
}
```

---

## Verification Checklist

- [ ] `post-service` starts and listens on TCP port 3003.
- [ ] `POST /api/posts` creates a post with a custom `postDate` (backdating).
- [ ] `GET /api/posts/timeline?date=2026-03-20` returns posts for that date, paginated.
- [ ] `GET /api/posts/date-counts?startDate=2026-03-01&endDate=2026-03-31` returns per-date counts.
- [ ] `GET /api/posts/:id` returns a single post with author and comments.
- [ ] `PATCH /api/posts/:id` only allows the author to edit.
- [ ] `DELETE /api/posts/:id` soft-deletes and only allows the author.
- [ ] `POST /api/posts/:id/like` adds a like (idempotent — no duplicate).
- [ ] `DELETE /api/posts/:id/like` removes the like and decrements count.
- [ ] `like_count` stays in sync with actual likes.
- [ ] Comments CRUD works; `comment_count` stays in sync.
- [ ] Redis Pub/Sub events are published for `post.created`, `post.liked`, `post.commented`.
- [ ] Timeline cache in Redis invalidates when a post is created/updated/deleted for that date.

---

## Files Created / Modified

| File | Purpose |
|------|---------|
| `apps/post-service/src/main.ts` | Post service bootstrap (TCP port 3003) |
| `apps/post-service/src/post-service.module.ts` | Module with entities and providers |
| `apps/post-service/src/post.controller.ts` | TCP message pattern handlers |
| `apps/post-service/src/post.service.ts` | Post CRUD, timeline, date counts |
| `apps/post-service/src/like.service.ts` | Like/unlike with denormalized count |
| `apps/post-service/src/comment.service.ts` | Comment CRUD with denormalized count |
| `apps/post-service/src/timeline-cache.service.ts` | Redis cache for timeline queries |
| `apps/post-service/src/event-publisher.service.ts` | Redis Pub/Sub publisher |
| `libs/database/src/entities/post.entity.ts` | Post entity with post_date |
| `libs/database/src/entities/post-like.entity.ts` | PostLike entity (unique constraint) |
| `libs/database/src/entities/comment.entity.ts` | Comment entity |
| `apps/api-gateway/src/posts/posts.controller.ts` | Gateway timeline/post endpoints |
