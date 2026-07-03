// Scavenger hunt definitions. Static data, no backend — progress lives in
// localStorage on the player's phone (see components/hunt-player.tsx).
//
// Coordinates are deliberately approximate and radii deliberately generous
// (80–150 m): GPS is an assist, not a gate. A player who can't get a fix —
// or whose fix says "too far" — can always complete a stop with the photo
// or the honor system, so a slightly-off pin never strands anyone.

import type { Hunt } from "@/lib/types";

export const hunts: Hunt[] = [
  {
    id: "downtown-discovery",
    slug: "downtown-discovery",
    title: "Downtown Discovery",
    description:
      "A lazy loop through Kingston's walkable core — the ferry dock, the marina, two parks, and the main drag. Easy sidewalks the whole way, stroller-friendly, and you're never more than a few blocks from the water.",
    difficulty: "easy",
    durationMinutes: 45,
    stops: [
      {
        id: "dd-ferry-overlook",
        title: "The Ferry Overlook",
        clue: "I carry cars that cannot swim and walkers by the score. I hum across to Edmonds, then hum back to this shore. Find a spot where you can watch me come and go.",
        hint: "Head toward the ferry terminal and find a place with a clear view of the loading dock and the water.",
        lat: 47.7955,
        lng: -122.4946,
        radiusMeters: 110,
        photoPrompt: "Selfie with the ferry behind you — or the empty dock waiting for one.",
        funFact:
          "Look east across the water: that's Edmonds on the far shore, and on a clear day the Cascades stack up right behind it.",
      },
      {
        id: "dd-mike-wallace",
        title: "Mike Wallace Park",
        clue: "I'm the patch of grass where picnic blankets meet sailboat masts. Find the park squeezed between the ferry and the marina.",
        hint: "Mike Wallace Park sits right beside the marina, a short walk from the ferry terminal.",
        lat: 47.7966,
        lng: -122.4976,
        radiusMeters: 90,
        photoPrompt: "Group shot on the lawn with sailboat masts poking up behind you.",
        funFact:
          "This little park sits right on Appletree Cove — marina on one side, ferry on the other. Best people-watching bench in town.",
      },
      {
        id: "dd-marina-docks",
        title: "The Marina Docks",
        clue: "A forest grows here with no leaves at all — its trees are white and silver, and they clink when the wind blows.",
        hint: "Sailboat masts! Walk toward the Port of Kingston marina and listen for the rigging.",
        lat: 47.7975,
        lng: -122.4962,
        radiusMeters: 130,
        photoPrompt: "Photo of your favorite boat name on a stern — bonus points for a funny one.",
        funFact:
          "That clinking is halyards — the lines that raise the sails — tapping against the masts. A marina's wind chime.",
      },
      {
        id: "dd-village-green",
        title: "The Village Green",
        clue: "I'm a green with a very literal name. Neighbors meet here, kids run here, and there's a community center to prove it.",
        hint: "Head a few blocks up from the waterfront to the Village Green Community Center and its big open lawn.",
        lat: 47.7997,
        lng: -122.4986,
        radiusMeters: 150,
        photoPrompt: "Best jumping-jack photo on the lawn. Everyone airborne at once for full credit.",
        funFact:
          "If something's happening in Kingston that isn't on the water, odds are it's happening here on the Village Green.",
      },
      {
        id: "dd-art-on-104",
        title: "Art on the Strip",
        clue: "Cars idle along this road waiting for the boat, and somewhere among the shops a wall decided plain paint was boring. Find art out in the open — a mural, a painted sign, anything bigger than your front door.",
        hint: "Walk the main drag (Highway 104) through downtown and scan the building walls for any large outdoor art.",
        lat: 47.795,
        lng: -122.4993,
        radiusMeters: 140,
        photoPrompt: "Copy the pose, colors, or mood of the art you found.",
        funFact:
          "Downtown Kingston is barely three blocks long — every shop here watches the ferry line roll past all day.",
      },
      {
        id: "dd-kola-kole",
        title: "Kola Kole Park",
        clue: "Up the hill from the shops waits a park whose name is fun to say twice, shaded by tall evergreens.",
        hint: "Kola Kole Park is just up from the main drag on the west side of downtown.",
        lat: 47.7945,
        lng: -122.5004,
        radiusMeters: 130,
        photoPrompt: "Find the most fun thing in this park and take a picture with it.",
        funFact:
          "Say it five times fast: Kola Kole, Kola Kole… The evergreen shade up here is noticeably cooler than the ferry lanes on a sunny day.",
      },
      {
        id: "dd-cove-finale",
        title: "Back to the Cove",
        clue: "Finish where the town meets the tide: find the stretch of shoreline where Appletree Cove says hello to the ferry dock.",
        hint: "Head back down to the water near the ferry terminal — any spot where you can stand by the beach with the cove in view.",
        lat: 47.7959,
        lng: -122.4938,
        radiusMeters: 140,
        photoPrompt: "Whole-crew victory shot with the water behind you.",
        funFact:
          "Appletree Cove has been Kingston's front door for as long as there's been a Kingston — ferries, sailboats, kayaks, and herons all share the same driveway.",
      },
    ],
  },
  {
    id: "waterfront-wander",
    slug: "waterfront-wander",
    title: "Waterfront Wander",
    description:
      "A slower ramble along the marina and the Appletree Cove shoreline. Expect some gravel, beach, and driftwood underfoot — wear shoes that can get sandy, and check the tide if you want to see the flats.",
    difficulty: "moderate",
    durationMinutes: 75,
    stops: [
      {
        id: "ww-guest-dock",
        title: "The Guest Dock",
        clue: "Boats that don't live here still need a place to sleep. Find where visiting vessels tie up for the night.",
        hint: "Walk into the marina area and look for the guest moorage — the dock where the boats change from day to day. Stay on the public walkways.",
        lat: 47.7971,
        lng: -122.4959,
        radiusMeters: 110,
        photoPrompt:
          "From the shore-side walkway, photograph the most well-traveled-looking boat you can spot.",
        funFact:
          "Boaters cruise in off Puget Sound, tie up, and walk to coffee, dinner, and the ferry in about five minutes. Not many ports can say that.",
      },
      {
        id: "ww-breakwater",
        title: "Breakwater Lookout",
        clue: "Something long and low lies in the water, working all day without ever moving — it keeps the waves out so the boats inside stay calm.",
        hint: "Walk to the outer edge of the marina and look for the breakwater sheltering the harbor.",
        lat: 47.7982,
        lng: -122.4947,
        radiusMeters: 140,
        photoPrompt:
          "One shot, two moods: calm harbor water on one side of the frame, open Sound on the other.",
        funFact:
          "Compare the water on each side of the breakwater — chop outside, glass inside. That's the whole job description.",
      },
      {
        id: "ww-boat-launch",
        title: "The Boat Launch",
        clue: "Here the land tilts politely into the sea, so boats on wheels can become boats in water.",
        hint: "Find the boat ramp at the marina — the spot where trailers back down into the water.",
        lat: 47.7975,
        lng: -122.4969,
        radiusMeters: 110,
        photoPrompt:
          "Catch a boat mid-launch if you're lucky — otherwise, a shot of the ramp disappearing into the water.",
        funFact:
          "Backing a trailer down a ramp is Kingston's favorite spectator sport. If someone's mid-attempt, find a respectful bench.",
      },
      {
        id: "ww-cove-beach",
        title: "Cove Beach Walk",
        clue: "South of the dock, the pavement gives up and the driftwood takes over. Find a log worn smooth enough to sit on.",
        hint: "Follow the shoreline south of the ferry terminal along Appletree Cove until you reach beach and driftwood.",
        lat: 47.7947,
        lng: -122.4929,
        radiusMeters: 150,
        photoPrompt: "Balance-beam walk along a driftwood log. Spotters optional, style points mandatory.",
        funFact:
          "Every log on this beach sailed here on its own — and winter storms rearrange the whole collection every year.",
      },
      {
        id: "ww-tide-flats",
        title: "The Tide Flats",
        clue: "Twice a day the sea pulls back its blanket here and shows what it's been hiding. What you find depends on when you come.",
        hint: "Head toward the quiet end of the cove. At lower tides you'll see broad flats; at high tide, watch from the shoreline.",
        lat: 47.7942,
        lng: -122.492,
        radiusMeters: 150,
        photoPrompt:
          "Photo of the strangest thing the tide left behind. Look, don't take — the beach keeps its stuff.",
        funFact:
          "NOAA runs an official tide station right here in Appletree Cove — when you look up \"Kingston tides,\" you're reading this exact water.",
      },
      {
        id: "ww-ferry-finale",
        title: "Ferry Watch Finale",
        clue: "End where the whole harbor performs at once: ferry to one side, masts to the other, lawn under your feet.",
        hint: "Circle back to Mike Wallace Park, tucked between the marina and the ferry terminal.",
        lat: 47.7966,
        lng: -122.4976,
        radiusMeters: 100,
        photoPrompt:
          "Victory photo timed with a ferry arriving or leaving — watch the horizon and be patient.",
        funFact:
          "From this lawn you can watch the whole Kingston waterfront do its thing: boats out, ferry in, tide up, tide down. Hunt complete.",
      },
    ],
  },
];

export function getHunt(slug: string): Hunt | undefined {
  return hunts.find((h) => h.slug === slug);
}
