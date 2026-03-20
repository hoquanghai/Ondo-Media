# マイクロサービスアーキテクチャ (Microservice Architecture)

> コープネット - NestJS マイクロサービス構成

## 1. アーキテクチャ概要

```
┌─────────────────────────────────────────────────────┐
│                    クライアント                        │
│              (Next.js 15 フロントエンド)                │
└────────────────────────┬────────────────────────────┘
                         │ HTTP / WebSocket
                         ▼
┌─────────────────────────────────────────────────────┐
│               API Gateway (port: 3000)               │
│          HTTP → NestJS TCP メッセージパターン          │
└──┬──────┬──────┬──────┬──────┬──────┬──────┬────────┘
   │      │      │      │      │      │      │
   ▼      ▼      ▼      ▼      ▼      ▼      ▼
┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐
│Auth ││User ││Post ││Ann. ││Surv.││Noti.││File │
│3001 ││3002 ││3003 ││3004 ││3005 ││3006 ││3007 │
└──┬──┘└──┬──┘└──┬──┘└──┬──┘└──┬──┘└──┬──┘└──┬──┘
   │      │      │      │      │      │      │
   ▼      ▼      ▼      ▼      ▼      ▼      ▼
┌─────────────────────────────────────────────────────┐
│                  SQL Server (共有DB)                   │
├─────────────────────────────────────────────────────┤
│                Redis (キャッシュ / Pub/Sub)            │
├─────────────────────────────────────────────────────┤
│                MinIO (オブジェクトストレージ)            │
└─────────────────────────────────────────────────────┘
```

---

## 2. サービス一覧

| # | サービス名 | ポート | トランスポート | 担当テーブル | 説明 |
|---|-----------|--------|---------------|-------------|------|
| 1 | api-gateway | 3000 | HTTP / WebSocket | — | クライアントからのリクエストを各サービスに振り分け |
| 2 | auth-service | 3001 | TCP | — (usersはuser-serviceが管理) | 認証・認可（JWT発行・検証） |
| 3 | user-service | 3002 | TCP | `users`, `permissions`, `user_permissions` | ユーザー管理・権限管理 |
| 4 | post-service | 3003 | TCP | `posts`, `post_files`, `likes`, `comments` | 投稿・いいね・コメント管理 |
| 5 | announcement-service | 3004 | TCP | `announcements`, `announcement_read_status` | お知らせ管理 |
| 6 | survey-service | 3005 | TCP | `surveys`, `survey_questions`, `survey_responses` | アンケート管理 |
| 7 | notification-service | 3006 | TCP / WebSocket | `notifications`, `push_subscriptions` | 通知管理・リアルタイム配信 |
| 8 | file-service | 3007 | TCP | — (post_filesはpost-serviceが管理) | MinIO ファイルアップロード・配信 |

---

## 3. 各サービス詳細

### 3.1 API Gateway (port: 3000)

クライアントからのHTTPリクエストを受け、NestJS TCP トランスポートで各マイクロサービスに転送する。

**責務:**
- HTTPリクエストの受信・レスポンス返却
- JWT トークン検証（auth-service に委譲）
- リクエストバリデーション（基本的なDTO検証）
- レスポンス変換（snake_case → camelCase）
- レートリミット
- CORS 設定
- WebSocket接続のプロキシ（notification-service へ）
- ファイルアップロードの中継（multipart/form-data）
- ヘルスチェックエンドポイント

**通信先:** 全サービス

```typescript
// 例: PostController (API Gateway)
@Controller('api/v1/posts')
@UseGuards(JwtAuthGuard)
export class PostController {
  constructor(
    @Inject('POST_SERVICE') private postService: ClientProxy,
  ) {}

  @Get()
  async findAll(@Query() query: PostListQueryDto, @CurrentUser() user: CurrentUser) {
    return this.postService.send({ cmd: 'post.findAll' }, { query, userId: user.id });
  }
}
```

---

