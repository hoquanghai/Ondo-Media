# Phase 07 — Notifications

## Objectives

- Create the `notification-service` microservice (port 3006, TCP + WebSocket transport).
- Implement a WebSocket gateway using Socket.IO with Redis adapter for horizontal scaling.
- Subscribe to Redis Pub/Sub events: `post.created`, `post.liked`, `post.commented`, `announcement.created`, `survey.created`.
- Create notification records in the database for each event.
- Push real-time notifications to connected clients via WebSocket.
- Implement browser push notifications via the Web Push API with `push_subscriptions` table.
- Provide notification CRUD: list, unread count, mark as read.

---

## Prerequisites

- Phases 01-06 complete — all services publishing events via Redis Pub/Sub.
- Redis running for Pub/Sub and Socket.IO adapter.

### Additional Packages

```bash
pnpm add @nestjs/websockets @nestjs/platform-socket.io socket.io
pnpm add @socket.io/redis-adapter
pnpm add web-push
pnpm add -D @types/web-push
```

---

## Tasks

### 1. Scaffold the Notification Service

```bash
nest generate app notification-service
```

#### `apps/notification-service/src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { NotificationServiceModule } from './notification-service.module';

async function bootstrap() {
  // Create the HTTP application (for WebSocket)
  const app = await NestFactory.create(NotificationServiceModule);

  // Also connect as TCP microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port: 3006 },
  });

  // Configure Socket.IO adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  await app.startAllMicroservices();
  await app.listen(3016); // HTTP port for WebSocket upgrade
  console.log('Notification service: TCP on 3006, WebSocket on 3016');
}
bootstrap();
```

### 2. Notification Entity

**File**: `libs/database/src/entities/notification.entity.ts`

```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum NotificationType {
  POST_CREATED = 'post.created',
  POST_LIKED = 'post.liked',
  POST_COMMENTED = 'post.commented',
  ANNOUNCEMENT_CREATED = 'announcement.created',
  SURVEY_CREATED = 'survey.created',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'recipient_id' })
  recipient: User;

  @Column({ type: 'varchar', length: 50 })
  type: NotificationType;

  @Column({ type: 'nvarchar', length: 500 })
  title: string;

  @Column({ type: 'nvarchar', length: 2000, nullable: true })
  body: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any>; // { postId, commentId, surveyId, etc. }

  @Column({ default: false })
  is_read: boolean;

  @CreateDateColumn()
  created_at: Date;
}
```

**File**: `libs/database/src/entities/push-subscription.entity.ts`

```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';

@Entity('push_subscriptions')
@Unique(['user', 'endpoint'])
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'nvarchar', length: 500 })
  endpoint: string;

  @Column({ type: 'nvarchar', length: 500 })
  p256dh: string;

  @Column({ type: 'nvarchar', length: 500 })
  auth: string;

  @CreateDateColumn()
  created_at: Date;
}
```

### 3. Notification Service Module

**File**: `apps/notification-service/src/notification-service.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@app/database';
import { Notification } from '@app/database/entities/notification.entity';
import { PushSubscription } from '@app/database/entities/push-subscription.entity';
import { User } from '@app/database/entities/user.entity';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { EventSubscriber } from './event-subscriber.service';
import { WebPushService } from './web-push.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    TypeOrmModule.forFeature([Notification, PushSubscription, User]),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationGateway,
    EventSubscriber,
    WebPushService,
  ],
})
export class NotificationServiceModule {}
```

### 4. WebSocket Gateway

**File**: `apps/notification-service/src/notification.gateway.ts`

```typescript
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/notifications',
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(private readonly config: ConfigService) {}

  async afterInit(server: Server) {
    // Setup Redis adapter for horizontal scaling
    const redisHost = this.config.get('REDIS_HOST', 'localhost');
    const redisPort = this.config.get('REDIS_PORT', 6379);

    const pubClient = createClient({
      url: `redis://${redisHost}:${redisPort}`,
    });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);
    server.adapter(createAdapter(pubClient, subClient));

    this.logger.log('WebSocket gateway initialized with Redis adapter');
  }

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (!userId) {
      client.disconnect();
      return;
    }

    // Track user -> socket mapping
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);

    // Join user-specific room
    client.join(`user:${userId}`);
    this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
  }

  handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId)!.delete(client.id);
      if (this.userSockets.get(userId)!.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Send a notification to a specific user (all their connected sockets).
   */
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Broadcast to all connected clients.
   */
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }
}
```

### 5. Redis Pub/Sub Event Subscriber

**File**: `apps/notification-service/src/event-subscriber.service.ts`

```typescript
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { NotificationType } from '@app/database/entities/notification.entity';

