# キャッシュ戦略 (Caching Strategy)

> コープネット - Redis キャッシュ設計

## 1. 概要

Redis を以下の用途で使用する:

| 用途 | 説明 |
|------|------|
| データキャッシュ | 頻繁にアクセスされるデータの高速配信 |
| セッション管理 | JWT リフレッシュトークン・ブラックリスト管理 |
| Pub/Sub | サービス間非同期イベント通信 |
| リアルタイム | WebSocket 接続状態管理 |

### キャッシュ方針

- 100〜150ユーザー規模のため、積極的にキャッシュして読み取り性能を最適化
- Write-Through（書き込み時にキャッシュ更新）パターンを基本とする
- キャッシュミス時は Read-Through でDBから取得してキャッシュに保存

---

## 2. キャッシュキー設計

### 2.1 命名規約

```
{domain}:{entity}:{identifier}:{sub-resource}
```

- すべて小文字
- 区切りは `:` (Redis の標準慣行)
- 識別子は UUID または日付文字列

### 2.2 キー一覧

| # | キーパターン | 値の型 | TTL | 説明 |
|---|------------|--------|-----|------|
| 1 | `posts:date:{YYYY-MM-DD}` | JSON (配列) | 5分 | 日付別投稿一覧 |
| 2 | `posts:date:{YYYY-MM-DD}:page:{n}` | JSON (配列) | 5分 | 日付別投稿一覧（ページ別） |
| 3 | `posts:detail:{postId}` | JSON (オブジェクト) | 10分 | 投稿詳細 |
| 4 | `posts:dates:{YYYY-MM}` | JSON (配列) | 10分 | 月別の日付別投稿件数 |
| 5 | `posts:user:{userId}:page:{n}` | JSON (配列) | 5分 | ユーザー別投稿一覧 |
| 6 | `user:{userId}` | JSON (オブジェクト) | 30分 | ユーザー情報 |
| 7 | `user:{userId}:stats` | JSON (オブジェクト) | 15分 | ユーザー統計 |
| 8 | `user:{userId}:permissions` | JSON (配列) | 30分 | ユーザー権限一覧 |
| 9 | `announcements:list:page:{n}` | JSON (配列) | 5分 | お知らせ一覧 |
| 10 | `announcements:detail:{id}` | JSON (オブジェクト) | 10分 | お知らせ詳細 |
| 11 | `surveys:list:page:{n}` | JSON (配列) | 5分 | アンケート一覧 |
| 12 | `surveys:detail:{id}` | JSON (オブジェクト) | 10分 | アンケート詳細 |
| 13 | `notifications:{userId}:unread` | Number | 0 (永続) | 未読通知件数 |
| 14 | `notifications:{userId}:list:page:{n}` | JSON (配列) | 2分 | 通知一覧 |
| 15 | `auth:refresh:{tokenHash}` | String (userId) | 7日 | リフレッシュトークン |
| 16 | `auth:blacklist:{tokenHash}` | String ("1") | アクセストークンの残TTL | ログアウト済みトークン |
| 17 | `admin:stats` | JSON (オブジェクト) | 5分 | 管理者ダッシュボード統計 |
| 18 | `file:url:{storageKey}` | String (URL) | 55分 | MinIO 署名付きURL (有効期限60分のため55分でキャッシュ) |

---

## 3. キャッシュパターン

### 3.1 Read-Through パターン

キャッシュミス時にDBから取得してキャッシュに保存する。

```typescript
async getPostsByDate(date: string, page: number): Promise<Post[]> {
  const cacheKey = `posts:date:${date}:page:${page}`;

  // 1. キャッシュを確認
  const cached = await this.redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // 2. キャッシュミス → DBから取得
  const posts = await this.postRepository.find({
    where: { postDate: date, isDeleted: false },
    order: { createdAt: 'DESC' },
    skip: (page - 1) * 20,
    take: 20,
    relations: ['user', 'files'],
  });

  // 3. キャッシュに保存
  await this.redis.set(cacheKey, JSON.stringify(posts), 'EX', 300); // 5分

  return posts;
}
```

### 3.2 Write-Through 無効化パターン

データ変更時に関連キャッシュを無効化する。

