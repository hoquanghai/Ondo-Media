/**
 * Redis Pub/Sub イベント名
 */
export const EVENTS = {
  // Post events
  POST_CREATED: 'post.post.created',
  POST_LIKED: 'post.post.liked',
  POST_UNLIKED: 'post.post.unliked',
  COMMENT_CREATED: 'post.comment.created',

  // Announcement events
  ANNOUNCEMENT_CREATED: 'announcement.announcement.created',
  ANNOUNCEMENT_UPDATED: 'announcement.announcement.updated',

  // Survey events
  SURVEY_CREATED: 'survey.survey.created',
  SURVEY_REMINDER: 'survey.survey.reminder',

  // User events
  USER_ACTIVATED: 'user.user.activated',
  USER_DEACTIVATED: 'user.user.deactivated',
} as const;
