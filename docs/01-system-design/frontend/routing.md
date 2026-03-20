# ルーティング設計 (Routing)

> コープネット - Next.js 15 App Router ルート構成

## 1. ルート一覧

| # | パス | ページ名 | グループ | 認証 | 権限 | パンくず |
|---|------|---------|---------|------|------|---------|
| 1 | `/` | タイムライン | (main) | Yes | — | ホーム |
| 2 | `/login` | ログイン | (auth) | No | — | — |
| 3 | `/announcements` | お知らせ一覧 | (main) | Yes | — | ホーム > お知らせ |
| 4 | `/surveys` | アンケート一覧 | (main) | Yes | — | ホーム > アンケート |
| 5 | `/surveys/[id]` | アンケート詳細・回答 | (main) | Yes | — | ホーム > アンケート > {タイトル} |
| 6 | `/surveys/create` | アンケート作成 | (main) | Yes | manage_surveys | ホーム > アンケート > 新規作成 |
| 7 | `/my-page` | マイページ | (main) | Yes | — | ホーム > マイページ |
| 8 | `/profile/[id]` | ユーザープロフィール | (main) | Yes | — | ホーム > {表示名} |
| 9 | `/admin` | 管理者ダッシュボード | admin | Yes | view_admin_dashboard | 管理者 > ダッシュボード |
| 10 | `/admin/users` | ユーザー管理 | admin | Yes | manage_users | 管理者 > ユーザー管理 |
| 11 | `/admin/permissions` | 権限管理 | admin | Yes | admin | 管理者 > 権限管理 |
| 12 | `/admin/surveys/[id]/results` | アンケート結果 | admin | Yes | manage_surveys | 管理者 > アンケート > {タイトル} > 結果 |

---

## 2. ファイル構成

```
app/
├── layout.tsx                              # ルートレイアウト
├── not-found.tsx                           # 404 ページ
├── error.tsx                               # グローバルエラー
├── loading.tsx                             # グローバルローディング
│
├── (auth)/                                 # 認証ルートグループ
│   ├── layout.tsx                          # センタリングレイアウト
│   └── login/
│       └── page.tsx                        # ログインページ
│
├── (main)/                                 # メインルートグループ
│   ├── layout.tsx                          # メインレイアウト（ナビ+サイドバー）
│   ├── page.tsx                            # / → タイムライン
│   ├── announcements/
│   │   └── page.tsx                        # /announcements → お知らせ一覧
│   ├── surveys/
│   │   ├── page.tsx                        # /surveys → アンケート一覧
│   │   ├── create/
│   │   │   └── page.tsx                    # /surveys/create → アンケート作成
│   │   └── [id]/
│   │       └── page.tsx                    # /surveys/:id → アンケート詳細・回答
│   ├── my-page/
│   │   └── page.tsx                        # /my-page → マイページ
│   └── profile/
│       └── [id]/
│           └── page.tsx                    # /profile/:id → ユーザープロフィール
│
└── admin/                                  # 管理者ルートグループ
    ├── layout.tsx                          # 管理者レイアウト
    ├── page.tsx                            # /admin → ダッシュボード
    ├── users/
    │   └── page.tsx                        # /admin/users → ユーザー管理
    ├── permissions/
    │   └── page.tsx                        # /admin/permissions → 権限管理
    └── surveys/
        └── [id]/
            └── results/
                └── page.tsx               # /admin/surveys/:id/results → 結果
```

---

## 3. パンくずリスト定義

### 3.1 パンくず設定

```typescript
// lib/breadcrumb-config.ts

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export const breadcrumbConfig: Record<string, BreadcrumbItem[]> = {
  '/': [
    { label: 'ホーム' },
  ],
  '/announcements': [
    { label: 'ホーム', href: '/' },
    { label: 'お知らせ' },
  ],
  '/surveys': [
    { label: 'ホーム', href: '/' },
    { label: 'アンケート' },
  ],
  '/surveys/create': [
    { label: 'ホーム', href: '/' },
    { label: 'アンケート', href: '/surveys' },
    { label: '新規作成' },
  ],
  '/surveys/[id]': [
    { label: 'ホーム', href: '/' },
    { label: 'アンケート', href: '/surveys' },
    { label: '{title}' },  // 動的に置換
  ],
  '/my-page': [
    { label: 'ホーム', href: '/' },
    { label: 'マイページ' },
  ],
  '/profile/[id]': [
    { label: 'ホーム', href: '/' },
    { label: '{displayName}' },  // 動的に置換
  ],
  '/admin': [
    { label: '管理者', href: '/admin' },
    { label: 'ダッシュボード' },
  ],
  '/admin/users': [
    { label: '管理者', href: '/admin' },
    { label: 'ユーザー管理' },
  ],
  '/admin/permissions': [
    { label: '管理者', href: '/admin' },
    { label: '権限管理' },
  ],
  '/admin/surveys/[id]/results': [
    { label: '管理者', href: '/admin' },
    { label: 'アンケート', href: '/surveys' },
    { label: '{title}' },  // 動的に置換
    { label: '結果' },
  ],
};
```

