import { usePostStore } from '../post-store';

// Mock postApi
jest.mock('@/lib/post-api', () => ({
  postApi: {
    getPosts: jest.fn(),
    createPost: jest.fn(),
    likePost: jest.fn(),
    unlikePost: jest.fn(),
    getDateCounts: jest.fn(),
    getComments: jest.fn(),
    createComment: jest.fn(),
    deletePost: jest.fn(),
  },
}));

import { postApi } from '@/lib/post-api';
import type { Post } from '@/types/post';

const mockedPostApi = postApi as jest.Mocked<typeof postApi>;

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 'post-1',
    content: 'Test post',
    author: {
      shainBangou: 1,
      lastNumber: 1001,
      shainName: 'User',
      fullName: 'Test User',
      shainGroup: 'Eng',
      shainTeam: 'A',
      shainYaku: 'Staff',
      email: 'user@test.com',
      avatar: '',
      snsAvatarUrl: '',
      snsBio: '',
      hasPassword: true,
      permissions: [],
    },
    files: [],
    comments: [],
    likes: [],
    likeCount: 0,
    commentCount: 0,
    isLikedByMe: false,
    myReactionType: null,
    postDate: '2024-03-20',
    createdAt: '2024-03-20T10:00:00Z',
    updatedAt: '2024-03-20T10:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  usePostStore.setState({
    dateGroups: [],
    currentDate: '2024-03-20',
    dateCounts: {},
    isLoading: false,
    isCreating: false,
    hasMore: true,
    page: 1,
    hasNewPosts: false,
  });
  jest.clearAllMocks();
});

describe('usePostStore', () => {
  describe('fetchPosts()', () => {
    it('should populate dateGroups', async () => {
      const post1 = makePost({ id: 'p1', postDate: '2024-03-20' });
      const post2 = makePost({ id: 'p2', postDate: '2024-03-20' });

      mockedPostApi.getPosts.mockResolvedValue({
        items: [post1, post2],
        meta: { page: 1, limit: 20, total: 2, totalPages: 1, hasNext: false, hasPrev: false },
      });

      await usePostStore.getState().fetchPosts('2024-03-20', 1);

      const state = usePostStore.getState();
      expect(state.dateGroups).toHaveLength(1);
      expect(state.dateGroups[0].date).toBe('2024-03-20');
      expect(state.dateGroups[0].posts).toHaveLength(2);
      expect(state.isLoading).toBe(false);
    });

    it('should set isLoading while fetching', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockedPostApi.getPosts.mockReturnValue(promise as any);

      const fetchPromise = usePostStore.getState().fetchPosts('2024-03-20', 1);

      expect(usePostStore.getState().isLoading).toBe(true);

      resolvePromise!({
        items: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });
      await fetchPromise;

      expect(usePostStore.getState().isLoading).toBe(false);
    });
  });

  describe('createPost()', () => {
    it('should add new post to dateGroups', async () => {
      const newPost = makePost({ id: 'new-1', postDate: '2024-03-20', content: 'New post' });
      mockedPostApi.createPost.mockResolvedValue(newPost);

      await usePostStore.getState().createPost({
        content: 'New post',
        postDate: '2024-03-20',
      });

      const state = usePostStore.getState();
      expect(state.dateGroups).toHaveLength(1);
      expect(state.dateGroups[0].posts[0].id).toBe('new-1');
      expect(state.isCreating).toBe(false);
    });

    it('should prepend to existing date group', async () => {
      // Set up existing post
      usePostStore.setState({
        dateGroups: [
          {
            date: '2024-03-20',
            count: 1,
            posts: [makePost({ id: 'existing' })],
          },
        ],
      });

      const newPost = makePost({ id: 'new-1', postDate: '2024-03-20' });
      mockedPostApi.createPost.mockResolvedValue(newPost);

      await usePostStore.getState().createPost({
        content: 'Another post',
        postDate: '2024-03-20',
      });

      const state = usePostStore.getState();
      expect(state.dateGroups[0].posts).toHaveLength(2);
      expect(state.dateGroups[0].posts[0].id).toBe('new-1'); // prepended
    });
  });

  describe('toggleLike()', () => {
    it('should update isLikedByMe optimistically when liking', async () => {
      const post = makePost({ id: 'p1', isLikedByMe: false, likeCount: 5 });
      usePostStore.setState({
        dateGroups: [{ date: '2024-03-20', count: 1, posts: [post] }],
      });

      mockedPostApi.likePost.mockResolvedValue(undefined as any);

      await usePostStore.getState().toggleLike('p1');

      const state = usePostStore.getState();
      const updatedPost = state.dateGroups[0].posts[0];
      expect(updatedPost.isLikedByMe).toBe(true);
      expect(updatedPost.likeCount).toBe(6);
    });

    it('should update isLikedByMe optimistically when unliking', async () => {
      const post = makePost({ id: 'p1', isLikedByMe: true, likeCount: 5 });
      usePostStore.setState({
        dateGroups: [{ date: '2024-03-20', count: 1, posts: [post] }],
      });

      mockedPostApi.unlikePost.mockResolvedValue(undefined as any);

      await usePostStore.getState().toggleLike('p1');

      const state = usePostStore.getState();
      const updatedPost = state.dateGroups[0].posts[0];
      expect(updatedPost.isLikedByMe).toBe(false);
      expect(updatedPost.likeCount).toBe(4);
    });
  });

  describe('handleRealtimeLike()', () => {
    it('should update likeCount for the specified post', () => {
      const post = makePost({ id: 'p1', likeCount: 3 });
      usePostStore.setState({
        dateGroups: [{ date: '2024-03-20', count: 1, posts: [post] }],
      });

      usePostStore.getState().handleRealtimeLike('p1', 10);

      const updatedPost = usePostStore.getState().dateGroups[0].posts[0];
      expect(updatedPost.likeCount).toBe(10);
    });

    it('should not affect other posts', () => {
      const post1 = makePost({ id: 'p1', likeCount: 3 });
      const post2 = makePost({ id: 'p2', likeCount: 7 });
      usePostStore.setState({
        dateGroups: [{ date: '2024-03-20', count: 2, posts: [post1, post2] }],
      });

      usePostStore.getState().handleRealtimeLike('p1', 99);

      const posts = usePostStore.getState().dateGroups[0].posts;
      expect(posts[0].likeCount).toBe(99);
      expect(posts[1].likeCount).toBe(7); // unchanged
    });
  });

  describe('handleRealtimeComment()', () => {
    it('should update commentCount for the specified post', () => {
      const post = makePost({ id: 'p1', commentCount: 2 });
      usePostStore.setState({
        dateGroups: [{ date: '2024-03-20', count: 1, posts: [post] }],
      });

      usePostStore.getState().handleRealtimeComment('p1', 5);

      const updatedPost = usePostStore.getState().dateGroups[0].posts[0];
      expect(updatedPost.commentCount).toBe(5);
    });
  });
});
