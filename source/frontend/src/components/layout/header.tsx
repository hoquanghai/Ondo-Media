"use client";

import Link from "next/link";
import { Search, Menu, LogOut, User, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/user-avatar";
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
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-50">
      {/* Left: Menu button (mobile/tablet only) */}
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
      </div>

      {/* Right: Search + Notifications + Settings + User */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="検索">
          <Search className="h-5 w-5 text-gray-600" />
        </Button>

        {/* Notification Bell */}
        <NotificationBell />

        {/* Settings button */}
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings" aria-label="設定">
            <Settings className="h-5 w-5 text-gray-600" />
          </Link>
        </Button>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-9 w-9 rounded-full p-0"
              aria-label="ユーザーメニュー"
            >
              <UserAvatar
                shainName={user?.shainName ?? ""}
                avatar={user?.avatar}
                snsAvatarUrl={user?.snsAvatarUrl}
                size="sm"
                className="h-9 w-9"
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-gray-900">{user?.shainName}</p>
              <p className="text-xs text-gray-500">
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
              className="flex items-center gap-2 text-red-600 cursor-pointer"
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
