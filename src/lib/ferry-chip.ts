import type { BusyLevel, LevelMeta } from "@/lib/ferry-forecast";

/**
 * AA-safe chip classes for a ferry busyness level.
 *
 * Why this exists instead of a one-line edit to LEVELS:
 * `LEVELS.light.chip` in src/lib/ferry-forecast.ts is `bg-fern/10 text-fern`.
 * That composites to #edf2ee and measures 4.29:1 — under the 4.5:1 AA floor of
 * WCAG 1.4.3 for the 12–14px chips it renders as. It is the same defect E14
 * repaired in ui.tsx and open-badge.tsx.
 *
 * ferry-forecast.ts is FROZEN (.agent-frozen), so the fix lands at the usage
 * sites instead — the two non-frozen components that render `meta.chip`. The
 * other four levels (tide/amber/orange/coral tints) already pass and are passed
 * through untouched.
 *
 * This REPLACES the class rather than appending an override, deliberately:
 * `text-fern` and `text-white` are both single-class Tailwind utilities with
 * equal specificity, so which one wins is decided by their order in the
 * generated stylesheet, not by their order in the class attribute. Appending
 * would be a coin flip that happens to look right today.
 *
 * If ferry-forecast.ts is ever unfrozen, move `bg-fern text-white` into
 * LEVELS.light.chip and delete this module.
 * tests/unit/a11y-static-invariants.test.ts asserts both halves of that coupling.
 */
export function chipClass(meta: LevelMeta): string {
  // Solid fern with white text is 4.86:1 — the house style for green chips.
  return meta.level === "light" ? "bg-fern text-white" : meta.chip;
}

/**
 * AA-safe FILL for the selected-level chip drawn inside the SVG trendline.
 *
 * The trendline paints that chip as a `<rect>` in the level's own `LEVELS[].hex`
 * with white 600-weight `<text>` on top. White fails WCAG 1.4.3 on every one of
 * the five: light 4.17, moderate 3.40, busy 2.27, very-busy 3.33, extreme 4.38.
 *
 * The 4.5:1 NORMAL-text floor is the one that applies, not the 3:1 large-text
 * one. `AXIS_FONT` is 22 *viewBox user units*, and the chart is `w-full` inside
 * a 720-unit viewBox, so the rendered size is 22 × (container ÷ 720): about
 * 10.5px in a phone-width card. That is nowhere near the 18.66px-bold large-text
 * bar (it would take a ~611px-wide container to reach it), and the threshold has
 * to hold at the narrowest viewport regardless. Busy at 2.27 fails either way.
 *
 * Why the FILL moves and not the text color: contrast against a fixed text color
 * is U-shaped in the fill's luminance, and three of these hexes sit in the
 * trough — too dark for white, too light for ink. Against --color-ink (#20262e)
 * they measure light 3.66, moderate 4.48, extreme 3.48, so NO single text color
 * — and no per-level choice between white and ink — clears AA on all five. The
 * background is what has to change.
 *
 * Each fill below is that level's own hex darkened in HSL with hue and
 * saturation held (drift ≤ 0.21°), stopping at the first rounded 8-bit value
 * where white reaches 4.6:1 — the 4.5 floor plus a deliberate margin, since
 * rounding to hex moves the ratio by ~±0.02. So the chip stays the same color
 * as the curve it labels, just deeper: the relationship a design system draws
 * between a graph line and the text-bearing chip that names it.
 *
 * This is scoped to the chip alone. The line, the marker dot, the dashed rule
 * and the legend swatches are non-text, carry no 1.4.3 obligation, and keep the
 * exact palette hex — so the chart's color language is unchanged.
 *
 * LEVELS[].hex lives in the FROZEN src/lib/ferry-forecast.ts (.agent-frozen), and
 * those hexes are the SVG palette, intentionally distinct from the --color-*
 * tokens. So — exactly as chipClass() above does for LEVELS[].chip — the repair
 * lands here at the usage site rather than in the frozen module.
 *
 * tests/unit/ferry-trendline-contrast.test.ts recomputes every ratio below from
 * these literals, so the numbers cannot drift from the code.
 */
const CHIP_FILL: Record<BusyLevel, string> = {
  light: "#2c8369", // 4.17 -> 4.61 vs #fff
  moderate: "#197ea2", // 3.40 -> 4.62
  busy: "#986d04", // 2.27 -> 4.64
  "very-busy": "#c45119", // 3.33 -> 4.63
  extreme: "#d43e3e", // 4.38 -> 4.61
};

/** Fill for the trendline's selected-level chip, safe under white text. */
export function chipFillHex(meta: LevelMeta): string {
  return CHIP_FILL[meta.level];
}
