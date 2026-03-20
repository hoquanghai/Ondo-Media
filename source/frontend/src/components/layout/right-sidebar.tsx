"use client";

import { FileText, TrendingUp, Calendar } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { usePostStore } from "@/stores/post-store";

export function RightSidebar() {
  const user = useAuthStore((s) => s.user);
  const { dateCounts } = usePostStore();

  // Calculate stats from available data
  const totalPosts = Object.values(dateCounts).reduce((sum, count) => sum + count, 0);

  // Count posts in current month
  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthlyPosts = Object.entries(dateCounts)
    .filter(([date]) => date.startsWith(currentMonthPrefix))
    .reduce((sum, [, count]) => sum + count, 0);

  // Calculate consecutive posting days (simplified: count days with posts in last 7 days)
  const today = now.toISOString().split("T")[0];
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    if (dateCounts[dateStr] && dateCounts[dateStr] > 0) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return (
    <aside className="w-80 h-screen sticky top-16 overflow-y-auto hidden lg:block border-l border-gray-200 bg-white/50 p-5 space-y-5">
      {/* Activity Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[#1e3a8a]" />
          あなたのアクティビティ
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">総投稿数</span>
            <span className="text-sm font-semibold text-gray-900">{totalPosts}</span>
          </div>
          <div className="border-t border-gray-100" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">今月の投稿</span>
            <span className="text-sm font-semibold text-gray-900">{monthlyPosts}</span>
          </div>
          <div className="border-t border-gray-100" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">連続投稿日数</span>
            <span className="text-sm font-semibold text-[#1e3a8a]">{streak}日</span>
          </div>
        </div>
      </div>

      {/* User Profile Card */}
      {user && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#1e3a8a]" />
            プロフィール
          </h3>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#1e3a8a] to-[#3b82f6] flex items-center justify-center text-white font-bold flex-shrink-0">
              {user.shainName?.charAt(0) ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.shainName}</p>
              <p className="text-xs text-gray-500 truncate">{user.shainGroup}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Dates with Posts */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#1e3a8a]" />
          最近の投稿日
        </h3>
        <div className="space-y-2">
          {Object.entries(dateCounts)
            .sort(([a], [b]) => b.localeCompare(a))
            .slice(0, 5)
            .map(([date, count]) => (
              <div key={date} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{date.replace(/-/g, "/")}</span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {count}件
                </span>
              </div>
            ))}
          {Object.keys(dateCounts).length === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">データなし</p>
          )}
        </div>
      </div>
    </aside>
  );
}
