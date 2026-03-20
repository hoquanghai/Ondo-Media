# Code Review Skill

## Trigger
When user asks to review code, PR, or changes.

## Process

### 1. Scope Analysis
- Identify changed files and their purpose
- Check if changes span backend, frontend, or both

### 2. Backend Review Checklist
- [ ] TypeORM entities: correct column mapping (`@Column({ name: 'snake_case' })`)
- [ ] Cross-database queries: User entity in DR, others in internal_social
- [ ] `userRepo.update()` not `userRepo.save()` for shainList (cross-DB entity)
- [ ] Port numbers: microservices use 3011-3017, not 3001-3007
- [ ] `parseInt()` for all `ConfigService.get` port values
- [ ] API response uses `PaginatedResponseDto.from()` with `meta` wrapper
- [ ] Events published via Redis Pub/Sub with enriched payloads
- [ ] No hardcoded credentials or secrets

### 3. Frontend Review Checklist
- [ ] `"use client"` directive on components using hooks/state
- [ ] Zustand persist hydration handled (no SSR mismatch)
- [ ] All UI text in Japanese (日本語)
- [ ] Responsive design: PC (lg+), Tablet (md), Mobile (<md)
- [ ] UserAvatar uses `snsAvatarUrl || avatar` priority
- [ ] User fields: `shainBangou` (PK), `lastNumber` (社員番号), `shainName` (display)
- [ ] API client unwraps `result.data` from `ApiResponse` wrapper
- [ ] Paginated responses use `data.meta.totalPages` not `data.totalPages`

### 4. Security Check
- [ ] No SQL injection (parameterized queries)
- [ ] JWT validation on protected routes
- [ ] Permission checks via `@RequirePermissions` or `PermissionsGuard`
- [ ] File upload: type validation, size limits

### 5. Output Format
```markdown
## Code Review Summary

### ✅ Good
- ...

### ⚠️ Suggestions
- ...

### ❌ Issues (must fix)
- ...
```
