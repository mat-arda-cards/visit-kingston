"use client";

// Anonymous visitor survey feeding the Chamber's LTAC/JLARC reporting.
// No PII, no cookies — a localStorage flag just prevents re-asking.

import { useEffect, useState } from "react";
import { EditableText } from "@/lib/copy-context";
import { submitOrQueue } from "@/lib/outbox";

const DISTANCE_OPTIONS = [
  { value: "local", label: "I live nearby (Kitsap)" },
  { value: "10-50mi", label: "Western WA (10–50 mi)" },
  { value: "50mi-plus", label: "50+ miles away in WA" },
  { value: "out-of-state", label: "Out of state" },
  { value: "international", label: "Outside the U.S." },
] as const;

const LODGING_OPTIONS = ["Vacation rental / Airbnb", "B&B or inn", "Camping / RV", "Marina guest dock", "With friends or family", "Day trip only"];

type Step = "distance" | "overnight" | "details" | "done";

export function VisitorSurvey() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<Step>("distance");
  const [distanceBand, setDistanceBand] = useState<string>();
  const [overnight, setOvernight] = useState(false);
  const [lodgingNights, setLodgingNights] = useState(1);
  const [lodgingType, setLodgingType] = useState<string>();
  const [partySize, setPartySize] = useState(2);
  // E13: true when the answer went to the offline outbox instead of the wire.
  const [queued, setQueued] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("vk-survey-done")) setVisible(true);
  }, []);

  if (!visible) return null;

  async function submit(extra: { band?: string; overnight: boolean; withDetails?: boolean }) {
    // E13 bug fix: `band` is threaded in explicitly because the "local" option
    // submits in the SAME TICK as its setDistanceBand() — the closed-over state
    // is still undefined there, JSON.stringify drops the field, and the route
    // 400s it. One of the five answers has been silently discarded since the
    // survey shipped. The other two call sites submit a tick later, so the
    // state read is correct for them and stays the fallback.
    const payload = {
      distanceBand: extra.band ?? distanceBand,
      overnight: extra.overnight,
      ...(extra.withDetails ? { lodgingNights, lodgingType, partySize } : {}),
    };
    // Set before the network call, exactly as before: a visitor who answers
    // offline must never be re-prompted, so this must not depend on delivery.
    localStorage.setItem("vk-survey-done", "1");
    setStep("done");
    // E13: submitOrQueue never throws — offline answers land in the outbox and
    // are replayed later under the same idempotency key.
    const result = await submitOrQueue("/api/survey", payload);
    if (result.status === "queued") setQueued(true);
  }

  function dismiss() {
    localStorage.setItem("vk-survey-done", "1");
    setVisible(false);
  }

  return (
    <div className="rounded-2xl border border-seaglass bg-seaglass/20 p-5">
      {step !== "done" && (
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <EditableText
              as="p"
              className="font-semibold text-sound-deep"
              copyKey="survey.intro.title"/>
            <EditableText
              as="p"
              className="text-sm text-ink-soft"
              copyKey="survey.intro.subtitle"/>
          </div>
          <button onClick={dismiss} className="text-sm text-ink-soft hover:text-ink" aria-label="Dismiss survey">
            ✕
          </button>
        </div>
      )}

      {step === "distance" && (
        <div className="flex flex-wrap gap-2">
          {DISTANCE_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                setDistanceBand(o.value);
                if (o.value === "local") {
                  // Pass the band directly — see the note in submit().
                  submit({ band: o.value, overnight: false });
                } else {
                  setStep("overnight");
                }
              }}
              className="rounded-full border border-tide bg-white px-4 py-2 text-sm font-medium text-tide-deep hover:bg-tide hover:text-white"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      {step === "overnight" && (
        <div>
          <EditableText
            as="p"
            className="mb-2 text-sm font-medium text-ink"
            copyKey="survey.overnight.question"/>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setOvernight(true);
                setStep("details");
              }}
              className="rounded-full border border-tide bg-white px-5 py-2 text-sm font-medium text-tide-deep hover:bg-tide hover:text-white"
            >
              Yes
            </button>
            <button
              onClick={() => submit({ overnight: false })}
              className="rounded-full border border-tide bg-white px-5 py-2 text-sm font-medium text-tide-deep hover:bg-tide hover:text-white"
            >
              No, day trip
            </button>
          </div>
        </div>
      )}

      {step === "details" && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-ink">
            <EditableText copyKey="survey.details.nightsLabel"/>
            <input
              type="number"
              min={1}
              max={60}
              value={lodgingNights}
              onChange={(e) => setLodgingNights(Number(e.target.value))}
              className="mt-1 block w-24 rounded-lg border border-sand bg-white px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            <EditableText copyKey="survey.details.lodgingLabel"/>
            <select
              value={lodgingType ?? ""}
              onChange={(e) => setLodgingType(e.target.value || undefined)}
              className="mt-1 block w-full max-w-xs rounded-lg border border-sand bg-white px-3 py-2"
            >
              <option value="">Prefer not to say</option>
              {LODGING_OPTIONS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-ink">
            <EditableText copyKey="survey.details.partyLabel"/>
            <input
              type="number"
              min={1}
              max={50}
              value={partySize}
              onChange={(e) => setPartySize(Number(e.target.value))}
              className="mt-1 block w-24 rounded-lg border border-sand bg-white px-3 py-2"
            />
          </label>
          <button
            onClick={() => submit({ overnight, withDetails: true })}
            className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white hover:bg-coral-deep"
          >
            Done
          </button>
        </div>
      )}

      {/* Two separate self-closing elements, not one with a computed copyKey:
          tests/unit/site-copy-registry.test.ts only resolves literal keys on
          self-closing <EditableText … /> elements, and a ternary inside
          copyKey= reads as a dynamic key and fails CI (E13). */}
      {step === "done" &&
        (queued ? (
          <EditableText
            as="p"
            className="font-medium text-fern"
            copyKey="survey.queued"/>
        ) : (
          <EditableText
            as="p"
            className="font-medium text-fern"
            copyKey="survey.thankyou"/>
        ))}
    </div>
  );
}
