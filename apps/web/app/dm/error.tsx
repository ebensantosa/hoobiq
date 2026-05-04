"use client";

import * as React from "react";

export default function DMError({
  error, reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.error("[DM] client error", error);
    }
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-flame-500/15 text-flame-500">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
      <div>
        <p className="text-lg font-bold text-fg">Chat tidak bisa dibuka</p>
        <p className="mt-1 text-sm text-fg-muted">
          Ada masalah saat memuat percakapan. Coba muat ulang halaman, atau buka
          /dm tanpa parameter dulu.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex h-10 items-center rounded-full bg-brand-500 px-5 text-sm font-bold text-white hover:bg-brand-600"
        >
          Coba lagi
        </button>
        <a
          href="/dm"
          className="inline-flex h-10 items-center rounded-full border border-rule px-5 text-sm font-semibold text-fg hover:border-brand-400/60 hover:text-brand-500"
        >
          Buka inbox
        </a>
      </div>
    </div>
  );
}
