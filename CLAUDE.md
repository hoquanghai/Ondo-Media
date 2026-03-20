# CLAUDE.md

## Project Overview

コープネット（CoopNet）は、100〜150名規模の社内SNSシステムです。NestJSマイクロサービス（バックエンド）とNext.js 15（フロントエンド）で構成され、オンプレミス + VPN環境にDocker Composeでデプロイします。すべてのUIテキストは日本語で実装してください。

---

## Repository Layout

```
Internal_Social/
├── CLAUDE.md                          ← このファイル（AI向けガイド）
├── PROJECT_REQUIREMENTS.md            ← プロジェクト要件書
├── docs/
│   ├── 00-project-init/
│   │   └── README.md                 ← プロジェクト初期化チェックリスト
│   ├── 01-system-design/             ← システム設計ドキュメント
│   │   ├── shared/
│   │   │   └── conventions.md        ← コーディング規約・命名規約
│   │   ├── backend/
│   │   │   ├── database-schema.md    ← DBスキーマ（DDL・インデックス）
│   │   │   ├── api-endpoints.md      ← 全REST API仕様
│   │   │   ├── microservices.md      ← マイクロサービス構成
│   │   │   └── caching-strategy.md   ← Redisキャッシュ戦略
│   │   └── frontend/
│   │       ├── nextjs-architecture.md ← Next.js App Router構成
│   │       ├── routing.md            ← ルーティング設計
│   │       └── screen-inventory.md   ← 画面一覧
│   ├── 02-backend/                   ← バックエンド実装ガイド（フェーズ別）
│   │   ├── phase-01-foundation/
│   │   ├── phase-02-auth/
│   │   ├── phase-03-user-management/
│   │   ├── phase-04-timeline/
│   │   ├── phase-05-announcements/
│   │   ├── phase-06-survey/
│   │   ├── phase-07-notifications/
│   │   └── phase-08-file-service/
│   ├── 03-frontend/                  ← フロントエンド実装ガイド（フェーズ別）
│   │   ├── phase-01-setup/
│   │   ├── phase-02-auth/
│   │   ├── phase-03-layout/
│   │   ├── phase-04-timeline/
│   │   ├── phase-05-announcements/
│   │   ├── phase-06-survey/
│   │   ├── phase-07-my-page/
│   │   ├── phase-08-admin/
│   │   └── phase-09-notifications/
│   ├── 04-testing/
│   │   └── README.md                ← テスト戦略
│   ├── 05-deployment/
│   │   └── README.md                ← デプロイメントガイド
│   └── features/                     ← 将来機能の仕様書
│       ├── teams-integration/spec.md
│       ├── gamification/spec.md
│       └── ai-features/spec.md
└── source/                           ← ソースコード（実装時に作成）
    ├── backend/                      ← NestJS バックエンド
    └── frontend/                     ← Next.js フロントエンド
```

---

## Common Commands

### Backend

```bash
cd source/backend

npm run dev              # 開発サーバー起動（API Gateway）
npm run dev:all          # 全マイクロサービス起動
npm test                 # テスト実行
npm run build            # ビルド
npm run db:migrate       # マイグレーション実行
npm run db:migrate:generate  # マイグレーション生成
npm run db:seed          # 初期データ投入
npm run infra:up         # Docker インフラ起動（SQL Server, Redis, MinIO）
npm run infra:down       # Docker インフラ停止
```

### Frontend

```bash
cd source/frontend

npm run dev              # 開発サーバー起動（http://localhost:3001）
npm run build            # プロダクションビルド
npm test                 # テスト実行
npm run lint             # Lint実行
```

---

## Architecture Summary

### Backend

- **NestJS マイクロサービス**構成、TCP Transport で内部通信
- API Gateway がHTTPリクエストを受け、各マイクロサービスにTCPで転送
- サービス: API Gateway, Auth Service, Post Service, Notification Service, File Service
- TypeORM でSQL Server 2022に接続（Japanese_CI_AS コレーション）
- Redis でセッション管理・キャッシュ
- MinIO で画像ファイルを管理
- Socket.IO でリアルタイム通知

### Frontend

- **Next.js 15** App Router（Server Components + Client Components）
- **Tailwind CSS** + **shadcn/ui** でUI構築
- **TanStack Query** でサーバー状態管理
- **Zustand** でクライアント状態管理（認証情報、通知バッジ等）
- レスポンシブデザイン（デスクトップ・タブレット・スマートフォン対応）

### Database

- SQL Server 2022（Japanese_CI_AS コレーション）
- TypeORM マイグレーションで管理（`synchronize: false`）
- 論理削除（`is_deleted` カラム）、物理削除は禁止
- 全テーブルに `created_at`, `updated_at`, `created_by`, `is_deleted` カラム
- 主キーは `UNIQUEIDENTIFIER` (`NEWID()`)

### Infrastructure

- Docker Compose で全サービスを管理
- Nginx リバースプロキシ（SSL終端）
- オンプレミスサーバー + VPN アクセスのみ

---

## Auth Flow

二つの認証方式をサポート:

1. **ローカル認証**: メールアドレス + パスワード（bcryptハッシュ）
2. **Microsoft 365 SSO**: Azure AD 経由のOAuth 2.0 / OIDC

```
[ユーザー] → [Next.js] → [API Gateway] → [Auth Service]
                                              │
                                              ├─ ローカル: email/password → JWT発行
                                              └─ SSO: Azure AD → JIT ユーザー作成 → JWT発行

JWT: アクセストークン（15分）+ リフレッシュトークン（7日）
```

---

## Key Conventions

詳細は `docs/01-system-design/shared/conventions.md` を参照。主要なポイント:

- **DB**: テーブル名は snake_case・複数形、カラム名は snake_case
- **API**: `/api/v1/{resource}` 形式、kebab-case
- **コード**: クラスは PascalCase + サフィックス、ファイルは kebab-case
- **JSON**: プロパティは camelCase、日付は ISO 8601
- **Git**: Conventional Commits (`feat(post): 投稿作成機能を追加`)

---

## Important Notes

1. **設計ドキュメントを先に読む** — 実装前に必ず `docs/01-system-design/` の該当ドキュメントを確認すること
2. **フェーズガイドに従う** — `docs/02-backend/` と `docs/03-frontend/` のフェーズ別READMEに従って実装すること
3. **すべてのUIテキストは日本語** — ボタン、ラベル、メッセージ、エラー表示等、すべて日本語で実装すること
4. **将来機能の仕様は `docs/features/`** — Teams連携、ゲーミフィケーション、AI機能の仕様書が格納されている
5. **共有ライブラリのパターンを変更しない** — `conventions.md` を確認せずに共有パターン（レスポンスラッパー、エラーフィルター、ガード等）を変更しないこと
6. **論理削除を徹底** — `is_deleted` フラグによる論理削除を標準とし、物理削除は原則禁止
7. **マイグレーションで管理** — `synchronize: true` は使用禁止。スキーマ変更は必ずマイグレーションで行う
