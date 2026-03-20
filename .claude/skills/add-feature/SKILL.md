# Add Feature Skill

## Trigger
When user asks to add a new feature or functionality.

## Process

### 1. Understand Requirements
- Ask clarifying questions if requirements are unclear
- Check `docs/features/` for existing spec
- If no spec exists, create one first

### 2. Create Feature Spec (if not exists)
```
docs/features/{feature-name}/
├── spec.md      # Requirements, user stories, edge cases
├── api.md       # API endpoints
├── database.md  # Schema changes
└── ui.md        # UI wireframes
```

### 3. Backend Implementation
Order: Entity → Migration → Service → Controller → Gateway

1. **Entity** (`libs/database/src/entities/`)
   - Use `@Column({ name: 'snake_case' })` mapping
   - PK: `@PrimaryGeneratedColumn('uuid')` for new tables
   - FK to users: `user_id INT` (references shainBangou, no FK constraint)

2. **Migration** (`libs/database/src/migrations/`)
   - Timestamp-named file
   - Include indexes, constraints
   - Include `down()` for rollback

3. **Service** (`apps/{service}/src/`)
   - Use `userRepo.update()` not `.save()` for shainList
   - Publish Redis events for realtime updates
   - Return enriched data with author info

4. **Controller** (`apps/{service}/src/`)
   - `@MessagePattern` for TCP handlers
   - `@Payload()` decorator for data

5. **Gateway Controller** (`apps/api-gateway/src/`)
   - REST endpoints with Swagger decorators
   - `@CurrentUser()` for auth
   - `@Public()` for unauthenticated endpoints
   - Parse INT ports from config

### 4. Frontend Implementation
Order: Types → API → Store → Components → Page

1. **Types** (`src/types/`)
2. **API Service** (`src/lib/`)
3. **Zustand Store** (`src/stores/`)
4. **Components** (`src/components/`)
5. **Page** (`src/app/(main)/`)

### 5. Testing
- Test API with curl
- Verify TypeScript compiles (`npx tsc --noEmit`)
- Test responsive design

### 6. Documentation Update
- Update `docs/features/{feature}/status.md` → completed
- Update `CLAUDE.md` if architecture changed

## Project-Specific Rules
- All UI text in Japanese
- User avatar: `snsAvatarUrl || CDN/{lastNumber}.jpg || legacy avatar`
- Login by `lastNumber` (社員番号), not `shainBangou`
- DB: `internal_social` for social tables, `DR` for shainList
- Microservice ports: 3011-3017
- Frontend port: 3001, API Gateway: 3000
