# プロジェクト規約 (Project Conventions)

> コープネット - 社内SNSシステム

## 1. データベース規約

### テーブル命名

| 項目 | 規約 | 例 |
|------|------|-----|
| テーブル名 | snake_case・複数形 | `users`, `post_files`, `survey_questions` |
| カラム名 | snake_case | `display_name`, `created_at` |
| 主キー | `id` (UNIQUEIDENTIFIER, NEWID()) | `id UNIQUEIDENTIFIER DEFAULT NEWID()` |
| 外部キー | `{単数形テーブル名}_id` | `user_id`, `post_id`, `survey_id` |
| インデックス | `IX_{テーブル名}_{カラム名}` | `IX_posts_user_id` |
| ユニーク制約 | `UQ_{テーブル名}_{カラム名}` | `UQ_users_email` |
| 外部キー制約 | `FK_{テーブル名}_{参照テーブル名}` | `FK_posts_users` |
| デフォルト制約 | `DF_{テーブル名}_{カラム名}` | `DF_users_is_active` |

### データ型

| 用途 | データ型 | 備考 |
|------|----------|------|
| 主キー | `UNIQUEIDENTIFIER` | `DEFAULT NEWID()` |
| テキスト（短） | `NVARCHAR(n)` | 日本語対応のため必ず `N` プレフィックス |
| テキスト（長） | `NVARCHAR(MAX)` | 投稿本文、コメントなど |
| 日付時刻 | `DATETIME2(7)` | UTC で保存 |
| 日付のみ | `DATE` | 投稿日（`post_date`）など |
| 真偽値 | `BIT` | `0` = false, `1` = true |
| 数値（整数） | `INT` | カウント系 |
| 数値（大） | `BIGINT` | ファイルサイズなど |
| JSON | `NVARCHAR(MAX)` | JSON 文字列として保存、CHECK制約推奨 |

### 共通カラム

すべてのテーブルに以下の監査カラムを含める:

```sql
created_at    DATETIME2(7)      NOT NULL DEFAULT SYSUTCDATETIME(),
updated_at    DATETIME2(7)      NOT NULL DEFAULT SYSUTCDATETIME(),
created_by    UNIQUEIDENTIFIER  NULL,
is_deleted    BIT               NOT NULL DEFAULT 0
```

- `is_deleted` による論理削除を標準とする（物理削除は原則禁止）
- `updated_at` はトリガーまたはアプリケーション層で更新する
- `created_by` はシステム生成レコード（マイグレーション等）の場合 `NULL` を許容

### クエリ規約

- `SELECT` 時は必ず `WHERE is_deleted = 0` を含める
- TypeORM では Global Scope またはカスタムリポジトリで自動フィルタリング
- 論理削除されたデータの参照が必要な場合は明示的に `withDeleted()` を使用

---

## 2. API URL 規約

### 基本ルール

| 項目 | 規約 | 例 |
|------|------|-----|
| ベースURL | `/api/v{version}` | `/api/v1` |
| リソース名 | kebab-case・複数形 | `/api/v1/announcements` |
| パス区切り | `/` | `/api/v1/posts/{id}/comments` |
| クエリパラメータ | camelCase | `?pageSize=20&sortBy=createdAt` |

### URL パターン

```
GET    /api/v1/{resources}          → 一覧取得
GET    /api/v1/{resources}/:id      → 単体取得
POST   /api/v1/{resources}          → 新規作成
PATCH  /api/v1/{resources}/:id      → 部分更新
DELETE /api/v1/{resources}/:id      → 削除（論理削除）

# ネストリソース
GET    /api/v1/posts/:id/comments   → 投稿のコメント一覧
POST   /api/v1/posts/:id/comments   → コメント追加

# アクション（動詞が必要な場合）
POST   /api/v1/posts/:id/like       → いいね
DELETE /api/v1/posts/:id/like       → いいね取消
POST   /api/v1/auth/login           → ログイン
POST   /api/v1/auth/refresh         → トークンリフレッシュ
```

