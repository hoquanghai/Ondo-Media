"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  FileText,
  CalendarDays,
  Flame,
  Trophy,
  Heart,
  MessageCircle,
  Mail,
  Building2,
  Briefcase,
} from "lucide-react";
import { useProfileStore } from "@/stores/profile-store";
import { StatCard } from "@/components/my-page/stat-card";
import { PostCard } from "@/components/post/post-card";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  const [activeTab, setActiveTab] = useState("posts");

  useEffect(() => {
    fetchUserProfile(id);
    fetchUserStats(id);
    fetchUserPosts(id);
  }, [id, fetchUserProfile, fetchUserStats, fetchUserPosts]);

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto">
        <Skeleton className="h-[200px] w-full rounded-b-xl" />
        <div className="px-6">
          <div className="relative -mt-16 flex items-end gap-4">
            <Skeleton className="h-32 w-32 rounded-full" />
            <div className="space-y-2 pb-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Cover Photo Area */}
      <div className="relative h-[150px] sm:h-[200px] bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6] rounded-b-xl" />

      {/* Avatar + Name */}
      <div className="px-4 sm:px-6">
        <div className="relative flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-5">
          {/* Avatar overlapping cover */}
          <div className="relative -mt-16 ml-2 sm:ml-0">
            <div className="w-32 h-32 rounded-full border-4 border-white overflow-hidden shadow-lg bg-white">
              <UserAvatar
                shainName={profile.shainName}
                avatar={profile.avatar}
                snsAvatarUrl={profile.snsAvatarUrl}
                size="xl"
                className="w-full h-full"
              />
            </div>
          </div>

          {/* Name & info */}
          <div className="flex-1 pb-2 sm:pb-3">
            <h1 className="text-2xl font-bold text-gray-900">{profile.shainName}</h1>
            <p className="text-sm text-gray-500">
              {profile.shainGroup} ・ {profile.shainYaku}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              社員番号: {profile.lastNumber}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
        <div className="px-4 sm:px-6 border-b border-gray-200">
          <TabsList className="bg-transparent h-auto p-0 gap-0">
            <TabsTrigger
              value="posts"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1e3a8a] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-semibold data-[state=active]:text-[#1e3a8a]"
            >
              投稿
            </TabsTrigger>
            <TabsTrigger
              value="info"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1e3a8a] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-semibold data-[state=active]:text-[#1e3a8a]"
            >
              基本情報
            </TabsTrigger>
            <TabsTrigger
              value="stats"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1e3a8a] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-semibold data-[state=active]:text-[#1e3a8a]"
            >
              統計
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab: 投稿 (Posts) - Two column layout */}
        <TabsContent value="posts" className="mt-0 px-4 sm:px-6 pt-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Left sidebar */}
            <div className="w-full lg:w-[360px] flex-shrink-0 space-y-4">
              {/* 基本情報 Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="font-bold text-gray-900 mb-3">基本情報</h3>
                <div className="space-y-0.5">
                  {profile.email && (
                    <InfoItem icon={Mail} text={profile.email} />
                  )}
                  <InfoItem icon={Building2} text={profile.shainGroup} />
                  <InfoItem icon={Briefcase} text={profile.shainYaku} />
                </div>
              </div>

              {/* 統計 Card */}
              {stats && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <h3 className="font-bold text-gray-900 mb-3">統計</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <MiniStat label="総投稿数" value={stats.totalPosts} />
                    <MiniStat label="今月の投稿" value={stats.postsThisMonth} />
                    <MiniStat
                      label="連続投稿"
                      value={`${stats.currentStreak}日`}
                      highlight={stats.currentStreak >= 3}
                    />
                    <MiniStat label="いいね受取" value={(stats.totalLikesReceived ?? 0).toLocaleString()} />
                    <MiniStat label="コメント受取" value={(stats.totalCommentsReceived ?? 0).toLocaleString()} />
                    <MiniStat label="最長連続" value={`${stats.longestStreak}日`} />
                  </div>
                </div>
              )}

              {/* 自己紹介 Card */}
              {(profile.snsBio || profile.bio) && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <h3 className="font-bold text-gray-900 mb-2">自己紹介</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {profile.snsBio || profile.bio}
                  </p>
                </div>
              )}
            </div>

            {/* Right column - Posts */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 mb-3">投稿履歴</h3>
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
                    onClick={() => fetchUserPosts(id, postsPage + 1)}
                  >
                    もっと読み込む
                  </Button>
                </div>
              )}

              {!isLoading && posts.length === 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">まだ投稿がありません</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tab: 基本情報 (Profile Info) - read only */}
        <TabsContent value="info" className="mt-0 px-4 sm:px-6 pt-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">基本情報</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
              <InfoRow label="氏名" value={profile.shainName} />
              {profile.fullName && profile.fullName !== profile.shainName && (
                <InfoRow label="フルネーム" value={profile.fullName} />
              )}
              <InfoRow label="社員番号" value={String(profile.lastNumber)} />
              <InfoRow label="メール" value={profile.email} />
              <InfoRow label="部署" value={profile.shainGroup} />
              <InfoRow label="役職" value={profile.shainYaku} />
            </div>
          </div>
        </TabsContent>

        {/* Tab: 統計 (Statistics) */}
        <TabsContent value="stats" className="mt-0 px-4 sm:px-6 pt-4">
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
                suffix="日"
              />
              <StatCard
                label="最長連続日数"
                value={stats.longestStreak}
                icon={Trophy}
                color="text-yellow-500"
                suffix="日"
              />
              <StatCard
                label="受け取ったいいね"
                value={stats.totalLikesReceived}
                icon={Heart}
                color="text-red-500"
              />
              <StatCard
                label="受け取ったコメント"
                value={stats.totalCommentsReceived}
                icon={MessageCircle}
                color="text-blue-500"
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ── Helper sub-components (inline) ── */

function InfoItem({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  if (!text) return null;
  return (
    <div className="flex items-center gap-3 py-2">
      <Icon className="h-5 w-5 text-gray-400 flex-shrink-0" />
      <span className="text-sm text-gray-700">{text}</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-900">{value}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="text-center">
      <p className={`text-xl font-bold ${highlight ? "text-orange-500" : "text-gray-900"}`}>
        {value}
        {highlight && " \uD83D\uDD25"}
      </p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
