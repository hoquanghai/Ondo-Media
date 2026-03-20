import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actionLabel?: string;
  actionIcon?: LucideIcon;
  onAction?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  actionLabel,
  actionIcon: ActionIcon,
  onAction,
  className,
  children,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-6",
        className,
      )}
    >
      <div>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            {description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 mt-3 sm:mt-0">
        {actionLabel && onAction && (
          <Button onClick={onAction}>
            {ActionIcon && <ActionIcon className="h-4 w-4 mr-2" />}
            {actionLabel}
          </Button>
        )}
        {children}
      </div>
    </div>
  );
}
