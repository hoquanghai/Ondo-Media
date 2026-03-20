#!/bin/bash
# Reset internal_social database (drop all tables, re-run migrations)

echo "=== Resetting Database ==="

cd source/backend

# Drop all tables
MSYS_NO_PATHCONV=1 docker exec social_sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "YourStrong!Passw0rd" -d internal_social -C -b -Q "
EXEC sp_MSforeachtable @command1 = 'ALTER TABLE ? NOCHECK CONSTRAINT ALL';
EXEC sp_MSforeachtable @command1 = 'DROP TABLE ?';
"

# Re-run migrations
npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:run -d libs/database/src/data-source.ts

echo "Database reset complete"
