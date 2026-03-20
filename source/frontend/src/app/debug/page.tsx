"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { UserAvatar } from "@/components/shared/user-avatar";

export default function DebugPage() {
  const [info, setInfo] = useState<Record<string, unknown>>({});
  const [hydrated, setHydrated] = useState(false);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));

    const interval = setInterval(() => {
      const state = useAuthStore.getState();
      setInfo({
        hydrated: useAuthStore.persist.hasHydrated(),
        accessToken: state.accessToken ? state.accessToken.substring(0, 20) + "..." : null,
        refreshToken: state.refreshToken ? "exists" : null,
        isAuthenticated: state.isAuthenticated,
        isLoading: state.isLoading,
        user: state.user,
        error: state.error,
      });
    }, 500);

    return () => { clearInterval(interval); unsub(); };
  }, []);

  return (
    <div className="p-8 font-mono text-sm">
      <h1 className="text-xl font-bold mb-4">Auth Debug</h1>
      <p>Persist hydrated: <strong>{hydrated ? "YES" : "NO"}</strong></p>

      {/* Avatar test */}
      <div className="mt-4 p-4 bg-white rounded-lg border">
        <h2 className="font-bold mb-2">Avatar Test</h2>
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs mb-1">UserAvatar component:</p>
            <UserAvatar
              shainName={user?.shainName ?? "Test"}
              avatar={user?.avatar}
              snsAvatarUrl={user?.snsAvatarUrl}
              size="xl"
            />
          </div>
          <div>
            <p className="text-xs mb-1">Direct img tag:</p>
            {user?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar} alt="test" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <p className="text-red-500">user.avatar is empty/null</p>
            )}
          </div>
          <div className="text-xs">
            <p>avatar: <strong>{user?.avatar || "NULL"}</strong></p>
            <p>snsAvatarUrl: <strong>{user?.snsAvatarUrl || "NULL"}</strong></p>
          </div>
        </div>
      </div>

      <pre className="mt-4 bg-gray-100 p-4 rounded overflow-auto max-h-96">
        {JSON.stringify(info, null, 2)}
      </pre>
      <div className="mt-4 space-x-2">
        <button className="px-4 py-2 bg-blue-600 text-white rounded"
          onClick={() => useAuthStore.setState({ isLoading: false })}>
          Force isLoading=false
        </button>
        <button className="px-4 py-2 bg-red-600 text-white rounded"
          onClick={() => { localStorage.removeItem("auth-storage"); window.location.reload(); }}>
          Clear auth & reload
        </button>
        <button className="px-4 py-2 bg-green-600 text-white rounded"
          onClick={() => window.location.href = "/login"}>
          Go to Login
        </button>
      </div>
    </div>
  );
}
