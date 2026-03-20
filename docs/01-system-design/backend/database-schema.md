# データベーススキーマ定義 (Database Schema)

> コープネット - SQL Server データベース設計

## 1. スキーマ概要

```
coopnet (データベース)
├── users                    ユーザー
├── permissions              権限マスタ
├── user_permissions         ユーザー権限
├── posts                    投稿（日報）
├── post_files               投稿添付ファイル
├── likes                    いいね
├── comments                 コメント
├── announcements            お知らせ
├── announcement_read_status お知らせ既読状態
├── surveys                  アンケート
├── survey_questions         アンケート質問
├── survey_responses         アンケート回答
├── notifications            通知
└── push_subscriptions       プッシュ通知登録
```

### ER図概要

```
users ──┬── posts ──┬── post_files
        │           ├── likes
        │           └── comments
        ├── announcements ── announcement_read_status
        ├── surveys ──┬── survey_questions
        │             └── survey_responses
        ├── notifications
        ├── push_subscriptions
        └── user_permissions ── permissions
```

---

## 2. テーブル定義

### 2.1 users（ユーザー）

社員情報を管理するマスタテーブル。認証情報を含む。

```sql
CREATE TABLE users (
    id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID(),
    employee_id         NVARCHAR(50)        NOT NULL,
    username            NVARCHAR(100)       NOT NULL,
    email               NVARCHAR(255)       NOT NULL,
    password_hash       NVARCHAR(255)       NULL,
    display_name        NVARCHAR(100)       NOT NULL,
    department          NVARCHAR(100)       NOT NULL,
    position            NVARCHAR(100)       NULL,
    avatar_url          NVARCHAR(500)       NULL,
    bio                 NVARCHAR(1000)      NULL,
    auth_provider       NVARCHAR(20)        NOT NULL DEFAULT N'local',
    ms365_id            NVARCHAR(255)       NULL,
    is_active           BIT                 NOT NULL DEFAULT 1,
    last_login_at       DATETIME2(7)        NULL,
    created_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    created_by          UNIQUEIDENTIFIER    NULL,
    is_deleted          BIT                 NOT NULL DEFAULT 0,

    CONSTRAINT PK_users PRIMARY KEY (id),
    CONSTRAINT UQ_users_employee_id UNIQUE (employee_id),
    CONSTRAINT UQ_users_username UNIQUE (username),
    CONSTRAINT UQ_users_email UNIQUE (email),
    CONSTRAINT CK_users_auth_provider CHECK (auth_provider IN (N'local', N'microsoft365'))
);
```

| カラム | 型 | NULL | 説明 |
|--------|------|------|------|
| id | UNIQUEIDENTIFIER | NO | 主キー |
| employee_id | NVARCHAR(50) | NO | 社員番号（ユニーク） |
| username | NVARCHAR(100) | NO | ログインID（ユニーク） |
| email | NVARCHAR(255) | NO | メールアドレス（ユニーク） |
| password_hash | NVARCHAR(255) | YES | パスワードハッシュ（bcrypt）。MS365認証のみの場合NULL |
| display_name | NVARCHAR(100) | NO | 表示名 |
| department | NVARCHAR(100) | NO | 部署 |
| position | NVARCHAR(100) | YES | 役職 |
| avatar_url | NVARCHAR(500) | YES | アバター画像URL（MinIO） |
| bio | NVARCHAR(1000) | YES | 自己紹介 |
| auth_provider | NVARCHAR(20) | NO | 認証プロバイダー（local / microsoft365） |
| ms365_id | NVARCHAR(255) | YES | Microsoft 365 ユーザーID |
| is_active | BIT | NO | アクティブフラグ |
| last_login_at | DATETIME2(7) | YES | 最終ログイン日時 |
| created_at | DATETIME2(7) | NO | 作成日時 |
| updated_at | DATETIME2(7) | NO | 更新日時 |
| created_by | UNIQUEIDENTIFIER | YES | 作成者ID |
| is_deleted | BIT | NO | 論理削除フラグ |

```sql
-- インデックス
CREATE INDEX IX_users_department ON users (department) WHERE is_deleted = 0;
CREATE INDEX IX_users_auth_provider ON users (auth_provider) WHERE is_deleted = 0;
CREATE UNIQUE INDEX IX_users_ms365_id ON users (ms365_id) WHERE ms365_id IS NOT NULL AND is_deleted = 0;
CREATE INDEX IX_users_is_active ON users (is_active) WHERE is_deleted = 0;
```

