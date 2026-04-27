import { redirect } from "next/navigation";
import { AddressManager } from "@/components/address-manager";
import { getSessionUser } from "@/lib/server/session";
import { serverApi } from "@/lib/server/api";
import type { Address } from "@/lib/api/addresses";

export const metadata = { title: "Alamat · Pengaturan · Hoobiq" };
export const dynamic = "force-dynamic";

export default async function AlamatPage() {
  const me = await getSessionUser();
  if (!me) redirect("/masuk");
  const data = await serverApi<{ items: Address[] }>("/addresses");
  return <AddressManager initial={data?.items ?? []} />;
}
