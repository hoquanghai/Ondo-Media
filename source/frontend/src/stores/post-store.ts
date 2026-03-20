"use client";

import { create } from "zustand";
import { postApi } from "@/lib/post-api";
import type { Post, Comment, PostDateCount } from "@/types/post";
import { format } from "date-fns";

interface DateGroup {
  date: string;
  count: number;
  posts: Post[];
}

interface PostState {
  dateGroups: DateGroup[];
  currentDate: string; // "yyyy-MM-dd" format, default: today
  dateCounts: Record<string, number>; // date -> count map
  isLoading: boolean;
  isCreating: boolean;
  hasMore: boolean;
  page: number;
  hasNewPosts: boolean;
}

interface PostActions {
  fetchPosts: (date?: string, page?: number) => Promise<void>;
  fetchDateCounts: (startDate: string, endDate: string) => Promise<void>;
  setCurrentDate: (date: string) => void;
  createPost: (data: { content: string; postDate: string; title?: string; files?: File[] }) => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: string) => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  addComment: (postId: string, content: string) => Promise<Comment>;
  fetchComments: (postId: string, page?: number) => Promise<Comment[]>;
  deletePost: (postId: string) => Promise<void>;
  prependNewPost: (post: Post) => void;
  setHasNewPosts: (value: boolean) => void;
  loadMore: () => Promise<void>;
  handleRealtimeLike: (postId: string, likeCount: number) => void;
  handleRealtimeComment: (postId: string, commentCount: number) => void;
}

export type PostStore = PostState & PostActions;

