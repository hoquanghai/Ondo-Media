/**
 * Redis キャッシュキーテンプレート
 */
export const CACHE_KEYS = {
  // User
  USER_BY_ID: (id: string) => `user:${id}`,
  USER_PERMISSIONS: (id: string) => `user:${id}:permissions`,
  USER_LIST: (page: number, limit: number) => `users:list:${page}:${limit}`,
  DEPARTMENTS: 'departments:list',

  // Post
  POST_BY_ID: (id: string) => `post:${id}`,
  POST_FEED: (page: number, limit: number) => `posts:feed:${page}:${limit}`,
  POST_DATE_COUNTS: (yearMonth: string) => `posts:date-counts:${yearMonth}`,

  // Announcement
  ANNOUNCEMENT_BY_ID: (id: string) => `announcement:${id}`,
  ANNOUNCEMENT_LIST: (page: number) => `announcements:list:${page}`,
  ANNOUNCEMENT_PINNED: 'announcements:pinned',

  // Survey
  SURVEY_BY_ID: (id: string) => `survey:${id}`,
  SURVEY_ACTIVE_LIST: 'surveys:active',

  // Notification
  NOTIFICATION_UNREAD_COUNT: (userId: string) => `notification:unread:${userId}`,

  // Auth
  REFRESH_TOKEN: (userId: string, tokenId: string) => `auth:refresh:${userId}:${tokenId}`,
  REFRESH_TOKEN_BLACKLIST: (tokenId: string) => `auth:blacklist:${tokenId}`,

  // Session
  USER_SESSION: (userId: string) => `session:${userId}`,
} as const;
