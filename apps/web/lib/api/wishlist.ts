import { api } from "./client";

export type WishlistItem = {
  id: string;
  listing: {
    id: string;
    slug: string;
    title: string;
    priceIdr: number;
    condition: "MINT" | "NEAR_MINT" | "EXCELLENT" | "GOOD" | "FAIR";
    cover: string | null;
    seller: { username: string; city: string | null; trustScore: number };
  };
};

export const wishlistApi = {
  list: () => api<{ items: WishlistItem[] }>("/wishlist"),
  add:    (listingId: string) => api<{ id: string }>("/wishlist", { method: "POST", body: { listingId } }),
  remove: (listingId: string) => api<void>(`/wishlist/${encodeURIComponent(listingId)}`, { method: "DELETE" }),
};
