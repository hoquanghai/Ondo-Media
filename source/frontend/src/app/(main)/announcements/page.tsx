"use client";

import { useEffect, useCallback, useRef } from "react";
import { Bell } from "lucide-react";
import { useAnnouncementStore } from "@/stores/announcement-store";
import { AnnouncementCard } from "@/components/announcements/announcement-card";
import { CreateAnnouncementDialog } from "@/components/announcements/create-announcement-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/auth-store";

export default function AnnouncementsPage() {
  const { announcements, isLoading, hasMore, fetchAnnouncements, loadMore } =
    useAnnouncementStore();
  const user = useAuthStore((s) => s.user);
  const canCreate =
    user?.permissions?.includes("create_announcement") ||
    user?.permissions?.includes("admin");

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
      <PageHeader
        title="お知らせ"
        description="社内のお知らせを確認できます"
      >
        {canCreate && <CreateAnnouncementDialog />}
      </PageHeader>

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
        <EmptyState
          icon={Bell}
          title="お知らせはありません"
          description="新しいお知らせが投稿されるとここに表示されます"
        />
      )}
    </div>
  );
}
