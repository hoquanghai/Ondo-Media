# Phase 02 — Authentication

## Objectives

- Create the `auth-service` microservice (port 3001, NestJS TCP transport).
- Implement local authentication with username/password (bcrypt hashing).
- Implement Microsoft 365 SSO via OAuth2/OIDC using MSAL and Passport.
- Issue JWT access tokens (1h expiry) and refresh tokens (7d expiry).
- Maintain a Redis-based token blacklist for secure logout.
- Expose auth endpoints through the API Gateway.

---

## Prerequisites

- Phase 01 complete — monorepo, Docker infrastructure, shared libraries.
- SQL Server running with users table migrated.
- Redis running on port 6379.

### Additional Packages

```bash
pnpm add @nestjs/passport @nestjs/jwt passport passport-jwt passport-local bcrypt
pnpm add @azure/msal-node passport-azure-ad
pnpm add -D @types/passport-jwt @types/passport-local @types/bcrypt
```

---

## Tasks

### 1. Scaffold the Auth Service

```bash
nest generate app auth-service
```

#### `apps/auth-service/src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AuthServiceModule } from './auth-service.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AuthServiceModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: 3001,
      },
    },
  );
  await app.listen();
  console.log('Auth service listening on TCP port 3001');
}
bootstrap();
```

#### `apps/auth-service/src/auth-service.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@app/database';
import { User } from '@app/database/entities/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { RedisTokenStore } from './redis-token-store.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_ACCESS_EXPIRY', '1h') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, RedisTokenStore],
})
export class AuthServiceModule {}
```

### 2. Auth Service Controller (TCP Message Patterns)

**File**: `apps/auth-service/src/auth.controller.ts`

```typescript
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern('auth.login')
  async login(@Payload() data: { username: string; password: string }) {
    return this.authService.login(data.username, data.password);
  }

  @MessagePattern('auth.loginMicrosoft')
  async loginMicrosoft(@Payload() data: { code: string; redirectUri: string }) {
    return this.authService.loginWithMicrosoft(data.code, data.redirectUri);
  }

  @MessagePattern('auth.refresh')
  async refresh(@Payload() data: { refreshToken: string }) {
    return this.authService.refreshTokens(data.refreshToken);
  }

  @MessagePattern('auth.logout')
  async logout(@Payload() data: { accessToken: string; refreshToken: string }) {
    return this.authService.logout(data.accessToken, data.refreshToken);
  }

  @MessagePattern('auth.validateToken')
  async validateToken(@Payload() data: { token: string }) {
    return this.authService.validateToken(data.token);
  }
}
```

### 3. Auth Service Logic

**File**: `apps/auth-service/src/auth.service.ts`

```typescript
import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '@app/database/entities/user.entity';
import { TokenService } from './token.service';
import { MicrosoftAuthProvider } from './microsoft-auth.provider';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly tokenService: TokenService,
    private readonly msAuth: MicrosoftAuthProvider,
  ) {}

  async login(username: string, password: string) {
    const user = await this.userRepo.findOne({ where: { username } });
    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.tokenService.issueTokenPair(user);
  }

  async loginWithMicrosoft(code: string, redirectUri: string) {
    const msUser = await this.msAuth.exchangeCodeForUser(code, redirectUri);

    let user = await this.userRepo.findOne({
      where: { microsoft_id: msUser.oid },
    });

    if (!user) {
      user = this.userRepo.create({
        username: msUser.preferredUsername,
        email: msUser.mail,
        display_name: msUser.displayName,
        microsoft_id: msUser.oid,
      });
      await this.userRepo.save(user);
    }

    return this.tokenService.issueTokenPair(user);
  }

  async refreshTokens(refreshToken: string) {
    return this.tokenService.refresh(refreshToken);
  }

  async logout(accessToken: string, refreshToken: string) {
    await this.tokenService.blacklist(accessToken);
    await this.tokenService.blacklist(refreshToken);
    return { success: true };
  }

  async validateToken(token: string) {
    return this.tokenService.verify(token);
  }
}
```

### 4. Token Service with Redis Blacklist

**File**: `apps/auth-service/src/token.service.ts`

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '@app/database/entities/user.entity';
import { RedisTokenStore } from './redis-token-store.service';

export interface TokenPayload {
  sub: string;
  username: string;
  permissions: string[];
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly redisStore: RedisTokenStore,
  ) {}

  async issueTokenPair(user: User) {
    const payload: TokenPayload = {
      sub: user.id,
      username: user.username,
      permissions: [], // loaded from user_permissions in production
    };

    const accessToken = this.jwt.sign(payload, {
      expiresIn: this.config.get('JWT_ACCESS_EXPIRY', '1h'),
    });

    const refreshToken = this.jwt.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: this.config.get('JWT_REFRESH_EXPIRY', '7d') },
    );

    return { accessToken, refreshToken, user: { id: user.id, username: user.username } };
  }

  async refresh(refreshToken: string) {
    const isBlacklisted = await this.redisStore.isBlacklisted(refreshToken);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token revoked');
    }

    try {
      const decoded = this.jwt.verify(refreshToken);
      if (decoded.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }
      // Blacklist the old refresh token (rotation)
      await this.redisStore.blacklist(refreshToken, 7 * 24 * 3600);
      // Issue a new pair — in production, load the user from the DB
      return this.issueTokenPair({ id: decoded.sub } as User);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async verify(token: string) {
    const isBlacklisted = await this.redisStore.isBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token revoked');
    }
    return this.jwt.verify(token);
  }

  async blacklist(token: string) {
    try {
      const decoded = this.jwt.decode(token) as any;
      const ttl = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 3600;
      if (ttl > 0) {
        await this.redisStore.blacklist(token, ttl);
      }
    } catch {
      // Token cannot be decoded — ignore
    }
  }
}
```