@Injectable()
export class EventSubscriber implements OnModuleInit, OnModuleDestroy {
  private subscriber: Redis;
  private readonly logger = new Logger(EventSubscriber.name);

  private readonly CHANNELS = [
    'post.created',
    'post.liked',
    'post.commented',
    'announcement.created',
    'survey.created',
  ];

  constructor(
    private readonly config: ConfigService,
    private readonly notificationService: NotificationService,
    private readonly gateway: NotificationGateway,
  ) {}

  async onModuleInit() {
    this.subscriber = new Redis({
      host: this.config.get('REDIS_HOST', 'localhost'),
      port: this.config.get('REDIS_PORT', 6379),
    });

    // Subscribe to all event channels
    await this.subscriber.subscribe(...this.CHANNELS);

    this.subscriber.on('message', async (channel, message) => {
      try {
        const data = JSON.parse(message);
        await this.handleEvent(channel, data);
      } catch (err) {
        this.logger.error(`Error handling event on ${channel}`, err);
      }
    });

    this.logger.log(`Subscribed to channels: ${this.CHANNELS.join(', ')}`);
  }

  async onModuleDestroy() {
    await this.subscriber.unsubscribe(...this.CHANNELS);
    await this.subscriber.quit();
  }

  private async handleEvent(channel: string, data: any) {
    switch (channel) {
      case 'post.created':
        // Notify followers or all users (broadcast)
        await this.notificationService.createBroadcast({
          type: NotificationType.POST_CREATED,
          title: 'New post published',
          body: `A new post has been shared`,
          metadata: { postId: data.postId, authorId: data.authorId },
          excludeUserId: data.authorId, // Don't notify the author
        });
        break;

      case 'post.liked':
        // Notify the post author
        if (data.postAuthorId && data.postAuthorId !== data.likerId) {
          const notification = await this.notificationService.create({
            recipientId: data.postAuthorId,
            type: NotificationType.POST_LIKED,
            title: 'Your post was liked',
            body: 'Someone liked your post',
            metadata: { postId: data.postId, likerId: data.likerId },
          });
          this.gateway.sendToUser(
            data.postAuthorId,
            'notification',
            notification,
          );
        }
        break;

      case 'post.commented':
        // Notify the post author
        if (data.postAuthorId && data.postAuthorId !== data.authorId) {
          const notification = await this.notificationService.create({
            recipientId: data.postAuthorId,
            type: NotificationType.POST_COMMENTED,
            title: 'New comment on your post',
            body: 'Someone commented on your post',
            metadata: {
              postId: data.postId,
              commentId: data.commentId,
              commentAuthorId: data.authorId,
            },
          });
          this.gateway.sendToUser(
            data.postAuthorId,
            'notification',
            notification,
          );
        }
        break;

      case 'announcement.created':
        // Broadcast to all users
        await this.notificationService.createBroadcast({
          type: NotificationType.ANNOUNCEMENT_CREATED,
          title: 'New announcement',
          body: data.title,
          metadata: {
            announcementId: data.announcementId,
            authorId: data.authorId,
          },
        });
        this.gateway.broadcast('notification', {
          type: NotificationType.ANNOUNCEMENT_CREATED,
          title: 'New announcement',
          body: data.title,
        });
        break;

      case 'survey.created':
        // Broadcast to all users
        await this.notificationService.createBroadcast({
          type: NotificationType.SURVEY_CREATED,
          title: 'New survey available',
          body: data.title,
          metadata: {
            surveyId: data.surveyId,
            authorId: data.authorId,
          },
        });
        this.gateway.broadcast('notification', {
          type: NotificationType.SURVEY_CREATED,
          title: 'New survey available',
          body: data.title,
        });
        break;
    }
  }
}
```

### 6. Notification Service Logic

**File**: `apps/notification-service/src/notification.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import {
  Notification,
  NotificationType,
} from '@app/database/entities/notification.entity';
import { User } from '@app/database/entities/user.entity';
import { PaginatedResponseDto } from '@app/common';
import { WebPushService } from './web-push.service';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly webPush: WebPushService,
  ) {}

  async create(data: {
    recipientId: string;
    type: NotificationType;
    title: string;
    body?: string;
    metadata?: Record<string, any>;
  }) {
    const notification = this.notifRepo.create({
      recipient: { id: data.recipientId } as any,
      type: data.type,
      title: data.title,
      body: data.body,
      metadata: data.metadata,
    });
    const saved = await this.notifRepo.save(notification);

    // Also send browser push
    await this.webPush.sendToUser(data.recipientId, {
      title: data.title,
      body: data.body ?? '',
      data: data.metadata,
    });

    return saved;
  }

  async createBroadcast(data: {
    type: NotificationType;
    title: string;
    body?: string;
    metadata?: Record<string, any>;
    excludeUserId?: string;
  }) {
    const users = await this.userRepo.find({
      where: { is_active: true },
      select: ['id'],
    });

    const notifications = users
      .filter((u) => u.id !== data.excludeUserId)
      .map((u) =>
        this.notifRepo.create({
          recipient: { id: u.id } as any,
          type: data.type,
          title: data.title,
          body: data.body,
          metadata: data.metadata,
        }),
      );

    // Bulk insert
    await this.notifRepo.save(notifications, { chunk: 100 });

    // Send browser push to all
    for (const u of users) {
      if (u.id !== data.excludeUserId) {
        await this.webPush.sendToUser(u.id, {
          title: data.title,
          body: data.body ?? '',
          data: data.metadata,
        });
      }
    }
  }

  async findByUser(userId: string, page: number, limit: number) {
    const [items, total] = await this.notifRepo.findAndCount({
      where: { recipient: { id: userId } },
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });
    return PaginatedResponseDto.from(items, total, page, limit);
  }

  async unreadCount(userId: string) {
    const count = await this.notifRepo.count({
      where: { recipient: { id: userId }, is_read: false },
    });
    return { unreadCount: count };
  }

  async markRead(notificationId: string, userId: string) {
    await this.notifRepo.update(
      { id: notificationId, recipient: { id: userId } },
      { is_read: true },
    );
    return { read: true };
  }

  async markAllRead(userId: string) {
    await this.notifRepo.update(
      { recipient: { id: userId }, is_read: false },
      { is_read: true },
    );
    return { readAll: true };
  }
}
```

### 7. Web Push Service

**File**: `apps/notification-service/src/web-push.service.ts`

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as webpush from 'web-push';
import { PushSubscription } from '@app/database/entities/push-subscription.entity';

@Injectable()
export class WebPushService implements OnModuleInit {
  private readonly logger = new Logger(WebPushService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(PushSubscription)
    private readonly subRepo: Repository<PushSubscription>,
  ) {}

  onModuleInit() {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.config.get<string>('VAPID_SUBJECT');

    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.logger.log('VAPID keys configured for Web Push');
    } else {
      this.logger.warn('VAPID keys not configured — Web Push disabled');
    }
  }

  async subscribe(userId: string, subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }) {
    try {
      const sub = this.subRepo.create({
        user: { id: userId } as any,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      });
      await this.subRepo.save(sub);
      return { subscribed: true };
    } catch (err: any) {
      if (err?.number === 2627) return { alreadySubscribed: true };
      throw err;
    }
  }

  async unsubscribe(userId: string, endpoint: string) {
    await this.subRepo.delete({
      user: { id: userId } as any,
      endpoint,
    });
    return { unsubscribed: true };
  }

  async sendToUser(
    userId: string,
    payload: { title: string; body: string; data?: any },
  ) {
    const subscriptions = await this.subRepo.find({
      where: { user: { id: userId } },
    });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
        );
      } catch (err: any) {
        // Remove expired/invalid subscriptions
        if (err.statusCode === 410 || err.statusCode === 404) {
          await this.subRepo.delete(sub.id);
          this.logger.warn(`Removed expired push subscription: ${sub.id}`);
        } else {
          this.logger.error(`Push failed for ${sub.id}: ${err.message}`);
        }
      }
    }
  }
}
```

