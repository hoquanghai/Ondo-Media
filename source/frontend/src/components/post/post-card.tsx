"use client";

import { useState, memo } from "react";
import Link from "next/link";
import {
  MessageCircle,
  Share2,
  MoreHorizontal,
  Edit,
  Trash2,
} from "lucide-react";
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
import { MediaGallery } from "./media-gallery";
import { CommentSection } from "./comment-section";
import { usePostStore } from "@/stores/post-store";
import { useAuthStore } from "@/stores/auth-store";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Post } from "@/types/post";

interface PostCardProps {
  post: Post;
}

export const PostCard = memo(function PostCard({ post }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const user = useAuthStore((s) => s.user);
  const { deletePost } = usePostStore();
  const author = post.author ?? { shainBangou: 0, shainName: "不明", shainGroup: "", avatar: null, snsAvatarUrl: null };
  const isOwnPost = user?.shainBangou === author.shainBangou;
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
        {/* Author */}
        <div className="flex items-start gap-3">
          <Link href={`/profile/${author.shainBangou}`}>
            <UserAvatar
              shainName={author.shainName}
              avatar={author.avatar}
              snsAvatarUrl={author.snsAvatarUrl}
              size="lg"
            />
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <Link
                  href={`/profile/${author.shainBangou}`}
                  className="font-semibold text-gray-900 hover:underline"
                >
                  {author.shainName}
                </Link>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm text-gray-500">
                    {author.shainGroup}
                  </span>
                  <span className="text-xs text-gray-400">
                    {timeAgo}
                  </span>
                </div>
              </div>

              {/* More menu */}
              {isOwnPost && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      編集
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600"
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
            <div className="mt-3">
              <p
                className={cn(
                  "text-gray-700 leading-relaxed whitespace-pre-wrap",
                  isLongContent && !isExpanded && "line-clamp-5",
                )}
              >
                {post.content}
              </p>
              {isLongContent && !isExpanded && (
                <button
                  className="text-sm text-[#1e3a8a] hover:underline mt-1"
                  onClick={() => setIsExpanded(true)}
                >
                  続きを読む
                </button>
              )}
            </div>

            {/* Media Gallery (images/videos) */}
            {post.files && post.files.length > 0 && post.files.some(
              (f) => f.fileType === "image" || f.fileType === "video" || f.mimeType?.startsWith("image/") || f.mimeType?.startsWith("video/")
            ) && (
              <MediaGallery files={post.files} />
            )}

            {/* Document Attachments */}
            {post.files && post.files.filter(
              (f) => f.fileType === "document" || (f.fileType !== "image" && f.fileType !== "video" && !f.mimeType?.startsWith("image/") && !f.mimeType?.startsWith("video/"))
            ).length > 0 && (
              <div className="mt-3 space-y-2">
                {post.files
                  .filter((f) => f.fileType === "document" || (f.fileType !== "image" && f.fileType !== "video" && !f.mimeType?.startsWith("image/") && !f.mimeType?.startsWith("video/")))
                  .map((file) => (
                    <FileAttachment key={file.id} file={file} />
                  ))}
              </div>
            )}

            {/* Engagement stats */}
            {(post.likeCount > 0 || post.commentCount > 0) && (
              <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                {post.likeCount > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <span className="flex items-center -space-x-0.5">
                      <span>👍</span>
                      <span>❤️</span>
                      <span>😊</span>
                    </span>
                    <span>{post.likeCount}件の反応</span>
                  </div>
                ) : (
                  <div />
                )}
                {post.commentCount > 0 && (
                  <button
                    className="hover:underline hover:text-gray-700"
                    onClick={() => setShowComments(!showComments)}
                  >
                    {post.commentCount}件のコメント
                  </button>
                )}
              </div>
            )}

            {/* Action bar - 3 equal buttons */}
            <div className="mt-3 flex items-center border-t border-gray-200 pt-3 gap-1">
              <LikeButton
                postId={post.id}
                isLiked={post.isLikedByMe}
                likeCount={post.likeCount}
                myReactionType={post.myReactionType}
              />
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 justify-center gap-1.5 text-gray-600 hover:bg-gray-50"
                onClick={() => setShowComments(!showComments)}
              >
                <MessageCircle className="h-4 w-4" />
                コメント
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 justify-center gap-1.5 text-gray-600 hover:bg-gray-50"
              >
                <Share2 className="h-4 w-4" />
                シェア
              </Button>
            </div>

            {/* Comments */}
            {showComments && <CommentSection postId={post.id} />}
          </div>
        </div>
      </div>

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
});