export const usePostStore = create<PostStore>((set, get) => ({
  dateGroups: [],
  currentDate: format(new Date(), "yyyy-MM-dd"),
  dateCounts: {},
  isLoading: false,
  isCreating: false,
  hasMore: true,
  page: 1,
  hasNewPosts: false,

  fetchPosts: async (date?: string, page = 1) => {
    set({ isLoading: true });
    try {
      const targetDate = date ?? get().currentDate;
      const data = await postApi.getPosts({
        date: targetDate,
        page,
        limit: 20,
      });

      // 日付別にグループ化
      const groupMap = new Map<string, DateGroup>();
      for (const post of data.items) {
        const d = post.postDate;
        if (!groupMap.has(d)) {
          groupMap.set(d, { date: d, count: 0, posts: [] });
        }
        const group = groupMap.get(d)!;
        group.posts.push(post);
        group.count++;
      }

      const newGroups = Array.from(groupMap.values()).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      if (page === 1) {
        set({
          dateGroups: newGroups,
          isLoading: false,
          hasMore: page < (data.meta?.totalPages ?? 0),
          page,
        });
      } else {
        // ページ追加の場合、既存グループとマージ
        const existing = get().dateGroups;
        const merged = [...existing];
        for (const newGroup of newGroups) {
          const idx = merged.findIndex((g) => g.date === newGroup.date);
          if (idx >= 0) {
            merged[idx] = {
              ...merged[idx],
              posts: [...merged[idx].posts, ...newGroup.posts],
              count: merged[idx].count + newGroup.count,
            };
          } else {
            merged.push(newGroup);
          }
        }
        merged.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        set({
          dateGroups: merged,
          isLoading: false,
          hasMore: page < (data.meta?.totalPages ?? 0),
          page,
        });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  fetchDateCounts: async (startDate: string, endDate: string) => {
    try {
      const counts = await postApi.getDateCounts(startDate, endDate);
      const map: Record<string, number> = { ...get().dateCounts };
      for (const item of counts) {
        map[item.date] = item.count;
      }
      set({ dateCounts: map });
    } catch {
      // エラー時は何もしない
    }
  },

  setCurrentDate: (date: string) => {
    set({ currentDate: date, dateGroups: [], page: 1, hasMore: true });
    get().fetchPosts(date, 1);
  },

  createPost: async (data: { content: string; postDate: string; title?: string; files?: File[] }) => {
    set({ isCreating: true });
    try {
      const post = await postApi.createPost(data);
      get().prependNewPost(post);
    } finally {
      set({ isCreating: false });
    }
  },

  likePost: async (postId: string) => {
    // オプティミスティック UI
    set((state) => ({
      dateGroups: state.dateGroups.map((group) => ({
        ...group,
        posts: group.posts.map((post) =>
          post.id === postId
            ? {
                ...post,
                isLikedByMe: true,
                likeCount: post.likeCount + 1,
              }
            : post,
        ),
      })),
    }));

    try {
      await postApi.likePost(postId);
    } catch {
      // ロールバック
      set((state) => ({
        dateGroups: state.dateGroups.map((group) => ({
          ...group,
          posts: group.posts.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  isLikedByMe: false,
                  likeCount: post.likeCount - 1,
                }
              : post,
          ),
        })),
      }));
    }
  },

  unlikePost: async (postId: string) => {
    // オプティミスティック UI
    set((state) => ({
      dateGroups: state.dateGroups.map((group) => ({
        ...group,
        posts: group.posts.map((post) =>
          post.id === postId
            ? {
                ...post,
                isLikedByMe: false,
                likeCount: post.likeCount - 1,
              }
            : post,
        ),
      })),
    }));

    try {
      await postApi.unlikePost(postId);
    } catch {
      // ロールバック
      set((state) => ({
        dateGroups: state.dateGroups.map((group) => ({
          ...group,
          posts: group.posts.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  isLikedByMe: true,
                  likeCount: post.likeCount + 1,
                }
              : post,
          ),
        })),
      }));
    }
  },

  toggleLike: async (postId: string) => {
    const post = get()
      .dateGroups.flatMap((g) => g.posts)
      .find((p) => p.id === postId);
    if (!post) return;

    if (post.isLikedByMe) {
      await get().unlikePost(postId);
    } else {
      await get().likePost(postId);
    }
  },

  addComment: async (postId: string, content: string) => {
    const comment = await postApi.createComment(postId, content);
    set((state) => ({
      dateGroups: state.dateGroups.map((group) => ({
        ...group,
        posts: group.posts.map((post) =>
          post.id === postId
            ? { ...post, commentCount: post.commentCount + 1 }
            : post,
        ),
      })),
    }));
    return comment;
  },

  fetchComments: async (postId: string, page?: number) => {
    const data = await postApi.getComments(postId, page);
    return data.items;
  },

  deletePost: async (postId: string) => {
    await postApi.deletePost(postId);
    set((state) => ({
      dateGroups: state.dateGroups
        .map((group) => ({
          ...group,
          posts: group.posts.filter((p) => p.id !== postId),
          count: group.count - (group.posts.some((p) => p.id === postId) ? 1 : 0),
        }))
        .filter((group) => group.posts.length > 0),
    }));
  },

  prependNewPost: (post: Post) => {
    set((state) => {
      const groups = [...state.dateGroups];
      const groupIndex = groups.findIndex((g) => g.date === post.postDate);
      if (groupIndex >= 0) {
        groups[groupIndex] = {
          ...groups[groupIndex],
          posts: [post, ...groups[groupIndex].posts],
          count: groups[groupIndex].count + 1,
        };
      } else {
        groups.unshift({ date: post.postDate, count: 1, posts: [post] });
        groups.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
      }
      return { dateGroups: groups, hasNewPosts: false };
    });
  },

  setHasNewPosts: (value: boolean) => set({ hasNewPosts: value }),

  loadMore: async () => {
    const { page, hasMore, isLoading, currentDate } = get();
    if (!hasMore || isLoading) return;
    await get().fetchPosts(currentDate, page + 1);
  },

  handleRealtimeLike: (postId: string, likeCount: number) => {
    set((state) => ({
      dateGroups: state.dateGroups.map((group) => ({
        ...group,
        posts: group.posts.map((post) =>
          post.id === postId ? { ...post, likeCount } : post,
        ),
      })),
    }));
  },

  handleRealtimeComment: (postId: string, commentCount: number) => {
    set((state) => ({
      dateGroups: state.dateGroups.map((group) => ({
        ...group,
        posts: group.posts.map((post) =>
          post.id === postId ? { ...post, commentCount } : post,
        ),
      })),
    }));
  },
}));
