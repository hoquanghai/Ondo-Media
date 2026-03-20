# Database Skill

## Trigger
When user asks to modify database schema, query data, or fix data issues.

## Architecture
- **DR database**: `[DR].[dbo].[shainList]` — master user table (read/update only, no DDL changes)
- **internal_social database**: All social tables (posts, comments, likes, etc.)
- **Cross-database**: No FK constraints between DR and internal_social
- **ORM**: TypeORM with SQL Server (mssql driver)

## Conventions
- Tables: snake_case, plural (posts, likes, comments)
- Columns: snake_case (user_id, created_at)
- PK: `id UNIQUEIDENTIFIER DEFAULT NEWID()` for social tables
- PK: `shainBangou INT` for shainList (existing)
- FK to users: `user_id INT` (no FK constraint, just application-level reference)
- Soft delete: `is_deleted BIT DEFAULT 0`
- Timestamps: `created_at DATETIME2`, `updated_at DATETIME2`
- Collation: Japanese_CI_AS

## SQL Execution
```bash
# Via Docker
docker cp script.sql social_sqlserver:/tmp/script.sql
MSYS_NO_PATHCONV=1 docker exec social_sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "YourStrong!Passw0rd" -C -b -i /tmp/script.sql

# For queries with filtered indexes
# Must use SQL file with SET QUOTED_IDENTIFIER ON; GO
```

## TypeORM Entity Rules
- User entity: `@Entity('shainList', { database: 'DR', schema: 'dbo' })`
- Use `@Column({ name: 'column_name' })` for explicit mapping
- Use `update()` not `save()` for shainList (avoids cross-DB issues)
- Use `JSON.parse(JSON.stringify(entity))` before spread to copy relations

## Migration
- File: `libs/database/src/migrations/{timestamp}-{Name}.ts`
- Run: `npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:run -d libs/database/src/data-source.ts`
- Revert: same with `migration:revert`
