# Phase 07 — My Page

## Objectives

- マイページ (プロフィール・統計情報・投稿履歴) を構築する
- プロフィール編集機能 (アバター・名前・自己紹介) を実装する
- 統計カード (投稿数・連続投稿日数・いいね・コメント等) を実装する
- 他ユーザーのプロフィールページを構築する

## Prerequisites

- Phase 01〜04 完了
- バックエンド API: `GET /api/users/me/stats`, `GET /api/users/me/posts`, `PATCH /api/users/me/profile`, `GET /api/users/:id`, `GET /api/users/:id/stats`, `GET /api/users/:id/posts`

## Tasks

### 1. マイページ関連の型定義

**File: `src/types/profile.ts`**

```ts
export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  email: string;
  department: string;
  position: string;
  bio: string;
  avatar_url: string | null;
  joined_at: string;
}

export interface UserStats {
  total_posts: number;
  posts_this_month: number;
  current_streak: number;
  longest_streak: number;
  likes_received: number;
  comments_received: number;
  missed_days_this_month: number;
}

export interface UpdateProfileRequest {
  display_name?: string;
  bio?: string;
  avatar?: File;
}
```

### 2. プロフィールストア (Zustand)

**File: `src/stores/profile-store.ts`**

```ts
import { create } from "zustand";
import { api } from "@/lib/api";
import type { UserProfile, UserStats, UpdateProfileRequest } from "@/types/profile";
import type { Post, PostsResponse } from "@/types/post";

interface ProfileState {
  profile: UserProfile | null;
  stats: UserStats | null;
  posts: Post[];
  isLoading: boolean;
  hasMorePosts: boolean;
  postsPage: number;
}

interface ProfileActions {
  fetchMyProfile: () => Promise<void>;
  fetchMyStats: () => Promise<void>;
  fetchMyPosts: (page?: number) => Promise<void>;
  updateProfile: (data: UpdateProfileRequest) => Promise<void>;
  fetchUserProfile: (userId: string) => Promise<void>;
  fetchUserStats: (userId: string) => Promise<void>;
  fetchUserPosts: (userId: string, page?: number) => Promise<void>;
}

export const useProfileStore = create<ProfileState & ProfileActions>((set, get) => ({
  profile: null,
  stats: null,
  posts: [],
  isLoading: false,
  hasMorePosts: true,
  postsPage: 1,

  fetchMyProfile: async () => {
    const profile = await api.get<UserProfile>("/users/me/profile");
    set({ profile });
  },

  fetchMyStats: async () => {
    const stats = await api.get<UserStats>("/users/me/stats");
    set({ stats });
  },

  fetchMyPosts: async (page = 1) => {
    set({ isLoading: true });
    const data = await api.get<PostsResponse>("/users/me/posts", {
      page: String(page),
      per_page: "10",
    });
    set({
      posts: page === 1 ? data.posts : [...get().posts, ...data.posts],
      isLoading: false,
      hasMorePosts: data.has_more,
      postsPage: page,
    });
  },

  updateProfile: async (data) => {
    const formData = new FormData();
    if (data.display_name) formData.append("display_name", data.display_name);
    if (data.bio !== undefined) formData.append("bio", data.bio);
    if (data.avatar) formData.append("avatar", data.avatar);

    const profile = await api.request<UserProfile>("/users/me/profile", {
      method: "PATCH",
      body: formData,
      headers: {},
    });
    set({ profile });
  },

  fetchUserProfile: async (userId) => {
    set({ isLoading: true });
    const profile = await api.get<UserProfile>(`/users/${userId}`);
    set({ profile, isLoading: false });
  },

  fetchUserStats: async (userId) => {
    const stats = await api.get<UserStats>(`/users/${userId}/stats`);
    set({ stats });
  },

  fetchUserPosts: async (userId, page = 1) => {
    set({ isLoading: true });
    const data = await api.get<PostsResponse>(`/users/${userId}/posts`, {
      page: String(page),
      per_page: "10",
    });
    set({
      posts: page === 1 ? data.posts : [...get().posts, ...data.posts],
      isLoading: false,
      hasMorePosts: data.has_more,
      postsPage: page,
    });
  },
}));
```

