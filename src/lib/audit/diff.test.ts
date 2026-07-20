// E09 golden cases for the pure snapshot diff (vk/audit-diff).

import { describe, expect, it } from "vitest";

import {
  MAX_DIFF_ENTRIES,
  MAX_STRING_LENGTH,
  diffDocs,
  type DiffEntry,
} from "./diff";

const byPath = (entries: DiffEntry[]) =>
  Object.fromEntries(entries.map((e) => [e.path, e]));

describe("diffDocs", () => {
  it("returns [] for identical docs", () => {
    const doc = { id: "r1", name: "Nom Nom", hours: { mon: "8-4" } };
    expect(diffDocs(doc, { ...doc, hours: { mon: "8-4" } })).toEqual([]);
  });

  it("golden: nested object change uses dot-paths", () => {
    const before = { id: "r1", hours: { mon: "8-4", tue: "8-4" } };
    const after = { id: "r1", hours: { mon: "8-4", tue: "8-9" } };
    expect(diffDocs(before, after)).toEqual([
      { path: "hours.tue", kind: "changed", from: "8-4", to: "8-9" },
    ]);
  });

  it("golden: array reorder shows per-index changes", () => {
    const before = { id: "i1", stops: ["cafe", "beach", "pier"] };
    const after = { id: "i1", stops: ["beach", "cafe", "pier"] };
    const diff = byPath(diffDocs(before, after));
    expect(diff["stops[0]"]).toEqual({
      path: "stops[0]",
      kind: "changed",
      from: "cafe",
      to: "beach",
    });
    expect(diff["stops[1]"]).toEqual({
      path: "stops[1]",
      kind: "changed",
      from: "beach",
      to: "cafe",
    });
    expect(diff["stops[2]"]).toBeUndefined();
  });

  it("golden: array growth/shrink yields added/removed at indices", () => {
    const grown = byPath(diffDocs({ tags: ["a"] }, { tags: ["a", "b"] }));
    expect(grown["tags[1]"]).toEqual({ path: "tags[1]", kind: "added", to: "b" });
    const shrunk = byPath(diffDocs({ tags: ["a", "b"] }, { tags: ["a"] }));
    expect(shrunk["tags[1]"]).toEqual({ path: "tags[1]", kind: "removed", from: "b" });
  });

  it("golden: create — null before marks every top-level field added", () => {
    const diff = diffDocs(null, { id: "w1", name: "Port cam", url: "https://x" });
    expect(diff).toEqual([
      { path: "id", kind: "added", to: "w1" },
      { path: "name", kind: "added", to: "Port cam" },
      { path: "url", kind: "added", to: "https://x" },
    ]);
  });

  it("golden: tombstone-shaped after reads as removals plus the marker", () => {
    const before = { id: "r1", name: "Nom Nom", phone: "360-555-0100" };
    const after = { id: "r1", _deleted: true };
    const diff = byPath(diffDocs(before, after));
    expect(diff["_deleted"]).toEqual({ path: "_deleted", kind: "added", to: true });
    expect(diff["name"]).toEqual({ path: "name", kind: "removed", from: "Nom Nom" });
    expect(diff["phone"]?.kind).toBe("removed");
    expect(diff["id"]).toBeUndefined();
  });

  it("golden: map-feature-sized geometry doc is capped, does not crash", () => {
    const ring = (seed: number) =>
      Array.from({ length: 4000 }, (_, i) => [seed + i * 0.0001, 47.79 + i * 0.0001]);
    const before = { id: "f1", title: "Trail", geometry: { type: "LineString", coordinates: ring(122.49) } };
    const after = { id: "f1", title: "Trail", geometry: { type: "LineString", coordinates: ring(122.51) } };
    const diff = diffDocs(before, after);
    expect(diff.length).toBeLessThanOrEqual(MAX_DIFF_ENTRIES + 1);
    const sentinel = diff[diff.length - 1];
    expect(sentinel.path).toBe("…");
    expect(sentinel.note).toMatch(/more changes not shown/);
  });

  it("windows long strings around the first difference, with context", () => {
    const base = "a".repeat(300);
    const before = { desc: `${base}OLD${"z".repeat(300)}` };
    const after = { desc: `${base}NEW${"z".repeat(300)}` };
    const [entry] = diffDocs(before, after);
    expect(entry.kind).toBe("changed");
    const from = entry.from as string;
    const to = entry.to as string;
    expect(from.length).toBeLessThan(MAX_STRING_LENGTH);
    expect(from).toContain("OLD");
    expect(to).toContain("NEW");
    expect(from.startsWith("…")).toBe(true);
    expect(from.endsWith("…")).toBe(true);
  });

  it("summarizes huge subtree values instead of dumping them", () => {
    const diff = byPath(
      diffDocs({ id: "f1" }, { id: "f1", geometry: { coordinates: Array.from({ length: 500 }, (_, i) => i) } }),
    );
    expect(diff["geometry"]).toEqual({
      path: "geometry",
      kind: "added",
      to: "[object with 1 field]",
    });
  });

  it("is canonical: key insertion order does not change output", () => {
    const a = diffDocs({ b: 1, a: 2 }, { a: 3, b: 4 });
    const b = diffDocs({ a: 2, b: 1 }, { b: 4, a: 3 });
    expect(a).toEqual(b);
    expect(a.map((e) => e.path)).toEqual(["a", "b"]);
  });

  it("treats a type change as one changed entry, not a cascade", () => {
    const diff = diffDocs({ hours: "8-4" }, { hours: { mon: "8-4" } });
    expect(diff).toEqual([
      { path: "hours", kind: "changed", from: "8-4", to: { mon: "8-4" } },
    ]);
  });

  it("handles null and boolean scalars", () => {
    const diff = byPath(diffDocs({ open: true, note: null }, { open: false, note: "hi" }));
    expect(diff["open"]).toEqual({ path: "open", kind: "changed", from: true, to: false });
    expect(diff["note"]).toEqual({ path: "note", kind: "changed", from: null, to: "hi" });
  });
});
