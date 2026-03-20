"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MessageCircle,
  MoreHorizontal,
  Edit,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/shared/user-avatar";
import { LikeButton } from "./like-button";
import { FileAttachment } from "./file-attachment";
import { CommentSection } from "./comment-section";
import { usePostStore } from "@/stores/post-store";
import { useAuthStore } from "@/stores/auth-store";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Post } from "@/types/post";

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const user = useAuthStore((s) => s.user);
  const { deletePost } = usePostStore();
  const isOwnPost = user?.shainBangou === post.author.shainBangou;
  const timeAgo = formatRelativeTime(post.createdAt);

  const handleDelete = async () => {
    try {
      await deletePost(post.id);
    } finally {
      setShowDeleteDialog(false);
    }
  };

  // Content is long if more than 5 lines or more than 300 chars
  const isLongContent = post.content.length > 300 || post.content.split("\n").length > 5;

  return (
    <>
      <Card className="mb-3">
        <CardContent className="pt-4">
          {/* Author */}
          <div className="flex items-start gap-3">
            <Link href={`/profile/${post.author.shainBangou}`}>
              <UserAvatar
                shainName={post.author.shainName}
                avatar={post.author.avatar}
                snsAvatarUrl={post.author.snsAvatarUrl}
                size="md"
              />
            </Link>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/profile/${post.author.shainBangou}`}
                    className="font-medium text-sm hover:underline"
                  >
                    {post.author.shainName}
                  </Link>
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    {post.author.shainGroup}
                  </span>
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    {timeAgo}
                  </span>
                </div>

                {/* More menu (own posts only) */}
                {isOwnPost && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        編集
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-[hsl(var(--destructive))]"
                        onClick={() => setShowDeleteDialog(true)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        削除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Content */}
              <div className="mt-2">
                <p
                  className={cn(
                    "text-sm whitespace-pre-wrap",
                    isLongContent && !isExpanded && "line-clamp-5",
                  )}
                >
                  {post.content}
                </p>
                {isLongContent && !isExpanded && (
                  <button
                    className="text-sm text-[hsl(var(--primary))] hover:underline mt-1"
                    onClick={() => setIsExpanded(true)}
                  >
                    続きを読む
                  </button>
                )}
              </div>

              {/* Attachments */}
              {post.files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {post.files.map((file) => (
                    <FileAttachment key={file.id} file={file} />
                  ))}
                </div>
              )}

              {/* Engagement stats */}
              {(post.likeCount > 0 || post.commentCount > 0) && (
                <div className="mt-3 flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]">
                  {post.likeCount > 0 && (
                    <div className="flex items-center gap-1">
                      {/* Small avatar list of likers */}
                      <div className="flex -space-x-1">
                        {post.likes.slice(0, 3).map((like) => (
                          <UserAvatar
                            key={like.userId}
                            shainName={like.user.shainName}
                            avatar={like.user.avatar}
                            snsAvatarUrl={like.user.snsAvatarUrl}
                            size="sm"
                            className="h-5 w-5 border-2 border-[hsl(var(--card))]"
                          />
                        ))}
                      </div>
                      <span>{post.likeCount}件の反応</span>
                    </div>
                  )}
                  {post.commentCount > 0 && (
                    <button
                      className="hover:underline"
                      onClick={() => setShowComments(!showComments)}
                    >
                      {post.commentCount}件のコメント
                    </button>
                  )}
                </div>
              )}

              {/* Action bar */}
              <div className="mt-2 flex items-center gap-2 border-t border-[hsl(var(--border))] pt-2">
                <LikeButton
                  postId={post.id}
                  isLiked={post.isLikedByMe}
                  likeCount={post.likeCount}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[hsl(var(--muted-foreground))] gap-1"
                  onClick={() => setShowComments(!showComments)}
                >
                  <MessageCircle className="h-4 w-4" />
                  コメント
                  {post.commentCount > 0 && (
                    <span className="text-xs">({post.commentCount})</span>
                  )}
                </Button>
              </div>

              {/* Comments */}
              {showComments && <CommentSection postId={post.id} />}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>投稿を削除しますか？</DialogTitle>
            <DialogDescription>
              この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
