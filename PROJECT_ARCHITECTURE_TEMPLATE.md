# Enterprise Full-Stack Project Architecture Template

> **Purpose:** This document is a detailed blueprint for building enterprise-grade full-stack projects. Use this file to instruct AI assistants (Claude Code, Cursor, GitHub Copilot, etc.) to build new projects following the same battle-tested architecture and workflow.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Project Directory Structure](#2-project-directory-structure)
3. [Design Documents](#3-design-documents)
4. [Backend — NestJS Microservices with Nx Monorepo](#4-backend--nestjs-microservices-with-nx-monorepo)
5. [Frontend — Angular Standalone](#5-frontend--angular-standalone)
6. [Database — SQL Server with TypeORM](#6-database--sql-server-with-typeorm)
7. [Infrastructure — Docker, Redis, RabbitMQ](#7-infrastructure--docker-redis-rabbitmq)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Naming Conventions](#9-naming-conventions)
10. [API Design Standards](#10-api-design-standards)
11. [State Management & Data Flow](#11-state-management--data-flow)
12. [Caching Strategy](#12-caching-strategy)
13. [Error Handling](#13-error-handling)
14. [Testing Strategy](#14-testing-strategy)
15. [Phase-Based Development Workflow](#15-phase-based-development-workflow)
16. [CLAUDE.md — AI Assistant Guide](#16-claudemd--ai-assistant-guide)
17. [New Project Initialization Checklist](#17-new-project-initialization-checklist)

---

## 1. Architecture Overview

### 1.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Angular)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │  Auth    │ │ Dashboard│ │ Features │ │ Shared Components│   │
│  │ (MSAL)  │ │          │ │ (Lazy)   │ │ (Material/Grid)  │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────────────────┘   │
│       │             │            │                               │
│       └─────────────┴────────────┘                               │
│                     │ HTTP + Bearer JWT                          │
└─────────────────────┼───────────────────────────────────────────┘
                      │
┌─────────────────────┼───────────────────────────────────────────┐
│              API GATEWAY (NestJS, port 3000)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ JWT Auth │ │ Rate     │ │ Routing  │ │ Health           │   │
│  │ Guard   │ │ Limiting │ │ Proxy    │ │ Aggregation      │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
│                     │ RabbitMQ                                   │
└─────────────────────┼───────────────────────────────────────────┘
                      │
┌─────────────────────┼───────────────────────────────────────────┐
│              MICROSERVICES (NestJS)                              │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ Auth    │ │ Master   │ │ Business │ │ Supporting       │   │
│  │ Service │ │ Data Svc │ │ Services │ │ Services         │   │
│  └────┬────┘ └────┬─────┘ └────┬─────┘ └────────┬─────────┘   │
│       │           │            │                  │              │
└───────┼───────────┼────────────┼──────────────────┼─────────────┘
        │           │            │                  │
┌───────┼───────────┼────────────┼──────────────────┼─────────────┐
│       ▼           ▼            ▼                  ▼              │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐                         │
│  │SQL Server│ │  Redis   │ │ RabbitMQ │                         │
│  │ (Data)  │ │ (Cache)  │ │ (Events) │                         │
│  └─────────┘ └──────────┘ └──────────┘                         │
│                    INFRASTRUCTURE                                │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | Angular (Standalone) | 21+ | SPA framework |
| **UI Library** | Angular Material (M3) | 21+ | Component library |
| **Data Grid** | AG Grid Enterprise | 35+ | Advanced data tables |
| **Auth (FE)** | MSAL Angular | 5+ | Azure AD authentication |
| **State** | RxJS Observables / NgRx Signal Store | - | State management |
| **Backend** | NestJS | 11+ | Microservices framework |
| **Monorepo** | Nx | 20+ | Build system & workspace |
| **ORM** | TypeORM | 0.3+ | Database access |
| **Database** | SQL Server | 2022 | Primary data store |
| **Cache** | Redis | 7+ | Session & query cache |
| **Message Broker** | RabbitMQ | 3+ | Async communication |
| **Auth (BE)** | Passport.js + JWT | - | Token validation |
| **Container** | Docker Compose | - | Local development |
| **Deployment** | Kubernetes (MicroK8s) | - | Production deployment |

---

## 2. Project Directory Structure

### 2.1 Root Structure

```
Project_Name/
├── 01-system-design/                    # System design documentation
│   ├── shared/
│   │   ├── conventions.md               # Code, naming, and git conventions
│   │   ├── data-migration.md            # Data migration strategy
│   │   └── shared-types.md              # Shared type definitions
│   ├── backend/
│   │   ├── database-schema.md           # Detailed DB schema (DDL + indexes)
│   │   ├── api-endpoints.md             # Complete REST API specification
│   │   ├── microservices.md             # Microservices architecture
│   │   ├── caching-strategy.md          # Redis caching strategy
│   │   └── message-broker.md            # RabbitMQ event architecture
│   └── frontend/
│       ├── angular-architecture.md      # Angular architecture
│       ├── routing.md                   # Route configuration
│       └── screen-inventory.md          # UI screen inventory
│
├── 02-backend/                          # Phase-by-phase backend implementation guides
│   ├── phase-01-foundation/README.md    # Nx, NestJS, Docker, DB setup
│   ├── phase-02-auth/README.md          # Authentication & Authorization
│   ├── phase-03-master-data/README.md   # Master data CRUD
│   ├── phase-04-{domain}/README.md      # Business logic domains
│   ├── ...
│   └── operations-manual.md             # Operations & troubleshooting
│
├── 03-frontend/                         # Phase-by-phase frontend implementation guides
│   ├── phase-01-setup/README.md         # Angular project setup
│   ├── phase-02-auth/README.md          # MSAL integration
│   ├── phase-03-layout/README.md        # App shell (header, sidebar)
│   ├── phase-04-dashboard/README.md     # Dashboard & KPIs
│   ├── phase-05-{feature}/README.md     # Feature modules
│   └── ...
│
├── source/                              # Source code
│   ├── backend/{project-name}/          # Backend Nx monorepo
│   └── frontend/{project-name}/         # Frontend Angular app
│
├── PROJECT_REQUIREMENTS.md              # Overall project requirements
├── CLAUDE.md                            # AI assistant instructions
└── review/                              # Code review artifacts
```

### 2.2 Why This Structure?

| Directory | Role | Benefit |
|-----------|------|---------|
| `01-system-design/` | Design before code | AI reads and understands requirements before implementing |
| `02-backend/` | Step-by-step guides | AI follows sequentially, nothing is missed |
| `03-frontend/` | Step-by-step guides | Ensures UI matches API contracts |
| `source/` | Actual source code | Separates code from documentation |
| `CLAUDE.md` | Meta-instruction | AI gets project context immediately |

---

## 3. Design Documents

### 3.1 conventions.md — Project-Wide Conventions

This file is **mandatory** and must be written first. Required content:

```markdown
# Project Conventions

## 1. Database Naming
- Tables: snake_case, plural (e.g., `products`, `sales_orders`)
- Columns: snake_case (e.g., `created_at`, `product_name`)
- Primary keys: always `id` (INT/UUID auto-generated)
- Foreign keys: `{table_singular}_id` (e.g., `product_id`, `factory_id`)
- Indexes: `IX_{table}_{column}` or `UX_{table}_{column}` (unique)
- Constraints: `CK_{table}_{rule}`, `DF_{table}_{column}` (default)

## 2. API URL Naming
- kebab-case: `/api/v1/production-plans`
- Versioned: `/api/v1/...`
- RESTful: use HTTP methods, no verbs in URLs
- Nested resources: `/api/v1/products/:id/bom-items`

## 3. Code Naming
- Classes: PascalCase + suffix (`ProductService`, `CreateProductDto`)
- Files: kebab-case + type suffix (`product.service.ts`, `product.entity.ts`)
- Variables/properties: camelCase
- Constants: UPPER_SNAKE_CASE
- Enums: PascalCase key, string values

## 4. JSON Response
- Properties: camelCase
- Dates: ISO 8601 (`2026-03-20T09:00:00.000Z`)
- Nulls: included, not omitted
- Empty arrays: `[]` not null

## 5. Git Conventions
- Branch: feature/*, bugfix/*, release/*, hotfix/*
- Commits: Conventional Commits — `feat(product): add CRUD endpoints`
- PR: squash merge to main

## 6. File Suffixes
| Type | Suffix | Example |
|------|--------|---------|
| Entity | `.entity.ts` | `product.entity.ts` |
| DTO | `.dto.ts` | `create-product.dto.ts` |
| Service | `.service.ts` | `product.service.ts` |
| Controller | `.controller.ts` | `product.controller.ts` |
| Module | `.module.ts` | `product.module.ts` |
| Guard | `.guard.ts` | `auth.guard.ts` |
| Interceptor | `.interceptor.ts` | `jwt.interceptor.ts` |
| Pipe | `.pipe.ts` | `date-format.pipe.ts` |
| Component | `.component.ts` | `product-list.component.ts` |
| Directive | `.directive.ts` | `has-role.directive.ts` |
| Spec | `.spec.ts` | `product.service.spec.ts` |
```

### 3.2 database-schema.md — Detailed Schema

```markdown
# Database Schema

## Table: products
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INT IDENTITY(1,1) | PK | Auto-increment ID |
| product_code | NVARCHAR(50) | UX, NOT NULL | Product code |
| product_name | NVARCHAR(200) | NOT NULL | Product name |
| category_id | INT | FK → product_categories(id) | Category |
| is_active | BIT | DEFAULT 1 | Soft delete flag |
| created_at | DATETIME2(7) | DEFAULT GETUTCDATE() | |
| updated_at | DATETIME2(7) | DEFAULT GETUTCDATE() | |
| created_by | NVARCHAR(100) | NULL | User ID |

### Indexes
- UX_products_product_code (product_code) — Unique
- IX_products_category_id (category_id)
- IX_products_is_active (is_active)

### Foreign Keys
- FK_products_category → product_categories(id)
```

**Important notes:**
- Write complete DDL for ALL tables before starting to code
- Include indexes, constraints, and foreign keys
- Write stored procedures for complex logic
- Write views for commonly used queries

### 3.3 api-endpoints.md — API Specification

```markdown
# API Endpoints

## Products

### GET /api/v1/products
List all products with pagination and filters.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page |
| search | string | - | Search by name/code |
| categoryId | number | - | Filter by category |
| isActive | boolean | true | Filter by status |
| sortBy | string | createdAt | Sort column |
| sortOrder | string | DESC | ASC or DESC |

**Response 200:**
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### POST /api/v1/products
Create a new product.

**Authorization:** Roles: admin, planner
**Request Body:**
```json
{
  "productCode": "PRD-001",
  "productName": "Product Name",
  "categoryId": 1
}
```
```

### 3.4 microservices.md — Microservices Architecture

```markdown
# Microservices Architecture

## Service Registry
| Service | Port | Queue | Owned Tables | Replicas |
|---------|------|-------|-------------|----------|
| api-gateway | 3000 | api_gateway_queue | none | 2 |
| auth-service | 3001 | auth_service_queue | users | 1 |
| master-data-service | 3002 | master_data_queue | products, categories... | 1 |
| {domain}-service | 300X | {domain}_queue | {tables} | 1 |

## Event Flows
| Event | Publisher | Consumers | Description |
|-------|-----------|-----------|-------------|
| product.created | master-data | production, bom | When a new product is created |
| plan.confirmed | production | inventory, bom | When a plan is confirmed |

## Communication Patterns
- **Synchronous:** API Gateway → Service via RabbitMQ `send()` (request-reply)
- **Asynchronous:** Service → Service via RabbitMQ `emit()` (fire-and-forget)
```

---

## 4. Backend — NestJS Microservices with Nx Monorepo

### 4.1 Backend Structure

```
source/backend/{project-name}/
├── apps/                                # Microservices
│   ├── api-gateway/                     # Entry point (port 3000)
│   │   └── src/
│   │       ├── main.ts                  # Bootstrap + Swagger + CORS
│   │       └── app/
│   │           ├── app.module.ts        # Import all gateway controllers
│   │           ├── strategies/
│   │           │   └── jwt.strategy.ts  # Passport JWT validation
│   │           ├── guards/
│   │           │   └── jwt-auth.guard.ts
│   │           ├── {domain}/            # Gateway controllers per domain
│   │           │   └── {domain}.controller.ts
│   │           └── health/
│   │               └── health.controller.ts
│   │
│   ├── auth-service/                    # Authentication
│   │   └── src/app/
│   │       ├── app.module.ts
│   │       ├── auth/
│   │       │   ├── auth.controller.ts   # @MessagePattern handlers
│   │       │   ├── auth.service.ts      # Business logic
│   │       │   └── dto/
│   │       └── users/
│   │           ├── users.controller.ts
│   │           ├── users.service.ts
│   │           └── dto/
│   │
│   ├── master-data-service/             # Master data CRUD
│   ├── {domain}-service/                # Business domain services
│   └── notification-service/            # Email/notifications
│
├── libs/shared/src/                     # Shared library
│   ├── index.ts                         # Barrel export (all exports)
│   ├── entities/                        # TypeORM entities
│   │   ├── user.entity.ts
│   │   ├── product.entity.ts
│   │   └── ... (all entities)
│   ├── dto/
│   │   ├── api-response.dto.ts          # Standardized response wrapper
│   │   └── paginated-response.dto.ts    # Pagination meta
│   ├── decorators/
│   │   ├── public.decorator.ts          # @Public() — skip JWT
│   │   ├── roles.decorator.ts           # @Roles(UserRole.Admin)
│   │   ├── current-user.decorator.ts    # @GetCurrentUser()
│   │   └── cacheable.decorator.ts       # @Cacheable(key, ttl)
│   ├── guards/
│   │   └── roles.guard.ts              # Role-based access
│   ├── interceptors/
│   │   ├── transform.interceptor.ts     # Wrap response in ApiResponseDto
│   │   └── logging.interceptor.ts       # Request/response logging
│   ├── filters/
│   │   └── global-exception.filter.ts   # Standardized error responses
│   ├── middleware/
│   │   └── correlation-id.middleware.ts  # Request tracing
│   ├── pipes/
│   │   └── validation.pipe.ts           # Global validation pipe
│   ├── modules/
│   │   ├── database.module.ts           # TypeORM connection
│   │   ├── redis.module.ts              # Redis cache
│   │   └── rabbitmq.module.ts           # RabbitMQ client
│   ├── constants/
│   │   ├── events.ts                    # Event names
│   │   ├── queues.ts                    # Queue names
│   │   ├── message-patterns.ts          # RPC patterns
│   │   └── cache-keys.ts               # Cache key templates
│   ├── enums/
│   │   └── user-role.enum.ts
│   ├── interfaces/
│   │   └── current-user.interface.ts
│   └── utils/
│       └── event-publisher.ts           # Helper to publish events
│
├── migrations/                          # TypeORM migration files
├── tools/
│   └── seed.ts                          # Database seeding script
├── docker/
│   └── docker-compose.yml               # SQL Server, Redis, RabbitMQ
├── nx.json                              # Nx workspace config
├── tsconfig.base.json                   # Base TypeScript config
├── typeorm.config.ts                    # TypeORM CLI config
├── jest.config.ts                       # Jest config
├── package.json                         # Dependencies & scripts
└── .env.example                         # Environment variables template
```

### 4.2 Key Backend Patterns

#### 4.2.1 Service Bootstrap Pattern (main.ts)

```typescript
// apps/{service}/src/main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Structured logging
  app.useLogger(app.get(Logger));

  // Connect to RabbitMQ
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env['RABBITMQ_URL']],
      queue: '{service}_queue',
      queueOptions: { durable: true },
      prefetchCount: 1,
    },
  });

  // Global pipes, filters, interceptors
  app.useGlobalPipes(new AppValidationPipe());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  await app.startAllMicroservices();
  await app.listen(process.env['{SERVICE}_PORT'] || 300X);
}
```

#### 4.2.2 API Gateway Pattern

```typescript
// API Gateway Controller — proxy to microservice
@Controller('api/v1/products')
export class ProductGatewayController {
  constructor(
    @Inject('MASTER_DATA_SERVICE')
    private readonly masterDataClient: ClientProxy,
  ) {}

  @Get()
  @Roles(UserRole.Viewer, UserRole.Admin)
  async findAll(@Query() query: QueryProductDto) {
    return firstValueFrom(
      this.masterDataClient.send('master_data.get_products', query),
    );
  }

  @Post()
  @Roles(UserRole.Admin, UserRole.Planner)
  async create(
    @Body() dto: CreateProductDto,
    @GetCurrentUser() user: CurrentUser,
  ) {
    return firstValueFrom(
      this.masterDataClient.send('master_data.create_product', { ...dto, userId: user.id }),
    );
  }
}
```

#### 4.2.3 Microservice Controller Pattern

```typescript
// Microservice Controller — handle RabbitMQ messages
@Controller()
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @MessagePattern('master_data.get_products')
  async findAll(@Payload() query: QueryProductDto) {
    return this.productService.findAll(query);
  }

  @MessagePattern('master_data.create_product')
  async create(@Payload() data: CreateProductDto & { userId: number }) {
    return this.productService.create(data);
  }
}
```

#### 4.2.4 Service Implementation Pattern

```typescript
@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
    private readonly cacheService: RedisCacheService,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async findAll(query: QueryProductDto): Promise<PaginatedResponseDto<ProductEntity>> {
    // 1. Check cache
    const cacheKey = `products:${JSON.stringify(query)}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    // 2. Build query
    const { page = 1, limit = 20, search, categoryId, sortBy = 'createdAt', sortOrder = 'DESC' } = query;
    const qb = this.productRepo.createQueryBuilder('p')
      .where('p.is_active = :active', { active: true });

    if (search) {
      qb.andWhere('(p.product_name LIKE :search OR p.product_code LIKE :search)',
        { search: `%${search}%` });
    }
    if (categoryId) {
      qb.andWhere('p.category_id = :categoryId', { categoryId });
    }

    // 3. Safe sort (prevent SQL injection)
    const allowedSorts = ['createdAt', 'productName', 'productCode'];
    const safeSortBy = allowedSorts.includes(sortBy) ? sortBy : 'createdAt';
    qb.orderBy(`p.${safeSortBy}`, sortOrder === 'ASC' ? 'ASC' : 'DESC');

    // 4. Paginate
    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const result = PaginatedResponseDto.create(items, total, page, limit);

    // 5. Cache result
    await this.cacheService.set(cacheKey, result, CACHE_TTL.MEDIUM);

    return result;
  }

  async create(data: CreateProductDto & { userId: number }): Promise<ProductEntity> {
    const product = this.productRepo.create({
      ...data,
      createdBy: data.userId.toString(),
    });
    const saved = await this.productRepo.save(product);

    // Invalidate cache
    await this.cacheService.delByPattern('products:*');

    // Publish event
    await this.eventPublisher.emit('product.created', {
      productId: saved.id,
      productCode: saved.productCode,
    });

    return saved;
  }
}
```

#### 4.2.5 Entity Pattern

```typescript
// libs/shared/src/entities/product.entity.ts
@Entity('products')
export class ProductEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_code', type: 'nvarchar', length: 50, unique: true })
  productCode: string;

  @Column({ name: 'product_name', type: 'nvarchar', length: 200 })
  productName: string;

  @Column({ name: 'category_id', nullable: true })
  categoryId: number;

  @ManyToOne(() => ProductCategoryEntity)
  @JoinColumn({ name: 'category_id' })
  category: ProductCategoryEntity;

  @Column({ name: 'is_active', type: 'bit', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'nvarchar', length: 100, nullable: true })
  createdBy: string;
}
```

#### 4.2.6 Shared Module Patterns

```typescript
// libs/shared/src/modules/database.module.ts
@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            type: 'mssql',
            host: config.get('DB_HOST'),
            port: config.get<number>('DB_PORT', 1433),
            username: config.get('DB_USERNAME'),
            password: config.get('DB_PASSWORD'),
            database: config.get('DB_NAME'),
            entities: [/* all shared entities */],
            options: { encrypt: true, trustServerCertificate: true },
            synchronize: false, // NEVER true in production
          }),
        }),
      ],
      exports: [TypeOrmModule],
    };
  }
}
```

```typescript
// libs/shared/src/modules/rabbitmq.module.ts
@Module({})
export class RabbitMQModule {
  static register(serviceName: string, queueName: string): DynamicModule {
    return {
      module: RabbitMQModule,
      imports: [
        ClientsModule.registerAsync([{
          name: serviceName,
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            transport: Transport.RMQ,
            options: {
              urls: [config.get('RABBITMQ_URL')],
              queue: queueName,
              queueOptions: { durable: true },
            },
          }),
        }]),
      ],
      exports: [ClientsModule],
    };
  }
}
```

### 4.3 Standardized Response DTOs

```typescript
// libs/shared/src/dto/api-response.dto.ts
export class ApiResponseDto<T> {
  success: boolean;
  data: T;
  timestamp: string;

  static success<T>(data: T): ApiResponseDto<T> {
    return { success: true, data, timestamp: new Date().toISOString() };
  }
}

// libs/shared/src/dto/paginated-response.dto.ts
export class PaginatedResponseDto<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  static create<T>(items: T[], total: number, page: number, limit: number) {
    const totalPages = Math.ceil(total / limit);
    return {
      data: items,
      meta: {
        page, limit, total, totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }
}
```

### 4.4 Package.json Scripts (Backend)

```json
{
  "scripts": {
    "dev": "npx nx serve api-gateway",
    "dev:all": "npm run infra:up && npm run dev",
    "start:all": "concurrently \"npx nx serve api-gateway\" \"npx nx serve auth-service\" \"npx nx serve master-data-service\" ...",
    "build": "npx nx run-many --target=build --all",
    "test": "npx nx run-many --target=test --all",
    "lint": "npx nx run-many --target=lint --all",
    "infra:up": "docker compose -f docker/docker-compose.yml up -d",
    "infra:down": "docker compose -f docker/docker-compose.yml down",
    "db:migrate": "npx typeorm migration:run -d typeorm.config.ts",
    "db:migrate:generate": "npx typeorm migration:generate -d typeorm.config.ts",
    "db:seed": "npx ts-node tools/seed.ts",
    "clean": "npx nx reset && rm -rf node_modules"
  }
}
```

---

## 5. Frontend — Angular Standalone

### 5.1 Frontend Structure

```
source/frontend/{project-name}/
├── src/
│   ├── app/
│   │   ├── core/                        # Singleton services, guards, interceptors
│   │   │   ├── auth/
│   │   │   │   ├── auth.service.ts      # MSAL wrapper, user state
│   │   │   │   ├── msal.config.ts       # Azure AD config factories
│   │   │   │   └── token-refresh.service.ts
│   │   │   ├── guards/
│   │   │   │   ├── auth.guard.ts        # canActivate — check MSAL account
│   │   │   │   └── role.guard.ts        # canActivate — check user role
│   │   │   ├── interceptors/
│   │   │   │   ├── jwt.interceptor.ts   # Inject Bearer token
│   │   │   │   ├── auth-error.interceptor.ts  # Handle 401/403
│   │   │   │   ├── error-handling.interceptor.ts
│   │   │   │   └── loading.interceptor.ts
│   │   │   ├── models/                  # TypeScript interfaces
│   │   │   │   ├── common.model.ts      # PaginatedResponse, ApiResponse
│   │   │   │   ├── user.model.ts
│   │   │   │   └── {domain}.model.ts
│   │   │   └── services/
│   │   │       ├── api.service.ts       # Base HTTP client
│   │   │       ├── loading.service.ts   # Loading state
│   │   │       ├── notification.service.ts  # Snackbar notifications
│   │   │       └── breadcrumb.service.ts
│   │   │
│   │   ├── features/                    # Lazy-loaded feature modules
│   │   │   ├── auth/
│   │   │   │   ├── login/
│   │   │   │   │   └── login.component.ts
│   │   │   │   └── callback/
│   │   │   │       └── callback.component.ts
│   │   │   ├── dashboard/
│   │   │   │   ├── components/
│   │   │   │   ├── services/
│   │   │   │   ├── models/
│   │   │   │   └── dashboard.routes.ts
│   │   │   ├── master-data/
│   │   │   │   ├── products/
│   │   │   │   │   ├── product-list/
│   │   │   │   │   │   ├── product-list.component.ts
│   │   │   │   │   │   ├── product-list.component.html
│   │   │   │   │   │   └── product-list.component.scss
│   │   │   │   │   └── product-form/
│   │   │   │   ├── categories/
│   │   │   │   └── master-data.routes.ts
│   │   │   └── {feature}/
│   │   │       ├── components/
│   │   │       ├── services/
│   │   │       ├── models/
│   │   │       └── {feature}.routes.ts
│   │   │
│   │   ├── layout/                      # App shell
│   │   │   ├── main-layout/
│   │   │   │   └── main-layout.component.ts
│   │   │   ├── header/
│   │   │   │   └── header.component.ts
│   │   │   ├── sidebar/
│   │   │   │   └── sidebar.component.ts
│   │   │   └── breadcrumb/
│   │   │       └── breadcrumb.component.ts
│   │   │
│   │   ├── shared/                      # Reusable components
│   │   │   ├── components/
│   │   │   │   ├── confirm-dialog/
│   │   │   │   ├── loading-spinner/
│   │   │   │   ├── page-header/
│   │   │   │   ├── status-badge/
│   │   │   │   └── error-display/
│   │   │   ├── directives/
│   │   │   │   └── has-role.directive.ts
│   │   │   ├── pipes/
│   │   │   │   ├── date-format.pipe.ts
│   │   │   │   └── number-format.pipe.ts
│   │   │   └── validators/
│   │   │       └── custom-validators.ts
│   │   │
│   │   ├── app.ts                       # Root component
│   │   ├── app.config.ts                # provideRouter, provideHttp, MSAL...
│   │   ├── app.routes.ts                # Main routes
│   │   └── app.html / app.scss
│   │
│   ├── assets/
│   │   └── i18n/
│   │       └── {locale}.json            # Localization strings
│   ├── environments/
│   │   ├── environment.ts               # Dev
│   │   └── environment.production.ts    # Prod
│   ├── styles/
│   │   ├── _variables.scss              # Design tokens
│   │   ├── _theme.scss                  # Angular Material theme
│   │   ├── _mixins.scss
│   │   └── styles.scss                  # Global styles
│   └── main.ts                          # Bootstrap
│
├── angular.json
├── tsconfig.json                        # Path aliases: @app/*, @core/*, @shared/*...
├── jest.config.ts
├── proxy.conf.json                      # Dev proxy → localhost:3000
└── package.json
```

### 5.2 Key Frontend Patterns

#### 5.2.1 App Configuration (app.config.ts)

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimationsAsync(),
    provideClientHydration(),

    // Locale
    { provide: LOCALE_ID, useValue: 'ja-JP' },

    // MSAL
    { provide: MSAL_INSTANCE, useFactory: MSALInstanceFactory },
    { provide: MSAL_GUARD_CONFIG, useFactory: MSALGuardConfigFactory },
    { provide: MSAL_INTERCEPTOR_CONFIG, useFactory: MSALInterceptorConfigFactory },
    MsalService, MsalGuard, MsalBroadcastService,

    // Interceptors (order matters!)
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: AuthErrorInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: LoadingInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorHandlingInterceptor, multi: true },
  ],
};
```

#### 5.2.2 Routing Pattern (Lazy-loaded)

```typescript
// app.routes.ts
export const routes: Routes = [
  // Public routes (no layout)
  { path: 'login', component: LoginComponent },
  { path: 'auth-callback', component: CallbackComponent },

  // Protected routes (with layout)
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadChildren: () => import('./features/dashboard/dashboard.routes')
          .then(m => m.DASHBOARD_ROUTES),
        data: { breadcrumb: 'Dashboard' },
      },
      {
        path: 'master-data',
        loadChildren: () => import('./features/master-data/master-data.routes')
          .then(m => m.MASTER_DATA_ROUTES),
        data: { breadcrumb: 'Master Data' },
      },
      {
        path: 'admin',
        loadChildren: () => import('./features/admin/admin.routes')
          .then(m => m.ADMIN_ROUTES),
        canActivate: [roleGuard('admin')],
        data: { breadcrumb: 'Admin' },
      },
    ],
  },

  { path: '**', redirectTo: 'dashboard' },
];
```

#### 5.2.3 API Service Pattern

```typescript
// core/services/api.service.ts
@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  get<T>(path: string, params?: Record<string, any>): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${path}`, {
      params: this.buildParams(params),
    });
  }

  getPaginated<T>(path: string, params?: Record<string, any>): Observable<PaginatedResponse<T>> {
    return this.http.get<PaginatedResponse<T>>(`${this.baseUrl}/${path}`, {
      params: this.buildParams(params),
    });
  }

  post<T>(path: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/${path}`, body);
  }

  put<T>(path: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}/${path}`, body);
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}/${path}`);
  }

  private buildParams(params?: Record<string, any>): HttpParams {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }
    return httpParams;
  }
}
```

