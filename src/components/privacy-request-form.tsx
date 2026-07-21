"use client";

// E11 consumer privacy-request intake form (public, no account). Posts to
// /api/privacy/request; the Chamber fulfills it from the E08 worklist within
// 45 days (RCW 19.373). No cookies, no analytics on this form — the contact
// you type here is used only to answer you and is deleted once the request
// is resolved.

import { useState } from "react";

type Kind = "access" | "delete" | "records";

const KINDS: { value: Kind; label: string; help: string }[] = [
  { value: "access", label: "See my data", help: "Get a copy of what, if anything, is tied to you." },
  { value: "delete", label: "Delete my data", help: "Ask us to remove or anonymize your data." },
  {
    value: "records",
    label: "Public-records request",
    help: "A formal records request to the Chamber (a quasi-public, lodging-tax-funded body).",
  },
];

export function PrivacyRequestForm() {
  const [kind, setKind] = useState<Kind>("access");
  const [contact, setContact] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!contact.trim()) return;
    setState("sending");
    try {
      const res = await fetch("/api/privacy/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, contact: contact.trim(), note: note.trim() || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: string };
      if (res.ok && data.ok) {
        setState("done");
        setMessage(data.message ?? "Request received. We respond within 45 days.");
      } else {
        setState("error");
        setMessage(data.error ?? "Something went wrong — please try again.");
      }
    } catch {
      setState("error");
      setMessage("Could not reach the server — please try again.");
    }
  }

  if (state === "done") {
    return (
      <p className="rounded-lg bg-seaglass/30 p-4 text-sm text-sound-deep" role="status">
        {message}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset>
        <legend className="text-sm font-semibold text-ink">What would you like to do?</legend>
        <div className="mt-2 space-y-2">
          {KINDS.map((k) => (
            <label key={k.value} className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                name="kind"
                value={k.value}
                checked={kind === k.value}
                onChange={() => setKind(k.value)}
                className="mt-1"
              />
              <span>
                <span className="font-medium text-ink">{k.label}</span>
                <span className="block text-ink-soft">{k.help}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="pr-contact" className="text-sm font-semibold text-ink">
          How can we reach you?
        </label>
        <input
          id="pr-contact"
          type="text"
          required
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Email or phone"
          className="mt-1 w-full rounded-lg border border-sand px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-ink-soft">
          Used only to answer this request, then deleted when it&apos;s resolved. No account needed.
        </p>
      </div>

      <div>
        <label htmlFor="pr-note" className="text-sm font-semibold text-ink">
          Anything else? <span className="font-normal text-ink-soft">(optional)</span>
        </label>
        <textarea
          id="pr-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-sand px-3 py-2 text-sm"
        />
      </div>

      {state === "error" && (
        <p className="text-sm text-coral" role="alert">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={state === "sending" || !contact.trim()}
        className="rounded-lg bg-sound px-4 py-2 text-sm font-semibold text-white hover:bg-sound-deep disabled:opacity-50"
      >
        {state === "sending" ? "Sending…" : "Send request"}
      </button>
    </form>
  );
}
