import { api } from "./client";

export type Address = {
  id: string;
  label: string;
  name: string;
  phone: string;
  line: string;
  // Kelurahan + kecamatan — auto-filled by destination picker, kept
  // optional for legacy rows.
  subdistrict?: string | null;
  district?: string | null;
  city: string;
  province: string;
  postal: string;
  // RajaOngkir/Komerce subdistrict id — required for accurate ongkir at
  // checkout. Optional here for legacy rows; checkout warns if missing.
  subdistrictId: number | null;
  primary: boolean;
};

export type AddressInput = Omit<Address, "id">;

export const addressesApi = {
  list:   () => api<{ items: Address[] }>("/addresses"),
  create: (body: AddressInput) => api<Address>("/addresses", { method: "POST", body }),
  update: (id: string, body: Partial<AddressInput>) =>
    api<Address>(`/addresses/${id}`, { method: "PATCH", body }),
  remove: (id: string) => api<void>(`/addresses/${id}`, { method: "DELETE" }),
};
