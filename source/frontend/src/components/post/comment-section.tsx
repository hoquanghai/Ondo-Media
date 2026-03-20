"use client";

import { useState, useEffect } from "react";
import { Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/shared/user-avatar";
import { usePostStore } from "@/stores/post-store";
import { useAuthStore } from "@/stores/auth-store";
import { formatRelativeTime } from "@/lib/utils";
import type { Comment } from "@/types/post";

interface CommentSectionProps {
  postId: string;
}

export function CommentSection({ postId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const { fetchComments, addComment } = usePostStore();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    let cancelled = false;
    fetchComments(postId, 1).then((data) => {
      if (!cancelled) {
        setComments(data);
        setIsLoading(false);
        // If we got a full page, there might be more
        setHasMoreComments(data.length >= 20);
      }
    }).catch(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [postId, fetchComments]);

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    const data = await fetchComments(postId, nextPage);
    setComments((prev) => [...prev, ...data]);
    setPage(nextPage);
    setHasMoreComments(data.length >= 20);
  };

  const handleSubmit = async () => {
    if (!newComment.trim() || isSending) return;
    setIsSending(true);
    try {
      const comment = await addComment(postId, newComment);
      setComments((prev) => [comment, ...prev]);
      setNewComment("");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mt-3 space-y-3 border-t border-[hsl(var(--border))] pt-3">
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
    <div className="mt-3 space-y-3 border-t border-[hsl(var(--border))] pt-3">
      {/* 新規コメント入力 */}
      <div className="flex gap-2">
        <UserAvatar
          shainName={user?.shainName ?? ""}
          avatar={user?.avatar}
          size="sm"
        />
        <Input
          placeholder="コメントを入力..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          className="text-sm"
        />
        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={!newComment.trim() || isSending}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* コメント一覧 */}
      {comments.map((comment) => (
        <div key={comment.id} className="flex gap-2">
          <UserAvatar
            shainName={comment.author.shainName}
            avatar={comment.author.avatar}
            snsAvatarUrl={comment.author.snsAvatarUrl}
            size="sm"
          />
          <div className="flex-1 bg-[hsl(var(--muted))] rounded-lg p-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">
                {comment.author.shainName}
              </span>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                {formatRelativeTime(comment.createdAt)}
              </span>
            </div>
            <p className="text-sm mt-0.5">{comment.content}</p>
          </div>
        </div>
      ))}

      {/* さらに表示 */}
      {hasMoreComments && (
        <button
          className="text-sm text-[hsl(var(--primary))] hover:underline"
          onClick={handleLoadMore}
        >
          コメントをさらに表示
        </button>
      )}

      {comments.length === 0 && (
        <p className="text-xs text-[hsl(var(--muted-foreground))] text-center py-2">
          コメントはありません
        </p>
      )}
    </div>
  );
}