### 8. Notification Controller (TCP)

**File**: `apps/notification-service/src/notification.controller.ts`

```typescript
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationService } from './notification.service';
import { WebPushService } from './web-push.service';

@Controller()
export class NotificationController {
  constructor(
    private readonly service: NotificationService,
    private readonly webPush: WebPushService,
  ) {}

  @MessagePattern('notification.list')
  async list(@Payload() data: { userId: string; page: number; limit: number }) {
    return this.service.findByUser(data.userId, data.page, data.limit);
  }

  @MessagePattern('notification.unreadCount')
  async unreadCount(@Payload() data: { userId: string }) {
    return this.service.unreadCount(data.userId);
  }

  @MessagePattern('notification.markRead')
  async markRead(@Payload() data: { notificationId: string; userId: string }) {
    return this.service.markRead(data.notificationId, data.userId);
  }

  @MessagePattern('notification.markAllRead')
  async markAllRead(@Payload() data: { userId: string }) {
    return this.service.markAllRead(data.userId);
  }

  @MessagePattern('notification.subscribePush')
  async subscribePush(@Payload() data: {
    userId: string;
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
  }) {
    return this.webPush.subscribe(data.userId, data.subscription);
  }

  @MessagePattern('notification.unsubscribePush')
  async unsubscribePush(@Payload() data: { userId: string; endpoint: string }) {
    return this.webPush.unsubscribe(data.userId, data.endpoint);
  }
}
```

