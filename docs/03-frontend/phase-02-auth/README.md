# Phase 02 — Authentication

## Objectives

- Zustand による認証状態管理ストアを構築する
- ログインページ (ユーザー名/パスワード + Microsoft 365 SSO) を実装する
- JWT トークンの保存・自動リフレッシュロジックを実装する
- 認証ミドルウェアで未認証ユーザーを `/login` へリダイレクトする
- すべての UI テキストを日本語で表示する

## Prerequisites

- Phase 01 完了 (プロジェクトセットアップ済み)
- バックエンド認証 API が稼働中 (`POST /api/auth/login`, `POST /api/auth/refresh`, `GET /api/auth/me`)

## Tasks

### 1. 認証関連の型定義

**File: `src/types/auth.ts`**

```ts
export interface User {
  id: string;
  username: string;
  display_name: string;
  email: string;
  department: string;
  position: string;
  avatar_url: string | null;
  role: "admin" | "user";
  permissions: string[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
```

### 2. 認証ストア (Zustand)

**File: `src/stores/auth-store.ts`**

```ts
import { create } from "zustand";
import { api } from "@/lib/api";
import type { User, LoginRequest, LoginResponse, AuthState } from "@/types/auth";

interface AuthActions {
  login: (credentials: LoginRequest) => Promise<void>;
  loginWithMicrosoft: () => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.post<LoginResponse>("/auth/login", credentials);
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({
        error: "ログインに失敗しました。ユーザー名またはパスワードを確認してください。",
        isLoading: false,
      });
      throw err;
    }
  },

  loginWithMicrosoft: async () => {
    // Microsoft 365 SSO — OAuth フローを開始
    window.location.href = `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/microsoft`;
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    window.location.href = "/login";
  },

  refreshToken: async () => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      get().logout();
      return;
    }
    try {
      const data = await api.post<LoginResponse>("/auth/refresh", {
        refresh_token: refreshToken,
      });
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      set({ user: data.user, isAuthenticated: true });
    } catch {
      get().logout();
    }
  },

  fetchCurrentUser: async () => {
    set({ isLoading: true });
    try {
      const user = await api.get<User>("/auth/me");
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
```

### 3. useAuth フック

**File: `src/hooks/use-auth.ts`**

```ts
"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

export function useAuth() {
  const store = useAuthStore();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token && !store.isAuthenticated) {
      store.fetchCurrentUser();
    } else if (!token) {
      useAuthStore.setState({ isLoading: false });
    }
  }, []);

  // 401 イベントのリスナー（API クライアントから発火）
  useEffect(() => {
    const handler = () => store.refreshToken();
    window.addEventListener("auth:unauthorized", handler);
    return () => window.removeEventListener("auth:unauthorized", handler);
  }, [store]);

  return store;
}
```

### 4. トークン自動リフレッシュ

**File: `src/lib/token-refresh.ts`**

```ts
const REFRESH_INTERVAL_MS = 14 * 60 * 1000; // 14分 (トークン有効期限15分前提)

let refreshTimer: ReturnType<typeof setInterval> | null = null;

export function startTokenRefresh(refreshFn: () => Promise<void>) {
  stopTokenRefresh();
  refreshTimer = setInterval(refreshFn, REFRESH_INTERVAL_MS);
}

export function stopTokenRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}
```

### 5. 認証ミドルウェア

**File: `src/middleware.ts`**

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth/callback"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公開パスはスキップ
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 静的ファイル・API はスキップ
  if (pathname.startsWith("/_next") || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // クライアント側トークンチェックのため、Cookie ベースの場合はここで検証
  // localStorage ベースの場合はクライアント側 AuthGuard コンポーネントで制御
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

### 6. AuthGuard コンポーネント

**File: `src/components/auth/auth-guard.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4 w-80">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
```

### 7. ログインページ

**File: `src/app/login/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, loginWithMicrosoft, isLoading, error, clearError } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ username, password });
      router.push("/");
    } catch {
      // エラーはストアで管理
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">
            コープネット
          </CardTitle>
          <p className="text-muted-foreground text-sm mt-1">
            社内SNSにログイン
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                ユーザー名
              </label>
              <Input
                id="username"
                type="text"
                placeholder="ユーザー名を入力"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  clearError();
                }}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                パスワード
              </label>
              <Input
                id="password"
                type="password"
                placeholder="パスワードを入力"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearError();
                }}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "ログイン中..." : "サインイン"}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  または
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={loginWithMicrosoft}
            >
              Microsoft 365 でサインイン
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 8. Microsoft 365 OAuth コールバック

**File: `src/app/auth/callback/page.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fetchCurrentUser } = useAuthStore();

  useEffect(() => {
    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");

    if (accessToken && refreshToken) {
      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("refresh_token", refreshToken);
      fetchCurrentUser().then(() => router.replace("/"));
    } else {
      router.replace("/login");
    }
  }, [searchParams, fetchCurrentUser, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">認証処理中...</p>
    </div>
  );
}
```

## Verification Checklist

- [ ] `/login` ページが表示される
- [ ] ユーザー名・パスワードでログインできる
- [ ] ログイン後 `/` にリダイレクトされる
- [ ] 「Microsoft 365 でサインイン」ボタンが OAuth フローを開始する
- [ ] 未認証状態で `/` にアクセスすると `/login` にリダイレクトされる
- [ ] ログアウトするとトークンが削除され `/login` に戻る
- [ ] トークン期限切れ時に自動リフレッシュが実行される
- [ ] 401 レスポンス時にリフレッシュ → 失敗ならログアウトされる
- [ ] ローディング中にスケルトン UI が表示される
- [ ] すべてのテキストが日本語で表示されている
- [ ] TypeScript エラーがない

## Files Created / Modified

| ファイル | 操作 | 概要 |
|---|---|---|
| `src/types/auth.ts` | 作成 | 認証関連の型定義 |
| `src/stores/auth-store.ts` | 作成 | Zustand 認証ストア |
| `src/hooks/use-auth.ts` | 作成 | 認証フック |
| `src/lib/token-refresh.ts` | 作成 | トークン自動リフレッシュユーティリティ |
| `src/middleware.ts` | 作成 | Next.js ミドルウェア (ルートガード) |
| `src/components/auth/auth-guard.tsx` | 作成 | クライアント側認証ガード |
| `src/app/login/page.tsx` | 作成 | ログインページ |
| `src/app/auth/callback/page.tsx` | 作成 | Microsoft 365 OAuth コールバック |
