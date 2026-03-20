# プロジェクト初期化チェックリスト

> コープネット - 社内SNSシステム

このドキュメントは、プロジェクトの設計・実装を段階的に進めるためのチェックリストです。

---

## Phase 0: システム設計ドキュメント作成

`docs/01-system-design/` 配下にすべての設計ドキュメントを作成する。

### shared/
- [ ] `conventions.md` — プロジェクト規約（DB命名、API URL、コード規約、Git規約）
- [ ] `data-migration.md` — 既存Excelデータからの移行戦略
- [ ] `shared-types.md` — フロントエンド・バックエンド共通の型定義

### backend/
- [ ] `database-schema.md` — 全テーブルのDDL、インデックス、外部キー、制約
- [ ] `api-endpoints.md` — 全REST APIエンドポイント仕様
- [ ] `microservices.md` — マイクロサービス構成、TCP通信パターン
- [ ] `caching-strategy.md` — Redisキャッシュ戦略（キー設計、TTL、無効化）
- [ ] `websocket.md` — WebSocket設計（リアルタイム通知）

### frontend/
- [ ] `nextjs-architecture.md` — Next.js 15 App Router構成
- [ ] `routing.md` — ルーティング設計
- [ ] `screen-inventory.md` — 画面一覧・UIワイヤーフレーム

---

## Phase 0.5: 実装ガイド作成

`docs/02-backend/` と `docs/03-frontend/` 配下に各フェーズの実装ガイドを作成する。

### Backend 実装ガイド (`docs/02-backend/`)
- [ ] `phase-01-foundation/README.md` — NestJS セットアップ、Docker、DB接続、共有ライブラリ
- [ ] `phase-02-auth/README.md` — ローカル認証 + MS365 SSO、JWT、ガード
- [ ] `phase-03-user-management/README.md` — ユーザーCRUD、プロフィール、管理者機能
- [ ] `phase-04-timeline/README.md` — 投稿作成・一覧・いいね・コメント
- [ ] `phase-05-announcements/README.md` — お知らせ機能（管理者のみ作成可）
- [ ] `phase-06-survey/README.md` — アンケート機能
- [ ] `phase-07-notifications/README.md` — リアルタイム通知（WebSocket）
- [ ] `phase-08-file-service/README.md` — MinIOファイルアップロード・画像管理

### Frontend 実装ガイド (`docs/03-frontend/`)
- [ ] `phase-01-setup/README.md` — Next.js 15 プロジェクトセットアップ
- [ ] `phase-02-auth/README.md` — ログイン画面、認証フロー
- [ ] `phase-03-layout/README.md` — アプリシェル（ヘッダー、サイドバー、レスポンシブ）
- [ ] `phase-04-timeline/README.md` — タイムライン画面（投稿一覧、作成、詳細）
- [ ] `phase-05-announcements/README.md` — お知らせ画面
- [ ] `phase-06-survey/README.md` — アンケート画面
- [ ] `phase-07-my-page/README.md` — マイページ（プロフィール、投稿履歴）
- [ ] `phase-08-admin/README.md` — 管理者画面（ユーザー管理、統計）
- [ ] `phase-09-notifications/README.md` — 通知UI

### その他
- [ ] `CLAUDE.md` — AI アシスタント用の総合ガイド
- [ ] `PROJECT_REQUIREMENTS.md` — プロジェクト要件書

---

## Phase 1+: フェーズ別実装

各フェーズの実装手順:

1. **CLAUDE.md を読む** — AIがプロジェクトのコンテキストを理解する
2. **関連する設計ドキュメントを読む** — `01-system-design/` 配下の該当ファイル
3. **フェーズのREADMEを読む** — `02-backend/phase-XX/` または `03-frontend/phase-XX/`
4. **実装を開始する** — READMEの手順に従って実装
5. **テストを実行する** — ユニットテスト・動作確認
6. **コミットする** — Conventional Commits形式

### Backend 実装順序
- [ ] Phase 01: Foundation — NestJS基盤、Docker、DB接続
- [ ] Phase 02: Auth — 認証・認可
- [ ] Phase 03: User Management — ユーザー管理
- [ ] Phase 04: Timeline — タイムライン（投稿・コメント・いいね）
- [ ] Phase 05: Announcements — お知らせ
- [ ] Phase 06: Survey — アンケート
- [ ] Phase 07: Notifications — リアルタイム通知
- [ ] Phase 08: File Service — ファイル管理

### Frontend 実装順序
- [ ] Phase 01: Setup — Next.js プロジェクト初期化
- [ ] Phase 02: Auth — ログイン画面・認証フロー
- [ ] Phase 03: Layout — アプリシェル
- [ ] Phase 04: Timeline — タイムライン画面
- [ ] Phase 05: Announcements — お知らせ画面
- [ ] Phase 06: Survey — アンケート画面
- [ ] Phase 07: My Page — マイページ
- [ ] Phase 08: Admin — 管理者画面
- [ ] Phase 09: Notifications — 通知UI

---

## 実装時の注意事項

- バックエンドとフロントエンドは並行して実装可能（同じフェーズ番号を同時進行）
- 各フェーズの完了条件はREADME内のチェックリストに記載
- すべてのUIテキストは日本語で実装すること
- 設計ドキュメントに変更が必要な場合は、先にドキュメントを更新してから実装に反映する
