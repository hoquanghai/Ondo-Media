"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  FileText,
  ClipboardList,
  Bell,
  ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { StatCard } from "@/components/my-page/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminStats } from "@/types/admin";

const quickLinks = [
  { href: "/admin/users", label: "ユーザー管理", icon: Users },
  { href: "/admin/permissions", label: "権限管理", icon: Users },
  { href: "/admin/surveys", label: "アンケート結果", icon: ClipboardList },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get<AdminStats>("/admin/stats")
      .then((data) => {
        setStats(data);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">ダッシュボード</h1>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ダッシュボード</h1>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <StatCard
            label="総ユーザー数"
            value={stats.totalUsers}
            icon={Users}
          />
          <StatCard
            label="アクティブユーザー"
            value={stats.activeUsers}
            icon={Users}
            color="text-green-500"
          />
          <StatCard
            label="本日の投稿数"
            value={stats.postsToday}
            icon={FileText}
          />
          <StatCard
            label="今週の投稿"
            value={stats.postsThisWeek}
            icon={FileText}
            color="text-blue-500"
          />
          <StatCard
            label="アクティブアンケート"
            value={stats.activeSurveys}
            icon={ClipboardList}
            color="text-purple-500"
          />
          <StatCard
            label="お知らせ総数"
            value={stats.totalAnnouncements}
            icon={Bell}
            color="text-orange-500"
          />
        </div>
      )}

      {/* Quick Links */}
      <h2 className="text-lg font-bold mb-4">クイックリンク</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="hover:bg-[hsl(var(--muted)/0.3)] transition-colors cursor-pointer">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <link.icon className="h-5 w-5 text-[hsl(var(--primary))]" />
                    <span className="font-medium text-sm">{link.label}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
