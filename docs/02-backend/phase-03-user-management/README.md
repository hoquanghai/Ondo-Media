# Phase 03 — User Management

## Objectives

- Create the `user-service` microservice (port 3002, NestJS TCP transport).
- Implement full User CRUD with soft delete.
- Build a granular permission system with `permissions` and `user_permissions` tables.
- Provide per-function and per-screen permission checks.
- Implement My Page statistics queries (total posts, streaks, likes received, etc.).
- Expose user management endpoints through the API Gateway.

---

## Prerequisites

- Phase 01 complete — monorepo, Docker infrastructure, shared libraries.
- Phase 02 complete — authentication working, JWT middleware in API Gateway.
- Users table and permissions tables migrated.

### Additional Packages

```bash
pnpm add class-validator class-transformer
```

---

## Tasks

### 1. Scaffold the User Service

```bash
nest generate app user-service
```

#### `apps/user-service/src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { UserServiceModule } from './user-service.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    UserServiceModule,
    {
      transport: Transport.TCP,
      options: { host: '0.0.0.0', port: 3002 },
    },
  );
  await app.listen();
  console.log('User service listening on TCP port 3002');
}
bootstrap();
```

### 2. Permission Entities

**File**: `libs/database/src/entities/permission.entity.ts`

```typescript
import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserPermission } from './user-permission.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
  code: string; // e.g. "announcement.create", "survey.create", "admin.users"

  @Column({ length: 255 })
  name: string; // Human-readable label

  @Column({ length: 100 })
  category: string; // e.g. "announcement", "survey", "admin", "post"

  @Column({ length: 500, nullable: true })
  description: string;

  @OneToMany(() => UserPermission, (up) => up.permission)
  userPermissions: UserPermission[];
}
```

**File**: `libs/database/src/entities/user-permission.entity.ts`

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
import { Permission } from './permission.entity';

@Entity('user_permissions')
@Unique(['user', 'permission'])
export class UserPermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (u) => u.userPermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Permission, (p) => p.userPermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permission_id' })
  permission: Permission;

  @CreateDateColumn()
  granted_at: Date;
}
```

### 3. User Service Module

**File**: `apps/user-service/src/user-service.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@app/database';
import { User } from '@app/database/entities/user.entity';
import { Permission } from '@app/database/entities/permission.entity';
import { UserPermission } from '@app/database/entities/user-permission.entity';
import { Post } from '@app/database/entities/post.entity';
import { PostLike } from '@app/database/entities/post-like.entity';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PermissionService } from './permission.service';
import { StatsService } from './stats.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    TypeOrmModule.forFeature([User, Permission, UserPermission, Post, PostLike]),
  ],
  controllers: [UserController],
  providers: [UserService, PermissionService, StatsService],
})
export class UserServiceModule {}
```

### 4. User Service Controller (TCP)

**File**: `apps/user-service/src/user.controller.ts`

```typescript
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from './user.service';
import { PermissionService } from './permission.service';
import { StatsService } from './stats.service';

@Controller()
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly permissionService: PermissionService,
    private readonly statsService: StatsService,
  ) {}

  // --- User CRUD ---

  @MessagePattern('user.findAll')
  async findAll(@Payload() data: { page: number; limit: number; search?: string }) {
    return this.userService.findAll(data);
  }

  @MessagePattern('user.findById')
  async findById(@Payload() data: { id: string }) {
    return this.userService.findById(data.id);
  }

  @MessagePattern('user.create')
  async create(@Payload() data: any) {
    return this.userService.create(data);
  }

  @MessagePattern('user.update')
  async update(@Payload() data: { id: string; updates: any }) {
    return this.userService.update(data.id, data.updates);
  }

  @MessagePattern('user.softDelete')
  async softDelete(@Payload() data: { id: string }) {
    return this.userService.softDelete(data.id);
  }

  // --- Permissions ---

  @MessagePattern('user.getPermissions')
  async getPermissions(@Payload() data: { userId: string }) {
    return this.permissionService.getUserPermissions(data.userId);
  }

  @MessagePattern('user.setPermissions')
  async setPermissions(
    @Payload() data: { userId: string; permissionCodes: string[] },
  ) {
    return this.permissionService.setUserPermissions(
      data.userId,
      data.permissionCodes,
    );
  }

  @MessagePattern('user.listAllPermissions')
  async listAllPermissions() {
    return this.permissionService.listAll();
  }

  // --- My Page Stats ---

  @MessagePattern('user.getStats')
  async getStats(@Payload() data: { userId: string }) {
    return this.statsService.getUserStats(data.userId);
  }
}
```

### 5. User Service Logic

