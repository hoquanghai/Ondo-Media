"use client";

import { useEffect, useState } from "react";
import {
  connectSocket,
  disconnectSocket,
  getSocket,
} from "@/lib/socket";
import { useAuthStore } from "@/stores/auth-store";
import type { Socket } from "socket.io-client";

export function useWebSocket(): Socket | null {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      const s = connectSocket(accessToken);
      setSocket(s);

      // Listen for connect/disconnect to update state
      const onConnect = () => setSocket(s);
      const onDisconnect = () => setSocket(s);

      s.on("connect", onConnect);
      s.on("disconnect", onDisconnect);

      return () => {
        s.off("connect", onConnect);
        s.off("disconnect", onDisconnect);
      };
    } else {
      disconnectSocket();
      setSocket(null);
    }
  }, [isAuthenticated, accessToken]);

  return socket ?? getSocket();
}
