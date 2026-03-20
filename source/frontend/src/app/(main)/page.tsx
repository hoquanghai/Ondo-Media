"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { format, subMonths, addMonths } from "date-fns";
import { RefreshCw, CalendarDays, FileText } from "lucide-react";
import { usePostStore } from "@/stores/post-store";
import { CreatePost } from "@/components/post/create-post";
import { DateGroupHeader } from "@/components/post/date-group-header";
import { PostCard } from "@/components/post/post-card";
import { PostSkeleton } from "@/components/post/post-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

export default function TimelinePage() {
  const {
    dateGroups,
    currentDate,
    dateCounts,
    isLoading,
    hasMore,
    hasNewPosts,
    fetchPosts,
    fetchDateCounts,
    loadMore,
    setCurrentDate,
    setHasNewPosts,
  } = usePostStore();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 初回読み込み
  useEffect(() => {
    fetchPosts(currentDate, 1);
  }, [currentDate, fetchPosts]);

  // 日付ごとの投稿件数を取得
  useEffect(() => {
    const now = new Date();
    const start = format(subMonths(now, 3), "yyyy-MM-dd");
    const end = format(addMonths(now, 1), "yyyy-MM-dd");
    fetchDateCounts(start, end);
  }, [fetchDateCounts]);

  // 無限スクロール
  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isLoading) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [isLoading, hasMore, loadMore],
  );

  const handleDateSelect = (date: Date) => {
    setCurrentDate(format(date, "yyyy-MM-dd"));
    setShowDatePicker(false);
  };

  const handleRefresh = () => {
    fetchPosts(currentDate, 1);
    setHasNewPosts(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* ページタイトル + 日付フィルター */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">タイムライン</h1>
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setShowDatePicker(!showDatePicker)}
          >
            <CalendarDays className="h-4 w-4" />
            {currentDate}
          </Button>
          {showDatePicker && (
            <div className="absolute right-0 top-full mt-1 border border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--card))] shadow-lg z-20">
              <Calendar
                selected={new Date(currentDate)}
                onSelect={handleDateSelect}
                dateCounts={dateCounts}
              />
              <div className="p-2 border-t border-[hsl(var(--border))]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    setCurrentDate(format(new Date(), "yyyy-MM-dd"));
                    setShowDatePicker(false);
                  }}
                >
                  今日に戻る
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 新着投稿バナー */}
      {hasNewPosts && (
        <Button
          variant="outline"
          className="w-full mb-4 text-[hsl(var(--primary))] border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/5"
          onClick={handleRefresh}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          新しい投稿があります
        </Button>
      )}

      {/* 投稿作成フォーム */}
      <CreatePost />

      {/* 日付グループ別投稿一覧 */}
      {dateGroups.map((group) => (
        <div key={group.date}>
          <DateGroupHeader date={group.date} count={group.count} />
          {group.posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ))}

      {/* ローディングスケルトン */}
      {isLoading && (
        <div className="space-y-4 mt-4">
          {[1, 2, 3].map((i) => (
            <PostSkeleton key={i} />
          ))}
        </div>
      )}

      {/* 無限スクロールトリガー */}
      <div ref={lastElementRef} className="h-4" />

      {/* すべて読み込み済み */}
      {!hasMore && dateGroups.length > 0 && (
        <p className="text-center text-sm text-[hsl(var(--muted-foreground))] py-8">
          すべての投稿を表示しました
        </p>
      )}

      {/* 空状態 */}
      {!isLoading && dateGroups.length === 0 && (
        <EmptyState
          icon={FileText}
          title="この日の投稿はありません"
          description="まだ誰も投稿していません。最初の投稿を作成しましょう！"
        />
      )}
    </div>
  );
}
