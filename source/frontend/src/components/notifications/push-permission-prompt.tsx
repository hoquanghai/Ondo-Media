"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { subscribeToPushNotifications } from "@/lib/push-notification";

export function PushPermissionPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      const timer = setTimeout(() => setShow(true), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!show) return null;

  const handleAllow = async () => {
    await subscribeToPushNotifications();
    setShow(false);
  };

  return (
    <Card className="fixed bottom-20 sm:bottom-4 right-4 w-80 shadow-lg z-50 border-[hsl(var(--primary)/0.2)]">
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-[hsl(var(--primary)/0.1)] flex items-center justify-center shrink-0">
            <Bell className="h-5 w-5 text-[hsl(var(--primary))]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">通知を有効にしますか？</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              新しい投稿やいいね、コメントの通知をリアルタイムで受け取れます。
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={handleAllow}>
                有効にする
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShow(false)}
              >
                後で
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
