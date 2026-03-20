# API エンドポイント仕様 (API Endpoints)

> コープネット - RESTful API 仕様書
>
> ベースURL: `/api/v1`
> 認証: Bearer Token (JWT)

---

## 1. 認証 (Auth)

### POST `/api/v1/auth/login`

ローカル認証でログイン。

| 項目 | 内容 |
|------|------|
| 認証 | 不要 |
| Content-Type | application/json |

**リクエスト:**
```json
{
  "username": "tanaka",
  "password": "password123"
}
```

**バリデーション:**
- `username`: 必須、1〜100文字
- `password`: 必須、8〜128文字

**レスポンス (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "employeeId": "EMP001",
      "username": "tanaka",
      "email": "tanaka@company.co.jp",
      "displayName": "田中太郎",
      "department": "営業部",
      "position": "主任",
      "avatarUrl": null,
      "bio": null,
      "authProvider": "local",
      "isActive": true,
      "lastLoginAt": "2026-03-20T09:00:00.000Z",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-03-20T09:00:00.000Z"
    }
  },
  "meta": { "timestamp": "2026-03-20T09:00:00.000Z" }
}
```

**エラー (401):**
```json
{
  "success": false,
  "error": { "code": "UNAUTHORIZED", "message": "ユーザー名またはパスワードが正しくありません" },
  "meta": { "timestamp": "2026-03-20T09:00:00.000Z" }
}
```

---

### POST `/api/v1/auth/login/microsoft`

Microsoft 365 認証でログイン。

| 項目 | 内容 |
|------|------|
| 認証 | 不要 |
| Content-Type | application/json |

**リクエスト:**
```json
{
  "accessToken": "eyJ0eXAiOiJKV1QiLCJub25..."
}
```

**バリデーション:**
- `accessToken`: 必須

**レスポンス:** ログインと同一形式 (200)

---

### POST `/api/v1/auth/refresh`

アクセストークンをリフレッシュ。

| 項目 | 内容 |
|------|------|
| 認証 | 不要 |
| Content-Type | application/json |

**リクエスト:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**レスポンス (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900
  },
  "meta": { "timestamp": "2026-03-20T09:00:00.000Z" }
}
```

**エラー (401):** `TOKEN_EXPIRED` — リフレッシュトークン期限切れ

---

### POST `/api/v1/auth/logout`

ログアウト（リフレッシュトークンを無効化）。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |
| Content-Type | application/json |

**リクエスト:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**レスポンス (200):**
```json
{
  "success": true,
  "data": null,
  "meta": { "timestamp": "2026-03-20T09:00:00.000Z" }
}
```

---

### GET `/api/v1/auth/me`

現在のユーザー情報を取得。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |

**レスポンス (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-...",
    "employeeId": "EMP001",
    "username": "tanaka",
    "email": "tanaka@company.co.jp",
    "displayName": "田中太郎",
    "department": "営業部",
    "permissions": ["admin", "manage_announcements"]
  },
  "meta": { "timestamp": "2026-03-20T09:00:00.000Z" }
}
```

---

## 2. 投稿 (Posts)

### GET `/api/v1/posts`

投稿一覧を取得。日付でフィルタ可能。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |

**クエリパラメータ:**

| パラメータ | 型 | デフォルト | 説明 |
|-----------|------|----------|------|
| `page` | number | 1 | ページ番号 |
| `pageSize` | number | 20 | 1ページあたりの件数（最大100） |
| `date` | string | — | 日付フィルタ（YYYY-MM-DD） |
| `userId` | string | — | ユーザーIDフィルタ |
| `sortBy` | string | `createdAt` | ソートキー（`createdAt` / `postDate`） |
| `sortOrder` | string | `desc` | ソート順（`asc` / `desc`） |

**レスポンス (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-...",
      "userId": "660e8400-...",
      "title": "本日の営業報告",
      "content": "今日は3件の顧客訪問を行いました...",
      "postDate": "2026-03-20",
      "likeCount": 5,
      "commentCount": 2,
      "isLiked": true,
      "createdAt": "2026-03-20T08:30:00.000Z",
      "updatedAt": "2026-03-20T08:30:00.000Z",
      "user": {
        "id": "660e8400-...",
        "displayName": "田中太郎",
        "department": "営業部",
        "avatarUrl": null
      },
      "files": [
        {
          "id": "770e8400-...",
          "fileName": "photo.jpg",
          "fileType": "image",
          "fileSize": 204800,
          "mimeType": "image/jpeg",
          "url": "https://minio.internal/coopnet/posts/..."
        }
      ]
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 150,
    "totalPages": 8,
    "timestamp": "2026-03-20T09:00:00.000Z"
  }
}
```

