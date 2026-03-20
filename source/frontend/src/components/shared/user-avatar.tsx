"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  // For Japanese names, take first character
  // For Western names, take first letter of first and last name
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
  const initials = getInitials(shainName);
  const imageUrl = snsAvatarUrl || avatar || null;

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {imageUrl && (
        <AvatarImage src={imageUrl} alt={shainName} />
      )}
      <AvatarFallback
        className={cn(
          "bg-gradient-to-br from-[#1e3a8a] to-[#3b82f6] text-white font-bold",
          textSizeClasses[size],
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
