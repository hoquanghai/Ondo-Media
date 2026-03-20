"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth-store";

export function useAuth() {
  const store = useAuthStore();
  const initialized = useRef(false);

  // 初回マウント時に認証状態を確認
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const token = useAuthStore.getState().accessToken;
    if (token && !useAuthStore.getState().isAuthenticated) {
      store.checkAuth();
    } else if (token && useAuthStore.getState().isAuthenticated) {
      // すでに認証済み — isLoading を false にする
      useAuthStore.setState({ isLoading: false });
    } else {
      // トークンなし
      useAuthStore.setState({ isLoading: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 401 イベントのリスナー（API クライアントから発火）
  useEffect(() => {
    const handler = () => {
      store.refreshTokenAction();
    };
    window.addEventListener("auth:unauthorized", handler);
    return () => window.removeEventListener("auth:unauthorized", handler);
  }, [store]);

  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
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
