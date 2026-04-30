import type { CreateListingInput, UpdateListingInput } from "@hoobiq/types";
import { api } from "./client";

export const listingsWriteApi = {
  /** `pendingCategory` is true when the listing was created with a
   *  brand-new sub-cat / series typed inline; in that case the listing
   *  is parked at moderation="pending_category" / isPublished=false
   *  until admin approves the linked CategoryRequest. */
  create: (input: CreateListingInput) =>
    api<{ id: string; slug: string; pendingCategory?: boolean }>(
      "/listings",
      { method: "POST", body: input },
    ),
  update: (id: string, input: UpdateListingInput) =>
    api<{ id: string; slug: string }>(`/listings/${id}`, { method: "PATCH", body: input }),
  remove: (id: string) =>
    api<void>(`/listings/${id}`, { method: "DELETE" }),
};
