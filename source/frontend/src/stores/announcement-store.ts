"use client";

import { create } from "zustand";
import { api } from "@/lib/api";
import type { Announcement } from "@/types/announcement";
import type { PaginatedResponse } from "@/types/api";

interface AnnouncementState {
  announcements: Announcement[];
  unreadCount: number;
  isLoading: boolean;
  hasMore: boolean;
  page: number;
}

interface AnnouncementActions {
  fetchAnnouncements: (page?: number) => Promise<void>;
  loadMore: () => Promise<void>;
  createAnnouncement: (data: {
    title: string;
    content: string;
  }) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  prependAnnouncement: (announcement: Announcement) => void;
}

export const useAnnouncementStore = create<
  AnnouncementState & AnnouncementActions
>((set, get) => ({
  announcements: [],
  unreadCount: 0,
  isLoading: false,
  hasMore: true,
  page: 1,

  fetchAnnouncements: async (page = 1) => {
    set({ isLoading: true });
    try {
      const data = await api.get<
        PaginatedResponse<Announcement> & { unreadCount?: number }
      >("/announcements", {
        page: String(page),
        limit: "20",
      });
      set({
        announcements:
          page === 1
            ? data.items
            : [...get().announcements, ...data.items],
        unreadCount: data.unreadCount ?? 0,
        isLoading: false,
        hasMore: page < data.totalPages,
        page,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  loadMore: async () => {
    const { page, hasMore, isLoading } = get();
    if (!hasMore || isLoading) return;
    await get().fetchAnnouncements(page + 1);
  },

  createAnnouncement: async (data) => {
    const announcement = await api.post<Announcement>("/announcements", data);
    get().prependAnnouncement(announcement);
  },

  markAsRead: async (id) => {
    await api.patch(`/announcements/${id}/read`);
    set((state) => ({
      announcements: state.announcements.map((a) =>
        a.id === id ? { ...a, isRead: true } : a
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  prependAnnouncement: (announcement) => {
    set((state) => ({
      announcements: [announcement, ...state.announcements],
      unreadCount: state.unreadCount + 1,
    }));
  },
}));
