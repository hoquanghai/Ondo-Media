import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { PostService } from './post.service';
import { Post, Like, Comment, PostFile, User } from '@app/database';
import { TimelineCacheService } from './timeline-cache.service';
import { EventPublisher } from './event-publisher.service';

describe('PostService', () => {
  let service: PostService;

  // Query builder mock factory
  const createQbMock = () => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getRawMany: jest.fn().mockResolvedValue([]),
    execute: jest.fn().mockResolvedValue(undefined),
  });

  const mockPostRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockLikeRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockCommentRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    findAndCount: jest.fn(),
  };

  const mockPostFileRepo = {
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUserRepo = {
    findBy: jest.fn(),
  };

  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
    invalidate: jest.fn(),
  };

  const mockEvents = {
    publish: jest.fn(),
  };

  const makePost = (overrides: Partial<Record<string, any>> = {}): any => ({
    id: 'post-uuid-1',
    userId: 1001,
    title: null,
    content: 'Hello world',
    postDate: '2026-03-21',
    likeCount: 0,
    commentCount: 0,
    createdAt: new Date('2026-03-21T10:00:00Z'),
    updatedAt: new Date('2026-03-21T10:00:00Z'),
    createdBy: 1001,
    isDeleted: false,
    files: [],
    comments: [],
    ...overrides,
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostService,
        { provide: getRepositoryToken(Post), useValue: mockPostRepo },
        { provide: getRepositoryToken(Like), useValue: mockLikeRepo },
        { provide: getRepositoryToken(Comment), useValue: mockCommentRepo },
        { provide: getRepositoryToken(PostFile), useValue: mockPostFileRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: TimelineCacheService, useValue: mockCache },
        { provide: EventPublisher, useValue: mockEvents },
      ],
    }).compile();

    service = module.get<PostService>(PostService);

    // Default mock setups
    mockCache.invalidate.mockResolvedValue(undefined);
    mockCache.set.mockResolvedValue(undefined);
    mockCache.get.mockResolvedValue(null);
    mockEvents.publish.mockResolvedValue(undefined);
    mockUserRepo.findBy.mockResolvedValue([]);
  });

  // ─── create() ───

  describe('create()', () => {
    it('should create post with content and postDate', async () => {
      const post = makePost();
      mockPostRepo.create.mockReturnValue(post);
      mockPostRepo.save.mockResolvedValue(post);
      // findById is called internally after save
      mockPostRepo.findOne.mockResolvedValue(post);

      const result = await service.create({
        userId: 1001,
        content: 'Hello world',
        postDate: '2026-03-21',
      });

      expect(mockPostRepo.create).toHaveBeenCalledWith({
        userId: 1001,
        content: 'Hello world',
        postDate: '2026-03-21',
        title: undefined,
        createdBy: 1001,
      });
      expect(mockPostRepo.save).toHaveBeenCalled();
      expect(mockCache.invalidate).toHaveBeenCalledWith('2026-03-21');
      expect(result).toBeDefined();
    });

    it('should allow backdating (past date)', async () => {
      const post = makePost({ postDate: '2025-01-15' });
      mockPostRepo.create.mockReturnValue(post);
      mockPostRepo.save.mockResolvedValue(post);
      mockPostRepo.findOne.mockResolvedValue(post);

      const result = await service.create({
        userId: 1001,
        content: 'Past entry',
        postDate: '2025-01-15',
      });

      expect(mockPostRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ postDate: '2025-01-15' }),
      );
      expect(mockCache.invalidate).toHaveBeenCalledWith('2025-01-15');
      expect(result).toBeDefined();
    });

    it('should associate attachments when provided', async () => {
      const post = makePost();
      mockPostRepo.create.mockReturnValue(post);
      mockPostRepo.save.mockResolvedValue(post);
      mockPostRepo.findOne.mockResolvedValue(post);

      const qb = createQbMock();
      mockPostFileRepo.createQueryBuilder.mockReturnValue(qb);

      await service.create({
        userId: 1001,
        content: 'With files',
        postDate: '2026-03-21',
        attachments: ['file-1', 'file-2'],
      });

      expect(mockPostFileRepo.createQueryBuilder).toHaveBeenCalled();
      expect(qb.execute).toHaveBeenCalled();
    });
  });

  // ─── findAll() ───

  describe('findAll()', () => {
    it('should return paginated posts for a date', async () => {
      const posts = [makePost(), makePost({ id: 'post-uuid-2' })];
      const qb = createQbMock();
      qb.getManyAndCount.mockResolvedValue([posts, 2]);
      mockPostRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({
        date: '2026-03-21',
        page: 1,
        limit: 20,
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(result.meta).toBeDefined();
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
    });

    it('should include isLikedByMe for current user', async () => {
      const posts = [makePost()];
      const qb = createQbMock();
      qb.getManyAndCount.mockResolvedValue([posts, 1]);
      mockPostRepo.createQueryBuilder.mockReturnValue(qb);

      const likeQb = createQbMock();
      likeQb.getRawMany.mockResolvedValue([
        { postId: 'post-uuid-1', reactionType: 'like' },
      ]);
      mockLikeRepo.createQueryBuilder.mockReturnValue(likeQb);

      const result = await service.findAll({
        date: '2026-03-21',
        page: 1,
        limit: 20,
        currentUserId: 2002,
      });

      expect(result).toBeDefined();
      expect(mockLikeRepo.createQueryBuilder).toHaveBeenCalled();
    });

    it('should use cache for date-based queries without userId or currentUserId', async () => {
      const cachedResult = { items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
      mockCache.get.mockResolvedValue(cachedResult);

      const result = await service.findAll({
        date: '2026-03-21',
        page: 1,
        limit: 20,
      });

      expect(result).toEqual(cachedResult);
      expect(mockPostRepo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  // ─── like() ───

  describe('like()', () => {
    it('should like a post', async () => {
      const post = makePost({ likeCount: 0 });
      mockPostRepo.findOne.mockResolvedValue(post);
      mockLikeRepo.findOne
        .mockResolvedValueOnce(null)  // not already liked (active)
        .mockResolvedValueOnce(null); // no soft-deleted like
      mockLikeRepo.create.mockReturnValue({ id: 'like-1', postId: 'post-uuid-1', userId: 2002 });
      mockLikeRepo.save.mockResolvedValue({ id: 'like-1' });
      mockLikeRepo.count.mockResolvedValue(1);
      mockPostRepo.update.mockResolvedValue(undefined);

      const result = await service.like({ postId: 'post-uuid-1', userId: 2002 });

      expect(result.liked).toBe(true);
      expect(result.likeCount).toBe(1);
      expect(result.reactionType).toBe('like');
    });

    it('should not duplicate likes', async () => {
      const post = makePost({ likeCount: 1 });
      mockPostRepo.findOne.mockResolvedValue(post);
      mockLikeRepo.findOne.mockResolvedValueOnce({
        id: 'like-1',
        postId: 'post-uuid-1',
        userId: 2002,
        reactionType: 'like',
        isDeleted: false,
      });

      const result = await service.like({ postId: 'post-uuid-1', userId: 2002 });

      expect(result.alreadyLiked).toBe(true);
      expect(result.likeCount).toBe(1);
      expect(mockLikeRepo.save).not.toHaveBeenCalled();
    });

    it('should update like count correctly', async () => {
      const post = makePost({ likeCount: 5 });
      mockPostRepo.findOne.mockResolvedValue(post);
      mockLikeRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockLikeRepo.create.mockReturnValue({ id: 'like-new' });
      mockLikeRepo.save.mockResolvedValue({ id: 'like-new' });
      mockLikeRepo.count.mockResolvedValue(6);
      mockPostRepo.update.mockResolvedValue(undefined);

      const result = await service.like({ postId: 'post-uuid-1', userId: 3003 });

      expect(result.likeCount).toBe(6);
      expect(mockPostRepo.update).toHaveBeenCalledWith(
        { id: 'post-uuid-1' },
        { likeCount: 6 },
      );
    });

    it('should support reactionType', async () => {
      const post = makePost();
      mockPostRepo.findOne.mockResolvedValue(post);
      mockLikeRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockLikeRepo.create.mockReturnValue({ id: 'like-heart' });
      mockLikeRepo.save.mockResolvedValue({ id: 'like-heart' });
      mockLikeRepo.count.mockResolvedValue(1);
      mockPostRepo.update.mockResolvedValue(undefined);

      const result = await service.like({
        postId: 'post-uuid-1',
        userId: 2002,
        reactionType: 'heart',
      });

      expect(result.reactionType).toBe('heart');
      expect(mockLikeRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ reactionType: 'heart' }),
      );
    });

    it('should throw when post not found', async () => {
      mockPostRepo.findOne.mockResolvedValue(null);

      await expect(
        service.like({ postId: 'nonexistent', userId: 2002 }),
      ).rejects.toThrow(RpcException);
    });

    it('should reactivate soft-deleted like', async () => {
      const post = makePost();
      mockPostRepo.findOne.mockResolvedValue(post);
      mockLikeRepo.findOne
        .mockResolvedValueOnce(null) // no active like
        .mockResolvedValueOnce({ id: 'like-deleted', isDeleted: true }); // soft-deleted like found
      mockLikeRepo.update.mockResolvedValue(undefined);
      mockLikeRepo.count.mockResolvedValue(1);
      mockPostRepo.update.mockResolvedValue(undefined);

      const result = await service.like({ postId: 'post-uuid-1', userId: 2002 });

      expect(result.liked).toBe(true);
      expect(mockLikeRepo.update).toHaveBeenCalledWith(
        { id: 'like-deleted' },
        { isDeleted: false, reactionType: 'like' },
      );
    });
  });

  // ─── unlike() ───

  describe('unlike()', () => {
    it('should unlike a liked post', async () => {
      mockLikeRepo.findOne.mockResolvedValue({
        id: 'like-1',
        postId: 'post-uuid-1',
        userId: 2002,
        isDeleted: false,
      });
      mockLikeRepo.update.mockResolvedValue(undefined);
      mockLikeRepo.count.mockResolvedValue(0);
      mockPostRepo.update.mockResolvedValue(undefined);

      const result = await service.unlike({ postId: 'post-uuid-1', userId: 2002 });

      expect(result.unliked).toBe(true);
      expect(result.likeCount).toBe(0);
      expect(mockLikeRepo.update).toHaveBeenCalledWith(
        { id: 'like-1' },
        { isDeleted: true },
      );
    });

    it('should not go below 0 (returns count from DB)', async () => {
      mockLikeRepo.findOne.mockResolvedValue({
        id: 'like-1',
        postId: 'post-uuid-1',
        userId: 2002,
        isDeleted: false,
      });
      mockLikeRepo.update.mockResolvedValue(undefined);
      mockLikeRepo.count.mockResolvedValue(0); // DB returns 0 minimum
      mockPostRepo.update.mockResolvedValue(undefined);

      const result = await service.unlike({ postId: 'post-uuid-1', userId: 2002 });

      expect(result.likeCount).toBe(0);
      expect(mockPostRepo.update).toHaveBeenCalledWith(
        { id: 'post-uuid-1' },
        { likeCount: 0 },
      );
    });

    it('should return unliked false when no active like exists', async () => {
      mockLikeRepo.findOne.mockResolvedValue(null);
      mockPostRepo.findOne.mockResolvedValue(makePost({ likeCount: 3 }));

      const result = await service.unlike({ postId: 'post-uuid-1', userId: 2002 });

      expect(result.unliked).toBe(false);
      expect(result.likeCount).toBe(3);
    });
  });

  // ─── createComment() ───

  describe('createComment()', () => {
    it('should create comment and update count', async () => {
      const post = makePost({ commentCount: 2 });
      mockPostRepo.findOne.mockResolvedValue(post);
      const savedComment = {
        id: 'comment-uuid-1',
        postId: 'post-uuid-1',
        userId: 2002,
        content: 'Nice post!',
        createdAt: new Date(),
      };
      mockCommentRepo.create.mockReturnValue(savedComment);
      mockCommentRepo.save.mockResolvedValue(savedComment);
      mockCommentRepo.count.mockResolvedValue(3);
      mockCommentRepo.findOne.mockResolvedValue(savedComment);
      mockPostRepo.update.mockResolvedValue(undefined);

      const result = await service.createComment({
        postId: 'post-uuid-1',
        userId: 2002,
        content: 'Nice post!',
      });

      expect(result).toMatchObject({
        id: 'comment-uuid-1',
        postId: 'post-uuid-1',
        userId: 2002,
        content: 'Nice post!',
      });
      expect(mockCommentRepo.create).toHaveBeenCalledWith({
        postId: 'post-uuid-1',
        userId: 2002,
        content: 'Nice post!',
        createdBy: 2002,
      });
      expect(mockPostRepo.update).toHaveBeenCalledWith(
        { id: 'post-uuid-1' },
        { commentCount: 3 },
      );
      expect(mockEvents.publish).toHaveBeenCalled();
    });

    it('should throw when post not found', async () => {
      mockPostRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createComment({
          postId: 'nonexistent',
          userId: 2002,
          content: 'Hello',
        }),
      ).rejects.toThrow(RpcException);
    });
  });
});
