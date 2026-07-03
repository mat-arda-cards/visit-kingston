// National Weather Service forecast for Kingston — free, keyless.
// Gridpoint SEW/121,78 verified for 47.796,-122.498 (Kingston ferry dock).
// NWS asks for an identifying User-Agent on every request.

const FORECAST_URL = "https://api.weather.gov/gridpoints/SEW/121,78/forecast";
const USER_AGENT = "visit-kingston-wa (community tourism site)";

export interface ForecastPeriod {
  name: string;
  temperature: number;
  temperatureUnit: string;
  shortForecast: string;
  isDaytime: boolean;
}

interface NwsForecastResponse {
  properties: { periods: ForecastPeriod[] };
}

/** Next few forecast periods (Today / Tonight / Tomorrow …). */
export async function getForecast(count = 4): Promise<ForecastPeriod[]> {
  try {
    const res = await fetch(FORECAST_URL, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as NwsForecastResponse;
    return data.properties.periods.slice(0, count);
  } catch {
    return [];
  }
}
