import { Skeleton } from "@hoobiq/ui";
import { AppShell } from "./app-shell";

/**
 * Generic shell skeleton — used as `loading.tsx` fallback for pages that
 * don't have a route-specific skeleton yet. Keeps the AppShell visible so
 * the user gets immediate feedback when the route hasn't streamed in.
 */
export function PageSkeleton({
  withSidebar = true,
  variant = "default",
}: {
  withSidebar?: boolean;
  variant?: "default" | "detail" | "form";
}) {
  return (
    <AppShell withSidebar={withSidebar}>
      <div className="mx-auto max-w-[1100px] px-6 pb-8 lg:px-10">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="mt-3 h-4 w-80" />
        {variant === "form" ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-2 h-10 w-full" />
              </div>
            ))}
          </div>
        ) : variant === "detail" ? (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
            <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
            <div className="flex flex-col gap-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="mt-4 h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-2xl" />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
