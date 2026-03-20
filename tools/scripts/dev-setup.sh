#!/bin/bash
# Dev environment setup script

echo "=== 日報 Development Setup ==="

# 1. Start Docker containers
echo "Starting Docker containers..."
cd source/backend
docker compose up -d

# 2. Wait for SQL Server
echo "Waiting for SQL Server..."
for i in $(seq 1 30); do
  MSYS_NO_PATHCONV=1 docker exec social_sqlserver /opt/mssql-tools18/bin/sqlcmd \
    -S localhost -U sa -P "YourStrong!Passw0rd" -Q "SELECT 1" -C -b 2>/dev/null && break
  sleep 2
done

# 3. Create database if not exists
echo "Creating database..."
MSYS_NO_PATHCONV=1 docker exec social_sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "YourStrong!Passw0rd" -C -b \
  -Q "IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'internal_social') CREATE DATABASE internal_social COLLATE Japanese_CI_AS"

# 4. Run migrations
echo "Running migrations..."
npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:run -d libs/database/src/data-source.ts

# 5. Setup MinIO bucket
echo "Setting up MinIO..."
docker exec social_minio mc alias set local http://localhost:9000 minioadmin minioadmin 2>/dev/null
docker exec social_minio mc mb --ignore-existing local/social-uploads 2>/dev/null
docker exec social_minio mc anonymous set download local/social-uploads/avatars 2>/dev/null
docker exec social_minio mc anonymous set download local/social-uploads/posts 2>/dev/null

# 6. Copy .env if not exists
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

cd ../frontend
if [ ! -f .env.local ]; then
  cp .env.local.example .env.local
  echo "Created .env.local from .env.local.example"
fi

echo ""
echo "=== Setup Complete ==="
echo "Backend: cd source/backend && npm run dev:all"
echo "Frontend: cd source/frontend && npm run dev"
echo "Access: http://localhost:3001"
