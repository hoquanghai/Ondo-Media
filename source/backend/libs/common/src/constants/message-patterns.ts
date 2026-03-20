/**
 * TCP メッセージパターン名（サービス間同期通信）
 */
export const MESSAGE_PATTERNS = {
  // Auth Service
  AUTH_LOGIN: { cmd: 'auth.login' },
  AUTH_LOGIN_MICROSOFT: { cmd: 'auth.loginMicrosoft' },
  AUTH_REFRESH: { cmd: 'auth.refresh' },
  AUTH_LOGOUT: { cmd: 'auth.logout' },
  AUTH_VALIDATE_TOKEN: { cmd: 'auth.validateToken' },
  AUTH_GET_CURRENT_USER: { cmd: 'auth.getCurrentUser' },
  AUTH_CREATE_PASSWORD: { cmd: 'auth.createPassword' },
  AUTH_CHANGE_PASSWORD: { cmd: 'auth.changePassword' },

  // User Service
  USER_FIND_ALL: { cmd: 'user.findAll' },
  USER_FIND_BY_ID: { cmd: 'user.findById' },
  USER_FIND_BY_USERNAME: { cmd: 'user.findByUsername' },
  USER_FIND_BY_EMAIL: { cmd: 'user.findByEmail' },
  USER_FIND_BY_MS365_ID: { cmd: 'user.findByMs365Id' },
  USER_UPDATE_PROFILE: { cmd: 'user.updateProfile' },
  USER_ADMIN_UPDATE: { cmd: 'user.adminUpdate' },
  USER_GET_STATS: { cmd: 'user.getStats' },
  USER_GET_PERMISSIONS: { cmd: 'user.getPermissions' },
  USER_GRANT_PERMISSION: { cmd: 'user.grantPermission' },
  USER_REVOKE_PERMISSION: { cmd: 'user.revokePermission' },
  USER_CREATE: { cmd: 'user.create' },
  USER_DEACTIVATE: { cmd: 'user.deactivate' },
  USER_GET_POSTS: { cmd: 'user.getPosts' },
  USER_SET_PERMISSIONS: { cmd: 'user.setPermissions' },
  USER_LIST_ALL_PERMISSIONS: { cmd: 'user.listAllPermissions' },
  USER_UPDATE_LAST_LOGIN: { cmd: 'user.updateLastLogin' },

  // Post Service
  POST_FIND_ALL: { cmd: 'post.findAll' },
  POST_FIND_BY_ID: { cmd: 'post.findById' },
  POST_CREATE: { cmd: 'post.create' },
  POST_UPDATE: { cmd: 'post.update' },
  POST_DELETE: { cmd: 'post.delete' },
  POST_GET_DATE_COUNTS: { cmd: 'post.getDateCounts' },
  POST_LIKE: { cmd: 'post.like' },
  POST_UNLIKE: { cmd: 'post.unlike' },
  POST_FIND_COMMENTS: { cmd: 'post.findComments' },
  POST_CREATE_COMMENT: { cmd: 'post.createComment' },
  POST_DELETE_COMMENT: { cmd: 'post.deleteComment' },
  POST_FIND_BY_USER_ID: { cmd: 'post.findByUserId' },
  POST_GET_LIKES: { cmd: 'post.getLikes' },
  POST_UPDATE_COMMENT: { cmd: 'post.updateComment' },

  // Announcement Service
  ANNOUNCEMENT_FIND_ALL: { cmd: 'announcement.findAll' },
  ANNOUNCEMENT_FIND_BY_ID: { cmd: 'announcement.findById' },
  ANNOUNCEMENT_CREATE: { cmd: 'announcement.create' },
  ANNOUNCEMENT_UPDATE: { cmd: 'announcement.update' },
  ANNOUNCEMENT_DELETE: { cmd: 'announcement.delete' },
  ANNOUNCEMENT_MARK_READ: { cmd: 'announcement.markRead' },
  ANNOUNCEMENT_UNREAD_COUNT: { cmd: 'announcement.unreadCount' },

  // Survey Service
  SURVEY_FIND_ALL: { cmd: 'survey.findAll' },
  SURVEY_FIND_BY_ID: { cmd: 'survey.findById' },
  SURVEY_CREATE: { cmd: 'survey.create' },
  SURVEY_UPDATE: { cmd: 'survey.update' },
  SURVEY_DELETE: { cmd: 'survey.delete' },
  SURVEY_SUBMIT_RESPONSE: { cmd: 'survey.submitResponse' },
  SURVEY_HAS_RESPONDED: { cmd: 'survey.hasResponded' },
  SURVEY_GET_RESULTS: { cmd: 'survey.getResults' },
  SURVEY_EXPORT_EXCEL: { cmd: 'survey.exportExcel' },

  // Notification Service
  NOTIFICATION_FIND_ALL: { cmd: 'notification.findAll' },
  NOTIFICATION_GET_UNREAD_COUNT: { cmd: 'notification.getUnreadCount' },
  NOTIFICATION_MARK_READ: { cmd: 'notification.markRead' },
  NOTIFICATION_MARK_ALL_READ: { cmd: 'notification.markAllRead' },
  NOTIFICATION_PUSH_SUBSCRIBE: { cmd: 'notification.pushSubscribe' },
  NOTIFICATION_PUSH_UNSUBSCRIBE: { cmd: 'notification.pushUnsubscribe' },

  // File Service
  FILE_UPLOAD: { cmd: 'file.upload' },
  FILE_GET_URL: { cmd: 'file.getUrl' },
  FILE_DELETE: { cmd: 'file.delete' },
  FILE_GET_INFO: { cmd: 'file.getInfo' },
} as const;
