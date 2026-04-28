import { z } from "zod";

export const OrderStatusSchema = z.enum([
  "pending_payment",
  "paid",
  "awaiting_pickup",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
  "refunded",
  "returning",
  "disputed",
  "expired",
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

// Seller ships the order — input resi.
export const ShipOrderInput = z.object({
  trackingNumber: z.string().trim().min(4).max(40),
});
export type ShipOrderInput = z.infer<typeof ShipOrderInput>;

// Buyer requests cancel before order is shipped.
export const CancelRequestInput = z.object({
  reason: z.string().trim().min(5).max(500),
});
export type CancelRequestInput = z.infer<typeof CancelRequestInput>;

// Seller responds to a cancel request.
export const CancelRespondInput = z.object({
  decision: z.enum(["accept", "reject"]),
  rejectNote: z.string().trim().max(500).optional(),
});
export type CancelRespondInput = z.infer<typeof CancelRespondInput>;

// Buyer opens a return request after delivery.
export const ReturnRequestInput = z.object({
  reason: z.enum(["damaged", "not_as_described", "wrong_item", "other"]),
  description: z.string().trim().min(10).max(1000),
  evidence: z.array(z.string().url()).min(1).max(8),
});
export type ReturnRequestInput = z.infer<typeof ReturnRequestInput>;

export const ReturnRespondInput = z.object({
  decision: z.enum(["approve", "reject"]),
  rejectNote: z.string().trim().max(500).optional(),
});
export type ReturnRespondInput = z.infer<typeof ReturnRespondInput>;

// Buyer ships the item back to seller — input retur resi.
export const ReturnShipBackInput = z.object({
  trackingNumber: z.string().trim().min(4).max(40),
  courierCode: z.enum(["jne-reg", "jnt", "sicepat", "gosend"]),
});
export type ReturnShipBackInput = z.infer<typeof ReturnShipBackInput>;

// Buyer escalates to admin (when seller rejected return or both can't agree).
export const DisputeOpenInput = z.object({
  kind: z.enum(["damaged", "not_as_described", "return_rejected", "other"]),
  reason: z.string().trim().min(5).max(200),
  description: z.string().trim().min(10).max(2000),
  evidence: z.array(z.string().url()).max(8).default([]),
});
export type DisputeOpenInput = z.infer<typeof DisputeOpenInput>;

// Admin's final decision — limited to the 3 CS options.
export const DisputeDecideInput = z.object({
  decision: z.enum([
    "refund_buyer_no_return",
    "refund_buyer_with_return",
    "release_seller",
  ]),
  adminNote: z.string().trim().max(2000).optional(),
});
export type DisputeDecideInput = z.infer<typeof DisputeDecideInput>;

export const CheckoutInput = z.object({
  listingId: z.string().cuid(),
  qty: z.number().int().min(1).max(10).default(1),
  addressId: z.string().cuid(),
  courierCode: z.string().min(2).max(40),
  shippingCents: z.number().int().min(0).max(10_000_000_00).default(0),
  insurance: z.boolean().default(false),
  promoCode: z.string().max(32).optional(),
  // Buyer pre-picks the payment method on the checkout page (under the
  // "Metode pembayaran" section). Server immediately starts the Komerce
  // charge after creating the order so the response carries the URL/QR
  // we need to send the buyer to. "page" = Komerce hosted Payment Page
  // (lets buyer pick VA/ewallet/bank on Komerce side).
  payMethod: z.enum(["page", "qris"]).default("page"),
});
export type CheckoutInput = z.infer<typeof CheckoutInput>;

export const OrderSummarySchema = z.object({
  id: z.string(),
  humanId: z.string(),
  status: OrderStatusSchema,
  totalIdr: z.number(),
  createdAt: z.string(),
  courier: z.string(),
  listing: z.object({
    title: z.string(),
    cover: z.string().nullable(),
  }),
  counterpart: z.object({
    username: z.string(),
    role: z.enum(["buyer", "seller"]),
  }),
});
export type OrderSummary = z.infer<typeof OrderSummarySchema>;
