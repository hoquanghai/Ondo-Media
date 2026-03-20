# Phase 04 — Timeline

## Objectives

- タイムライン (ホームページ) を構築する — 日付グループごとの投稿表示
- 投稿作成フォーム (テキスト・画像・動画・ファイル・絵文字・日付指定) を実装する
- PostCard コンポーネント (著者情報・メディア表示・いいね・コメント) を実装する
- コメント展開・いいねのオプティミスティック UI を実装する
- 日付フィルター・無限スクロール・リアルタイム新着通知バナーを実装する

## Prerequisites

- Phase 01〜03 完了 (セットアップ・認証・レイアウト)
- バックエンド API: `GET /api/posts`, `POST /api/posts`, `POST /api/posts/:id/like`, `POST /api/posts/:id/comments`, `GET /api/posts/:id/comments`

## Tasks

### 1. 投稿関連の型定義

**File: `src/types/post.ts`**

```ts
export interface Post {
  id: string;
  author: {
    id: string;
    display_name: string;
    department: string;
    avatar_url: string | null;
  };
  content: string;
  post_date: string; // "2026-03-19" 投稿対象日
  created_at: string;
  attachments: Attachment[];
  likes: Like[];
  like_count: number;
  comment_count: number;
  is_liked: boolean;
}

export interface Attachment {
  id: string;
  type: "image" | "video" | "file";
  url: string;
  filename: string;
  mime_type: string;
  size: number;
}

export interface Like {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface Comment {
  id: string;
  author: {
    id: string;
    display_name: string;
    department: string;
    avatar_url: string | null;
  };
  content: string;
  created_at: string;
}

export interface PostsResponse {
  posts: Post[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface DateGroup {
  date: string;
  count: number;
  posts: Post[];
}
```

### 2. 投稿ストア (Zustand)

**File: `src/stores/post-store.ts`**

```ts
import { create } from "zustand";
import { api } from "@/lib/api";
import type { Post, PostsResponse, Comment, DateGroup } from "@/types/post";

interface PostState {
  dateGroups: DateGroup[];
  selectedDate: string | null;
  isLoading: boolean;
  hasMore: boolean;
  page: number;
  hasNewPosts: boolean;
}

interface PostActions {
  fetchPosts: (date?: string, page?: number) => Promise<void>;
  loadMore: () => Promise<void>;
  createPost: (data: FormData) => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  addComment: (postId: string, content: string) => Promise<Comment>;
  fetchComments: (postId: string) => Promise<Comment[]>;
  setSelectedDate: (date: string | null) => void;
  setHasNewPosts: (value: boolean) => void;
  prependPost: (post: Post) => void;
}

export const usePostStore = create<PostState & PostActions>((set, get) => ({
  dateGroups: [],
  selectedDate: null,
  isLoading: false,
  hasMore: true,
  page: 1,
  hasNewPosts: false,

  fetchPosts: async (date, page = 1) => {
    set({ isLoading: true });
    const params: Record<string, string> = { page: String(page), per_page: "20" };
    if (date) params.date = date;

    const data = await api.get<PostsResponse>("/posts", params);

    // 日付別にグループ化
    const groupMap = new Map<string, DateGroup>();
    for (const post of data.posts) {
      const d = post.post_date;
      if (!groupMap.has(d)) {
        groupMap.set(d, { date: d, count: 0, posts: [] });
      }
      const group = groupMap.get(d)!;
      group.posts.push(post);
      group.count++;
    }

    const groups = Array.from(groupMap.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    set({
      dateGroups: page === 1 ? groups : [...get().dateGroups, ...groups],
      isLoading: false,
      hasMore: data.has_more,
      page,
    });
  },

  loadMore: async () => {
    const { page, hasMore, isLoading, selectedDate } = get();
    if (!hasMore || isLoading) return;
    await get().fetchPosts(selectedDate ?? undefined, page + 1);
  },

  createPost: async (formData) => {
    const post = await api.request<Post>("/posts", {
      method: "POST",
      body: formData,
      headers: {}, // Content-Type は FormData のため自動設定
    });
    get().prependPost(post);
  },

  toggleLike: async (postId) => {
    // オプティミスティック UI
    set((state) => ({
      dateGroups: state.dateGroups.map((group) => ({
        ...group,
        posts: group.posts.map((post) =>
          post.id === postId
            ? {
                ...post,
                is_liked: !post.is_liked,
                like_count: post.is_liked ? post.like_count - 1 : post.like_count + 1,
              }
            : post
        ),
      })),
    }));

    try {
      await api.post(`/posts/${postId}/like`);
    } catch {
      // ロールバック
      set((state) => ({
        dateGroups: state.dateGroups.map((group) => ({
          ...group,
          posts: group.posts.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  is_liked: !post.is_liked,
                  like_count: post.is_liked ? post.like_count - 1 : post.like_count + 1,
                }
              : post
          ),
        })),
      }));
    }
  },

  addComment: async (postId, content) => {
    const comment = await api.post<Comment>(`/posts/${postId}/comments`, { content });
    set((state) => ({
      dateGroups: state.dateGroups.map((group) => ({
        ...group,
        posts: group.posts.map((post) =>
          post.id === postId
            ? { ...post, comment_count: post.comment_count + 1 }
            : post
        ),
      })),
    }));
    return comment;
  },

  fetchComments: async (postId) => {
    return api.get<Comment[]>(`/posts/${postId}/comments`);
  },

  setSelectedDate: (date) => {
    set({ selectedDate: date, dateGroups: [], page: 1, hasMore: true });
  },

  setHasNewPosts: (value) => set({ hasNewPosts: value }),

  prependPost: (post) => {
    set((state) => {
      const groups = [...state.dateGroups];
      const groupIndex = groups.findIndex((g) => g.date === post.post_date);
      if (groupIndex >= 0) {
        groups[groupIndex] = {
          ...groups[groupIndex],
          posts: [post, ...groups[groupIndex].posts],
          count: groups[groupIndex].count + 1,
        };
      } else {
        groups.unshift({ date: post.post_date, count: 1, posts: [post] });
      }
      return { dateGroups: groups, hasNewPosts: false };
    });
  },
}));
```

