"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Skeleton } from "@/components/ui/skeleton";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");

    if (accessToken && refreshToken) {
      useAuthStore.setState({ accessToken, refreshToken });
      checkAuth().then(() => router.replace("/"));
    } else {
      router.replace("/login");
    }
  }, [searchParams, checkAuth, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="space-y-4 w-80 text-center">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-3/4 mx-auto" />
        <p className="text-sm text-gray-500">認証処理中...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-sm text-gray-500">読み込み中...</p>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
