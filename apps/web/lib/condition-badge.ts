import type { Condition } from "@hoobiq/types";
import { CONDITION_LABELS } from "@hoobiq/types";

type Tone = "mint" | "near" | "ghost" | "crim";

/**
 * Single source of truth for how a condition is rendered: which Badge tone
 * to use and what label to show. Used in listing cards, gallery, wishlist,
 * checkout, and order detail so a future label tweak only changes one
 * place. Accepts the unknown-string case (legacy data with old MINT/NEAR_MINT
 * values still in the DB until the migration script runs) and degrades
 * gracefully — the badge just stays neutral and the raw value is shown.
 */
export function conditionBadge(value: string | null | undefined): { label: string; tone: Tone } {
  switch (value) {
    case "BRAND_NEW_SEALED":
      return { label: CONDITION_LABELS.BRAND_NEW_SEALED, tone: "mint" };
    case "LIKE_NEW":
      return { label: CONDITION_LABELS.LIKE_NEW, tone: "near" };
    case "EXCELLENT":
      return { label: CONDITION_LABELS.EXCELLENT, tone: "near" };
    case "GOOD":
      return { label: CONDITION_LABELS.GOOD, tone: "ghost" };
    case "FAIR":
      return { label: CONDITION_LABELS.FAIR, tone: "ghost" };
    case "POOR":
      return { label: CONDITION_LABELS.POOR, tone: "crim" };
    // Legacy strings still on rows that haven't been migrated yet.
    case "MINT":
      return { label: "Brand New", tone: "mint" };
    case "NEAR_MINT":
      return { label: "Like New", tone: "near" };
    default:
      return { label: String(value ?? "—"), tone: "ghost" };
  }
}

export function conditionLabel(value: string | null | undefined): string {
  return conditionBadge(value).label;
}

export type { Condition };
