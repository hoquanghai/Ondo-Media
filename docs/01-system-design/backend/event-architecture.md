# イベントアーキテクチャ (Event Architecture)

> コープネット - Redis Pub/Sub イベント駆動設計

## 1. 概要

サービス間の非同期通信に Redis Pub/Sub を採用する。主に post-service / announcement-service / survey-service がイベントを発行し、notification-service がイベントを購読して通知を生成する。

```
┌──────────────┐     publish     ┌──────────────────┐     subscribe     ┌───────────────────┐
│ post-service │ ──────────────→ │  Redis Pub/Sub   │ ──────────────→  │notification-service│
│ ann.-service │                 │   (チャンネル)     │                  │                   │
│survey-service│                 └──────────────────┘                  │  ┌─── DB保存       │
│ user-service │                                                       │  ├─── WebSocket送信 │
└──────────────┘                                                       │  └─── Push通知送信  │
                                                                       └───────────────────┘
```

---

## 2. イベント命名規約

### パターン

```
{service}.{entity}.{action}
```

| 要素 | 説明 | 例 |
|------|------|-----|
| service | 発行元サービス名 | `post`, `announcement`, `survey`, `user` |
| entity | 対象エンティティ | `post`, `comment`, `announcement`, `survey`, `user` |
| action | アクション（過去分詞） | `created`, `updated`, `deleted`, `liked`, `unliked` |

### 例

```
post.post.created          # 投稿が作成された
post.post.liked            # 投稿にいいねされた
post.comment.created       # コメントが作成された
announcement.announcement.created   # お知らせが作成された
survey.survey.created      # アンケートが作成された
user.user.deactivated      # ユーザーが無効化された
```

---

## 3. イベントカタログ

### 3.1 共通エンベロープ

すべてのイベントは以下の共通構造でラップされる。

```typescript
interface EventEnvelope<T> {
  eventId: string;          // イベントの一意ID（冪等性制御用）
  eventType: string;        // イベント名
  source: string;           // 発行元サービス名
  timestamp: string;        // ISO 8601 発行日時
  payload: T;               // イベント固有データ
}
```

---

### 3.2 投稿系イベント

#### `post.post.created`

投稿が新規作成されたとき。

```typescript
interface PostCreatedPayload {
  postId: string;
  userId: string;
  displayName: string;
  title: string | null;
  postDate: string;         // YYYY-MM-DD
}
```

**購読者の処理:**
- notification-service: 投稿作成の通知は現状なし（フォロー機能がないため）。管理者ダッシュボードのリアルタイム更新用に利用。

---

#### `post.post.liked`

投稿にいいねされたとき。

```typescript
interface PostLikedPayload {
  postId: string;
  postOwnerId: string;      // 投稿者ID（通知先）
  likerId: string;           // いいねした人のID
  likerName: string;         // いいねした人の表示名
  likeCount: number;         // 更新後のいいね数
}
```

**購読者の処理:**
- notification-service:
  1. `postOwnerId` に対して通知レコード作成
  2. WebSocket で `postOwnerId` に `notification` イベント送信
  3. WebSocket で全接続クライアントに `post:liked` イベント送信（カウント更新用）
  4. `postOwnerId` にブラウザ Push 通知送信

---

#### `post.post.unliked`

いいねが取り消されたとき。

```typescript
interface PostUnlikedPayload {
  postId: string;
  postOwnerId: string;
  unlikerId: string;
  likeCount: number;
}
```

**購読者の処理:**
- notification-service: WebSocket で全接続クライアントに `post:liked` イベント送信（カウント更新用）。通知レコードは作成しない。

---

#### `post.comment.created`

コメントが追加されたとき。

```typescript
interface CommentCreatedPayload {
  postId: string;
  postOwnerId: string;       // 投稿者ID（通知先）
  commentId: string;
  commenterId: string;        // コメントした人のID
  commenterName: string;      // コメントした人の表示名
  content: string;            // コメント本文（先頭100文字）
  commentCount: number;       // 更新後のコメント数
}
```

**購読者の処理:**
- notification-service:
  1. `postOwnerId` に対して通知レコード作成（自分の投稿への自分のコメントは除外）
  2. WebSocket で `postOwnerId` に `notification` イベント送信
  3. WebSocket で全接続クライアントに `post:commented` イベント送信（カウント更新用）
  4. `postOwnerId` にブラウザ Push 通知送信

---

### 3.3 お知らせ系イベント

#### `announcement.announcement.created`

お知らせが公開されたとき（予約公開の場合は公開時刻に発行）。

