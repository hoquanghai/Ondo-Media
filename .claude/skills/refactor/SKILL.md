# Refactor Skill

## Trigger
When user asks to refactor, optimize, or clean up code.

## Process

### 1. Assess Scope
- Identify files to refactor
- Check for dependencies (what imports this?)
- Estimate impact: isolated change vs cross-cutting

### 2. Refactoring Rules

#### Backend
- Extract repeated DB queries into service methods
- Use `update()` not `save()` for partial updates (especially shainList)
- Replace `increment`/`decrement` with `count()` for denormalized fields
- Consolidate duplicate event publishing patterns
- Use shared DTOs from `@app/common`

#### Frontend
- Extract repeated UI patterns into shared components
- Move inline API calls to dedicated API services (`src/lib/`)
- Consolidate Zustand store actions that do similar things
- Replace `any` types with proper interfaces
- Remove unused imports and dead code

### 3. Safety Checks
- TypeScript must compile (`npx tsc --noEmit`)
- Test affected features manually
- Don't change public API contracts (field names, endpoints)
- Don't refactor and add features in the same change

### 4. Naming Conventions (from conventions.md)
- DB: snake_case columns, camelCase entity properties
- API: kebab-case URLs, camelCase JSON
- Files: kebab-case + suffix (.service.ts, .controller.ts)
- Classes: PascalCase + suffix (PostService, CreatePostDto)
- Constants: UPPER_SNAKE_CASE
