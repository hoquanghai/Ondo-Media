# データ移行計画 (Data Migration Plan)

> コープネット - 旧社内SNSからの移行

## 1. 概要

| 項目 | 内容 |
|------|------|
| 移行元 | 旧社内SNSシステム（SQL Server） |
| 移行先 | 新コープネットシステム（SQL Server） |
| 移行種別 | データのみ移行（アプリケーションは新規構築） |
| 対象データ | ユーザー、投稿、いいね、コメント、添付ファイル |
| 対象外 | アプリケーション設定、セッション情報、ログ |

## 2. 移行対象データ

### 2.1 データ一覧

| # | 対象 | 旧テーブル | 新テーブル | 想定件数 | 優先度 |
|---|------|-----------|-----------|----------|--------|
| 1 | ユーザー | `Member` | `users` | ~150 | 必須 |
| 2 | 投稿 | `Diary` / `Post` | `posts` | ~50,000 | 必須 |
| 3 | いいね | `DiaryLike` / `PostLike` | `likes` | ~100,000 | 必須 |
| 4 | コメント | `DiaryComment` / `PostComment` | `comments` | ~30,000 | 必須 |
| 5 | 添付ファイル | `DiaryFile` / `PostFile` | `post_files` | ~20,000 | 必須 |

### 2.2 移行対象外データ

- お知らせ（`announcements`）: 新規スタートのため移行なし
- アンケート（`surveys`）: 新規機能のため該当データなし
- 通知（`notifications`）: 新規スタートのため移行なし
- プッシュ通知登録: 新規登録が必要
- 権限（`permissions`）: 新規設定

---

## 3. マッピング定義

### 3.1 ユーザーテーブル

| 旧カラム（Member） | 新カラム（users） | 変換ルール |
|---------------------|-------------------|------------|
| `MemberId` (INT) | `id` (UNIQUEIDENTIFIER) | NEWID() 生成、マッピングテーブルで対応付け |
| `EmployeeNo` | `employee_id` | そのままコピー |
| `LoginId` | `username` | そのままコピー |
| `Email` | `email` | そのままコピー |
| `PasswordHash` | `password_hash` | 再ハッシュ（bcrypt へ統一） |
| `DisplayName` | `display_name` | そのままコピー |
| `Department` | `department` | 部署コード → 部署名変換 |
| `Position` | `position` | そのままコピー |
| `ProfileImage` | `avatar_url` | MinIO へ移行後のパスに変換 |
| `Introduction` | `bio` | そのままコピー |
| — | `auth_provider` | `'local'` を設定 |
| — | `ms365_id` | NULL |
| `IsActive` | `is_active` | そのままコピー |
| `LastLoginDate` | `last_login_at` | UTC に変換 |
| `CreatedDate` | `created_at` | UTC に変換 |
| `UpdatedDate` | `updated_at` | UTC に変換 |
| — | `created_by` | NULL (移行データ) |
| `IsDeleted` | `is_deleted` | そのままコピー |

### 3.2 投稿テーブル

| 旧カラム（Diary/Post） | 新カラム（posts） | 変換ルール |
|------------------------|-------------------|------------|
| `PostId` (INT) | `id` (UNIQUEIDENTIFIER) | NEWID() 生成 |
| `MemberId` | `user_id` | マッピングテーブルで変換 |
| `Title` | `title` | そのままコピー（NULLの場合は本文先頭30文字） |
| `Content` | `content` | HTML → Markdown 変換 |
| `PostDate` | `post_date` | DATE 型に変換 |
| `LikeCount` | `like_count` | 再集計 |
| `CommentCount` | `comment_count` | 再集計 |
| `CreatedDate` | `created_at` | UTC に変換 |
| `UpdatedDate` | `updated_at` | UTC に変換 |
| `MemberId` | `created_by` | マッピングテーブルで変換 |
| `IsDeleted` | `is_deleted` | そのままコピー |

### 3.3 いいねテーブル

