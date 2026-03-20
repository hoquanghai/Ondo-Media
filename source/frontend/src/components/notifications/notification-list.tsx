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
  const {
    notifications,
    isLoading,
    hasMore,
    fetchNotifications,
    loadMore,
    markAllAsRead,
  } = useNotificationStore();

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
          className="text-xs text-[hsl(var(--muted-foreground))] gap-1"
          onClick={markAllAsRead}
        >
          <CheckCheck className="h-3 w-3" />
          すべて既読
        </Button>
      </div>

      {/* Notification items */}
      <ScrollArea className="flex-1 max-h-[400px]">
        {notifications.length === 0 && !isLoading && (
          <p className="text-center text-sm text-[hsl(var(--muted-foreground))] py-8">
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
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={loadMore}
            >
              もっと読み込む
            </Button>
          </div>
        )}
      </ScrollArea>
    </>
  );
}
