import { io, Socket } from "socket.io-client";
import { env } from "./env";

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(token: string): Socket {
  if (socket) {
    // If already exists, update auth and reconnect if needed
    socket.auth = { token };
    if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }

  socket = io(env.wsUrl, {
    autoConnect: false,
    transports: ["websocket", "polling"],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on("connect", () => {
    console.log("[Socket] connected:", socket?.id);
  });

  socket.on("connect_error", (err) => {
    console.error("[Socket] connection error:", err.message);
  });

  socket.on("disconnect", (reason) => {
    console.log("[Socket] disconnected:", reason);
  });

  socket.io.on("reconnect", () => {
    console.log("[Socket] reconnected, resyncing timeline...");
    // Dynamically import to avoid circular dependency
    import("@/stores/post-store").then(({ usePostStore }) => {
      usePostStore.getState().fetchPosts();
    });
  });

  socket.connect();

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.io.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
