"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Track Zustand persist hydration with useSyncExternalStore
 * to avoid race conditions with useEffect.
 */
function useHasHydrated() {
  return useSyncExternalStore(
    (onStoreChange) => useAuthStore.persist.onFinishHydration(onStoreChange),
    () => useAuthStore.persist.hasHydrated(),
    () => false, // SSR always returns false
  );
}

export function useAuth() {
  const store = useAuthStore();
  const hydrated = useHasHydrated();

  // After hydration, ensure isLoading is false if we already have auth state
  useEffect(() => {
    if (!hydrated) return;

    const { accessToken, isAuthenticated, user, isLoading } = useAuthStore.getState();

    // If already authenticated with token+user, just make sure isLoading is off
    if (accessToken && isAuthenticated && user) {
      if (isLoading) {
        useAuthStore.setState({ isLoading: false });
      }
      return;
    }

    // No valid auth state
    if (!accessToken) {
      useAuthStore.setState({ isLoading: false, isAuthenticated: false });
    }
  }, [hydrated]);

  // 401 event listener
  useEffect(() => {
    const handler = () => {
      store.refreshTokenAction();
    };
    window.addEventListener("auth:unauthorized", handler);
    return () => window.removeEventListener("auth:unauthorized", handler);
  }, [store]);

  return {
    user: store.user,
    isAuthenticated: hydrated ? store.isAuthenticated : false,
    isLoading: !hydrated,
    error: store.error,
    login: store.login,
    loginWithMicrosoft: store.loginWithMicrosoft,
    logout: store.logout,
    clearError: store.clearError,
    createPassword: store.createPassword,
    showCreatePasswordDialog: store.showCreatePasswordDialog,
    setShowCreatePasswordDialog: store.setShowCreatePasswordDialog,
  };
}
