import { redirect } from "next/navigation";
import { BankManager } from "@/components/bank-manager";
import { getSessionUser } from "@/lib/server/session";
import { serverApi } from "@/lib/server/api";
import type { BankAccount } from "@/lib/api/banks";

export const metadata = { title: "Rekening · Pengaturan · Hoobiq" };
export const dynamic = "force-dynamic";

export default async function RekeningPage() {
  const me = await getSessionUser();
  if (!me) redirect("/masuk");
  const data = await serverApi<{ items: BankAccount[] }>("/bank-accounts");
  return <BankManager initial={data?.items ?? []} />;
}
