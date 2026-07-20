// E09 (vk/audit-diff) — pure, dependency-free field diff between two audit
// snapshots. No IO, no server-only import: the record-history panel runs this
// in the browser against API-provided (already redacted) before/after bodies.
//
// Output is CANONICAL: entries are sorted by path regardless of key insertion
// order, because Postgres JSONB does not preserve key order — the same logical
// change must always render the same diff. Output is CAPPED: map-feature docs
// carry multi-thousand-vertex geometry, so entry count and value sizes are
// bounded (the raw-JSON toggle, lazy-loaded, is the uncapped view).

export type DiffKind = "added" | "removed" | "changed";

export type DiffEntry = {
  /** Dot-path for nested objects, [i] index paths for arrays, e.g.
   *  "hours.mon", "photos[2].url". The truncation sentinel uses path "…". */
  path: string;
  kind: DiffKind;
  from?: unknown;
  to?: unknown;
  /** Only on the truncation sentinel: "N more changes not shown". */
  note?: string;
};

/** Hard cap on entries returned; one sentinel row is appended past it. */
export const MAX_DIFF_ENTRIES = 200;
/** Walk stops collecting entirely past this — a pathological doc (huge
 *  geometry arrays) must bound work, not just output. */
const HARD_SCAN_CAP = 5000;
/** Strings longer than this are windowed around the first differing char. */
export const MAX_STRING_LENGTH = 160;
/** Objects/arrays whose JSON exceeds this render as a summary, not a dump. */
export const MAX_VALUE_LENGTH = 400;
const CONTEXT_CHARS = 40;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Window a long string around its first divergence from `other`, with
 *  ellipses marking the cut ends — enough context to see what changed
 *  without shipping a whole description paragraph per row. */
function clipString(value: string, other: unknown): string {
  if (value.length <= MAX_STRING_LENGTH) return value;
  const o = typeof other === "string" ? other : "";
  let i = 0;
  while (i < value.length && i < o.length && value[i] === o[i]) i++;
  const start = Math.max(0, i - CONTEXT_CHARS);
  const end = Math.min(value.length, Math.max(i + CONTEXT_CHARS, start + 2 * CONTEXT_CHARS));
  return (
    (start > 0 ? "…" : "") + value.slice(start, end) + (end < value.length ? "…" : "")
  );
}

/** Bound a value for display: long strings windowed, huge subtrees
 *  summarized by shape (count, not content). */
function present(value: unknown, other?: unknown): unknown {
  if (typeof value === "string") return clipString(value, other);
  if (Array.isArray(value) || isPlainObject(value)) {
    const json = JSON.stringify(value);
    if (json !== undefined && json.length > MAX_VALUE_LENGTH) {
      const n = Array.isArray(value) ? value.length : Object.keys(value).length;
      const noun = Array.isArray(value) ? "item" : "field";
      return `[${Array.isArray(value) ? "array of" : "object with"} ${n} ${noun}${n === 1 ? "" : "s"}]`;
    }
  }
  return value;
}

function sameScalar(a: unknown, b: unknown): boolean {
  return a === b || (Number.isNaN(a as number) && Number.isNaN(b as number));
}

function walk(
  before: unknown,
  after: unknown,
  path: string,
  out: DiffEntry[],
): void {
  if (out.length >= HARD_SCAN_CAP) return; // bound work on pathological docs

  const bothObjects = isPlainObject(before) && isPlainObject(after);
  const bothArrays = Array.isArray(before) && Array.isArray(after);

  if (bothObjects) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of keys) {
      walk(before[key], after[key], path ? `${path}.${key}` : key, out);
    }
    return;
  }

  if (bothArrays) {
    const len = Math.max(before.length, after.length);
    for (let i = 0; i < len; i++) {
      walk(before[i], after[i], `${path}[${i}]`, out);
    }
    return;
  }

  const hasBefore = before !== undefined;
  const hasAfter = after !== undefined;
  if (!hasBefore && !hasAfter) return;
  if (!hasBefore) {
    out.push({ path, kind: "added", to: present(after) });
    return;
  }
  if (!hasAfter) {
    out.push({ path, kind: "removed", from: present(before) });
    return;
  }
  // Mixed container/scalar types land here too — one "changed" entry, never
  // a spurious remove-everything/add-everything cascade.
  const containerInvolved =
    isPlainObject(before) || Array.isArray(before) ||
    isPlainObject(after) || Array.isArray(after);
  if (
    containerInvolved
      ? JSON.stringify(before) === JSON.stringify(after)
      : sameScalar(before, after)
  ) {
    return;
  }
  out.push({
    path,
    kind: "changed",
    from: present(before, after),
    to: present(after, before),
  });
}

/** Field-level diff of two document snapshots (either may be null — a create
 *  has no `before`). Canonically ordered, entry-capped; see module header. */
export function diffDocs(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): DiffEntry[] {
  const out: DiffEntry[] = [];
  walk(before ?? {}, after ?? {}, "", out);
  const scanCapped = out.length >= HARD_SCAN_CAP;
  out.sort((a, b) => a.path.localeCompare(b.path, "en", { numeric: true }));
  if (out.length > MAX_DIFF_ENTRIES) {
    const hidden = out.length - MAX_DIFF_ENTRIES;
    out.length = MAX_DIFF_ENTRIES;
    out.push({
      path: "…",
      kind: "changed",
      note: `${hidden}${scanCapped ? "+" : ""} more change${hidden === 1 ? "" : "s"} not shown`,
    });
  }
  return out;
}
