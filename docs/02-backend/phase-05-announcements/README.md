# Phase 05 — Announcements

## Objectives

- Create the `announcement-service` microservice (port 3004, NestJS TCP transport).
- Implement Announcement CRUD with permission-gated creation.
- Track read status per user per announcement (`announcement_read_status`).
- Publish `announcement.created` event via Redis Pub/Sub.
- Expose announcement endpoints through the API Gateway.

---

## Prerequisites

- Phases 01-03 complete.
- Announcements and announcement_read_status tables migrated.
- Redis running for Pub/Sub.

---

## Tasks

### 1. Scaffold the Announcement Service

```bash
nest generate app announcement-service
```

#### `apps/announcement-service/src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AnnouncementServiceModule } from './announcement-service.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AnnouncementServiceModule,
    {
      transport: Transport.TCP,
      options: { host: '0.0.0.0', port: 3004 },
    },
  );
  await app.listen();
  console.log('Announcement service listening on TCP port 3004');
}
bootstrap();
```

### 2. Announcement Entities

**File**: `libs/database/src/entities/announcement.entity.ts`

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
import { AnnouncementReadStatus } from './announcement-read-status.entity';

@Entity('announcements')
export class Announcement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'nvarchar', length: 200 })
  title: string;

  @Column({ type: 'nvarchar', length: 'MAX' })
  content: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ default: false })
  is_pinned: boolean;

  @Column({ type: 'datetime', nullable: true })
  publish_at: Date;

  @Column({ type: 'datetime', nullable: true })
  expires_at: Date;

  @OneToMany(() => AnnouncementReadStatus, (ars) => ars.announcement)
  readStatuses: AnnouncementReadStatus[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
```

**File**: `libs/database/src/entities/announcement-read-status.entity.ts`

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
import { Announcement } from './announcement.entity';

@Entity('announcement_read_status')
@Unique(['user', 'announcement'])
export class AnnouncementReadStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Announcement, (a) => a.readStatuses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'announcement_id' })
  announcement: Announcement;

  @CreateDateColumn()
  read_at: Date;
}
```

### 3. Announcement Service Module

**File**: `apps/announcement-service/src/announcement-service.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@app/database';
import { Announcement } from '@app/database/entities/announcement.entity';
import { AnnouncementReadStatus } from '@app/database/entities/announcement-read-status.entity';
import { AnnouncementController } from './announcement.controller';
import { AnnouncementService } from './announcement.service';
import { EventPublisher } from './event-publisher.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    TypeOrmModule.forFeature([Announcement, AnnouncementReadStatus]),
  ],
  controllers: [AnnouncementController],
  providers: [AnnouncementService, EventPublisher],
})
export class AnnouncementServiceModule {}
```

### 4. Announcement Service Controller (TCP)

**File**: `apps/announcement-service/src/announcement.controller.ts`

```typescript
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AnnouncementService } from './announcement.service';

@Controller()
export class AnnouncementController {
  constructor(private readonly service: AnnouncementService) {}

  @MessagePattern('announcement.create')
  async create(@Payload() data: {
    title: string;
    content: string;
    authorId: string;
    isPinned?: boolean;
    publishAt?: string;
    expiresAt?: string;
  }) {
    return this.service.create(data);
  }

  @MessagePattern('announcement.update')
  async update(@Payload() data: { id: string; updates: any }) {
    return this.service.update(data.id, data.updates);
  }

  @MessagePattern('announcement.delete')
  async delete(@Payload() data: { id: string }) {
    return this.service.delete(data.id);
  }

  @MessagePattern('announcement.findAll')
  async findAll(@Payload() data: {
    page: number;
    limit: number;
    userId: string;
  }) {
    return this.service.findAll(data);
  }

  @MessagePattern('announcement.findById')
  async findById(@Payload() data: { id: string; userId: string }) {
    return this.service.findById(data.id, data.userId);
  }

  @MessagePattern('announcement.markRead')
  async markRead(@Payload() data: { announcementId: string; userId: string }) {
    return this.service.markRead(data.announcementId, data.userId);
  }

