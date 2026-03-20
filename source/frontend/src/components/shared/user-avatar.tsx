"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type AvatarSize = "sm" | "md" | "lg" | "xl";

interface UserAvatarProps {
  shainName: string;
  avatar?: string | null;
  snsAvatarUrl?: string | null;
  size?: AvatarSize;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
};

const textSizeClasses: Record<AvatarSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
};

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}

export function UserAvatar({
  shainName,
  avatar,
  snsAvatarUrl,
  size = "md",
  className,
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const initials = getInitials(shainName);
  const imageUrl = snsAvatarUrl || avatar || null;
  const showImage = imageUrl && !imgError;

  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden flex-shrink-0",
        sizeClasses[size],
        !showImage && "bg-gradient-to-br from-[#1e3a8a] to-[#3b82f6]",
        className,
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={shainName}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className={cn(
            "h-full w-full flex items-center justify-center bg-gradient-to-br from-[#1e3a8a] to-[#3b82f6] text-white font-bold",
            textSizeClasses[size],
          )}
        >
          {initials}
        </div>
      )}
    </div>
  );
}
