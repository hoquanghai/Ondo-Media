"use client";

import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useAnnouncementStore } from "@/stores/announcement-store";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Announcement } from "@/types/announcement";

interface AnnouncementCardProps {
  announcement: Announcement;
}

export function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  const { markAsRead } = useAnnouncementStore();
  const ref = useRef<HTMLDivElement>(null);

  // 表示時に既読にする
  useEffect(() => {
    if (announcement.isRead) return;
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
  }, [announcement.id, announcement.isRead, markAsRead]);

  return (
    <Card
      ref={ref}
      className={cn(
        "mb-3 transition-colors",
        !announcement.isRead &&
          "border-l-4 border-l-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{announcement.title}</CardTitle>
          {!announcement.isRead && (
            <Badge variant="default" className="text-xs shrink-0">
              未読
            </Badge>
          )}
          {announcement.isRead && (
            <Badge variant="secondary" className="text-xs shrink-0">
              既読
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm whitespace-pre-wrap mb-3">
          {announcement.content}
        </p>
        <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
          <UserAvatar
            shainName={announcement.author.shainName}
            avatar={announcement.author.avatar}
            snsAvatarUrl={announcement.author.snsAvatarUrl}
            size="sm"
            className="h-5 w-5"
          />
          <span>{announcement.author.shainName}</span>
          <span>・</span>
          <span>{announcement.author.shainGroup}</span>
          <span>・</span>
          <span>{formatRelativeTime(announcement.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