  @MessagePattern('announcement.unreadCount')
  async unreadCount(@Payload() data: { userId: string }) {
    return this.service.unreadCount(data.userId);
  }
}
```

### 5. Announcement Service Logic

**File**: `apps/announcement-service/src/announcement.service.ts`

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, IsNull, Or } from 'typeorm';
import { Announcement } from '@app/database/entities/announcement.entity';
import { AnnouncementReadStatus } from '@app/database/entities/announcement-read-status.entity';
import { PaginatedResponseDto } from '@app/common';
import { EventPublisher } from './event-publisher.service';

@Injectable()
export class AnnouncementService {
  constructor(
    @InjectRepository(Announcement)
    private readonly announcementRepo: Repository<Announcement>,
    @InjectRepository(AnnouncementReadStatus)
    private readonly readStatusRepo: Repository<AnnouncementReadStatus>,
    private readonly events: EventPublisher,
  ) {}

  async create(data: {
    title: string;
    content: string;
    authorId: string;
    isPinned?: boolean;
    publishAt?: string;
    expiresAt?: string;
  }) {
    const announcement = this.announcementRepo.create({
      title: data.title,
      content: data.content,
      author: { id: data.authorId } as any,
      is_pinned: data.isPinned ?? false,
      publish_at: data.publishAt ? new Date(data.publishAt) : null,
      expires_at: data.expiresAt ? new Date(data.expiresAt) : null,
    });
    const saved = await this.announcementRepo.save(announcement);

    await this.events.publish('announcement.created', {
      announcementId: saved.id,
      title: saved.title,
      authorId: data.authorId,
    });

    return saved;
  }

  async update(id: string, updates: Partial<Announcement>) {
    await this.announcementRepo.update(id, updates);
    return this.announcementRepo.findOne({ where: { id } });
  }

  async delete(id: string) {
    const result = await this.announcementRepo.softDelete(id);
    if (result.affected === 0) throw new NotFoundException('Announcement not found');
    return { deleted: true };
  }

  async findAll(params: { page: number; limit: number; userId: string }) {
    const { page = 1, limit = 20, userId } = params;
    const now = new Date();

    const query = this.announcementRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.author', 'author')
      .leftJoin(
        AnnouncementReadStatus,
        'rs',
        'rs.announcement_id = a.id AND rs.user_id = :userId',
        { userId },
      )
      .addSelect('CASE WHEN rs.id IS NOT NULL THEN 1 ELSE 0 END', 'is_read')
      .where('a.deleted_at IS NULL')
      .andWhere('(a.publish_at IS NULL OR a.publish_at <= :now)', { now })
      .andWhere('(a.expires_at IS NULL OR a.expires_at >= :now)', { now })
      .orderBy('a.is_pinned', 'DESC')
      .addOrderBy('a.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await query.getManyAndCount();
    return PaginatedResponseDto.from(items, total, page, limit);
  }

  async findById(id: string, userId: string) {
    const announcement = await this.announcementRepo.findOne({
      where: { id },
      relations: ['author'],
    });
    if (!announcement) throw new NotFoundException('Announcement not found');

    const readStatus = await this.readStatusRepo.findOne({
      where: {
        announcement: { id },
        user: { id: userId },
      },
    });

    return { ...announcement, isRead: !!readStatus };
  }

  async markRead(announcementId: string, userId: string) {
    try {
      const status = this.readStatusRepo.create({
        announcement: { id: announcementId } as any,
        user: { id: userId } as any,
      });
      await this.readStatusRepo.save(status);
    } catch (err: any) {
      // Unique constraint — already read
      if (err?.number === 2627) return { alreadyRead: true };
      throw err;
    }
    return { read: true };
  }

  async unreadCount(userId: string) {
    const now = new Date();

    const total = await this.announcementRepo
      .createQueryBuilder('a')
      .where('a.deleted_at IS NULL')
      .andWhere('(a.publish_at IS NULL OR a.publish_at <= :now)', { now })
      .andWhere('(a.expires_at IS NULL OR a.expires_at >= :now)', { now })
      .getCount();

    const readCount = await this.readStatusRepo
      .createQueryBuilder('rs')
      .innerJoin('rs.announcement', 'a')
      .where('rs.user_id = :userId', { userId })
      .andWhere('a.deleted_at IS NULL')
      .andWhere('(a.publish_at IS NULL OR a.publish_at <= :now)', { now })
      .andWhere('(a.expires_at IS NULL OR a.expires_at >= :now)', { now })
      .getCount();

    return { unreadCount: total - readCount };
  }
}
```

