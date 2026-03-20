import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  CurrentUser,
  MESSAGE_PATTERNS,
  SERVICE_TOKENS,
} from '@app/common';

@Controller('notifications')
export class NotificationGatewayController {
  constructor(
    @Inject(SERVICE_TOKENS.NOTIFICATION_SERVICE)
    private readonly client: ClientProxy,
  ) {}

  // ─── List (paginated) ───

  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return firstValueFrom(
      this.client.send(MESSAGE_PATTERNS.NOTIFICATION_FIND_ALL, {
        userId: user.shainBangou,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      }),
    );
  }

  // ─── Unread Count ───

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: any) {
    return firstValueFrom(
      this.client.send(MESSAGE_PATTERNS.NOTIFICATION_GET_UNREAD_COUNT, {
        userId: user.shainBangou,
      }),
    );
  }

  // ─── Mark All as Read (must be before :id route) ───

  @Patch('read-all')
  async markAllRead(@CurrentUser() user: any) {
    return firstValueFrom(
      this.client.send(MESSAGE_PATTERNS.NOTIFICATION_MARK_ALL_READ, {
        userId: user.shainBangou,
      }),
    );
  }

  // ─── Mark Single as Read ───

  @Patch(':id/read')
  async markRead(
    @Param('id') notificationId: string,
    @CurrentUser() user: any,
  ) {
    return firstValueFrom(
      this.client.send(MESSAGE_PATTERNS.NOTIFICATION_MARK_READ, {
        notificationId,
        userId: user.shainBangou,
      }),
    );
  }

  // ─── Push Subscribe ───

  @Post('push/subscribe')
  async subscribePush(
    @CurrentUser() user: any,
    @Body()
    body: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    },
  ) {
    return firstValueFrom(
      this.client.send(MESSAGE_PATTERNS.NOTIFICATION_PUSH_SUBSCRIBE, {
        userId: user.shainBangou,
        subscription: body,
      }),
    );
  }

  // ─── Push Unsubscribe ───

  @Post('push/unsubscribe')
  async unsubscribePush(
    @CurrentUser() user: any,
    @Body() body: { endpoint: string },
  ) {
    return firstValueFrom(
      this.client.send(MESSAGE_PATTERNS.NOTIFICATION_PUSH_UNSUBSCRIBE, {
        userId: user.shainBangou,
        endpoint: body.endpoint,
      }),
    );
  }
}