---

### 2.2 permissions（権限マスタ）

システム権限を定義するマスタテーブル。

```sql
CREATE TABLE permissions (
    id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID(),
    name                NVARCHAR(100)       NOT NULL,
    description         NVARCHAR(500)       NULL,
    created_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    created_by          UNIQUEIDENTIFIER    NULL,
    is_deleted          BIT                 NOT NULL DEFAULT 0,

    CONSTRAINT PK_permissions PRIMARY KEY (id),
    CONSTRAINT UQ_permissions_name UNIQUE (name)
);
```

| カラム | 型 | NULL | 説明 |
|--------|------|------|------|
| id | UNIQUEIDENTIFIER | NO | 主キー |
| name | NVARCHAR(100) | NO | 権限名（例: admin, manage_announcements, manage_surveys） |
| description | NVARCHAR(500) | YES | 権限の説明 |
| created_at | DATETIME2(7) | NO | 作成日時 |
| updated_at | DATETIME2(7) | NO | 更新日時 |
| created_by | UNIQUEIDENTIFIER | YES | 作成者ID |
| is_deleted | BIT | NO | 論理削除フラグ |

**初期データ:**

```sql
INSERT INTO permissions (name, description) VALUES
    (N'admin', N'システム管理者（全権限）'),
    (N'manage_users', N'ユーザー管理'),
    (N'manage_announcements', N'お知らせ管理'),
    (N'manage_surveys', N'アンケート管理'),
    (N'view_admin_dashboard', N'管理者ダッシュボード閲覧');
```

---

### 2.3 user_permissions（ユーザー権限）

ユーザーと権限の多対多関連テーブル。

```sql
CREATE TABLE user_permissions (
    id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID(),
    user_id             UNIQUEIDENTIFIER    NOT NULL,
    permission_id       UNIQUEIDENTIFIER    NOT NULL,
    granted_by          UNIQUEIDENTIFIER    NOT NULL,
    created_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    created_by          UNIQUEIDENTIFIER    NULL,
    is_deleted          BIT                 NOT NULL DEFAULT 0,

    CONSTRAINT PK_user_permissions PRIMARY KEY (id),
    CONSTRAINT FK_user_permissions_users FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT FK_user_permissions_permissions FOREIGN KEY (permission_id) REFERENCES permissions(id),
    CONSTRAINT FK_user_permissions_granted_by FOREIGN KEY (granted_by) REFERENCES users(id),
    CONSTRAINT UQ_user_permissions_user_permission UNIQUE (user_id, permission_id)
);
```

| カラム | 型 | NULL | 説明 |
|--------|------|------|------|
| id | UNIQUEIDENTIFIER | NO | 主キー |
| user_id | UNIQUEIDENTIFIER | NO | ユーザーID（FK: users） |
| permission_id | UNIQUEIDENTIFIER | NO | 権限ID（FK: permissions） |
| granted_by | UNIQUEIDENTIFIER | NO | 権限を付与した管理者ID（FK: users） |
| created_at | DATETIME2(7) | NO | 作成日時 |
| updated_at | DATETIME2(7) | NO | 更新日時 |
| created_by | UNIQUEIDENTIFIER | YES | 作成者ID |
| is_deleted | BIT | NO | 論理削除フラグ |

```sql
CREATE INDEX IX_user_permissions_user_id ON user_permissions (user_id) WHERE is_deleted = 0;
CREATE INDEX IX_user_permissions_permission_id ON user_permissions (permission_id) WHERE is_deleted = 0;
```

---

### 2.4 posts（投稿）

日報投稿を管理するテーブル。`post_date` により過去日の投稿（バックデート）にも対応。

```sql
CREATE TABLE posts (
    id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID(),
    user_id             UNIQUEIDENTIFIER    NOT NULL,
    title               NVARCHAR(200)       NULL,
    content             NVARCHAR(MAX)       NOT NULL,
    post_date           DATE                NOT NULL,
    like_count          INT                 NOT NULL DEFAULT 0,
    comment_count       INT                 NOT NULL DEFAULT 0,
    created_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    created_by          UNIQUEIDENTIFIER    NULL,
    is_deleted          BIT                 NOT NULL DEFAULT 0,

    CONSTRAINT PK_posts PRIMARY KEY (id),
    CONSTRAINT FK_posts_users FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT CK_posts_like_count CHECK (like_count >= 0),
    CONSTRAINT CK_posts_comment_count CHECK (comment_count >= 0)
);
```