### 3.2 Auth Service (port: 3001)

認証・認可を担当。JWT の発行・検証・リフレッシュを行う。

**責務:**
- ローカル認証（username/password）
- Microsoft 365 OAuth2 認証
- JWT アクセストークン・リフレッシュトークン発行
- トークン検証
- トークンリフレッシュ
- リフレッシュトークンの Redis 管理（ブラックリスト方式）

**メッセージパターン:**

| パターン | 説明 |
|---------|------|
| `auth.login` | ローカルログイン |
| `auth.loginMicrosoft` | MS365ログイン |
| `auth.refresh` | トークンリフレッシュ |
| `auth.logout` | ログアウト |
| `auth.validateToken` | トークン検証 |
| `auth.getCurrentUser` | 現在のユーザー情報取得 |

**依存サービス:** user-service（ユーザー情報の検証・取得）

---

### 3.3 User Service (port: 3002)

ユーザー情報と権限の管理を担当。

**責務:**
- ユーザー CRUD
- プロフィール管理
- ユーザー検索
- 権限管理（付与・削除・一覧）
- ユーザー統計
- 部署一覧

**メッセージパターン:**

| パターン | 説明 |
|---------|------|
| `user.findAll` | ユーザー一覧 |
| `user.findById` | ユーザー取得 |
| `user.findByUsername` | ユーザー名で検索 |
| `user.findByEmail` | メールアドレスで検索 |
| `user.findByMs365Id` | MS365 IDで検索 |
| `user.updateProfile` | プロフィール更新 |
| `user.adminUpdate` | 管理者によるユーザー更新 |
| `user.getStats` | ユーザー統計取得 |
| `user.getPermissions` | ユーザー権限取得 |
| `user.grantPermission` | 権限付与 |
| `user.revokePermission` | 権限削除 |
| `user.updateLastLogin` | 最終ログイン日時更新 |

**担当テーブル:** `users`, `permissions`, `user_permissions`

---

### 3.4 Post Service (port: 3003)

投稿（日報）、いいね、コメントの管理を担当。

**責務:**
- 投稿 CRUD
- いいね追加・取消
- コメント CRUD
- 日付別投稿件数集計
- ファイル情報管理（post_files レコード）

**メッセージパターン:**

| パターン | 説明 |
|---------|------|
| `post.findAll` | 投稿一覧 |
| `post.findById` | 投稿詳細 |
| `post.create` | 投稿作成 |
| `post.update` | 投稿更新 |
| `post.delete` | 投稿削除 |
| `post.getDateCounts` | 日付別投稿数 |
| `post.like` | いいね |
| `post.unlike` | いいね取消 |
| `post.findComments` | コメント一覧 |
| `post.createComment` | コメント作成 |
| `post.deleteComment` | コメント削除 |
| `post.findByUserId` | ユーザー別投稿一覧 |

**担当テーブル:** `posts`, `post_files`, `likes`, `comments`

**発行イベント:** `post.post.created`, `post.post.liked`, `post.comment.created`

---

### 3.5 Announcement Service (port: 3004)

お知らせの管理を担当。

**責務:**
- お知らせ CRUD
- 予約公開管理（cron で公開チェック）
- 既読管理

**メッセージパターン:**

| パターン | 説明 |
|---------|------|
| `announcement.findAll` | お知らせ一覧 |
| `announcement.findById` | お知らせ詳細 |
| `announcement.create` | お知らせ作成 |
| `announcement.update` | お知らせ更新 |
| `announcement.delete` | お知らせ削除 |
| `announcement.markRead` | 既読にする |

**担当テーブル:** `announcements`, `announcement_read_status`

**発行イベント:** `announcement.announcement.created`

---

### 3.6 Survey Service (port: 3005)

アンケートの管理を担当。

**責務:**
- アンケート CRUD
- 質問管理
- 回答受付・集計
- 結果 Excel エクスポート
- アンケート期限管理（自動非アクティブ化）

**メッセージパターン:**