#### 5.2.4 Feature Service Pattern

```typescript
// features/master-data/products/services/product.service.ts
@Injectable({ providedIn: 'root' })
export class ProductService {
  constructor(private api: ApiService) {}

  getProducts(params?: ProductQueryParams): Observable<PaginatedResponse<Product>> {
    return this.api.getPaginated<Product>('products', params).pipe(
      timeout(30000),
      catchError(error => {
        console.error('Failed to fetch products:', error);
        return throwError(() => error);
      }),
    );
  }

  getProduct(id: number): Observable<Product> {
    return this.api.get<Product>(`products/${id}`);
  }

  createProduct(dto: CreateProductDto): Observable<Product> {
    return this.api.post<Product>('products', dto);
  }

  updateProduct(id: number, dto: UpdateProductDto): Observable<Product> {
    return this.api.put<Product>(`products/${id}`, dto);
  }

  deleteProduct(id: number): Observable<void> {
    return this.api.delete<void>(`products/${id}`);
  }
}
```

#### 5.2.5 Component Pattern (List with AG Grid)

```typescript
// features/master-data/products/product-list/product-list.component.ts
@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, AgGridModule, MatButtonModule, PageHeaderComponent],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss'],
})
export class ProductListComponent implements OnInit {
  private productService = inject(ProductService);
  private notification = inject(NotificationService);
  private dialog = inject(MatDialog);

  products: Product[] = [];
  totalCount = 0;
  loading = false;
  currentPage = 1;
  pageSize = 20;

  columnDefs: ColDef[] = [
    { headerName: 'Product Code', field: 'productCode', sortable: true, filter: true },
    { headerName: 'Product Name', field: 'productName', sortable: true, filter: true },
    { headerName: 'Category', field: 'category.name' },
    { headerName: 'Status', field: 'isActive', cellRenderer: StatusBadgeRenderer },
    {
      headerName: 'Actions',
      cellRenderer: ActionButtonsRenderer,
      cellRendererParams: {
        onEdit: (row: Product) => this.editProduct(row),
        onDelete: (row: Product) => this.confirmDelete(row),
      },
    },
  ];

  ngOnInit() {
    this.loadProducts();
  }

  loadProducts() {
    this.loading = true;
    this.productService.getProducts({
      page: this.currentPage,
      limit: this.pageSize,
    }).subscribe({
      next: (response) => {
        this.products = response.data;
        this.totalCount = response.meta.total;
        this.loading = false;
      },
      error: () => {
        this.notification.error('Failed to load products');
        this.loading = false;
      },
    });
  }

  confirmDelete(product: Product) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirm Deletion',
        message: `Are you sure you want to delete ${product.productName}?`,
      },
    });
    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) this.deleteProduct(product.id);
    });
  }
}
```

