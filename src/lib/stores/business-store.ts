// Portal-editable restaurant/business listings.
// Seed data ships in src/lib/data/restaurants.ts; portal edits overlay it.

import type { Restaurant } from "../types";
import { restaurants as seed } from "../data/restaurants";
import { readMerged, writeOverlayRecord } from "./json-store";

const STORE = "restaurants";

export async function getRestaurants(): Promise<Restaurant[]> {
  return readMerged<Restaurant>(STORE, seed);
}

export async function getRestaurant(id: string): Promise<Restaurant | undefined> {
  return (await getRestaurants()).find((r) => r.id === id);
}

export async function saveRestaurant(record: Restaurant): Promise<void> {
  await writeOverlayRecord(STORE, record);
}
