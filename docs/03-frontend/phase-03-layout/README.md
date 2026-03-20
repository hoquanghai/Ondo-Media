# Phase 03 — App Layout

## Objectives

- メインレイアウト (左サイドバー + ヘッダー + コンテンツ) を構築する
- レスポンシブ対応: PC (3カラム)、タブレット (2カラム)、モバイル (1カラム + ボトムナビ)
- サイドバー・ヘッダー・ボトムナビの共通コンポーネントを実装する
- useMediaQuery フックでブレークポイント判定を行う

## Prerequisites

- Phase 01 完了 (プロジェクトセットアップ)
- Phase 02 完了 (認証)

## Tasks

### 1. レスポンシブレイアウト設計

```
┌─────────────────────────────────────────────────────────────┐
│ Desktop (≥ 1280px) — 3 Column                               │
│                                                             │
│ ┌──────────┬────────────────────────────┬──────────────┐    │
│ │ Sidebar  │  Header                    │              │    │
│ │ (256px)  │  ─────────────────────────  │  Right       │    │
│ │          │                            │  Panel       │    │
│ │ コープ   │  Main Content              │  (optional)  │    │
│ │ ネット   │                            │              │    │
│ │          │                            │              │    │
│ │ ホーム   │                            │              │    │
│ │ お知らせ │                            │              │    │
│ │ アンケート│                            │              │    │
│ │ マイページ│                            │              │    │
│ │ 管理     │                            │              │    │
│ └──────────┴────────────────────────────┴──────────────┘    │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┐
│ Tablet (768px - 1279px) — 2 Column   │
│                                      │
│ ┌────────────────────────────────┐   │
│ │  Header (hamburger + search)   │   │
│ │  ─────────────────────────────  │   │
│ │                                │   │
│ │  Main Content                  │   │
│ │  (full width)                  │   │
│ │                                │   │
│ └────────────────────────────────┘   │
│ (Sidebar = overlay drawer)           │
└──────────────────────────────────────┘

┌──────────────────────┐
│ Mobile (< 768px)     │
│                      │
│ ┌──────────────────┐ │
│ │ Header (minimal) │ │
│ │ ────────────────  │ │
│ │                  │ │
│ │ Main Content     │ │
│ │ (full width)     │ │
│ │                  │ │
│ │                  │ │
│ ├──────────────────┤ │
│ │ BottomNav        │ │
│ │ ホーム|お知らせ|+|アンケート|マイページ │
│ └──────────────────┘ │
└──────────────────────┘
```

### 2. useMediaQuery フック

**File: `src/hooks/use-media-query.ts`**

```ts
"use client";

import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}

export function useBreakpoint() {
  const isMobile = !useMediaQuery("(min-width: 768px)");
  const isTablet = useMediaQuery("(min-width: 768px)") && !useMediaQuery("(min-width: 1280px)");
  const isDesktop = useMediaQuery("(min-width: 1280px)");

  return { isMobile, isTablet, isDesktop };
}
```

### 3. サイドバーコンポーネント

**File: `src/components/layout/sidebar.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Bell, ClipboardList, User, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

const navItems = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/announcements", label: "お知らせ", icon: Bell },
  { href: "/surveys", label: "アンケート", icon: ClipboardList },
  { href: "/my-page", label: "マイページ", icon: User },
];

const adminItem = { href: "/admin", label: "管理", icon: Shield };

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";

  const items = isAdmin ? [...navItems, adminItem] : navItems;

  return (
    <aside className="w-64 h-screen bg-surface border-r border-border flex flex-col fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-border">
        <Link href="/" className="text-xl font-bold text-primary">
          コープネット
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {items.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
            {user?.display_name?.charAt(0) ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.display_name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.department}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
```

### 4. ヘッダーコンポーネント

**File: `src/components/layout/header.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Search, Bell, Menu, LogOut, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth-store";
import { useBreakpoint } from "@/hooks/use-media-query";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const { isMobile, isTablet } = useBreakpoint();
  const [unreadCount] = useState(3); // Phase 09 で NotificationStore から取得

  return (
    <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 gap-4 sticky top-0 z-30">
      {/* Left: Menu button (tablet/mobile) + Search */}
      <div className="flex items-center gap-3 flex-1">
        {(isMobile || isTablet) && (
          <Button variant="ghost" size="icon" onClick={onMenuClick}>
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="投稿を検索..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Right: Notifications + User */}
      <div className="flex items-center gap-2">
        {/* Notification Bell */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-sm">
                  {user?.display_name?.charAt(0) ?? "?"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.display_name}</p>
              <p className="text-xs text-muted-foreground">{user?.department}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/my-page" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                マイページ
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="flex items-center gap-2 text-destructive">
              <LogOut className="h-4 w-4" />
              ログアウト
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
```

### 5. ボトムナビコンポーネント

**File: `src/components/layout/bottom-nav.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Bell, ClipboardList, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/announcements", label: "お知らせ", icon: Bell },
  { href: "/surveys", label: "アンケート", icon: ClipboardList },
  { href: "/my-page", label: "マイページ", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border flex items-center justify-around z-50 tablet:hidden">
      {navItems.map((item) => {
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors",
              isActive ? "text-primary" : "text-muted-foreground"
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
```

### 6. メインレイアウト

**File: `src/app/(main)/layout.tsx`**

```tsx
"use client";

import { useState } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { useBreakpoint } from "@/hooks/use-media-query";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { isMobile, isDesktop } = useBreakpoint();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        {/* Desktop: fixed sidebar */}
        {isDesktop && <Sidebar />}

        {/* Tablet/Mobile: overlay sidebar */}
        {!isDesktop && sidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setSidebarOpen(false)}
            />
            <Sidebar />
          </>
        )}

        {/* Main area */}
        <div className={isDesktop ? "ml-64" : ""}>
          <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          <main className="p-4 tablet:p-6 pb-20 tablet:pb-6">
            {children}
          </main>
        </div>

        {/* Mobile: bottom navigation */}
        {isMobile && <BottomNav />}
      </div>
    </AuthGuard>
  );
}
```

## Verification Checklist

- [ ] デスクトップ (≥1280px): 左サイドバー (256px) + ヘッダー + メインコンテンツが表示される
- [ ] タブレット (768px-1279px): サイドバー非表示、ハンバーガーメニューでオーバーレイ表示
- [ ] モバイル (<768px): ボトムナビ表示、サイドバーはハンバーガーメニューから
- [ ] サイドバーのナビゲーション項目: ホーム、お知らせ、アンケート、マイページ、管理 (admin のみ)
- [ ] アクティブなナビ項目がハイライトされる
- [ ] ヘッダーの検索バーが動作する
- [ ] 通知ベルにバッジが表示される
- [ ] ユーザーアバタードロップダウンが開く (マイページ、ログアウト)
- [ ] ロゴ「コープネット」がクリックでホームに遷移する
- [ ] レスポンシブ切り替えがスムーズに動作する
- [ ] TypeScript エラーがない

## Files Created / Modified

| ファイル | 操作 | 概要 |
|---|---|---|
| `src/hooks/use-media-query.ts` | 作成 | メディアクエリ・ブレークポイントフック |
| `src/components/layout/sidebar.tsx` | 作成 | 左サイドバー (ナビゲーション) |
| `src/components/layout/header.tsx` | 作成 | ヘッダー (検索・通知・ユーザーメニュー) |
| `src/components/layout/bottom-nav.tsx` | 作成 | モバイル用ボトムナビゲーション |
| `src/app/(main)/layout.tsx` | 作成 | メインレイアウト (レスポンシブ対応) |
