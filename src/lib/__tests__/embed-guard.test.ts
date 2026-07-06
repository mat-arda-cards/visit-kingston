import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

// The embed is a non-module ES5 browser script (no exports to import), so
// this guards it by asserting on its source text directly: the scheme-check
// regex literal is present, and the a.href assignment sits inside the
// branch it guards.
describe("kingston-events.js scheme guard", () => {
  it("guards a.href with an http(s)-only check", () => {
    const src = readFileSync(
      path.join(process.cwd(), "public/embed/kingston-events.js"),
      "utf8",
    );
    const lines = src.split("\n");
    const guardLine = lines.findIndex((l) => l.includes("^https?:"));
    expect(guardLine).toBeGreaterThanOrEqual(0);

    const hrefLine = lines.findIndex(
      (l, i) => i > guardLine && i <= guardLine + 3 && l.includes("a.href"),
    );
    expect(hrefLine).toBeGreaterThanOrEqual(0);
  });
});
