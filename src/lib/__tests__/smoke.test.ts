import { describe, expect, it } from "vitest";
import { pacificWallTimeToISO } from "@/lib/time";

describe("vitest scaffolding", () => {
  it("runs and resolves the @/ alias", () => {
    expect(pacificWallTimeToISO("2026-08-01", "15:00")).toMatch(/-07:00$/);
  });
});
