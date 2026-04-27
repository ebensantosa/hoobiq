import { AppShell } from "@/components/app-shell";
import { DropCalendar } from "@/components/drop-calendar";
import { PageHero } from "@/components/page-hero";
import type { DropSummary } from "@/components/drop-hero";
import { serverApi } from "@/lib/server/api";

export const dynamic = "force-dynamic";

export default async function DropsPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  const { ym } = await searchParams;
  const data = await serverApi<{ year: number; month: number; items: DropSummary[] }>(
    `/drops/calendar${ym ? `?ym=${encodeURIComponent(ym)}` : ""}`
  );

  const now = new Date();
  const year  = data?.year  ?? now.getFullYear();
  const month = data?.month ?? now.getMonth() + 1;
  const items = data?.items ?? [];

  return (
    <AppShell active="Drops">
      <div className="mx-auto max-w-[1100px] px-6 pb-12 lg:px-10">
        <PageHero
          eyebrow="Kalender"
          title="Drop Kalender"
          subtitle="Jadwal rilis Pop Mart, blind box, dan koleksi langka. Pasang reminder — kami ping 1 jam sebelum drop dimulai."
          tone="ultra"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
        />

        <div className="mt-6">
          <DropCalendar year={year} month={month} items={items} />
        </div>
      </div>
    </AppShell>
  );
}
