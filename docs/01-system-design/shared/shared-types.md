# 共有型定義 (Shared TypeScript Types)

> コープネット - フロントエンド・バックエンド共通の型定義

## 1. Enums

```typescript
/**
 * 認証プロバイダー
 */
export enum AuthProvider {
  Local = 'local',
  Microsoft365 = 'microsoft365',
}

/**
 * ファイル種別
 */
export enum FileType {
  Image = 'image',
  Video = 'video',
  Document = 'document',
}

/**
 * 通知種別
 */
export enum NotificationType {
  Like = 'like',
  Comment = 'comment',
  Announcement = 'announcement',
  Survey = 'survey',
  SurveyReminder = 'survey_reminder',
  System = 'system',
}

/**
 * アンケート質問種別
 */
export enum QuestionType {
  MultipleChoice = 'multiple_choice',
  Text = 'text',
  Rating = 'rating',
}

/**
 * 参照種別（通知のポリモーフィック参照用）
 */
export enum ReferenceType {
  Post = 'post',
  Comment = 'comment',
  Announcement = 'announcement',
  Survey = 'survey',
}
```

---

## 2. エンティティ型

### User

```typescript
export interface User {
  id: string;
  employeeId: string;
  username: string;
  email: string;
  displayName: string;
  department: string;
  position: string | null;
  avatarUrl: string | null;
  bio: string | null;
  authProvider: AuthProvider;
  ms365Id: string | null;
  isActive: boolean;
  lastLoginAt: string | null; // ISO 8601
  createdAt: string;          // ISO 8601
  updatedAt: string;          // ISO 8601
}
```

### Post

```typescript
export interface Post {
  id: string;
  userId: string;
  title: string | null;
  content: string;
  postDate: string;           // YYYY-MM-DD
  likeCount: number;
  commentCount: number;
  isLiked: boolean;           // 現在ユーザーがいいね済みか（API応答時に付与）
  createdAt: string;
  updatedAt: string;
  // リレーション（展開時）
  user?: UserSummary;
  files?: PostFile[];
  comments?: Comment[];
}
```

### Comment

```typescript
export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  // リレーション
  user?: UserSummary;
}
```

### Like

```typescript
export interface Like {
  id: string;
  postId: string;
  userId: string;
  createdAt: string;
  // リレーション
  user?: UserSummary;
}
```

### PostFile

```typescript
export interface PostFile {
  id: string;
  postId: string;
  fileName: string;
  storageKey: string;
  fileSize: number;
  mimeType: string;
  fileType: FileType;
  sortOrder: number;
  createdAt: string;
  // 派生
  url?: string;               // 署名付きURL（API応答時に付与）
}
```

### Announcement

```typescript
export interface Announcement {
  id: string;
  userId: string;
  title: string;
  content: string;
  isPinned: boolean;
  publishAt: string | null;   // 予約公開日時
  expiresAt: string | null;   // 掲載終了日時
  createdAt: string;
  updatedAt: string;
  // リレーション
  user?: UserSummary;
  isRead?: boolean;           // 現在ユーザーの既読状態（API応答時に付与）
}
```

### Survey

```typescript
export interface Survey {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  isAnonymous: boolean;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
  // リレーション
  user?: UserSummary;
  questions?: SurveyQuestion[];
  // 派生
  responseCount?: number;
  hasResponded?: boolean;     // 現在ユーザーの回答状態（API応答時に付与）
}
```

### SurveyQuestion

```typescript
export interface SurveyQuestion {
  id: string;
  surveyId: string;
  questionText: string;
  questionType: QuestionType;
  options: string[] | null;   // multiple_choice の場合の選択肢
  isRequired: boolean;
  sortOrder: number;
  createdAt: string;
}
```

### SurveyResponse

```typescript
export interface SurveyResponse {
  id: string;
  surveyId: string;
  questionId: string;
  userId: string;
  answer: string;             // テキスト回答 or 選択肢のJSON
  createdAt: string;
}
```

### Notification

```typescript
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceType: ReferenceType | null;
  referenceId: string | null;
  actorId: string | null;
  isRead: boolean;
  createdAt: string;
  // リレーション
  actor?: UserSummary;
}
```

### Permission

```typescript
export interface Permission {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}
```

### UserPermission

```typescript
export interface UserPermission {
  id: string;
  userId: string;
  permissionId: string;
  grantedBy: string;
  createdAt: string;
  // リレーション
  permission?: Permission;
}
```

### PushSubscription

```typescript
export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
  createdAt: string;
}
```

---

## 3. サマリー型（リレーション埋め込み用）

```typescript
/**
 * ユーザーサマリー（投稿・コメント等に埋め込む簡易ユーザー情報）
 */
export interface UserSummary {
  id: string;
  displayName: string;
  department: string;
  avatarUrl: string | null;
}

/**
 * 投稿サマリー（通知等に埋め込む簡易投稿情報）
 */
export interface PostSummary {
  id: string;
  title: string | null;
  postDate: string;
}
```

---

## 4. API レスポンス型

```typescript
/**
 * 標準APIレスポンス
 */
export interface ApiResponse<T> {
  success: true;
  data: T;
  meta: {
    timestamp: string;
  };
}

/**
 * ページネーション付きAPIレスポンス
 */
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    timestamp: string;
  };
}

/**
 * エラーレスポンス
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: ValidationError[];
  };
  meta: {
    timestamp: string;
  };
}

export interface ValidationError {
  field: string;
  message: string;
}

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | 'TOKEN_EXPIRED'
  | 'RATE_LIMIT_EXCEEDED';
```

