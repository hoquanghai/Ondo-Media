# Phase 08 — Admin Panel

## Objectives

- 管理者専用レイアウト (管理用サイドバー付き) を構築する
- ダッシュボード (システム統計) を実装する
- ユーザー管理 (一覧・作成・有効化/無効化) を実装する
- 権限管理 (ユーザー x 権限のマトリクスビュー) を実装する
- アンケート結果閲覧 (グラフ表示・Excel エクスポート) を実装する
- 全管理ページに管理者権限チェックを適用する

## Prerequisites

- Phase 01〜07 完了
- バックエンド API: `GET /api/admin/stats`, `GET /api/admin/users`, `POST /api/admin/users`, `PATCH /api/admin/users/:id`, `GET /api/admin/permissions`, `PATCH /api/admin/permissions`, `GET /api/admin/surveys/:id/results`, `GET /api/admin/surveys/:id/export`

## Tasks

### 1. 管理者関連の型定義

**File: `src/types/admin.ts`**

```ts
export interface AdminStats {
  total_users: number;
  active_users: number;
  posts_today: number;
  posts_this_week: number;
  active_surveys: number;
  total_announcements: number;
}

export interface AdminUser {
  id: string;
  username: string;
  display_name: string;
  email: string;
  department: string;
  position: string;
  role: "admin" | "user";
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface CreateUserRequest {
  username: string;
  display_name: string;
  email: string;
  department: string;
  position: string;
  password: string;
  role: "admin" | "user";
}

export interface Permission {
  id: string;
  name: string;
  description: string;
}

export interface UserPermission {
  user_id: string;
  username: string;
  display_name: string;
  permissions: string[]; // permission id の配列
}

export interface PermissionMatrix {
  permissions: Permission[];
  users: UserPermission[];
}
```

### 2. 管理者レイアウト

**File: `src/app/admin/layout.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Shield,
  ClipboardList,
  ArrowLeft,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { AuthGuard } from "@/components/auth/auth-guard";
import { cn } from "@/lib/utils";

const adminNavItems = [
  { href: "/admin", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/admin/users", label: "ユーザー管理", icon: Users },
  { href: "/admin/permissions", label: "権限管理", icon: Shield },
  { href: "/admin/surveys", label: "アンケート結果", icon: ClipboardList },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/");
    }
  }, [user, router]);

  if (user?.role !== "admin") return null;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background flex">
        {/* Admin Sidebar */}
        <aside className="w-64 h-screen bg-surface border-r border-border flex flex-col fixed left-0 top-0 z-40">
          <div className="h-16 flex items-center px-6 border-b border-border">
            <span className="text-xl font-bold text-primary">管理パネル</span>
          </div>

          <nav className="flex-1 py-4 px-3 space-y-1">
            {adminNavItems.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              メインに戻る
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="ml-64 flex-1 p-6">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
```

### 3. ダッシュボード

**File: `src/app/admin/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Users, FileText, ClipboardList, Bell } from "lucide-react";
import { api } from "@/lib/api";
import { StatCard } from "@/components/my-page/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminStats } from "@/types/admin";

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get<AdminStats>("/admin/stats").then((data) => {
      setStats(data);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <div>
        <h1 className="text-lg font-bold mb-6">ダッシュボード</h1>
        <div className="grid grid-cols-2 desktop:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-lg font-bold mb-6">ダッシュボード</h1>

      {stats && (
        <div className="grid grid-cols-2 desktop:grid-cols-3 gap-4">
          <StatCard label="総ユーザー数" value={stats.total_users} icon={Users} />
          <StatCard label="アクティブユーザー" value={stats.active_users} icon={Users} color="text-green-500" />
          <StatCard label="今日の投稿" value={stats.posts_today} icon={FileText} />
          <StatCard label="今週の投稿" value={stats.posts_this_week} icon={FileText} color="text-blue-500" />
          <StatCard label="実施中のアンケート" value={stats.active_surveys} icon={ClipboardList} color="text-purple-500" />
          <StatCard label="お知らせ総数" value={stats.total_announcements} icon={Bell} color="text-orange-500" />
        </div>
      )}
    </div>
  );
}
```

### 4. ユーザー管理ページ

