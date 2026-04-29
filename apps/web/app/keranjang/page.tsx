import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CartList } from "./cart-list";
import { serverApi } from "@/lib/server/api";
import { getSessionUser } from "@/lib/server/session";
import type { CartItem } from "@/lib/api/cart";

export const metadata = { title: "Keranjang · Hoobiq" };
export const dynamic = "force-dynamic";

export default async function KeranjangPage() {
  const me = await getSessionUser();
  if (!me) redirect("/masuk?next=/keranjang");

  const data = await serverApi<{ items: CartItem[]; subtotalIdr: number }>("/cart");
  const items = data?.items ?? [];
  const subtotal = data?.subtotalIdr ?? 0;

  return (
    <AppShell active="Keranjang">
      <div className="px-4 pb-12 sm:px-6 lg:px-10">
        <header className="border-b border-rule pb-6">
          <h1 className="text-3xl font-bold text-fg md:text-4xl">Keranjang</h1>
          <p className="mt-2 text-sm text-fg-muted">
            {items.length === 0
              ? "Belum ada item di keranjang. Mulai belanja dari marketplace."
              : `${items.length} item · subtotal Rp ${subtotal.toLocaleString("id-ID")}`}
          </p>
        </header>

        {items.length === 0 ? (
          <div className="mt-10 rounded-md border border-rule bg-panel/40 p-10 text-center">
            <p className="text-base font-medium text-fg">Keranjang kosong.</p>
            <p className="mt-2 text-sm text-fg-muted">
              <Link href="/marketplace" className="text-brand-500">
                Buka marketplace
              </Link>
            </p>
          </div>
        ) : (
          <CartList initialItems={items} initialSubtotal={subtotal} />
        )}
      </div>
    </AppShell>
  );
}
