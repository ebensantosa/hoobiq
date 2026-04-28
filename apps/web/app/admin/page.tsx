import { redirect } from "next/navigation";

// Legacy /admin route → /admin-panel. Bookmarks, old emails, and external
// links keep working. Catch-all version below preserves deeper paths.
export default function AdminRedirect() {
  redirect("/admin-panel");
}
