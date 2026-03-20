"use client";

import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePostStore } from "@/stores/post-store";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  postId: string;
  isLiked: boolean;
  likeCount: number;
}

export function LikeButton({ postId, isLiked, likeCount }: LikeButtonProps) {
  const { toggleLike } = usePostStore();

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "gap-1",
        isLiked ? "text-red-500 hover:text-red-600" : "text-[hsl(var(--muted-foreground))]",
      )}
      onClick={() => toggleLike(postId)}
    >
      <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
      いいね
      {likeCount > 0 && (
        <span className="text-xs">({likeCount})</span>
      )}
    </Button>
  );
}
