export type NotificationType =
  | "like"
  | "comment"
  | "announcement"
  | "survey"
  | "system";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}
