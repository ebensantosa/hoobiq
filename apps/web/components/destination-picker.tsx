"use client";
import * as React from "react";
import { Input } from "@hoobiq/ui";
import { api } from "@/lib/api/client";

export type Destination = {
  id: number;
  label: string;
  city: string;
  province: string;
  postalCode: string;
};

/**
 * Debounced autocomplete for RajaOngkir/Komerce subdistricts. Used by:
 *   - Listing upload form (seller picks origin)
 *   - Checkout (buyer picks destination, saves to address)
 *
 * Server endpoint: GET /shipping/destinations?q=…
 * Min 3 characters before firing a request (matches the API's behavior).
 */
export function DestinationPicker({
  value,
  onChange,
  placeholder = "Cari kelurahan, kecamatan, atau kota…",
}: {
  value: Destination | null;
  onChange: (d: Destination | null) => void;
  placeholder?: string;
}) {
  const [q, setQ] = React.useState(value?.label ?? "");
  const [items, setItems] = React.useState<Destination[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click — same affordance as a native combobox.
  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Debounce 300ms — keeps Komerce call volume low and typing snappy.
  React.useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 3) {
      setItems([]);
      return;
    }
    if (value && trimmed === value.label) return;     // user just typed the selected label back — no fetch
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const res = await api<{ items: Destination[] }>(`/shipping/destinations?q=${encodeURIComponent(trimmed)}&limit=10`);
        setItems(res.items);
        setOpen(true);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [q, value]);

  function pick(d: Destination) {
    onChange(d);
    setQ(d.label);
    setItems([]);
    setOpen(false);
  }

  function clear() {
    onChange(null);
    setQ("");
    setItems([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={q}
        onChange={(e) => { setQ(e.target.value); if (value) onChange(null); }}
        onFocus={() => { if (items.length > 0) setOpen(true); }}
        placeholder={placeholder}
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-fg-muted hover:text-crim-400"
        >
          ✕
        </button>
      )}
      {open && (items.length > 0 || loading) && (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-rule bg-panel shadow-lg">
          {loading && <div className="px-3 py-2 text-xs text-fg-subtle">Mencari…</div>}
          {!loading && items.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => pick(d)}
              className="block w-full text-left px-3 py-2 text-sm text-fg hover:bg-brand-400/10"
            >
              <p className="truncate font-medium">{d.label}</p>
              <p className="truncate text-xs text-fg-subtle">{d.city}, {d.province} · {d.postalCode}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
