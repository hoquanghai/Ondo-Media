import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { EVENTS, NotificationType } from '@app/common';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class EventSubscriber implements OnModuleInit, OnModuleDestroy {
  private subscriber: Redis;
  private readonly logger = new Logger(EventSubscriber.name);

  private readonly CHANNELS = [
    EVENTS.POST_CREATED,
    EVENTS.POST_LIKED,
    EVENTS.COMMENT_CREATED,
    EVENTS.ANNOUNCEMENT_CREATED,
    EVENTS.SURVEY_CREATED,
  ];

  constructor(
    private readonly config: ConfigService,
    private readonly notificationService: NotificationService,
    private readonly gateway: NotificationGateway,
  ) {}

  async onModuleInit() {
    const host = this.config.get<string>('REDIS_HOST', 'localhost');
    const port = parseInt(this.config.get<string>('REDIS_PORT', '6379'), 10);
    const password = this.config.get<string>('REDIS_PASSWORD') || undefined;

    this.subscriber = new Redis({ host, port, password });

    // Subscribe to all event channels
    await this.subscriber.subscribe(...this.CHANNELS);

    this.subscriber.on('message', async (channel: string, message: string) => {
      try {
        const payload = JSON.parse(message);
        const data = payload.data ?? payload;
        await this.handleEvent(channel, data);
      } catch (err) {
        this.logger.error(`Error handling event on ${channel}`, err);
      }
    });

    this.logger.log(`Subscribed to channels: ${this.CHANNELS.join(', ')}`);
  }

  async onModuleDestroy() {
    if (this.subscriber) {
      await this.subscriber.unsubscribe(...this.CHANNELS);
      await this.subscriber.quit();
    }
  }

  private async handleEvent(channel: string, data: any) {
    switch (channel) {
      case EVENTS.POST_CREATED:
        await this.handlePostCreated(data);
        break;

      case EVENTS.POST_LIKED:
        await this.handlePostLiked(data);
        break;

      case EVENTS.COMMENT_CREATED:
        await this.handleCommentCreated(data);
        break;

      case EVENTS.ANNOUNCEMENT_CREATED:
        await this.handleAnnouncementCreated(data);
        break;

      case EVENTS.SURVEY_CREATED:
        await this.handleSurveyCreated(data);
        break;
    }
  }

  private async handlePostCreated(data: any) {
    // Notify all users (except author) via broadcast
    await this.notificationService.createBroadcast({
      type: NotificationType.System,
      title: '新しい投稿が作成されました',
      message: '新しい投稿が共有されました',
      referenceType: 'post',
      referenceId: data.postId ?? data.id,
      actorId: data.authorId ?? data.userId,
      excludeUserId: data.authorId ?? data.userId,
    });
    this.gateway.broadcast('notification', {
      type: 'post.created',
      title: '新しい投稿が作成されました',
      referenceType: 'post',
      referenceId: data.postId ?? data.id,
    });

    // Emit timeline event for realtime updates
    this.gateway.broadcast('timeline:post-created', {
      post: data.post,
      authorId: data.authorId ?? data.userId,
    });
  }

  private async handlePostLiked(data: any) {
    // Notify the post author
    const postAuthorId = data.postAuthorId ?? data.authorId;
    const likerId = data.likerId ?? data.userId;

    if (postAuthorId && postAuthorId !== likerId) {
      const notification = await this.notificationService.create({
        recipientId: postAuthorId,
        type: NotificationType.Like,
        title: 'あなたの投稿にいいねがつきました',
        message: 'あなたの投稿にいいねがつきました',
        referenceType: 'post',
        referenceId: data.postId,
        actorId: likerId,
      });
      this.gateway.sendToUser(postAuthorId, 'notification', notification);
    }

    // Emit timeline event for realtime like count updates
    this.gateway.broadcast('timeline:post-liked', {
      postId: data.postId,
      likerId,
      likeCount: data.likeCount,
      reactionType: data.reactionType,
    });
  }

  private async handleCommentCreated(data: any) {
    // Notify the post author
    const postAuthorId = data.postAuthorId ?? data.postOwnerId;
    const commentAuthorId = data.authorId ?? data.userId;

    if (postAuthorId && postAuthorId !== commentAuthorId) {
      const notification = await this.notificationService.create({
        recipientId: postAuthorId,
        type: NotificationType.Comment,
        title: 'あなたの投稿にコメントがつきました',
        message: 'あなたの投稿にコメントがつきました',
        referenceType: 'post',
        referenceId: data.postId,
        actorId: commentAuthorId,
      });
      this.gateway.sendToUser(postAuthorId, 'notification', notification);
    }

    // Emit timeline event for realtime comment count updates
    this.gateway.broadcast('timeline:comment-created', {
      postId: data.postId,
      authorId: commentAuthorId,
      commentCount: data.commentCount,
      comment: data.comment,
    });
  }

  private async handleAnnouncementCreated(data: any) {
    // Broadcast to all users
    await this.notificationService.createBroadcast({
      type: NotificationType.Announcement,
      title: '新しいお知らせ',
      message: data.title ?? '新しいお知らせがあります',
      referenceType: 'announcement',
      referenceId: data.announcementId ?? data.id,
      actorId: data.authorId ?? data.userId,
    });
    this.gateway.broadcast('notification', {
      type: 'announcement.created',
      title: '新しいお知らせ',
      message: data.title,
      referenceType: 'announcement',
      referenceId: data.announcementId ?? data.id,
    });
  }

  private async handleSurveyCreated(data: any) {
    // Broadcast to all users
    await this.notificationService.createBroadcast({
      type: NotificationType.Survey,
      title: '新しいアンケート',
      message: data.title ?? '新しいアンケートが公開されました',
      referenceType: 'survey',
      referenceId: data.surveyId ?? data.id,
      actorId: data.authorId ?? data.userId,
    });
    this.gateway.broadcast('notification', {
      type: 'survey.created',
      title: '新しいアンケート',
      message: data.title,
      referenceType: 'survey',
      referenceId: data.surveyId ?? data.id,
    });
  }
}