```typescript
interface AnnouncementCreatedPayload {
  announcementId: string;
  title: string;
  authorId: string;
  authorName: string;
  isPinned: boolean;
}
```

**購読者の処理:**
- notification-service:
  1. 全アクティブユーザーに対して通知レコードを一括作成
  2. WebSocket で全接続クライアントに `announcement:new` イベント送信
  3. 全ユーザーにブラウザ Push 通知送信

---

#### `announcement.announcement.updated`

お知らせが更新されたとき。

```typescript
interface AnnouncementUpdatedPayload {
  announcementId: string;
  title: string;
  authorId: string;
  changes: string[];          // 変更されたフィールド名の配列
}
```

**購読者の処理:**
- notification-service: WebSocket で全接続クライアントに `announcement:updated` イベント送信（UI更新用）。個別通知は作成しない。

---

### 3.4 アンケート系イベント

#### `survey.survey.created`

アンケートが公開されたとき。

```typescript
interface SurveyCreatedPayload {
  surveyId: string;
  title: string;
  authorId: string;
  authorName: string;
  endsAt: string;
}
```

**購読者の処理:**
- notification-service:
  1. 全アクティブユーザーに対して通知レコードを一括作成
  2. WebSocket で全接続クライアントに `survey:new` イベント送信
  3. 全ユーザーにブラウザ Push 通知送信

---

#### `survey.survey.reminder`

アンケート締切リマインダー（締切24時間前に未回答者へ）。

```typescript
interface SurveyReminderPayload {
  surveyId: string;
  title: string;
  endsAt: string;
  unrespondedUserIds: string[];  // 未回答ユーザーIDの配列
}
```

**購読者の処理:**
- notification-service:
  1. `unrespondedUserIds` の各ユーザーに通知レコード作成
  2. WebSocket で該当ユーザーに `notification` イベント送信
  3. 該当ユーザーにブラウザ Push 通知送信

---

### 3.5 ユーザー系イベント

#### `user.user.deactivated`

ユーザーが管理者によって無効化されたとき。

```typescript
interface UserDeactivatedPayload {
  userId: string;
  deactivatedBy: string;
}
```

**購読者の処理:**
- auth-service: 該当ユーザーのリフレッシュトークンをすべて削除し、強制ログアウトさせる

---

#### `user.user.activated`

ユーザーが再有効化されたとき。

```typescript
interface UserActivatedPayload {
  userId: string;
  activatedBy: string;
}
```

**購読者の処理:**
- notification-service: 管理者への通知（任意）

---

## 4. コンシューマーマッピング

| イベント | notification-service | auth-service |
|---------|---------------------|-------------|
| `post.post.created` | WebSocket broadcast | — |
| `post.post.liked` | 通知作成 + WebSocket + Push | — |
| `post.post.unliked` | WebSocket broadcast | — |
| `post.comment.created` | 通知作成 + WebSocket + Push | — |
| `announcement.announcement.created` | 全員通知 + WebSocket + Push | — |
| `announcement.announcement.updated` | WebSocket broadcast | — |
| `survey.survey.created` | 全員通知 + WebSocket + Push | — |
| `survey.survey.reminder` | 未回答者通知 + Push | — |
| `user.user.deactivated` | — | セッション破棄 |
| `user.user.activated` | 管理者通知 | — |

---

## 5. WebSocket イベント転送

notification-service が Redis Pub/Sub から受信したイベントを、WebSocket 経由でクライアントに転送する。

### 5.1 WebSocket イベント一覧

| WebSocket イベント名 | 送信先 | トリガー元イベント | ペイロード |
|---------------------|--------|------------------|----------|
| `notification` | 特定ユーザー | `post.post.liked`, `post.comment.created`, etc. | `Notification` オブジェクト |
| `unread-count` | 特定ユーザー | 通知作成時 | `{ count: number }` |
| `post:liked` | 全接続クライアント | `post.post.liked`, `post.post.unliked` | `{ postId, likeCount }` |
| `post:commented` | 全接続クライアント | `post.comment.created` | `{ postId, commentCount, comment }` |
| `announcement:new` | 全接続クライアント | `announcement.announcement.created` | `{ announcement }` |
| `announcement:updated` | 全接続クライアント | `announcement.announcement.updated` | `{ announcementId, changes }` |
| `survey:new` | 全接続クライアント | `survey.survey.created` | `{ survey }` |

### 5.2 クライアント側の処理例