---

### GET `/api/v1/posts/:id`

投稿詳細を取得（コメント含む）。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |

**パスパラメータ:** `id` — 投稿ID (UUID)

**レスポンス (200):** 投稿オブジェクト（`comments` 配列含む）

---

### POST `/api/v1/posts`

投稿を作成。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |
| Content-Type | multipart/form-data |

**リクエスト:**

| フィールド | 型 | 必須 | 説明 |
|-----------|------|------|------|
| `title` | string | いいえ | タイトル（最大200文字） |
| `content` | string | はい | 本文 |
| `postDate` | string | はい | 投稿対象日（YYYY-MM-DD） |
| `files` | File[] | いいえ | 添付ファイル（最大5ファイル、各10MB以下） |

**バリデーション:**
- `content`: 必須、1文字以上
- `postDate`: 必須、有効な日付、未来日は当日まで
- `files`: 許可MIMEタイプ: image/jpeg, image/png, image/gif, image/webp, video/mp4, application/pdf, application/vnd.openxmlformats-officedocument.*
- 合計ファイルサイズ: 50MB以下

**レスポンス (201):** 作成された投稿オブジェクト

---

### PATCH `/api/v1/posts/:id`

投稿を更新。本人のみ可能。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |
| Content-Type | application/json |

**リクエスト:**
```json
{
  "title": "更新後タイトル",
  "content": "更新後の本文",
  "postDate": "2026-03-19"
}
```

**バリデーション:** 作成時と同じ（全フィールド任意）

**レスポンス (200):** 更新された投稿オブジェクト

**エラー (403):** 他人の投稿を更新しようとした場合

---

### DELETE `/api/v1/posts/:id`

投稿を論理削除。本人または管理者のみ可能。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |

**レスポンス (200):**
```json
{ "success": true, "data": null, "meta": { "timestamp": "..." } }
```

---

### GET `/api/v1/posts/dates`

日付別の投稿件数を取得（カレンダー表示用）。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |

**クエリパラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| `year` | number | はい | 年 |
| `month` | number | はい | 月（1-12） |
| `userId` | string | いいえ | 特定ユーザーでフィルタ |

**レスポンス (200):**
```json
{
  "success": true,
  "data": [
    { "date": "2026-03-01", "count": 45 },
    { "date": "2026-03-02", "count": 38 },
    { "date": "2026-03-03", "count": 50 }
  ],
  "meta": { "timestamp": "..." }
}
```

---

### POST `/api/v1/posts/:id/like`

投稿にいいねする。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |

**レスポンス (201):**
```json
{
  "success": true,
  "data": { "postId": "550e8400-...", "likeCount": 6 },
  "meta": { "timestamp": "..." }
}
```

**エラー (409):** 既にいいね済みの場合

---

### DELETE `/api/v1/posts/:id/like`

いいねを取り消す。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |

**レスポンス (200):**
```json
{
  "success": true,
  "data": { "postId": "550e8400-...", "likeCount": 5 },
  "meta": { "timestamp": "..." }
}
```

---

### GET `/api/v1/posts/:id/comments`

