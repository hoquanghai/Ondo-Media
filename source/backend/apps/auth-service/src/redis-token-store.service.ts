import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisTokenStore implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly logger = new Logger(RedisTokenStore.name);

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.client = new Redis({
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: parseInt(this.config.get<string>('REDIS_PORT', '6379'), 10),
      lazyConnect: true,
    });

    try {
      await this.client.connect();
      this.logger.log('Redis connected for token blacklist');
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  /**
   * Add a token to the blacklist with a TTL matching the token's remaining lifetime.
   */
  async blacklist(token: string, ttlSeconds: number): Promise<void> {
    const key = `auth:blacklist:${this.hashToken(token)}`;
    await this.client.set(key, '1', 'EX', ttlSeconds);
  }

  /**
   * Check if a token has been blacklisted.
   */
  async isBlacklisted(token: string): Promise<boolean> {
    const key = `auth:blacklist:${this.hashToken(token)}`;
    const result = await this.client.get(key);
    return result !== null;
  }

  /**
   * Use a simple hash of the token as the key to avoid storing full tokens in Redis.
   * For short tokens or development, we use a truncated version.
   */
  private hashToken(token: string): string {
    // Use last 32 chars of the token as a unique identifier
    // In production, consider using a proper hash function
    if (token.length > 32) {
      return token.slice(-32);
    }
    return token;
  }
}