### 9. API Gateway Notification Controllers

**File**: `apps/api-gateway/src/notifications/notifications.controller.ts`

```typescript
import {
  Body,
  Controller,
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

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/notifications')
export class NotificationsController {
  constructor(
    @Inject(SERVICE_TOKENS.NOTIFICATION_SERVICE)
    private readonly client: ClientProxy,
  ) {}

  @Get()
  async list(
    @CurrentUser('sub') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return firstValueFrom(
      this.client.send('notification.list', { userId, page, limit }),
    );
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser('sub') userId: string) {
    return firstValueFrom(
      this.client.send('notification.unreadCount', { userId }),
    );
  }

  @Patch(':id/read')
  async markRead(
    @Param('id') notificationId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return firstValueFrom(
      this.client.send('notification.markRead', { notificationId, userId }),
    );
  }

  @Patch('read-all')
  async markAllRead(@CurrentUser('sub') userId: string) {
    return firstValueFrom(
      this.client.send('notification.markAllRead', { userId }),
    );
  }

  @Post('push/subscribe')
  async subscribePush(
    @CurrentUser('sub') userId: string,
    @Body() body: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    },
  ) {
    return firstValueFrom(
      this.client.send('notification.subscribePush', {
        userId,
        subscription: body,
      }),
    );
  }

  @Post('push/unsubscribe')
  async unsubscribePush(
    @CurrentUser('sub') userId: string,
    @Body() body: { endpoint: string },
  ) {
    return firstValueFrom(
      this.client.send('notification.unsubscribePush', {
        userId,
        endpoint: body.endpoint,
      }),
    );
  }
}
```

---

## Verification Checklist

- [ ] `notification-service` starts: TCP on port 3006, WebSocket on port 3016.
- [ ] WebSocket connection at `ws://localhost:3016/notifications?userId=<uuid>` succeeds.
- [ ] When a post is created, connected users receive a WebSocket `notification` event.
- [ ] When a post is liked, the post author receives a WebSocket notification.
- [ ] When a comment is added, the post author receives a WebSocket notification.
- [ ] Announcement and survey creation broadcast to all connected clients.
- [ ] `GET /api/notifications` returns paginated notification list.
- [ ] `GET /api/notifications/unread-count` returns correct unread count.
- [ ] `PATCH /api/notifications/:id/read` marks a single notification as read.
- [ ] `PATCH /api/notifications/read-all` marks all notifications as read.
- [ ] `POST /api/notifications/push/subscribe` saves a push subscription.
- [ ] Browser push notifications are sent when VAPID keys are configured.
- [ ] Expired push subscriptions are automatically removed.
- [ ] Redis adapter enables WebSocket to work across multiple service instances.

---

## Files Created / Modified

| File | Purpose |
|------|---------|
| `apps/notification-service/src/main.ts` | Bootstrap with TCP + WebSocket |
| `apps/notification-service/src/notification-service.module.ts` | Module with all providers |
| `apps/notification-service/src/notification.gateway.ts` | Socket.IO gateway with Redis adapter |
| `apps/notification-service/src/event-subscriber.service.ts` | Redis Pub/Sub event listener |
| `apps/notification-service/src/notification.service.ts` | Notification CRUD and broadcast |
| `apps/notification-service/src/notification.controller.ts` | TCP message pattern handlers |
| `apps/notification-service/src/web-push.service.ts` | Web Push API with VAPID |
| `libs/database/src/entities/notification.entity.ts` | Notification entity |
| `libs/database/src/entities/push-subscription.entity.ts` | Push subscription entity |
| `apps/api-gateway/src/notifications/notifications.controller.ts` | Gateway notification endpoints |
