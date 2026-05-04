"use client";
import * as React from "react";
import { Badge, Button, Card, Input, Label } from "@hoobiq/ui";
import { addressesApi, type Address, type AddressInput } from "@/lib/api/addresses";
import { ApiError } from "@/lib/api/client";
import { DestinationPicker, type Destination } from "./destination-picker";
import { useActionDialog } from "./action-dialog";

const empty: AddressInput = {
  label: "Rumah", name: "", phone: "", line: "",
  subdistrict: "", district: "",
  city: "", province: "", postal: "",
  subdistrictId: null,
  lat: null, lng: null,
  primary: false,
};

export function AddressManager({ initial }: { initial: Address[] }) {
  const dialog = useActionDialog();
  const [items, setItems] = React.useState(initial);
  const [editing, setEditing] = React.useState<{ id?: string; data: AddressInput } | null>(null);
  const [pending, start] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);

  function startCreate() { setEditing({ data: { ...empty, primary: items.length === 0 } }); setErr(null); }
  function startEdit(a: Address) { setEditing({ id: a.id, data: { ...a } }); setErr(null); }
  function cancel() { setEditing(null); setErr(null); }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setErr(null);
    // Subdistrict id + kelurahan + kecamatan are required so checkout can
    // hit Komerce with a precise origin/destination. Without them, ongkir
    // falls back to a city-level estimate that overshoots — and the
    // listing form's "ambil dari alamat seller" path gets a broken row.
    const d = editing.data;
    if (!d.subdistrictId || !(d.subdistrict ?? "").trim() || !(d.district ?? "").trim()) {
      setErr("Pilih kelurahan/kecamatan dari pencarian dulu — kalau search bermasalah, isi manual lalu pilih ulang dari hasil pencarian.");
      return;
    }
    start(async () => {
      try {
        if (editing.id) {
          const updated = await addressesApi.update(editing.id, editing.data);
          setItems((rows) => rows.map((r) => (r.id === editing.id ? updated : r))
            .map((r) => editing.data.primary && r.id !== editing.id ? { ...r, primary: false } : r));
        } else {
          const created = await addressesApi.create(editing.data);
          setItems((rows) => [created, ...rows.map((r) => editing.data.primary ? { ...r, primary: false } : r)]);
        }
        setEditing(null);
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : "Gagal menyimpan alamat.");
      }
    });
  }

  async function makePrimary(id: string) {
    try {
      await addressesApi.update(id, { primary: true });
      setItems((rows) => rows.map((r) => ({ ...r, primary: r.id === id })));
    } catch { /* ignore */ }
  }

  function remove(id: string, label: string) {
    dialog.open({
      title: "Hapus alamat?",
      description: `"${label}" akan dihapus dari daftar alamat. Aksi ini tidak bisa dibatalkan.`,
      tone: "danger",
      confirmLabel: "Hapus",
      onConfirm: async () => {
        try {
          await addressesApi.remove(id);
          setItems((rows) => rows.filter((r) => r.id !== id));
        } catch (e) {
          return e instanceof ApiError ? e.message : "Gagal hapus alamat.";
        }
      },
    });
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-fg">Alamat pengiriman</h2>
          <p className="mt-1 text-sm text-fg-muted">Tersimpan untuk checkout cepat. Alamat utama dipakai default.</p>
        </div>
        {!editing && (
          <Button type="button" variant="primary" size="sm" onClick={startCreate}>+ Tambah alamat</Button>
        )}
      </div>

      {editing && (
        <Card>
          <form onSubmit={submit} className="space-y-4 p-6">
            <h3 className="text-base font-semibold text-fg">{editing.id ? "Edit alamat" : "Alamat baru"}</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Label"><Input value={editing.data.label} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, label: e.target.value } })} required maxLength={32} /></Field>
              <Field label="Nama penerima"><Input value={editing.data.name} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, name: e.target.value } })} required minLength={2} maxLength={120} /></Field>
              <Field label="No. HP"><Input value={editing.data.phone} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, phone: e.target.value } })} required minLength={8} maxLength={32} /></Field>
            </div>
            <Field
              label="Kelurahan / Kecamatan"
              hint="Cari nama kelurahan kamu — kota, provinsi, dan kode pos akan terisi otomatis. Kalau pencarian bermasalah, isi manual di bawah."
            >
              <DestinationPicker
                value={
                  editing.data.subdistrictId
                    ? {
                        id: editing.data.subdistrictId,
                        label: [editing.data.subdistrict, editing.data.district, editing.data.city, editing.data.province]
                          .filter(Boolean).join(", ") || "(lokasi tersimpan)",
                        subdistrict: editing.data.subdistrict ?? "",
                        district: editing.data.district ?? "",
                        city: editing.data.city,
                        province: editing.data.province,
                        postalCode: editing.data.postal,
                      }
                    : null
                }
                onChange={(d: Destination | null) =>
                  setEditing({
                    ...editing,
                    data: d
                      ? {
                          ...editing.data,
                          subdistrictId: d.id,
                          subdistrict: d.subdistrict,
                          district: d.district,
                          city: d.city,
                          province: d.province,
                          postal: d.postalCode,
                        }
                      : { ...editing.data, subdistrictId: null },
                  })
                }
              />
              {editing.data.subdistrictId && editing.data.city && (
                <p className="rounded-lg bg-emerald-400/10 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
                  ✓ Kel. {editing.data.subdistrict || "—"} · Kec. {editing.data.district || "—"}<br/>
                  {editing.data.city}, {editing.data.province} · {editing.data.postal}
                </p>
              )}
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Kelurahan">
                <Input
                  value={editing.data.subdistrict ?? ""}
                  onChange={(e) => setEditing({ ...editing, data: { ...editing.data, subdistrict: e.target.value } })}
                  placeholder="Wedarijaksa"
                  maxLength={80}
                />
              </Field>
              <Field label="Kecamatan">
                <Input
                  value={editing.data.district ?? ""}
                  onChange={(e) => setEditing({ ...editing, data: { ...editing.data, district: e.target.value } })}
                  placeholder="Pati"
                  maxLength={80}
                />
              </Field>
            </div>

            {/* Manual fallback — always editable so users can still save when
                Komerce search is down or returns no match. If filled in
                manually (no subdistrictId), checkout falls back to a
                city-level ongkir estimate instead of failing. */}
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Kota / kabupaten">
                <Input
                  value={editing.data.city}
                  onChange={(e) => setEditing({ ...editing, data: { ...editing.data, city: e.target.value, subdistrictId: null } })}
                  placeholder="Jakarta Selatan"
                  required minLength={2} maxLength={64}
                />
              </Field>
              <Field label="Provinsi">
                <Input
                  value={editing.data.province}
                  onChange={(e) => setEditing({ ...editing, data: { ...editing.data, province: e.target.value, subdistrictId: null } })}
                  placeholder="DKI Jakarta"
                  required minLength={2} maxLength={64}
                />
              </Field>
              <Field label="Kode pos">
                <Input
                  value={editing.data.postal}
                  onChange={(e) => setEditing({ ...editing, data: { ...editing.data, postal: e.target.value, subdistrictId: null } })}
                  placeholder="12190"
                  required minLength={4} maxLength={10}
                />
              </Field>
            </div>
            <Field label="Alamat lengkap" hint="Jalan, nomor, RT/RW">
              <Input value={editing.data.line} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, line: e.target.value } })} required minLength={5} maxLength={240} />
            </Field>

            <Field
              label="Titik koordinat (peta)"
              hint="Opsional. Bantu kurir/driver nemuin lokasi tepat. Pakai GPS atau pilih manual di peta."
            >
              <MapPinPicker
                lat={editing.data.lat ?? null}
                lng={editing.data.lng ?? null}
                onChange={(lat, lng) => setEditing({ ...editing, data: { ...editing.data, lat, lng } })}
              />
            </Field>

            <label className="flex items-center gap-2 text-sm text-fg-muted">
              <input type="checkbox" checked={editing.data.primary} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, primary: e.target.checked } })} className="h-4 w-4 accent-brand-400" />
              Jadikan alamat utama
            </label>
            {err && <p role="alert" className="text-xs text-flame-600">{err}</p>}
            <div className="flex justify-end gap-2 border-t border-rule pt-4">
              <Button type="button" variant="ghost" size="sm" onClick={cancel}>Batal</Button>
              <Button type="submit" variant="primary" size="sm" disabled={pending}>
                {pending ? "Menyimpan…" : "Simpan"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {items.length === 0 && !editing ? (
        <Card>
          <div className="p-10 text-center">
            <p className="text-base font-medium text-fg">Belum ada alamat tersimpan</p>
            <p className="mt-1 text-sm text-fg-muted">Tambah alamat pertama untuk checkout lebih cepat.</p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((a) => (
            <Card key={a.id}>
              <div className="flex items-start gap-4 p-5">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-fg">{a.label}</p>
                    {a.primary && <Badge tone="mint" size="xs">Utama</Badge>}
                  </div>
                  <p className="mt-2 text-sm text-fg">{a.name} · {a.phone}</p>
                  <p className="mt-1 text-sm text-fg-muted">{a.line}</p>
                  {(a.subdistrict || a.district) && (
                    <p className="text-sm text-fg-muted">
                      {a.subdistrict ? `Kel. ${a.subdistrict}` : ""}
                      {a.subdistrict && a.district ? " · " : ""}
                      {a.district ? `Kec. ${a.district}` : ""}
                    </p>
                  )}
                  <p className="text-sm text-fg-muted">{a.city}, {a.province} {a.postal}</p>
                </div>
                <div className="flex flex-col gap-2 text-right">
                  <button onClick={() => startEdit(a)} className="text-xs text-brand-500">Edit</button>
                  {!a.primary && (
                    <button onClick={() => makePrimary(a.id)} className="text-xs text-fg-muted hover:text-fg">Jadikan utama</button>
                  )}
                  <button onClick={() => remove(a.id, a.label)} className="text-xs text-fg-subtle hover:text-flame-500">Hapus</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
}

/**
 * Interactive Leaflet map picker — click anywhere on the map to drop a
 * pin, or drag the pin to fine-tune. GPS button centers + drops a pin
 * at the device location. Leaflet itself is lazy-loaded from a public
 * CDN (~150 KB JS + 14 KB CSS) only when the form is opened, so the
 * cost stays off the cold-load path.
 */

const LEAFLET_JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

let leafletPromise: Promise<unknown> | null = null;
function loadLeaflet(): Promise<unknown> {
  if (typeof window === "undefined") return Promise.resolve(null);
  // @ts-expect-error - leaflet attaches L on window
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS_URL}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS_URL;
      document.head.appendChild(link);
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${LEAFLET_JS_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => {
        // @ts-expect-error - global
        resolve(window.L);
      });
      existing.addEventListener("error", () => reject(new Error("Leaflet load failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = LEAFLET_JS_URL;
    s.async = true;
    s.onload = () => {
      // @ts-expect-error - global
      resolve(window.L);
    };
    s.onerror = () => reject(new Error("Leaflet load failed"));
    document.head.appendChild(s);
  });
  return leafletPromise;
}

function MapPinPicker({
  lat, lng, onChange,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = React.useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = React.useRef<any>(null);
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);

  // Init map once
  React.useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Lx = L as any;
      // Leaflet's default icon auto-detects path from <script src=>; with
      // unpkg CDN that breaks. Point it at the matching CDN images dir.
      Lx.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      const initLat = lat ?? -6.2;
      const initLng = lng ?? 106.816666;
      const map = Lx.map(containerRef.current).setView([initLat, initLng], lat != null ? 16 : 11);
      Lx.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map);

      function setPin(la: number, ln: number) {
        if (markerRef.current) {
          markerRef.current.setLatLng([la, ln]);
        } else {
          markerRef.current = Lx.marker([la, ln], { draggable: true }).addTo(map);
          markerRef.current.on("dragend", () => {
            const p = markerRef.current.getLatLng();
            onChangeRef.current(round6(p.lat), round6(p.lng));
          });
        }
      }

      if (lat != null && lng != null) setPin(lat, lng);

      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        setPin(e.latlng.lat, e.latlng.lng);
        onChangeRef.current(round6(e.latlng.lat), round6(e.latlng.lng));
      });

      mapRef.current = map;
      setReady(true);
    }).catch(() => {
      setErr("Gagal memuat peta. Coba refresh halaman.");
    });
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external lat/lng changes back into the map (e.g., GPS button)
  React.useEffect(() => {
    if (!mapRef.current) return;
    if (lat == null || lng == null) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Lx = (window as any).L;
    if (!Lx) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = Lx.marker([lat, lng], { draggable: true }).addTo(mapRef.current);
      markerRef.current.on("dragend", () => {
        const p = markerRef.current.getLatLng();
        onChangeRef.current(round6(p.lat), round6(p.lng));
      });
    }
    mapRef.current.setView([lat, lng], 16);
  }, [lat, lng]);

  function useGps() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setErr("Browser kamu nggak dukung GPS. Klik langsung di peta untuk drop pin.");
      return;
    }
    setBusy(true); setErr(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(round6(pos.coords.latitude), round6(pos.coords.longitude));
        setBusy(false);
      },
      (e) => {
        setBusy(false);
        setErr(
          e.code === e.PERMISSION_DENIED
            ? "Akses lokasi ditolak. Klik langsung di peta untuk drop pin."
            : "Gagal ambil lokasi. Klik langsung di peta untuk drop pin.",
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
  }

  function clear() {
    onChange(null, null);
    setErr(null);
  }

  const hasPin = lat != null && lng != null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={useGps} disabled={busy}>
          {busy ? "Mengambil…" : "📍 Pakai lokasi sekarang"}
        </Button>
        {hasPin && (
          <Button type="button" variant="ghost" size="sm" onClick={clear}>Hapus pin</Button>
        )}
      </div>

      {err && <p role="alert" className="text-xs text-flame-600">{err}</p>}

      <div className="overflow-hidden rounded-xl border border-rule">
        <div ref={containerRef} className="block h-64 w-full bg-panel-2" />
        {!ready && (
          <p className="bg-panel-2/40 px-3 py-1.5 text-[11px] text-fg-subtle">Memuat peta…</p>
        )}
        {ready && (
          <p className="bg-panel-2/40 px-3 py-1.5 text-[11px] text-fg-subtle">
            {hasPin
              ? <>Pin: {lat?.toFixed(6)}, {lng?.toFixed(6)} · klik atau geser pin untuk pindah</>
              : <>Klik di peta untuk drop pin, atau pakai GPS.</>}
          </p>
        )}
      </div>
    </div>
  );
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}
