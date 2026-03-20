"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/auth-guard";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Header } from "@/components/layout/header";
import { useAuthStore } from "@/stores/auth-store";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const router = useRouter();

  const hasAdminAccess =
    user?.permissions?.includes("admin") ||
    user?.permissions?.includes("view_admin_dashboard");

  useEffect(() => {
    if (!isLoading && isAuthenticated && !hasAdminAccess) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, hasAdminAccess, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!hasAdminAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
            アクセス権限がありません
          </h1>
          <p className="mt-2 text-[hsl(var(--muted-foreground))]">
            このページにアクセスするには管理者権限が必要です。
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[hsl(var(--background))]">
        <AdminSidebar />
        <div className="ml-64">
          <Header />
          <main className="p-6 max-w-6xl">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