**File: `src/app/admin/users/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Plus, Search, UserCheck, UserX, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { AdminUser, CreateUserRequest } from "@/types/admin";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    const data = await api.get<{ users: AdminUser[] }>("/admin/users");
    setUsers(data.users);
    setIsLoading(false);
  };

  const toggleActive = async (userId: string, isActive: boolean) => {
    await api.patch(`/admin/users/${userId}`, { is_active: !isActive });
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, is_active: !isActive } : u))
    );
  };

  const filteredUsers = users.filter(
    (u) =>
      u.display_name.includes(search) ||
      u.username.includes(search) ||
      u.department.includes(search)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold">ユーザー管理</h1>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-1">
              <Plus className="h-4 w-4" />
              ユーザー作成
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新しいユーザーを作成</DialogTitle>
            </DialogHeader>
            <CreateUserForm
              onSuccess={() => {
                setShowCreateDialog(false);
                fetchUsers();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ユーザーを検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users Table */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">ユーザー名</th>
              <th className="text-left p-3 font-medium">表示名</th>
              <th className="text-left p-3 font-medium">部署</th>
              <th className="text-left p-3 font-medium">役割</th>
              <th className="text-left p-3 font-medium">状態</th>
              <th className="text-left p-3 font-medium">最終ログイン</th>
              <th className="text-left p-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-t hover:bg-muted/30">
                <td className="p-3">{user.username}</td>
                <td className="p-3">{user.display_name}</td>
                <td className="p-3">{user.department}</td>
                <td className="p-3">
                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                    {user.role === "admin" ? "管理者" : "一般"}
                  </Badge>
                </td>
                <td className="p-3">
                  <Badge variant={user.is_active ? "default" : "destructive"}>
                    {user.is_active ? "有効" : "無効"}
                  </Badge>
                </td>
                <td className="p-3 text-muted-foreground">
                  {user.last_login_at
                    ? format(new Date(user.last_login_at), "yyyy/MM/dd HH:mm", { locale: ja })
                    : "—"}
                </td>
                <td className="p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActive(user.id, user.is_active)}
                    className={user.is_active ? "text-destructive" : "text-green-600"}
                  >
                    {user.is_active ? (
                      <>
                        <UserX className="h-4 w-4 mr-1" />
                        無効化
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-4 w-4 mr-1" />
                        有効化
                      </>
                    )}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Create User Form ---

function CreateUserForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState<CreateUserRequest>({
    username: "",
    display_name: "",
    email: "",
    department: "",
    position: "",
    password: "",
    role: "user",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("/admin/users", form);
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  const update = (field: keyof CreateUserRequest, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">ユーザー名</label>
          <Input value={form.username} onChange={(e) => update("username", e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-medium">表示名</label>
          <Input value={form.display_name} onChange={(e) => update("display_name", e.target.value)} required />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">メールアドレス</label>
        <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">部署</label>
          <Input value={form.department} onChange={(e) => update("department", e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-medium">役職</label>
          <Input value={form.position} onChange={(e) => update("position", e.target.value)} required />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">パスワード</label>
        <Input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} required />
      </div>
      <div>
        <label className="text-sm font-medium">役割</label>
        <select
          className="w-full border rounded-md px-3 py-2 text-sm"
          value={form.role}
          onChange={(e) => update("role", e.target.value)}
        >
          <option value="user">一般</option>
          <option value="admin">管理者</option>
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          作成
        </Button>
      </div>
    </form>
  );
}
```

### 5. 権限管理ページ

