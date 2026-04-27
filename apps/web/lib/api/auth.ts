import type { LoginInput, RegisterInput, SessionUser } from "@hoobiq/types";
import { api, clearCsrfCache } from "./client";

export const authApi = {
  async register(input: RegisterInput) {
    return api<{ user: { id: string; username: string; email: string } }>("/auth/register", {
      method: "POST",
      body: input,
    });
  },

  async login(input: LoginInput) {
    return api<{ user: SessionUser }>("/auth/login", { method: "POST", body: input });
  },

  async logout() {
    await api<void>("/auth/logout", { method: "POST" });
    clearCsrfCache();
  },

  async me(signal?: AbortSignal) {
    return api<{ user: SessionUser }>("/auth/me", { signal });
  },
};
