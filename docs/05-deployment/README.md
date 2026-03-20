# デプロイメントガイド

> コープネット - 社内SNSシステム（オンプレミス + VPN環境）

---

## 1. 概要

コープネットは社内オンプレミスサーバーにデプロイする。外部アクセスはVPN経由のみ。

| 項目 | 値 |
|------|-----|
| デプロイ方式 | Docker Compose |
| リバースプロキシ | Nginx |
| SSL/TLS | 社内CA証明書 |
| OS | Windows Server / Linux |

---

## 2. Docker Compose 本番構成

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  # ── Nginx リバースプロキシ ──
  nginx:
    image: nginx:1.25-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - api-gateway
    restart: always
    healthcheck:
      test: ["CMD", "nginx", "-t"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ── Frontend (Next.js) ──
  frontend:
    build:
      context: ./source/frontend
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://coopnet.internal.company.co.jp/api
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ── API Gateway (NestJS) ──
  api-gateway:
    build:
      context: ./source/backend
      dockerfile: Dockerfile
      target: api-gateway
    env_file:
      - .env.production
    depends_on:
      sqlserver:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ── SQL Server ──
  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      ACCEPT_EULA: "Y"
      SA_PASSWORD: "${DB_PASSWORD}"
      MSSQL_COLLATION: "Japanese_CI_AS"
      MSSQL_MEMORY_LIMIT_MB: 2048
    ports:
      - "1433:1433"
    volumes:
      - sqlserver_data:/var/opt/mssql
      - ./backups/sqlserver:/var/opt/mssql/backup
    restart: always
    healthcheck:
      test: /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$${SA_PASSWORD}" -C -Q "SELECT 1" -b
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 30s

  # ── Redis ──
  redis:
    image: redis:7-alpine
    command: >
      redis-server
      --appendonly yes
      --maxmemory 512mb
      --maxmemory-policy allkeys-lru
      --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: always
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ── MinIO (ファイルストレージ) ──
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: "${MINIO_ACCESS_KEY}"
      MINIO_ROOT_PASSWORD: "${MINIO_SECRET_KEY}"
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    restart: always
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  sqlserver_data:
    driver: local
  redis_data:
    driver: local
  minio_data:
    driver: local
```

---

## 3. Nginx リバースプロキシ設定

```nginx
# nginx/nginx.conf
worker_processes auto;

events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # ログ設定
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent"';
    access_log /var/log/nginx/access.log main;
    error_log  /var/log/nginx/error.log warn;

    # 基本設定
    sendfile        on;
    tcp_nopush      on;
    keepalive_timeout 65;
    client_max_body_size 50M;  # ファイルアップロード上限

    # gzip圧縮
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1000;

    # HTTPをHTTPSにリダイレクト
    server {
        listen 80;
        server_name coopnet.internal.company.co.jp;
        return 301 https://$host$request_uri;
    }

    # HTTPS サーバー
    server {
        listen 443 ssl;
        server_name coopnet.internal.company.co.jp;

        # SSL証明書（社内CA）
        ssl_certificate     /etc/nginx/ssl/server.crt;
        ssl_certificate_key /etc/nginx/ssl/server.key;
        ssl_protocols       TLSv1.2 TLSv1.3;
        ssl_ciphers         HIGH:!aNULL:!MD5;

        # セキュリティヘッダー
        add_header X-Frame-Options SAMEORIGIN;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";

        # API リクエスト → バックエンド
        location /api/ {
            proxy_pass http://api-gateway:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # WebSocket サポート
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }

        # WebSocket エンドポイント
        location /socket.io/ {
            proxy_pass http://api-gateway:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # フロントエンド
        location / {
            proxy_pass http://frontend:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

---

## 4. SSL/TLS 設定（社内CA証明書）

### 自己署名証明書の作成（開発・テスト用）

```bash
# 秘密鍵の生成
openssl genrsa -out nginx/ssl/server.key 2048

# CSR の作成
openssl req -new -key nginx/ssl/server.key -out nginx/ssl/server.csr \
  -subj "/C=JP/ST=Tokyo/O=Company/CN=coopnet.internal.company.co.jp"

# 証明書の作成（1年間有効）
openssl x509 -req -days 365 -in nginx/ssl/server.csr \
  -signkey nginx/ssl/server.key -out nginx/ssl/server.crt
```

### 本番環境

社内CAから発行された証明書を `nginx/ssl/` に配置する:
- `server.crt` — サーバー証明書
- `server.key` — 秘密鍵

---

## 5. 本番環境変数

```env
# .env.production

# ── App ──
NODE_ENV=production
APP_PORT=3000

# ── Database ──
DB_HOST=sqlserver
DB_PORT=1433
DB_USERNAME=sa
DB_PASSWORD=<強力なパスワード>
DB_DATABASE=coopnet

# ── Redis ──
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<Redisパスワード>

# ── MinIO ──
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=<MinIOアクセスキー>
MINIO_SECRET_KEY=<MinIOシークレットキー>
MINIO_BUCKET=coopnet
MINIO_USE_SSL=false

# ── JWT ──
JWT_SECRET=<ランダムな256ビット文字列>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ── Microsoft 365 SSO（オプション） ──
MS365_CLIENT_ID=<クライアントID>
MS365_CLIENT_SECRET=<クライアントシークレット>
MS365_TENANT_ID=<テナントID>

# ── Logging ──
LOG_LEVEL=info
```

> **注意:** `.env.production` ファイルは Git に含めない。サーバーに直接配置する。

---

## 6. データベースバックアップ戦略

### 自動バックアップスクリプト

```bash
#!/bin/bash
# scripts/backup-db.sh

BACKUP_DIR="/var/opt/mssql/backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="coopnet"
RETENTION_DAYS=30

# バックアップ実行
docker exec sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "${DB_PASSWORD}" -C \
  -Q "BACKUP DATABASE [${DB_NAME}] TO DISK = N'${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.bak' WITH COMPRESSION, INIT"

# 古いバックアップの削除
find "${BACKUP_DIR}" -name "*.bak" -mtime +${RETENTION_DAYS} -delete

echo "Backup completed: ${DB_NAME}_${TIMESTAMP}.bak"
```

### バックアップスケジュール（cron）

```cron
# 毎日 AM 2:00 にフルバックアップ
0 2 * * * /path/to/scripts/backup-db.sh >> /var/log/backup-db.log 2>&1

# 毎週日曜 AM 3:00 にバックアップ検証
0 3 * * 0 /path/to/scripts/verify-backup.sh >> /var/log/verify-backup.log 2>&1
```

### バックアップ復元

```bash
docker exec sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "${DB_PASSWORD}" -C \
  -Q "RESTORE DATABASE [coopnet] FROM DISK = N'/var/opt/mssql/backup/coopnet_20260320_020000.bak' WITH REPLACE"
```

---

## 7. MinIO バックアップ

### MinIO データのバックアップ

```bash
#!/bin/bash
# scripts/backup-minio.sh

BACKUP_DIR="/backups/minio"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# MinIO CLI (mc) でバックアップ
docker exec minio mc alias set local http://localhost:9000 ${MINIO_ACCESS_KEY} ${MINIO_SECRET_KEY}
docker exec minio mc mirror local/coopnet /tmp/minio-backup/

# ホストにコピー & 圧縮
docker cp minio:/tmp/minio-backup "${BACKUP_DIR}/minio_${TIMESTAMP}"
tar -czf "${BACKUP_DIR}/minio_${TIMESTAMP}.tar.gz" -C "${BACKUP_DIR}" "minio_${TIMESTAMP}"
rm -rf "${BACKUP_DIR}/minio_${TIMESTAMP}"

# 古いバックアップの削除
find "${BACKUP_DIR}" -name "*.tar.gz" -mtime +${RETENTION_DAYS} -delete

echo "MinIO backup completed: minio_${TIMESTAMP}.tar.gz"
```

### バックアップスケジュール

```cron
# 毎日 AM 3:00 にMinIOバックアップ
0 3 * * * /path/to/scripts/backup-minio.sh >> /var/log/backup-minio.log 2>&1
```

---

## 8. ヘルスチェック

### ヘルスチェックエンドポイント

バックエンドに以下のヘルスチェックエンドポイントを実装する:

```
GET /api/v1/health
```

レスポンス例:

```json
{
  "status": "ok",
  "timestamp": "2026-03-20T09:00:00.000Z",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "minio": "healthy"
  },
  "uptime": 86400
}
```

### Docker ヘルスチェック

各サービスの `healthcheck` は `docker-compose.prod.yml` に定義済み。ステータス確認:

```bash
# 全サービスの状態確認
docker compose -f docker-compose.prod.yml ps

# 特定サービスの詳細
docker inspect --format='{{json .State.Health}}' coopnet-api-gateway-1
```

---

## 9. モニタリング（Docker ログ）

### ログの確認

```bash
# 全サービスのログ（リアルタイム）
docker compose -f docker-compose.prod.yml logs -f

# 特定サービスのログ
docker compose -f docker-compose.prod.yml logs -f api-gateway
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f sqlserver

# 直近100行のログ
docker compose -f docker-compose.prod.yml logs --tail=100 api-gateway

# 時間範囲指定
docker compose -f docker-compose.prod.yml logs --since="2026-03-20T00:00:00" api-gateway
```

### ログローテーション

`docker-compose.prod.yml` の各サービスに以下を追加:

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "5"
```

### ディスク使用量の監視

```bash
#!/bin/bash
# scripts/check-disk.sh

THRESHOLD=80
USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

if [ "$USAGE" -gt "$THRESHOLD" ]; then
  echo "WARNING: Disk usage is ${USAGE}% (threshold: ${THRESHOLD}%)"
  # 必要に応じてアラート通知を追加
fi
```

---

## 10. デプロイ手順

### 初回デプロイ

```bash
# 1. リポジトリをクローン
git clone <repository-url> /opt/coopnet
cd /opt/coopnet

# 2. 環境変数を設定
cp .env.example .env.production
# .env.production を編集

# 3. SSL証明書を配置
cp /path/to/server.crt nginx/ssl/
cp /path/to/server.key nginx/ssl/

# 4. ビルド & 起動
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# 5. データベースマイグレーション
docker compose -f docker-compose.prod.yml exec api-gateway npm run db:migrate

# 6. 初期データ投入
docker compose -f docker-compose.prod.yml exec api-gateway npm run db:seed

# 7. ヘルスチェック
curl -k https://coopnet.internal.company.co.jp/api/v1/health
```

### アップデートデプロイ

```bash
cd /opt/coopnet

# 1. 最新コードを取得
git pull origin main

# 2. バックアップ
./scripts/backup-db.sh

# 3. リビルド & 再起動
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# 4. マイグレーション（必要な場合）
docker compose -f docker-compose.prod.yml exec api-gateway npm run db:migrate

# 5. 動作確認
curl -k https://coopnet.internal.company.co.jp/api/v1/health
```

### ロールバック

```bash
# 直前のバージョンに戻す
git checkout <previous-commit-hash>
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# データベースもロールバック（必要な場合）
docker compose -f docker-compose.prod.yml exec api-gateway npx typeorm migration:revert -d typeorm.config.ts
```