### 5.3 Styling & Theming

```scss
// styles/_variables.scss — Design Tokens
$color-primary: #1a237e;      // Indigo 900
$color-accent: #00796b;       // Teal 700
$color-warn: #c62828;         // Red 800
$color-success: #2e7d32;      // Green 800

$neutral-50: #f8fafc;
$neutral-100: #f1f5f9;
$neutral-200: #e2e8f0;
$neutral-700: #334155;
$neutral-800: #1e293b;
$neutral-900: #0f172a;

$spacing-unit: 4px;
$spacing-xs: $spacing-unit * 1;   // 4px
$spacing-sm: $spacing-unit * 2;   // 8px
$spacing-md: $spacing-unit * 4;   // 16px
$spacing-lg: $spacing-unit * 6;   // 24px
$spacing-xl: $spacing-unit * 8;   // 32px

$sidebar-width: 260px;
$sidebar-collapsed-width: 64px;
$header-height: 56px;

$shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
$shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);

$radius-sm: 6px;
$radius-md: 8px;
$radius-lg: 12px;

$font-family: 'Noto Sans JP', 'Roboto', sans-serif;
```

```scss
// styles/_theme.scss — Angular Material Theme
@use '@angular/material' as mat;

$primary: mat.m2-define-palette(mat.$m2-indigo-palette, 900);
$accent: mat.m2-define-palette(mat.$m2-teal-palette, 700);
$warn: mat.m2-define-palette(mat.$m2-red-palette, 800);

$theme: mat.m2-define-light-theme((
  color: (primary: $primary, accent: $accent, warn: $warn),
  typography: mat.m2-define-typography-config($font-family: $font-family),
  density: 0,
));

@include mat.all-component-themes($theme);
```

