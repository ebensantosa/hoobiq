import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/server/session";
import { serverApi } from "@/lib/server/api";
import { PremiumPage } from "./premium-client";
import type { Tier } from "@/components/tier-badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hoobiq Premium" };

type Perks = {
  tier: Tier;
  isPremium: boolean;
  swipeCap: number;
  expMultiplier: number;
  dailyLoginExp: number;
  monthlyBoostQuota: number;
  monthlyOngkirQuota: number;
  ongkirCapCents: number;
};

type MembershipMe = {
  level: number;
  exp: number;
  isPremium: boolean;
  premiumUntil: string | null;
  perks: Perks;
  usage: { boostUsed: number; ongkirUsed: number; voucherUsed: number };
  dailyCheckin: { claimedToday: boolean; lastClaimedAt: string | null };
  pricing: { monthlyIdr: number };
};

export default async function Page() {
  const me = await getSessionUser();
  if (!me) redirect(`/masuk?next=${encodeURIComponent("/premium")}`);
  const data = await serverApi<MembershipMe>("/membership/me");
  if (!data) redirect("/marketplace");
  return (
    <AppShell active="Premium">
      <div className="px-4 pb-16 sm:px-6 lg:px-10">
        <PremiumPage data={data} />
      </div>
    </AppShell>
  );
}
