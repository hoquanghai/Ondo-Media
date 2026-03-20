# Phase 09 — Notifications

## Objectives

- Socket.IO による WebSocket 接続を構築する
- リアルタイム通知 (いいね・コメント・新着投稿・お知らせ・アンケート) を実装する
- NotificationBell コンポーネント (未読カウントバッジ) を実装する
- 通知一覧 (ドロップダウンパネル) を実装する
- ブラウザプッシュ通知のサブスクリプションを実装する
- Zustand で通知状態を管理する

## Prerequisites

- Phase 01〜08 完了
- バックエンド WebSocket サーバー (Socket.IO) が稼働中
- バックエンド API: `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`

## Tasks

### 1. 通知関連の型定義

**File: `src/types/notification.ts`**

```ts
export interface Notification {
  id: string;
  type: NotificationType;
  actor: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
  message: string;
  reference_id: string; // 関連オブジェクトの ID
  reference_type: "post" | "announcement" | "survey";
  is_read: boolean;
  created_at: string;
}

export type NotificationType =
  | "post:new"
  | "post:liked"
  | "post:commented"
  | "announcement:new"
  | "survey:new";

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unread_count: number;
  has_more: boolean;
}
```

### 2. Socket.IO クライアント

**File: `src/lib/socket.ts`**

```ts
import { io, Socket } from "socket.io-client";
import { env } from "./env";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(env.wsUrl, {
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function connectSocket(token: string) {
  const s = getSocket();
  s.auth = { token };
  s.connect();

  s.on("connect", () => {
    console.log("[Socket] 接続完了:", s.id);
  });

  s.on("connect_error", (err) => {
    console.error("[Socket] 接続エラー:", err.message);
  });

  s.on("disconnect", (reason) => {
    console.log("[Socket] 切断:", reason);
  });

  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
```

### 3. useWebSocket フック

**File: `src/hooks/use-websocket.ts`**

```ts
"use client";

import { useEffect, useRef } from "react";
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/auth-store";

export function useWebSocket() {
  const { isAuthenticated } = useAuthStore();
  const connectedRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !connectedRef.current) {
      const token = localStorage.getItem("access_token");
      if (token) {
        connectSocket(token);
        connectedRef.current = true;
      }
    }

    return () => {
      // コンポーネントアンマウント時は切断しない
      // ログアウト時のみ切断する
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated && connectedRef.current) {
      disconnectSocket();
      connectedRef.current = false;
    }
  }, [isAuthenticated]);

  return getSocket();
}
```

### 4. 通知ストア (Zustand)

**File: `src/stores/notification-store.ts`**

```ts
import { create } from "zustand";
import { api } from "@/lib/api";
import type { Notification, NotificationsResponse } from "@/types/notification";

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

export const useNotificationStore = create<NotificationState & NotificationActions>(
  (set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    hasMore: true,
    page: 1,

    fetchNotifications: async (page = 1) => {
      set({ isLoading: true });
      const data = await api.get<NotificationsResponse>("/notifications", {
        page: String(page),
        per_page: "20",
      });
      set({
        notifications:
          page === 1
            ? data.notifications
            : [...get().notifications, ...data.notifications],
        unreadCount: data.unread_count,
        isLoading: false,
        hasMore: data.has_more,
        page,
      });
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
          n.id === id ? { ...n, is_read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    },

    markAllAsRead: async () => {
      await api.patch("/notifications/read-all");
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
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
  })
);
```

### 5. useNotifications フック

**File: `src/hooks/use-notifications.ts`**

```ts
"use client";

import { useEffect } from "react";
import { useWebSocket } from "./use-websocket";
import { useNotificationStore } from "@/stores/notification-store";
import { usePostStore } from "@/stores/post-store";
import { useAnnouncementStore } from "@/stores/announcement-store";
import type { Notification as AppNotification } from "@/types/notification";
import type { Post } from "@/types/post";
import type { Announcement } from "@/types/announcement";

export function useNotifications() {
  const socket = useWebSocket();
  const { addNotification, fetchNotifications } = useNotificationStore();
  const { setHasNewPosts } = usePostStore();
  const { prependAnnouncement } = useAnnouncementStore();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!socket) return;

    // 新しい通知
    const handleNotification = (notification: AppNotification) => {
      addNotification(notification);
      showBrowserNotification(notification);
    };

    // 新しい投稿 (タイムライン更新)
    const handleNewPost = (_post: Post) => {
      setHasNewPosts(true);
    };

    // 新しいお知らせ
    const handleNewAnnouncement = (announcement: Announcement) => {
      prependAnnouncement(announcement);
    };

    socket.on("notification", handleNotification);
    socket.on("post:new", handleNewPost);
    socket.on("announcement:new", handleNewAnnouncement);

    return () => {
      socket.off("notification", handleNotification);
      socket.off("post:new", handleNewPost);
      socket.off("announcement:new", handleNewAnnouncement);
    };
  }, [socket, addNotification, setHasNewPosts, prependAnnouncement]);
}

// ブラウザ通知表示
function showBrowserNotification(notification: AppNotification) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  new Notification("コープネット", {
    body: notification.message,
    icon: notification.actor.avatar_url ?? "/icon.png",
    tag: notification.id,
  });
}
```

