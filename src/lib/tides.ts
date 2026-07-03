// NOAA CO-OPS tide predictions for Kingston, Appletree Cove — free, keyless.
// Station 9445639 verified (NOT 9445478, which is Union/Hood Canal).

const STATION = "9445639";

export interface TidePrediction {
  /** ISO-ish local time from NOAA, e.g. "2026-07-02 14:30" (station local time) */
  time: string;
  type: "high" | "low";
  heightFeet: number;
}

interface NoaaResponse {
  predictions?: { t: string; v: string; type: "H" | "L" }[];
}

/** Today's high/low tide predictions at Appletree Cove. */
export async function getTodaysTides(): Promise<TidePrediction[]> {
  const url =
    `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter` +
    `?product=predictions&station=${STATION}&datum=MLLW&interval=hilo` +
    `&date=today&time_zone=lst_ldt&units=english&format=json`;
  try {
    const res = await fetch(url, { next: { revalidate: 21600 } });
    if (!res.ok) return [];
    const data = (await res.json()) as NoaaResponse;
    return (data.predictions ?? []).map((p) => ({
      time: p.t,
      type: p.type === "H" ? "high" : "low",
      heightFeet: Number(p.v),
    }));
  } catch {
    return [];
  }
}
