// Curated lodging for the Stay page — hand-entered, no scraped OTA data.
// Sources: Chamber records and the Chamber's own accommodations list at
// explorekingstonwa.com/accommodations (verified live July 2026).
// Airbnb/VRBO are linked from the page as plain search deep links only;
// scraping or mirroring their listings violates their terms of service.
// bookingUrl/website are set only where a real URL was verified or is the
// operator's well-known official domain — confirm before major promotion.

import type { Lodging } from "../types";

export const lodging: Lodging[] = [
  {
    id: "point-casino-hotel",
    name: "The Point Casino & Hotel",
    type: "hotel",
    description:
      "The Port Gamble S'Klallam Tribe's hotel, about a 10-minute drive north of the ferry dock — the closest full-service hotel rooms to downtown Kingston. Restaurants on site; the gaming floor is 21+, but the hotel itself makes an easy base for exploring the north end of the peninsula.",
    address: "Kingston, WA",
    tags: ["Closest hotel to the ferry", "Dining on site", "About 10 min drive"],
  },
  {
    id: "clearwater-casino-resort",
    name: "Clearwater Casino Resort",
    type: "hotel",
    description:
      "The Suquamish Tribe's waterfront resort on Agate Passage, roughly a 15-minute drive south of Kingston. Resort-style rooms and several restaurants, with the Agate Pass bridge to Bainbridge Island right next door.",
    address: "Suquamish, WA",
    tags: ["Resort", "Waterfront", "About 15 min drive"],
  },
  {
    id: "kingston-area-vacation-rentals",
    name: "Kingston-area vacation rentals",
    type: "vacation-rental",
    description:
      "Around 30 whole homes and cabins in Kingston, Indianola, Port Gamble, and Suquamish — beach cabins, waterfront houses, in-town cottages. The Chamber keeps a hand-checked list with links to each owner's own listing. Read the fine print: a few ask for 30-day minimum stays or only rent seasonally.",
    website: "https://explorekingstonwa.com/accommodations/",
    tags: ["Beach cabins", "Whole homes", "Book with owners"],
  },
  {
    id: "kitsap-memorial-state-park",
    name: "Kitsap Memorial State Park",
    type: "camping",
    description:
      "State-park camping on Hood Canal, about a 15-minute drive west of the ferry. Fall asleep to saltwater on one side and tall firs on the other, then be back in Kingston in time for breakfast. Summer weekends book out early — reserve through Washington State Parks.",
    address: "Poulsbo, WA",
    website: "https://parks.wa.gov",
    tags: ["Campsites", "Hood Canal shoreline", "Reserve ahead"],
  },
  {
    id: "port-of-kingston-guest-moorage",
    name: "Port of Kingston guest moorage",
    type: "marina",
    description:
      "Arriving by water? The marina in Appletree Cove sits right beside the ferry terminal, and guest slips put you a two-minute walk from coffee, dinner, and the waterfront park. Slips go fast on summer weekends — check current rates and availability with the Port before you cruise in.",
    address: "Kingston, WA",
    website: "https://www.portofkingston.org",
    tags: ["Guest slips", "Steps from downtown", "Boat-in"],
  },
];
