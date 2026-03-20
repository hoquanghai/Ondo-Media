import { env } from "./env";

// API エンドポイント
export const API_ENDPOINTS = {
  // 認証
  AUTH_LOGIN: "/auth/login",
  AUTH_CREATE_PASSWORD: "/auth/create-password",
  AUTH_CHANGE_PASSWORD: "/auth/change-password",
  AUTH_LOGOUT: "/auth/logout",
  AUTH_REFRESH: "/auth/refresh",
  AUTH_ME: "/auth/me",

  // ユーザー
  USERS: "/users",
  USER_BY_ID: (id: string) => `/users/${id}`,
  USER_PROFILE: (id: string) => `/users/${id}/profile`,

  // 投稿
  POSTS: "/posts",
  POST_BY_ID: (id: string) => `/posts/${id}`,
  POST_LIKE: (id: string) => `/posts/${id}/like`,
  POST_UNLIKE: (id: string) => `/posts/${id}/unlike`,
  POST_COMMENTS: (id: string) => `/posts/${id}/comments`,
  POST_DATES: "/posts/dates",

  // お知らせ
  ANNOUNCEMENTS: "/announcements",
  ANNOUNCEMENT_BY_ID: (id: string) => `/announcements/${id}`,

  // アンケート
  SURVEYS: "/surveys",
  SURVEY_BY_ID: (id: string) => `/surveys/${id}`,
  SURVEY_RESPOND: (id: string) => `/surveys/${id}/responses`,
  SURVEY_RESULTS: (id: string) => `/surveys/${id}/results`,

  // 通知
  NOTIFICATIONS: "/notifications",
  NOTIFICATION_READ: (id: string) => `/notifications/${id}/read`,
  NOTIFICATIONS_READ_ALL: "/notifications/read-all",

  // ファイル
  FILES_UPLOAD: "/files/upload",
} as const;

// アプリケーション定数
export const APP = {
  NAME: env.appName,
  DESCRIPTION: "社内コミュニケーションプラットフォーム",
  POST_MAX_LENGTH: 2000,
  COMMENT_MAX_LENGTH: 500,
  FILE_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  ALLOWED_FILE_TYPES: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  PAGINATION_DEFAULT_LIMIT: 20,
  NOTIFICATION_TOAST_DURATION: 5000,
} as const;

// 日本語テキスト定数
export const TEXT = {
  // 共通
  LOADING: "読み込み中...",
  ERROR: "エラーが発生しました",
  SAVE: "保存",
  CANCEL: "キャンセル",
  DELETE: "削除",
  EDIT: "編集",
  CREATE: "作成",
  CONFIRM: "確認",
  CLOSE: "閉じる",
  SEARCH: "検索",
  BACK: "戻る",
  SUBMIT: "送信",
  REQUIRED: "必須",

  // 認証
  LOGIN: "ログイン",
  LOGOUT: "ログアウト",
  EMAIL: "メールアドレス",
  PASSWORD: "パスワード",
  LOGIN_TITLE: "日報にログイン",
  LOGIN_DESCRIPTION: "メールアドレスとパスワードを入力してください",
  LOGIN_BUTTON: "ログインする",
  LOGIN_SSO: "Microsoft 365でログイン",

  // ナビゲーション
  NAV_TIMELINE: "タイムライン",
  NAV_ANNOUNCEMENTS: "お知らせ",
  NAV_SURVEYS: "アンケート",
  NAV_MY_PAGE: "マイページ",
  NAV_ADMIN: "管理者",
  NAV_ADMIN_DASHBOARD: "ダッシュボード",
  NAV_ADMIN_USERS: "ユーザー管理",
  NAV_ADMIN_PERMISSIONS: "権限管理",

  // 投稿
  POST_CREATE: "投稿を作成",
  POST_PLACEHOLDER: "今日の業務内容を書きましょう...",
  POST_SUBMIT: "投稿する",
  POST_EMPTY: "投稿がありません",
  POST_EMPTY_DESCRIPTION: "まだ誰も投稿していません。最初の投稿を作成しましょう！",
  POST_DELETE_CONFIRM: "この投稿を削除しますか？",
  POST_DELETE_WARNING: "この操作は取り消せません。",

  // コメント
  COMMENT_PLACEHOLDER: "コメントを入力...",
  COMMENT_SUBMIT: "送信",
  COMMENT_EMPTY: "コメントはありません",
  COMMENT_EMPTY_DESCRIPTION: "最初のコメントを投稿しましょう",

  // お知らせ
  ANNOUNCEMENT_EMPTY: "お知らせはありません",
  ANNOUNCEMENT_EMPTY_DESCRIPTION:
    "新しいお知らせが投稿されるとここに表示されます",

  // アンケート
  SURVEY_EMPTY: "アンケートはありません",
  SURVEY_EMPTY_DESCRIPTION:
    "新しいアンケートが作成されるとここに表示されます",
  SURVEY_CREATE: "アンケートを作成",
  SURVEY_RESPOND: "回答する",
  SURVEY_RESULTS: "結果を見る",
  SURVEY_STATUS_ACTIVE: "受付中",
  SURVEY_STATUS_CLOSED: "終了",

  // 通知
  NOTIFICATION_EMPTY: "通知はありません",
  NOTIFICATION_EMPTY_DESCRIPTION: "新しい通知はここに表示されます",
  NOTIFICATION_MARK_ALL_READ: "すべて既読にする",

  // エラー
  ERROR_NETWORK: "ネットワークエラーが発生しました",
  ERROR_UNAUTHORIZED: "認証が必要です",
  ERROR_FORBIDDEN: "アクセス権限がありません",
  ERROR_NOT_FOUND: "ページが見つかりません",
  ERROR_SERVER: "サーバーエラーが発生しました",
  ERROR_VALIDATION: "入力内容に誤りがあります",
} as const;