### 3. DateGroupHeader コンポーネント

**File: `src/components/timeline/date-group-header.tsx`**

```tsx
"use client";

import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarDays } from "lucide-react";

interface DateGroupHeaderProps {
  date: string;
  count: number;
}

export function DateGroupHeader({ date, count }: DateGroupHeaderProps) {
  const formatted = format(new Date(date), "yyyy/MM/dd (E)", { locale: ja });

  return (
    <div className="flex items-center gap-2 py-3 px-1 sticky top-16 bg-background z-10">
      <CalendarDays className="h-5 w-5 text-primary" />
      <h2 className="text-base font-bold text-foreground">
        {formatted}
      </h2>
      <span className="text-sm text-muted-foreground">
        {count}件
      </span>
    </div>
  );
}
```

### 4. CreatePost コンポーネント

**File: `src/components/timeline/create-post.tsx`**

```tsx
"use client";

import { useState, useRef } from "react";
import { format } from "date-fns";
import { Image, Video, Paperclip, Smile, CalendarDays, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { usePostStore } from "@/stores/post-store";
import { useAuthStore } from "@/stores/auth-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function CreatePost() {
  const [content, setContent] = useState("");
  const [postDate, setPostDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { createPost } = usePostStore();
  const user = useAuthStore((s) => s.user);

  const handleFileSelect = (accept: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
  };

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...selected]);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim() && files.length === 0) return;
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("content", content);
    formData.append("post_date", format(postDate, "yyyy-MM-dd"));
    files.forEach((file) => formData.append("attachments", file));

    try {
      await createPost(formData);
      setContent("");
      setFiles([]);
      setPostDate(new Date());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-primary/20 text-primary">
              {user?.display_name?.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-3">
            <Textarea
              placeholder="今日の業務内容を共有しましょう..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className="resize-none"
            />

            {/* 添付ファイルプレビュー */}
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm">
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 日付選択カレンダー */}
            {showCalendar && (
              <div className="border rounded-lg p-2 w-fit">
                <Calendar
                  mode="single"
                  selected={postDate}
                  onSelect={(date) => {
                    if (date) setPostDate(date);
                    setShowCalendar(false);
                  }}
                />
              </div>
            )}

            {/* アクションバー */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => handleFileSelect("image/*")} title="画像">
                  <Image className="h-5 w-5 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleFileSelect("video/*")} title="動画">
                  <Video className="h-5 w-5 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleFileSelect("*/*")} title="ファイル">
                  <Paperclip className="h-5 w-5 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" title="絵文字">
                  <Smile className="h-5 w-5 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="text-muted-foreground text-xs gap-1"
                >
                  <CalendarDays className="h-4 w-4" />
                  {format(postDate, "MM/dd")}
                </Button>
              </div>

              <Button onClick={handleSubmit} disabled={isSubmitting || (!content.trim() && files.length === 0)}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                投稿
              </Button>
            </div>
          </div>
        </div>

        <input ref={fileInputRef} type="file" multiple hidden onChange={handleFilesChange} />
      </CardContent>
    </Card>
  );
}
```

### 5. PostCard コンポーネント

