"use client";
import * as React from "react";
import { BoostModal } from "./boost-modal";

/**
 * Tiny client-side button that opens the BoostModal. Lives on the
 * server-rendered listing detail page so we can keep that page a
 * server component while the modal does its async work on the client.
 */
export function BoostTrigger({ listingId }: { listingId: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-md border border-flame-400/60 bg-flame-400/10 px-6 text-sm font-semibold text-flame-700 transition-colors hover:bg-flame-400/20 dark:text-flame-300"
      >
        ⚡ Boost listing
      </button>
      <BoostModal listingId={listingId} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
