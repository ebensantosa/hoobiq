"use client";
import * as React from "react";
import { Card } from "@hoobiq/ui";
import { api } from "@/lib/api/client";

type Event = { date: string; description: string; location: string };
type Result = { delivered: boolean; events: Event[] };

/**
 * In-app tracking via /shipping/track/:courier/:awb (Komerce). Replaces the
 * "leave the site to check kurir" UX with a single timeline view. Falls
 * back to a "Lacak di kurir" external link if the API is unconfigured or
 * returns an error.
 */
export function TrackingTimeline({
  courier, awb,
}: {
  courier: string;
  awb: string;
}) {
  const [data, setData] = React.useState<Result | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    // The API takes the courier code without the service suffix that we
    // store on orders ("jne-reg" → "jne"). Strip anything after the dash.
    const baseCourier = courier.split("-")[0]?.toLowerCase() ?? courier;
    setLoading(true); setErr(null);
    api<Result>(`/shipping/track/${encodeURIComponent(baseCourier)}/${encodeURIComponent(awb)}`)
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : "Gagal memuat tracking."))
      .finally(() => setLoading(false));
  }, [courier, awb]);

  if (loading) {
    return (
      <Card><div className="p-5 text-sm text-fg-muted">Memuat tracking…</div></Card>
    );
  }
  if (err || !data) {
    return (
      <Card>
        <div className="p-5 text-sm text-fg-muted">
          {err ?? "Tracking belum tersedia."}
        </div>
      </Card>
    );
  }
  if (data.events.length === 0) {
    return (
      <Card>
        <div className="p-5 text-sm text-fg-muted">
          Belum ada update dari kurir. Resi mungkin baru di-input — coba lagi beberapa jam lagi.
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-wider text-fg-subtle">
            Tracking · {courier.toUpperCase()}
          </p>
          {data.delivered && (
            <span className="rounded-full bg-mint-400/15 px-2 py-0.5 text-[11px] font-semibold text-mint-500">
              Sudah sampai
            </span>
          )}
        </div>
        <ol className="relative ml-3 border-l border-rule pl-6">
          {data.events.map((e, i) => (
            <li key={i} className={"pb-5 last:pb-0 " + (i === 0 ? "text-fg" : "text-fg-muted")}>
              <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-canvas bg-brand-400" />
              <p className="text-sm font-medium">{e.description}</p>
              <p className="mt-0.5 text-xs text-fg-subtle">{e.location} · {e.date}</p>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}