| パターン | 説明 |
|---------|------|
| `survey.findAll` | アンケート一覧 |
| `survey.findById` | アンケート詳細 |
| `survey.create` | アンケート作成 |
| `survey.update` | アンケート更新 |
| `survey.delete` | アンケート削除 |
| `survey.submitResponse` | 回答送信 |
| `survey.getResults` | 結果取得 |
| `survey.exportExcel` | Excel エクスポート |

**担当テーブル:** `surveys`, `survey_questions`, `survey_responses`

**発行イベント:** `survey.survey.created`, `survey.survey.reminder`

---

### 3.7 Notification Service (port: 3006)

通知の管理とリアルタイム配信を担当。WebSocket ゲートウェイを内包。

**責務:**
- 通知 CRUD
- 未読通知件数管理
- Redis Pub/Sub イベント購読 → 通知レコード作成
- WebSocket によるリアルタイム通知配信
- ブラウザ Push 通知送信
- Push サブスクリプション管理

**メッセージパターン:**

| パターン | 説明 |
|---------|------|
| `notification.findAll` | 通知一覧 |
| `notification.getUnreadCount` | 未読件数 |
| `notification.markRead` | 既読にする |
| `notification.markAllRead` | 全既読にする |
| `notification.pushSubscribe` | Push通知登録 |
| `notification.pushUnsubscribe` | Push通知解除 |

**担当テーブル:** `notifications`, `push_subscriptions`

**WebSocket ゲートウェイ:**

```typescript
@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: '*' },
})
export class NotificationGateway {
  @WebSocketServer()
  server: Server;

  // ユーザーIDでルームを管理
  handleConnection(client: Socket) {
    const userId = this.extractUserId(client);
    client.join(`user:${userId}`);
  }

  // 特定ユーザーに通知を送信
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }
}
```

---

### 3.8 File Service (port: 3007)

ファイルのアップロード・配信を担当。MinIO をストレージバックエンドとして使用。

**責務:**
- ファイルアップロード（MinIO への保存）
- ファイル配信（署名付き URL 生成）
- ファイル削除
- サムネイル生成（画像の場合）
- ファイルサイズ・MIME タイプバリデーション

**メッセージパターン:**

| パターン | 説明 |
|---------|------|
| `file.upload` | ファイルアップロード |
| `file.getUrl` | 署名付き URL 取得 |
| `file.delete` | ファイル削除 |
| `file.getInfo` | ファイル情報取得 |

**MinIO バケット構成:**

```
coopnet/
├── posts/{postId}/{sortOrder}_{fileName}      # 投稿添付ファイル
├── avatars/{userId}/{fileName}                # アバター画像
└── exports/{timestamp}_{fileName}             # エクスポートファイル（一時）
```

---

## 4. サービス間通信

### 4.1 同期通信 (NestJS TCP Transport)

API Gateway から各サービスへのリクエスト・レスポンス型通信。

```typescript
// API Gateway 側の設定
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'AUTH_SERVICE',
        transport: Transport.TCP,
        options: { host: 'localhost', port: 3001 },
      },
      {
        name: 'USER_SERVICE',
        transport: Transport.TCP,
        options: { host: 'localhost', port: 3002 },
      },
      {
        name: 'POST_SERVICE',
        transport: Transport.TCP,
        options: { host: 'localhost', port: 3003 },
      },
      {
        name: 'ANNOUNCEMENT_SERVICE',
        transport: Transport.TCP,
        options: { host: 'localhost', port: 3004 },
      },
      {
        name: 'SURVEY_SERVICE',
        transport: Transport.TCP,
        options: { host: 'localhost', port: 3005 },
      },
      {
        name: 'NOTIFICATION_SERVICE',
        transport: Transport.TCP,
        options: { host: 'localhost', port: 3006 },
      },
      {
        name: 'FILE_SERVICE',
        transport: Transport.TCP,
        options: { host: 'localhost', port: 3007 },
      },
    ]),
  ],
})
export class AppModule {}
```

