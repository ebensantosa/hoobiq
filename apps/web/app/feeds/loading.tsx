import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@hoobiq/ui";

export default function Loading() {
  return (
    <AppShell active="Feeds">
      <div className="mx-auto max-w-[1100px] px-6 pb-8 lg:px-10">
        <header className="border-b border-rule pb-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-3 h-4 w-72" />
        </header>
        <div className="mt-6 flex flex-col gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-rule bg-panel">
              <div className="flex items-center gap-3 p-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="aspect-[16/10] rounded-none" />
              <div className="flex gap-3 border-t border-rule p-3">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
