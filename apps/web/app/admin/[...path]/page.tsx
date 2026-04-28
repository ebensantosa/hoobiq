import { redirect } from "next/navigation";

export default async function AdminLegacyRedirect({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  redirect(`/admin-panel/${path.join("/")}`);
}
