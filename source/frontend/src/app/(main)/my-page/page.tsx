"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  CalendarDays,
  Flame,
  Trophy,
  Heart,
  MessageCircle,
  CalendarX,
} from "lucide-react";
import { useProfileStore } from "@/stores/profile-store";
import { ProfileEditor } from "@/components/my-page/profile-editor";
import { StatCard } from "@/components/my-page/stat-card";
import { PostCard } from "@/components/post/post-card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MyPage() {
  const {
    profile,
    stats,
    posts,
    isLoading,
    hasMorePosts,
    postsPage,
    fetchMyProfile,
    fetchMyStats,
    fetchMyPosts,
  } = useProfileStore();

  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    fetchMyProfile();
    fetchMyStats();
    fetchMyPosts();
  }, [fetchMyProfile, fetchMyStats, fetchMyPosts]);

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-24 w-24 rounded-full mx-auto" />
        <Skeleton className="h-6 w-48 mx-auto" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Profile Section */}
      <div className="mb-8">
        <ProfileEditor profile={profile} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="profile">プロフィール</TabsTrigger>
          <TabsTrigger value="posts">投稿履歴</TabsTrigger>
          <TabsTrigger value="stats">統計</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          {/* Statistics overview */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                label="受け取ったいいね"
                value={stats.likesReceived}
                icon={Heart}
                color="text-red-500"
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="posts">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}

          {isLoading && (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          )}

          {hasMorePosts && !isLoading && (
            <div className="flex justify-center py-4">
              <Button
                variant="outline"
                onClick={() => fetchMyPosts(postsPage + 1)}
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
        </TabsContent>

        <TabsContent value="stats">
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
              <StatCard
                label="今月の未投稿日"
                value={stats.missedDaysThisMonth}
                icon={CalendarX}
                color={
                  stats.missedDaysThisMonth > 0
                    ? "text-red-500"
                    : "text-gray-400"
                }
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