### 3.2 パンくずコンポーネント

```typescript
// components/layout/breadcrumb.tsx
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { breadcrumbConfig } from '@/lib/breadcrumb-config';

export function Breadcrumb({ dynamicLabels }: { dynamicLabels?: Record<string, string> }) {
  const pathname = usePathname();
  const items = resolveBreadcrumb(pathname, dynamicLabels);

  if (!items || items.length <= 1) return null;

  return (
    <nav aria-label="パンくずリスト" className="mb-4">
      <ol className="flex items-center gap-1 text-sm text-gray-500">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="h-3 w-3" />}
            {index === 0 && <Home className="h-3 w-3 mr-1" />}
            {item.href && index < items.length - 1 ? (
              <Link href={item.href} className="hover:text-blue-600 transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-900 font-medium">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
```

---

## 4. ナビゲーション構成

### 4.1 サイドバーナビゲーション（デスクトップ）

```typescript
const mainNavItems = [
  { label: 'タイムライン', href: '/', icon: Home },
  { label: 'お知らせ', href: '/announcements', icon: Bell },
  { label: 'アンケート', href: '/surveys', icon: ClipboardList },
  { label: 'マイページ', href: '/my-page', icon: User },
];

const adminNavItems = [
  { label: 'ダッシュボード', href: '/admin', icon: LayoutDashboard },
  { label: 'ユーザー管理', href: '/admin/users', icon: Users },
  { label: '権限管理', href: '/admin/permissions', icon: Shield },
];
```

### 4.2 ボトムナビゲーション（モバイル）

```typescript
const bottomNavItems = [
  { label: 'ホーム', href: '/', icon: Home },
  { label: 'お知らせ', href: '/announcements', icon: Bell },
  { label: '投稿', action: 'openCreatePost', icon: PlusCircle },  // モーダルを開く
  { label: 'アンケート', href: '/surveys', icon: ClipboardList },
  { label: 'マイページ', href: '/my-page', icon: User },
];
```

---

## 5. 認証・認可ルーティング

### 5.1 認証ガード

```typescript
// app/(main)/layout.tsx
import { AuthGuard } from '@/components/shared/auth-guard';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      {/* ... */}
    </AuthGuard>
  );
}
```

### 5.2 権限ガード

```typescript
// app/admin/layout.tsx
import { AuthGuard } from '@/components/shared/auth-guard';
import { PermissionGuard } from '@/components/shared/permission-guard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <PermissionGuard
        permission="view_admin_dashboard"
        fallback={<AccessDenied />}
      >
        {/* 管理者レイアウト */}
      </PermissionGuard>
    </AuthGuard>
  );
}
```

### 5.3 リダイレクトルール

| 条件 | リダイレクト先 |
|------|-------------|
| 未認証ユーザーが認証必須ページにアクセス | `/login` |
| 認証済みユーザーが `/login` にアクセス | `/` |
| 権限のないユーザーが管理者ページにアクセス | `/`（アクセス拒否表示） |
| 存在しないパスにアクセス | 404 ページ |

---

## 6. ページ遷移マトリクス

```
ログイン ──→ タイムライン（ホーム）
                │
                ├──→ 投稿作成（モーダル/ドロワー）
                ├──→ 投稿詳細（コメント展開）
                │
                ├──→ お知らせ一覧
                │
                ├──→ アンケート一覧
                │     ├──→ アンケート詳細・回答
                │     └──→ アンケート作成（権限あり）
                │
                ├──→ マイページ（自分のプロフィール + 統計）
                │
                ├──→ ユーザープロフィール（他人）
                │
                └──→ 管理者エリア（権限あり）
                      ├──→ ダッシュボード
                      ├──→ ユーザー管理
                      ├──→ 権限管理
                      └──→ アンケート結果
```

---

## 7. URL 設計の補足

### 7.1 クエリパラメータ

| ページ | パラメータ | 用途 |
|--------|----------|------|
| `/` | `?date=2026-03-20` | 特定日の投稿にスクロール |
| `/surveys` | `?status=active` | アクティブなアンケートでフィルタ |
| `/admin/users` | `?search=田中&department=営業部` | ユーザー検索 |

### 7.2 動的ルートパラメータ

| パス | パラメータ | 型 | 例 |
|------|----------|------|-----|
| `/surveys/[id]` | `id` | UUID | `/surveys/550e8400-e29b-41d4-a716-446655440000` |
| `/profile/[id]` | `id` | UUID | `/profile/660e8400-e29b-41d4-a716-446655440000` |
| `/admin/surveys/[id]/results` | `id` | UUID | `/admin/surveys/770e8400-.../results` |
