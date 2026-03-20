"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import type { PermissionMatrix } from "@/types/admin";

export default function AdminPermissionsPage() {
  const [matrix, setMatrix] = useState<PermissionMatrix | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get<PermissionMatrix>("/admin/permissions")
      .then((data) => {
        setMatrix(data);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

  const togglePermission = async (
    userId: number,
    permissionId: string,
    hasPermission: boolean
  ) => {
    // Optimistic UI
    setMatrix((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        users: prev.users.map((u) =>
          u.userId === userId
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
        userId,
        permissionId,
        action: hasPermission ? "revoke" : "grant",
      });
    } catch {
      // Rollback
      const data = await api.get<PermissionMatrix>("/admin/permissions");
      setMatrix(data);
    }
  };

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">権限管理</h1>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!matrix) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">権限管理</h1>

      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[hsl(var(--muted)/0.5)]">
            <tr>
              <th className="text-left p-3 font-medium sticky left-0 bg-[hsl(var(--muted)/0.5)] min-w-[180px]">
                ユーザー
              </th>
              {matrix.permissions.map((perm) => (
                <th
                  key={perm.id}
                  className="text-center p-3 font-medium min-w-[120px]"
                >
                  <div>{perm.name}</div>
                  <div className="text-xs font-normal text-[hsl(var(--muted-foreground))]">
                    {perm.description}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.users.map((user) => (
              <tr
                key={user.shainBangou}
                className="border-t hover:bg-[hsl(var(--muted)/0.3)]"
              >
                <td className="p-3 sticky left-0 bg-white font-medium">
                  <div>{user.shainName}</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">
                    {user.email}
                  </div>
                </td>
                {matrix.permissions.map((perm) => {
                  const has = user.permissions.includes(perm.id);
                  return (
                    <td key={perm.id} className="text-center p-3">
                      <button
                        onClick={() =>
                          togglePermission(user.shainBangou, perm.id, has)
                        }
                        className={`h-6 w-6 rounded border-2 inline-flex items-center justify-center transition-colors ${
                          has
                            ? "bg-[hsl(var(--primary))] border-[hsl(var(--primary))] text-white"
                            : "border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.5)]"
                        }`}
                      >
                        {has && (
                          <svg
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
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
