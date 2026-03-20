import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AnnouncementService } from './announcement.service';
import { MESSAGE_PATTERNS } from '@app/common';

@Controller()
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @MessagePattern(MESSAGE_PATTERNS.ANNOUNCEMENT_CREATE)
  async create(data: any) {
    return this.announcementService.create(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.ANNOUNCEMENT_FIND_ALL)
  async findAll(data: any) {
    return this.announcementService.findAll(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.ANNOUNCEMENT_FIND_BY_ID)
  async findById(data: any) {
    return this.announcementService.findById(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.ANNOUNCEMENT_UPDATE)
  async update(data: any) {
    return this.announcementService.update(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.ANNOUNCEMENT_DELETE)
  async delete(data: any) {
    return this.announcementService.delete(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.ANNOUNCEMENT_MARK_READ)
  async markRead(data: any) {
    return this.announcementService.markRead(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.ANNOUNCEMENT_UNREAD_COUNT)
  async unreadCount(data: any) {
    return this.announcementService.unreadCount(data);
  }
}