**File**: `apps/user-service/src/user.service.ts`

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { User } from '@app/database/entities/user.entity';
import { PaginatedResponseDto } from '@app/common';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findAll(params: { page: number; limit: number; search?: string }) {
    const { page = 1, limit = 20, search } = params;
    const where: any = {};
    if (search) {
      where.display_name = Like(`%${search}%`);
    }

    const [items, total] = await this.userRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });

    return PaginatedResponseDto.from(items, total, page, limit);
  }

  async findById(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['userPermissions', 'userPermissions.permission'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(data: Partial<User>) {
    const user = this.userRepo.create(data);
    return this.userRepo.save(user);
  }

  async update(id: string, updates: Partial<User>) {
    await this.userRepo.update(id, updates);
    return this.findById(id);
  }

  async softDelete(id: string) {
    const result = await this.userRepo.softDelete(id);
    if (result.affected === 0) throw new NotFoundException('User not found');
    return { deleted: true };
  }
}
```

### 6. Permission Service

**File**: `apps/user-service/src/permission.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Permission } from '@app/database/entities/permission.entity';
import { UserPermission } from '@app/database/entities/user-permission.entity';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission)
    private readonly permRepo: Repository<Permission>,
    @InjectRepository(UserPermission)
    private readonly upRepo: Repository<UserPermission>,
  ) {}

  async listAll() {
    return this.permRepo.find({ order: { category: 'ASC', code: 'ASC' } });
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const ups = await this.upRepo.find({
      where: { user: { id: userId } },
      relations: ['permission'],
    });
    return ups.map((up) => up.permission.code);
  }

  async setUserPermissions(userId: string, permissionCodes: string[]) {
    // Remove existing
    await this.upRepo.delete({ user: { id: userId } });

    if (permissionCodes.length === 0) return [];

    // Find permission entities
    const permissions = await this.permRepo.find({
      where: { code: In(permissionCodes) },
    });

    // Create junction records
    const entries = permissions.map((p) =>
      this.upRepo.create({
        user: { id: userId } as any,
        permission: p,
      }),
    );

    await this.upRepo.save(entries);
    return permissionCodes;
  }
}
```

### 7. My Page Statistics

**File**: `apps/user-service/src/stats.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '@app/database/entities/post.entity';
import { PostLike } from '@app/database/entities/post-like.entity';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
    @InjectRepository(PostLike)
    private readonly likeRepo: Repository<PostLike>,
  ) {}

  async getUserStats(userId: string) {
    // Total posts
    const totalPosts = await this.postRepo.count({
      where: { author: { id: userId } },
    });

    // Total likes received (across all user's posts)
    const likesReceived = await this.likeRepo
      .createQueryBuilder('like')
      .innerJoin('like.post', 'post')
      .where('post.author_id = :userId', { userId })
      .getCount();

    // Current posting streak (consecutive days with at least one post)
    const streak = await this.calculateStreak(userId);

    // Posts this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const postsThisMonth = await this.postRepo
      .createQueryBuilder('post')
      .where('post.author_id = :userId', { userId })
      .andWhere('post.post_date >= :start', { start: startOfMonth })
      .getCount();

    return {
      totalPosts,
      likesReceived,
      currentStreak: streak,
      postsThisMonth,
    };
  }

  private async calculateStreak(userId: string): Promise<number> {
    // Get distinct post_dates in descending order
    const rows = await this.postRepo
      .createQueryBuilder('post')
      .select('CAST(post.post_date AS DATE)', 'date')
      .where('post.author_id = :userId', { userId })
      .groupBy('CAST(post.post_date AS DATE)')
      .orderBy('date', 'DESC')
      .getRawMany();

    if (rows.length === 0) return 0;

    let streak = 1;
    for (let i = 1; i < rows.length; i++) {
      const prev = new Date(rows[i - 1].date);
      const curr = new Date(rows[i].date);
      const diffDays = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }
}
```

### 8. Seed Permissions

**File**: `libs/database/src/seeds/permissions.seed.ts`

```typescript
import { DataSource } from 'typeorm';

const PERMISSIONS = [
  // Posts
  { code: 'post.create', name: 'Create Posts', category: 'post' },
  { code: 'post.edit_own', name: 'Edit Own Posts', category: 'post' },
  { code: 'post.delete_own', name: 'Delete Own Posts', category: 'post' },
  { code: 'post.delete_any', name: 'Delete Any Post', category: 'post' },

  // Announcements
  { code: 'announcement.create', name: 'Create Announcements', category: 'announcement' },
  { code: 'announcement.edit', name: 'Edit Announcements', category: 'announcement' },
  { code: 'announcement.delete', name: 'Delete Announcements', category: 'announcement' },

  // Surveys
  { code: 'survey.create', name: 'Create Surveys', category: 'survey' },
  { code: 'survey.view_results', name: 'View Survey Results', category: 'survey' },
  { code: 'survey.export', name: 'Export Survey Results', category: 'survey' },

  // Admin
  { code: 'admin.users', name: 'Manage Users', category: 'admin' },
  { code: 'admin.permissions', name: 'Manage Permissions', category: 'admin' },
  { code: 'admin.settings', name: 'Manage Settings', category: 'admin' },
];

