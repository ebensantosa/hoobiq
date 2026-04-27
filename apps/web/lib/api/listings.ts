import type { ListingSearchInput, ListingSummary, ListingDetail } from "@hoobiq/types";
import { api } from "./client";

export const listingsApi = {
  search(input: Partial<ListingSearchInput> = {}) {
    return api<{ items: ListingSummary[]; nextCursor: string | null }>("/listings", {
      query: input as Record<string, string | number | boolean | undefined>,
    });
  },

  bySlug(slug: string) {
    return api<ListingDetail>(`/listings/${encodeURIComponent(slug)}`);
  },
};
