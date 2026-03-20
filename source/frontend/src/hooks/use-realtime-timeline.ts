"use client";

import { useEffect } from "react";
import { getSocket } from "@/lib/socket";
import { usePostStore } from "@/stores/post-store";
import { useAuthStore } from "@/stores/auth-store";

export function useRealtimeTimeline() {
  const currentUser = useAuthStore((s) => s.user);
  const currentDate = usePostStore((s) => s.currentDate);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handlePostCreated = (data: {
      post: any;
      authorId: number;
    }) => {
      // Skip own posts (already added via optimistic UI)
      if (data.authorId === currentUser?.shainBangou) return;

      const post = data.post;
      if (post?.postDate === currentDate) {
        usePostStore.getState().prependNewPost(post);
      } else {
        usePostStore.getState().setHasNewPosts(true);
      }
    };

    const handlePostLiked = (data: {
      postId: string;
      likerId: number;
      likeCount: number;
      reactionType: string;
    }) => {
      // Skip own likes (already updated via optimistic UI)
      if (data.likerId === currentUser?.shainBangou) return;
      usePostStore.getState().handleRealtimeLike(data.postId, data.likeCount);
    };

    const handleCommentCreated = (data: {
      postId: string;
      authorId: number;
      commentCount: number;
      comment: any;
    }) => {
      // Skip own comments (already updated via optimistic UI)
      if (data.authorId === currentUser?.shainBangou) return;
      usePostStore
        .getState()
        .handleRealtimeComment(data.postId, data.commentCount);
    };

    socket.on("timeline:post-created", handlePostCreated);
    socket.on("timeline:post-liked", handlePostLiked);
    socket.on("timeline:comment-created", handleCommentCreated);

    return () => {
      socket.off("timeline:post-created", handlePostCreated);
      socket.off("timeline:post-liked", handlePostLiked);
      socket.off("timeline:comment-created", handleCommentCreated);
    };
  }, [currentUser?.shainBangou, currentDate]);
}
