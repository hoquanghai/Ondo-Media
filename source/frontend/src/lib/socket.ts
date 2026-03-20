import { io, Socket } from "socket.io-client";
import { env } from "./env";

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(token: string): Socket {
  if (!socket) {
    socket = io(env.wsUrl, {
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }

  socket.auth = { token };
  socket.connect();

  socket.on("connect", () => {
    console.log("[Socket] connected:", socket?.id);
  });

  socket.on("connect_error", (err) => {
    console.error("[Socket] connection error:", err.message);
  });

  socket.on("disconnect", (reason) => {
    console.log("[Socket] disconnected:", reason);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
