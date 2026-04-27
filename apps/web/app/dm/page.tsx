import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DMShell } from "@/components/dm-shell";
import { getSessionUser } from "@/lib/server/session";
import { serverApi } from "@/lib/server/api";
import type { DMConversation } from "@/lib/api/dm";

export const dynamic = "force-dynamic";

export default async function DMPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const me = await getSessionUser();
  if (!me) redirect("/masuk");

  const sp = await searchParams;
  const to = sp.to?.trim();

  // If `?to=username` was passed (e.g. from a profile's "Pesan" button),
  // open or resume that 1:1 conversation server-side before rendering so the
  // client lands directly in the thread instead of an empty list.
  let openConversationId: string | null = null;
  if (to && to !== me.username) {
    const started = await serverApi<{ id: string }>("/dm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ withUsername: to }),
    });
    if (started?.id) openConversationId = started.id;
  }

  const data = await serverApi<{ items: DMConversation[] }>("/dm");
  const conversations = data?.items ?? [];

  return (
    <AppShell active="Pesan" withSidebar={false}>
      <DMShell
        me={{ id: me.id, username: me.username }}
        initial={conversations}
        openConversationId={openConversationId}
      />
    </AppShell>
  );
}