### HTTP ステータスコード

| コード | 用途 |
|--------|------|
| `200` | 成功（取得・更新・削除） |
| `201` | 作成成功 |
| `204` | 成功（レスポンスボディなし） |
| `400` | バリデーションエラー |
| `401` | 認証エラー |
| `403` | 権限エラー |
| `404` | リソース未検出 |
| `409` | 競合（重複等） |
| `422` | 処理不能エンティティ |
| `500` | サーバーエラー |

---

## 3. コード規約

### 命名規則

| 対象 | 規約 | 例 |
|------|------|-----|
| クラス | PascalCase + サフィックス | `PostService`, `CreatePostDto` |
| インターフェース | PascalCase（`I` プレフィックスなし） | `PostRepository` |
| ファイル | kebab-case + サフィックス | `post.service.ts`, `create-post.dto.ts` |
| 変数・プロパティ | camelCase | `displayName`, `postDate` |
| 定数 | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `DEFAULT_PAGE_SIZE` |
| Enum | PascalCase（メンバーも PascalCase） | `FileType.Image`, `NotificationType.Like` |
| 型パラメータ | 単一大文字 | `T`, `K`, `V` |

### ファイルサフィックス一覧

| サフィックス | 用途 | 例 |
|--------------|------|-----|
| `.entity.ts` | TypeORM エンティティ | `post.entity.ts` |
| `.dto.ts` | Data Transfer Object | `create-post.dto.ts` |
| `.service.ts` | ビジネスロジック | `post.service.ts` |
| `.controller.ts` | HTTP コントローラー | `post.controller.ts` |
| `.module.ts` | NestJS モジュール | `post.module.ts` |
| `.guard.ts` | 認証・認可ガード | `jwt-auth.guard.ts` |
| `.decorator.ts` | カスタムデコレータ | `current-user.decorator.ts` |
| `.pipe.ts` | バリデーションパイプ | `parse-uuid.pipe.ts` |
| `.filter.ts` | 例外フィルター | `http-exception.filter.ts` |
| `.interceptor.ts` | インターセプター | `transform.interceptor.ts` |
| `.middleware.ts` | ミドルウェア | `logger.middleware.ts` |
| `.gateway.ts` | WebSocket ゲートウェイ | `notification.gateway.ts` |
| `.spec.ts` | テストファイル | `post.service.spec.ts` |
| `.e2e-spec.ts` | E2E テスト | `post.e2e-spec.ts` |
| `.interface.ts` | 型定義 | `post.interface.ts` |
| `.constant.ts` | 定数定義 | `post.constant.ts` |
| `.enum.ts` | Enum 定義 | `file-type.enum.ts` |
| `.config.ts` | 設定 | `database.config.ts` |
| `.strategy.ts` | Passport ストラテジー | `jwt.strategy.ts` |
| `.subscriber.ts` | イベントサブスクライバー | `post-event.subscriber.ts` |

### ディレクトリ構成（バックエンド・各マイクロサービス）

```
src/
├── main.ts
├── app.module.ts
├── config/
│   └── database.config.ts
├── common/
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── pipes/
│   └── interfaces/
└── modules/
    └── {feature}/
        ├── {feature}.module.ts
        ├── {feature}.controller.ts
        ├── {feature}.service.ts
        ├── entities/
        │   └── {feature}.entity.ts
        ├── dto/
        │   ├── create-{feature}.dto.ts
        │   └── update-{feature}.dto.ts
        └── interfaces/
            └── {feature}.interface.ts
```

---

## 4. JSON レスポンス規約

### プロパティ命名

- すべて **camelCase**
- 日付は **ISO 8601** 形式 (`2026-03-20T09:00:00.000Z`)
- DB の snake_case → API の camelCase 変換は Interceptor で自動処理

### 標準レスポンスラッパー

