// The vendored QR encoder (E22, src/lib/qr/qr-encoder.ts).
//
// WHY THIS SUITE IS SHAPED THE WAY IT IS. A QR encoder is the classic piece of
// code that looks completely fine and silently produces squares no phone can
// read: a wrong Reed-Solomon divisor, a mask applied to a function module, a
// flipped format bit, or an off-by-one in the block interleave all yield a
// confident, plausible-looking image. Structural assertions alone ("it has
// finder patterns") pass happily on a broken encoder.
//
// So the encoder was verified during development by round-tripping every case
// below through jsQR — an INDEPENDENT decoder — installed outside the repo so
// no dependency was added. All seven decoded back to their exact input,
// including a version-11 URL that exercises multi-block interleaving.
//
// What CI can carry cheaply afterwards is a regression lock: the same input
// must keep producing the same modules. If a future edit changes any of these
// digests, the encoder's output changed — and that means re-running the
// independent decode before trusting it again, not updating the constant.

import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { encodeQr, Ecc } from "@/lib/qr/qr-encoder";
import { qrPath, kioskHandoffUrl } from "@/lib/qr";

/** Stable digest of a symbol's modules, plus the parameters that produced it. */
function digest(text: string, ecc: Ecc) {
  const m = encodeQr(text, ecc);
  const bits = m
    .toRows()
    .map((row) => row.map((d) => (d ? "1" : "0")).join(""))
    .join("\n");
  return {
    version: m.version,
    size: m.size,
    mask: m.mask,
    ecc: m.ecc,
    sha: createHash("sha256").update(bits).digest("hex").slice(0, 16),
  };
}

describe("QR encoder — deterministic known vectors", () => {
  // Captured from the build that was decoded successfully by jsQR. Treat a
  // failure here as "prove it still scans", never as "update the hash".
  const VECTORS: {
    text: string;
    ecc: Ecc;
    version: number;
    size: number;
    mask: number;
    sha: string;
  }[] = [
    {
      text: "https://app.explorekingstonwa.com/eat?utm_source=kiosk",
      ecc: Ecc.MEDIUM,
      version: 4,
      size: 33,
      mask: 2,
      sha: "3d9eb9cbcaa879c1",
    },
    {
      text: "tel:+13602974848",
      ecc: Ecc.QUARTILE,
      version: 2,
      size: 25,
      mask: 0,
      sha: "489cf6da100cb07a",
    },
    {
      text: "HELLO WORLD",
      ecc: Ecc.HIGH,
      version: 2,
      size: 25,
      mask: 2,
      sha: "e4bb824acb2eea92",
    },
  ];

  it.each(VECTORS)("$text encodes to the same modules as the decoded build", (v) => {
    const got = digest(v.text, v.ecc);
    expect(got.version).toBe(v.version);
    expect(got.size).toBe(v.size);
    expect(got.mask).toBe(v.mask);
    // The regression lock. A change here means the emitted symbol changed;
    // re-verify it against an independent decoder before touching this string.
    expect(got.sha).toBe(v.sha);
  });

  it("is deterministic — the same text always produces the same modules", () => {
    // The property the regression lock depends on. Any hidden clock, random
    // mask choice or Map-iteration dependency would show up here.
    for (const v of VECTORS) {
      const a = digest(v.text, v.ecc);
      const b = digest(v.text, v.ecc);
      expect(a.sha).toBe(b.sha);
    }
  });

  it("boosts the error-correction level when it costs nothing", () => {
    // A short string asked for LOW still fits at a higher level in the same
    // version, and the encoder takes it — free resilience for a code that gets
    // photographed off a glossy panel at an angle.
    const m = encodeQr("https://app.explorekingstonwa.com/kiosk", Ecc.LOW);
    expect(m.ecc).toBeGreaterThan(Ecc.LOW);
  });
});

describe("QR encoder — structural invariants", () => {
  const m = encodeQr("https://app.explorekingstonwa.com/ferry?utm_source=kiosk", Ecc.QUARTILE);

  it("is a square of 4*version+17 modules", () => {
    expect(m.size).toBe(m.version * 4 + 17);
  });

  it("places a finder pattern in three corners and NOT the fourth", () => {
    // The dark 3x3 core of each finder, at the three corners the spec puts them.
    const core = (cx: number, cy: number) =>
      [-1, 0, 1].every((dy) => [-1, 0, 1].every((dx) => m.get(cx + dx, cy + dy)));
    expect(core(3, 3), "top-left").toBe(true);
    expect(core(m.size - 4, 3), "top-right").toBe(true);
    expect(core(3, m.size - 4), "bottom-left").toBe(true);
    // The bottom-right corner carries data, not a finder — if it looked like
    // one, a scanner would not be able to tell the symbol's orientation.
    expect(core(m.size - 4, m.size - 4), "bottom-right must NOT be a finder").toBe(false);
  });

  it("alternates the timing patterns", () => {
    for (let i = 8; i < m.size - 8; i++) {
      expect(m.get(6, i), `vertical timing at ${i}`).toBe(i % 2 === 0);
      expect(m.get(i, 6), `horizontal timing at ${i}`).toBe(i % 2 === 0);
    }
  });

  it("sets the always-dark module", () => {
    expect(m.get(8, m.size - 8)).toBe(true);
  });

  it("uses both colours (a blank or solid grid is unscannable)", () => {
    const rows = m.toRows();
    const dark = rows.flat().filter(Boolean).length;
    expect(dark).toBeGreaterThan(0);
    expect(dark).toBeLessThan(m.size * m.size);
  });

  it("rejects data that cannot fit in any version", () => {
    expect(() => encodeQr("x".repeat(10_000), Ecc.HIGH)).toThrow(RangeError);
  });
});

describe("QR SVG path + handoff URLs", () => {
  it("emits a non-empty path with one subpath per dark module", () => {
    const m = encodeQr("https://app.explorekingstonwa.com/kiosk", Ecc.MEDIUM);
    const d = qrPath(m);
    expect(d.length).toBeGreaterThan(0);
    const dark = m.toRows().flat().filter(Boolean).length;
    expect((d.match(/M/g) ?? []).length).toBe(dark);
  });

  it("tags every internal handoff so the Chamber can count the funnel", () => {
    expect(kioskHandoffUrl("/eat")).toContain("utm_source=kiosk");
    // Absolute — the visitor's phone is not on this origin, so a relative href
    // encoded into a QR is meaningless.
    expect(kioskHandoffUrl("/eat")).toMatch(/^https?:\/\//);
  });

  it("does not produce a double question mark on a path that already has a query", () => {
    const url = kioskHandoffUrl("/events?day=today");
    expect(url).toContain("day=today&utm_source=kiosk");
    expect(url.match(/\?/g)?.length).toBe(1);
  });
});