投稿のコメント一覧を取得。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |

**クエリパラメータ:** `page`, `pageSize`

**レスポンス (200):** ページネーション付きコメント配列

---

### POST `/api/v1/posts/:id/comments`

コメントを追加。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |
| Content-Type | application/json |

**リクエスト:**
```json
{
  "content": "素晴らしい報告ですね！"
}
```

**バリデーション:**
- `content`: 必須、1〜2000文字

**レスポンス (201):** 作成されたコメントオブジェクト

---

### DELETE `/api/v1/posts/:postId/comments/:commentId`

コメントを論理削除。本人または管理者のみ可能。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |

**レスポンス (200):** `{ "success": true, "data": null }`

---

## 3. お知らせ (Announcements)

### GET `/api/v1/announcements`

お知らせ一覧を取得。公開中のもののみ返す。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |

**クエリパラメータ:** `page`, `pageSize`

**レスポンス (200):** ページネーション付きお知らせ配列（`isRead` フラグ含む）。ピン留めが先頭。

---

### GET `/api/v1/announcements/:id`

お知らせ詳細を取得。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |

**レスポンス (200):** お知らせオブジェクト

---

### POST `/api/v1/announcements`

お知らせを作成。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |
| 権限 | `manage_announcements` または `admin` |
| Content-Type | application/json |

**リクエスト:**
```json
{
  "title": "年末年始の営業について",
  "content": "12月29日から1月3日まで...",
  "isPinned": true,
  "publishAt": null,
  "expiresAt": "2026-04-01T00:00:00.000Z"
}
```

**バリデーション:**
- `title`: 必須、1〜200文字
- `content`: 必須
- `isPinned`: 任意、boolean
- `publishAt`: 任意、ISO 8601
- `expiresAt`: 任意、ISO 8601（`publishAt` より後）

**レスポンス (201):** 作成されたお知らせオブジェクト

---

### PATCH `/api/v1/announcements/:id`

お知らせを更新。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |
| 権限 | `manage_announcements` または `admin` |

**リクエスト:** 作成時と同じフィールド（全フィールド任意）

**レスポンス (200):** 更新されたお知らせオブジェクト

---

### DELETE `/api/v1/announcements/:id`

お知らせを論理削除。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |
| 権限 | `manage_announcements` または `admin` |

**レスポンス (200):** `{ "success": true, "data": null }`

---

### POST `/api/v1/announcements/:id/read`

お知らせを既読にする。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |

**レスポンス (201):**
```json
{ "success": true, "data": { "announcementId": "...", "readAt": "2026-03-20T09:00:00.000Z" } }
```

---

## 4. アンケート (Surveys)

### GET `/api/v1/surveys`

アンケート一覧を取得。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |

**クエリパラメータ:** `page`, `pageSize`, `isActive` (boolean)

**レスポンス (200):** ページネーション付きアンケート配列（`hasResponded`, `responseCount` 含む）

---

### GET `/api/v1/surveys/:id`

アンケート詳細を取得（質問含む）。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |

**レスポンス (200):** アンケートオブジェクト（`questions` 配列含む）

---

### POST `/api/v1/surveys`

アンケートを作成。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |
| 権限 | `manage_surveys` または `admin` |
| Content-Type | application/json |

**リクエスト:**
```json
{
  "title": "社員旅行アンケート",
  "description": "今年の社員旅行について...",
  "isAnonymous": false,
  "startsAt": "2026-03-20T00:00:00.000Z",
  "endsAt": "2026-03-31T23:59:59.000Z",
  "questions": [
    {
      "questionText": "希望する行き先を選んでください",
      "questionType": "multiple_choice",
      "options": ["沖縄", "北海道", "京都", "その他"],
      "isRequired": true,
      "sortOrder": 1
    },
    {
      "questionText": "その他の希望があればご記入ください",
      "questionType": "text",
      "isRequired": false,
      "sortOrder": 2
    },
    {
      "questionText": "昨年の社員旅行の満足度",
      "questionType": "rating",
      "isRequired": true,
      "sortOrder": 3
    }
  ]
}
```

