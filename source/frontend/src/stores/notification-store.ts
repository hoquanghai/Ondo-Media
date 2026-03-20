"use client";

import { create } from "zustand";
import { api } from "@/lib/api";
import type { Notification } from "@/types/notification";
import type { PaginatedResponse } from "@/types/api";

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  hasMore: boolean;
  page: number;
}

interface NotificationActions {
  fetchNotifications: (page?: number) => Promise<void>;
  loadMore: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  setUnreadCount: (count: number) => void;
}

export const useNotificationStore = create<
  NotificationState & NotificationActions
>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  hasMore: true,
  page: 1,

  fetchNotifications: async (page = 1) => {
    set({ isLoading: true });
    try {
      const data = await api.get<
        PaginatedResponse<Notification> & { unreadCount?: number }
      >("/notifications", {
        page: String(page),
        limit: "20",
      });
      set({
        notifications:
          page === 1
            ? data.items
            : [...get().notifications, ...data.items],
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
    await get().fetchNotifications(page + 1);
  },

  markAsRead: async (id) => {
    await api.patch(`/notifications/${id}/read`);
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllAsRead: async () => {
    await api.patch("/notifications/read-all");
    set((state) => ({
      notifications: state.notifications.map((n) => ({
        ...n,
        isRead: true,
      })),
      unreadCount: 0,
    }));
  },

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  setUnreadCount: (count) => set({ unreadCount: count }),
}));
