import type { User } from "./user";

export interface Announcement {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  isRead: boolean;
  author: User;
  publishedAt: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnnouncementRequest {
  title: string;
  content: string;
}