**バリデーション:**
- `title`: 必須、1〜200文字
- `startsAt`: 必須、ISO 8601
- `endsAt`: 必須、ISO 8601、`startsAt` より後
- `questions`: 必須、1件以上
- `questions[].questionText`: 必須、1〜500文字
- `questions[].questionType`: 必須、`multiple_choice` / `text` / `rating`
- `questions[].options`: `multiple_choice` の場合必須、2件以上
- `questions[].sortOrder`: 必須、正の整数

**レスポンス (201):** 作成されたアンケートオブジェクト

---

### PATCH `/api/v1/surveys/:id`

アンケートを更新。回答済みの場合は質問の変更不可。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |
| 権限 | `manage_surveys` または `admin` |

**レスポンス (200):** 更新されたアンケートオブジェクト

---

### DELETE `/api/v1/surveys/:id`

アンケートを論理削除。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |
| 権限 | `manage_surveys` または `admin` |

**レスポンス (200):** `{ "success": true, "data": null }`

---

### POST `/api/v1/surveys/:id/responses`

アンケートに回答。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |
| Content-Type | application/json |

**リクエスト:**
```json
{
  "answers": [
    { "questionId": "q1-uuid", "answer": "沖縄" },
    { "questionId": "q2-uuid", "answer": "温泉がある場所が良いです" },
    { "questionId": "q3-uuid", "answer": "4" }
  ]
}
```

**バリデーション:**
- 必須質問への回答が含まれていること
- アンケート期間内であること
- 未回答であること（二重回答不可）
- `multiple_choice` の回答が選択肢に含まれること
- `rating` の回答が 1〜5 の整数であること

**レスポンス (201):**
```json
{ "success": true, "data": { "surveyId": "...", "respondedAt": "2026-03-20T09:00:00.000Z" } }
```

**エラー (409):** 既に回答済みの場合
**エラー (422):** アンケート期間外の場合

---

### GET `/api/v1/surveys/:id/results`

アンケート結果を取得（管理者用）。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |
| 権限 | `manage_surveys` または `admin` |

**レスポンス (200):**
```json
{
  "success": true,
  "data": {
    "surveyId": "...",
    "totalResponses": 85,
    "questions": [
      {
        "questionId": "q1-uuid",
        "questionText": "希望する行き先を選んでください",
        "questionType": "multiple_choice",
        "responses": {
          "type": "multiple_choice",
          "options": [
            { "option": "沖縄", "count": 30, "percentage": 35.3 },
            { "option": "北海道", "count": 25, "percentage": 29.4 },
            { "option": "京都", "count": 20, "percentage": 23.5 },
            { "option": "その他", "count": 10, "percentage": 11.8 }
          ]
        }
      }
    ]
  },
  "meta": { "timestamp": "..." }
}
```

---

### GET `/api/v1/surveys/:id/export`

アンケート結果をExcelでエクスポート。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |
| 権限 | `manage_surveys` または `admin` |

**レスポンス (200):**
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition: `attachment; filename="survey_results_YYYY-MM-DD.xlsx"`

---

## 5. ユーザー (Users)

### GET `/api/v1/users`

ユーザー一覧を取得。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |

**クエリパラメータ:**

| パラメータ | 型 | デフォルト | 説明 |
|-----------|------|----------|------|
| `page` | number | 1 | ページ番号 |
| `pageSize` | number | 20 | 件数 |
| `search` | string | — | 名前・部署で検索 |
| `department` | string | — | 部署フィルタ |

**レスポンス (200):** ページネーション付きユーザー配列（パスワードハッシュ除く）

---

### GET `/api/v1/users/:id`

ユーザープロフィールを取得。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |

**レスポンス (200):** ユーザーオブジェクト

