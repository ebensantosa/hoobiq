import type { CreateListingInput, UpdateListingInput } from "@hoobiq/types";
import { api } from "./client";

export const listingsWriteApi = {
  create: (input: CreateListingInput) =>
    api<{ id: string; slug: string }>("/listings", { method: "POST", body: input }),
  update: (id: string, input: UpdateListingInput) =>
    api<{ id: string; slug: string }>(`/listings/${id}`, { method: "PATCH", body: input }),
  remove: (id: string) =>
    api<void>(`/listings/${id}`, { method: "DELETE" }),
};
