# KIOSK-POWER.md — Power budget & off-grid feasibility

**Status:** Analysis, July 2026. **Companion to** [KIOSK.md](KIOSK.md) (the software design).
**Question:** can the relocated ferry-terminal kiosk run **off-grid on battery + solar**,
using the existing display and a low-power mini PC in place of the current computer?

> **These numbers are pre-measurement estimates.** The whole budget scales off one
> number we don't have yet: **the actual wattage of the existing kiosk display.** Measure
> it with a ~$20 plug meter (Kill-A-Watt / any inline watt meter) at the brightness it'll
> actually run, then drop the value into the §5 lookup table. Everything else follows.

---

## 1. Bottom line

For the deployment you described — **outdoor / behind sunny glass, ~16 h/day, keeping the
existing display** — **year-round off-grid solar is not realistic or cost-effective in
Kingston.** Two facts compound:

1. **The display is the whole ballgame.** An outdoor/sunlit spot needs a *sunlight-readable*
   screen (1000–2500 nits) drawing roughly **55–120W+**; the compute + network is only
   ~13W. Swapping to a low-power mini PC is worth doing, but it moves ~7–12W against a
   60–200W display — a rounding error in the solar math.
2. **Kingston's December sun is brutal.** At 47.8°N on Puget Sound, December delivers only
   **~1.5 peak-sun-hours/day** (model) and realistically **~1.0–1.3** through multi-day
   overcast — vs ~5.3 in July. You size the whole system for the worst week of December.

Together, a 16 h/day outdoor kiosk needs a **~1–3 kW solar array + ~5–19 kWh of (cold-rated)
battery**, i.e. **~$3.5k–$11k+** in power gear, and it *still* risks browning out in a bad
December stretch. That's more than a decade of the $816 CAD/yr Qwick fee you're dropping.

**Recommendation, in order:** (1) run a **mains power drop** to the new spot if power is
reachable at all — cheapest and most reliable by far; (2) if not, a **solar + grid/generator
hybrid** or a **daylight/ferry-hours-only** duty cycle; (3) full year-round off-grid only if
there is genuinely no power anywhere near, and even then expect a winter compromise.

There's also a **non-power blocker to check first** (§7): if the existing panel isn't
high-brightness, it will **wash out behind sunny glass** regardless of how it's powered.

---

## 2. The load model

Daily energy = **(display W + compute/network W) × hours on**. For your case: 16 h/day, then
the screen sleeps overnight (compute can deep-idle or power off).

| Component | Draw | Notes |
|---|---|---|
| **Display (existing)** | **~55–120W+** if sunlight-readable outdoor; ~15–40W if it were an indoor panel | **Dominant load. Measure it.** Backlight power scales ~linearly with brightness; a 1000+ nit outdoor panel pulls far more than a 300-nit indoor one. |
| Mini PC (compute) | Pi 5 ~6–8W kiosk load; N100 ~10–15W | See §8. Pi 5 is lowest; the Pi-vs-N100 delta (~7W) barely matters next to the display. |
| LTE router (if no wired net) | ~2–6W | Native-12V industrial routers idle <1–3W — best off-grid fit. |
| Conversion/wiring losses | ~5–15% | Every voltage conversion (esp. a 12V→5V buck for the Pi) costs a little. |

**Compute + network baseline ≈ 13W.** So daily load ≈ **(display W + 13) × 16h**.

---

## 3. Kingston solar resource (the binding constraint)

Peak-sun-hours/day (= kWh/m²/day) at **47.80°N, −122.50°W**, 60° winter-optimized fixed tilt
(PVGIS v5.2, cross-checked vs NREL/NSRDB Seattle):

| Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | **Dec** |
|--|--|--|--|--|--|--|--|--|--|--|--|
| 1.66 | 2.94 | 3.55 | 4.39 | 4.63 | 4.59 | 5.26 | 5.24 | 4.59 | 3.02 | 2.04 | **1.58** |

- **December ~1.5–1.6 model; design for ~1.0–1.3** — real PNW winters run 7+ consecutive
  fully-overcast days where harvest falls well under 1 PSH-equivalent.
- **Summer ≈ 3.3–3.9× winter.** Any array sized on the annual average (~3.8) runs flat every
  December. You must size on December.
- **~60° tilt** beats latitude tilt in December and sheds rain. Vertical (90°) doesn't help
  winter here and wrecks summer.
- **Cold:** LiFePO4 **cannot charge below 0°C/32°F** (chemistry limit). Kingston winter nights
  sit near freezing → spec a **self-heating LiFePO4 pack** (or low-temp cutoff) in an
  insulated enclosure.

**Sizing math:** array W = dailyWh ÷ (PSH × 0.7 derate); battery Wh = dailyWh × days-autonomy
÷ 0.8 DoD. PNW needs **5–7 days autonomy**.

---

## 4. What "off-grid" costs here — worked at 16 h/day

Using December design PSH = 1.3, 0.7 derate, 5-day autonomy, 12.8V LiFePO4. Compute+net = 13W.

## 5. Lookup table by measured display wattage

Find your measured display draw, read across. (Array/battery are **winter-sized**; a generator
or grid-trickle backup shrinks both dramatically.)

