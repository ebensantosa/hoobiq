import { api } from "./client";

export type DMConversation = {
  id: string;
  counterpart: {
    id: string; username: string; name: string | null;
    avatarUrl: string | null; city: string | null;
  } | null;
  lastMessage: { body: string; fromMe: boolean; at: string } | null;
  unread: number;
  updatedAt: string;
};

export type DMMessage = {
  id: string;
  body: string;
  attachmentUrl: string | null;
  senderId: string;
  fromMe: boolean;
  createdAt: string;
};

export const dmApi = {
  list:        () => api<{ items: DMConversation[] }>("/dm"),
  startWith:   (withUsername: string) => api<{ id: string }>("/dm", { method: "POST", body: { withUsername } }),
  messages:    (id: string) => api<{ items: DMMessage[] }>(`/dm/${id}/messages`),
  sendMessage: (id: string, body: string) =>
    api<{ id: string; createdAt: string }>(`/dm/${id}/messages`, { method: "POST", body: { body } }),
};
