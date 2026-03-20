# Next.js 15 アーキテクチャ (Frontend Architecture)

> コープネット - フロントエンド設計

## 1. 技術スタック

| カテゴリ | 技術 | バージョン |
|---------|------|----------|
| フレームワーク | Next.js (App Router) | 15.x |
| 言語 | TypeScript | 5.x |
| UI コンポーネント | shadcn/ui + Radix UI | — |
| スタイリング | Tailwind CSS | 3.x |
| 状態管理 | Zustand | 5.x |
| データフェッチ | TanStack Query (React Query) | 5.x |
| フォーム | React Hook Form + Zod | — |
| リアルタイム | Socket.IO Client | 4.x |
| 日付処理 | date-fns | 3.x |
| アイコン | Lucide React | — |
| 通知 | Sonner (Toast) | — |
| グラフ | Recharts | — |
| Excel | SheetJS (xlsx) | — |
| テスト | Vitest + Testing Library | — |

---

## 2. ディレクトリ構成

```
frontend/
├── public/
│   ├── favicon.ico
│   ├── manifest.json              # PWA マニフェスト
│   └── sw.js                      # Service Worker (Push通知用)
├── src/
│   ├── app/                       # App Router
│   │   ├── layout.tsx             # ルートレイアウト
│   │   ├── not-found.tsx          # 404 ページ
│   │   ├── error.tsx              # エラーバウンダリ
│   │   ├── loading.tsx            # グローバルローディング
│   │   │
│   │   ├── (auth)/                # 認証グループ（レイアウトなし）
│   │   │   ├── layout.tsx         # 認証レイアウト（センタリング）
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (main)/                # メインアプリグループ
│   │   │   ├── layout.tsx         # メインレイアウト（ナビ + サイドバー）
│   │   │   ├── page.tsx           # タイムライン（ホーム）
│   │   │   ├── announcements/
│   │   │   │   └── page.tsx
│   │   │   ├── surveys/
│   │   │   │   ├── page.tsx       # アンケート一覧
│   │   │   │   ├── create/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── my-page/
│   │   │   │   └── page.tsx
│   │   │   └── profile/
│   │   │       └── [id]/
│   │   │           └── page.tsx
│   │   │
│   │   └── admin/                 # 管理者グループ
│   │       ├── layout.tsx         # 管理者レイアウト
│   │       ├── page.tsx           # ダッシュボード
│   │       ├── users/
│   │       │   └── page.tsx
│   │       ├── permissions/
│   │       │   └── page.tsx
│   │       └── surveys/
│   │           └── [id]/
│   │               └── results/
│   │                   └── page.tsx
│   │
│   ├── components/                # コンポーネント
│   │   ├── ui/                    # shadcn/ui ベースコンポーネント
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── input.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── calendar.tsx
│   │   │   ├── pagination.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/                # レイアウトコンポーネント
│   │   │   ├── header.tsx         # ヘッダー（ロゴ + 通知 + ユーザーメニュー）
│   │   │   ├── sidebar.tsx        # サイドバー（デスクトップ）
│   │   │   ├── bottom-nav.tsx     # ボトムナビ（モバイル）
│   │   │   ├── breadcrumb.tsx     # パンくずリスト
│   │   │   └── main-layout.tsx    # メインレイアウトコンテナ
│   │   │
│   │   ├── post/                  # 投稿系コンポーネント
│   │   │   ├── post-card.tsx      # 投稿カード
│   │   │   ├── post-list.tsx      # 投稿一覧
│   │   │   ├── create-post.tsx    # 投稿作成フォーム
│   │   │   ├── edit-post.tsx      # 投稿編集フォーム
│   │   │   ├── post-actions.tsx   # いいね・コメントアクション
│   │   │   ├── comment-list.tsx   # コメント一覧
│   │   │   ├── comment-form.tsx   # コメント入力フォーム
│   │   │   ├── date-group-header.tsx  # 日付グループヘッダー
│   │   │   ├── post-calendar.tsx  # 投稿カレンダー（日付別件数表示）
│   │   │   └── file-preview.tsx   # ファイルプレビュー
│   │   │
│   │   ├── announcement/          # お知らせ系コンポーネント
│   │   │   ├── announcement-card.tsx
│   │   │   ├── announcement-list.tsx
│   │   │   ├── announcement-banner.tsx  # ピン留めお知らせバナー
│   │   │   └── announcement-form.tsx
│   │   │
│   │   ├── survey/                # アンケート系コンポーネント
│   │   │   ├── survey-card.tsx
│   │   │   ├── survey-list.tsx
│   │   │   ├── survey-form.tsx    # アンケート作成フォーム
│   │   │   ├── survey-respond.tsx # アンケート回答フォーム
│   │   │   ├── survey-results.tsx # 結果表示（グラフ）
│   │   │   └── question-field.tsx # 質問フィールド（種別ごと）
│   │   │
│   │   ├── notification/          # 通知系コンポーネント
│   │   │   ├── notification-bell.tsx   # 通知ベルアイコン（未読バッジ付き）
│   │   │   ├── notification-dropdown.tsx # 通知ドロップダウン
│   │   │   ├── notification-item.tsx   # 通知アイテム
│   │   │   └── notification-toast.tsx  # リアルタイム通知トースト
│   │   │
│   │   └── shared/                # 共有コンポーネント
│   │       ├── user-avatar.tsx    # ユーザーアバター
│   │       ├── user-name.tsx      # ユーザー名（リンク付き）
│   │       ├── empty-state.tsx    # 空状態表示
│   │       ├── loading-spinner.tsx # ローディングスピナー
│   │       ├── error-message.tsx  # エラーメッセージ
│   │       ├── confirm-dialog.tsx # 確認ダイアログ
│   │       ├── file-upload.tsx    # ファイルアップロード
│   │       ├── rich-text-editor.tsx # リッチテキストエディタ
│   │       └── date-picker.tsx    # 日付ピッカー
│   │
│   ├── hooks/                     # カスタムフック
│   │   ├── use-auth.ts            # 認証フック
│   │   ├── use-posts.ts           # 投稿データフック
│   │   ├── use-announcements.ts   # お知らせデータフック
│   │   ├── use-surveys.ts         # アンケートデータフック
│   │   ├── use-notifications.ts   # 通知データフック
│   │   ├── use-users.ts           # ユーザーデータフック
│   │   ├── use-web-socket.ts      # WebSocket接続フック
│   │   ├── use-media-query.ts     # レスポンシブ判定フック
│   │   ├── use-infinite-scroll.ts # 無限スクロールフック
│   │   └── use-file-upload.ts     # ファイルアップロードフック
│   │
│   ├── stores/                    # Zustand ストア
│   │   ├── auth-store.ts          # 認証状態
│   │   ├── notification-store.ts  # 通知状態
│   │   └── ui-store.ts            # UI状態（サイドバー開閉等）
│   │
│   ├── lib/                       # ユーティリティ
│   │   ├── api-client.ts          # API クライアント（fetch ラッパー）
│   │   ├── socket-client.ts       # Socket.IO クライアント
│   │   ├── utils.ts               # 汎用ユーティリティ
│   │   ├── cn.ts                  # Tailwind クラス結合
│   │   ├── format-date.ts         # 日付フォーマット
│   │   └── constants.ts           # 定数
│   │
│   ├── types/                     # 型定義
│   │   └── index.ts               # shared-types からの再エクスポート
│   │
│   └── styles/
│       └── globals.css            # Tailwind + グローバルスタイル
│
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 3. App Router 設計

### 3.1 ルートグループ

| グループ | パス | レイアウト | 説明 |
|---------|------|----------|------|
| `(auth)` | `/login` | 認証レイアウト（中央配置） | 未認証ユーザー用 |
| `(main)` | `/`, `/announcements`, `/surveys`, etc. | メインレイアウト（ヘッダー + サイドバー） | 認証済みユーザー用 |
| `admin` | `/admin/*` | 管理者レイアウト（メイン + 管理メニュー） | 管理者用 |

### 3.2 レイアウト構成

```typescript
// app/layout.tsx (ルートレイアウト)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="font-sans">
        <QueryProvider>
          <AuthProvider>
            <WebSocketProvider>
              {children}
              <Toaster />
            </WebSocketProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
```

```typescript
// app/(main)/layout.tsx (メインレイアウト)
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen">
        <Sidebar className="hidden md:flex" />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <Breadcrumb />
            {children}
          </main>
        </div>
        <BottomNav className="md:hidden" />
      </div>
    </AuthGuard>
  );
}
```

---

## 4. 状態管理

### 4.1 Zustand ストア

#### auth-store.ts

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (data: LoginResponse) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      setAuth: (data) =>
        set({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
          isAuthenticated: true,
        }),
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),
      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        }),
    }),
    { name: 'auth-storage' },
  ),
);
```

#### notification-store.ts

```typescript
interface NotificationState {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  incrementUnreadCount: () => void;
  decrementUnreadCount: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
  incrementUnreadCount: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  decrementUnreadCount: () => set((state) => ({
    unreadCount: Math.max(0, state.unreadCount - 1),
  })),
}));
```

#### ui-store.ts

```typescript
interface UiState {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
}));
```

---

## 5. データフェッチ

### 5.1 API クライアント

```typescript
// lib/api-client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const { accessToken, refreshToken, setTokens, logout } = useAuthStore.getState();

    const headers: HeadersInit = {
      ...options.headers,
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // multipart/form-data の場合は Content-Type を設定しない（ブラウザが自動設定）
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    let response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // 401 の場合はトークンリフレッシュを試行
    if (response.status === 401 && refreshToken) {
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (refreshResponse.ok) {
        const { data } = await refreshResponse.json();
        setTokens(data.accessToken, data.refreshToken);

        // リフレッシュ後にリトライ
        headers['Authorization'] = `Bearer ${data.accessToken}`;
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers,
        });
      } else {
        logout();
        window.location.href = '/login';
        throw new Error('セッションが期限切れです');
      }
    }

    const result = await response.json();

    if (!result.success) {
      throw new ApiError(result.error);
    }

    return result;
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint);
  }

  post<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  patch<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
```

### 5.2 TanStack Query フック

```typescript
// hooks/use-posts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function usePosts(params?: PostListParams) {
  return useQuery({
    queryKey: ['posts', params],
    queryFn: () => apiClient.get<PaginatedResponse<Post>>(`/posts?${toQueryString(params)}`),
  });
}

export function usePost(id: string) {
  return useQuery({
    queryKey: ['posts', id],
    queryFn: () => apiClient.get<Post>(`/posts/${id}`),
    enabled: !!id,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FormData) => apiClient.post<Post>('/posts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => apiClient.post(`/posts/${postId}/like`),
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

export function usePostDateCounts(year: number, month: number) {
  return useQuery({
    queryKey: ['posts', 'dates', year, month],
    queryFn: () => apiClient.get<PostDateCount[]>(`/posts/dates?year=${year}&month=${month}`),
  });
}
```

---

## 6. リアルタイム通信

### 6.1 Socket.IO クライアント

```typescript
// lib/socket-client.ts
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth-store';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const { accessToken } = useAuthStore.getState();

    socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000', {
      path: '/notifications',
      auth: { token: `Bearer ${accessToken}` },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
```

### 6.2 WebSocket フック

```typescript
// hooks/use-web-socket.ts
import { useEffect, useRef } from 'react';
import { getSocket, disconnectSocket } from '@/lib/socket-client';
import { useNotificationStore } from '@/stores/notification-store';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useWebSocket() {
  const queryClient = useQueryClient();
  const { setUnreadCount, incrementUnreadCount } = useNotificationStore();
  const socketRef = useRef(getSocket());

  useEffect(() => {
    const socket = socketRef.current;
    socket.connect();

    socket.on('notification', (notification: Notification) => {
      incrementUnreadCount();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast(notification.title, { description: notification.message });
    });

    socket.on('unread-count', ({ count }: { count: number }) => {
      setUnreadCount(count);
    });

    socket.on('post:liked', ({ postId, likeCount }) => {
      queryClient.setQueriesData({ queryKey: ['posts'] }, (old: any) => {
        if (!old) return old;
        // 投稿一覧のlikeCountをリアルタイム更新
        return updatePostInList(old, postId, { likeCount });
      });
    });

    socket.on('post:commented', ({ postId, commentCount }) => {
      queryClient.setQueriesData({ queryKey: ['posts'] }, (old: any) => {
        if (!old) return old;
        return updatePostInList(old, postId, { commentCount });
      });
    });

    socket.on('announcement:new', () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast('新着お知らせ', { description: '新しいお知らせが投稿されました' });
    });

    return () => {
      socket.off('notification');
      socket.off('unread-count');
      socket.off('post:liked');
      socket.off('post:commented');
      socket.off('announcement:new');
      disconnectSocket();
    };
  }, []);

  return socketRef.current;
}
```

---

## 7. カスタムフック

### 7.1 useAuth

```typescript
// hooks/use-auth.ts
export function useAuth() {
  const { user, isAuthenticated, setAuth, logout: storeLogout } = useAuthStore();
  const router = useRouter();

  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => apiClient.post<LoginResponse>('/auth/login', data),
    onSuccess: ({ data }) => {
      setAuth(data);
      router.push('/');
    },
  });

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout', {
        refreshToken: useAuthStore.getState().refreshToken,
      });
    } finally {
      storeLogout();
      disconnectSocket();
      router.push('/login');
    }
  };

  return {
    user,
    isAuthenticated,
    login: loginMutation.mutate,
    loginLoading: loginMutation.isPending,
    loginError: loginMutation.error,
    logout,
  };
}
```

### 7.2 useMediaQuery

```typescript
// hooks/use-media-query.ts
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

// 便利フック
export const useIsMobile = () => useMediaQuery('(max-width: 767px)');
export const useIsTablet = () => useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');
```

---

## 8. 認証ガード

```typescript
// components/shared/auth-guard.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null; // またはローディング表示
  }

  return <>{children}</>;
}
```

```typescript
// components/shared/permission-guard.tsx
'use client';

import { useAuthStore } from '@/stores/auth-store';

interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({ permission, children, fallback }: PermissionGuardProps) {
  const { user } = useAuthStore();
  const hasPermission = user?.permissions?.includes(permission) ||
                        user?.permissions?.includes('admin');

  if (!hasPermission) {
    return fallback || null;
  }

  return <>{children}</>;
}
```

---

## 9. エラーハンドリング

### グローバルエラーバウンダリ

```typescript
// app/error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-bold mb-4">エラーが発生しました</h2>
      <p className="text-gray-600 mb-6">{error.message}</p>
      <button onClick={reset} className="btn btn-primary">
        再試行
      </button>
    </div>
  );
}
```

### API エラークラス

```typescript
// lib/api-error.ts
export class ApiError extends Error {
  code: string;
  details?: ValidationError[];

  constructor(error: { code: string; message: string; details?: ValidationError[] }) {
    super(error.message);
    this.code = error.code;
    this.details = error.details;
  }
}
```
