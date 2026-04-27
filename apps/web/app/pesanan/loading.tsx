import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@hoobiq/ui";

export default function Loading() {
  return (
    <AppShell active="Marketplace">
      <div className="px-6 pb-8 lg:px-10">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="mt-3 h-4 w-72" />
        <div className="mt-6 flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 rounded-2xl border border-rule bg-panel p-4">
              <Skeleton className="h-16 w-16" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
