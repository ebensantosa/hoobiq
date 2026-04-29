/**
 * Next.js instrumentation hook — runs once at server boot. We use it
 * to bring Sentry up early so build-time + runtime errors land in the
 * error feed. Sentry SDK installs as a no-op when SENTRY_DSN is unset
 * (dev), so this file is safe to ship without env config.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN && !process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
      }
      return event;
    },
  });
}

export async function onRequestError(...args: Parameters<NonNullable<Awaited<ReturnType<typeof loadCaptureRequestError>>>>) {
  const captureRequestError = await loadCaptureRequestError();
  return captureRequestError?.(...args);
}

async function loadCaptureRequestError() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN && !process.env.SENTRY_DSN) return null;
  const Sentry = await import("@sentry/nextjs");
  return Sentry.captureRequestError;
}
