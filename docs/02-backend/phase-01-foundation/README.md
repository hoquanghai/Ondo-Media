# Phase 01 — Foundation

## Objectives

- Scaffold a NestJS 11 monorepo with multiple apps and shared libraries.
- Provision local infrastructure via Docker Compose: SQL Server 2022, Redis 7, MinIO.
- Build shared libraries (`libs/common`, `libs/database`) containing entities, DTOs, decorators, guards, interceptors, filters, and pipes used across all services.
- Stand up the API Gateway application (port 3000) with Swagger documentation, CORS, and global middleware.
- Establish TypeORM migration workflow against SQL Server.
- Provide a `.env.example` covering every required environment variable.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | >= 20 LTS |
| pnpm | >= 9 |
| Docker & Docker Compose | latest |
| NestJS CLI | >= 11 |

---

## Tasks

### 1. Scaffold the NestJS Monorepo

```bash
nest new internal-social --package-manager pnpm
```

#### `nest-cli.json`

```jsonc
{
  "collection": "@nestjs/schematics",
  "sourceRoot": "apps/api-gateway/src",
  "monorepo": true,
  "root": "apps/api-gateway",
  "compilerOptions": {
    "webpack": false,
    "tsConfigPath": "apps/api-gateway/tsconfig.app.json"
  },
  "projects": {
    "api-gateway": {
      "type": "application",
      "root": "apps/api-gateway",
      "entryFile": "main",
      "sourceRoot": "apps/api-gateway/src",
      "compilerOptions": {
        "tsConfigPath": "apps/api-gateway/tsconfig.app.json"
      }
    },
    "common": {
      "type": "library",
      "root": "libs/common",
      "entryFile": "index",
      "sourceRoot": "libs/common/src",
      "compilerOptions": {
        "tsConfigPath": "libs/common/tsconfig.lib.json"
      }
    },
    "database": {
      "type": "library",
      "root": "libs/database",
      "entryFile": "index",
      "sourceRoot": "libs/database/src",
      "compilerOptions": {
        "tsConfigPath": "libs/database/tsconfig.lib.json"
      }
    }
  }
}
```

### 2. Docker Compose

**File**: `docker-compose.yml`

```yaml
version: "3.9"

services:
  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    container_name: social_sqlserver
    environment:
      ACCEPT_EULA: "Y"
      MSSQL_SA_PASSWORD: "YourStrong!Passw0rd"
      MSSQL_COLLATION: "Japanese_CI_AS"
    ports:
      - "1433:1433"
    volumes:
      - sqlserver_data:/var/opt/mssql

  redis:
    image: redis:7-alpine
    container_name: social_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  minio:
    image: minio/minio:latest
    container_name: social_minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

volumes:
  sqlserver_data:
  redis_data:
  minio_data:
```

### 3. Shared Library — `libs/common`

#### Directory structure

```
libs/common/src/
├── index.ts
├── dto/
│   ├── api-response.dto.ts
│   └── paginated-response.dto.ts
├── decorators/
│   ├── current-user.decorator.ts
│   └── require-permissions.decorator.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   └── permissions.guard.ts
├── interceptors/
│   └── transform.interceptor.ts
├── filters/
│   └── global-exception.filter.ts
├── pipes/
│   └── validation.pipe.ts
└── constants/
    └── service-tokens.ts
```

#### `libs/common/src/dto/api-response.dto.ts`

```typescript
export class ApiResponseDto<T> {
  success: boolean;
  data?: T;
  message?: string;
  errorCode?: string;
  timestamp: string;

  static ok<T>(data: T, message?: string): ApiResponseDto<T> {
    const res = new ApiResponseDto<T>();
    res.success = true;
    res.data = data;
    res.message = message ?? 'OK';
    res.timestamp = new Date().toISOString();
    return res;
  }

  static fail(message: string, errorCode?: string): ApiResponseDto<null> {
    const res = new ApiResponseDto<null>();
    res.success = false;
    res.message = message;
    res.errorCode = errorCode;
    res.timestamp = new Date().toISOString();
    return res;
  }
}
```

#### `libs/common/src/dto/paginated-response.dto.ts`

```typescript
export class PaginatedResponseDto<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;

  static from<T>(
    items: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResponseDto<T> {
    const dto = new PaginatedResponseDto<T>();
    dto.items = items;
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}
```

