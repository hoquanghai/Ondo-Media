import { api } from "./api";

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;

  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const permission = await Notification.requestPermission();
  return permission === "granted";
}

export async function subscribeToPushNotifications(): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  if (!("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    });

    await api.post("/notifications/push-subscribe", {
      subscription: subscription.toJSON(),
    });
  } catch (err) {
    console.error("[Push] subscription error:", err);
  }
}