```typescript
// サービス側の設定 (例: post-service)
async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    PostModule,
    {
      transport: Transport.TCP,
      options: { host: 'localhost', port: 3003 },
    },
  );
  await app.listen();
}
```

### 4.2 非同期通信 (Redis Pub/Sub)

サービス間のイベント駆動通信。notification-service が主要なコンシューマー。

```typescript
// イベント発行側 (例: post-service)
@Inject('REDIS_PUBLISHER')
private redisPublisher: Redis;

async createPost(data: CreatePostDto) {
  const post = await this.postRepository.save(data);

  // イベント発行
  await this.redisPublisher.publish('post.post.created', JSON.stringify({
    postId: post.id,
    userId: post.userId,
    postDate: post.postDate,
    title: post.title,
    timestamp: new Date().toISOString(),
  }));

  return post;
}
```

```typescript
// イベント購読側 (例: notification-service)
@Inject('REDIS_SUBSCRIBER')
private redisSubscriber: Redis;

onModuleInit() {
  this.redisSubscriber.subscribe(
    'post.post.created',
    'post.post.liked',
    'post.comment.created',
    'announcement.announcement.created',
    'survey.survey.created',
  );

  this.redisSubscriber.on('message', (channel, message) => {
    const payload = JSON.parse(message);
    this.handleEvent(channel, payload);
  });
}
```

---

## 5. イベントフロー

### 5.1 イベント一覧

| # | イベント名 | 発行元 | 購読者 | 説明 |
|---|-----------|--------|--------|------|
| 1 | `post.post.created` | post-service | notification-service | 投稿が作成された |
| 2 | `post.post.liked` | post-service | notification-service | 投稿にいいねされた |
| 3 | `post.post.unliked` | post-service | notification-service | いいねが取り消された |
| 4 | `post.comment.created` | post-service | notification-service | コメントが追加された |
| 5 | `announcement.announcement.created` | announcement-service | notification-service | お知らせが公開された |
| 6 | `announcement.announcement.updated` | announcement-service | notification-service | お知らせが更新された |
| 7 | `survey.survey.created` | survey-service | notification-service | アンケートが公開された |
| 8 | `survey.survey.reminder` | survey-service | notification-service | アンケート締切リマインダー |
| 9 | `user.user.activated` | user-service | notification-service | ユーザーが有効化された |
| 10 | `user.user.deactivated` | user-service | auth-service | ユーザーが無効化された（セッション破棄） |

### 5.2 イベントペイロード

```typescript
// post.post.created
{
  postId: string;
  userId: string;
  postDate: string;
  title: string | null;
  timestamp: string;
}

// post.post.liked
{
  postId: string;
  postOwnerId: string;  // 投稿者（通知先）
  likerId: string;       // いいねした人
  likeCount: number;
  timestamp: string;
}

// post.comment.created
{
  postId: string;
  postOwnerId: string;  // 投稿者（通知先）
  commentId: string;
  commenterId: string;   // コメントした人
  commentContent: string; // コメント本文（プレビュー用、100文字まで）
  timestamp: string;
}

// announcement.announcement.created
{
  announcementId: string;
  title: string;
  authorId: string;
  timestamp: string;
}

// survey.survey.created
{
  surveyId: string;
  title: string;
  authorId: string;
  endsAt: string;
  timestamp: string;
}
```

### 5.3 イベント処理フロー例（いいね通知）

```
1. ユーザーA が ユーザーB の投稿にいいね
2. [post-service] likes テーブルに INSERT
3. [post-service] posts.like_count を更新
4. [post-service] Redis Pub: "post.post.liked" イベント発行
5. [notification-service] Redis Sub: イベント受信
6. [notification-service] notifications テーブルに INSERT
7. [notification-service] WebSocket: ユーザーBのルームに "notification" イベント送信
8. [notification-service] Push通知: ユーザーBのサブスクリプションに送信
9. [フロントエンド] WebSocket受信 → 通知バッジ更新 + トースト表示
```

