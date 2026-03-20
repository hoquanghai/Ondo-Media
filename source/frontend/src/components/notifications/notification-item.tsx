"use client";

import { useRouter } from "next/navigation";
import { Heart, MessageCircle, FileText, Bell, ClipboardList } from "lucide-react";
import { useNotificationStore } from "@/stores/notification-store";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Notification, NotificationType } from "@/types/notification";

interface NotificationItemProps {
  notification: Notification;
  onClose: () => void;
}

const iconMap: Record<NotificationType, typeof Heart> = {
  like: Heart,
  comment: MessageCircle,
  announcement: Bell,
  survey: ClipboardList,
  system: Bell,
};

const colorMap: Record<NotificationType, string> = {
  like: "text-red-500",
  comment: "text-green-500",
  announcement: "text-orange-500",
  survey: "text-purple-500",
  system: "text-blue-500",
};

function getNotificationLink(notification: Notification): string {
  return notification.linkUrl ?? "/";
}

export function NotificationItem({
  notification,
  onClose,
}: NotificationItemProps) {
  const router = useRouter();
  const { markAsRead } = useNotificationStore();
  const Icon = iconMap[notification.type] ?? Bell;
  const iconColor = colorMap[notification.type] ?? "text-[hsl(var(--primary))]";
  const timeAgo = formatRelativeTime(notification.createdAt);

  const handleClick = () => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    const link = getNotificationLink(notification);
    if (link !== "/") {
      router.push(link);
    }
    onClose();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[hsl(var(--muted)/0.5)] transition-colors border-b last:border-b-0",
        !notification.isRead && "bg-[hsl(var(--primary)/0.05)]"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "h-9 w-9 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center shrink-0",
          iconColor
        )}
      >
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">
          <span className="font-medium">{notification.title}</span>
        </p>
        <p className="text-sm text-[hsl(var(--muted-foreground))] leading-snug">
          {notification.message}
        </p>
        <span className="text-xs text-[hsl(var(--muted-foreground))] mt-1 block">
          {timeAgo}
        </span>
      </div>

      {/* Unread indicator */}
      {!notification.isRead && (
        <div className="h-2 w-2 rounded-full bg-[hsl(var(--primary))] shrink-0 mt-2" />
      )}
    </button>
  );
}
