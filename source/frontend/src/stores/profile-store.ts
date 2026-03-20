"use client";

import { create } from "zustand";
import { api } from "@/lib/api";
import type {
  UserProfile,
  UserStats,
  UpdateProfileRequest,
} from "@/types/profile";
import type { Post } from "@/types/post";
import type { PaginatedResponse } from "@/types/api";

interface ProfileState {
  profile: UserProfile | null;
  stats: UserStats | null;
  posts: Post[];
  isLoading: boolean;
  hasMorePosts: boolean;
  postsPage: number;
}

interface ProfileActions {
  fetchMyProfile: () => Promise<void>;
  fetchMyStats: () => Promise<void>;
  fetchMyPosts: (page?: number) => Promise<void>;
  updateProfile: (data: UpdateProfileRequest) => Promise<void>;
  fetchUserProfile: (userId: string) => Promise<void>;
  fetchUserStats: (userId: string) => Promise<void>;
  fetchUserPosts: (userId: string, page?: number) => Promise<void>;
  reset: () => void;
}

export const useProfileStore = create<ProfileState & ProfileActions>(
  (set, get) => ({
    profile: null,
    stats: null,
    posts: [],
    isLoading: false,
    hasMorePosts: true,
    postsPage: 1,

    fetchMyProfile: async () => {
      try {
        const profile = await api.get<UserProfile>("/users/me");
        set({ profile });
      } catch {
        // ignore
      }
    },

    fetchMyStats: async () => {
      try {
        const stats = await api.get<UserStats>("/users/me/stats");
        set({ stats });
      } catch {
        // ignore
      }
    },

    fetchMyPosts: async (page = 1) => {
      set({ isLoading: true });
      try {
        const userId = get().profile?.shainBangou;
        const data = await api.get<PaginatedResponse<Post>>(
          "/posts",
          {
            userId: userId ? String(userId) : "",
            page: String(page),
            limit: "10",
          }
        );
        set({
          posts: page === 1 ? data.items : [...get().posts, ...data.items],
          isLoading: false,
          hasMorePosts: data.meta ? page < data.meta.totalPages : false,
          postsPage: page,
        });
      } catch {
        set({ isLoading: false });
      }
    },

    updateProfile: async (data) => {
      const formData = new FormData();
      if (data.shainName) formData.append("shainName", data.shainName);
      if (data.snsBio !== undefined) formData.append("snsBio", data.snsBio);
      if (data.avatar) formData.append("avatar", data.avatar);

      const profile = await api.request<UserProfile>("/users/me", {
        method: "PATCH",
        body: formData,
      });
      set({ profile });
    },

    fetchUserProfile: async (userId) => {
      set({ isLoading: true, profile: null, stats: null, posts: [] });
      try {
        const profile = await api.get<UserProfile>(`/users/${userId}`);
        set({ profile, isLoading: false });
      } catch {
        set({ isLoading: false });
      }
    },

    fetchUserStats: async (userId) => {
      try {
        const stats = await api.get<UserStats>(`/users/${userId}/stats`);
        set({ stats });
      } catch {
        // ignore
      }
    },

    fetchUserPosts: async (userId, page = 1) => {
      set({ isLoading: true });
      try {
        const data = await api.get<PaginatedResponse<Post>>(
          `/users/${userId}/posts`,
          {
            page: String(page),
            limit: "10",
          }
        );
        set({
          posts: page === 1 ? data.items : [...get().posts, ...data.items],
          isLoading: false,
          hasMorePosts: data.meta ? page < data.meta.totalPages : false,
          postsPage: page,
        });
      } catch {
        set({ isLoading: false });
      }
    },

    reset: () => {
      set({
        profile: null,
        stats: null,
        posts: [],
        isLoading: false,
        hasMorePosts: true,
        postsPage: 1,
      });
    },
  })
);