export async function seedPermissions(dataSource: DataSource) {
  const repo = dataSource.getRepository('permissions');
  for (const perm of PERMISSIONS) {
    const existing = await repo.findOne({ where: { code: perm.code } });
    if (!existing) {
      await repo.save(perm);
    }
  }
  console.log(`Seeded ${PERMISSIONS.length} permissions`);
}
```

### 9. API Gateway User Controllers

**File**: `apps/api-gateway/src/users/users.controller.ts`

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

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/users')
export class UsersController {
  constructor(
    @Inject(SERVICE_TOKENS.USER_SERVICE)
    private readonly userClient: ClientProxy,
  ) {}

  @Get()
  @RequirePermissions('admin.users')
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
  ) {
    return firstValueFrom(
      this.userClient.send('user.findAll', { page, limit, search }),
    );
  }

  @Get('me')
  async getMe(@CurrentUser('sub') userId: string) {
    return firstValueFrom(
      this.userClient.send('user.findById', { id: userId }),
    );
  }

  @Get('me/stats')
  async getMyStats(@CurrentUser('sub') userId: string) {
    return firstValueFrom(
      this.userClient.send('user.getStats', { userId }),
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return firstValueFrom(
      this.userClient.send('user.findById', { id }),
    );
  }

  @Patch(':id')
  @RequirePermissions('admin.users')
  async update(@Param('id') id: string, @Body() updates: any) {
    return firstValueFrom(
      this.userClient.send('user.update', { id, updates }),
    );
  }

  @Delete(':id')
  @RequirePermissions('admin.users')
  async softDelete(@Param('id') id: string) {
    return firstValueFrom(
      this.userClient.send('user.softDelete', { id }),
    );
  }

  // --- Permissions ---

  @Get(':id/permissions')
  @RequirePermissions('admin.permissions')
  async getPermissions(@Param('id') id: string) {
    return firstValueFrom(
      this.userClient.send('user.getPermissions', { userId: id }),
    );
  }

  @Post(':id/permissions')
  @RequirePermissions('admin.permissions')
  async setPermissions(
    @Param('id') id: string,
    @Body() body: { permissionCodes: string[] },
  ) {
    return firstValueFrom(
      this.userClient.send('user.setPermissions', {
        userId: id,
        permissionCodes: body.permissionCodes,
      }),
    );
  }
}
```

---

## Verification Checklist

- [ ] `user-service` starts and listens on TCP port 3002.
- [ ] `GET /api/users` returns paginated user list (requires `admin.users` permission).
- [ ] `GET /api/users/me` returns the current authenticated user.
- [ ] `GET /api/users/me/stats` returns total posts, streak, likes received, posts this month.
- [ ] `GET /api/users/:id` returns a user with their permissions.
- [ ] `PATCH /api/users/:id` updates user fields.
- [ ] `DELETE /api/users/:id` performs soft delete (sets `deleted_at`).
- [ ] `GET /api/users/:id/permissions` returns permission code list.
- [ ] `POST /api/users/:id/permissions` replaces user's permissions.
- [ ] Endpoints respect `@RequirePermissions` — returns 403 when lacking permissions.
- [ ] Seed script populates the permissions table.
- [ ] Soft-deleted users are excluded from normal queries.

---

## Files Created / Modified

| File | Purpose |
|------|---------|
| `apps/user-service/src/main.ts` | User service bootstrap (TCP port 3002) |
| `apps/user-service/src/user-service.module.ts` | Module with TypeORM entities |
| `apps/user-service/src/user.controller.ts` | TCP message pattern handlers |
| `apps/user-service/src/user.service.ts` | User CRUD with soft delete |
| `apps/user-service/src/permission.service.ts` | Permission management logic |
| `apps/user-service/src/stats.service.ts` | My Page statistics queries |
| `libs/database/src/entities/permission.entity.ts` | Permission entity |
| `libs/database/src/entities/user-permission.entity.ts` | Junction table entity |
| `libs/database/src/seeds/permissions.seed.ts` | Permission seed data |
| `apps/api-gateway/src/users/users.controller.ts` | Gateway user endpoints |