**File: `src/app/admin/permissions/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import type { PermissionMatrix } from "@/types/admin";

export default function AdminPermissionsPage() {
  const [matrix, setMatrix] = useState<PermissionMatrix | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get<PermissionMatrix>("/admin/permissions").then((data) => {
      setMatrix(data);
      setIsLoading(false);
    });
  }, []);

  const togglePermission = async (userId: string, permissionId: string, hasPermission: boolean) => {
    // オプティミスティック UI
    setMatrix((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        users: prev.users.map((u) =>
          u.user_id === userId
            ? {
                ...u,
                permissions: hasPermission
                  ? u.permissions.filter((p) => p !== permissionId)
                  : [...u.permissions, permissionId],
              }
            : u
        ),
      };
    });

    try {
      await api.patch("/admin/permissions", {
        user_id: userId,
        permission_id: permissionId,
        action: hasPermission ? "revoke" : "grant",
      });
    } catch {
      // ロールバック — 再取得
      const data = await api.get<PermissionMatrix>("/admin/permissions");
      setMatrix(data);
    }
  };

  if (isLoading) {
    return (
      <div>
        <h1 className="text-lg font-bold mb-6">権限管理</h1>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!matrix) return null;

  return (
    <div>
      <h1 className="text-lg font-bold mb-6">権限管理</h1>

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium sticky left-0 bg-muted/50 min-w-[180px]">
                ユーザー
              </th>
              {matrix.permissions.map((perm) => (
                <th key={perm.id} className="text-center p-3 font-medium min-w-[120px]">
                  <div>{perm.name}</div>
                  <div className="text-xs font-normal text-muted-foreground">
                    {perm.description}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.users.map((user) => (
              <tr key={user.user_id} className="border-t hover:bg-muted/30">
                <td className="p-3 sticky left-0 bg-surface font-medium">
                  <div>{user.display_name}</div>
                  <div className="text-xs text-muted-foreground">{user.username}</div>
                </td>
                {matrix.permissions.map((perm) => {
                  const has = user.permissions.includes(perm.id);
                  return (
                    <td key={perm.id} className="text-center p-3">
                      <button
                        onClick={() => togglePermission(user.user_id, perm.id, has)}
                        className={`h-6 w-6 rounded border-2 inline-flex items-center justify-center transition-colors ${
                          has
                            ? "bg-primary border-primary text-white"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {has && (
                          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### 6. アンケート結果ページ (管理者向け)

**File: `src/app/admin/surveys/[id]/results/page.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { useSurveyStore } from "@/stores/survey-store";
import { SurveyResults } from "@/components/surveys/survey-results";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { env } from "@/lib/env";

export default function AdminSurveyResultsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { results, isLoading, fetchResults } = useSurveyStore();

  useEffect(() => {
    fetchResults(id);
  }, [id, fetchResults]);

  const handleExport = () => {
    const token = localStorage.getItem("access_token");
    window.open(
      `${env.apiBaseUrl}/admin/surveys/${id}/export?token=${token}`,
      "_blank"
    );
  };

  if (isLoading || !results) {
    return (
      <div>
        <Skeleton className="h-8 w-1/3 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <Button variant="ghost" size="sm" className="mb-4 gap-1" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" />
        戻る
      </Button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold">{results.title} — 結果</h1>
        <Button variant="outline" className="gap-1" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Excelエクスポート
        </Button>
      </div>

      <SurveyResults results={results} />
    </div>
  );
}
```

### 7. アンケート一覧ページ (管理者向け)

**File: `src/app/admin/surveys/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { BarChart3 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Survey } from "@/types/survey";

export default function AdminSurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);

  useEffect(() => {
    api.get<{ surveys: Survey[] }>("/admin/surveys").then((data) => {
      setSurveys(data.surveys);
    });
  }, []);

  return (
    <div>
      <h1 className="text-lg font-bold mb-6">アンケート結果</h1>

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">タイトル</th>
              <th className="text-left p-3 font-medium">回答数</th>
              <th className="text-left p-3 font-medium">作成日</th>
              <th className="text-left p-3 font-medium">状態</th>
              <th className="text-left p-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {surveys.map((survey) => {
              const isExpired = survey.expires_at && new Date(survey.expires_at) < new Date();
              return (
                <tr key={survey.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-medium">{survey.title}</td>
                  <td className="p-3">{survey.response_count}件</td>
                  <td className="p-3 text-muted-foreground">
                    {format(new Date(survey.created_at), "yyyy/MM/dd", { locale: ja })}
                  </td>
                  <td className="p-3">
                    <Badge variant={isExpired ? "secondary" : "default"}>
                      {isExpired ? "終了" : "実施中"}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Button asChild variant="ghost" size="sm" className="gap-1">
                      <Link href={`/admin/surveys/${survey.id}/results`}>
                        <BarChart3 className="h-4 w-4" />
                        結果を見る
                      </Link>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

## Verification Checklist

- [ ] `/admin` に管理者のみアクセスできる (一般ユーザーは `/` にリダイレクト)
- [ ] 管理用サイドバーにナビゲーション項目が表示される (ダッシュボード、ユーザー管理、権限管理、アンケート結果)
- [ ] 「メインに戻る」リンクでメインアプリに戻れる
- [ ] ダッシュボード: 6 つの統計カードが表示される
- [ ] ユーザー管理:
  - [ ] ユーザー一覧テーブルが表示される
  - [ ] 検索フィルターが動作する
  - [ ] ユーザー作成ダイアログからユーザーを作成できる
  - [ ] 有効化/無効化トグルが動作する
- [ ] 権限管理:
  - [ ] ユーザー x 権限のマトリクスが表示される
  - [ ] チェックボックスで権限のオン/オフを切り替えられる
- [ ] アンケート結果:
  - [ ] アンケート一覧が表示される
  - [ ] 「結果を見る」でグラフ付き結果が表示される
  - [ ] 「Excelエクスポート」でファイルがダウンロードされる
- [ ] すべてのテキストが日本語
- [ ] TypeScript エラーがない

## Files Created / Modified

| ファイル | 操作 | 概要 |
|---|---|---|
| `src/types/admin.ts` | 作成 | 管理者関連の型定義 |
| `src/app/admin/layout.tsx` | 作成 | 管理者レイアウト (専用サイドバー) |
| `src/app/admin/page.tsx` | 作成 | 管理ダッシュボード |
| `src/app/admin/users/page.tsx` | 作成 | ユーザー管理 (CRUD・有効化/無効化) |
| `src/app/admin/permissions/page.tsx` | 作成 | 権限管理 (マトリクスビュー) |
| `src/app/admin/surveys/page.tsx` | 作成 | アンケート一覧 (管理者向け) |
| `src/app/admin/surveys/[id]/results/page.tsx` | 作成 | アンケート結果 (グラフ・エクスポート) |
