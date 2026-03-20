"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import {
  FileText,
  CalendarDays,
  Flame,
  Trophy,
  Heart,
  MessageCircle,
} from "lucide-react";
import { useProfileStore } from "@/stores/profile-store";
import { StatCard } from "@/components/my-page/stat-card";
import { PostCard } from "@/components/post/post-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const {
    profile,
    stats,
    posts,
    isLoading,
    hasMorePosts,
    postsPage,
    fetchUserProfile,
    fetchUserStats,
    fetchUserPosts,
  } = useProfileStore();

  useEffect(() => {
    fetchUserProfile(id);
    fetchUserStats(id);
    fetchUserPosts(id);
  }, [id, fetchUserProfile, fetchUserStats, fetchUserPosts]);

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-24 w-24 rounded-full mx-auto" />
        <Skeleton className="h-6 w-48 mx-auto" />
      </div>
    );
  }

  const avatarSrc = profile.snsAvatarUrl || profile.avatar || undefined;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Profile (read-only) */}
      <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 mb-8">
        <Avatar className="h-24 w-24">
          <AvatarImage src={avatarSrc} />
          <AvatarFallback className="text-2xl bg-gradient-to-br from-[#1e3a8a] to-[#3b82f6] text-white">
            {profile.shainName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="text-center sm:text-left">
          <h2 className="text-xl font-bold">{profile.shainName}</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {profile.shainGroup} ・ {profile.shainYaku}
          </p>
          {(profile.snsBio || profile.bio) && (
            <p className="text-sm mt-2">{profile.snsBio || profile.bio}</p>
          )}
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          <StatCard
            label="総投稿数"
            value={stats.totalPosts}
            icon={FileText}
          />
          <StatCard
            label="今月の投稿"
            value={stats.postsThisMonth}
            icon={CalendarDays}
          />
          <StatCard
            label="連続投稿日数"
            value={stats.currentStreak}
            icon={Flame}
            color="text-orange-500"
          />
          <StatCard
            label="最長連続日数"
            value={stats.longestStreak}
            icon={Trophy}
            color="text-yellow-500"
          />
          <StatCard
            label="受け取ったいいね"
            value={stats.likesReceived}
            icon={Heart}
            color="text-red-500"
          />
          <StatCard
            label="受け取ったコメント"
            value={stats.commentsReceived}
            icon={MessageCircle}
            color="text-blue-500"
          />
        </div>
      )}

      <Separator className="my-6" />

      <h3 className="text-base font-bold mb-3">投稿履歴</h3>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {hasMorePosts && !isLoading && (
        <div className="flex justify-center py-4">
          <Button
            variant="outline"
            onClick={() => fetchUserPosts(id, postsPage + 1)}
          >
            もっと読み込む
          </Button>
        </div>
      )}

      {!isLoading && posts.length === 0 && (
        <p className="text-center text-sm text-[hsl(var(--muted-foreground))] py-8">
          まだ投稿がありません
        </p>
      )}
    </div>
  );
}
