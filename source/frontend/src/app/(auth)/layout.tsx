"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, mounted, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f5f5f7] to-[#e5e7eb]">
      <div className="w-full max-w-md px-4">
        {mounted ? children : (
          <div className="text-center text-gray-400 animate-pulse">読み込み中...</div>
        )}
      </div>
    </div>
  );
}