### 3. StatCard コンポーネント

**File: `src/components/my-page/stat-card.tsx`**

```tsx
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
}

export function StatCard({ label, value, icon: Icon, color = "text-primary" }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className={`h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 4. ProfileEditor コンポーネント

**File: `src/components/my-page/profile-editor.tsx`**

```tsx
"use client";

import { useState, useRef } from "react";
import { Camera, Loader2, Check, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useProfileStore } from "@/stores/profile-store";
import type { UserProfile } from "@/types/profile";

interface ProfileEditorProps {
  profile: UserProfile;
}

export function ProfileEditor({ profile }: ProfileEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateProfile } = useProfileStore();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        display_name: displayName,
        bio,
        avatar: avatarFile ?? undefined,
      });
      setIsEditing(false);
      setAvatarPreview(null);
      setAvatarFile(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(profile.display_name);
    setBio(profile.bio);
    setAvatarPreview(null);
    setAvatarFile(null);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col items-center tablet:flex-row tablet:items-start gap-6">
      {/* Avatar */}
      <div className="relative">
        <Avatar className="h-24 w-24">
          <AvatarImage src={avatarPreview ?? profile.avatar_url ?? undefined} />
          <AvatarFallback className="text-2xl bg-primary/20 text-primary">
            {profile.display_name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        {isEditing && (
          <button
            className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center shadow"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="h-4 w-4" />
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleAvatarChange}
        />
      </div>

      {/* Info */}
      <div className="flex-1 text-center tablet:text-left space-y-2 w-full max-w-md">
        {isEditing ? (
          <>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="表示名"
              className="font-bold"
            />
            <p className="text-sm text-muted-foreground">
              {profile.department} ・ {profile.position}
            </p>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="自己紹介を入力..."
              rows={3}
            />
            <div className="flex gap-2 justify-center tablet:justify-start">
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                保存
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" />
                キャンセル
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold">{profile.display_name}</h2>
            <p className="text-sm text-muted-foreground">
              {profile.department} ・ {profile.position}
            </p>
            {profile.bio && <p className="text-sm">{profile.bio}</p>}
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              プロフィールを編集
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
```

### 5. マイページ

**File: `src/app/(main)/my-page/page.tsx`**

```tsx
"use client";

import { useEffect } from "react";
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
import { PostCard } from "@/components/timeline/post-card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

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
        <div className="grid grid-cols-2 tablet:grid-cols-4 gap-3">
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

      {/* Statistics */}
      {stats && (
        <>
          <h3 className="text-base font-bold mb-3">統計情報</h3>
          <div className="grid grid-cols-2 tablet:grid-cols-4 gap-3 mb-8">
            <StatCard label="総投稿数" value={stats.total_posts} icon={FileText} />
            <StatCard label="今月の投稿" value={stats.posts_this_month} icon={CalendarDays} />
            <StatCard label="連続投稿日数" value={stats.current_streak} icon={Flame} color="text-orange-500" />
            <StatCard label="最長連続日数" value={stats.longest_streak} icon={Trophy} color="text-yellow-500" />
            <StatCard label="受け取ったいいね" value={stats.likes_received} icon={Heart} color="text-red-500" />
            <StatCard label="受け取ったコメント" value={stats.comments_received} icon={MessageCircle} color="text-blue-500" />
            <StatCard label="今月の未投稿日" value={stats.missed_days_this_month} icon={CalendarX} color="text-gray-400" />
          </div>
        </>
      )}

      <Separator className="my-6" />

      {/* Post History */}
      <h3 className="text-base font-bold mb-3">投稿履歴</h3>
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
          <Button variant="outline" onClick={() => fetchMyPosts(postsPage + 1)}>
            もっと読み込む
          </Button>
        </div>
      )}

      {!isLoading && posts.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          まだ投稿がありません
        </p>
      )}
    </div>
  );
}
```