**File: `src/components/timeline/post-card.tsx`**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LikeButton } from "./like-button";
import { FileAttachment } from "./file-attachment";
import { CommentSection } from "./comment-section";
import type { Post } from "@/types/post";

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: ja,
  });

  return (
    <Card className="mb-3">
      <CardContent className="pt-4">
        {/* Author */}
        <div className="flex items-start gap-3">
          <Link href={`/profile/${post.author.id}`}>
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.author.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary/20 text-primary">
                {post.author.display_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/profile/${post.author.id}`}
                className="font-medium text-sm hover:underline"
              >
                {post.author.display_name}
              </Link>
              <span className="text-xs text-muted-foreground">
                {post.author.department}
              </span>
              <span className="text-xs text-muted-foreground">
                {timeAgo}
              </span>
            </div>

            {/* Content */}
            <p className="mt-2 text-sm whitespace-pre-wrap">{post.content}</p>

            {/* Attachments */}
            {post.attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {post.attachments.map((attachment) => (
                  <FileAttachment key={attachment.id} attachment={attachment} />
                ))}
              </div>
            )}

            {/* Likes summary */}
            {post.like_count > 0 && (
              <div className="mt-3 flex items-center gap-1">
                <div className="flex -space-x-1">
                  {post.likes.slice(0, 3).map((like) => (
                    <Avatar key={like.user_id} className="h-5 w-5 border-2 border-surface">
                      <AvatarImage src={like.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                        {like.display_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {post.like_count}人がいいね
                </span>
              </div>
            )}

            {/* Action bar */}
            <div className="mt-2 flex items-center gap-2 border-t pt-2">
              <LikeButton postId={post.id} isLiked={post.is_liked} />
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground gap-1"
                onClick={() => setShowComments(!showComments)}
              >
                <MessageCircle className="h-4 w-4" />
                コメント
                {post.comment_count > 0 && (
                  <span className="text-xs">({post.comment_count})</span>
                )}
              </Button>
            </div>

            {/* Comments */}
            {showComments && <CommentSection postId={post.id} />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 6. LikeButton コンポーネント

**File: `src/components/timeline/like-button.tsx`**

```tsx
"use client";

import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePostStore } from "@/stores/post-store";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  postId: string;
  isLiked: boolean;
}

export function LikeButton({ postId, isLiked }: LikeButtonProps) {
  const { toggleLike } = usePostStore();

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("gap-1", isLiked ? "text-red-500" : "text-muted-foreground")}
      onClick={() => toggleLike(postId)}
    >
      <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
      いいね
    </Button>
  );
}
```

### 7. FileAttachment コンポーネント

**File: `src/components/timeline/file-attachment.tsx`**

```tsx
"use client";

import { FileDown } from "lucide-react";
import type { Attachment } from "@/types/post";

interface FileAttachmentProps {
  attachment: Attachment;
}

export function FileAttachment({ attachment }: FileAttachmentProps) {
  if (attachment.type === "image") {
    return (
      <img
        src={attachment.url}
        alt={attachment.filename}
        className="rounded-lg max-h-96 object-cover w-full"
        loading="lazy"
      />
    );
  }

  if (attachment.type === "video") {
    return (
      <video
        src={attachment.url}
        controls
        className="rounded-lg max-h-96 w-full"
        preload="metadata"
      />
    );
  }

  // File download link
  return (
    <a
      href={attachment.url}
      download={attachment.filename}
      className="flex items-center gap-2 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
    >
      <FileDown className="h-5 w-5 text-primary" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{attachment.filename}</p>
        <p className="text-xs text-muted-foreground">
          {(attachment.size / 1024).toFixed(1)} KB
        </p>
      </div>
    </a>
  );
}
```

### 8. CommentSection コンポーネント

**File: `src/components/timeline/comment-section.tsx`**

```tsx
"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePostStore } from "@/stores/post-store";
import type { Comment } from "@/types/post";

interface CommentSectionProps {
  postId: string;
}

