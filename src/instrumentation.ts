// Server-side error monitoring (Sentry), off by default. No-op entirely when
// SENTRY_DSN is unset (local dev, CI, and any deploy that hasn't wired it).
// PII floor: sendDefaultPii is false and tracesSampleRate is 0 — no visitor
// IPs, cookies, request bodies, or performance traces leave this process.
// Client-side Sentry and source-map upload are explicitly out of scope (E03).

import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (!process.env.SENTRY_DSN || process.env.NEXT_RUNTIME !== "nodejs") return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? "production",
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });
}

export const onRequestError: typeof Sentry.captureRequestError = (
  error,
  request,
  context,
) => {
  if (!process.env.SENTRY_DSN) return;
  Sentry.captureRequestError(error, request, context);
};