| カラム | 型 | NULL | 説明 |
|--------|------|------|------|
| id | UNIQUEIDENTIFIER | NO | 主キー |
| user_id | UNIQUEIDENTIFIER | NO | 投稿者ID（FK: users） |
| title | NVARCHAR(200) | YES | 投稿タイトル |
| content | NVARCHAR(MAX) | NO | 投稿本文 |
| post_date | DATE | NO | 投稿対象日（バックデート対応） |
| like_count | INT | NO | いいね数（非正規化キャッシュ） |
| comment_count | INT | NO | コメント数（非正規化キャッシュ） |
| created_at | DATETIME2(7) | NO | 作成日時 |
| updated_at | DATETIME2(7) | NO | 更新日時 |
| created_by | UNIQUEIDENTIFIER | YES | 作成者ID |
| is_deleted | BIT | NO | 論理削除フラグ |

```sql
-- インデックス
CREATE INDEX IX_posts_user_id ON posts (user_id) WHERE is_deleted = 0;
CREATE INDEX IX_posts_post_date ON posts (post_date DESC) WHERE is_deleted = 0;
CREATE INDEX IX_posts_user_id_post_date ON posts (user_id, post_date) WHERE is_deleted = 0;
CREATE INDEX IX_posts_created_at ON posts (created_at DESC) WHERE is_deleted = 0;
```

---

### 2.5 post_files（投稿添付ファイル）

投稿に添付されたファイルの情報を管理。物理ファイルは MinIO に保存。

```sql
CREATE TABLE post_files (
    id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID(),
    post_id             UNIQUEIDENTIFIER    NOT NULL,
    file_name           NVARCHAR(255)       NOT NULL,
    storage_key         NVARCHAR(500)       NOT NULL,
    file_size           BIGINT              NOT NULL,
    mime_type           NVARCHAR(100)       NOT NULL,
    file_type           NVARCHAR(20)        NOT NULL,
    sort_order          INT                 NOT NULL DEFAULT 0,
    created_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    created_by          UNIQUEIDENTIFIER    NULL,
    is_deleted          BIT                 NOT NULL DEFAULT 0,

    CONSTRAINT PK_post_files PRIMARY KEY (id),
    CONSTRAINT FK_post_files_posts FOREIGN KEY (post_id) REFERENCES posts(id),
    CONSTRAINT CK_post_files_file_type CHECK (file_type IN (N'image', N'video', N'document')),
    CONSTRAINT CK_post_files_file_size CHECK (file_size > 0)
);
```

| カラム | 型 | NULL | 説明 |
|--------|------|------|------|
| id | UNIQUEIDENTIFIER | NO | 主キー |
| post_id | UNIQUEIDENTIFIER | NO | 投稿ID（FK: posts） |
| file_name | NVARCHAR(255) | NO | 元のファイル名 |
| storage_key | NVARCHAR(500) | NO | MinIO オブジェクトキー |
| file_size | BIGINT | NO | ファイルサイズ（バイト） |
| mime_type | NVARCHAR(100) | NO | MIMEタイプ |
| file_type | NVARCHAR(20) | NO | ファイル種別（image / video / document） |
| sort_order | INT | NO | 表示順 |
| created_at | DATETIME2(7) | NO | 作成日時 |
| updated_at | DATETIME2(7) | NO | 更新日時 |
| created_by | UNIQUEIDENTIFIER | YES | 作成者ID |
| is_deleted | BIT | NO | 論理削除フラグ |

```sql
CREATE INDEX IX_post_files_post_id ON post_files (post_id) WHERE is_deleted = 0;
CREATE INDEX IX_post_files_file_type ON post_files (file_type) WHERE is_deleted = 0;
```

---

### 2.6 likes（いいね）

投稿へのいいねを管理。1ユーザーにつき1投稿に1いいねのユニーク制約。

