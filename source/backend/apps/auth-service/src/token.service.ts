import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '@app/database/entities/user.entity';
import { RedisTokenStore } from './redis-token-store.service';
import { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto';

export interface AccessTokenPayload {
  sub: number; // shainBangou
  shainName: string;
  shainGroup: string;
  email: string;
  permissions: string[];
  hasPassword: boolean;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: number; // shainBangou
  type: 'refresh';
}

@Injectable()
export class TokenService {
  private readonly accessExpiry: string;
  private readonly accessExpirySeconds: number;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly redisStore: RedisTokenStore,
  ) {
    this.accessExpiry = this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '1h');
    this.accessExpirySeconds = this.parseExpiryToSeconds(this.accessExpiry);
  }

  /**
   * Issue a new access + refresh token pair for the given user.
   * @param rememberMe - if true, refresh token expires in 30 days; otherwise 24 hours
   */
  async issueTokenPair(
    user: User,
    permissions: string[] = [],
    rememberMe = false,
  ): Promise<AuthResponseDto> {
    const hasPassword = !!user.snsPasswordHash;
    const refreshExpiry = rememberMe ? '30d' : '24h';

    const accessPayload: AccessTokenPayload = {
      sub: user.shainBangou,
      shainName: user.displayName,
      shainGroup: user.department,
      email: user.email || '',
      permissions,
      hasPassword,
      type: 'access',
    };

    const refreshPayload: RefreshTokenPayload = {
      sub: user.shainBangou,
      type: 'refresh',
    };

    const accessToken = this.jwt.sign(accessPayload, {
      expiresIn: this.accessExpiry as any,
    });

    const refreshToken = this.jwt.sign(refreshPayload, {
      expiresIn: refreshExpiry as any,
    });

    const userDto = this.toUserDto(user);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessExpirySeconds,
      user: userDto,
      needsPassword: !hasPassword,
    };
  }

  /**
   * Validate and rotate a refresh token, returning a new token pair.
   */
  async refresh(
    refreshToken: string,
    user: User,
    permissions: string[] = [],
    rememberMe = false,
  ): Promise<AuthResponseDto> {
    const isBlacklisted = await this.redisStore.isBlacklisted(refreshToken);
    if (isBlacklisted) {
      throw new UnauthorizedException('トークンが無効化されています');
    }

    try {
      const decoded = this.jwt.verify<RefreshTokenPayload>(refreshToken);

      if (decoded.type !== 'refresh') {
        throw new UnauthorizedException('無効なトークンタイプです');
      }

      // Blacklist the old refresh token (rotation)
      const ttl = decoded['exp']
        ? decoded['exp'] - Math.floor(Date.now() / 1000)
        : 7 * 24 * 3600;
      if (ttl > 0) {
        await this.redisStore.blacklist(refreshToken, ttl);
      }

      // Issue a new pair
      return this.issueTokenPair(user, permissions, rememberMe);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('無効なリフレッシュトークンです');
    }
  }

  /**
   * Verify an access token and check it's not blacklisted.
   */
  async verify(token: string): Promise<AccessTokenPayload> {
    const isBlacklisted = await this.redisStore.isBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedException('トークンが無効化されています');
    }

    try {
      const payload = this.jwt.verify<AccessTokenPayload>(token);
      if (payload.type !== 'access') {
        throw new UnauthorizedException('無効なトークンタイプです');
      }
      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('無効または期限切れのトークンです');
    }
  }

  /**
   * Decode a token (without verification) to extract its payload for blacklisting.
   */
  async blacklist(token: string): Promise<void> {
    try {
      const decoded = this.jwt.decode(token) as Record<string, unknown> | null;
      if (!decoded) return;

      const exp = decoded.exp as number | undefined;
      const ttl = exp ? exp - Math.floor(Date.now() / 1000) : 3600;

      if (ttl > 0) {
        await this.redisStore.blacklist(token, ttl);
      }
    } catch {
      // Token cannot be decoded — ignore
    }
  }

  /**
   * Decode a refresh token to extract the user ID (without full verification).
   */
  decodeRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      return this.jwt.verify<RefreshTokenPayload>(token);
    } catch {
      return null;
    }
  }

  private toUserDto(user: User): AuthUserDto {
    return {
      shainBangou: user.shainBangou,
      username: user.username || '',
      email: user.email || '',
      shainName: user.displayName,
      shainGroup: user.department,
      shainTeam: user.shainTeam || '',
      shainYaku: user.position,
      shainSection: user.shainSection || '',
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      snsIsActive: user.isActive,
      snsLastLoginAt: user.snsLastLoginAt ? user.snsLastLoginAt.toISOString() : null,
      hasPassword: !!user.snsPasswordHash,
    };
  }

  private parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return 3600;

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 3600;
    }
  }
}