#### 成功レスポンス

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-03-20T09:00:00.000Z"
  }
}
```

#### ページネーション付きレスポンス

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 150,
    "totalPages": 8,
    "timestamp": "2026-03-20T09:00:00.000Z"
  }
}
```

#### エラーレスポンス

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容に誤りがあります",
    "details": [
      {
        "field": "title",
        "message": "タイトルは必須です"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-03-20T09:00:00.000Z"
  }
}
```

### エラーコード一覧

| コード | 説明 |
|--------|------|
| `VALIDATION_ERROR` | バリデーションエラー |
| `UNAUTHORIZED` | 認証エラー |
| `FORBIDDEN` | 権限エラー |
| `NOT_FOUND` | リソース未検出 |
| `CONFLICT` | データ競合 |
| `INTERNAL_ERROR` | サーバーエラー |
| `TOKEN_EXPIRED` | トークン期限切れ |
| `RATE_LIMIT_EXCEEDED` | レートリミット超過 |

---

## 5. Git 規約

### ブランチ戦略

```
main                    ← 本番環境
├── develop             ← 開発統合ブランチ
│   ├── feature/*       ← 機能開発
│   ├── bugfix/*        ← バグ修正
│   ├── hotfix/*        ← 緊急修正（main から分岐）
│   └── refactor/*      ← リファクタリング
└── release/*           ← リリース準備
```

### ブランチ命名

```
feature/add-post-creation
feature/implement-auth-service
bugfix/fix-comment-pagination
hotfix/fix-login-error
refactor/optimize-post-query
```

### コミットメッセージ（Conventional Commits）

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

#### Type 一覧

| Type | 説明 |
|------|------|
| `feat` | 新機能 |
| `fix` | バグ修正 |
| `docs` | ドキュメント |
| `style` | コードスタイル（動作変更なし） |
| `refactor` | リファクタリング |
| `perf` | パフォーマンス改善 |
| `test` | テスト |
| `chore` | ビルド・CI 等の雑務 |
| `ci` | CI 設定 |
| `build` | ビルドシステム |

#### Scope 例

```
feat(post): 投稿作成機能を追加
fix(auth): トークンリフレッシュのタイミングを修正
docs(api): エンドポイント仕様書を更新
refactor(user): ユーザーサービスのクエリ最適化
```

### コミットルール

- 1コミット = 1論理変更
- 日本語の説明を本文に含めても良い
- Breaking Change は `BREAKING CHANGE:` フッターまたは `!` を付与

---

## 6. フロントエンド規約

### ファイル命名（Next.js / React）

| 対象 | 規約 | 例 |
|------|------|-----|
| ページ | `page.tsx` (App Router) | `app/(main)/page.tsx` |
| レイアウト | `layout.tsx` | `app/(main)/layout.tsx` |
| コンポーネント | kebab-case ディレクトリ + `index.tsx` または PascalCase `.tsx` | `post-card/index.tsx` or `PostCard.tsx` |
| フック | camelCase | `use-auth.ts` |
| ストア | kebab-case | `auth-store.ts` |
| ユーティリティ | kebab-case | `format-date.ts` |

### CSS 規約

- Tailwind CSS を使用
- カスタムコンポーネントは `cn()` ユーティリティで clsx + tailwind-merge
- デザイントークンは `tailwind.config.ts` で定義

---

## 7. 環境変数規約

### 命名

- UPPER_SNAKE_CASE
- プレフィックスでカテゴリ分け

```env
# Database
DB_HOST=localhost
DB_PORT=1433
DB_USERNAME=sa
DB_PASSWORD=
DB_DATABASE=coopnet

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_BUCKET=coopnet

# JWT
JWT_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Microsoft 365 (optional)
MS365_CLIENT_ID=
MS365_CLIENT_SECRET=
MS365_TENANT_ID=

# App
APP_PORT=3000
APP_ENV=development
```

### 管理方針

- `.env` ファイルは Git に含めない（`.gitignore` に追加）
- `.env.example` をテンプレートとして管理
- 本番環境は環境変数または Secret Manager で管理