| 旧カラム（DiaryLike/PostLike） | 新カラム（likes） | 変換ルール |
|-------------------------------|-------------------|------------|
| — | `id` (UNIQUEIDENTIFIER) | NEWID() 生成 |
| `PostId` | `post_id` | マッピングテーブルで変換 |
| `MemberId` | `user_id` | マッピングテーブルで変換 |
| `CreatedDate` | `created_at` | UTC に変換 |

### 3.4 コメントテーブル

| 旧カラム（DiaryComment/PostComment） | 新カラム（comments） | 変換ルール |
|------------------------------------|---------------------|------------|
| `CommentId` (INT) | `id` (UNIQUEIDENTIFIER) | NEWID() 生成 |
| `PostId` | `post_id` | マッピングテーブルで変換 |
| `MemberId` | `user_id` | マッピングテーブルで変換 |
| `Content` | `content` | そのままコピー |
| `CreatedDate` | `created_at` | UTC に変換 |
| `UpdatedDate` | `updated_at` | UTC に変換 |
| `MemberId` | `created_by` | マッピングテーブルで変換 |
| `IsDeleted` | `is_deleted` | そのままコピー |

### 3.5 添付ファイルテーブル

| 旧カラム（DiaryFile/PostFile） | 新カラム（post_files） | 変換ルール |
|-------------------------------|----------------------|------------|
| — | `id` (UNIQUEIDENTIFIER) | NEWID() 生成 |
| `PostId` | `post_id` | マッピングテーブルで変換 |
| `FileName` | `file_name` | そのままコピー |
| `FilePath` | `storage_key` | MinIO キーに変換 |
| `FileSize` | `file_size` | そのままコピー |
| `MimeType` | `mime_type` | そのままコピー |
| — | `file_type` | MIME タイプから判定 (image/video/document) |
| `SortOrder` | `sort_order` | そのままコピー |
| `CreatedDate` | `created_at` | UTC に変換 |

---

## 4. マッピングテーブル

移行時に旧ID → 新ID の対応を管理するため、一時マッピングテーブルを作成する。

```sql
-- ユーザーマッピング
CREATE TABLE migration_user_map (
    old_member_id   INT                 NOT NULL,
    new_user_id     UNIQUEIDENTIFIER    NOT NULL,
    migrated_at     DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_migration_user_map PRIMARY KEY (old_member_id)
);

-- 投稿マッピング
CREATE TABLE migration_post_map (
    old_post_id     INT                 NOT NULL,
    new_post_id     UNIQUEIDENTIFIER    NOT NULL,
    migrated_at     DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_migration_post_map PRIMARY KEY (old_post_id)
);

-- コメントマッピング
CREATE TABLE migration_comment_map (
    old_comment_id  INT                 NOT NULL,
    new_comment_id  UNIQUEIDENTIFIER    NOT NULL,
    migrated_at     DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_migration_comment_map PRIMARY KEY (old_comment_id)
);
```

> マッピングテーブルは移行完了後、検証期間（2週間）を経て削除する。

---

## 5. 移行スクリプト構成

```
scripts/migration/
├── 00-setup/
│   ├── 01-create-mapping-tables.sql          # マッピングテーブル作成
│   └── 02-create-migration-log-table.sql     # 移行ログテーブル作成
├── 01-users/
│   ├── 01-migrate-users.sql                  # ユーザー移行
│   └── 02-verify-users.sql                   # ユーザー検証
├── 02-posts/
│   ├── 01-migrate-posts.sql                  # 投稿移行
│   └── 02-verify-posts.sql                   # 投稿検証
├── 03-likes/
│   ├── 01-migrate-likes.sql                  # いいね移行
│   └── 02-verify-likes.sql                   # いいね検証
├── 04-comments/
│   ├── 01-migrate-comments.sql               # コメント移行
│   └── 02-verify-comments.sql                # コメント検証
├── 05-files/
│   ├── 01-migrate-file-records.sql           # ファイルレコード移行
│   ├── 02-migrate-file-blobs.ts              # 物理ファイル→MinIO移行（Node.js）
│   └── 03-verify-files.sql                   # ファイル検証
├── 06-recount/
│   ├── 01-recount-likes.sql                  # いいね数再集計
│   └── 02-recount-comments.sql               # コメント数再集計
├── 07-cleanup/
│   └── 01-drop-mapping-tables.sql            # マッピングテーブル削除
├── rollback/
│   ├── 01-rollback-users.sql                 # ユーザーロールバック
│   ├── 02-rollback-posts.sql                 # 投稿ロールバック
│   ├── 03-rollback-likes.sql                 # いいねロールバック
│   ├── 04-rollback-comments.sql              # コメントロールバック
│   └── 05-rollback-files.sql                 # ファイルロールバック
└── run-migration.sh                          # 移行実行スクリプト
```

