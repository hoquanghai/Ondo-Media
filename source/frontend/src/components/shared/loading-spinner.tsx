"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  text?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

export function LoadingSpinner({
  className,
  text = "読み込み中...",
  size = "md",
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-12",
        className,
      )}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <Loader2
        className={cn(
          "animate-spin text-[hsl(var(--primary))]",
          sizeClasses[size],
        )}
      />
      {text && (
        <p className="text-sm text-[hsl(var(--muted-foreground))]">{text}</p>
      )}
    </div>
  );
}
