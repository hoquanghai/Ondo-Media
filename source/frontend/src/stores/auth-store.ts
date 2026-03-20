"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CurrentUser } from "@/types";
import { authApi } from "@/lib/auth-api";
import { env } from "@/lib/env";
import { startTokenRefresh, stopTokenRefresh } from "@/lib/token-refresh";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: CurrentUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  showCreatePasswordDialog: boolean;
}

interface AuthActions {
  login: (
    shainBangou: number,
    password?: string,
    rememberMe?: boolean,
  ) => Promise<void>;
  loginWithMicrosoft: () => void;
  logout: () => Promise<void>;
  refreshTokenAction: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  setAuth: (data: {
    accessToken: string;
    refreshToken: string;
    user: CurrentUser;
  }) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: CurrentUser) => void;
  createPassword: (
    password: string,
    confirmPassword: string,
  ) => Promise<void>;
  setShowCreatePasswordDialog: (show: boolean) => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      showCreatePasswordDialog: false,

      login: async (
        shainBangou: number,
        password?: string,
        rememberMe?: boolean,
      ) => {
        set({ isLoading: true, error: null });
        try {
          const data = await authApi.loginWithShainBangou(
            shainBangou,
            password,
            rememberMe,
          );
          const user: CurrentUser = {
            shainBangou: data.user.shainBangou,
            shainName: data.user.shainName,
            shainGroup: data.user.shainGroup,
            email: data.user.email,
            avatar: data.user.avatar,
            hasPassword: data.user.hasPassword,
            permissions: data.user.permissions,
          };
          set({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            showCreatePasswordDialog: !data.user.hasPassword,
          });
          startTokenRefresh(() => get().refreshTokenAction());
        } catch {
          set({
            error:
              "ログインに失敗しました。社員番号またはパスワードを確認してください。",
            isLoading: false,
          });
          throw new Error("ログインに失敗しました");
        }
      },

      loginWithMicrosoft: () => {
        // Microsoft 365 SSO — OAuth フローを開始
        window.location.href = `${env.apiBaseUrl}/auth/microsoft`;
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // ログアウト API が失敗してもローカル状態はクリアする
        }
        stopTokenRefresh();
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          showCreatePasswordDialog: false,
        });
      },

      refreshTokenAction: async () => {
        const currentRefreshToken = get().refreshToken;
        if (!currentRefreshToken) {
          await get().logout();
          return;
        }
        try {
          const data = await authApi.refreshToken(currentRefreshToken);
          set({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            user: data.user,
            isAuthenticated: true,
          });
        } catch {
          stopTokenRefresh();
          set({
            accessToken: null,
            refreshToken: null,
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      checkAuth: async () => {
        const token = get().accessToken;
        if (!token) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }
        set({ isLoading: true });
        try {
          const user = await authApi.getMe();
          set({ user, isAuthenticated: true, isLoading: false });
          startTokenRefresh(() => get().refreshTokenAction());
        } catch {
          set({
            accessToken: null,
            refreshToken: null,
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
          stopTokenRefresh();
        }
      },

      clearError: () => set({ error: null }),

      setAuth: (data) =>
        set({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
        }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      setUser: (user) => set({ user }),

      createPassword: async (password: string, confirmPassword: string) => {
        try {
          await authApi.createPassword(password, confirmPassword);
          const currentUser = get().user;
          if (currentUser) {
            set({
              user: { ...currentUser, hasPassword: true },
              showCreatePasswordDialog: false,
            });
          }
        } catch {
          throw new Error("パスワードの作成に失敗しました");
        }
      },

      setShowCreatePasswordDialog: (show: boolean) =>
        set({ showCreatePasswordDialog: show }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
