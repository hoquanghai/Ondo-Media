import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { Announcement, AnnouncementReadStatus } from '@app/database';
import { PaginatedResponseDto, EVENTS } from '@app/common';
import { EventPublisher } from './event-publisher.service';

@Injectable()
export class AnnouncementService {
  constructor(
    @InjectRepository(Announcement)
    private readonly announcementRepo: Repository<Announcement>,
    @InjectRepository(AnnouncementReadStatus)
    private readonly readStatusRepo: Repository<AnnouncementReadStatus>,
    private readonly events: EventPublisher,
  ) {}

  // ─── Create ───

  async create(data: {
    userId: number;
    title: string;
    content: string;
    isPinned?: boolean;
    publishAt?: string;
    expiresAt?: string;
  }) {
    const announcement = this.announcementRepo.create({
      userId: data.userId,
      title: data.title,
      content: data.content,
      isPinned: data.isPinned ?? false,
      publishAt: data.publishAt ? new Date(data.publishAt) : undefined,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      createdBy: data.userId,
    });
    const saved = await this.announcementRepo.save(announcement);

    // Publish event
    await this.events.publish(EVENTS.ANNOUNCEMENT_CREATED, {
      announcementId: saved.id,
      title: saved.title,
      authorId: data.userId,
    });

    return this.findByIdInternal(saved.id);
  }

  // ─── Find All (paginated, with read status) ───

  async findAll(data: {
    page?: number;
    limit?: number;
    userId?: number;
  }) {
    const page = data.page ?? 1;
    const limit = data.limit ?? 20;
    const now = new Date();

    const qb = this.announcementRepo
      .createQueryBuilder('a')
      .where('a.isDeleted = :isDel', { isDel: false })
      .andWhere('(a.publishAt IS NULL OR a.publishAt <= :now)', { now })
      .andWhere('(a.expiresAt IS NULL OR a.expiresAt >= :now)', { now })
      .orderBy('a.isPinned', 'DESC')
      .addOrderBy('a.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    // Attach read status if userId is provided
    let processedItems = items as any[];
    if (data.userId && items.length > 0) {
      const announcementIds = items.map((a) => a.id);
      const readStatuses = await this.readStatusRepo
        .createQueryBuilder('rs')
        .select('rs.announcementId', 'announcementId')
        .where('rs.userId = :userId', { userId: data.userId })
        .andWhere('rs.announcementId IN (:...ids)', { ids: announcementIds })
        .andWhere('rs.isDeleted = :isDel', { isDel: false })
        .getRawMany();

      const readSet = new Set(readStatuses.map((r) => r.announcementId));
      processedItems = items.map((item) => ({
        ...item,
        isRead: readSet.has(item.id),
      }));
    }

    return PaginatedResponseDto.from(processedItems, total, page, limit);
  }

  // ─── Find By ID (with read status) ───

  async findById(data: { id: string; userId?: number }) {
    const announcement = await this.findByIdInternal(data.id);

    let isRead = false;
    if (data.userId) {
      const readStatus = await this.readStatusRepo.findOne({
        where: {
          announcementId: data.id,
          userId: data.userId,
          isDeleted: false,
        },
      });
      isRead = !!readStatus;
    }

    return { ...announcement, isRead };
  }

  // ─── Update ───

  async update(data: {
    id: string;
    userId: number;
    title?: string;
    content?: string;
    isPinned?: boolean;
    publishAt?: string;
    expiresAt?: string;
  }) {
    const announcement = await this.announcementRepo.findOne({
      where: { id: data.id, isDeleted: false },
    });
    if (!announcement) {
      throw new RpcException({ statusCode: 404, message: 'お知らせが見つかりません' });
    }

    if (data.title !== undefined) announcement.title = data.title;
    if (data.content !== undefined) announcement.content = data.content;
    if (data.isPinned !== undefined) announcement.isPinned = data.isPinned;
    if (data.publishAt !== undefined) announcement.publishAt = data.publishAt ? new Date(data.publishAt) : (undefined as any);
    if (data.expiresAt !== undefined) announcement.expiresAt = data.expiresAt ? new Date(data.expiresAt) : (undefined as any);

    await this.announcementRepo.save(announcement);

    return this.findByIdInternal(data.id);
  }

  // ─── Delete (soft) ───

  async delete(data: { id: string; userId: number }) {
    const announcement = await this.announcementRepo.findOne({
      where: { id: data.id, isDeleted: false },
    });
    if (!announcement) {
      throw new RpcException({ statusCode: 404, message: 'お知らせが見つかりません' });
    }

    announcement.isDeleted = true;
    await this.announcementRepo.save(announcement);

    return { deleted: true };
  }

  // ─── Mark as Read ───

  async markRead(data: { announcementId: string; userId: number }) {
    const announcement = await this.announcementRepo.findOne({
      where: { id: data.announcementId, isDeleted: false },
    });
    if (!announcement) {
      throw new RpcException({ statusCode: 404, message: 'お知らせが見つかりません' });
    }

    // Check if already read
    const existing = await this.readStatusRepo.findOne({
      where: {
        announcementId: data.announcementId,
        userId: data.userId,
        isDeleted: false,
      },
    });
    if (existing) {
      return { alreadyRead: true, readAt: existing.readAt };
    }

    const readStatus = this.readStatusRepo.create({
      announcementId: data.announcementId,
      userId: data.userId,
      readAt: new Date(),
      createdBy: data.userId,
    });

    try {
      const saved = await this.readStatusRepo.save(readStatus);
      return { read: true, readAt: saved.readAt };
    } catch (err: any) {
      // Unique constraint violation — already read
      if (err?.number === 2627 || err?.code === 'ER_DUP_ENTRY') {
        return { alreadyRead: true };
      }
      throw err;
    }
  }

  // ─── Unread Count ───

  async unreadCount(data: { userId: number }) {
    const now = new Date();

    const totalCount = await this.announcementRepo
      .createQueryBuilder('a')
      .where('a.isDeleted = :isDel', { isDel: false })
      .andWhere('(a.publishAt IS NULL OR a.publishAt <= :now)', { now })
      .andWhere('(a.expiresAt IS NULL OR a.expiresAt >= :now)', { now })
      .getCount();

    const readCount = await this.readStatusRepo
      .createQueryBuilder('rs')
      .innerJoin('rs.announcement', 'a')
      .where('rs.userId = :userId', { userId: data.userId })
      .andWhere('rs.isDeleted = :isDel', { isDel: false })
      .andWhere('a.isDeleted = :aIsDel', { aIsDel: false })
      .andWhere('(a.publishAt IS NULL OR a.publishAt <= :now)', { now })
      .andWhere('(a.expiresAt IS NULL OR a.expiresAt >= :now)', { now })
      .getCount();

    return { unreadCount: totalCount - readCount };
  }

  // ─── Internal Helpers ───

  private async findByIdInternal(id: string): Promise<Announcement> {
    const announcement = await this.announcementRepo.findOne({
      where: { id, isDeleted: false },
    });
    if (!announcement) {
      throw new RpcException({ statusCode: 404, message: 'お知らせが見つかりません' });
    }
    return announcement;
  }
}