---

## 6. WebSocket ゲートウェイ

notification-service 内の WebSocket ゲートウェイがリアルタイム通知を担当。

### 接続フロー

```
1. クライアントが Socket.IO で接続
   URL: ws://localhost:3000/notifications
   Auth: { token: "Bearer eyJhbG..." }

2. API Gateway が WebSocket 接続を notification-service にプロキシ

3. notification-service が JWT を検証してユーザーを特定

4. ユーザーID でルームに参加: user:{userId}

5. イベント発生時に該当ルームにブロードキャスト
```

### クライアントイベント

| イベント名 | 方向 | 説明 |
|-----------|------|------|
| `connection` | Client → Server | 接続確立 |
| `disconnect` | Client → Server | 切断 |
| `notification` | Server → Client | 新着通知 |
| `post:liked` | Server → Client | 投稿にいいね（リアルタイムカウント更新） |
| `post:commented` | Server → Client | 投稿にコメント |
| `announcement:new` | Server → Client | 新着お知らせ |
| `unread-count` | Server → Client | 未読通知件数更新 |

---

## 7. エラーハンドリング

### サービス間通信のタイムアウト

```typescript
// API Gateway のタイムアウト設定
this.postService.send({ cmd: 'post.findAll' }, data).pipe(
  timeout(5000),
  catchError(err => {
    if (err instanceof TimeoutError) {
      throw new GatewayTimeoutException('サービスが応答しません');
    }
    throw err;
  }),
);
```

### サービス障害時のフォールバック

| サービス | 障害時の影響 | フォールバック |
|---------|------------|---------------|
| auth-service | ログイン不可 | なし（必須サービス） |
| user-service | ユーザー情報取得不可 | キャッシュされたユーザー情報を使用 |
| post-service | 投稿閲覧・作成不可 | なし（主要機能） |
| announcement-service | お知らせ閲覧不可 | キャッシュされたお知らせを表示 |
| survey-service | アンケート機能不可 | エラーメッセージ表示 |
| notification-service | リアルタイム通知不可 | ポーリングにフォールバック |
| file-service | ファイル操作不可 | 画像プレースホルダー表示 |

---

## 8. デプロイメント構成

### 開発環境

```yaml
# docker-compose.yml (開発用)
version: '3.8'
services:
  api-gateway:
    build: ./apps/api-gateway
    ports: ['3000:3000']
    depends_on: [redis, sqlserver]

  auth-service:
    build: ./apps/auth-service
    ports: ['3001:3001']
    depends_on: [redis, sqlserver]

  user-service:
    build: ./apps/user-service
    ports: ['3002:3002']
    depends_on: [sqlserver]

  post-service:
    build: ./apps/post-service
    ports: ['3003:3003']
    depends_on: [sqlserver, redis]

  announcement-service:
    build: ./apps/announcement-service
    ports: ['3004:3004']
    depends_on: [sqlserver, redis]

  survey-service:
    build: ./apps/survey-service
    ports: ['3005:3005']
    depends_on: [sqlserver, redis]

  notification-service:
    build: ./apps/notification-service
    ports: ['3006:3006']
    depends_on: [sqlserver, redis]

  file-service:
    build: ./apps/file-service
    ports: ['3007:3007']
    depends_on: [minio]

  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    ports: ['1433:1433']

  redis:
    image: redis:7-alpine
    ports: ['6379:6379']

  minio:
    image: minio/minio
    ports: ['9000:9000', '9001:9001']
    command: server /data --console-address ":9001"
```

### 本番環境（オンプレミス）

- 各サービスを PM2 または systemd で管理
- Nginx をリバースプロキシとして前段に配置
- SQL Server は既存のオンプレミスインスタンスを使用
- Redis は単体インスタンス（100-150ユーザー規模では十分）
- MinIO は専用のストレージサーバー上で稼働
