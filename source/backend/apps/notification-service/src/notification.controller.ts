import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationService } from './notification.service';
import { MESSAGE_PATTERNS } from '@app/common';

@Controller()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @MessagePattern(MESSAGE_PATTERNS.NOTIFICATION_FIND_ALL)
  async findAll(
    @Payload() data: { userId: number; page?: number; limit?: number },
  ) {
    return this.notificationService.findAll(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.NOTIFICATION_GET_UNREAD_COUNT)
  async getUnreadCount(@Payload() data: { userId: number }) {
    return this.notificationService.getUnreadCount(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.NOTIFICATION_MARK_READ)
  async markRead(
    @Payload() data: { notificationId: string; userId: number },
  ) {
    return this.notificationService.markRead(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.NOTIFICATION_MARK_ALL_READ)
  async markAllRead(@Payload() data: { userId: number }) {
    return this.notificationService.markAllRead(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.NOTIFICATION_PUSH_SUBSCRIBE)
  async pushSubscribe(
    @Payload()
    data: {
      userId: number;
      subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
    },
  ) {
    return this.notificationService.pushSubscribe(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.NOTIFICATION_PUSH_UNSUBSCRIBE)
  async pushUnsubscribe(
    @Payload() data: { userId: number; endpoint: string },
  ) {
    return this.notificationService.pushUnsubscribe(data);
  }
}