### 6. 他ユーザーのプロフィールページ

**File: `src/app/(main)/profile/[id]/page.tsx`**

```tsx
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
import { PostCard } from "@/components/timeline/post-card";
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

  return (
    <div className="max-w-2xl mx-auto">
      {/* Profile (read-only) */}
      <div className="flex flex-col items-center tablet:flex-row tablet:items-start gap-6 mb-8">
        <Avatar className="h-24 w-24">
          <AvatarImage src={profile.avatar_url ?? undefined} />
          <AvatarFallback className="text-2xl bg-primary/20 text-primary">
            {profile.display_name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="text-center tablet:text-left">
          <h2 className="text-xl font-bold">{profile.display_name}</h2>
          <p className="text-sm text-muted-foreground">
            {profile.department} ・ {profile.position}
          </p>
          {profile.bio && <p className="text-sm mt-2">{profile.bio}</p>}
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 tablet:grid-cols-3 gap-3 mb-8">
          <StatCard label="総投稿数" value={stats.total_posts} icon={FileText} />
          <StatCard label="今月の投稿" value={stats.posts_this_month} icon={CalendarDays} />
          <StatCard label="連続投稿日数" value={stats.current_streak} icon={Flame} color="text-orange-500" />
          <StatCard label="最長連続日数" value={stats.longest_streak} icon={Trophy} color="text-yellow-500" />
          <StatCard label="受け取ったいいね" value={stats.likes_received} icon={Heart} color="text-red-500" />
          <StatCard label="受け取ったコメント" value={stats.comments_received} icon={MessageCircle} color="text-blue-500" />
        </div>
      )}

      <Separator className="my-6" />

      <h3 className="text-base font-bold mb-3">投稿履歴</h3>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {hasMorePosts && !isLoading && (
        <div className="flex justify-center py-4">
          <Button variant="outline" onClick={() => fetchUserPosts(id, postsPage + 1)}>
            もっと読み込む
          </Button>
        </div>
      )}

      {!isLoading && posts.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          まだ投稿がありません
        </p>
      )}
    </div>
  );
}
```

## Verification Checklist

- [ ] `/my-page` にプロフィール (アバター・名前・部署・役職・自己紹介) が表示される
- [ ] プロフィール編集: アバター変更・表示名変更・自己紹介変更が動作する
- [ ] 統計カード 7 種が正しく表示される:
  - [ ] 総投稿数
  - [ ] 今月の投稿
  - [ ] 連続投稿日数
  - [ ] 最長連続日数
  - [ ] 受け取ったいいね
  - [ ] 受け取ったコメント
  - [ ] 今月の未投稿日
- [ ] 投稿履歴が表示され、「もっと読み込む」で追加読み込みされる
- [ ] `/profile/:id` で他ユーザーのプロフィールが表示される (編集不可)
- [ ] レスポンシブ: 統計カードがモバイルで 2 列、タブレット以上で 3〜4 列
- [ ] すべてのテキストが日本語
- [ ] TypeScript エラーがない

## Files Created / Modified

| ファイル | 操作 | 概要 |
|---|---|---|
| `src/types/profile.ts` | 作成 | プロフィール・統計の型定義 |
| `src/stores/profile-store.ts` | 作成 | Zustand プロフィールストア |
| `src/components/my-page/stat-card.tsx` | 作成 | 統計カードコンポーネント |
| `src/components/my-page/profile-editor.tsx` | 作成 | プロフィール編集コンポーネント |
| `src/app/(main)/my-page/page.tsx` | 作成 | マイページ |
| `src/app/(main)/profile/[id]/page.tsx` | 作成 | 他ユーザープロフィールページ |
