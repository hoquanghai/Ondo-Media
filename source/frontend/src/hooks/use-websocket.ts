"use client";

import { useEffect, useRef } from "react";
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
  const connectedRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated && accessToken && !connectedRef.current) {
      connectSocket(accessToken);
      connectedRef.current = true;
    }
  }, [isAuthenticated, accessToken]);

  useEffect(() => {
    if (!isAuthenticated && connectedRef.current) {
      disconnectSocket();
      connectedRef.current = false;
    }
  }, [isAuthenticated]);

  return getSocket();
}