```typescript
async createPost(data: CreatePostDto): Promise<Post> {
  // 1. DBに保存
  const post = await this.postRepository.save(data);

  // 2. 関連キャッシュを無効化
  await this.invalidatePostCaches(post);

  return post;
}

private async invalidatePostCaches(post: Post): Promise<void> {
  const pipeline = this.redis.pipeline();

  // 日付別投稿キャッシュを削除
  const dateKeys = await this.redis.keys(`posts:date:${post.postDate}:*`);
  dateKeys.forEach(key => pipeline.del(key));

  // 月別カウントキャッシュを削除
  const month = post.postDate.substring(0, 7); // YYYY-MM
  pipeline.del(`posts:dates:${month}`);

  // ユーザー別投稿キャッシュを削除
  const userKeys = await this.redis.keys(`posts:user:${post.userId}:*`);
  userKeys.forEach(key => pipeline.del(key));

  // ユーザー統計キャッシュを削除
  pipeline.del(`user:${post.userId}:stats`);

  // 管理者統計キャッシュを削除
  pipeline.del('admin:stats');

  await pipeline.exec();
}
```

### 3.3 カウンターパターン（未読通知）

未読通知件数は Redis で直接管理し、DB への問い合わせを最小化する。

```typescript
// 通知作成時にカウンターをインクリメント
async createNotification(notification: CreateNotificationDto): Promise<void> {
  // DBに保存
  await this.notificationRepository.save(notification);

  // Redisカウンターをインクリメント
  await this.redis.incr(`notifications:${notification.userId}:unread`);

  // 通知一覧キャッシュを無効化
  const listKeys = await this.redis.keys(`notifications:${notification.userId}:list:*`);
  if (listKeys.length > 0) {
    await this.redis.del(...listKeys);
  }
}

// 既読時にカウンターをデクリメント
async markAsRead(notificationId: string, userId: string): Promise<void> {
  const notification = await this.notificationRepository.findOne({
    where: { id: notificationId, userId, isRead: false },
  });

  if (notification) {
    notification.isRead = true;
    await this.notificationRepository.save(notification);
    await this.redis.decr(`notifications:${userId}:unread`);
  }
}

// 全既読時にカウンターをリセット
async markAllAsRead(userId: string): Promise<number> {
  const result = await this.notificationRepository.update(
    { userId, isRead: false, isDeleted: false },
    { isRead: true },
  );

  await this.redis.set(`notifications:${userId}:unread`, '0');

  return result.affected;
}
```

---

## 4. キャッシュ無効化マトリクス

データ変更時にどのキャッシュを無効化するかの対応表。

| 操作 | 無効化するキャッシュキー |
|------|----------------------|
| 投稿作成 | `posts:date:{date}:*`, `posts:dates:{month}`, `posts:user:{userId}:*`, `user:{userId}:stats`, `admin:stats` |
| 投稿更新 | `posts:detail:{postId}`, `posts:date:{oldDate}:*`, `posts:date:{newDate}:*`, `posts:dates:{month}` |
| 投稿削除 | `posts:detail:{postId}`, `posts:date:{date}:*`, `posts:dates:{month}`, `posts:user:{userId}:*`, `user:{userId}:stats`, `admin:stats` |
| いいね/取消 | `posts:detail:{postId}` |
| コメント作成 | `posts:detail:{postId}` |
| コメント削除 | `posts:detail:{postId}` |
| お知らせ作成 | `announcements:list:*` |
| お知らせ更新 | `announcements:detail:{id}`, `announcements:list:*` |
| お知らせ削除 | `announcements:detail:{id}`, `announcements:list:*` |
| アンケート作成 | `surveys:list:*` |
| アンケート更新 | `surveys:detail:{id}`, `surveys:list:*` |
| アンケート回答 | `surveys:detail:{id}` |
| ユーザー更新 | `user:{userId}` |
| 権限変更 | `user:{userId}:permissions` |
| 通知作成 | `notifications:{userId}:list:*`, `notifications:{userId}:unread` (incr) |
| 通知既読 | `notifications:{userId}:list:*`, `notifications:{userId}:unread` (decr) |

---

## 5. セッション・トークン管理

### 5.1 リフレッシュトークン

```
キー:    auth:refresh:{sha256(refreshToken)}
値:      userId
TTL:     7日 (JWT_REFRESH_EXPIRES_IN)
```

- ログイン時にリフレッシュトークンのハッシュを Redis に保存
- リフレッシュ時に Redis で存在確認 → 新トークン発行 → 旧トークン削除
- ログアウト時に Redis から削除

### 5.2 トークンブラックリスト

