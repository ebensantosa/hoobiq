import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@hoobiq/ui";

export default function Loading() {
  return (
    <AppShell active="Feeds">
      <div className="px-6 pb-8 lg:px-10">
        <div className="flex flex-wrap items-start gap-5">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-4 w-80" />
          </div>
        </div>
        <Skeleton className="mt-8 h-28" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
