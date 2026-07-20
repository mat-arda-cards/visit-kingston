"use client";

// E08 report-inaccurate affordance (M-19-04): a quiet "Report an issue" link
// that expands into a two-field inline form — what's wrong, and an OPTIONAL
// way to reach you. No navigation, no account, no location capture (M-15-06).
// POSTs to /api/report; repeated reports on the same record merge into one
// Chamber worklist item server-side.

import { useId, useState, type FormEvent } from "react";

export function ReportInaccurate({
  store,
  id,
  subject,
}: {
  /** Content store name, e.g. "restaurants" | "events". */
  store: string;
  /** Record id within the store. */
  id: string;
  /** Human name used in the prompt copy (defaults to "this listing"). */
  subject?: string;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [phase, setPhase] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const messageId = useId();
  const contactId = useId();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setPhase("busy");
    setError(null);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store,
          id,
          message,
          ...(contact.trim() ? { contact } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not send the report — try again.");
        setPhase("idle");
        return;
      }
      setPhase("done");
    } catch {
      setError("Could not reach the server — try again.");
      setPhase("idle");
    }
  }

  if (phase === "done") {
    return (
      <p className="mt-2 text-xs font-medium text-fern" role="status">
        Thanks — the Chamber will take a look.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={false}
        className="mt-2 text-xs font-medium text-ink-soft underline underline-offset-2 hover:text-ink"
      >
        Report an issue
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-2 rounded-lg border border-sand bg-white/60 p-3">
      <label htmlFor={messageId} className="block text-xs font-medium text-ink">
        What looks wrong with {subject ?? "this listing"}?
        <textarea
          id={messageId}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          required
          maxLength={2000}
          placeholder="Hours changed, phone disconnected, event cancelled…"
          className="mt-1 block w-full rounded-lg border border-sand bg-white px-2 py-1.5 text-sm"
        />
      </label>
      <label htmlFor={contactId} className="block text-xs font-medium text-ink">
        How to reach you <span className="font-normal text-ink-soft">(optional)</span>
        <input
          id={contactId}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          maxLength={200}
          placeholder="Email or phone, only if you'd like a reply"
          className="mt-1 block w-full rounded-lg border border-sand bg-white px-2 py-1.5 text-sm"
        />
      </label>
      {error && (
        <p className="text-xs font-medium text-coral-deep" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={phase === "busy" || !message.trim()}
          className="rounded-full bg-sound px-4 py-1.5 text-xs font-semibold text-white hover:bg-sound-deep disabled:opacity-50"
        >
          {phase === "busy" ? "Sending…" : "Send report"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-sand bg-white px-4 py-1.5 text-xs font-medium text-ink hover:border-tide"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
