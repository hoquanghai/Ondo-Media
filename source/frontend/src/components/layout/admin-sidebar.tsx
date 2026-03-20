"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Shield,
  BarChart3,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

const adminNavItems = [
  { href: "/admin", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/admin/users", label: "ユーザー管理", icon: Users },
  { href: "/admin/permissions", label: "権限管理", icon: Shield },
  { href: "/admin/surveys", label: "アンケート結果", icon: BarChart3 },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen bg-white border-r border-[hsl(var(--border))] flex flex-col fixed left-0 top-0 z-40">
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
          <span className="text-lg font-bold text-[#1e3a8a] truncate">
            管理画面
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1" aria-label="管理者ナビゲーション">
        {adminNavItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#1e3a8a] text-white"
                  : "text-[hsl(var(--muted-foreground))] hover:bg-gray-50 hover:text-[hsl(var(--foreground))]",
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Back to main */}
      <div className="px-2 pb-4">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[hsl(var(--muted-foreground))] hover:bg-gray-50 hover:text-[hsl(var(--foreground))] transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>メインに戻る</span>
        </Link>
      </div>
    </aside>
  );
}