export function CommentSection({ postId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const { fetchComments, addComment } = usePostStore();

  useEffect(() => {
    fetchComments(postId).then((data) => {
      setComments(data);
      setIsLoading(false);
    });
  }, [postId, fetchComments]);

  const handleSubmit = async () => {
    if (!newComment.trim() || isSending) return;
    setIsSending(true);
    try {
      const comment = await addComment(postId, newComment);
      setComments((prev) => [...prev, comment]);
      setNewComment("");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mt-3 space-y-3 border-t pt-3">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-12 flex-1 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3 border-t pt-3">
      {comments.map((comment) => (
        <div key={comment.id} className="flex gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={comment.author.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs bg-primary/20 text-primary">
              {comment.author.display_name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 bg-muted rounded-lg p-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">{comment.author.display_name}</span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(comment.created_at), "MM/dd HH:mm", { locale: ja })}
              </span>
            </div>
            <p className="text-sm mt-0.5">{comment.content}</p>
          </div>
        </div>
      ))}

      {/* Add comment */}
      <div className="flex gap-2">
        <Input
          placeholder="コメントを入力..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
          className="text-sm"
        />
        <Button size="icon" onClick={handleSubmit} disabled={!newComment.trim() || isSending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

### 9. タイムラインページ (ホーム)

**File: `src/app/(main)/page.tsx`**

```tsx
"use client";

import { useEffect, useCallback, useRef } from "react";
import { usePostStore } from "@/stores/post-store";
import { CreatePost } from "@/components/timeline/create-post";
import { DateGroupHeader } from "@/components/timeline/date-group-header";
import { PostCard } from "@/components/timeline/post-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { RefreshCw, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

export default function TimelinePage() {
  const {
    dateGroups,
    isLoading,
    hasMore,
    hasNewPosts,
    selectedDate,
    fetchPosts,
    loadMore,
    setSelectedDate,
    setHasNewPosts,
  } = usePostStore();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPosts(selectedDate ?? undefined);
  }, [selectedDate, fetchPosts]);

  // Infinite scroll
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
    [isLoading, hasMore, loadMore]
  );

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(format(date, "yyyy-MM-dd"));
    } else {
      setSelectedDate(null);
    }
    setShowDatePicker(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* New posts banner */}
      {hasNewPosts && (
        <Button
          variant="outline"
          className="w-full mb-4 text-primary border-primary/30 bg-primary/5"
          onClick={() => {
            fetchPosts(selectedDate ?? undefined);
            setHasNewPosts(false);
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          新しい投稿があります
        </Button>
      )}

      {/* Date filter */}
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
            {selectedDate ?? "日付を選択"}
          </Button>
          {showDatePicker && (
            <div className="absolute right-0 top-full mt-1 border rounded-lg bg-surface shadow-lg z-20">
              <Calendar
                mode="single"
                selected={selectedDate ? new Date(selectedDate) : undefined}
                onSelect={handleDateSelect}
              />
              {selectedDate && (
                <div className="p-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => handleDateSelect(undefined)}
                  >
                    フィルター解除
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create post */}
      <CreatePost />

      {/* Posts grouped by date */}
      {dateGroups.map((group) => (
        <div key={group.date}>
          <DateGroupHeader date={group.date} count={group.count} />
          {group.posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ))}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-4 mt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3 p-4 border rounded-lg">
              <div className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Infinite scroll trigger */}
      <div ref={lastElementRef} className="h-4" />

      {!hasMore && dateGroups.length > 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          すべての投稿を表示しました
        </p>
      )}

      {!isLoading && dateGroups.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          投稿がありません
        </p>
      )}
    </div>
  );
}
```

## Verification Checklist

- [ ] タイムラインページが `/` に表示される
- [ ] 投稿が日付グループ別に表示される (例: "2026/03/19 (木) 100件")
- [ ] CreatePost: テキスト入力・画像/動画/ファイル添付・日付選択・投稿ができる
- [ ] CreatePost: 過去の日付を指定して投稿できる
- [ ] PostCard: 著者情報 (アバター・名前・部署・時間) が表示される
- [ ] PostCard: 画像がインライン表示、動画がインライン再生、ファイルがダウンロードリンク
- [ ] PostCard: いいねアバター + カウントが表示される
- [ ] LikeButton: オプティミスティック UI でいいね切り替え (ハート赤色/灰色)
- [ ] CommentSection: コメント展開・一覧表示・新規コメント追加
- [ ] 日付フィルター: カレンダーで特定日を選択してフィルタリング
- [ ] 無限スクロール: 画面下部到達で追加読み込み
- [ ] 「新しい投稿があります」バナーが表示される
- [ ] すべてのテキストが日本語
- [ ] TypeScript エラーがない

## Files Created / Modified

| ファイル | 操作 | 概要 |
|---|---|---|
| `src/types/post.ts` | 作成 | 投稿・添付・コメント・いいねの型定義 |
| `src/stores/post-store.ts` | 作成 | Zustand 投稿ストア |
| `src/components/timeline/date-group-header.tsx` | 作成 | 日付グループヘッダー |
| `src/components/timeline/create-post.tsx` | 作成 | 投稿作成フォーム |
| `src/components/timeline/post-card.tsx` | 作成 | 投稿カード |
| `src/components/timeline/like-button.tsx` | 作成 | いいねボタン (オプティミスティック UI) |
| `src/components/timeline/file-attachment.tsx` | 作成 | ファイル添付表示 (画像/動画/ファイル) |
| `src/components/timeline/comment-section.tsx` | 作成 | コメントセクション |
| `src/app/(main)/page.tsx` | 作成 | タイムラインページ (ホーム) |
