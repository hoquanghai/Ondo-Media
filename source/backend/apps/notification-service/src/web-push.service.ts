import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as webpush from 'web-push';
import { PushSubscription } from '@app/database';

@Injectable()
export class WebPushService implements OnModuleInit {
  private readonly logger = new Logger(WebPushService.name);
  private isConfigured = false;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(PushSubscription)
    private readonly subRepo: Repository<PushSubscription>,
  ) {}

  onModuleInit() {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.config.get<string>(
      'VAPID_SUBJECT',
      'mailto:admin@example.com',
    );

    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.isConfigured = true;
      this.logger.log('VAPID keys configured for Web Push');
    } else {
      this.logger.warn('VAPID keys not configured — Web Push disabled');
    }
  }

  async subscribe(
    userId: number,
    subscription: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    },
  ) {
    try {
      // Check if already exists
      const existing = await this.subRepo.findOne({
        where: { userId, endpoint: subscription.endpoint },
      });
      if (existing) {
        return { alreadySubscribed: true };
      }

      const sub = this.subRepo.create({
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      });
      await this.subRepo.save(sub);
      return { subscribed: true };
    } catch (err: any) {
      // Handle unique constraint violation (SQL Server error 2627)
      if (err?.number === 2627) return { alreadySubscribed: true };
      throw err;
    }
  }

  async unsubscribe(userId: number, endpoint: string) {
    await this.subRepo.delete({ userId, endpoint });
    return { unsubscribed: true };
  }

  async sendToUser(
    userId: number,
    payload: { title: string; body: string; data?: any },
  ) {
    if (!this.isConfigured) return;

    const subscriptions = await this.subRepo.find({
      where: { userId, isDeleted: false },
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