### 6. ブラウザプッシュ通知サブスクリプション

**File: `src/lib/push-notification.ts`**

```ts
import { api } from "./api";

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;

  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const permission = await Notification.requestPermission();
  return permission === "granted";
}

export async function subscribeToPushNotifications(): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  if (!("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    });

    // サーバーにサブスクリプションを登録
    await api.post("/notifications/push-subscribe", {
      subscription: subscription.toJSON(),
    });
  } catch (err) {
    console.error("[Push] サブスクリプションエラー:", err);
  }
}
```

### 7. NotificationBell コンポーネント

**File: `src/components/notifications/notification-bell.tsx`**

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotificationStore } from "@/stores/notification-store";
import { NotificationList } from "./notification-list";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount } = useNotificationStore();
  const panelRef = useRef<HTMLDivElement>(null);

  // 外部クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={panelRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 tablet:w-96 bg-surface border rounded-lg shadow-lg z-50 max-h-[480px] flex flex-col">
          <NotificationList onClose={() => setIsOpen(false)} />
        </div>
      )}
    </div>
  );
}
```

### 8. NotificationList コンポーネント

**File: `src/components/notifications/notification-list.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotificationStore } from "@/stores/notification-store";
import { NotificationItem } from "./notification-item";

interface NotificationListProps {
  onClose: () => void;
}

export function NotificationList({ onClose }: NotificationListProps) {
  const { notifications, isLoading, hasMore, fetchNotifications, loadMore, markAllAsRead } =
    useNotificationStore();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-bold text-sm">通知</h3>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground gap-1"
          onClick={markAllAsRead}
        >
          <CheckCheck className="h-3 w-3" />
          すべて既読
        </Button>
      </div>

      {/* Notification items */}
      <ScrollArea className="flex-1 max-h-[400px]">
        {notifications.length === 0 && !isLoading && (
          <p className="text-center text-sm text-muted-foreground py-8">
            通知はありません
          </p>
        )}

        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onClose={onClose}
          />
        ))}

        {hasMore && (
          <div className="p-2 text-center">
            <Button variant="ghost" size="sm" className="text-xs" onClick={loadMore}>
              もっと読み込む
            </Button>
          </div>
        )}
      </ScrollArea>
    </>
  );
}
```

### 9. NotificationItem コンポーネント

**File: `src/components/notifications/notification-item.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Heart, MessageCircle, FileText, Bell, ClipboardList } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNotificationStore } from "@/stores/notification-store";
import type { Notification, NotificationType } from "@/types/notification";
import { cn } from "@/lib/utils";

interface NotificationItemProps {
  notification: Notification;
  onClose: () => void;
}

const iconMap: Record<NotificationType, typeof Heart> = {
  "post:new": FileText,
  "post:liked": Heart,
  "post:commented": MessageCircle,
  "announcement:new": Bell,
  "survey:new": ClipboardList,
};

const colorMap: Record<NotificationType, string> = {
  "post:new": "text-blue-500",
  "post:liked": "text-red-500",
  "post:commented": "text-green-500",
  "announcement:new": "text-orange-500",
  "survey:new": "text-purple-500",
};

function getNotificationLink(notification: Notification): string {
  switch (notification.reference_type) {
    case "post":
      return `/#post-${notification.reference_id}`;
    case "announcement":
      return "/announcements";
    case "survey":
      return `/surveys/${notification.reference_id}`;
    default:
      return "/";
  }
}

