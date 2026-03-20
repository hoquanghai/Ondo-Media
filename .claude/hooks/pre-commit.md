# Pre-Commit Hook Rules

## Before committing, always verify:

### 1. TypeScript Compilation
```bash
cd source/backend && npx tsc --noEmit
cd source/frontend && npx tsc --noEmit
```

### 2. No Secrets
- No passwords in code (check .env, not .env.example)
- No JWT secrets
- No API keys

### 3. Field Name Consistency
- Backend response field names match frontend TypeScript interfaces
- `isLikedByMe` not `isLiked`
- `totalLikesReceived` not `likesReceived`
- `lastNumber` for 社員番号 display
- `shainBangou` for internal PK

### 4. Japanese Text
- All user-facing strings in Japanese
- App name: 日報
- Company: 音頭金属株式会社

### 5. No .env files committed
- Only `.env.example` and `.env.local.example`