```
キー:    auth:blacklist:{sha256(accessToken)}
値:      "1"
TTL:     アクセストークンの残りの有効期限
```

- ログアウト時にアクセストークンをブラックリストに追加
- JWT 検証時にブラックリストを確認
- TTL でトークン期限切れ後に自動削除

### 5.3 ユーザー無効化時のセッション強制破棄

```typescript
async deactivateUser(userId: string): Promise<void> {
  // 1. DB更新
  await this.userRepository.update(userId, { isActive: false });

  // 2. そのユーザーのリフレッシュトークンをすべて削除
  const refreshKeys = await this.redis.keys(`auth:refresh:*`);
  for (const key of refreshKeys) {
    const storedUserId = await this.redis.get(key);
    if (storedUserId === userId) {
      await this.redis.del(key);
    }
  }

  // 3. ユーザーキャッシュを無効化
  await this.redis.del(`user:${userId}`);
  await this.redis.del(`user:${userId}:permissions`);
}
```

---

## 6. Pub/Sub 設計

Redis Pub/Sub をサービス間の非同期イベント通信に使用する。

### 6.1 チャンネル一覧

| チャンネル | パブリッシャー | サブスクライバー |
|-----------|--------------|----------------|
| `post.post.created` | post-service | notification-service |
| `post.post.liked` | post-service | notification-service |
| `post.post.unliked` | post-service | notification-service |
| `post.comment.created` | post-service | notification-service |
| `announcement.announcement.created` | announcement-service | notification-service |
| `announcement.announcement.updated` | announcement-service | notification-service |
| `survey.survey.created` | survey-service | notification-service |
| `survey.survey.reminder` | survey-service | notification-service |
| `user.user.deactivated` | user-service | auth-service |

### 6.2 リアルタイムイベント転送

notification-service が Redis Pub/Sub で受信したイベントを WebSocket 経由でクライアントに転送する。

```
Redis Pub/Sub → notification-service → WebSocket → クライアント
```

```typescript
// notification-service のイベントハンドラー
async handlePostLiked(payload: PostLikedEvent): Promise<void> {
  // 1. 通知レコード作成
  const notification = await this.createNotification({
    userId: payload.postOwnerId,
    type: NotificationType.Like,
    title: 'いいね',
    message: `${payload.likerName}さんがあなたの投稿にいいねしました`,
    referenceType: ReferenceType.Post,
    referenceId: payload.postId,
    actorId: payload.likerId,
  });

  // 2. WebSocket で投稿者にリアルタイム通知
  this.notificationGateway.sendToUser(payload.postOwnerId, 'notification', notification);

  // 3. いいねカウント更新を投稿閲覧者全員に通知
  this.notificationGateway.broadcast('post:liked', {
    postId: payload.postId,
    likeCount: payload.likeCount,
  });

  // 4. Push通知送信
  await this.pushNotificationService.send(payload.postOwnerId, {
    title: 'いいね',
    body: `${payload.likerName}さんがあなたの投稿にいいねしました`,
  });
}
```

---

## 7. Redis 設定

### 7.1 接続設定

```typescript
// redis.config.ts
export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: 0,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => Math.min(times * 100, 3000),
};
```

### 7.2 メモリ管理

100〜150ユーザー規模のため、メモリ使用量は比較的少ない。

**推定メモリ使用量:**

| データ | 推定件数 | 推定サイズ |
|--------|---------|-----------|
| 投稿キャッシュ（日別5日分） | ~750 | ~2MB |
| ユーザーキャッシュ | ~150 | ~150KB |
| 通知カウンター | ~150 | ~5KB |
| セッション/トークン | ~150 | ~50KB |
| その他 | — | ~500KB |
| **合計** | — | **~3MB** |

推奨: `maxmemory 256mb`、`maxmemory-policy allkeys-lru`

### 7.3 永続化

- RDB スナップショット: 有効（デフォルト設定）
- AOF: 無効（キャッシュデータは再生成可能なため不要）
- ただし、未読通知カウンターは Redis 再起動時に DB から再計算するロジックを実装

```typescript
// Redis起動時の未読カウンター初期化
async initializeUnreadCounters(): Promise<void> {
  const users = await this.userRepository.find({ where: { isActive: true } });

  for (const user of users) {
    const count = await this.notificationRepository.count({
      where: { userId: user.id, isRead: false, isDeleted: false },
    });
    await this.redis.set(`notifications:${user.id}:unread`, count.toString());
  }
}
```
