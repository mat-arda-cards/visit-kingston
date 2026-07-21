// WCAG 1.4.3 contrast for the ferry trendline's selected-level chip.
//
// The chip is an SVG <rect> filled per busyness level with white 600-weight
// <text> on top (src/components/ferry-trendline.tsx). White fails on all five
// of the raw LEVELS[].hex palette values — busy is 2.27:1 — so src/lib/ferry-chip.ts
// supplies a deepened fill instead. See that module for the full rationale.
//
// This suite COMPUTES the ratios from the shipped hex literals rather than
// grepping for them, so the numbers in the comments can never drift from the
// colors actually rendered, and a future tweak to any fill fails here the moment
// it drops under AA.

import { describe, expect, it } from "vitest";
import { chipFillHex } from "@/lib/ferry-chip";
import { LEVELS, type BusyLevel } from "@/lib/ferry-forecast";

const WHITE = "#ffffff";
/** --color-ink, the only plausible dark alternative to white for the label. */
const INK = "#20262e";

/**
 * The AA floor that applies here is 4.5:1, NOT the 3:1 large-text one.
 * ferry-trendline.tsx sets fontSize={AXIS_FONT} where AXIS_FONT = 22 *viewBox
 * user units*, and the <svg> is `w-full` over a 720-unit viewBox — so the
 * rendered size is 22 × (container px ÷ 720). Reaching the 18.66px-bold
 * large-text bar would take a container ~611px wide; a phone-width card renders
 * it around 10.5px. The floor has to hold at the narrowest viewport anyway.
 */
const AA_NORMAL_TEXT = 4.5;

function toRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

/** WCAG 2.x relative luminance (sRGB, gamma-expanded per channel). */
function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Hue in degrees, for asserting the deepened fill stayed in its own color family. */
function hue(hex: string): number {
  const [r, g, b] = toRgb(hex).map((c) => c / 255);
  const mx = Math.max(r, g, b);
  const d = mx - Math.min(r, g, b);
  if (d === 0) return 0;
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h / 6) * 360;
}

const ALL_LEVELS = Object.keys(LEVELS) as BusyLevel[];

describe("ferry trendline chip contrast", () => {
  it("sanity-checks the luminance math against WCAG's own reference pairs", () => {
    // Black on white is the spec's maximum, 21:1; a color against itself is 1:1.
    expect(contrast("#000000", WHITE)).toBeCloseTo(21, 5);
    expect(contrast("#777777", WHITE)).toBeCloseTo(4.48, 2); // the classic 4.5:1 near-miss
    expect(contrast("#1E96C0", "#1E96C0")).toBeCloseTo(1, 5);
  });

  it("white label clears AA on every level's chip fill", () => {
    const failures = ALL_LEVELS.filter(
      (level) => contrast(WHITE, chipFillHex(LEVELS[level])) < AA_NORMAL_TEXT,
    ).map((level) => `${level}: ${contrast(WHITE, chipFillHex(LEVELS[level])).toFixed(2)}:1`);

    expect(
      failures,
      `chip fill(s) under the ${AA_NORMAL_TEXT}:1 AA floor for white 22u text:\n${failures.join("\n")}`,
    ).toEqual([]);
  });

  it("covers every busyness level with a distinct fill", () => {
    // A missing key would render `fill="undefined"` — a transparent chip with
    // white text on the white chart, i.e. an invisible label rather than a
    // low-contrast one. Type-checked already, but this catches a bad literal.
    const fills = ALL_LEVELS.map((level) => chipFillHex(LEVELS[level]));
    for (const fill of fills) expect(fill).toMatch(/^#[0-9a-f]{6}$/i);
    expect(new Set(fills).size).toBe(ALL_LEVELS.length);
  });

  it("keeps each chip in the hue of the curve it labels", () => {
    // The point of deepening rather than substituting: the chip must still read
    // as the same color as the line beneath it. Anything beyond a couple of
    // degrees means someone swapped in a different color, not a darker one.
    for (const level of ALL_LEVELS) {
      const raw = LEVELS[level].hex;
      const drift = Math.abs(hue(chipFillHex(LEVELS[level])) - hue(raw));
      expect(Math.min(drift, 360 - drift), `${level} chip drifted off ${raw}`).toBeLessThan(2);
    }
    // …and it must genuinely be DARKER, never lighter (lighter would send the
    // ratio the wrong way and quietly re-break the very thing this guards).
    for (const level of ALL_LEVELS) {
      expect(luminance(chipFillHex(LEVELS[level])), `${level} chip is not darker than its hex`)
        .toBeLessThan(luminance(LEVELS[level].hex));
    }
  });

  it("documents why the override exists: the raw palette hexes still fail", () => {
    // Both halves of the coupling, the pattern a11y-static-invariants.test.ts
    // uses for the other frozen-file overrides. If ferry-forecast.ts is ever
    // unfrozen and its hexes repaired upstream, this fails — delete CHIP_FILL
    // and go back to meta.hex rather than leaving dead compensation behind.
    for (const level of ALL_LEVELS) {
      expect(
        contrast(WHITE, LEVELS[level].hex),
        `LEVELS.${level}.hex now passes with white — the chip override is dead code`,
      ).toBeLessThan(AA_NORMAL_TEXT);
    }
  });

  it("confirms no text-color swap could have fixed this instead", () => {
    // The reason the FILL had to move. Contrast against a fixed text color is
    // U-shaped in the fill's luminance, and light/moderate/extreme sit in the
    // trough: too dark for white, too light for ink. If a future reader is
    // tempted by the cheaper "just use dark text" fix, this is the disproof.
    for (const level of ["light", "moderate", "extreme"] as const) {
      const hex = LEVELS[level].hex;
      expect(Math.max(contrast(WHITE, hex), contrast(INK, hex)), `${level} is fixable by text color`)
        .toBeLessThan(AA_NORMAL_TEXT);
    }
  });
});
