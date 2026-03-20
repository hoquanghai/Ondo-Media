import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, User } from '@app/database';
import { PaginatedResponseDto, NotificationType } from '@app/common';
import { WebPushService } from './web-push.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly webPush: WebPushService,
  ) {}

  async create(data: {
    recipientId: number;
    type: string;
    title: string;
    message?: string;
    referenceType?: string;
    referenceId?: string;
    actorId?: number;
  }) {
    const notification = this.notifRepo.create({
      userId: data.recipientId,
      type: data.type,
      title: data.title,
      message: data.message ?? '',
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      actorId: data.actorId,
    });
    const saved = await this.notifRepo.save(notification);

    // Also send browser push
    await this.webPush.sendToUser(data.recipientId, {
      title: data.title,
      body: data.message ?? '',
      data: {
        referenceType: data.referenceType,
        referenceId: data.referenceId,
      },
    });

    return saved;
  }

  async createBroadcast(data: {
    type: string;
    title: string;
    message?: string;
    referenceType?: string;
    referenceId?: string;
    actorId?: number;
    excludeUserId?: number;
  }) {
    const users = await this.userRepo.find({
      where: { snsIsActive: true },
      select: ['shainBangou'],
    });

    const notifications = users
      .filter((u) => u.shainBangou !== data.excludeUserId)
      .map((u) =>
        this.notifRepo.create({
          userId: u.shainBangou,
          type: data.type,
          title: data.title,
          message: data.message ?? '',
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          actorId: data.actorId,
        }),
      );

    // Bulk insert
    if (notifications.length > 0) {
      await this.notifRepo.save(notifications, { chunk: 100 });
    }

    // Fire-and-forget: don't block on push notifications
    const pushPromises = users
      .filter(u => u.shainBangou !== data.excludeUserId)
      .map(u =>
        this.webPush.sendToUser(u.shainBangou, {
          title: data.title,
          body: data.message ?? '',
          data: {
            referenceType: data.referenceType,
            referenceId: data.referenceId,
          },
        }).catch(() => {}),
      );
    Promise.allSettled(pushPromises); // intentionally not awaited
  }

  async findAll(data: { userId: number; page?: number; limit?: number }) {
    const page = data.page ?? 1;
    const limit = data.limit ?? 20;

    const [items, total] = await this.notifRepo.findAndCount({
      where: { userId: data.userId, isDeleted: false },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return PaginatedResponseDto.from(items, total, page, limit);
  }

  async getUnreadCount(data: { userId: number }) {
    const count = await this.notifRepo.count({
      where: { userId: data.userId, isRead: false, isDeleted: false },
    });
    return { unreadCount: count };
  }

  async markRead(data: { notificationId: string; userId: number }) {
    await this.notifRepo.update(
      { id: data.notificationId, userId: data.userId },
      { isRead: true },
    );
    return { read: true };
  }

  async markAllRead(data: { userId: number }) {
    await this.notifRepo.update(
      { userId: data.userId, isRead: false, isDeleted: false },
      { isRead: true },
    );
    return { readAll: true };
  }

  async pushSubscribe(data: {
    userId: number;
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
  }) {
    return this.webPush.subscribe(data.userId, data.subscription);
  }

  async pushUnsubscribe(data: { userId: number; endpoint: string }) {
    return this.webPush.unsubscribe(data.userId, data.endpoint);
  }
}
