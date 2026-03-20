"use client";

import { useEffect, useState } from "react";
import { Plus, Search, UserCheck, UserX, Loader2 } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminUser, CreateUserRequest } from "@/types/admin";
import { formatRelativeTime } from "@/lib/utils";

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
    try {
      const data = await api.get<{ users: AdminUser[] }>("/admin/users");
      setUsers(data.users);
    } catch {
      // ignore
    }
    setIsLoading(false);
  };

  const toggleActive = async (shainBangou: number, isActive: boolean) => {
    await api.patch(`/admin/users/${shainBangou}`, { isActive: !isActive });
    setUsers((prev) =>
      prev.map((u) =>
        u.shainBangou === shainBangou ? { ...u, isActive: !isActive } : u
      )
    );
  };

  const filteredUsers = users.filter(
    (u) =>
      u.shainName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.shainGroup.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">ユーザー管理</h1>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">ユーザー管理</h1>
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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
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
          <thead className="bg-[hsl(var(--muted)/0.5)]">
            <tr>
              <th className="text-left p-3 font-medium">社員番号</th>
              <th className="text-left p-3 font-medium">氏名</th>
              <th className="text-left p-3 font-medium">メールアドレス</th>
              <th className="text-left p-3 font-medium">部署</th>
              <th className="text-left p-3 font-medium">役職</th>
              <th className="text-left p-3 font-medium">ステータス</th>
              <th className="text-left p-3 font-medium">最終ログイン</th>
              <th className="text-left p-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr
                key={user.shainBangou}
                className="border-t hover:bg-[hsl(var(--muted)/0.3)]"
              >
                <td className="p-3">{user.shainBangou}</td>
                <td className="p-3">{user.shainName}</td>
                <td className="p-3">{user.email}</td>
                <td className="p-3">{user.shainGroup}</td>
                <td className="p-3">{user.shainYaku}</td>
                <td className="p-3">
                  <Badge
                    variant={user.isActive ? "default" : "destructive"}
                  >
                    {user.isActive ? "アクティブ" : "無効"}
                  </Badge>
                </td>
                <td className="p-3 text-[hsl(var(--muted-foreground))]">
                  {user.lastLoginAt
                    ? formatRelativeTime(user.lastLoginAt)
                    : "---"}
                </td>
                <td className="p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActive(user.shainBangou, user.isActive)}
                    className={
                      user.isActive
                        ? "text-[hsl(var(--destructive))]"
                        : "text-green-600"
                    }
                  >
                    {user.isActive ? (
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
            {filteredUsers.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="p-8 text-center text-[hsl(var(--muted-foreground))]"
                >
                  ユーザーが見つかりません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Create User Form ---

function CreateUserForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState<CreateUserRequest>({
    shainBangou: 0,
    email: "",
    shainName: "",
    shainGroup: "",
    shainYaku: "",
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

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">社員番号</label>
          <Input
            type="number"
            value={form.shainBangou || ""}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                shainBangou: parseInt(e.target.value, 10) || 0,
              }))
            }
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">氏名</label>
          <Input
            value={form.shainName}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, shainName: e.target.value }))
            }
            required
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">メールアドレス</label>
        <Input
          type="email"
          value={form.email}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, email: e.target.value }))
          }
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">部署</label>
          <Input
            value={form.shainGroup}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, shainGroup: e.target.value }))
            }
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">役職</label>
          <Input
            value={form.shainYaku}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, shainYaku: e.target.value }))
            }
            required
          />
        </div>
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
