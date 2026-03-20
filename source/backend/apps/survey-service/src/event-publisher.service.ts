import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class EventPublisher implements OnModuleInit, OnModuleDestroy {
  private redis: Redis;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const host = this.config.get<string>('REDIS_HOST') ?? 'localhost';
    const port = parseInt(this.config.get<string>('REDIS_PORT') ?? '6379', 10);
    const password = this.config.get<string>('REDIS_PASSWORD') || undefined;

    this.redis = new Redis({
      host,
      port,
      password,
    });
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  async publish(channel: string, data: any): Promise<void> {
    await this.redis.publish(channel, JSON.stringify({
      event: channel,
      data,
      timestamp: new Date().toISOString(),
    }));
  }
}