---

### GET `/api/v1/users/:id/stats`

ユーザー統計を取得。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |

**レスポンス (200):**
```json
{
  "success": true,
  "data": {
    "totalPosts": 245,
    "totalLikesReceived": 1230,
    "totalCommentsReceived": 456,
    "currentStreak": 15,
    "longestStreak": 45,
    "thisMonthPosts": 18,
    "lastPostDate": "2026-03-20"
  },
  "meta": { "timestamp": "..." }
}
```

---

### GET `/api/v1/users/:id/posts`

特定ユーザーの投稿一覧を取得。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |

**クエリパラメータ:** `page`, `pageSize`, `date`

**レスポンス (200):** ページネーション付き投稿配列

---

### PATCH `/api/v1/users/me`

自分のプロフィールを更新。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |
| Content-Type | multipart/form-data |

**リクエスト:**

| フィールド | 型 | 必須 | 説明 |
|-----------|------|------|------|
| `displayName` | string | いいえ | 表示名（1〜100文字） |
| `bio` | string | いいえ | 自己紹介（最大1000文字） |
| `avatar` | File | いいえ | アバター画像（JPEG/PNG、2MB以下） |

**レスポンス (200):** 更新されたユーザーオブジェクト

---

## 6. 通知 (Notifications)

### GET `/api/v1/notifications`

通知一覧を取得。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |

**クエリパラメータ:** `page`, `pageSize`, `isRead` (boolean)

**レスポンス (200):** ページネーション付き通知配列（`actor` 情報含む）

---

### GET `/api/v1/notifications/unread-count`

未読通知件数を取得。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |

**レスポンス (200):**
```json
{
  "success": true,
  "data": { "count": 5 },
  "meta": { "timestamp": "..." }
}
```

---

### PATCH `/api/v1/notifications/:id/read`

通知を既読にする。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |

**レスポンス (200):**
```json
{ "success": true, "data": { "id": "...", "isRead": true } }
```

---

### PATCH `/api/v1/notifications/read-all`

すべての通知を既読にする。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |

**レスポンス (200):**
```json
{ "success": true, "data": { "updatedCount": 5 } }
```

---

### POST `/api/v1/notifications/push-subscribe`

プッシュ通知を登録。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |
| Content-Type | application/json |

**リクエスト:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0...",
  "auth": "tBHItJI5svbpC7SsHCM8gA==",
  "userAgent": "Mozilla/5.0..."
}
```

**レスポンス (201):**
```json
{ "success": true, "data": { "id": "..." } }
```

---

### DELETE `/api/v1/notifications/push-subscribe`

プッシュ通知登録を解除。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |
| Content-Type | application/json |

**リクエスト:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/..."
}
```

**レスポンス (200):** `{ "success": true, "data": null }`

---

## 7. ファイル (Files)

### POST `/api/v1/files/upload`

ファイルをアップロード（投稿作成と独立して使用する場合）。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |
| Content-Type | multipart/form-data |

**リクエスト:**

| フィールド | 型 | 必須 | 説明 |
|-----------|------|------|------|
| `file` | File | はい | アップロードファイル |
| `type` | string | はい | 用途（`post`, `avatar`） |

**バリデーション:**
- ファイルサイズ: 10MB以下（画像）、50MB以下（動画）、10MB以下（ドキュメント）
- 許可MIMEタイプ: image/jpeg, image/png, image/gif, image/webp, video/mp4, application/pdf, application/vnd.openxmlformats-officedocument.*

**レスポンス (201):**
```json
{
  "success": true,
  "data": {
    "storageKey": "posts/550e8400.../01_photo.jpg",
    "url": "https://minio.internal/coopnet/posts/...",
    "fileName": "photo.jpg",
    "fileSize": 204800,
    "mimeType": "image/jpeg",
    "fileType": "image"
  }
}
```

---

### GET `/api/v1/files/:storageKey`