```sql
CREATE TABLE likes (
    id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID(),
    post_id             UNIQUEIDENTIFIER    NOT NULL,
    user_id             UNIQUEIDENTIFIER    NOT NULL,
    created_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    created_by          UNIQUEIDENTIFIER    NULL,
    is_deleted          BIT                 NOT NULL DEFAULT 0,

    CONSTRAINT PK_likes PRIMARY KEY (id),
    CONSTRAINT FK_likes_posts FOREIGN KEY (post_id) REFERENCES posts(id),
    CONSTRAINT FK_likes_users FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT UQ_likes_post_user UNIQUE (post_id, user_id)
);
```

| カラム | 型 | NULL | 説明 |
|--------|------|------|------|
| id | UNIQUEIDENTIFIER | NO | 主キー |
| post_id | UNIQUEIDENTIFIER | NO | 投稿ID（FK: posts） |
| user_id | UNIQUEIDENTIFIER | NO | ユーザーID（FK: users） |
| created_at | DATETIME2(7) | NO | 作成日時 |
| updated_at | DATETIME2(7) | NO | 更新日時 |
| created_by | UNIQUEIDENTIFIER | YES | 作成者ID |
| is_deleted | BIT | NO | 論理削除フラグ |

```sql
CREATE INDEX IX_likes_post_id ON likes (post_id);
CREATE INDEX IX_likes_user_id ON likes (user_id);
```

---

### 2.7 comments（コメント）

投稿へのコメントを管理。

```sql
CREATE TABLE comments (
    id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID(),
    post_id             UNIQUEIDENTIFIER    NOT NULL,
    user_id             UNIQUEIDENTIFIER    NOT NULL,
    content             NVARCHAR(MAX)       NOT NULL,
    created_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    created_by          UNIQUEIDENTIFIER    NULL,
    is_deleted          BIT                 NOT NULL DEFAULT 0,

    CONSTRAINT PK_comments PRIMARY KEY (id),
    CONSTRAINT FK_comments_posts FOREIGN KEY (post_id) REFERENCES posts(id),
    CONSTRAINT FK_comments_users FOREIGN KEY (user_id) REFERENCES users(id)
);
```

| カラム | 型 | NULL | 説明 |
|--------|------|------|------|
| id | UNIQUEIDENTIFIER | NO | 主キー |
| post_id | UNIQUEIDENTIFIER | NO | 投稿ID（FK: posts） |
| user_id | UNIQUEIDENTIFIER | NO | 投稿者ID（FK: users） |
| content | NVARCHAR(MAX) | NO | コメント本文 |
| created_at | DATETIME2(7) | NO | 作成日時 |
| updated_at | DATETIME2(7) | NO | 更新日時 |
| created_by | UNIQUEIDENTIFIER | YES | 作成者ID |
| is_deleted | BIT | NO | 論理削除フラグ |

```sql
CREATE INDEX IX_comments_post_id ON comments (post_id) WHERE is_deleted = 0;
CREATE INDEX IX_comments_user_id ON comments (user_id) WHERE is_deleted = 0;
CREATE INDEX IX_comments_created_at ON comments (created_at DESC) WHERE is_deleted = 0;
```

---

### 2.8 announcements（お知らせ）

管理者が投稿するお知らせを管理。予約公開・掲載期限に対応。

```sql
CREATE TABLE announcements (
    id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID(),
    user_id             UNIQUEIDENTIFIER    NOT NULL,
    title               NVARCHAR(200)       NOT NULL,
    content             NVARCHAR(MAX)       NOT NULL,
    is_pinned           BIT                 NOT NULL DEFAULT 0,
    publish_at          DATETIME2(7)        NULL,
    expires_at          DATETIME2(7)        NULL,
    created_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    created_by          UNIQUEIDENTIFIER    NULL,
    is_deleted          BIT                 NOT NULL DEFAULT 0,

    CONSTRAINT PK_announcements PRIMARY KEY (id),
    CONSTRAINT FK_announcements_users FOREIGN KEY (user_id) REFERENCES users(id)
);
```

| カラム | 型 | NULL | 説明 |
|--------|------|------|------|
| id | UNIQUEIDENTIFIER | NO | 主キー |
| user_id | UNIQUEIDENTIFIER | NO | 投稿者ID（FK: users） |
| title | NVARCHAR(200) | NO | タイトル |
| content | NVARCHAR(MAX) | NO | 本文 |
| is_pinned | BIT | NO | ピン留めフラグ |
| publish_at | DATETIME2(7) | YES | 予約公開日時（NULLは即時公開） |
| expires_at | DATETIME2(7) | YES | 掲載終了日時（NULLは無期限） |
| created_at | DATETIME2(7) | NO | 作成日時 |
| updated_at | DATETIME2(7) | NO | 更新日時 |
| created_by | UNIQUEIDENTIFIER | YES | 作成者ID |
| is_deleted | BIT | NO | 論理削除フラグ |