#### `libs/common/src/decorators/current-user.decorator.ts`

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
```

#### `libs/common/src/decorators/require-permissions.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
```

#### `libs/common/src/guards/jwt-auth.guard.ts`

```typescript
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    if (!request.user) {
      throw new UnauthorizedException('Authentication required');
    }
    return true;
  }
}
```

#### `libs/common/src/guards/permissions.guard.ts`

```typescript
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    const userPermissions: string[] = user?.permissions ?? [];

    const hasAll = requiredPermissions.every((p) =>
      userPermissions.includes(p),
    );
    if (!hasAll) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
```

#### `libs/common/src/interceptors/transform.interceptor.ts`

```typescript
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ApiResponseDto } from '../dto/api-response.dto';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponseDto<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponseDto<T>> {
    return next.handle().pipe(
      map((data) => ApiResponseDto.ok(data)),
    );
  }
}
```

#### `libs/common/src/filters/global-exception.filter.ts`

```typescript
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponseDto } from '../dto/api-response.dto';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message =
        typeof res === 'string'
          ? res
          : (res as any).message ?? exception.message;
      errorCode = (res as any).error ?? 'HTTP_ERROR';
    }

    this.logger.error(
      `${status} ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json(ApiResponseDto.fail(message, errorCode));
  }
}
```

#### `libs/common/src/pipes/validation.pipe.ts`

```typescript
import {
  ValidationPipe as NestValidationPipe,
  ValidationPipeOptions,
} from '@nestjs/common';

export const createValidationPipe = (
  options?: ValidationPipeOptions,
): NestValidationPipe =>
  new NestValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
    ...options,
  });
```

#### `libs/common/src/constants/service-tokens.ts`

```typescript
export const SERVICE_TOKENS = {
  AUTH_SERVICE: 'AUTH_SERVICE',
  USER_SERVICE: 'USER_SERVICE',
  POST_SERVICE: 'POST_SERVICE',
  ANNOUNCEMENT_SERVICE: 'ANNOUNCEMENT_SERVICE',
  SURVEY_SERVICE: 'SURVEY_SERVICE',
  NOTIFICATION_SERVICE: 'NOTIFICATION_SERVICE',
  FILE_SERVICE: 'FILE_SERVICE',
} as const;
```

### 4. Database Library — `libs/database`

#### Directory structure

```
libs/database/src/
├── index.ts
├── database.module.ts
├── entities/
│   ├── user.entity.ts
│   ├── permission.entity.ts
│   ├── user-permission.entity.ts
│   ├── post.entity.ts
│   ├── post-like.entity.ts
│   ├── comment.entity.ts
│   ├── announcement.entity.ts
│   ├── announcement-read-status.entity.ts
│   ├── survey.entity.ts
│   ├── survey-question.entity.ts
│   ├── survey-response.entity.ts
│   ├── notification.entity.ts
│   ├── push-subscription.entity.ts
│   └── file-record.entity.ts
└── migrations/
```

#### `libs/database/src/database.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mssql',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 1433),
        username: config.get<string>('DB_USERNAME', 'sa'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_DATABASE', 'internal_social'),
        entities: [__dirname + '/entities/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
        synchronize: false,
        options: {
          encrypt: false,
          trustServerCertificate: true,
        },
        extra: {
          collation: 'Japanese_CI_AS',
        },
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
```

#### Example Entity: `libs/database/src/entities/user.entity.ts`

```typescript
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserPermission } from './user-permission.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
  username: string;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ length: 100 })
  display_name: string;

  @Column({ length: 255, nullable: true })
  password_hash: string;

  @Column({ length: 255, nullable: true })
  microsoft_id: string;

  @Column({ length: 500, nullable: true })
  avatar_url: string;

  @Column({ default: true })
  is_active: boolean;

  @OneToMany(() => UserPermission, (up) => up.user)
  userPermissions: UserPermission[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
```

### 5. API Gateway Application

**File**: `apps/api-gateway/src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import {
  createValidationPipe,
  GlobalExceptionFilter,
  TransformInterceptor,
} from '@app/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:5173'],
    credentials: true,
  });

  // Global pipes, filters, interceptors
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Internal Social Network API')
    .setDescription('API documentation for the Internal Social Network')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
}
bootstrap();
```

**File**: `apps/api-gateway/src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { DatabaseModule } from '@app/database';
import { SERVICE_TOKENS } from '@app/common';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    ClientsModule.register([
      {
        name: SERVICE_TOKENS.AUTH_SERVICE,
        transport: Transport.TCP,
        options: { host: 'localhost', port: 3001 },
      },
      {
        name: SERVICE_TOKENS.USER_SERVICE,
        transport: Transport.TCP,
        options: { host: 'localhost', port: 3002 },
      },
      {
        name: SERVICE_TOKENS.POST_SERVICE,
        transport: Transport.TCP,
        options: { host: 'localhost', port: 3003 },
      },
      {
        name: SERVICE_TOKENS.ANNOUNCEMENT_SERVICE,
        transport: Transport.TCP,
        options: { host: 'localhost', port: 3004 },
      },
      {
        name: SERVICE_TOKENS.SURVEY_SERVICE,
        transport: Transport.TCP,
        options: { host: 'localhost', port: 3005 },
      },
      {
        name: SERVICE_TOKENS.NOTIFICATION_SERVICE,
        transport: Transport.TCP,
        options: { host: 'localhost', port: 3006 },
      },
      {
        name: SERVICE_TOKENS.FILE_SERVICE,
        transport: Transport.TCP,
        options: { host: 'localhost', port: 3007 },
      },
    ]),
  ],
})
export class AppModule {}
```

### 6. TypeORM Migrations

**File**: `libs/database/src/data-source.ts`

```typescript
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