export function NotificationItem({ notification, onClose }: NotificationItemProps) {
  const router = useRouter();
  const { markAsRead } = useNotificationStore();
  const Icon = iconMap[notification.type] ?? Bell;
  const iconColor = colorMap[notification.type] ?? "text-primary";
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: ja,
  });

  const handleClick = () => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    router.push(getNotificationLink(notification));
    onClose();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b last:border-b-0",
        !notification.is_read && "bg-primary/5"
      )}
    >
      {/* Actor avatar */}
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={notification.actor.avatar_url ?? undefined} />
        <AvatarFallback className="text-xs bg-primary/20 text-primary">
          {notification.actor.display_name.charAt(0)}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">
          <span className="font-medium">{notification.actor.display_name}</span>
          {" "}
          <span className="text-muted-foreground">{notification.message}</span>
        </p>
        <div className="flex items-center gap-1 mt-1">
          <Icon className={cn("h-3 w-3", iconColor)} />
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>
      </div>

      {/* Unread indicator */}
      {!notification.is_read && (
        <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
      )}
    </button>
  );
}
```

### 10. ヘッダーへの統合

**File: `src/components/layout/header.tsx`** (修正)

Header コンポーネント内の通知ベル部分を `NotificationBell` に置き換える:

```tsx
// Before (Phase 03 のハードコード):
// <Button variant="ghost" size="icon" className="relative">
//   <Bell className="h-5 w-5" />
//   ...
// </Button>

// After:
import { NotificationBell } from "@/components/notifications/notification-bell";

// ...
<NotificationBell />
```

### 11. メインレイアウトへの統合

**File: `src/app/(main)/layout.tsx`** (修正)

`useNotifications` フックをメインレイアウトに追加:

```tsx
import { useNotifications } from "@/hooks/use-notifications";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  useNotifications(); // WebSocket 接続 + リアルタイム通知リスナー
  // ... 既存のコード
}
```

### 12. 通知権限リクエスト

**File: `src/components/notifications/push-permission-prompt.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { subscribeToPushNotifications } from "@/lib/push-notification";

export function PushPermissionPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      // 初回アクセスから少し遅延して表示
      const timer = setTimeout(() => setShow(true), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!show) return null;

  const handleAllow = async () => {
    await subscribeToPushNotifications();
    setShow(false);
  };

  return (
    <Card className="fixed bottom-20 tablet:bottom-4 right-4 w-80 shadow-lg z-50 border-primary/20">
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">通知を有効にしますか？</p>
            <p className="text-xs text-muted-foreground mt-1">
              新しい投稿やいいね、コメントの通知をリアルタイムで受け取れます。
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={handleAllow}>
                有効にする
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShow(false)}>
                後で
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

## Verification Checklist

- [ ] 認証後に Socket.IO 接続が確立される (コンソールに "接続完了" ログ)
- [ ] ログアウト時に WebSocket が切断される
- [ ] NotificationBell に未読カウントバッジが表示される
- [ ] ベルクリックで通知ドロップダウンが開く
- [ ] 通知アイテム: アクターアバター + メッセージ + アイコン + 時間が表示される
- [ ] 未読通知に青い丸インジケーターが表示される
- [ ] 通知クリックで該当ページに遷移し、既読になる
- [ ] 「すべて既読」で全通知が既読になる
- [ ] リアルタイムイベント受信時:
  - [ ] `post:new` → タイムラインに「新しい投稿があります」バナー
  - [ ] `post:liked` → 通知に追加
  - [ ] `post:commented` → 通知に追加
  - [ ] `announcement:new` → お知らせ一覧に追加 + 通知
  - [ ] `survey:new` → 通知に追加
- [ ] ブラウザ通知権限プロンプトが表示される
- [ ] 権限許可後にブラウザ通知が届く
- [ ] すべてのテキストが日本語
- [ ] TypeScript エラーがない

## Files Created / Modified

| ファイル | 操作 | 概要 |
|---|---|---|
| `src/types/notification.ts` | 作成 | 通知関連の型定義 |
| `src/lib/socket.ts` | 作成 | Socket.IO クライアント (接続・切断) |
| `src/lib/push-notification.ts` | 作成 | ブラウザプッシュ通知ユーティリティ |
| `src/hooks/use-websocket.ts` | 作成 | WebSocket 接続管理フック |
| `src/hooks/use-notifications.ts` | 作成 | 通知イベントリスナーフック |
| `src/stores/notification-store.ts` | 作成 | Zustand 通知ストア |
| `src/components/notifications/notification-bell.tsx` | 作成 | 通知ベルコンポーネント |
| `src/components/notifications/notification-list.tsx` | 作成 | 通知一覧パネル |
| `src/components/notifications/notification-item.tsx` | 作成 | 通知アイテム |
| `src/components/notifications/push-permission-prompt.tsx` | 作成 | プッシュ通知権限プロンプト |
| `src/components/layout/header.tsx` | 修正 | NotificationBell 統合 |
| `src/app/(main)/layout.tsx` | 修正 | useNotifications フック統合 |
