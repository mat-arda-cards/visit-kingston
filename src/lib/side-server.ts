// Server-only counterpart to ./side: reads the "vk-side" cookie so server
// components can render for the visitor's current side. Keep this out of any
// "use client" module — next/headers only exists on the server.

import { cookies } from "next/headers";
import { SIDE_COOKIE, type WaterSide } from "./side";

/** The visitor's chosen/detected side from the cookie; defaults to "kingston". */
export async function getSide(): Promise<WaterSide> {
  const c = await cookies();
  return c.get(SIDE_COOKIE)?.value === "edmonds" ? "edmonds" : "kingston";
}
