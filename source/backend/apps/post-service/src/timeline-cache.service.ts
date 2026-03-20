import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class TimelineCacheService implements OnModuleInit, OnModuleDestroy {
  private redis: Redis;
  private readonly TTL = 300; // 5 minutes

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

  private key(date: string, page: number, limit: number): string {
    return `timeline:${date}:${page}:${limit}`;
  }

  async get(date: string, page: number, limit: number): Promise<any | null> {
    try {
      const data = await this.redis.get(this.key(date, page, limit));
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  async set(date: string, page: number, limit: number, value: any): Promise<void> {
    try {
      await this.redis.set(
        this.key(date, page, limit),
        JSON.stringify(value),
        'EX',
        this.TTL,
      );
    } catch {
      // Cache write failure is non-critical
    }
  }

  async invalidate(date: string): Promise<void> {
    try {
      const pattern = `timeline:${date}:*`;
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor, 'MATCH', pattern, 'COUNT', 100,
        );
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } while (cursor !== '0');
    } catch {
      // Cache invalidation failure is non-critical
    }
  }
}
