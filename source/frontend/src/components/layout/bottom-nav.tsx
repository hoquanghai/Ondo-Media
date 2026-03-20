"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Bell, PlusCircle, User, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavItem {
  href?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: string;
}

const navItems: BottomNavItem[] = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/announcements", label: "お知らせ", icon: Bell },
  { label: "投稿", icon: PlusCircle, action: "createPost" },
  { href: "/my-page", label: "マイページ", icon: User },
  { label: "その他", icon: MoreHorizontal, action: "more" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-[hsl(var(--border))] flex items-center justify-around z-50 md:hidden pb-[env(safe-area-inset-bottom)]"
      aria-label="モバイルナビゲーション"
      style={{ height: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}
    >
      {navItems.map((item) => {
        const isActive = item.href
          ? item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href)
          : false;

        if (item.action) {
          return (
            <button
              key={item.label}
              type="button"
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 text-xs transition-colors",
                item.action === "createPost"
                  ? "text-[hsl(var(--primary))]"
                  : "text-[hsl(var(--muted-foreground))]",
              )}
              onClick={() => {
                // Phase 04 で投稿作成モーダルを開く
                // Phase で「その他」メニューを実装
              }}
            >
              <item.icon
                className={cn(
                  "h-5 w-5",
                  item.action === "createPost" && "h-6 w-6",
                )}
              />
              <span>{item.label}</span>
            </button>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href!}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-2 text-xs transition-colors",
              isActive
                ? "text-[hsl(var(--primary))]"
                : "text-[hsl(var(--muted-foreground))]",
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
