"use client";

import { useEffect, useCallback, useState } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { RightSidebar } from "@/components/layout/right-sidebar";
import { PushPermissionPrompt } from "@/components/notifications/push-permission-prompt";
import { useIsMobile, useIsDesktop, useIsTablet } from "@/hooks/use-media-query";
import { useUiStore } from "@/stores/ui-store";
import { useNotifications } from "@/hooks/use-notifications";
import { useRealtimeTimeline } from "@/hooks/use-realtime-timeline";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();
  const { isSidebarOpen, setSidebarOpen, setIsMobile } = useUiStore();

  useNotifications();
  useRealtimeTimeline();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsMobile(isMobile);
  }, [isMobile, setIsMobile]);

  useEffect(() => {
    if (!mounted) return;
    if (isDesktop) setSidebarOpen(true);
    else if (isTablet) setSidebarOpen(false);
  }, [isDesktop, isTablet, setSidebarOpen, mounted]);

  const handleOverlayClose = useCallback(() => setSidebarOpen(false), [setSidebarOpen]);
  const handleMenuClick = useCallback(() => setSidebarOpen(!isSidebarOpen), [setSidebarOpen, isSidebarOpen]);

  const sidebarWidth = isSidebarOpen ? "ml-64" : "ml-16";

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#f5f5f7]">
        {mounted && !isMobile && (
          <Sidebar collapsed={isTablet} />
        )}

        {mounted && isMobile && isSidebarOpen && (
          <>
            <div className="fixed inset-0 bg-black/50 z-30" onClick={handleOverlayClose} />
            <div className="fixed left-0 top-0 z-40">
              <Sidebar />
            </div>
          </>
        )}

        <div className={`transition-all duration-300 ${mounted && isDesktop ? sidebarWidth : mounted && isTablet ? "ml-16" : ""}`}>
          <Header onMenuClick={handleMenuClick} showMenuButton={!mounted || isMobile || isTablet} />

          <div className="flex flex-1">
            <main className="flex-1 py-6 px-4 md:px-8 pb-20 md:pb-6">
              {children}
            </main>
            {mounted && isDesktop && <RightSidebar />}
          </div>
        </div>

        {mounted && isMobile && <BottomNav />}
        <PushPermissionPrompt />
      </div>
    </AuthGuard>
  );
}