```sql
CREATE INDEX IX_announcements_publish_at ON announcements (publish_at DESC) WHERE is_deleted = 0;
CREATE INDEX IX_announcements_is_pinned ON announcements (is_pinned) WHERE is_deleted = 0;
CREATE INDEX IX_announcements_user_id ON announcements (user_id) WHERE is_deleted = 0;
```

---

### 2.9 announcement_read_status（お知らせ既読状態）

ユーザーごとのお知らせ既読状態を管理。

```sql
CREATE TABLE announcement_read_status (
    id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID(),
    announcement_id     UNIQUEIDENTIFIER    NOT NULL,
    user_id             UNIQUEIDENTIFIER    NOT NULL,
    read_at             DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    created_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    created_by          UNIQUEIDENTIFIER    NULL,
    is_deleted          BIT                 NOT NULL DEFAULT 0,

    CONSTRAINT PK_announcement_read_status PRIMARY KEY (id),
    CONSTRAINT FK_announcement_read_status_announcements FOREIGN KEY (announcement_id) REFERENCES announcements(id),
    CONSTRAINT FK_announcement_read_status_users FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT UQ_announcement_read_status_announcement_user UNIQUE (announcement_id, user_id)
);
```

| カラム | 型 | NULL | 説明 |
|--------|------|------|------|
| id | UNIQUEIDENTIFIER | NO | 主キー |
| announcement_id | UNIQUEIDENTIFIER | NO | お知らせID（FK: announcements） |
| user_id | UNIQUEIDENTIFIER | NO | ユーザーID（FK: users） |
| read_at | DATETIME2(7) | NO | 既読日時 |
| created_at | DATETIME2(7) | NO | 作成日時 |
| updated_at | DATETIME2(7) | NO | 更新日時 |
| created_by | UNIQUEIDENTIFIER | YES | 作成者ID |
| is_deleted | BIT | NO | 論理削除フラグ |

```sql
CREATE INDEX IX_announcement_read_status_announcement_id ON announcement_read_status (announcement_id);
CREATE INDEX IX_announcement_read_status_user_id ON announcement_read_status (user_id);
```

---

### 2.10 surveys（アンケート）

アンケートを管理。匿名回答・期間設定に対応。

```sql
CREATE TABLE surveys (
    id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID(),
    user_id             UNIQUEIDENTIFIER    NOT NULL,
    title               NVARCHAR(200)       NOT NULL,
    description         NVARCHAR(MAX)       NULL,
    is_anonymous        BIT                 NOT NULL DEFAULT 0,
    is_active           BIT                 NOT NULL DEFAULT 1,
    starts_at           DATETIME2(7)        NOT NULL,
    ends_at             DATETIME2(7)        NOT NULL,
    created_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    created_by          UNIQUEIDENTIFIER    NULL,
    is_deleted          BIT                 NOT NULL DEFAULT 0,

    CONSTRAINT PK_surveys PRIMARY KEY (id),
    CONSTRAINT FK_surveys_users FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT CK_surveys_dates CHECK (ends_at > starts_at)
);
```

| カラム | 型 | NULL | 説明 |
|--------|------|------|------|
| id | UNIQUEIDENTIFIER | NO | 主キー |
| user_id | UNIQUEIDENTIFIER | NO | 作成者ID（FK: users） |
| title | NVARCHAR(200) | NO | アンケートタイトル |
| description | NVARCHAR(MAX) | YES | 説明文 |
| is_anonymous | BIT | NO | 匿名回答フラグ |
| is_active | BIT | NO | 有効フラグ |
| starts_at | DATETIME2(7) | NO | 回答開始日時 |
| ends_at | DATETIME2(7) | NO | 回答終了日時 |
| created_at | DATETIME2(7) | NO | 作成日時 |
| updated_at | DATETIME2(7) | NO | 更新日時 |
| created_by | UNIQUEIDENTIFIER | YES | 作成者ID |
| is_deleted | BIT | NO | 論理削除フラグ |

