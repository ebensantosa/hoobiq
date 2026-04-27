import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@hoobiq/ui";

export default function Loading() {
  return (
    <AppShell active="Kategori">
      <div className="px-6 pb-8 lg:px-10">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="mt-3 h-4 w-72" />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-rule bg-panel">
              <Skeleton className="aspect-[16/9] rounded-none" />
              <div className="space-y-2 p-5">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
