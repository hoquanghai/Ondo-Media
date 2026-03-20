import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AnnouncementService } from './announcement.service';
import { MESSAGE_PATTERNS } from '@app/common';

@Controller()
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @MessagePattern(MESSAGE_PATTERNS.ANNOUNCEMENT_CREATE)
  async create(@Payload() data: any) {
    return this.announcementService.create(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.ANNOUNCEMENT_FIND_ALL)
  async findAll(@Payload() data: any) {
    return this.announcementService.findAll(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.ANNOUNCEMENT_FIND_BY_ID)
  async findById(@Payload() data: any) {
    return this.announcementService.findById(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.ANNOUNCEMENT_UPDATE)
  async update(@Payload() data: any) {
    return this.announcementService.update(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.ANNOUNCEMENT_DELETE)
  async delete(@Payload() data: any) {
    return this.announcementService.delete(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.ANNOUNCEMENT_MARK_READ)
  async markRead(@Payload() data: any) {
    return this.announcementService.markRead(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.ANNOUNCEMENT_UNREAD_COUNT)
  async unreadCount(@Payload() data: any) {
    return this.announcementService.unreadCount(data);
  }
}
