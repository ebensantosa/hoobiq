// Pure helper module — no "use client". Safe to import from Server Components.
// The interactive <TrustBadges /> still lives in trust-badges.tsx.

export type TrustBadgeKey =
  | "verified"
  | "authenticated"
  | "grade"
  | "fast_shipper"
  | "top_trader";

export type TrustBadge =
  | { key: "verified";      label?: string }
  | { key: "authenticated"; label?: string }
  | { key: "grade";         grader: "PSA" | "BGS" | "CGC"; grade: number }
  | { key: "fast_shipper";  hours?: number }
  | { key: "top_trader";    rating?: number; trades?: number };

/**
 * Build a badge list from common signals. Order = visual priority:
 *   1. authenticated (item-level trust beats seller-level)
 *   2. grade
 *   3. verified (seller KYC)
 *   4. top_trader
 *   5. fast_shipper
 */
export function deriveTrustBadges(input: {
  authenticated?: boolean;
  grade?:        { grader: "PSA" | "BGS" | "CGC"; grade: number } | null;
  kycVerified?:  boolean;
  trustScore?:   number;
  tradesCompleted?: number;
  avgShipHours?: number | null;
}): TrustBadge[] {
  const out: TrustBadge[] = [];
  if (input.authenticated) out.push({ key: "authenticated" });
  if (input.grade)         out.push({ key: "grade", grader: input.grade.grader, grade: input.grade.grade });
  if (input.kycVerified)   out.push({ key: "verified" });
  if ((input.trustScore ?? 0) >= 4.8 && (input.tradesCompleted ?? 0) >= 5) {
    out.push({ key: "top_trader", rating: input.trustScore, trades: input.tradesCompleted });
  }
  if (input.avgShipHours != null && input.avgShipHours < 24) {
    out.push({ key: "fast_shipper", hours: 24 });
  }
  return out;
}
