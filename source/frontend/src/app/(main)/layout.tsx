"use client";

import { useEffect, useCallback } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PushPermissionPrompt } from "@/components/notifications/push-permission-prompt";
import { useIsMobile, useIsDesktop, useIsTablet } from "@/hooks/use-media-query";
import { useUiStore } from "@/stores/ui-store";
import { useNotifications } from "@/hooks/use-notifications";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();
  const { isSidebarOpen, setSidebarOpen, setIsMobile } = useUiStore();

  // WebSocket connection + real-time notification listeners
  useNotifications();

  // Sync mobile state to store
  useEffect(() => {
    setIsMobile(isMobile);
  }, [isMobile, setIsMobile]);

  // Auto-collapse sidebar on tablet, auto-expand on desktop
  useEffect(() => {
    if (isDesktop) {
      setSidebarOpen(true);
    } else if (isTablet) {
      setSidebarOpen(false);
    }
  }, [isDesktop, isTablet, setSidebarOpen]);

  const handleOverlayClose = useCallback(() => {
    setSidebarOpen(false);
  }, [setSidebarOpen]);

  const handleMenuClick = useCallback(() => {
    setSidebarOpen(!isSidebarOpen);
  }, [setSidebarOpen, isSidebarOpen]);

  // Calculate sidebar width for main content offset
  const sidebarWidth = isDesktop
    ? isSidebarOpen
      ? "ml-64"
      : "ml-16"
    : isTablet
      ? isSidebarOpen
        ? "ml-16"
        : ""
      : "";

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[hsl(var(--background))]">
        {/* Desktop/Tablet: fixed sidebar */}
        {(isDesktop || isTablet) && (
          <Sidebar collapsed={isTablet && !isSidebarOpen} />
        )}

        {/* Mobile: overlay sidebar */}
        {isMobile && isSidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-30 transition-opacity"
              onClick={handleOverlayClose}
              aria-hidden="true"
            />
            <div className="fixed left-0 top-0 z-40">
              <Sidebar />
            </div>
          </>
        )}

        {/* Main area */}
        <div
          className={`transition-all duration-300 ease-in-out ${isDesktop ? sidebarWidth : isTablet && isSidebarOpen ? "ml-16" : ""}`}
        >
          <Header
            onMenuClick={handleMenuClick}
            showMenuButton={isMobile || isTablet}
          />
          <main className="p-4 md:p-6 pb-20 md:pb-6 max-w-5xl">
            {children}
          </main>
        </div>

        {/* Mobile: bottom navigation */}
        {isMobile && <BottomNav />}

        {/* Push notification permission prompt */}
        <PushPermissionPrompt />
      </div>
    </AuthGuard>
  );
}
