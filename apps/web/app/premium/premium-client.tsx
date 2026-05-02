"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@hoobiq/ui";
import { api, ApiError } from "@/lib/api/client";
import { TierBadge, tierForLevel } from "@/components/tier-badge";
import { useToast } from "@/components/toast-provider";
import { useActionDialog } from "@/components/action-dialog";

type Perks = {
  tier: "bronze" | "silver" | "gold" | "platinum" | "elite";
  isPremium: boolean;
  swipeCap: number;
  expMultiplier: number;
  dailyLoginExp: number;
  monthlyBoostQuota: number;
  monthlyOngkirQuota: number;
  ongkirCapCents: number;
};

type Data = {
  level: number;
  exp: number;
  isPremium: boolean;
  premiumUntil: string | null;
  perks: Perks;
  usage: { boostUsed: number; ongkirUsed: number; voucherUsed: number };
  dailyCheckin: { claimedToday: boolean; lastClaimedAt: string | null };
  pricing: { monthlyIdr: number };
};

const PERKS = [
  { icon: "✦", title: "Badge Premium", body: "Avatar ring + chip emas eksklusif yang muncul di setiap interaksi." },
  { icon: "🚀", title: "Free Boost 15×/bulan", body: "Naikin listing & feed kamu ke posisi paling atas — gratis." },
  { icon: "🚚", title: "Free Ongkir 5×/bulan", body: "Maks Rp 15.000 per transaksi. Berlaku otomatis di checkout." },
  { icon: "🔥", title: "Meet Match +100/hari", body: "Swipe lebih banyak, temukan koleksi langka lebih cepat." },
  { icon: "⚡", title: "EXP Bonus", body: "Login harian & aktivitas dapat bonus EXP — naik tier lebih cepat." },
  { icon: "🎁", title: "Voucher Belanja", body: "Voucher tier-based yang reset tiap bulan — ambil sampai habis." },
  { icon: "🪐", title: "Early Access", body: "Coba fitur baru, item langka, dan event member duluan." },
  { icon: "💎", title: "Exclusive Price", body: "Harga premium-only di drop terbatas dari partner Hoobiq." },
  { icon: "🎫", title: "Promo & Event", body: "Akses promo + event member-only setiap bulan." },
  { icon: "🛟", title: "Priority Support", body: "Tiket support kamu masuk antrian fast-lane." },
];