**File**: `apps/auth-service/src/redis-token-store.service.ts`

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisTokenStore implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.client = createClient({
      url: `redis://${this.config.get('REDIS_HOST', 'localhost')}:${this.config.get('REDIS_PORT', 6379)}`,
    });
    await this.client.connect();
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async blacklist(token: string, ttlSeconds: number): Promise<void> {
    await this.client.set(`bl:${token}`, '1', { EX: ttlSeconds });
  }

  async isBlacklisted(token: string): Promise<boolean> {
    const result = await this.client.get(`bl:${token}`);
    return result !== null;
  }
}
```

### 5. Microsoft 365 SSO Provider

**File**: `apps/auth-service/src/microsoft-auth.provider.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConfidentialClientApplication,
  Configuration,
} from '@azure/msal-node';

@Injectable()
export class MicrosoftAuthProvider {
  private msalClient: ConfidentialClientApplication;

  constructor(private readonly config: ConfigService) {
    const msalConfig: Configuration = {
      auth: {
        clientId: this.config.get<string>('MS_CLIENT_ID'),
        authority: `https://login.microsoftonline.com/${this.config.get<string>('MS_TENANT_ID')}`,
        clientSecret: this.config.get<string>('MS_CLIENT_SECRET'),
      },
    };
    this.msalClient = new ConfidentialClientApplication(msalConfig);
  }

  async exchangeCodeForUser(code: string, redirectUri: string) {
    const result = await this.msalClient.acquireTokenByCode({
      code,
      scopes: ['user.read'],
      redirectUri,
    });

    const claims = result.idTokenClaims as any;
    return {
      oid: claims.oid,
      displayName: claims.name,
      mail: claims.preferred_username,
      preferredUsername: claims.preferred_username,
    };
  }

  getAuthUrl(redirectUri: string): Promise<string> {
    return this.msalClient.getAuthCodeUrl({
      scopes: ['user.read', 'openid', 'profile', 'email'],
      redirectUri,
    });
  }
}
```

### 6. API Gateway Auth Controllers

**File**: `apps/api-gateway/src/auth/auth.controller.ts`

```typescript
import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { SERVICE_TOKENS } from '@app/common';

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  constructor(
    @Inject(SERVICE_TOKENS.AUTH_SERVICE)
    private readonly authClient: ClientProxy,
  ) {}

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    return firstValueFrom(this.authClient.send('auth.login', body));
  }

  @Get('microsoft')
  async microsoftLogin(@Query('redirect_uri') redirectUri: string) {
    return firstValueFrom(
      this.authClient.send('auth.microsoftAuthUrl', { redirectUri }),
    );
  }

  @Post('microsoft/callback')
  async microsoftCallback(
    @Body() body: { code: string; redirectUri: string },
  ) {
    return firstValueFrom(
      this.authClient.send('auth.loginMicrosoft', body),
    );
  }

  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    return firstValueFrom(this.authClient.send('auth.refresh', body));
  }

  @Post('logout')
  async logout(@Body() body: { accessToken: string; refreshToken: string }) {
    return firstValueFrom(this.authClient.send('auth.logout', body));
  }
}
```

### 7. JWT Middleware in API Gateway

**File**: `apps/api-gateway/src/middleware/jwt.middleware.ts`

```typescript
import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request, Response, NextFunction } from 'express';
import { firstValueFrom } from 'rxjs';
import { SERVICE_TOKENS } from '@app/common';

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  constructor(
    @Inject(SERVICE_TOKENS.AUTH_SERVICE)
    private readonly authClient: ClientProxy,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return next(); // Let guards decide if auth is required
    }

    const token = authHeader.slice(7);
    try {
      const payload = await firstValueFrom(
        this.authClient.send('auth.validateToken', { token }),
      );
      (req as any).user = payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    next();
  }
}
```

---

## Verification Checklist

- [ ] `auth-service` starts and listens on TCP port 3001.
- [ ] `POST /api/auth/login` with valid credentials returns `accessToken` and `refreshToken`.
- [ ] `POST /api/auth/login` with invalid credentials returns 401.
- [ ] `POST /api/auth/refresh` with a valid refresh token returns a new token pair.
- [ ] `POST /api/auth/refresh` with a blacklisted refresh token returns 401.
- [ ] `POST /api/auth/logout` blacklists both tokens in Redis.
- [ ] After logout, using the old access token returns 401.
- [ ] `GET /api/auth/microsoft` returns an Azure AD authorization URL.
- [ ] `POST /api/auth/microsoft/callback` exchanges the code and returns tokens.
- [ ] JWT middleware attaches `user` to request for protected routes.

---

## Files Created / Modified

| File | Purpose |
|------|---------|
| `apps/auth-service/src/main.ts` | Auth service bootstrap (TCP port 3001) |
| `apps/auth-service/src/auth-service.module.ts` | Auth module with JWT, TypeORM, Redis |
| `apps/auth-service/src/auth.controller.ts` | TCP message pattern handlers |
| `apps/auth-service/src/auth.service.ts` | Login, SSO, refresh, logout logic |
| `apps/auth-service/src/token.service.ts` | JWT issuance, verification, rotation |
| `apps/auth-service/src/redis-token-store.service.ts` | Redis blacklist for revoked tokens |
| `apps/auth-service/src/microsoft-auth.provider.ts` | MSAL-based Microsoft 365 SSO |
| `apps/api-gateway/src/auth/auth.controller.ts` | Gateway auth endpoints |
| `apps/api-gateway/src/middleware/jwt.middleware.ts` | Token validation middleware |