### 実行順序

1. `00-setup` — マッピングテーブル・ログテーブル作成
2. `01-users` — ユーザー移行（他テーブルの外部キー依存元）
3. `02-posts` — 投稿移行
4. `03-likes` — いいね移行
5. `04-comments` — コメント移行
6. `05-files` — ファイル移行（レコード + 物理ファイル）
7. `06-recount` — カウント再集計
8. **検証**（各段階で実施）
9. `07-cleanup` — 検証期間後にマッピングテーブル削除

---

## 6. ファイル移行（物理ファイル → MinIO）

### 移行手順

1. 旧システムのファイルストレージパスを取得
2. ファイルを読み取り、MinIO の `coopnet` バケットにアップロード
3. 新しい `storage_key` を `post_files` テーブルに記録

### MinIO キー構造

```
posts/{post_id}/{sort_order}_{original_filename}
```

例: `posts/550e8400-e29b-41d4-a716-446655440000/01_photo.jpg`

### 注意事項

- ファイルサイズが大きい場合はマルチパートアップロードを使用
- 移行中のネットワーク帯域に注意（夜間実行推奨）
- ファイル移行は最も時間がかかるため、先行して実行可能

---

## 7. 検証チェックリスト

### 7.1 件数検証

| チェック項目 | 検証SQL | 期待結果 |
|-------------|---------|----------|
| ユーザー数一致 | `SELECT COUNT(*) FROM users WHERE is_deleted = 0` | 旧システムのアクティブユーザー数と一致 |
| 投稿数一致 | `SELECT COUNT(*) FROM posts WHERE is_deleted = 0` | 旧システムの投稿数と一致 |
| いいね数一致 | `SELECT COUNT(*) FROM likes` | 旧システムのいいね数と一致 |
| コメント数一致 | `SELECT COUNT(*) FROM comments WHERE is_deleted = 0` | 旧システムのコメント数と一致 |
| ファイル数一致 | `SELECT COUNT(*) FROM post_files` | 旧システムのファイル数と一致 |

### 7.2 データ整合性検証

| チェック項目 | 検証内容 |
|-------------|----------|
| 外部キー整合性 | すべての `user_id` が `users` テーブルに存在する |
| 外部キー整合性 | すべての `post_id` が `posts` テーブルに存在する |
| カウント整合性 | `posts.like_count` = 実際の `likes` 件数 |
| カウント整合性 | `posts.comment_count` = 実際の `comments` 件数 |
| ファイル整合性 | `post_files` の全レコードに対応する MinIO オブジェクトが存在する |
| 日付整合性 | すべての日時が UTC で保存されている |
| 文字化け確認 | 日本語テキストが正しく表示される（NVARCHAR） |

### 7.3 機能検証

| チェック項目 | 検証内容 |
|-------------|----------|
| ログイン | 移行したユーザーでログインできる |
| 投稿表示 | 移行した投稿がタイムラインに正しく表示される |
| 画像表示 | 移行した画像が正しく表示される |
| いいね表示 | 移行したいいねが正しく反映されている |
| コメント表示 | 移行したコメントが正しく表示される |

---

## 8. ロールバック計画

### ロールバックトリガー

以下の場合にロールバックを実行する:

