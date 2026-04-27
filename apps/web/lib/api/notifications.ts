import { api } from "./client";

export type NotificationItem = {
  id: string;
  kind: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export const notificationsApi = {
  list:        () => api<{ unread: number; items: NotificationItem[] }>("/notifications"),
  markRead:    (id: string) => api<void>(`/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH" }),
  markAllRead: () => api<void>("/notifications/read-all", { method: "PATCH" }),
};