| Display draw | Daily energy (16h) | Solar array (Dec-sized) | Battery (5-day) | Rough power-gear cost |
|---|--:|--:|--:|--:|
| **40W** (small/efficient, ~15–22") | ~0.85 kWh | ~0.9 kW | ~5.3 kWh (~410 Ah) | ~$3,500 |
| **80W** (moderate outdoor 24–32") | ~1.5 kWh | ~1.6 kW | ~9.3 kWh (~730 Ah) | ~$5,800 |
| **120W** (bright 32–43") | ~2.1 kWh | ~2.3 kW | ~13 kWh (~1040 Ah) | ~$8,000 |
| **180W** (large high-bright 43–55") | ~3.1 kWh | ~3.4 kW | ~19 kWh (~1500 Ah) | ~$11,400 |
| **250W** (max-bright 55") | ~4.2 kWh | ~4.6 kW | ~26 kWh (~2050 Ah) | ~$15,000+ |

Cost = panels (~$1.2/W DIY) + self-heating LiFePO4 (~$300/kWh) + MPPT ($150–400) +
enclosure/mount/wiring (~$0.8–1.5k). Compute (Pi/mini-PC + display) is on top but small.

**Why the numbers are so big:** it's December. The *same* 80W kiosk that needs a ~1.6 kW array
in December needs only **~0.4 kW in July** — winter dominates sizing by ~4×. That's the case
for a seasonal/hybrid approach instead of brute-forcing the worst week.

---

## 6. The pragmatic options (ranked)

1. **Run a power drop.** If mains is reachable at the new spot, a buried/conduit run + a small
   UPS or ~1 kWh LiFePO4 buffer for outages is far cheaper and more reliable than any solar
   build above. **Confirm there's truly no power nearby before spending on solar** — that
   assumption is doing all the work.
2. **Solar + grid/generator hybrid, or daylight-duty.** Primary solar+battery, sized to
   spring–fall, with a grid trickle or a few generator days in Nov–Feb; and/or duty-cycle the
   screen to ferry/daylight hours (screen off overnight). This right-sizes to the achievable
   resource and can roughly halve the gear vs a 24/7 winter-proof build.
3. **Full year-round off-grid.** Only if there's no power at all. Size on §5, add the
   self-heating battery + marine-grade weatherproofing, and accept some December brownout risk.

---

## 7. Non-power blocker: readability behind glass

You chose "open outdoor / behind sunny glass" and "keep the existing screen." If that existing
panel is a **standard-brightness** display (≈250–450 nits), it will be **hard to read or washed
out in daylight** behind glass — which defeats the point of moving to a high-traffic sunny spot,
independent of power. Qwick ships LG commercial signage panels; some are high-bright, many are
not. **Check the panel's nit rating** (or just look at it in direct sun). If it's not
sunlight-readable, the location needs either a shaded/covered mount or a high-bright panel — and
a high-bright panel is also the power-hungry case above. This tension (bright enough to see =
power-hungry) is inherent to sunny outdoor kiosks.

---

## 8. The low-power mini PC (do this regardless of power source)

Swapping Qwick's "standard PC" (~30–65W) for a low-power mini PC is worth it on its own —
cheaper (~$120–170), cooler, quieter, and DC-native — even though it doesn't make off-grid
feasible by itself.

| Option | Kiosk-load draw | DC input | When to pick |
|---|--:|---|---|
| **Raspberry Pi 5 (8GB) + active cooler** | ~6–8W | 5V USB-C (needs 12V→5V 5A buck for a battery bank) | **Default.** Lowest watts; runs a Chromium kiosk of a web app easily. Active cooler mandatory in a sealed enclosure. |
| **Beelink S12 Pro (Intel N100)** | ~10–15W | **12V native** (wires straight to a 12V bank) | If you want x86/Windows or heavier headroom; cleanest DC wiring; ~2× the Pi's watts. |

Notes: enable deep C-states/powersave in BIOS on N100 boxes (untuned Linux idle can be several
watts higher). Boot straight to Chromium `--kiosk` pointed at the app's `/kiosk` route (see
[KIOSK.md](KIOSK.md) §8). Prefer **12V-native components end to end** (12V battery, MPPT, N100
or a single clean 12V→5V buck for the Pi) to avoid stacked conversion losses. **Measure the
chosen unit's real draw** running the actual app in fullscreen before finalizing.

---

## 9. Verify / confidence

The compute and Kingston-solar figures are well-sourced (PVGIS/NREL, independent Pi/N100 power
tests). The key correction from the review pass: the display must be treated as **outdoor
sunlight-readable (55–120W+)**, not an indoor panel — earlier drafts that assumed 15–40W would
undersize the system 2–5×. The single largest remaining uncertainty is the **existing display's
measured watts and nit rating** (§7) — get those and the §5 row is exact.

**Sources:** PVGIS v5.2 (lat 47.80, lon −122.50, 47/60/90° tilt); NREL PVWatts / NSRDB
(Seattle: Dec ~1.78, Jul ~6.22 kWh/m²/day); raspberry.tips 2026 Pi power tests; CNX-Software /
independent N100 mini-PC power measurements; off-grid sizing method (array = load/(PSH×derate),
battery = load×autonomy/DoD); BloombergNEF 2026 Li-ion pack pricing; LiFePO4 cold-charging
(0°C cutoff) references.
