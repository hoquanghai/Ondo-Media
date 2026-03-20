"use client";

import { useEffect } from "react";
import { useWebSocket } from "./use-websocket";
import { useNotificationStore } from "@/stores/notification-store";
import { usePostStore } from "@/stores/post-store";
import { useAnnouncementStore } from "@/stores/announcement-store";
import type { Notification as AppNotification } from "@/types/notification";
import type { Post } from "@/types/post";
import type { Announcement } from "@/types/announcement";

export function useNotifications() {
  const socket = useWebSocket();
  const { addNotification, fetchNotifications } = useNotificationStore();
  const { setHasNewPosts } = usePostStore();
  const { prependAnnouncement } = useAnnouncementStore();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!socket) return;

    const handleNotification = (notification: AppNotification) => {
      addNotification(notification);
      showBrowserNotification(notification);
    };

    const handleNewPost = (_post: Post) => {
      setHasNewPosts(true);
    };

    const handleNewAnnouncement = (announcement: Announcement) => {
      prependAnnouncement(announcement);
    };

    socket.on("notification", handleNotification);
    socket.on("post:new", handleNewPost);
    socket.on("announcement:new", handleNewAnnouncement);

    return () => {
      socket.off("notification", handleNotification);
      socket.off("post:new", handleNewPost);
      socket.off("announcement:new", handleNewAnnouncement);
    };
  }, [socket, addNotification, setHasNewPosts, prependAnnouncement]);
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
