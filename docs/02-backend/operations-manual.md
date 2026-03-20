# Operations Manual

This document covers day-to-day operations for the Internal Social Network backend: infrastructure management, database migrations, seeding, troubleshooting, backup, and monitoring.

---

## Table of Contents

1. [Docker Compose Commands](#docker-compose-commands)
2. [Database Migration Commands](#database-migration-commands)
3. [Seed Data Commands](#seed-data-commands)
4. [Troubleshooting Common Issues](#troubleshooting-common-issues)
5. [Backup and Restore Procedures](#backup-and-restore-procedures)
6. [Monitoring with Docker Logs](#monitoring-with-docker-logs)

---

## Docker Compose Commands

### Start All Infrastructure

```bash
# Start in detached mode
docker compose up -d

# Start and rebuild images
docker compose up -d --build

# Start specific services only
docker compose up -d sqlserver redis minio
```

### Stop Infrastructure

```bash
# Stop all containers (preserves volumes)
docker compose down

# Stop and remove volumes (destructive — deletes all data)
docker compose down -v
```

### Check Status

```bash
# List running containers
docker compose ps

# Check health of all services
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
```

### Restart Individual Services

```bash
docker compose restart sqlserver
docker compose restart redis
docker compose restart minio
```

### View Resource Usage

```bash
docker stats social_sqlserver social_redis social_minio
```

---

## Database Migration Commands

### Generate a New Migration

After modifying TypeORM entities, generate a migration that captures the schema diff:

```bash
pnpm run migration:generate -- -n <MigrationName>

# Example
pnpm run migration:generate -- -n AddSurveyTables
```

This creates a timestamped file in `libs/database/src/migrations/`.

### Run Pending Migrations

```bash
pnpm run migration:run
```

### Revert the Last Migration

```bash
pnpm run migration:revert
```

### Show Migration Status

```bash
pnpm run typeorm migration:show -d libs/database/src/data-source.ts
```

### Create the Database Manually

If the database does not exist yet, connect to SQL Server and run:

```sql
CREATE DATABASE internal_social
COLLATE Japanese_CI_AS;
```

Or use the `sqlcmd` CLI:

```bash
docker exec -it social_sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'YourStrong!Passw0rd' -C \
  -Q "CREATE DATABASE internal_social COLLATE Japanese_CI_AS;"
```

---

## Seed Data Commands

### Run Permission Seeds

```bash
pnpm run ts-node libs/database/src/seeds/run-seeds.ts
```

### Seed Script Runner

**File**: `libs/database/src/seeds/run-seeds.ts`

```typescript
import { DataSource } from 'typeorm';
import dataSource from '../data-source';
import { seedPermissions } from './permissions.seed';

async function run() {
  const ds: DataSource = await dataSource.initialize();
  console.log('Database connected. Running seeds...');

  await seedPermissions(ds);

  await ds.destroy();
  console.log('Seeds complete.');
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
```

### Create an Admin User

After seeding permissions, create an admin user with all permissions:

```bash
pnpm run ts-node libs/database/src/seeds/admin-user.seed.ts
```

**File**: `libs/database/src/seeds/admin-user.seed.ts`

```typescript
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';

async function run() {
  const ds: DataSource = await dataSource.initialize();

  const userRepo = ds.getRepository('users');
  const permRepo = ds.getRepository('permissions');
  const upRepo = ds.getRepository('user_permissions');

  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 10);
  let admin = await userRepo.findOne({ where: { username: 'admin' } });
  if (!admin) {
    admin = await userRepo.save({
      username: 'admin',
      display_name: 'Administrator',
      email: 'admin@example.com',
      password_hash: passwordHash,
    });
    console.log('Admin user created');
  }

  // Assign all permissions
  const allPerms = await permRepo.find();
  for (const perm of allPerms) {
    const exists = await upRepo.findOne({
      where: { user: { id: admin.id }, permission: { id: perm.id } },
    });
    if (!exists) {
      await upRepo.save({ user: admin, permission: perm });
    }
  }
  console.log(`Assigned ${allPerms.length} permissions to admin`);

  await ds.destroy();
}

run().catch((err) => {
  console.error('Admin seed failed:', err);
  process.exit(1);
});
```

---

## Troubleshooting Common Issues

### SQL Server Connection Refused

**Symptom**: `ECONNREFUSED 127.0.0.1:1433`

**Causes and fixes**:
1. SQL Server container not running: `docker compose up -d sqlserver`
2. SQL Server still starting (takes 15-30s on first run): wait and retry.
3. Wrong password in `.env`: confirm `DB_PASSWORD` matches `MSSQL_SA_PASSWORD` in `docker-compose.yml`.

```bash
# Test connectivity
docker exec -it social_sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'YourStrong!Passw0rd' -C \
  -Q "SELECT 1"
```

### Redis Connection Error

**Symptom**: `ECONNREFUSED 127.0.0.1:6379`

```bash
# Check if Redis is running
docker compose ps redis

# Test connectivity
docker exec -it social_redis redis-cli ping
# Expected: PONG
```

### MinIO Access Denied

**Symptom**: `403 Forbidden` or `Access Denied`

1. Verify credentials in `.env` match `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` in `docker-compose.yml`.
2. Check the MinIO console at `http://localhost:9001`.
3. Ensure the bucket exists — the file service auto-creates it on startup.

### TypeORM Migration Errors

**Symptom**: `QueryFailedError: Invalid object name`

1. Run pending migrations: `pnpm run migration:run`
2. If the database does not exist, create it first (see above).
3. If an entity was renamed, generate a new migration rather than modifying an old one.

### Port Already in Use

**Symptom**: `EADDRINUSE :::3000`

```bash
# Find the process using the port (Windows)
netstat -ano | findstr :3000

# Kill it
taskkill /PID <pid> /F
```

### Microservice TCP Connection Timeout

**Symptom**: `Error: connect ECONNREFUSED 127.0.0.1:300x`

1. Ensure the target microservice is running.
2. Check the port in the service's `main.ts` matches the API Gateway's `ClientsModule.register` config.
3. Start services in dependency order: infrastructure first, then microservices, then API Gateway.

### WebSocket Connection Fails

**Symptom**: Client cannot connect to `ws://localhost:3016/notifications`

1. Ensure the notification service is running on both TCP (3006) and HTTP (3016).
2. Check CORS settings if connecting from a browser.
3. Verify the `userId` query parameter is passed: `?userId=<uuid>`.

---

## Backup and Restore Procedures

### SQL Server Backup

```bash
# Create a backup inside the container
docker exec -it social_sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'YourStrong!Passw0rd' -C \
  -Q "BACKUP DATABASE internal_social TO DISK = '/var/opt/mssql/backup/internal_social.bak' WITH FORMAT, INIT"

# Copy the backup file to the host
docker cp social_sqlserver:/var/opt/mssql/backup/internal_social.bak ./backups/
```

### SQL Server Restore

```bash
# Copy the backup file to the container
docker cp ./backups/internal_social.bak social_sqlserver:/var/opt/mssql/backup/

# Restore
docker exec -it social_sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'YourStrong!Passw0rd' -C \
  -Q "RESTORE DATABASE internal_social FROM DISK = '/var/opt/mssql/backup/internal_social.bak' WITH REPLACE"
```

### Redis Backup

Redis uses RDB snapshots by default. The dump file is at `/data/dump.rdb` inside the container.

```bash
# Trigger a manual save
docker exec -it social_redis redis-cli BGSAVE

# Copy the dump to the host
docker cp social_redis:/data/dump.rdb ./backups/redis-dump.rdb
```

### Redis Restore

```bash
# Stop Redis
docker compose stop redis

# Copy the dump into the volume
docker cp ./backups/redis-dump.rdb social_redis:/data/dump.rdb

# Start Redis
docker compose start redis
```

### MinIO Backup

Use the MinIO Client (`mc`) to mirror the bucket:

```bash
# Configure mc alias
docker run --rm -it --network host minio/mc alias set local http://localhost:9000 minioadmin minioadmin

# Mirror the bucket to a local directory
docker run --rm -it --network host -v $(pwd)/backups/minio:/backup minio/mc mirror local/social-uploads /backup
```

### MinIO Restore

```bash
docker run --rm -it --network host -v $(pwd)/backups/minio:/backup minio/mc mirror /backup local/social-uploads
```

---

## Monitoring with Docker Logs

### View Logs for All Services

```bash
docker compose logs -f
```

### View Logs for a Specific Service

```bash
docker compose logs -f sqlserver
docker compose logs -f redis
docker compose logs -f minio
```

### View NestJS Application Logs

Since the NestJS applications run outside Docker (during development), use:

```bash
# Start all services concurrently and view combined output
pnpm run start:dev api-gateway
pnpm run start:dev auth-service
pnpm run start:dev user-service
pnpm run start:dev post-service
pnpm run start:dev announcement-service
pnpm run start:dev survey-service
pnpm run start:dev notification-service
pnpm run start:dev file-service
```

### Filter Logs by Time

```bash
# Logs from the last 30 minutes
docker compose logs --since 30m

# Logs from a specific timestamp
docker compose logs --since "2026-03-20T10:00:00"
```

### Monitor SQL Server Queries

Enable slow query logging inside SQL Server:

```sql
-- Connect via sqlcmd
docker exec -it social_sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'YourStrong!Passw0rd' -C

-- View active queries
SELECT
  r.session_id,
  r.status,
  r.command,
  t.text AS query_text,
  r.total_elapsed_time
FROM sys.dm_exec_requests r
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) t
WHERE r.session_id > 50;
```

### Monitor Redis

```bash
# Real-time command monitor
docker exec -it social_redis redis-cli MONITOR

# Check memory usage
docker exec -it social_redis redis-cli INFO memory

# Check connected clients
docker exec -it social_redis redis-cli INFO clients

# Check Pub/Sub channels
docker exec -it social_redis redis-cli PUBSUB CHANNELS '*'
```

### Monitor MinIO

```bash
# Check MinIO server info
docker exec -it social_minio mc admin info local

# View bucket statistics
docker exec -it social_minio mc ls local/social-uploads --summarize
```

### Recommended Startup Order

For local development, start services in this order:

1. `docker compose up -d` (infrastructure)
2. `pnpm run migration:run` (database schema)
3. `pnpm run ts-node libs/database/src/seeds/run-seeds.ts` (seed data)
4. Start microservices (auth, user, post, announcement, survey, notification, file)
5. Start API Gateway last (depends on all microservices)
