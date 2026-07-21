"use client";

// E12 public suggest form (M-05-03): no account, event fields + submitter
// name + ONE contact field — nothing else (MHMDA data-minimization floor).
// The hidden "website2" input is a honeypot; humans never see it, bots that
// fill it get a quiet no-op server-side.

import { useState, type FormEvent } from "react";

const inputClass =
  "w-full rounded-lg border border-sand-deep bg-white px-3 py-2 text-sm text-ink " +
  "placeholder:text-ink-soft/60 focus:border-tide focus:outline-none";
const labelClass = "block text-sm font-medium text-sound-deep";

export function SuggestEventForm() {
  const [phase, setPhase] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPhase("busy");
    setError(null);
    const form = new FormData(e.currentTarget);
    const field = (name: string) => {
      const v = form.get(name);
      return typeof v === "string" && v.trim() ? v.trim() : undefined;
    };
    try {
      const res = await fetch("/api/events/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: field("title"),
          start: field("start"),
          end: field("end"),
          venue: field("venue"),
          description: field("description") ?? "",
          url: field("url"),
          submitterName: field("submitterName"),
          contact: field("contact"),
          website2: field("website2") ?? "",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not send the suggestion — try again.");
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
      <div className="rounded-xl border border-seaglass bg-seaglass/10 p-4" role="status">
        <p className="font-semibold text-sound-deep">Thanks — it&apos;s in the queue.</p>
        <p className="mt-1 text-sm text-ink-soft">
          The Chamber reviews every suggestion before it appears on the calendar.
          We&apos;ll only use your contact if something needs clarifying.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div>
        <label className={labelClass} htmlFor="suggest-title">
          Event title *
        </label>
        <input id="suggest-title" name="title" required maxLength={200} className={inputClass} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="suggest-start">
            Starts *
          </label>
          <input
            id="suggest-start"
            name="start"
            type="datetime-local"
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="suggest-end">
            Ends
          </label>
          <input id="suggest-end" name="end" type="datetime-local" className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="suggest-venue">
          Venue *
        </label>
        <input
          id="suggest-venue"
          name="venue"
          required
          maxLength={200}
          placeholder="Mike Wallace Park"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="suggest-description">
          What&apos;s happening?
        </label>
        <textarea
          id="suggest-description"
          name="description"
          rows={3}
          maxLength={2000}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="suggest-url">
          Link (details / tickets)
        </label>
        <input
          id="suggest-url"
          name="url"
          type="url"
          placeholder="https://…"
          maxLength={500}
          className={inputClass}
        />
      </div>

      {/* Honeypot — visually hidden, never announced; humans skip it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="suggest-website2">Website</label>
        <input id="suggest-website2" name="website2" tabIndex={-1} autoComplete="off" />
      </div>

      <fieldset className="rounded-xl border border-sand-deep p-4">
        <legend className="px-1 text-sm font-semibold text-sound-deep">About you</legend>
        <p className="mb-3 text-xs text-ink-soft">
          Just a name and one way to reach you, for the Chamber&apos;s review — your
          contact is never shown publicly.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="suggest-name">
              Your name *
            </label>
            <input
              id="suggest-name"
              name="submitterName"
              required
              maxLength={200}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="suggest-contact">
              Email or phone *
            </label>
            <input
              id="suggest-contact"
              name="contact"
              required
              maxLength={200}
              className={inputClass}
            />
          </div>
        </div>
      </fieldset>

      {error && (
        <p className="text-sm font-medium text-coral" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={phase === "busy"}
        className="justify-self-start rounded-lg bg-sound px-5 py-2.5 text-sm font-semibold text-white hover:bg-sound-deep disabled:opacity-60"
      >
        {phase === "busy" ? "Sending…" : "Suggest this event"}
      </button>
    </form>
  );
}
