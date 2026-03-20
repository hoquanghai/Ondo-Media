"use client";

import { useEffect } from "react";
import { useWebSocket } from "./use-websocket";
import { useNotificationStore } from "@/stores/notification-store";
import type { Notification as AppNotification } from "@/types/notification";

export function useNotifications() {
  const socket = useWebSocket();
  const { addNotification, fetchNotifications } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!socket) return;

    const handleNotification = (notification: AppNotification) => {
      addNotification(notification);
      showBrowserNotification(notification);
    };

    socket.on("notification", handleNotification);

    return () => {
      socket.off("notification", handleNotification);
    };
  }, [socket, addNotification]);
}

function showBrowserNotification(notification: AppNotification) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  new window.Notification("日報", {
    body: notification.message,
    icon: "/icon.png",
    tag: notification.id,
  });
}
