import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { Post, Like, Comment, PostFile, User } from '@app/database';
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
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly cache: TimelineCacheService,
    private readonly events: EventPublisher,
  ) {}

  /**
   * Enrich posts with author info from DR.dbo.shainList
   */
  private async enrichWithAuthors(posts: Post[]): Promise<any[]> {
    if (posts.length === 0) return [];
    const userIds = [...new Set(posts.map((p) => p.userId))];
    const users = await this.userRepo.findBy(
      userIds.map((id) => ({ shainBangou: id })),
    );
    const userMap = new Map(users.map((u) => [u.shainBangou, u]));

    return posts.map((post) => {
      const author = userMap.get(post.userId);
      // Manual mapping instead of JSON.parse(JSON.stringify()) to avoid hot-path overhead
      const plainPost = {
        id: post.id,
        userId: post.userId,
        title: post.title,
        content: post.content,
        postDate: post.postDate,
        likeCount: post.likeCount,
        commentCount: post.commentCount,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        createdBy: post.createdBy,
        isDeleted: post.isDeleted,
        files: post.files ? post.files.map(f => ({
          id: f.id, postId: f.postId, fileName: f.fileName,
          storageKey: f.storageKey, fileSize: f.fileSize,
          mimeType: f.mimeType, fileType: f.fileType,
          sortOrder: f.sortOrder, createdAt: f.createdAt,
        })) : [],
        comments: post.comments ? post.comments.map(c => ({
          id: c.id, postId: c.postId, userId: c.userId,
          content: c.content, createdAt: c.createdAt,
        })) : [],
        isLikedByMe: (post as any).isLikedByMe ?? false,
        myReactionType: (post as any).myReactionType ?? null,
      };
      return {
        ...plainPost,
        author: author
          ? {
              shainBangou: author.shainBangou,
              lastNumber: author.lastNumber,
              shainName: author.displayName,
              shainGroup: author.department,
              shainYaku: author.position,
              avatar: author.defaultAvatarUrl,
              snsAvatarUrl: author.snsAvatarUrl,
              avatarUrl: author.avatarUrl,
            }
          : {
              shainBangou: post.userId,
              lastNumber: null,
              shainName: `社員${post.userId}`,
              shainGroup: '',
              shainYaku: '',
              avatar: null,
              snsAvatarUrl: null,
              avatarUrl: null,
            },
      };
    });
  }

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

    // Return with relations
    const fullPost = await this.findById({ id: saved.id });

    // Fire-and-forget: event is for realtime updates, not critical to the response
    this.events.publish(EVENTS.POST_CREATED, {
      postId: saved.id,
      authorId: data.userId,
      postDate: data.postDate,
      post: fullPost,
    }).catch(() => {});

    return fullPost;
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
    qb.where('post.isDeleted = :isDel', { isDel: false });

    if (data.date) {
      qb.andWhere('post.postDate = :date', { date: data.date });
    }

    if (data.userId) {
      qb.andWhere('post.userId = :userId', { userId: data.userId });
    }

    // Sort
    const sortColumn = sortBy === 'postDate' ? 'post.postDate' : 'post.createdAt';
    qb.orderBy(sortColumn, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    // If a current user ID is provided, check liked-by-me flag
    let processedItems = items;
    if (data.currentUserId && items.length > 0) {
      const postIds = items.map((p) => p.id);
      const myLikes = await this.likeRepo
        .createQueryBuilder('like')
        .select('like.postId', 'postId')
        .addSelect('like.reactionType', 'reactionType')
        .where('like.userId = :userId', { userId: data.currentUserId })
        .andWhere('like.postId IN (:...postIds)', { postIds })
        .andWhere('like.isDeleted = :isDel', { isDel: false })
        .getRawMany();
      const likeMap = new Map(myLikes.map((l) => [l.postId, l.reactionType]));

      processedItems = items.map((item) => ({
        ...item,
        isLikedByMe: likeMap.has(item.id),
        myReactionType: likeMap.get(item.id) ?? null,
      })) as any;
    }

    // Enrich with author info from DR.dbo.shainList
    const enriched = await this.enrichWithAuthors(processedItems as Post[]);

    const result = PaginatedResponseDto.from(enriched, total, page, limit);

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
    let isLikedByMe = false;
    let myReactionType: string | null = null;
    if (data.currentUserId) {
      const like = await this.likeRepo.findOne({
        where: {
          postId: data.id,
          userId: data.currentUserId,
          isDeleted: false,
        },
      });
      isLikedByMe = !!like;
      myReactionType = like?.reactionType ?? null;
    }

    const [enriched] = await this.enrichWithAuthors([post]);
    return { ...enriched, isLikedByMe, myReactionType };
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
      .select('post.postDate', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('post.postDate >= :start', { start: startDate })
      .andWhere('post.postDate <= :end', { end: endDate })
      .andWhere('post.isDeleted = :isDel', { isDel: false });

    if (data.userId) {
      qb.andWhere('post.userId = :userId', { userId: data.userId });
    }

    qb.groupBy('post.postDate')
      .orderBy('date', 'ASC');

    const rows = await qb.getRawMany();

    return rows.map((r) => ({
      date: r.date,
      count: parseInt(r.count, 10),
    }));
  }

  // ─── Likes ───

  async like(data: { postId: string; userId: number; reactionType?: string }) {
    const post = await this.postRepo.findOne({
      where: { id: data.postId, isDeleted: false },
    });
    if (!post) {
      throw new RpcException({ statusCode: 404, message: '投稿が見つかりません' });
    }

    const reactionType = data.reactionType ?? 'like';

    // Check if already liked (active)
    const existing = await this.likeRepo.findOne({
      where: { postId: data.postId, userId: data.userId, isDeleted: false },
    });

    if (existing) {
      // Update reaction type if different
      if (existing.reactionType !== reactionType) {
        await this.likeRepo.update({ id: existing.id }, { reactionType });
        return { liked: true, reactionType, likeCount: post.likeCount };
      }
      return { alreadyLiked: true, reactionType: existing.reactionType, likeCount: post.likeCount };
    }

    // Check for soft-deleted like to reactivate
    const softDeleted = await this.likeRepo.findOne({
      where: { postId: data.postId, userId: data.userId, isDeleted: true },
    });

    if (softDeleted) {
      await this.likeRepo.update({ id: softDeleted.id }, {
        isDeleted: false,
        reactionType,
      });
    } else {
      const like = this.likeRepo.create({
        postId: data.postId,
        userId: data.userId,
        reactionType,
        createdBy: data.userId,
      });
      await this.likeRepo.save(like);
    }

    // Recalculate count from DB (avoid drift)
    const actualCount = await this.likeRepo.count({
      where: { postId: data.postId, isDeleted: false },
    });
    await this.postRepo.update({ id: data.postId }, { likeCount: actualCount });

    // Fire-and-forget: event is for realtime updates, not critical to the response
    this.events.publish(EVENTS.POST_LIKED, {
      postId: data.postId,
      likerId: data.userId,
      postAuthorId: post.userId,
      reactionType,
      likeCount: actualCount,
    }).catch(() => {});

    return { liked: true, reactionType, likeCount: actualCount };
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

    await this.likeRepo.update({ id: like.id }, { isDeleted: true });

    // Recalculate count from DB
    const actualCount = await this.likeRepo.count({
      where: { postId: data.postId, isDeleted: false },
    });
    await this.postRepo.update({ id: data.postId }, { likeCount: actualCount });

    return { unliked: true, likeCount: actualCount };
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

    // Get the updated post to read the authoritative comment count
    const updatedPost = await this.postRepo.findOne({
      where: { id: data.postId },
      select: ['id', 'commentCount'],
    });

    const fullComment = await this.commentRepo.findOne({
      where: { id: saved.id },
    });

    // Fire-and-forget: event is for realtime updates, not critical to the response
    this.events.publish(EVENTS.COMMENT_CREATED, {
      postId: data.postId,
      commentId: saved.id,
      authorId: data.userId,
      postAuthorId: post.userId,
      commentCount: updatedPost?.commentCount ?? post.commentCount + 1,
      comment: fullComment,
    }).catch(() => {});

    return fullComment;
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

  async createFiles(data: {
    files: Array<{
      postId: string;
      fileName: string;
      storageKey: string;
      fileSize: number;
      mimeType: string;
      fileType: string;
      sortOrder: number;
      createdBy: number;
    }>;
  }) {
    const entities = data.files.map((f) =>
      this.postFileRepo.create({
        postId: f.postId,
        fileName: f.fileName,
        storageKey: f.storageKey,
        fileSize: f.fileSize,
        mimeType: f.mimeType,
        fileType: f.fileType,
        sortOrder: f.sortOrder,
        createdBy: f.createdBy,
      }),
    );
    return this.postFileRepo.save(entities);
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
    qb.where('post.userId = :userId', { userId: data.userId });
    qb.andWhere('post.isDeleted = :isDel', { isDel: false });

    if (data.date) {
      qb.andWhere('post.postDate = :date', { date: data.date });
    }

    qb.orderBy('post.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return PaginatedResponseDto.from(items, total, page, limit);
  }
}