```sql
CREATE INDEX IX_surveys_user_id ON surveys (user_id) WHERE is_deleted = 0;
CREATE INDEX IX_surveys_is_active ON surveys (is_active) WHERE is_deleted = 0;
CREATE INDEX IX_surveys_ends_at ON surveys (ends_at) WHERE is_deleted = 0;
```

---

### 2.11 survey_questions（アンケート質問）

アンケートの質問項目を管理。選択肢はJSON形式で保存。

```sql
CREATE TABLE survey_questions (
    id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID(),
    survey_id           UNIQUEIDENTIFIER    NOT NULL,
    question_text       NVARCHAR(500)       NOT NULL,
    question_type       NVARCHAR(20)        NOT NULL,
    options             NVARCHAR(MAX)       NULL,
    is_required         BIT                 NOT NULL DEFAULT 1,
    sort_order          INT                 NOT NULL DEFAULT 0,
    created_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    created_by          UNIQUEIDENTIFIER    NULL,
    is_deleted          BIT                 NOT NULL DEFAULT 0,

    CONSTRAINT PK_survey_questions PRIMARY KEY (id),
    CONSTRAINT FK_survey_questions_surveys FOREIGN KEY (survey_id) REFERENCES surveys(id),
    CONSTRAINT CK_survey_questions_question_type CHECK (question_type IN (N'multiple_choice', N'text', N'rating'))
);
```

| カラム | 型 | NULL | 説明 |
|--------|------|------|------|
| id | UNIQUEIDENTIFIER | NO | 主キー |
| survey_id | UNIQUEIDENTIFIER | NO | アンケートID（FK: surveys） |
| question_text | NVARCHAR(500) | NO | 質問文 |
| question_type | NVARCHAR(20) | NO | 質問種別（multiple_choice / text / rating） |
| options | NVARCHAR(MAX) | YES | 選択肢（JSON配列）。multiple_choice の場合必須 |
| is_required | BIT | NO | 必須回答フラグ |
| sort_order | INT | NO | 表示順 |
| created_at | DATETIME2(7) | NO | 作成日時 |
| updated_at | DATETIME2(7) | NO | 更新日時 |
| created_by | UNIQUEIDENTIFIER | YES | 作成者ID |
| is_deleted | BIT | NO | 論理削除フラグ |

```sql
CREATE INDEX IX_survey_questions_survey_id ON survey_questions (survey_id) WHERE is_deleted = 0;
```

**options カラムの JSON 例:**
```json
["選択肢A", "選択肢B", "選択肢C", "その他"]
```

---

### 2.12 survey_responses（アンケート回答）

ユーザーのアンケート回答を管理。

```sql
CREATE TABLE survey_responses (
    id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID(),
    survey_id           UNIQUEIDENTIFIER    NOT NULL,
    question_id         UNIQUEIDENTIFIER    NOT NULL,
    user_id             UNIQUEIDENTIFIER    NOT NULL,
    answer              NVARCHAR(MAX)       NOT NULL,
    created_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    created_by          UNIQUEIDENTIFIER    NULL,
    is_deleted          BIT                 NOT NULL DEFAULT 0,

    CONSTRAINT PK_survey_responses PRIMARY KEY (id),
    CONSTRAINT FK_survey_responses_surveys FOREIGN KEY (survey_id) REFERENCES surveys(id),
    CONSTRAINT FK_survey_responses_questions FOREIGN KEY (question_id) REFERENCES survey_questions(id),
    CONSTRAINT FK_survey_responses_users FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT UQ_survey_responses_question_user UNIQUE (question_id, user_id)
);
```

| カラム | 型 | NULL | 説明 |
|--------|------|------|------|
| id | UNIQUEIDENTIFIER | NO | 主キー |
| survey_id | UNIQUEIDENTIFIER | NO | アンケートID（FK: surveys） |
| question_id | UNIQUEIDENTIFIER | NO | 質問ID（FK: survey_questions） |
| user_id | UNIQUEIDENTIFIER | NO | 回答者ID（FK: users） |
| answer | NVARCHAR(MAX) | NO | 回答内容（テキスト or 選択肢） |
| created_at | DATETIME2(7) | NO | 作成日時 |
| updated_at | DATETIME2(7) | NO | 更新日時 |
| created_by | UNIQUEIDENTIFIER | YES | 作成者ID |
| is_deleted | BIT | NO | 論理削除フラグ |

