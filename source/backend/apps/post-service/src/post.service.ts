import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { Post, Like, Comment, PostFile } from '@app/database';
import { PaginatedResponseDto } from '@app/common';
import { EVENTS } from '@app/common';
import { TimelineCacheService } from './timeline-cache.service';
import { EventPublisher } from './event-publisher.service';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
    @InjectRepository(Like)
    private readonly likeRepo: Repository<Like>,
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
    @InjectRepository(PostFile)
    private readonly postFileRepo: Repository<PostFile>,
    private readonly cache: TimelineCacheService,
    private readonly events: EventPublisher,
  ) {}

  // ─── Post CRUD ───

  async create(data: {
    userId: number;
    content: string;
    postDate: string;
    title?: string;
    attachments?: string[];
  }) {
    const post = this.postRepo.create({
      userId: data.userId,
      content: data.content,
      postDate: data.postDate,
      title: data.title,
      createdBy: data.userId,
    });
    const saved = await this.postRepo.save(post);

    // Associate files if provided (file IDs from file-service)
    if (data.attachments && data.attachments.length > 0) {
      await this.postFileRepo
        .createQueryBuilder()
        .update(PostFile)
        .set({ postId: saved.id })
        .where('id IN (:...ids)', { ids: data.attachments })
        .execute();
    }

    // Invalidate cache for this date
    await this.cache.invalidate(data.postDate);

    // Publish event
    await this.events.publish(EVENTS.POST_CREATED, {
      postId: saved.id,
      authorId: data.userId,
      postDate: data.postDate,
    });

    // Return with relations
    return this.findById({ id: saved.id });
  }

  async findAll(data: {
    date?: string;
    userId?: number;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    currentUserId?: number;
  }) {
    const page = data.page ?? 1;
    const limit = data.limit ?? 20;
    const sortBy = data.sortBy ?? 'createdAt';
    const sortOrder = data.sortOrder ?? 'DESC';

    // Try cache for date-based queries
    if (data.date && !data.userId && !data.currentUserId) {
      const cached = await this.cache.get(data.date, page, limit);
      if (cached) return cached;
    }

    const qb = this.postRepo.createQueryBuilder('post');
    qb.leftJoinAndSelect('post.files', 'files');
    qb.where('post.is_deleted = :isDel', { isDel: false });

    if (data.date) {
      qb.andWhere('post.post_date = :date', { date: data.date });
    }

    if (data.userId) {
      qb.andWhere('post.user_id = :userId', { userId: data.userId });
    }

    // Sort
    const sortColumn = sortBy === 'postDate' ? 'post.post_date' : 'post.created_at';
    qb.orderBy(sortColumn, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    // If a current user ID is provided, check liked-by-me flag
    let processedItems = items;
    if (data.currentUserId && items.length > 0) {
      const postIds = items.map((p) => p.id);
      const myLikes = await this.likeRepo
        .createQueryBuilder('like')
        .select('like.post_id', 'postId')
        .where('like.user_id = :userId', { userId: data.currentUserId })
        .andWhere('like.post_id IN (:...postIds)', { postIds })
        .andWhere('like.is_deleted = :isDel', { isDel: false })
        .getRawMany();
      const likedPostIds = new Set(myLikes.map((l) => l.postId));

      processedItems = items.map((item) => ({
        ...item,
        isLiked: likedPostIds.has(item.id),
      })) as any;
    }

    const result = PaginatedResponseDto.from(processedItems, total, page, limit);

    // Cache date-based results
    if (data.date && !data.userId && !data.currentUserId) {
      await this.cache.set(data.date, page, limit, result);
    }

    return result;
  }

  async findById(data: { id: string; currentUserId?: number }) {
    const post = await this.postRepo.findOne({
      where: { id: data.id, isDeleted: false },
      relations: ['files', 'comments'],
    });
    if (!post) {
      throw new RpcException({ statusCode: 404, message: '投稿が見つかりません' });
    }

    // Filter out deleted comments
    if (post.comments) {
      post.comments = post.comments.filter((c) => !c.isDeleted);
    }

    // Check if current user liked
    let isLiked = false;
    if (data.currentUserId) {
      const like = await this.likeRepo.findOne({
        where: {
          postId: data.id,
          userId: data.currentUserId,
          isDeleted: false,
        },
      });
      isLiked = !!like;
    }

    return { ...post, isLiked };
  }

  async update(data: {
    id: string;
    userId: number;
    content?: string;
    title?: string;
    postDate?: string;
  }) {
    const post = await this.postRepo.findOne({
      where: { id: data.id, isDeleted: false },
    });
    if (!post) {
      throw new RpcException({ statusCode: 404, message: '投稿が見つかりません' });
    }
    if (post.userId !== data.userId) {
      throw new RpcException({ statusCode: 403, message: '他のユーザーの投稿は編集できません' });
    }

    const oldDate = post.postDate;

    if (data.content !== undefined) post.content = data.content;
    if (data.title !== undefined) post.title = data.title;
    if (data.postDate !== undefined) post.postDate = data.postDate;

    const saved = await this.postRepo.save(post);

    // Invalidate caches for old and new dates
    await this.cache.invalidate(oldDate);
    if (data.postDate && data.postDate !== oldDate) {
      await this.cache.invalidate(data.postDate);
    }

    return this.findById({ id: saved.id });
  }

  async delete(data: { id: string; userId: number }) {
    const post = await this.postRepo.findOne({
      where: { id: data.id, isDeleted: false },
    });
    if (!post) {
      throw new RpcException({ statusCode: 404, message: '投稿が見つかりません' });
    }
    if (post.userId !== data.userId) {
      throw new RpcException({ statusCode: 403, message: '他のユーザーの投稿は削除できません' });
    }

    post.isDeleted = true;
    await this.postRepo.save(post);

    await this.cache.invalidate(post.postDate);
    return { deleted: true };
  }

  async getDateCounts(data: {
    startDate?: string;
    endDate?: string;
    year?: number;
    month?: number;
    userId?: number;
  }) {
    let startDate: string;
    let endDate: string;

    if (data.year && data.month) {
      const year = data.year;
      const month = data.month;
      startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    } else {
      startDate = data.startDate!;
      endDate = data.endDate!;
    }

    const qb = this.postRepo
      .createQueryBuilder('post')
      .select('CAST(post.post_date AS DATE)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('post.post_date >= :start', { start: startDate })
      .andWhere('post.post_date <= :end', { end: endDate })
      .andWhere('post.is_deleted = :isDel', { isDel: false });

    if (data.userId) {
      qb.andWhere('post.user_id = :userId', { userId: data.userId });
    }

    qb.groupBy('CAST(post.post_date AS DATE)')
      .orderBy('date', 'ASC');

    const rows = await qb.getRawMany();

    return rows.map((r) => ({
      date: r.date,
      count: parseInt(r.count, 10),
    }));
  }

  // ─── Likes ───

  async like(data: { postId: string; userId: number }) {
    const post = await this.postRepo.findOne({
      where: { id: data.postId, isDeleted: false },
    });
    if (!post) {
      throw new RpcException({ statusCode: 404, message: '投稿が見つかりません' });
    }

    // Check if already liked
    const existing = await this.likeRepo.findOne({
      where: { postId: data.postId, userId: data.userId, isDeleted: false },
    });
    if (existing) {
      return { alreadyLiked: true, likeCount: post.likeCount };
    }

    // Check for soft-deleted like to reactivate
    const softDeleted = await this.likeRepo.findOne({
      where: { postId: data.postId, userId: data.userId, isDeleted: true },
    });

    if (softDeleted) {
      softDeleted.isDeleted = false;
      await this.likeRepo.save(softDeleted);
    } else {
      const like = this.likeRepo.create({
        postId: data.postId,
        userId: data.userId,
        createdBy: data.userId,
      });
      await this.likeRepo.save(like);
    }

    // Increment denormalized count
    await this.postRepo.increment({ id: data.postId }, 'likeCount', 1);

    // Publish event
    await this.events.publish(EVENTS.POST_LIKED, {
      postId: data.postId,
      likerId: data.userId,
      postAuthorId: post.userId,
    });

    return { liked: true, likeCount: post.likeCount + 1 };
  }

  async unlike(data: { postId: string; userId: number }) {
    const like = await this.likeRepo.findOne({
      where: { postId: data.postId, userId: data.userId, isDeleted: false },
    });

    if (!like) {
      const post = await this.postRepo.findOne({
        where: { id: data.postId, isDeleted: false },
      });
      return { unliked: false, likeCount: post?.likeCount ?? 0 };
    }

    like.isDeleted = true;
    await this.likeRepo.save(like);

    // Decrement denormalized count
    await this.postRepo.decrement({ id: data.postId }, 'likeCount', 1);

    // Ensure count doesn't go below 0
    await this.postRepo
      .createQueryBuilder()
      .update(Post)
      .set({ likeCount: 0 })
      .where('id = :id AND like_count < 0', { id: data.postId })
      .execute();

    const post = await this.postRepo.findOne({
      where: { id: data.postId },
    });

    return { unliked: true, likeCount: post?.likeCount ?? 0 };
  }

  async getLikes(data: { postId: string }) {
    const likes = await this.likeRepo.find({
      where: { postId: data.postId, isDeleted: false },
      order: { createdAt: 'DESC' },
    });

    return likes.map((l) => ({
      userId: l.userId,
      likedAt: l.createdAt,
    }));
  }

  // ─── Comments ───

  async createComment(data: {
    postId: string;
    userId: number;
    content: string;
  }) {
    const post = await this.postRepo.findOne({
      where: { id: data.postId, isDeleted: false },
    });
    if (!post) {
      throw new RpcException({ statusCode: 404, message: '投稿が見つかりません' });
    }

    const comment = this.commentRepo.create({
      postId: data.postId,
      userId: data.userId,
      content: data.content,
      createdBy: data.userId,
    });
    const saved = await this.commentRepo.save(comment);

    // Increment denormalized count
    await this.postRepo.increment({ id: data.postId }, 'commentCount', 1);

    // Publish event
    await this.events.publish(EVENTS.COMMENT_CREATED, {
      postId: data.postId,
      commentId: saved.id,
      authorId: data.userId,
      postAuthorId: post.userId,
    });

    return this.commentRepo.findOne({
      where: { id: saved.id },
    });
  }

  async findComments(data: {
    postId: string;
    page?: number;
    limit?: number;
  }) {
    const page = data.page ?? 1;
    const limit = data.limit ?? 20;

    const [items, total] = await this.commentRepo.findAndCount({
      where: { postId: data.postId, isDeleted: false },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'ASC' },
    });

    return PaginatedResponseDto.from(items, total, page, limit);
  }

  async updateComment(data: {
    commentId: string;
    userId: number;
    content: string;
  }) {
    const comment = await this.commentRepo.findOne({
      where: { id: data.commentId, isDeleted: false },
    });
    if (!comment) {
      throw new RpcException({ statusCode: 404, message: 'コメントが見つかりません' });
    }
    if (comment.userId !== data.userId) {
      throw new RpcException({ statusCode: 403, message: '他のユーザーのコメントは編集できません' });
    }

    comment.content = data.content;
    return this.commentRepo.save(comment);
  }

  async deleteComment(data: { commentId: string; userId: number }) {
    const comment = await this.commentRepo.findOne({
      where: { id: data.commentId, isDeleted: false },
    });
    if (!comment) {
      throw new RpcException({ statusCode: 404, message: 'コメントが見つかりません' });
    }
    if (comment.userId !== data.userId) {
      throw new RpcException({ statusCode: 403, message: '他のユーザーのコメントは削除できません' });
    }

    comment.isDeleted = true;
    await this.commentRepo.save(comment);

    // Decrement denormalized count
    await this.postRepo.decrement({ id: comment.postId }, 'commentCount', 1);

    // Ensure count doesn't go below 0
    await this.postRepo
      .createQueryBuilder()
      .update(Post)
      .set({ commentCount: 0 })
      .where('id = :id AND comment_count < 0', { id: comment.postId })
      .execute();

    return { deleted: true };
  }

  async findByUserId(data: {
    userId: number;
    page?: number;
    limit?: number;
    date?: string;
  }) {
    const page = data.page ?? 1;
    const limit = data.limit ?? 20;

    const qb = this.postRepo.createQueryBuilder('post');
    qb.leftJoinAndSelect('post.files', 'files');
    qb.where('post.user_id = :userId', { userId: data.userId });
    qb.andWhere('post.is_deleted = :isDel', { isDel: false });

    if (data.date) {
      qb.andWhere('post.post_date = :date', { date: data.date });
    }

    qb.orderBy('post.created_at', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return PaginatedResponseDto.from(items, total, page, limit);
  }
}