ファイルを取得（プロキシ経由でMinIOから配信）。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |

**レスポンス (200):** ファイルバイナリ（適切なContent-Type付き）

---

### DELETE `/api/v1/files/:id`

ファイルを削除。本人または管理者のみ。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |

**レスポンス (200):** `{ "success": true, "data": null }`

---

## 8. 管理者 (Admin)

### GET `/api/v1/admin/stats`

管理者ダッシュボード統計を取得。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |
| 権限 | `view_admin_dashboard` または `admin` |

**レスポンス (200):**
```json
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "activeUsers": 142,
    "totalPosts": 48500,
    "todayPosts": 98,
    "totalAnnouncements": 45,
    "activeSurveys": 2,
    "postCompletionRate": 68.5
  },
  "meta": { "timestamp": "..." }
}
```

---

### GET `/api/v1/admin/users`

ユーザー管理一覧（非アクティブユーザー含む）。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |
| 権限 | `manage_users` または `admin` |

**クエリパラメータ:** `page`, `pageSize`, `search`, `department`, `isActive`

**レスポンス (200):** ページネーション付きユーザー配列（権限情報含む）

---

### PATCH `/api/v1/admin/users/:id`

ユーザー情報を管理者が更新。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |
| 権限 | `manage_users` または `admin` |
| Content-Type | application/json |

**リクエスト:**
```json
{
  "displayName": "田中太郎",
  "department": "経理部",
  "position": "課長",
  "isActive": true
}
```

**レスポンス (200):** 更新されたユーザーオブジェクト

---

### GET `/api/v1/admin/users/:id/permissions`

ユーザーの権限一覧を取得。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |
| 権限 | `admin` |

**レスポンス (200):**
```json
{
  "success": true,
  "data": [
    { "id": "...", "name": "manage_announcements", "description": "お知らせ管理", "grantedAt": "..." }
  ]
}
```

---

### POST `/api/v1/admin/users/:id/permissions`

ユーザーに権限を付与。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |
| 権限 | `admin` |
| Content-Type | application/json |

**リクエスト:**
```json
{
  "permissionName": "manage_announcements"
}
```

**レスポンス (201):** 作成された UserPermission オブジェクト

---

### DELETE `/api/v1/admin/users/:id/permissions/:permissionId`

ユーザーの権限を削除。

| 項目 | 内容 |
|------|------|
| 認証 | 必要 |
| 権限 | `admin` |

**レスポンス (200):** `{ "success": true, "data": null }`

---

## 9. エンドポイント一覧表