```sql
CREATE INDEX IX_survey_responses_survey_id ON survey_responses (survey_id);
CREATE INDEX IX_survey_responses_question_id ON survey_responses (question_id);
CREATE INDEX IX_survey_responses_user_id ON survey_responses (user_id);
```

---

### 2.13 notifications（通知）

ユーザーへの通知を管理。ポリモーフィック参照で各種エンティティを参照。

```sql
CREATE TABLE notifications (
    id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID(),
    user_id             UNIQUEIDENTIFIER    NOT NULL,
    type                NVARCHAR(30)        NOT NULL,
    title               NVARCHAR(200)       NOT NULL,
    message             NVARCHAR(500)       NOT NULL,
    reference_type      NVARCHAR(30)        NULL,
    reference_id        UNIQUEIDENTIFIER    NULL,
    actor_id            UNIQUEIDENTIFIER    NULL,
    is_read             BIT                 NOT NULL DEFAULT 0,
    created_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    created_by          UNIQUEIDENTIFIER    NULL,
    is_deleted          BIT                 NOT NULL DEFAULT 0,

    CONSTRAINT PK_notifications PRIMARY KEY (id),
    CONSTRAINT FK_notifications_users FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT FK_notifications_actor FOREIGN KEY (actor_id) REFERENCES users(id),
    CONSTRAINT CK_notifications_type CHECK (type IN (
        N'like', N'comment', N'announcement', N'survey', N'survey_reminder', N'system'
    )),
    CONSTRAINT CK_notifications_reference_type CHECK (reference_type IS NULL OR reference_type IN (
        N'post', N'comment', N'announcement', N'survey'
    ))
);
```

| カラム | 型 | NULL | 説明 |
|--------|------|------|------|
| id | UNIQUEIDENTIFIER | NO | 主キー |
| user_id | UNIQUEIDENTIFIER | NO | 通知先ユーザーID（FK: users） |
| type | NVARCHAR(30) | NO | 通知種別 |
| title | NVARCHAR(200) | NO | 通知タイトル |
| message | NVARCHAR(500) | NO | 通知メッセージ |
| reference_type | NVARCHAR(30) | YES | 参照先種別（post / comment / announcement / survey） |
| reference_id | UNIQUEIDENTIFIER | YES | 参照先ID |
| actor_id | UNIQUEIDENTIFIER | YES | アクション実行者ID（FK: users）。いいね・コメントした人 |
| is_read | BIT | NO | 既読フラグ |
| created_at | DATETIME2(7) | NO | 作成日時 |
| updated_at | DATETIME2(7) | NO | 更新日時 |
| created_by | UNIQUEIDENTIFIER | YES | 作成者ID |
| is_deleted | BIT | NO | 論理削除フラグ |

```sql
CREATE INDEX IX_notifications_user_id_is_read ON notifications (user_id, is_read) WHERE is_deleted = 0;
CREATE INDEX IX_notifications_user_id_created_at ON notifications (user_id, created_at DESC) WHERE is_deleted = 0;
CREATE INDEX IX_notifications_type ON notifications (type) WHERE is_deleted = 0;
CREATE INDEX IX_notifications_reference ON notifications (reference_type, reference_id) WHERE is_deleted = 0;
```

---

### 2.14 push_subscriptions（プッシュ通知登録）

ブラウザプッシュ通知のサブスクリプション情報を管理。

```sql
CREATE TABLE push_subscriptions (
    id                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID(),
    user_id             UNIQUEIDENTIFIER    NOT NULL,
    endpoint            NVARCHAR(500)       NOT NULL,
    p256dh              NVARCHAR(255)       NOT NULL,
    auth                NVARCHAR(255)       NOT NULL,
    user_agent          NVARCHAR(500)       NULL,
    created_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at          DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    created_by          UNIQUEIDENTIFIER    NULL,
    is_deleted          BIT                 NOT NULL DEFAULT 0,

    CONSTRAINT PK_push_subscriptions PRIMARY KEY (id),
    CONSTRAINT FK_push_subscriptions_users FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT UQ_push_subscriptions_endpoint UNIQUE (endpoint)
);
```