```typescript
// フロントエンド (React)
const socket = useWebSocket();

useEffect(() => {
  // 個別通知
  socket.on('notification', (notification: Notification) => {
    addNotification(notification);
    showToast(notification.message);
  });

  // 未読カウント更新
  socket.on('unread-count', ({ count }: { count: number }) => {
    setUnreadCount(count);
  });

  // いいねカウント更新（タイムライン上の投稿をリアルタイム更新）
  socket.on('post:liked', ({ postId, likeCount }: { postId: string; likeCount: number }) => {
    updatePostLikeCount(postId, likeCount);
  });

  // コメントカウント更新
  socket.on('post:commented', ({ postId, commentCount, comment }) => {
    updatePostCommentCount(postId, commentCount);
    // 投稿詳細を開いている場合はコメントを追加
    if (currentPostId === postId) {
      addComment(comment);
    }
  });

  // 新着お知らせ
  socket.on('announcement:new', ({ announcement }) => {
    showAnnouncementBanner(announcement);
  });

  return () => {
    socket.off('notification');
    socket.off('unread-count');
    socket.off('post:liked');
    socket.off('post:commented');
    socket.off('announcement:new');
  };
}, []);
```

---

## 6. 冪等性制御

イベントが重複配信される可能性に対応する。

### 方針

各イベントに `eventId` (UUID) を含め、コンシューマー側で処理済みチェックを行う。

```typescript
async handleEvent(envelope: EventEnvelope<any>): Promise<void> {
  // 冪等性チェック: 処理済みイベントをスキップ
  const isProcessed = await this.redis.get(`event:processed:${envelope.eventId}`);
  if (isProcessed) {
    return;
  }

  // イベント処理
  await this.processEvent(envelope);

  // 処理済みとしてマーク（24時間で自動削除）
  await this.redis.set(`event:processed:${envelope.eventId}`, '1', 'EX', 86400);
}
```

---

## 7. エラーハンドリング

### 7.1 イベント処理失敗時

Redis Pub/Sub はメッセージの永続化・再送をサポートしないため、以下の対策を実施する。

```typescript
async handleEvent(envelope: EventEnvelope<any>): Promise<void> {
  try {
    await this.processEvent(envelope);
  } catch (error) {
    this.logger.error(`イベント処理失敗: ${envelope.eventType}`, {
      eventId: envelope.eventId,
      error: error.message,
    });

    // 失敗したイベントをデッドレターキューに保存
    await this.redis.rpush('event:dead-letter', JSON.stringify({
      envelope,
      error: error.message,
      failedAt: new Date().toISOString(),
    }));
  }
}
```

### 7.2 デッドレターキュー処理

定期的にデッドレターキューを確認し、失敗イベントを再処理する。

```typescript
@Cron('*/5 * * * *') // 5分ごと
async processDeadLetterQueue(): Promise<void> {
  const maxRetries = 10;
  let processed = 0;

  while (processed < maxRetries) {
    const item = await this.redis.lpop('event:dead-letter');
    if (!item) break;

    const { envelope } = JSON.parse(item);
    try {
      await this.processEvent(envelope);
      processed++;
    } catch (error) {
      // 再度失敗 → ログに記録して破棄
      this.logger.error(`デッドレター再処理失敗: ${envelope.eventType}`, {
        eventId: envelope.eventId,
      });
    }
  }
}
```

---

## 8. イベント発行ユーティリティ

各サービスで使用するイベント発行の共通ユーティリティ。

```typescript
// libs/common/src/events/event-publisher.ts
import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EventPublisher {
  constructor(private readonly redis: Redis) {}

  async publish<T>(eventType: string, payload: T, source: string): Promise<void> {
    const envelope: EventEnvelope<T> = {
      eventId: uuidv4(),
      eventType,
      source,
      timestamp: new Date().toISOString(),
      payload,
    };

    await this.redis.publish(eventType, JSON.stringify(envelope));
  }
}

// 使用例
await this.eventPublisher.publish('post.post.liked', {
  postId: post.id,
  postOwnerId: post.userId,
  likerId: currentUser.id,
  likerName: currentUser.displayName,
  likeCount: post.likeCount + 1,
}, 'post-service');
```

---

## 9. モニタリング

### Redis Pub/Sub モニタリング

```bash
# 全イベントをモニタリング（開発環境用）
redis-cli MONITOR

# 特定チャンネルの購読（デバッグ用）
redis-cli SUBSCRIBE post.post.created post.post.liked
```

### ログ形式

```json
{
  "level": "info",
  "service": "notification-service",
  "message": "Event received",
  "eventType": "post.post.liked",
  "eventId": "550e8400-...",
  "source": "post-service",
  "timestamp": "2026-03-20T09:00:00.000Z"
}
```
