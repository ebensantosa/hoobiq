import { api } from "./client";

export type CartItem = {
  id: string;
  qty: number;
  addedAt: string;
  available: boolean;
  listing: {
    id: string;
    slug: string;
    title: string;
    priceIdr: number;
    condition: string;
    cover: string | null;
    stock: number;
    seller: { username: string; name: string | null; city: string | null };
  };
};

export const cartApi = {
  count: () => api<{ items: number; totalQty: number }>("/cart/count"),
  list:  () => api<{ items: CartItem[]; subtotalIdr: number }>("/cart"),
  add:   (listingId: string, qty?: number) =>
    api<{ id: string; qty: number }>("/cart", { method: "POST", body: { listingId, qty } }),
  update: (id: string, qty: number) =>
    api<{ id: string; qty: number }>(`/cart/${encodeURIComponent(id)}`, { method: "PATCH", body: { qty } }),
  remove: (id: string) =>
    api<void>(`/cart/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
