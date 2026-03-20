"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home,
  Bell,
  ClipboardList,
  User,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useAuthStore } from "@/stores/auth-store";
import { useUiStore } from "@/stores/ui-store";
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

const adminItem = { href: "/admin", label: "管理", icon: Shield };

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
          "h-screen bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0 z-40 transition-all duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-64",
        )}
      >
        {/* Logo — click to toggle sidebar */}
        <div className="h-16 flex items-center border-b border-gray-200 px-3">
          <button
            onClick={toggleSidebar}
            className="flex items-center gap-3 min-w-0 cursor-pointer"
            aria-label={isCollapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}
          >
            <div className="w-10 h-10 rounded-lg bg-[#1e3a8a] flex items-center justify-center flex-shrink-0 overflow-hidden">
              <Image
                src="/images/logo.jpg"
                alt="日報"
                width={40}
                height={40}
                className="w-10 h-10 object-cover rounded-lg"
              />
            </div>
            {!isCollapsed && (
              <span className="text-lg font-bold text-[#1e3a8a] truncate">
                日報
              </span>
            )}
          </button>
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
                    : "text-gray-700 hover:bg-gray-50",
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
          <div className="border-t border-gray-200 mb-3" />

          {/* User info */}
          {!isCollapsed && user && (
            <div className="mt-3 flex items-center gap-3 px-1">
              <UserAvatar
                shainName={user.shainName}
                avatar={user.avatar}
                snsAvatarUrl={user.snsAvatarUrl}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.shainName}
                </p>
                <p className="text-xs text-gray-500 truncate">
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