export default new DataSource({
  type: 'mssql',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '1433', 10),
  username: process.env.DB_USERNAME ?? 'sa',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE ?? 'internal_social',
  entities: [__dirname + '/entities/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
  options: { encrypt: false, trustServerCertificate: true },
});
```

Add npm scripts to `package.json`:

```jsonc
{
  "scripts": {
    "typeorm": "ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js",
    "migration:generate": "pnpm typeorm migration:generate -d libs/database/src/data-source.ts",
    "migration:run": "pnpm typeorm migration:run -d libs/database/src/data-source.ts",
    "migration:revert": "pnpm typeorm migration:revert -d libs/database/src/data-source.ts"
  }
}
```

### 7. Environment Variables

**File**: `.env.example`

```ini
# Database — SQL Server
DB_HOST=localhost
DB_PORT=1433
DB_USERNAME=sa
DB_PASSWORD=YourStrong!Passw0rd
DB_DATABASE=internal_social

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=social-uploads
MINIO_USE_SSL=false

# JWT
JWT_SECRET=change-me-to-a-real-secret
JWT_ACCESS_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d

# Microsoft 365 SSO
MS_CLIENT_ID=
MS_CLIENT_SECRET=
MS_TENANT_ID=
MS_REDIRECT_URI=http://localhost:3000/api/auth/microsoft/callback

# CORS
CORS_ORIGINS=http://localhost:5173

# Web Push (VAPID)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@example.com
```

---

## Verification Checklist

- [ ] `docker compose up -d` starts SQL Server, Redis, and MinIO without errors.
- [ ] `pnpm run start:dev api-gateway` compiles and listens on port 3000.
- [ ] `GET http://localhost:3000/api/docs` renders Swagger UI.
- [ ] `pnpm run migration:run` applies the initial migration to SQL Server.
- [ ] SQL Server database uses `Japanese_CI_AS` collation.
- [ ] Redis is reachable at `localhost:6379`.
- [ ] MinIO console is accessible at `http://localhost:9001`.
- [ ] `libs/common` and `libs/database` compile without errors.
- [ ] `tsconfig.json` path aliases (`@app/common`, `@app/database`) resolve correctly.

---

## Files Created / Modified

| File | Purpose |
|------|---------|
| `nest-cli.json` | Monorepo configuration with all projects |
| `docker-compose.yml` | Local infrastructure (SQL Server, Redis, MinIO) |
| `libs/common/src/**` | Shared DTOs, decorators, guards, interceptors, filters, pipes |
| `libs/database/src/**` | TypeORM entities, database module, data source, migrations |
| `apps/api-gateway/src/main.ts` | API Gateway bootstrap with Swagger, CORS, global middleware |
| `apps/api-gateway/src/app.module.ts` | Root module with microservice client registrations |
| `.env.example` | Template for all required environment variables |
| `package.json` | Migration scripts |
| `tsconfig.json` | Path aliases for `@app/common` and `@app/database` |
