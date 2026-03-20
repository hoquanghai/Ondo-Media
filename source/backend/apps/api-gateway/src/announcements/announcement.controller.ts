import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  CurrentUser,
  MESSAGE_PATTERNS,
  RequirePermissions,
  SERVICE_TOKENS,
} from '@app/common';
import { PermissionsGuard } from '@app/common';

@Controller('announcements')
export class AnnouncementGatewayController {
  constructor(
    @Inject(SERVICE_TOKENS.ANNOUNCEMENT_SERVICE)
    private readonly announcementClient: ClientProxy,
  ) {}

  // ─── List (paginated, with read status) ───

  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return firstValueFrom(
      this.announcementClient.send(MESSAGE_PATTERNS.ANNOUNCEMENT_FIND_ALL, {
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        userId: user?.shainBangou,
      }),
    );
  }

  // ─── Unread Count (must be before :id route) ───

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: any) {
    return firstValueFrom(
      this.announcementClient.send(MESSAGE_PATTERNS.ANNOUNCEMENT_UNREAD_COUNT, {
        userId: user.shainBangou,
      }),
    );
  }

  // ─── Single Announcement ───

  @Get(':id')
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return firstValueFrom(
      this.announcementClient.send(MESSAGE_PATTERNS.ANNOUNCEMENT_FIND_BY_ID, {
        id,
        userId: user?.shainBangou,
      }),
    );
  }

  // ─── Create ───

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('announcement.create')
  async create(
    @CurrentUser() user: any,
    @Body()
    body: {
      title: string;
      content: string;
      isPinned?: boolean;
      publishAt?: string;
      expiresAt?: string;
    },
  ) {
    return firstValueFrom(
      this.announcementClient.send(MESSAGE_PATTERNS.ANNOUNCEMENT_CREATE, {
        userId: user.shainBangou,
        title: body.title,
        content: body.content,
        isPinned: body.isPinned,
        publishAt: body.publishAt,
        expiresAt: body.expiresAt,
      }),
    );
  }

  // ─── Update ───

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('announcement.create')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body()
    body: {
      title?: string;
      content?: string;
      isPinned?: boolean;
      publishAt?: string;
      expiresAt?: string;
    },
  ) {
    return firstValueFrom(
      this.announcementClient.send(MESSAGE_PATTERNS.ANNOUNCEMENT_UPDATE, {
        id,
        userId: user.shainBangou,
        ...body,
      }),
    );
  }

  // ─── Delete ───

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('announcement.create')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return firstValueFrom(
      this.announcementClient.send(MESSAGE_PATTERNS.ANNOUNCEMENT_DELETE, {
        id,
        userId: user.shainBangou,
      }),
    );
  }

  // ─── Mark as Read ───

  @Post(':id/read')
  async markRead(
    @Param('id') announcementId: string,
    @CurrentUser() user: any,
  ) {
    return firstValueFrom(
      this.announcementClient.send(MESSAGE_PATTERNS.ANNOUNCEMENT_MARK_READ, {
        announcementId,
        userId: user.shainBangou,
      }),
    );
  }
}
