"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePostStore } from "@/stores/post-store";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  postId: string;
  isLiked: boolean;
  likeCount: number;
  myReactionType?: string | null;
}

const REACTIONS = [
  { emoji: "👍", label: "いいね" },
  { emoji: "❤️", label: "大好き" },
  { emoji: "😊", label: "嬉しい" },
  { emoji: "😮", label: "すごい" },
  { emoji: "😢", label: "悲しい" },
  { emoji: "😡", label: "ひどい" },
];

const REACTION_TO_EMOJI: Record<string, string> = {
  like: "👍",
  love: "❤️",
  happy: "😊",
  wow: "😮",
  sad: "😢",
  angry: "😡",
};

const EMOJI_TO_REACTION: Record<string, string> = {
  "👍": "like",
  "❤️": "love",
  "😊": "happy",
  "😮": "wow",
  "😢": "sad",
  "😡": "angry",
};

export function LikeButton({ postId, isLiked, likeCount, myReactionType }: LikeButtonProps) {
  const { toggleLike } = usePostStore();
  const [showReactions, setShowReactions] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(
    isLiked && myReactionType ? (REACTION_TO_EMOJI[myReactionType] ?? "👍") : null,
  );
  const [hoveredEmoji, setHoveredEmoji] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with props from server
  useEffect(() => {
    if (isLiked && myReactionType) {
      setSelectedEmoji(REACTION_TO_EMOJI[myReactionType] ?? "👍");
    } else if (!isLiked) {
      setSelectedEmoji(null);
    }
  }, [isLiked, myReactionType]);

  // Show popup after hovering 500ms
  const handleMouseEnter = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    hoverTimerRef.current = setTimeout(() => {
      setShowReactions(true);
    }, 500);
  }, []);

  // Hide popup after leaving 300ms (gives time to move mouse to popup)
  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    leaveTimerRef.current = setTimeout(() => {
      setShowReactions(false);
      setHoveredEmoji(null);
    }, 300);
  }, []);

  // Click main button: toggle like/unlike
  const handleMainClick = () => {
    if (isLiked) {
      // Unlike
      setSelectedEmoji(null);
      toggleLike(postId);
    } else {
      // Like with default 👍
      setSelectedEmoji("👍");
      toggleLike(postId);
    }
  };

  // Click a specific reaction emoji
  const handleReactionClick = (emoji: string) => {
    if (isLiked && selectedEmoji === emoji) {
      // Same reaction clicked again → unlike
      setSelectedEmoji(null);
      toggleLike(postId);
    } else if (isLiked) {
      // Already liked, change reaction (visual only for now)
      setSelectedEmoji(emoji);
    } else {
      // Not liked yet → like with this emoji
      setSelectedEmoji(emoji);
      toggleLike(postId);
    }
    setShowReactions(false);
  };

  // Display emoji or heart icon
  const displayEmoji = selectedEmoji && isLiked ? selectedEmoji : null;

  return (
    <div
      ref={containerRef}
      className="relative flex-1"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Reaction popup */}
      {showReactions && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30"
          onMouseEnter={() => {
            // Cancel leave timer when hovering popup
            if (leaveTimerRef.current) {
              clearTimeout(leaveTimerRef.current);
              leaveTimerRef.current = null;
            }
          }}
          onMouseLeave={handleMouseLeave}
        >
          <div className="bg-white rounded-full shadow-xl border border-gray-100 px-2 py-1.5 flex items-center gap-0.5 animate-in fade-in zoom-in-95 duration-200">
            {REACTIONS.map((reaction) => (
              <button
                key={reaction.emoji}
                className="relative group/emoji p-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReactionClick(reaction.emoji);
                }}
                onMouseEnter={() => setHoveredEmoji(reaction.emoji)}
                onMouseLeave={() => setHoveredEmoji(null)}
              >
                <span
                  className={cn(
                    "text-2xl block transition-transform duration-150 cursor-pointer",
                    hoveredEmoji === reaction.emoji
                      ? "scale-[1.4] -translate-y-1"
                      : "scale-100 hover:scale-110",
                  )}
                >
                  {reaction.emoji}
                </span>
                {/* Tooltip */}
                {hoveredEmoji === reaction.emoji && (
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap">
                    {reaction.label}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main like button */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "gap-1.5 w-full justify-center transition-colors",
          isLiked
            ? "text-red-500 hover:bg-red-50"
            : "text-gray-600 hover:bg-gray-50",
        )}
        onClick={handleMainClick}
      >
        {displayEmoji ? (
          <span className="text-base">{displayEmoji}</span>
        ) : (
          <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
        )}
        <span className={cn(isLiked && "font-medium")}>
          {isLiked
            ? REACTIONS.find((r) => r.emoji === selectedEmoji)?.label ?? "いいね"
            : "いいね"}
        </span>
        {likeCount > 0 && (
          <span className="text-xs opacity-70">({likeCount})</span>
        )}
      </Button>
    </div>
  );
}