---

## 5. 認証型

```typescript
/**
 * ローカルログインリクエスト
 */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * Microsoft 365 ログインリクエスト
 */
export interface MicrosoftLoginRequest {
  accessToken: string;
}

/**
 * ログインレスポンス
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;           // 秒数
  user: User;
}

/**
 * トークンリフレッシュリクエスト
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * 現在のユーザー情報（認証コンテキスト）
 */
export interface CurrentUser {
  id: string;
  employeeId: string;
  username: string;
  email: string;
  displayName: string;
  department: string;
  permissions: string[];       // パーミッション名の配列
}

/**
 * JWT ペイロード
 */
export interface JwtPayload {
  sub: string;                 // user.id
  username: string;
  email: string;
  iat: number;
  exp: number;
}
```

---

## 6. リクエスト型（DTO）

### 投稿

```typescript
export interface CreatePostRequest {
  title?: string;
  content: string;
  postDate: string;            // YYYY-MM-DD
  files?: File[];              // multipart
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
  postDate?: string;
}
```

### コメント

```typescript
export interface CreateCommentRequest {
  content: string;
}
```

### お知らせ

```typescript
export interface CreateAnnouncementRequest {
  title: string;
  content: string;
  isPinned?: boolean;
  publishAt?: string;
  expiresAt?: string;
}

export interface UpdateAnnouncementRequest {
  title?: string;
  content?: string;
  isPinned?: boolean;
  publishAt?: string;
  expiresAt?: string;
}
```

### アンケート

```typescript
export interface CreateSurveyRequest {
  title: string;
  description?: string;
  isAnonymous?: boolean;
  startsAt: string;
  endsAt: string;
  questions: CreateSurveyQuestionRequest[];
}

export interface CreateSurveyQuestionRequest {
  questionText: string;
  questionType: QuestionType;
  options?: string[];
  isRequired?: boolean;
  sortOrder: number;
}

export interface SubmitSurveyResponseRequest {
  answers: {
    questionId: string;
    answer: string;
  }[];
}
```

### ユーザー管理

```typescript
export interface UpdateUserProfileRequest {
  displayName?: string;
  bio?: string;
  avatar?: File;               // multipart
}

export interface AdminUpdateUserRequest {
  displayName?: string;
  department?: string;
  position?: string;
  isActive?: boolean;
}
```

---

## 7. クエリパラメータ型

```typescript
/**
 * 共通ページネーションパラメータ
 */
export interface PaginationParams {
  page?: number;               // デフォルト: 1
  pageSize?: number;           // デフォルト: 20, 最大: 100
}

/**
 * 投稿一覧パラメータ
 */
export interface PostListParams extends PaginationParams {
  date?: string;               // YYYY-MM-DD（特定日の投稿取得）
  userId?: string;             // 特定ユーザーの投稿取得
  sortBy?: 'createdAt' | 'postDate';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 通知一覧パラメータ
 */
export interface NotificationListParams extends PaginationParams {
  isRead?: boolean;
}

/**
 * ユーザー一覧パラメータ（管理用）
 */
export interface UserListParams extends PaginationParams {
  search?: string;             // 名前・部署で検索
  department?: string;
  isActive?: boolean;
}
```

---

## 8. WebSocket イベント型

```typescript
/**
 * WebSocket で送受信するイベント
 */
export interface WsNotificationEvent {
  type: NotificationType;
  notification: Notification;
}

export interface WsPostLikedEvent {
  postId: string;
  likeCount: number;
  userId: string;
}

export interface WsNewCommentEvent {
  postId: string;
  commentCount: number;
  comment: Comment;
}

export interface WsAnnouncementEvent {
  announcement: Announcement;
}
```

---

## 9. ユーティリティ型

```typescript
/**
 * 投稿の日付別カウント（カレンダー表示用）
 */
export interface PostDateCount {
  date: string;                // YYYY-MM-DD
  count: number;
}

/**
 * ユーザー統計
 */
export interface UserStats {
  totalPosts: number;
  totalLikesReceived: number;
  totalCommentsReceived: number;
  currentStreak: number;       // 連続投稿日数
  longestStreak: number;       // 最長連続投稿日数
  thisMonthPosts: number;
  lastPostDate: string | null;
}

/**
 * 管理者ダッシュボード統計
 */
export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalPosts: number;
  todayPosts: number;
  totalAnnouncements: number;
  activeSurveys: number;
  postCompletionRate: number;  // 今日の投稿率（%）
}

/**
 * アンケート結果
 */
export interface SurveyResult {
  surveyId: string;
  totalResponses: number;
  questions: SurveyQuestionResult[];
}

export interface SurveyQuestionResult {
  questionId: string;
  questionText: string;
  questionType: QuestionType;
  responses: SurveyQuestionResponseSummary;
}

export type SurveyQuestionResponseSummary =
  | MultipleChoiceSummary
  | TextSummary
  | RatingSummary;

export interface MultipleChoiceSummary {
  type: 'multiple_choice';
  options: { option: string; count: number; percentage: number }[];
}

export interface TextSummary {
  type: 'text';
  answers: string[];
}

export interface RatingSummary {
  type: 'rating';
  average: number;
  distribution: { rating: number; count: number }[];
}
```