### 6. Event Publisher (Reusable Pattern)

**File**: `apps/announcement-service/src/event-publisher.service.ts`

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

### 7. API Gateway Announcement Controllers

**File**: `apps/api-gateway/src/announcements/announcements.controller.ts`

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
import {
  CurrentUser,
  JwtAuthGuard,
  PermissionsGuard,
  RequirePermissions,
  SERVICE_TOKENS,
} from '@app/common';

@ApiTags('Announcements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/announcements')
export class AnnouncementsController {
  constructor(
    @Inject(SERVICE_TOKENS.ANNOUNCEMENT_SERVICE)
    private readonly client: ClientProxy,
  ) {}

  @Post()
  @RequirePermissions('announcement.create')
  async create(
    @CurrentUser('sub') userId: string,
    @Body() body: {
      title: string;
      content: string;
      isPinned?: boolean;
      publishAt?: string;
      expiresAt?: string;
    },
  ) {
    return firstValueFrom(
      this.client.send('announcement.create', { ...body, authorId: userId }),
    );
  }

  @Get()
  async findAll(
    @CurrentUser('sub') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return firstValueFrom(
      this.client.send('announcement.findAll', { page, limit, userId }),
    );
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser('sub') userId: string) {
    return firstValueFrom(
      this.client.send('announcement.unreadCount', { userId }),
    );
  }

  @Get(':id')
  async findById(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return firstValueFrom(
      this.client.send('announcement.findById', { id, userId }),
    );
  }

  @Patch(':id')
  @RequirePermissions('announcement.edit')
  async update(@Param('id') id: string, @Body() updates: any) {
    return firstValueFrom(
      this.client.send('announcement.update', { id, updates }),
    );
  }

  @Delete(':id')
  @RequirePermissions('announcement.delete')
  async delete(@Param('id') id: string) {
    return firstValueFrom(
      this.client.send('announcement.delete', { id }),
    );
  }

  @Post(':id/read')
  async markRead(
    @Param('id') announcementId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return firstValueFrom(
      this.client.send('announcement.markRead', { announcementId, userId }),
    );
  }
}
```

---

## Verification Checklist

- [ ] `announcement-service` starts and listens on TCP port 3004.
- [ ] `POST /api/announcements` creates an announcement (requires `announcement.create` permission).
- [ ] `POST /api/announcements` without permission returns 403.
- [ ] `GET /api/announcements` returns paginated list, pinned items first, with read/unread status.
- [ ] `GET /api/announcements/:id` returns announcement with `isRead` flag.
- [ ] `POST /api/announcements/:id/read` marks the announcement as read (idempotent).
- [ ] `GET /api/announcements/unread-count` returns correct unread count.
- [ ] Expired announcements are excluded from the listing.
- [ ] Future-scheduled announcements (publish_at > now) are excluded from the listing.
- [ ] `announcement.created` event is published to Redis Pub/Sub.
- [ ] Soft delete works correctly.

---

## Files Created / Modified

| File | Purpose |
|------|---------|
| `apps/announcement-service/src/main.ts` | Announcement service bootstrap (TCP port 3004) |
| `apps/announcement-service/src/announcement-service.module.ts` | Module with entities |
| `apps/announcement-service/src/announcement.controller.ts` | TCP message pattern handlers |
| `apps/announcement-service/src/announcement.service.ts` | CRUD, read tracking, unread count |
| `apps/announcement-service/src/event-publisher.service.ts` | Redis Pub/Sub publisher |
| `libs/database/src/entities/announcement.entity.ts` | Announcement entity |
| `libs/database/src/entities/announcement-read-status.entity.ts` | Read tracking entity |
| `apps/api-gateway/src/announcements/announcements.controller.ts` | Gateway announcement endpoints |