- データ件数の不一致が 1% を超える場合
- 外部キー整合性エラーが検出された場合
- 文字化けが発生した場合
- 移行後の機能検証で重大な問題が発見された場合

### ロールバック手順

1. **新システムの停止**
   ```bash
   docker-compose down
   ```

2. **移行データの削除**（移行マッピングテーブルを基に対象データを特定）
   ```sql
   -- 依存関係の逆順で削除
   DELETE FROM post_files WHERE post_id IN (SELECT new_post_id FROM migration_post_map);
   DELETE FROM likes WHERE post_id IN (SELECT new_post_id FROM migration_post_map);
   DELETE FROM comments WHERE post_id IN (SELECT new_post_id FROM migration_post_map);
   DELETE FROM posts WHERE id IN (SELECT new_post_id FROM migration_post_map);
   DELETE FROM users WHERE id IN (SELECT new_user_id FROM migration_user_map);
   ```

3. **MinIO ファイルの削除**
   ```bash
   mc rm --recursive --force myminio/coopnet/posts/
   ```

4. **マッピングテーブルのクリア**
   ```sql
   TRUNCATE TABLE migration_user_map;
   TRUNCATE TABLE migration_post_map;
   TRUNCATE TABLE migration_comment_map;
   ```

5. **旧システムの再稼働**確認

---

## 9. タイムライン

| 日程 | 作業 | 担当 | 備考 |
|------|------|------|------|
| 4/14 (月) | 移行スクリプト開発完了 | 開発チーム | |
| 4/16 (水) | 開発環境での移行テスト (1回目) | 開発チーム | |
| 4/21 (月) | 開発環境での移行テスト (2回目) | 開発チーム | 問題修正後 |
| 4/23 (水) | ステージング環境構築 | インフラ | |
| 4/28 (月) | **ドライラン（ステージング環境）** | 全員 | 本番同等データで実施 |
| 4/29 (火) | ドライラン結果検証・問題修正 | 開発チーム | |
| 4/30 (水) | **本番移行** | 全員 | 下記詳細スケジュール参照 |
| 5/1 (木)〜5/14 (水) | 検証期間 | 全員 | 2週間の並行稼働 |
| 5/15 (木) | マッピングテーブル削除・旧システム停止 | インフラ | |

### 4/30 本番移行 詳細スケジュール

| 時刻 | 作業 | 所要時間 |
|------|------|----------|
| 18:00 | 旧システムを読み取り専用モードに変更 | 5分 |
| 18:05 | 旧データベースのバックアップ取得 | 15分 |
| 18:20 | ユーザーデータ移行 | 5分 |
| 18:25 | 投稿データ移行 | 20分 |
| 18:45 | いいね・コメントデータ移行 | 15分 |
| 19:00 | ファイルデータ移行（レコード + MinIO） | 60分 |
| 20:00 | カウント再集計 | 10分 |
| 20:10 | データ検証 | 30分 |
| 20:40 | 機能検証 | 20分 |
| 21:00 | 新システム公開 or ロールバック判断 | — |

> **想定所要時間: 約3時間**（18:00〜21:00）
>
> ファイル移行は事前に実行可能（差分のみ本番当日に実行）

---

## 10. パスワード移行について

旧システムのパスワードハッシュアルゴリズムが異なる場合の対応:

### 方針: 初回ログイン時にパスワード再設定

1. 移行時: `password_hash` に旧ハッシュを仮保存（プレフィックス `LEGACY:` 付き）
2. 初回ログイン時:
   a. `LEGACY:` プレフィックスを検出
   b. 旧アルゴリズムで検証
   c. 成功した場合、bcrypt で再ハッシュして保存
   d. `LEGACY:` プレフィックスを除去
3. 一定期間後（移行後1ヶ月）: 未変換ユーザーにパスワードリセットを案内

### 代替方針: Microsoft 365 認証への一本化

- MS365 認証を導入済みの場合、パスワード移行をスキップ
- 全ユーザーに MS365 ログインを案内
- ローカルパスワードは管理者のみ使用
