# CLAUDE.md

## Project Overview

日報（Nippo）は、音頭金属株式会社の100〜150名規模の社内SNSシステムです。NestJSマイクロサービス（バックエンド）とNext.js 15（フロントエンド）で構成され、オンプレミス + VPN環境にDocker Composeでデプロイします。すべてのUIテキストは日本語で実装してください。

---

## AI Skills & Plugins

### Skills (`.claude/skills/`)
| Skill | Trigger | Description |
|-------|---------|-------------|
| `code-review` | コードレビュー依頼 | Backend/Frontend review checklist |
| `add-feature` | 新機能追加 | Feature spec → Implementation workflow |
| `fix-bug` | バグ報告 | Debug patterns & common fixes |
| `refactor` | リファクタリング | Code cleanup rules |
| `frontend-design` | UI設計 | Design system, Figma reference, responsive rules |
| `database` | DB操作 | Schema changes, migrations, cross-DB queries |

### Installed Plugins
- **code-review** — Automated code review with project-specific checklist
- **context7** — Enhanced context awareness
- **frontend-design** — UI/UX design assistance with Figma
- **github** — PR creation, issue management
- **superpowers** — Advanced code generation

### MCP Connections
- **Figma** — Design reference access
- **Gmail** — Communication
- **Google Calendar** — Scheduling

### Tools (`tools/`)
- `tools/scripts/dev-setup.sh` — One-command dev environment setup
- `tools/scripts/reset-db.sh` — Database reset & re-migration
- `tools/prompts/new-feature.md` — Prompt template for new features
- `tools/prompts/fix-bug.md` — Prompt template for bug reports

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

## Mandatory Rules（必須ルール）

### 1. Skills・Plugins の使用は必須

新しいタスクや機能要求を受けたとき、**必ず関連する Skills と Plugins を使用すること**。これは任意ではなく**絶対条件**である。

| タスク種別 | 使用すべき Skill / Plugin |
|-----------|--------------------------|
| 新機能追加 | `add-feature` skill → `superpowers:brainstorming` → `superpowers:writing-plans` |
| バグ修正 | `fix-bug` skill → `superpowers:systematic-debugging` |
| コードレビュー | `code-review` skill → `superpowers:requesting-code-review` |
| リファクタリング | `refactor` skill |
| UI設計・実装 | `frontend-design` skill → Figma MCP |
| DB操作 | `database` skill |
| 実装計画の実行 | `superpowers:executing-plans` → `superpowers:subagent-driven-development` |
| 作業完了前 | `superpowers:verification-before-completion` |

**自分の判断でスキルを省略してはならない。** 「簡単だから不要」「すぐできるから省略」という判断は禁止。

### 2. コンテキスト喪失時のドキュメント再読は必須

会話が長くなり、以下の情報を忘れた・不明になった場合、**必ず該当ドキュメントを読み直すこと**：

| 忘れた内容 | 読むべきファイル |
|-----------|-----------------|
| プロジェクト全体の構成・要件 | `PROJECT_REQUIREMENTS.md`, `CLAUDE.md` |
| システム設計・アーキテクチャ | `docs/01-system-design/` 配下 |
| DB スキーマ・テーブル設計 | `docs/01-system-design/backend/database-schema.md` |
| API 仕様 | `docs/01-system-design/backend/api-endpoints.md` |
| マイクロサービス構成 | `docs/01-system-design/backend/microservices.md` |
| フロントエンド画面設計 | `docs/01-system-design/frontend/screen-inventory.md` |
| コーディング規約 | `docs/01-system-design/shared/conventions.md` |
| バックエンド実装手順 | `docs/02-backend/` の該当フェーズ |
| フロントエンド実装手順 | `docs/03-frontend/` の該当フェーズ |
| 将来機能の仕様 | `docs/features/` 配下 |

**「覚えている」「たぶん合っている」で作業を続行してはならない。** 不確かな場合は必ずドキュメントを確認すること。

### 3. タスク開始時のチェックリスト

新しいタスクを開始する際、以下の手順を**必ず**実行すること：

1. **関連 Skill を起動** — タスク種別に応じた Skill を `Skill` ツールで呼び出す
2. **設計ドキュメントを確認** — `docs/01-system-design/` の該当ファイルを読む
3. **フェーズガイドを確認** — `docs/02-backend/` または `docs/03-frontend/` の該当フェーズを読む
4. **規約を確認** — `docs/01-system-design/shared/conventions.md` に従っているか確認する
5. **実装を開始** — 上記を全て確認した上で初めてコードを書き始める

---

## Important Notes

1. **設計ドキュメントを先に読む** — 実装前に必ず `docs/01-system-design/` の該当ドキュメントを確認すること
2. **フェーズガイドに従う** — `docs/02-backend/` と `docs/03-frontend/` のフェーズ別READMEに従って実装すること
3. **すべてのUIテキストは日本語** — ボタン、ラベル、メッセージ、エラー表示等、すべて日本語で実装すること
4. **将来機能の仕様は `docs/features/`** — Teams連携、ゲーミフィケーション、AI機能の仕様書が格納されている
5. **共有ライブラリのパターンを変更しない** — `conventions.md` を確認せずに共有パターン（レスポンスラッパー、エラーフィルター、ガード等）を変更しないこと
6. **論理削除を徹底** — `is_deleted` フラグによる論理削除を標準とし、物理削除は原則禁止
7. **マイグレーションで管理** — `synchronize: true` は使用禁止。スキーマ変更は必ずマイグレーションで行う