| # | Method | URL | 認証 | 権限 | 説明 |
|---|--------|-----|------|------|------|
| 1 | POST | `/api/v1/auth/login` | — | — | ローカルログイン |
| 2 | POST | `/api/v1/auth/login/microsoft` | — | — | MS365ログイン |
| 3 | POST | `/api/v1/auth/refresh` | — | — | トークンリフレッシュ |
| 4 | POST | `/api/v1/auth/logout` | Yes | — | ログアウト |
| 5 | GET | `/api/v1/auth/me` | Yes | — | 現在のユーザー取得 |
| 6 | GET | `/api/v1/posts` | Yes | — | 投稿一覧 |
| 7 | GET | `/api/v1/posts/:id` | Yes | — | 投稿詳細 |
| 8 | POST | `/api/v1/posts` | Yes | — | 投稿作成 |
| 9 | PATCH | `/api/v1/posts/:id` | Yes | 本人 | 投稿更新 |
| 10 | DELETE | `/api/v1/posts/:id` | Yes | 本人/admin | 投稿削除 |
| 11 | GET | `/api/v1/posts/dates` | Yes | — | 日付別投稿数 |
| 12 | POST | `/api/v1/posts/:id/like` | Yes | — | いいね |
| 13 | DELETE | `/api/v1/posts/:id/like` | Yes | — | いいね取消 |
| 14 | GET | `/api/v1/posts/:id/comments` | Yes | — | コメント一覧 |
| 15 | POST | `/api/v1/posts/:id/comments` | Yes | — | コメント追加 |
| 16 | DELETE | `/api/v1/posts/:postId/comments/:commentId` | Yes | 本人/admin | コメント削除 |
| 17 | GET | `/api/v1/announcements` | Yes | — | お知らせ一覧 |
| 18 | GET | `/api/v1/announcements/:id` | Yes | — | お知らせ詳細 |
| 19 | POST | `/api/v1/announcements` | Yes | manage_announcements | お知らせ作成 |
| 20 | PATCH | `/api/v1/announcements/:id` | Yes | manage_announcements | お知らせ更新 |
| 21 | DELETE | `/api/v1/announcements/:id` | Yes | manage_announcements | お知らせ削除 |
| 22 | POST | `/api/v1/announcements/:id/read` | Yes | — | お知らせ既読 |
| 23 | GET | `/api/v1/surveys` | Yes | — | アンケート一覧 |
| 24 | GET | `/api/v1/surveys/:id` | Yes | — | アンケート詳細 |
| 25 | POST | `/api/v1/surveys` | Yes | manage_surveys | アンケート作成 |
| 26 | PATCH | `/api/v1/surveys/:id` | Yes | manage_surveys | アンケート更新 |
| 27 | DELETE | `/api/v1/surveys/:id` | Yes | manage_surveys | アンケート削除 |
| 28 | POST | `/api/v1/surveys/:id/responses` | Yes | — | アンケート回答 |
| 29 | GET | `/api/v1/surveys/:id/results` | Yes | manage_surveys | アンケート結果 |
| 30 | GET | `/api/v1/surveys/:id/export` | Yes | manage_surveys | アンケートExport |
| 31 | GET | `/api/v1/users` | Yes | — | ユーザー一覧 |
| 32 | GET | `/api/v1/users/:id` | Yes | — | ユーザープロフィール |
| 33 | GET | `/api/v1/users/:id/stats` | Yes | — | ユーザー統計 |
| 34 | GET | `/api/v1/users/:id/posts` | Yes | — | ユーザー投稿一覧 |
| 35 | PATCH | `/api/v1/users/me` | Yes | 本人 | プロフィール更新 |
| 36 | GET | `/api/v1/notifications` | Yes | — | 通知一覧 |
| 37 | GET | `/api/v1/notifications/unread-count` | Yes | — | 未読通知数 |
| 38 | PATCH | `/api/v1/notifications/:id/read` | Yes | — | 通知既読 |
| 39 | PATCH | `/api/v1/notifications/read-all` | Yes | — | 全通知既読 |
| 40 | POST | `/api/v1/notifications/push-subscribe` | Yes | — | Push通知登録 |
| 41 | DELETE | `/api/v1/notifications/push-subscribe` | Yes | — | Push通知解除 |
| 42 | POST | `/api/v1/files/upload` | Yes | — | ファイルアップロード |
| 43 | GET | `/api/v1/files/:storageKey` | Yes | — | ファイル取得 |
| 44 | DELETE | `/api/v1/files/:id` | Yes | 本人/admin | ファイル削除 |
| 45 | GET | `/api/v1/admin/stats` | Yes | view_admin_dashboard | 管理者統計 |
| 46 | GET | `/api/v1/admin/users` | Yes | manage_users | ユーザー管理一覧 |
| 47 | PATCH | `/api/v1/admin/users/:id` | Yes | manage_users | ユーザー管理更新 |
| 48 | GET | `/api/v1/admin/users/:id/permissions` | Yes | admin | 権限一覧取得 |
| 49 | POST | `/api/v1/admin/users/:id/permissions` | Yes | admin | 権限付与 |
| 50 | DELETE | `/api/v1/admin/users/:id/permissions/:permissionId` | Yes | admin | 権限削除 |