| カラム | 型 | NULL | 説明 |
|--------|------|------|------|
| id | UNIQUEIDENTIFIER | NO | 主キー |
| user_id | UNIQUEIDENTIFIER | NO | ユーザーID（FK: users） |
| endpoint | NVARCHAR(500) | NO | Push API エンドポイントURL |
| p256dh | NVARCHAR(255) | NO | 公開鍵 |
| auth | NVARCHAR(255) | NO | 認証シークレット |
| user_agent | NVARCHAR(500) | YES | ブラウザ識別情報 |
| created_at | DATETIME2(7) | NO | 作成日時 |
| updated_at | DATETIME2(7) | NO | 更新日時 |
| created_by | UNIQUEIDENTIFIER | YES | 作成者ID |
| is_deleted | BIT | NO | 論理削除フラグ |

```sql
CREATE INDEX IX_push_subscriptions_user_id ON push_subscriptions (user_id) WHERE is_deleted = 0;
```

---

## 3. トリガー

### updated_at 自動更新トリガー

各テーブルに対して `updated_at` を自動更新するトリガーを作成する。

```sql
-- 例: users テーブル
CREATE TRIGGER TR_users_updated_at
ON users
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE users
    SET updated_at = SYSUTCDATETIME()
    FROM users u
    INNER JOIN inserted i ON u.id = i.id;
END;
GO
```

以下の全テーブルに同様のトリガーを作成:
- `users`, `permissions`, `user_permissions`, `posts`, `post_files`, `likes`, `comments`
- `announcements`, `announcement_read_status`, `surveys`, `survey_questions`, `survey_responses`
- `notifications`, `push_subscriptions`

---

## 4. いいね・コメント数更新トリガー

```sql
-- いいね追加時に posts.like_count を更新
CREATE TRIGGER TR_likes_insert_update_count
ON likes
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE posts
    SET like_count = (
        SELECT COUNT(*) FROM likes WHERE post_id = i.post_id
    )
    FROM posts p
    INNER JOIN inserted i ON p.id = i.post_id;
END;
GO

-- いいね削除時に posts.like_count を更新
CREATE TRIGGER TR_likes_delete_update_count
ON likes
AFTER DELETE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE posts
    SET like_count = (
        SELECT COUNT(*) FROM likes WHERE post_id = d.post_id
    )
    FROM posts p
    INNER JOIN deleted d ON p.id = d.post_id;
END;
GO

-- コメント追加時に posts.comment_count を更新
CREATE TRIGGER TR_comments_insert_update_count
ON comments
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE posts
    SET comment_count = (
        SELECT COUNT(*) FROM comments WHERE post_id = i.post_id AND is_deleted = 0
    )
    FROM posts p
    INNER JOIN inserted i ON p.id = i.post_id;
END;
GO

-- コメント論理削除時に posts.comment_count を更新
CREATE TRIGGER TR_comments_update_update_count
ON comments
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF UPDATE(is_deleted)
    BEGIN
        UPDATE posts
        SET comment_count = (
            SELECT COUNT(*) FROM comments WHERE post_id = i.post_id AND is_deleted = 0
        )
        FROM posts p
        INNER JOIN inserted i ON p.id = i.post_id;
    END
END;
GO
```

---

## 5. 初期データ

```sql
-- 権限マスタ
INSERT INTO permissions (id, name, description) VALUES
    (NEWID(), N'admin', N'システム管理者（全権限）'),
    (NEWID(), N'manage_users', N'ユーザー管理'),
    (NEWID(), N'manage_announcements', N'お知らせ管理'),
    (NEWID(), N'manage_surveys', N'アンケート管理'),
    (NEWID(), N'view_admin_dashboard', N'管理者ダッシュボード閲覧');

-- システム管理者ユーザー（初期セットアップ用）
DECLARE @adminId UNIQUEIDENTIFIER = NEWID();
DECLARE @adminPermId UNIQUEIDENTIFIER;

INSERT INTO users (id, employee_id, username, email, password_hash, display_name, department, auth_provider)
VALUES (@adminId, N'ADMIN001', N'admin', N'admin@company.co.jp',
        N'$2b$10$...', -- bcrypt ハッシュ（初期パスワード）
        N'システム管理者', N'情報システム部', N'local');

SELECT @adminPermId = id FROM permissions WHERE name = N'admin';

INSERT INTO user_permissions (user_id, permission_id, granted_by)
VALUES (@adminId, @adminPermId, @adminId);
```