### 5.4 TypeScript Path Aliases

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@app/*": ["src/app/*"],
      "@core/*": ["src/app/core/*"],
      "@shared/*": ["src/app/shared/*"],
      "@features/*": ["src/app/features/*"],
      "@env/*": ["src/environments/*"]
    }
  }
}
```

---

## 6. Database — SQL Server with TypeORM

### 6.1 Database Design Rules

| Rule | Explanation |
|------|-------------|
| **snake_case** for everything | Tables, columns, constraints |
| **Plural table names** | `products`, `sales_orders` |
| **PK is always `id`** | INT IDENTITY or UUID |
| **FK format:** `{singular}_id` | `product_id`, `category_id` |
| **Soft delete:** `is_active BIT` | No physical deletion of data |
| **Audit columns** | `created_at`, `updated_at`, `created_by`, `updated_by` |
| **NVARCHAR for text** | Unicode support (CJK, accented chars, etc.) |
| **DATETIME2(7) UTC** | Store UTC, display in local time |
| **Indexes on FKs** | Every FK needs an index |
| **No ORM sync in production** | Use migrations only |

### 6.2 Migration Workflow

```bash
# 1. Modify the entity
# 2. Generate migration
npx typeorm migration:generate -d typeorm.config.ts migrations/AddProductCategory

# 3. Review the migration file
# 4. Run migration
npx typeorm migration:run -d typeorm.config.ts

# 5. Rollback if needed
npx typeorm migration:revert -d typeorm.config.ts
```

### 6.3 Seed Data Pattern

```typescript
// tools/seed.ts
async function seed() {
  const dataSource = new DataSource(typeormConfig);
  await dataSource.initialize();

  // 1. Seed master data (order matters for FK dependencies)
  await seedFactories(dataSource);
  await seedProductCategories(dataSource);
  await seedProcessStages(dataSource);
  await seedProducts(dataSource);

  // 2. Use upsert pattern to be idempotent
  await dataSource.getRepository(FactoryEntity).upsert(
    [
      { id: 1, factoryName: 'Main Factory', factoryCode: 'F001' },
      { id: 2, factoryName: 'Sub Factory', factoryCode: 'F002' },
    ],
    ['id'],
  );

  await dataSource.destroy();
}
```

---

## 7. Infrastructure — Docker, Redis, RabbitMQ

### 7.1 Docker Compose

```yaml
# docker/docker-compose.yml
version: '3.8'

services:
  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    ports:
      - "1433:1433"
    environment:
      ACCEPT_EULA: "Y"
      SA_PASSWORD: "YourStrong!Passw0rd"
      MSSQL_COLLATION: "Japanese_CI_AS"  # Change based on language requirements
    volumes:
      - sqlserver_data:/var/opt/mssql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "5672:5672"    # AMQP
      - "15672:15672"  # Management UI
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: admin123
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

volumes:
  sqlserver_data:
  redis_data:
  rabbitmq_data:
```

### 7.2 Environment Variables Template

```env
# .env.example

# ─── Database ───
DB_HOST=localhost
DB_PORT=1433
DB_USERNAME=sa
DB_PASSWORD=YourStrong!Passw0rd
DB_NAME=your_database_name

# ─── Redis ───
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TTL=300

# ─── RabbitMQ ───
RABBITMQ_URL=amqp://admin:admin123@localhost:5672

# ─── Azure AD ───
AZURE_AD_TENANT_ID=your-tenant-id
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_CLIENT_SECRET=your-secret
AZURE_AD_REDIRECT_URI=http://localhost:3000/api/v1/auth/callback

# ─── JWT ───
JWT_SECRET=your-jwt-secret
JWT_EXPIRATION=3600
JWT_REFRESH_EXPIRATION=86400

# ─── Service Ports ───
API_GATEWAY_PORT=3000
AUTH_SERVICE_PORT=3001
MASTER_DATA_SERVICE_PORT=3002
# ... (3003-3010)

# ─── Logging ───
LOG_LEVEL=debug
NODE_ENV=development
```

---

## 8. Authentication & Authorization

### 8.1 Auth Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Frontend │    │ Azure AD │    │ API GW   │    │ Auth Svc │
└────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │               │
     │──── Login ───>│               │               │
     │<── Token ─────│               │               │
     │               │               │               │
     │─── API Call (Bearer token) ──>│               │
     │               │               │── Validate ──>│
     │               │               │    JWT        │
     │               │               │<── User ──────│
     │               │               │               │
     │               │               │── JIT Create ─│ (first login)
     │               │               │               │
     │<── Response ──────────────────│               │
```

### 8.2 Backend JWT Strategy

```typescript
// apps/api-gateway/src/app/strategies/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksUri: `https://login.microsoftonline.com/${configService.get('AZURE_AD_TENANT_ID')}/discovery/v2.0/keys`,
      }),
      audience: [
        `api://${configService.get('AZURE_AD_CLIENT_ID')}`,
        configService.get('AZURE_AD_CLIENT_ID'),
      ],
      issuer: [
        `https://login.microsoftonline.com/${configService.get('AZURE_AD_TENANT_ID')}/v2.0`,
        `https://sts.windows.net/${configService.get('AZURE_AD_TENANT_ID')}/`,
      ],
      algorithms: ['RS256'],
    });
  }

  async validate(payload: any): Promise<CurrentUser> {
    // Auto-provision user on first login (JIT)
    const user = await this.findOrCreateUser(payload);
    return {
      id: user.id,
      email: payload.preferred_username || payload.email,
      displayName: payload.name,
      role: user.role,
      azureAdOid: payload.oid,
    };
  }
}
```

### 8.3 Frontend MSAL Integration

```typescript
// core/auth/msal.config.ts
export function MSALInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication({
    auth: {
      clientId: environment.msalConfig.auth.clientId,
      authority: environment.msalConfig.auth.authority,
      redirectUri: environment.msalConfig.auth.redirectUri,
    },
    cache: {
      cacheLocation: 'localStorage',
      storeAuthStateInCookie: false,
    },
  });
}

export function MSALInterceptorConfigFactory(): MsalInterceptorConfiguration {
  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap: new Map([
      [`${environment.apiBaseUrl}/*`, environment.msalConfig.scopes],
    ]),
  };
}
```

### 8.4 Role-Based Access Control

```typescript
// Shared enum
export enum UserRole {
  Admin = 'admin',
  Manager = 'manager',
  Planner = 'planner',
  Operator = 'operator',
  Viewer = 'viewer',
}

// Backend — Controller
@Post()
@Roles(UserRole.Admin, UserRole.Planner)
async createProduct(@Body() dto: CreateProductDto) { ... }

// Frontend — Template
<button *appHasRole="['admin', 'planner']">Create Product</button>

// Frontend — Route Guard
{ path: 'admin', canActivate: [roleGuard('admin')] }
```

---

## 9. Naming Conventions

### 9.1 Complete Reference

| Context | Convention | Example |
|---------|-----------|---------|
| **DB Table** | snake_case, plural | `sales_orders` |
| **DB Column** | snake_case | `product_name`, `created_at` |
| **DB PK** | `id` | `id INT IDENTITY` |
| **DB FK** | `{singular}_id` | `product_id`, `factory_id` |
| **DB Index** | `IX_{table}_{col}` | `IX_products_category_id` |
| **DB Unique** | `UX_{table}_{col}` | `UX_products_product_code` |
| **API URL** | kebab-case | `/api/v1/production-plans` |
| **JSON property** | camelCase | `{ "productName": "..." }` |
| **TS File** | kebab-case + suffix | `product.service.ts` |
| **TS Class** | PascalCase + suffix | `ProductService` |
| **TS Property** | camelCase | `productName` |
| **TS Constant** | UPPER_SNAKE | `MAX_RETRY_COUNT` |
| **TS Enum** | PascalCase | `UserRole.Admin` |
| **Angular Component** | kebab-case selector | `app-product-list` |
| **RabbitMQ Queue** | snake_case | `master_data_queue` |
| **RabbitMQ Pattern** | dot.notation | `master_data.get_products` |
| **Event Name** | dot.notation | `product.created` |
| **Cache Key** | colon:notation | `product:123` |
| **Git Branch** | `type/description` | `feature/product-crud` |
| **Git Commit** | Conventional | `feat(product): add CRUD` |

---

## 10. API Design Standards

### 10.1 URL Structure

```
/api/v{version}/{service-domain}/{resource}
/api/v{version}/{service-domain}/{resource}/{id}
/api/v{version}/{service-domain}/{resource}/{id}/{sub-resource}
```

**Examples:**
```
GET    /api/v1/products                    # List
GET    /api/v1/products/123                # Get one
POST   /api/v1/products                    # Create
PUT    /api/v1/products/123                # Update
DELETE /api/v1/products/123                # Delete
GET    /api/v1/products/123/bom-items      # Sub-resource
POST   /api/v1/products/search             # Complex search
POST   /api/v1/production-plans/generate   # Action (exception)
```

### 10.2 Standard Response Formats

**Success (single item):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "productCode": "PRD-001",
    "productName": "Product A",
    "createdAt": "2026-03-20T09:00:00.000Z"
  },
  "timestamp": "2026-03-20T09:00:00.123Z"
}
```

**Success (paginated list):**
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2026-03-20T09:00:00.123Z"
}
```

**Error:**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "error": "BadRequest",
  "errors": [
    "productCode is required",
    "productName must be at most 200 characters"
  ],
  "path": "/api/v1/products",
  "method": "POST",
  "timestamp": "2026-03-20T09:00:00.123Z",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 10.3 Query Parameters Convention

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |
| `search` | string | - | Full-text search |
| `sortBy` | string | createdAt | Sort column |
| `sortOrder` | string | DESC | ASC or DESC |
| `{field}` | varies | - | Filter by exact value |
| `{field}From` | date | - | Range filter (start) |
| `{field}To` | date | - | Range filter (end) |

---

## 11. State Management & Data Flow

### 11.1 Frontend Data Flow

```
Component ──(call)──> Feature Service ──(HTTP)──> API Service ──(Bearer JWT)──> Backend
    ▲                       │
    │                       │
    └──── Observable ───────┘
         (subscribe)
```

### 11.2 Backend Data Flow

```
API Gateway Controller
    │ (RabbitMQ send)
    ▼
Microservice Controller (@MessagePattern)
    │
    ▼
Service Layer
    ├── Check Redis Cache
    ├── Query Database (TypeORM)
    ├── Business Logic
    ├── Update Cache
    ├── Publish Events (RabbitMQ emit)
    └── Return Result
```

### 11.3 Event-Driven Communication

```
Production Service                          Inventory Service
    │                                           │
    │── emit('plan.confirmed', planData) ──────>│
    │                                           │── Calculate daily inventory
    │                                           │── Update cache
    │                                           │── emit('inventory.calculated')
    │                                           │
    │                                     BOM Service
    │                                           │
    │── emit('plan.confirmed', planData) ──────>│
    │                                           │── Calculate MRP
    │                                           │── Generate purchase orders
```

---

## 12. Caching Strategy

### 12.1 Cache Layers

| Layer | What | TTL | Invalidation |
|-------|------|-----|-------------|
| **Redis** | API responses, computed data | 1-60 min | On write + event |
| **Browser** | Static assets | Long (hashed filenames) | Deploy |
| **Service** | Reference data (factories, categories) | 1 hour | Manual/event |

### 12.2 Cache Key Pattern

```typescript
// Constants
const CACHE_KEYS = {
  // List cache
  PRODUCTS: 'products',
  CATEGORIES: 'categories',

  // Item cache
  PRODUCT_BY_ID: (id: number) => `product:${id}`,
  USER_BY_ID: (id: number) => `user:${id}`,

  // Computed cache
  DAILY_INVENTORY: (date: string, factoryId: number) => `inventory:${factoryId}:${date}`,

  // Session cache
  USER_SESSION: (userId: number) => `session:${userId}`,
};

const CACHE_TTL = {
  SHORT: 60,          // 1 minute — volatile data
  MEDIUM: 300,        // 5 minutes — standard queries
  LONG: 3600,         // 1 hour — reference data
  EXTRA_LONG: 86400,  // 24 hours — rarely changing data
};
```

### 12.3 Cache Pattern Implementation

```typescript
// Read-through cache pattern
async getProduct(id: number): Promise<Product> {
  // 1. Try cache
  const cached = await this.redis.get(CACHE_KEYS.PRODUCT_BY_ID(id));
  if (cached) return JSON.parse(cached);

  // 2. Fetch from DB
  const product = await this.productRepo.findOneBy({ id });
  if (!product) throw new NotFoundException();

  // 3. Populate cache
  await this.redis.set(
    CACHE_KEYS.PRODUCT_BY_ID(id),
    JSON.stringify(product),
    'EX', CACHE_TTL.MEDIUM,
  );

  return product;
}

// Write-through invalidation
async updateProduct(id: number, dto: UpdateDto): Promise<Product> {
  const product = await this.productRepo.save({ id, ...dto });

  // Invalidate related caches
  await Promise.all([
    this.redis.del(CACHE_KEYS.PRODUCT_BY_ID(id)),
    this.redis.del(CACHE_KEYS.PRODUCTS), // list cache
  ]);

  return product;
}
```

---

## 13. Error Handling

### 13.1 Backend — Global Exception Filter

```typescript
// libs/shared/src/filters/global-exception.filter.ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let statusCode = 500;
    let message = 'Internal server error';
    let errors: string[] = [];

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exResponse = exception.getResponse();
      message = typeof exResponse === 'string' ? exResponse : (exResponse as any).message;
      if (Array.isArray(message)) {
        errors = message;
        message = 'Validation failed';
      }
    }

    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      error: HttpStatus[statusCode],
      errors,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      correlationId: request.headers['x-correlation-id'],
    });
  }
}
```

### 13.2 Frontend — Error Interceptor

```typescript
// core/interceptors/error-handling.interceptor.ts
@Injectable()
export class ErrorHandlingInterceptor implements HttpInterceptor {
  constructor(private notification: NotificationService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 0) {
          this.notification.error('Unable to connect to server');
        } else if (error.status === 403) {
          this.notification.error('You do not have permission to access this resource');
        } else if (error.status >= 500) {
          this.notification.error('A server error occurred');
        } else {
          const message = error.error?.message || 'An error occurred';
          this.notification.error(message);
        }
        return throwError(() => error);
      }),
    );
  }
}
```

---

## 14. Testing Strategy

### 14.1 Backend Testing

```typescript
// {service}.spec.ts — Unit test pattern
describe('ProductService', () => {
  let service: ProductService;
  let repository: Repository<ProductEntity>;
  let cacheService: RedisCacheService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: getRepositoryToken(ProductEntity),
          useValue: {
            findOneBy: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
            }),
          },
        },
        {
          provide: RedisCacheService,
          useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(ProductService);
    repository = module.get(getRepositoryToken(ProductEntity));
    cacheService = module.get(RedisCacheService);
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      const mockProducts = [{ id: 1, productName: 'Test' }];
      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      // ... setup mocks
      const result = await service.findAll({ page: 1, limit: 20 });
      expect(result.meta.total).toBe(1);
    });

    it('should return cached data if available', async () => {
      const cached = { data: [], meta: { total: 0 } };
      jest.spyOn(cacheService, 'get').mockResolvedValue(cached);
      const result = await service.findAll({ page: 1, limit: 20 });
      expect(repository.createQueryBuilder).not.toHaveBeenCalled();
    });
  });
});
```

### 14.2 Frontend Testing

```typescript
// {component}.spec.ts — Component test pattern
describe('ProductListComponent', () => {
  let component: ProductListComponent;
  let fixture: ComponentFixture<ProductListComponent>;
  let productService: jest.Mocked<ProductService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductListComponent],
      providers: [
        {
          provide: ProductService,
          useValue: {
            getProducts: jest.fn().mockReturnValue(of({
              data: [{ id: 1, productName: 'Test' }],
              meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
            })),
          },
        },
        { provide: NotificationService, useValue: { error: jest.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load products on init', () => {
    expect(component.products.length).toBe(1);
  });
});
```

### 14.3 Test Commands

```bash
# Backend
npm run test                           # All backend tests
npx nx test api-gateway                # Single service
npx nx test master-data-service        # Single service

# Frontend
npm test                               # All frontend tests
npm test -- --testPathPattern=product  # Filter by pattern
npm run test:watch                     # Watch mode
```

---

## 15. Phase-Based Development Workflow

### 15.1 Why Split into Phases?

Each phase is a **complete unit of work** that AI can execute independently. Splitting into phases helps:
- Prevents AI context overload
- Easy to review and test each part
- Simple rollback if errors occur
- Ensures dependencies are satisfied in order

### 15.2 Backend Phases (Recommended)

| Phase | Name | Content | Dependencies |
|-------|------|---------|-------------|
| 01 | **Foundation** | Nx setup, Docker, DB connection, shared libs, migrations | None |
| 02 | **Auth** | Azure AD, JWT, roles, guards, user CRUD | Phase 01 |
| 03 | **Master Data** | Products, categories, factories, calendars CRUD | Phase 01, 02 |
| 04 | **Core Business 1** | Domain-specific business logic (e.g., Sales Import) | Phase 01-03 |
| 05 | **Core Business 2** | Main business logic (e.g., Production Planning) | Phase 01-04 |
| 06 | **Core Business 3** | Extended business logic (e.g., BOM/MRP) | Phase 01-05 |
| 07 | **Supporting 1** | Supporting features (e.g., Inventory) | Phase 01-06 |
| 08 | **Supporting 2** | More supporting features (e.g., Subcontractor) | Phase 01-06 |
| 09 | **Supporting 3** | Additional features (e.g., Scheduling) | Phase 01-06 |
| 10 | **Reporting** | Reports, exports, dashboards | Phase 01-09 |

### 15.3 Frontend Phases (Recommended)

| Phase | Name | Content | Dependencies |
|-------|------|---------|-------------|
| 01 | **Setup** | Angular project, dependencies, config, proxy | None |
| 02 | **Auth** | MSAL, login/logout, interceptors, guards | Phase 01 |
| 03 | **Layout** | App shell — header, sidebar, breadcrumb, routing | Phase 01, 02 |
| 04 | **Dashboard** | KPI cards, charts, overview | Phase 01-03 |
| 05 | **Master Data** | CRUD screens for master data | Phase 01-03 |
| 06 | **Core Feature** | Main business feature screens | Phase 01-03 |
| 07 | **Supporting** | Supporting feature screens | Phase 01-03 |
| 08 | **Reports** | Report screens, export | Phase 01-03 |

### 15.4 Phase README Template

Each phase requires a `README.md` with the following structure:

```markdown
# Phase XX — {Phase Name}

## Objective
Brief description of what this phase accomplishes.

## Prerequisites
- Phase 01 completed
- Docker infrastructure running

## Tasks

### Task 1: {Task Name}
**File:** `path/to/file.ts`
**Description:** Detailed description of what needs to be implemented.

```typescript
// Sample code or pseudo-code
```

### Task 2: {Task Name}
...

## Verification
- [ ] Unit tests pass
- [ ] API endpoint works
- [ ] Swagger docs updated

## New Files Created
- `apps/service/src/feature/feature.module.ts`
- `apps/service/src/feature/feature.service.ts`
- ...

## Modified Files
- `apps/service/src/app/app.module.ts` — added FeatureModule import
```

---

## 16. CLAUDE.md — AI Assistant Guide

### 16.1 CLAUDE.md Template

This is the most critical file — it gives AI everything it needs to work effectively:

```markdown
# CLAUDE.md

## Project Overview
{Brief project description — 2-3 sentences}

## Repository Layout
```
{Main directory tree}
```

## Common Commands

### Backend
```bash
npm run dev          # Start dev server
npm run test         # Run tests
npm run build        # Build
npm run db:migrate   # Run migrations
npm run db:seed      # Seed database
npm run infra:up     # Start Docker services
```

### Frontend
```bash
npm start            # Dev server (port 4200)
npm test             # Tests
npm run build:prod   # Production build
```

## Architecture

### Backend
{Backend architecture description — monorepo, microservices, message broker}

### Frontend
{Frontend architecture description — framework, state management, UI library}

### Database
{Database description — ORM, collation, conventions}

### Infrastructure
{Docker, cache, message broker description}

### Auth Flow
{Authentication flow description}

## Key Conventions
{Reference to conventions.md, list critical points}

## Testing
{Framework, commands, patterns}

## Important Notes
- {Directories/files that must NOT be modified}
- {Design docs to read before making changes}
- {Phase guides for implementation}
```

---

## 17. New Project Initialization Checklist

### Phase 0 — Prepare Documentation

- [ ] Write `PROJECT_REQUIREMENTS.md` — overall requirements
- [ ] Write `01-system-design/shared/conventions.md` — conventions
- [ ] Write `01-system-design/backend/database-schema.md` — complete DB schema
- [ ] Write `01-system-design/backend/api-endpoints.md` — full API specification
- [ ] Write `01-system-design/backend/microservices.md` — microservices architecture
- [ ] Write `01-system-design/backend/caching-strategy.md` — caching strategy
- [ ] Write `01-system-design/backend/message-broker.md` — event architecture
- [ ] Write `01-system-design/frontend/angular-architecture.md` — frontend architecture
- [ ] Write `01-system-design/frontend/routing.md` — route configuration
- [ ] Write `01-system-design/frontend/screen-inventory.md` — UI screen list

### Phase 0.5 — Prepare Implementation Guides

- [ ] Write `02-backend/phase-01-foundation/README.md`
- [ ] Write `02-backend/phase-02-auth/README.md`
- [ ] Write `02-backend/phase-03-master-data/README.md`
- [ ] Write remaining backend phases
- [ ] Write `03-frontend/phase-01-setup/README.md`
- [ ] Write `03-frontend/phase-02-auth/README.md`
- [ ] Write remaining frontend phases
- [ ] Write `CLAUDE.md` — consolidated AI guide

### Phase 1+ — Instruct AI to Implement

For each phase:
1. Open CLAUDE.md so AI understands the context
2. Direct AI to read relevant design docs
3. Direct AI to read the phase README
4. Instruct: "Implement Phase XX following the guide in `02-backend/phase-XX/README.md`"
5. Review the generated code
6. Run tests
7. Commit and move to the next phase

---

## Appendix A — Sample Prompts for AI

### Initializing a New Project

```
Read the CLAUDE.md file and design documents in 01-system-design/.
Then implement Phase 01 Foundation following the guide in 02-backend/phase-01-foundation/README.md.

Specifically:
1. Create an Nx monorepo with NestJS
2. Set up Docker Compose (SQL Server, Redis, RabbitMQ)
3. Create the shared library with entities, DTOs, guards, interceptors
4. Create the API Gateway app
5. Set up TypeORM migrations
6. Create the database seed script
```

### Adding a New Feature

```
Read conventions.md and database-schema.md.
Add the {feature_name} feature with the following requirements:
1. Entity: {DB table description}
2. API endpoints: {list of endpoints}
3. Service logic: {business logic description}
4. Frontend screens: {UI description}

Follow the existing patterns in the codebase.
```

### Fixing a Bug

```
Read the file {path/to/file} and find the bug: {bug description}.
Expected behavior: {expected}.
Actual behavior: {actual}.
Fix the bug and write a unit test for this case.
```

---

## Appendix B — Important Notes

### Golden Rules for Working with AI

1. **Design FIRST, code SECOND** — Write complete design docs before having AI write code
2. **Break work into small pieces** — Each phase is one prompt; don't bundle too much
3. **CLAUDE.md is mandatory** — This file gives AI context from the start
4. **Conventions must be consistent** — Once a convention is chosen, stick with it
5. **Review all output** — AI is not perfect; always review generated code
6. **Test-driven** — Require AI to write tests alongside code
7. **Incremental** — Build small parts, test, then continue
8. **Read before modifying** — Always require AI to read existing code before making changes

### Anti-Patterns to Avoid

- Do not ask AI to implement the entire project in a single prompt
- Do not skip design docs and only provide vague descriptions
- Do not omit the CLAUDE.md file
- Do not change conventions midway through the project
- Do not skip reviewing AI-generated code
- Do not skip tests
- Do not implement without phases, in a random order
- Do not let AI decide architecture without providing guidelines

---

> **In summary:** The success of using AI to build projects lies in the quality of design documentation. Investing time in `01-system-design/` and `CLAUDE.md` makes AI 10x more effective compared to verbal descriptions alone.
