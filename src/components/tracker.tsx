"use client";

// Anonymous, cookie-less visit tracking for the Chamber's LTAC reporting.
//
// - <Tracker/> (wired once in the root layout) sends one "pageview" event per
//   pathname change via navigator.sendBeacon, with a fetch(keepalive)
//   fallback. sendBeacon survives navigation, so we never delay the visitor.
// - trackOutbound(href, label) records taps on outbound links — menus, order
//   links, map links, booking links — the "where they go in town" signal.
// - The session id is a random client-generated UUID kept in sessionStorage
//   ("vk-sid"): no cookies, gone when the browser session ends, never tied to
//   a person or device. Geography is derived server-side from the connection
//   (see /api/track); nothing is read from the device and no permission
//   prompt ever appears.
// - /admin paths are never tracked.

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const SESSION_KEY = "vk-sid";

// Fallback for privacy modes where sessionStorage throws.
let inMemorySessionId: string | null = null;

function newSessionId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = newSessionId();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    if (!inMemorySessionId) inMemorySessionId = newSessionId();
    return inMemorySessionId;
  }
}

function send(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  try {
    // sendBeacon queues the request even if the page unloads (outbound taps!).
    if (typeof navigator !== "undefined" && navigator.sendBeacon?.("/api/track", body)) {
      return;
    }
  } catch {
    // fall through to fetch
  }
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // best-effort telemetry; never bother the visitor
  });
}

/** Record a tap on an outbound link (menu, ordering, map, booking, ...). */
export function trackOutbound(href: string, label: string) {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (path.startsWith("/admin")) return;
  send({ type: "outbound", path, sessionId: getSessionId(), href, label });
}

/**
 * Client anchor used by ExternalLink (src/components/ui.tsx). It lives here
 * because ui.tsx must stay a shared server-safe module (server pages call its
 * mapSearchUrl/mapDirectionsUrl helpers), and an onClick handler requires a
 * client component. No preventDefault: sendBeacon survives the navigation.
 */
export function OutboundLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => trackOutbound(href, typeof children === "string" ? children : href)}
    >
      {children}
    </a>
  );
}

/** Fires one pageview per pathname change. Renders nothing. */
export function Tracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    send({ type: "pageview", path: pathname, sessionId: getSessionId() });
  }, [pathname]);

  return null;
}
