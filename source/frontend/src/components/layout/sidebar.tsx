"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home,
  Bell,
  ClipboardList,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useUiStore } from "@/stores/ui-store";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/announcements", label: "お知らせ", icon: Bell },
  { href: "/surveys", label: "アンケート", icon: ClipboardList },
  { href: "/my-page", label: "マイページ", icon: User },
];

const adminItem = { href: "/admin", label: "管理", icon: Settings };

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const { isSidebarOpen, toggleSidebar } = useUiStore();

  const isAdmin =
    user?.permissions?.includes("view_admin_dashboard");

  const items = isAdmin ? [...navItems, adminItem] : navItems;
  const isCollapsed = collapsed || !isSidebarOpen;

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "h-screen bg-white border-r border-[hsl(var(--border))] flex flex-col fixed left-0 top-0 z-40 transition-all duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-64",
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center border-b border-[hsl(var(--border))] px-3">
          <Link href="/" className="flex items-center gap-3 min-w-0">
            <Image
              src="/images/logo.jpg"
              alt="日報"
              width={36}
              height={36}
              className="flex-shrink-0 rounded-lg"
            />
            {!isCollapsed && (
              <span className="text-lg font-bold text-[#1e3a8a] truncate">
                日報
              </span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1" aria-label="メインナビゲーション">
          {items.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            const linkContent = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
                  isCollapsed
                    ? "justify-center px-2 py-2.5"
                    : "px-3 py-2.5",
                  isActive
                    ? "bg-[#1e3a8a] text-white"
                    : "text-[hsl(var(--muted-foreground))] hover:bg-gray-50 hover:text-[hsl(var(--foreground))]",
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.label}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </nav>

        {/* Bottom section */}
        <div className="px-2 pb-3">
          <Separator className="mb-3" />

          {/* Settings link */}
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/settings"
                  className={cn(
                    "flex items-center justify-center rounded-lg px-2 py-2.5 text-sm font-medium transition-colors",
                    pathname === "/settings"
                      ? "bg-[#1e3a8a] text-white"
                      : "text-[hsl(var(--muted-foreground))] hover:bg-gray-50 hover:text-[hsl(var(--foreground))]",
                  )}
                >
                  <Settings className="h-5 w-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>設定</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === "/settings"
                  ? "bg-[#1e3a8a] text-white"
                  : "text-[hsl(var(--muted-foreground))] hover:bg-gray-50 hover:text-[hsl(var(--foreground))]",
              )}
            >
              <Settings className="h-5 w-5" />
              <span>設定</span>
            </Link>
          )}

          {/* Collapse toggle (desktop only) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="mt-2 w-full h-8"
            aria-label={isCollapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>

          {/* User info */}
          {!isCollapsed && user && (
            <div className="mt-3 flex items-center gap-3 px-1">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#1e3a8a] to-[#3b82f6] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {user.shainName?.charAt(0) ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.shainName}
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                  {user.shainGroup}
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
