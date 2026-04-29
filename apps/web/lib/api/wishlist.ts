import { api } from "./client";

export type WishlistItem = {
  id: string;
  listing: {
    id: string;
    slug: string;
    title: string;
    priceIdr: number;
    // Wide string type — conditionBadge() resolves both new
    // (BRAND_NEW_SEALED, LIKE_NEW, ...) and legacy (MINT, NEAR_MINT)
    // values until the data migration completes.
    condition: string;
    cover: string | null;
    seller: { username: string; city: string | null; trustScore: number };
  };
};

export const wishlistApi = {
  list: () => api<{ items: WishlistItem[] }>("/wishlist"),
  add:    (listingId: string) => api<{ id: string }>("/wishlist", { method: "POST", body: { listingId } }),
  remove: (listingId: string) => api<void>(`/wishlist/${encodeURIComponent(listingId)}`, { method: "DELETE" }),
};
