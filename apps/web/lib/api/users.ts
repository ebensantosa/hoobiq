import type { UpdateProfileInput } from "@hoobiq/types";
import { api } from "./client";

export const usersApi = {
  updateMe: (input: UpdateProfileInput) =>
    api<{ user: { id: string; username: string; name: string | null; bio: string | null; city: string | null; phone: string | null; avatarUrl: string | null } }>("/users/me", {
      method: "PATCH",
      body: input,
    }),
};
