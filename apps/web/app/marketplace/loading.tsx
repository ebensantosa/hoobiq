import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@hoobiq/ui";

export default function Loading() {
  return (
    <AppShell active="Marketplace">
      <div className="px-6 pb-8 lg:px-10">
        <header className="border-b border-rule pb-6">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="mt-3 h-4 w-72" />
        </header>
        <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-rule bg-panel">
              <Skeleton className="aspect-square rounded-none" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-5 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