export function PremiumPage({ data }: { data: Data }) {
  const router = useRouter();
  const toast = useToast();
  const dialog = useActionDialog();
  const [pending, setPending] = React.useState(false);
  const tier = tierForLevel(data.level);

  async function upgrade(months: number) {
    setPending(true);
    try {
      await api("/membership/upgrade", { method: "POST", body: { months } });
      toast.success("Selamat!", "Premium aktif — semua perks sudah unlocked.");
      router.refresh();
    } catch (e) {
      toast.error("Gagal", e instanceof ApiError ? e.message : "Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  function confirmUpgrade(months: number, label: string) {
    dialog.open({
      title: `Aktifkan Premium ${label}?`,
      description: `Premium aktif segera setelah pembayaran. Saat ini upgrade gratis selama beta — tagihan akan aktif setelah billing diintegrasikan.`,
      confirmLabel: "Aktifkan sekarang",
      onConfirm: () => upgrade(months),
    });
  }

  function cancelPremium() {
    dialog.open({
      title: "Berhenti dari Premium?",
      description: "Perks premium dimatiin sekarang. Tier-based perks tetap aktif berdasarkan level kamu.",
      tone: "danger",
      confirmLabel: "Berhenti Premium",
      onConfirm: async () => {
        try {
          await api("/membership/cancel", { method: "POST" });
          toast.success("Premium dimatikan", "Kamu kembali ke akun basic.");
          router.refresh();
        } catch (e) {
          return e instanceof ApiError ? e.message : "Gagal.";
        }
      },
    });
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-rule bg-gradient-to-br from-brand-500/15 via-flame-500/10 to-ultra-500/15 p-8 md:p-12">
        <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-ultra-400/20 blur-3xl" />
        <div className="relative grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-flame-500">Hoobiq Premium</span>
              <TierBadge tier={tier} level={data.level} premium={data.isPremium} size="md" />
            </div>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-fg md:text-5xl">
              Naik tier lebih cepat.<br/>
              <span className="bg-gradient-to-r from-brand-500 via-flame-500 to-ultra-500 bg-clip-text text-transparent">Koleksi tanpa batas.</span>
            </h1>
            <p className="mt-3 max-w-lg text-sm text-fg-muted md:text-base">
              {data.isPremium
                ? `Premium aktif sampai ${data.premiumUntil ? new Date(data.premiumUntil).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—"}. Nikmati semua perks.`
                : `IDR ${data.pricing.monthlyIdr.toLocaleString("id-ID")} / bulan. Free boost + free ongkir aja udah balik modal — sisanya bonus.`}
            </p>

            {!data.isPremium ? (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button variant="primary" size="lg" onClick={() => confirmUpgrade(1, "1 bulan")} disabled={pending}>
                  Mulai Premium · 1 bulan
                </Button>
                <button
                  type="button"
                  onClick={() => confirmUpgrade(12, "1 tahun (hemat 2 bulan)")}
                  disabled={pending}
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-rule bg-canvas px-5 text-sm font-bold text-fg transition-all hover:-translate-y-0.5 hover:border-brand-400/60 disabled:opacity-50"
                >
                  Premium tahunan
                  <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">Hemat 2 bln</span>
                </button>
              </div>
            ) : (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button variant="primary" size="lg" onClick={() => confirmUpgrade(1, "perpanjang 1 bulan")} disabled={pending}>
                  Perpanjang +1 bulan
                </Button>
                <button
                  type="button"
                  onClick={cancelPremium}
                  className="text-xs font-semibold text-fg-muted underline-offset-4 hover:text-flame-500 hover:underline"
                >
                  Berhenti Premium
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Stat label="Free Boost" value={`${Math.max(0, data.perks.monthlyBoostQuota - data.usage.boostUsed)}`} sub={`dari ${data.perks.monthlyBoostQuota}/bulan`} />
            <Stat label="Free Ongkir" value={`${Math.max(0, data.perks.monthlyOngkirQuota - data.usage.ongkirUsed)}`} sub={`dari ${data.perks.monthlyOngkirQuota}/bulan`} />
            <Stat label="Swipe/hari" value={data.perks.swipeCap < 0 ? "∞" : String(data.perks.swipeCap)} sub="Meet Match" />
            <Stat label="EXP Bonus" value={`+${Math.round((data.perks.expMultiplier - 1) * 100)}%`} sub="setiap aktivitas" />
          </div>
        </div>
      </section>

      {/* Perks grid */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-fg sm:text-2xl">Apa yang kamu dapet</h2>
        <p className="mt-1 text-sm text-fg-muted">Sepuluh perks Premium plus benefit tier sesuai level kamu.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PERKS.map((p) => (
            <div key={p.title} className="rounded-2xl border border-rule bg-panel p-4 transition-all hover:-translate-y-0.5 hover:border-brand-400/50 hover:shadow-md">
              <div className="text-2xl">{p.icon}</div>
              <p className="mt-2 text-sm font-bold text-fg">{p.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-fg-muted">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tier matrix */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-fg sm:text-2xl">Benefit per tier</h2>
        <p className="mt-1 text-sm text-fg-muted">Tier ditentukan dari level. Kolom Premium = perks yang aktif kalau kamu ambil Premium.</p>
        <div className="mt-5 overflow-hidden rounded-2xl border border-rule bg-panel">
          <table className="w-full text-left text-sm">
            <thead className="bg-panel-2 text-[10px] font-bold uppercase tracking-widest text-fg-subtle">
              <tr>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3">Daily Login</th>
                <th className="px-4 py-3">EXP Bonus</th>
                <th className="px-4 py-3">Swipe/hari</th>
                <th className="px-4 py-3">Free Boost/bln</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {TIER_ROWS.map((r) => {
                const isCurrent = r.tier === tier;
                return (
                  <tr key={r.tier} className={isCurrent ? "bg-brand-400/5" : undefined}>
                    <td className="px-4 py-3"><TierBadge tier={r.tier} size="sm" /></td>
                    <td className="px-4 py-3 font-mono text-fg-muted">{r.range}</td>
                    <td className="px-4 py-3"><Two basic={`+${r.dailyBasic}`} premium={`+${r.dailyPremium}`} /></td>
                    <td className="px-4 py-3"><Two basic={`+${r.expBasic}%`} premium={`+${r.expPremium}%`} /></td>
                    <td className="px-4 py-3"><Two basic={r.swipeBasic} premium={r.swipePremium} /></td>
                    <td className="px-4 py-3"><Two basic={r.boostBasic} premium={r.boostPremium} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const TIER_ROWS: Array<{
  tier: "bronze" | "silver" | "gold" | "platinum" | "elite";
  range: string;
  dailyBasic: number;
  dailyPremium: number;
  expBasic: number;
  expPremium: number;
  swipeBasic: string;
  swipePremium: string;
  boostBasic: string;
  boostPremium: string;
}> = [
  { tier: "bronze",   range: "1–10",  dailyBasic: 10,  dailyPremium: 20,   expBasic: 0,  expPremium: 10, swipeBasic: "50",       swipePremium: "150",        boostBasic: "0",      boostPremium: "15"        },
  { tier: "silver",   range: "11–25", dailyBasic: 20,  dailyPremium: 40,   expBasic: 10, expPremium: 15, swipeBasic: "80",       swipePremium: "180",        boostBasic: "5",      boostPremium: "20"        },
  { tier: "gold",     range: "26–40", dailyBasic: 30,  dailyPremium: 90,   expBasic: 15, expPremium: 20, swipeBasic: "90",       swipePremium: "190",        boostBasic: "10",     boostPremium: "25"        },
  { tier: "platinum", range: "41–50", dailyBasic: 100, dailyPremium: 300,  expBasic: 20, expPremium: 25, swipeBasic: "100",      swipePremium: "200",        boostBasic: "10",     boostPremium: "30"        },
  { tier: "elite",    range: "51+",   dailyBasic: 200, dailyPremium: 1000, expBasic: 25, expPremium: 30, swipeBasic: "Unlimited",swipePremium: "Unlimited",  boostBasic: "10 + 1/mgg", boostPremium: "20 + 2/mgg" },
];

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-canvas/60 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-fg-subtle">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-fg">{value}</p>
      <p className="mt-0.5 text-[11px] text-fg-muted">{sub}</p>
    </div>
  );
}

function Two({ basic, premium }: { basic: string | number; premium: string | number }) {
  return (
    <span className="flex flex-col gap-0.5">
      <span className="text-fg">{basic}</span>
      <span className="text-[11px] font-semibold text-flame-500">Premium: {premium}</span>
    </span>
  );
}
