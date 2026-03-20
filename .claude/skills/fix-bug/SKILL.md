# Fix Bug Skill

## Trigger
When user reports a bug, error, or unexpected behavior.

## Process

### 1. Reproduce & Identify
- Read the error message carefully
- Identify: frontend error (React/Next.js) or backend error (NestJS/API)
- Check browser console for frontend errors
- Test API directly with curl for backend errors

### 2. Common Bug Patterns in This Project

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| 500 Internal Error on API | Post-service QueryBuilder uses wrong column names | Use camelCase property names in QueryBuilder |
| `Cannot read properties of undefined` | Missing null check on nested objects | Add `?.` optional chaining or `?? default` |
| White screen after login | Zustand persist hydration race condition | Use `useSyncExternalStore` for hydration check |
| Avatar not showing | `snsAvatarUrl` or `avatar` field empty in persisted state | Re-login to refresh, check CDN URL |
| Like count wrong | Denormalized count drifted from actual | Use `likeRepo.count()` instead of increment/decrement |
| `port must be of type number` | `ConfigService.get<number>` returns string | Use `parseInt(config.get<string>(...), 10)` |
| Route `/api/v1/api/v1/...` doubled | Controller has `api/v1` prefix + globalPrefix | Remove prefix from controller |
| `userRepo.save()` fails | Cross-database entity (DR.dbo.shainList) | Use `userRepo.update()` instead |
| Field undefined in response | Backend field name ≠ frontend type field name | Check API response vs TypeScript interface |
| `isLikedByMe` lost after reload | Backend returns `isLiked` not `isLikedByMe` | Align field names between backend and frontend |

### 3. Debug Steps
1. **API error**: `curl -s -X GET/POST URL -H "Authorization: Bearer $TOKEN"`
2. **Frontend state**: Open `/debug` page to inspect auth store
3. **Database**: Query SQL Server via `docker exec social_sqlserver`
4. **TypeScript**: `npx tsc --noEmit` to check compilation

### 4. Fix & Verify
- Make minimal change to fix the bug
- Don't refactor surrounding code
- Test the fix with curl or browser
- Check TypeScript compiles

### 5. Document
- Note the bug pattern for future reference
- If systemic, add to code-review checklist
