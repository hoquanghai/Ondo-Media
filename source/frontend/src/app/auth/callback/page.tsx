"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth, checkAuth } = useAuthStore();

  useEffect(() => {
    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");

    if (accessToken && refreshToken) {
      // トークンをストアに保存してから認証チェック
      useAuthStore.setState({
        accessToken,
        refreshToken,
      });
      checkAuth().then(() => router.replace("/"));
    } else {
      router.replace("/login");
    }
  }, [searchParams, setAuth, checkAuth, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="space-y-4 w-80 text-center">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-3/4 mx-auto" />
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          認証処理中...
        </p>
      </div>
    </div>
  );
}
