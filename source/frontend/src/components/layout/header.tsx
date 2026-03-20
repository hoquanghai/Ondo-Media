"use client";

import Link from "next/link";
import { Search, Menu, LogOut, User, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth-store";
import { NotificationBell } from "@/components/notifications/notification-bell";

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export function Header({ onMenuClick, showMenuButton = false }: HeaderProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <header className="h-16 bg-white border-b border-[hsl(var(--border))] flex items-center justify-between px-4 gap-4 sticky top-0 z-30">
      {/* Left: Menu button + Search */}
      <div className="flex items-center gap-3 flex-1">
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            aria-label="メニューを開く"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <Button variant="ghost" size="icon" aria-label="検索">
          <Search className="h-5 w-5" />
        </Button>
      </div>

      {/* Right: Notifications + User */}
      <div className="flex items-center gap-2">
        {/* Notification Bell */}
        <NotificationBell />

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-8 w-8 rounded-full"
              aria-label="ユーザーメニュー"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={user?.avatar ?? undefined}
                  alt={user?.shainName ?? ""}
                />
                <AvatarFallback className="bg-gradient-to-br from-[#1e3a8a] to-[#3b82f6] text-white text-sm">
                  {user?.shainName?.charAt(0) ?? "?"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.shainName}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {user?.shainGroup}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/my-page" className="flex items-center gap-2 cursor-pointer">
                <User className="h-4 w-4" />
                マイページ
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                <Settings className="h-4 w-4" />
                設定
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout()}
              className="flex items-center gap-2 text-[hsl(var(--destructive))] cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              ログアウト
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
