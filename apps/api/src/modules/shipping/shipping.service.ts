import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { env } from "../../config/env";
import { RedisService } from "../../infrastructure/redis/redis.service";

const BASE_URL = "https://rajaongkir.komerce.id/api/v1";

export type Destination = {
  id: number;
  label: string;          // human-readable: "Jakarta Selatan, Kebayoran Baru, ..."
  subdistrict: string;    // kelurahan
  district: string;       // kecamatan
  city: string;
  province: string;
  postalCode: string;
};

export type CourierCode = "jne" | "pos" | "tiki" | "sicepat" | "jnt" | "anteraja" | "ninja" | "wahana" | "ide";

export type CostResult = {
  courier: CourierCode;
  service: string;        // e.g. "REG", "OKE", "YES"
  description: string;    // human label
  cost: number;           // IDR
  etd: string;            // estimated delivery, e.g. "1-2"
};

export type TrackingEvent = {
  date: string;
  description: string;
  location: string;
};

export type TrackingResult = {
  delivered: boolean;
  events: TrackingEvent[];
};

/**
 * Komerce/RajaOngkir API wrapper. The key is supplied via KOMERCE_API_KEY.
 * If the key is missing the service throws a 503 — checkout / seller resi
 * input gracefully degrade with a "shipping not configured" message instead
 * of crashing.
 *
 * Cache strategy:
 *  - destinations: 1h (data rarely changes; very expensive to query)
 *  - cost:         15min (rates change occasionally)
 *  - tracking:     2min (resi events tick slowly; don't hammer the API)
 */
@Injectable()
export class ShippingService {
  private readonly log = new Logger(ShippingService.name);

  constructor(private readonly redis: RedisService) {}

  private requireKey(): string {
    if (!env.KOMERCE_API_KEY) {
      throw new ServiceUnavailableException({
        code: "shipping_not_configured",
        message: "Layanan ekspedisi belum dikonfigurasi. Hubungi admin.",
      });
    }
    return env.KOMERCE_API_KEY;
  }

  private async call<T>(method: "GET" | "POST", path: string, params?: Record<string, string | number>): Promise<T> {
    const key = this.requireKey();
    const headers = { key, "Content-Type": "application/x-www-form-urlencoded" } as const;
    let url = `${BASE_URL}${path}`;
    let body: string | undefined;

    if (method === "GET" && params) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) qs.set(k, String(v));
      url = `${url}?${qs.toString()}`;
    } else if (method === "POST" && params) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) qs.set(k, String(v));
      body = qs.toString();
    }

    const res = await fetch(url, { method, headers, body });
    const text = await res.text();
    if (!res.ok) {
      // Log the actual response body so we can tell which Komerce error
      // class fired (auth, quota, payload, dsb.). Trim to avoid blowing
      // up logs if upstream returns a giant HTML page on outages.
      this.log.warn(`Komerce ${method} ${path} → ${res.status}: ${text.slice(0, 240)}`);
      let upstreamMsg = `Komerce HTTP ${res.status}`;
      try {
        const j = JSON.parse(text);
        if (j?.meta?.message) upstreamMsg = `${upstreamMsg} — ${j.meta.message}`;
        else if (j?.message)  upstreamMsg = `${upstreamMsg} — ${j.message}`;
      } catch { /* not json */ }
      throw new BadRequestException({
        code: "shipping_upstream_error",
        message: `Layanan ekspedisi bermasalah: ${upstreamMsg}`,
      });
    }
    let json: { meta?: { code: number; message: string }; data?: unknown };
    try {
      json = JSON.parse(text);
    } catch {
      this.log.warn(`Komerce ${method} ${path} returned non-JSON: ${text.slice(0, 240)}`);
      throw new BadRequestException({
        code: "shipping_bad_response",
        message: "Layanan ekspedisi balas response tidak valid.",
      });
    }
    if (json.meta && json.meta.code !== 200) {
      throw new BadRequestException({
        code: "shipping_bad_request",
        message: json.meta.message ?? "Permintaan ekspedisi tidak valid.",
      });
    }
    return json.data as T;
  }

  /** Search destinations (cities/sub-districts) by name. */
  async searchDestinations(query: string, limit = 10): Promise<Destination[]> {
    if (!query || query.trim().length < 3) return [];
    const key = `shipping:dest:${query.toLowerCase()}:${limit}`;
    return this.redis.cached(key, 3600, async () => {
      try {
        const rows = await this.call<Array<{
          id: number; label: string; subdistrict_name: string; district_name: string;
          city_name: string; province_name: string; zip_code: string;
        }>>("GET", "/destination/domestic-destination", { search: query, limit });
        return rows.map((r) => ({
          id: r.id,
          label: r.label,
          subdistrict: r.subdistrict_name,
          district: r.district_name,
          city: r.city_name,
          province: r.province_name,
          postalCode: r.zip_code,
        }));
      } catch (e) {
        // Komerce returns 404 / "not found" while the user is still typing
        // a partial query (e.g. "wedarijaks" before "wedarijaksa"). That's
        // not a real error — surface as an empty list so the dropdown shows
        // "no results yet" instead of a red error banner.
        if (e instanceof BadRequestException) {
          const msg = (e.getResponse() as { message?: string })?.message ?? "";
          if (/HTTP 404|not found/i.test(msg)) return [];
        }
        throw e;
      }
    });
  }

  /** Calculate shipping cost between origin and destination subdistrict ids. */
  async calculateCost(originId: number, destinationId: number, weightGrams: number, couriers: CourierCode[]): Promise<CostResult[]> {
    if (couriers.length === 0) return [];
    const key = `shipping:cost:${originId}:${destinationId}:${weightGrams}:${couriers.join(",")}`;
    return this.redis.cached(key, 900, async () => {
      const rows = await this.call<Array<{
        name: string; code: string; service: string; description: string;
        cost: number; etd: string;
      }>>("POST", "/calculate/domestic-cost", {
        origin: originId,
        destination: destinationId,
        weight: weightGrams,
        courier: couriers.join(":"),
        price: "lowest",
      });
      return rows.map((r) => ({
        courier: r.code as CourierCode,
        service: r.service,
        description: r.description,
        cost: r.cost,
        etd: r.etd,
      }));
    });
  }

  /** Track an AWB (resi number) on a given courier. */
  async track(awb: string, courier: CourierCode): Promise<TrackingResult> {
    const key = `shipping:track:${courier}:${awb}`;
    return this.redis.cached(key, 120, async () => {
      const data = await this.call<{
        delivered: boolean;
        manifest: Array<{ manifest_date: string; manifest_description: string; city_name: string }>;
      }>("POST", "/track/waybill", { awb, courier });
      return {
        delivered: !!data.delivered,
        events: (data.manifest ?? []).map((e) => ({
          date: e.manifest_date,
          description: e.manifest_description,
          location: e.city_name,
        })),
      };
    });
  }
}
