# Phase 05 — Announcements

## Objectives

- お知らせ一覧ページを構築する
- お知らせカード (タイトル・内容・著者・日付・既読/未読ステータス) を実装する
- お知らせ作成ダイアログ (権限のあるユーザーのみ) を実装する
- 閲覧時の自動既読処理を実装する
- リアルタイム新着お知らせ通知を実装する

## Prerequisites

- Phase 01〜04 完了
- バックエンド API: `GET /api/announcements`, `POST /api/announcements`, `PATCH /api/announcements/:id/read`

## Tasks

### 1. お知らせ関連の型定義

**File: `src/types/announcement.ts`**

```ts
export interface Announcement {
  id: string;
  title: string;
  content: string;
  author: {
    id: string;
    display_name: string;
    department: string;
    avatar_url: string | null;
  };
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementsResponse {
  announcements: Announcement[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
  unread_count: number;
}

export interface CreateAnnouncementRequest {
  title: string;
  content: string;
}
```

### 2. お知らせストア (Zustand)

**File: `src/stores/announcement-store.ts`**

```ts
import { create } from "zustand";
import { api } from "@/lib/api";
import type {
  Announcement,
  AnnouncementsResponse,
  CreateAnnouncementRequest,
} from "@/types/announcement";

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
  createAnnouncement: (data: CreateAnnouncementRequest) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  prependAnnouncement: (announcement: Announcement) => void;
}

export const useAnnouncementStore = create<AnnouncementState & AnnouncementActions>(
  (set, get) => ({
    announcements: [],
    unreadCount: 0,
    isLoading: false,
    hasMore: true,
    page: 1,

    fetchAnnouncements: async (page = 1) => {
      set({ isLoading: true });
      const data = await api.get<AnnouncementsResponse>("/announcements", {
        page: String(page),
        per_page: "20",
      });
      set({
        announcements:
          page === 1
            ? data.announcements
            : [...get().announcements, ...data.announcements],
        unreadCount: data.unread_count,
        isLoading: false,
        hasMore: data.has_more,
        page,
      });
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
          a.id === id ? { ...a, is_read: true } : a
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
  })
);
```

### 3. AnnouncementCard コンポーネント

**File: `src/components/announcements/announcement-card.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAnnouncementStore } from "@/stores/announcement-store";
import type { Announcement } from "@/types/announcement";
import { cn } from "@/lib/utils";

interface AnnouncementCardProps {
  announcement: Announcement;
}

export function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  const { markAsRead } = useAnnouncementStore();
  const ref = useRef<HTMLDivElement>(null);

  // 表示時に既読にする
  useEffect(() => {
    if (announcement.is_read) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          markAsRead(announcement.id);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [announcement.id, announcement.is_read, markAsRead]);

  return (
    <Card
      ref={ref}
      className={cn(
        "mb-3 transition-colors",
        !announcement.is_read && "border-l-4 border-l-primary bg-primary/5"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{announcement.title}</CardTitle>
          {!announcement.is_read && (
            <Badge variant="default" className="text-xs shrink-0">
              未読
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm whitespace-pre-wrap mb-3">{announcement.content}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Avatar className="h-5 w-5">
            <AvatarImage src={announcement.author.avatar_url ?? undefined} />
            <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
              {announcement.author.display_name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span>{announcement.author.display_name}</span>
          <span>・</span>
          <span>{announcement.author.department}</span>
          <span>・</span>
          <span>
            {format(new Date(announcement.created_at), "yyyy/MM/dd HH:mm", {
              locale: ja,
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 4. CreateAnnouncementDialog コンポーネント

**File: `src/components/announcements/create-announcement-dialog.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAnnouncementStore } from "@/stores/announcement-store";

export function CreateAnnouncementDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createAnnouncement } = useAnnouncementStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setIsSubmitting(true);
    try {
      await createAnnouncement({ title, content });
      setTitle("");
      setContent("");
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1">
          <Plus className="h-4 w-4" />
          お知らせ作成
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>新しいお知らせ</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">タイトル</label>
            <Input
              placeholder="お知らせのタイトルを入力"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">内容</label>
            <Textarea
              placeholder="お知らせの内容を入力"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              投稿する
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### 5. お知らせ一覧ページ

**File: `src/app/(main)/announcements/page.tsx`**

```tsx
"use client";

import { useEffect, useCallback, useRef } from "react";
import { useAnnouncementStore } from "@/stores/announcement-store";
import { AnnouncementCard } from "@/components/announcements/announcement-card";
import { CreateAnnouncementDialog } from "@/components/announcements/create-announcement-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/auth-store";

export default function AnnouncementsPage() {
  const { announcements, isLoading, hasMore, fetchAnnouncements, loadMore } =
    useAnnouncementStore();
  const user = useAuthStore((s) => s.user);
  const canCreate = user?.permissions?.includes("create_announcement") || user?.role === "admin";

  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isLoading) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) loadMore();
      });
      if (node) observerRef.current.observe(node);
    },
    [isLoading, hasMore, loadMore]
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold">お知らせ</h1>
        {canCreate && <CreateAnnouncementDialog />}
      </div>

      {announcements.map((announcement) => (
        <AnnouncementCard key={announcement.id} announcement={announcement} />
      ))}

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border rounded-lg space-y-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      )}

      <div ref={lastElementRef} className="h-4" />

      {!isLoading && announcements.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          お知らせはありません
        </p>
      )}
    </div>
  );
}
```

## Verification Checklist

- [ ] `/announcements` ページが表示される
- [ ] お知らせカードにタイトル・内容・著者・日付が表示される
- [ ] 未読のお知らせに「未読」バッジと左ボーダーが表示される
- [ ] スクロールで表示されたお知らせが自動的に既読になる
- [ ] 権限のあるユーザーに「お知らせ作成」ボタンが表示される
- [ ] ダイアログからお知らせを作成できる
- [ ] 作成したお知らせが一覧の先頭に表示される
- [ ] 無限スクロールで追加読み込みされる
- [ ] すべてのテキストが日本語
- [ ] TypeScript エラーがない

## Files Created / Modified

| ファイル | 操作 | 概要 |
|---|---|---|
| `src/types/announcement.ts` | 作成 | お知らせ関連の型定義 |
| `src/stores/announcement-store.ts` | 作成 | Zustand お知らせストア |
| `src/components/announcements/announcement-card.tsx` | 作成 | お知らせカード (既読/未読対応) |
| `src/components/announcements/create-announcement-dialog.tsx` | 作成 | お知らせ作成ダイアログ |
| `src/app/(main)/announcements/page.tsx` | 作成 | お知らせ一覧ページ |
