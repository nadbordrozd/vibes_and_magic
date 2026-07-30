# Unit Catalog — All Six Factions, Six Tiers

Stats: HP / dmg min–max / Attack / Defense / Speed / weekly growth / cost. All numbers penciled (order-of-magnitude only; tuning deferred). Every ability names its pipeline stage and goes in the ability registry — no special-case code. Tags: `flying`, `ranged(n)`, `beast`, `construct`, `spirit` (tags are targeting hooks for spells/skills, not rules by themselves).

**Hearthguard and Wound-Wrights tiers 1–5: unchanged, `06` remains authoritative.** This doc adds their tier 6 and specs the four new factions in full.

## Hearthguard — T6 addition

**Oriflamme Wyvern** — 220 / 22–34 / A15 D14 / spd 9 / gr 1 / 3200g + 3 iron + 1 essence. `flying`. **`rampant`** (turn-advance): whenever an allied stack takes a meter-triggered extra action, the Wyvern gains +15 meter. Flavor: the beast from the banner, rendered in the flat bold style of heraldic art — visibly an *emblem*, not an animal.
(Hearth-Hound and Dexter Lion → tier-7/neutral-dwelling pool, later.)

## Wound-Wrights — T6 addition

**Reliquary Ark** — 160 / 10–16 / A9 D15 / spd 4 / gr 1 / 2900g + 2 iron + 2 essence. `construct`. **`procession_of_repair`** (declare/apply): may spend its action to restore 15% max HP to all adjacent allied stacks, reviving dead units. **`hallowed_cargo`** (post-battle): if it survives a won battle, `spare_parts` recovery +15 percentage points that battle. Flavor: the reliquary-hoard itself, wheeled to war; the Guild walks behind it singing.
(Jack-in-the-Box, Music Box → tier-7/neutral pool.)

## The Unfinished (Rite+Grave — death triggers & recursion)

**Faction passive `unfinished_business`** (death-triggers): when an allied Unfinished stack is destroyed, it deals 15% of its pre-death total HP to its killer — one last reach toward the thing left undone.

| T | Unit | Stats | Abilities |
|---|---|---|---|
| 1 | **Candle-Wisps** | 4 / 1–2 / A2 D1 / spd 6 / gr 18 / 45g | `flying`, `spirit`. **`last_light`** (death-triggers): when destroyed, each adjacent enemy gains Hex 2. |
| 2 | **Couriers** | 12 / 2–4 / A4 D3 / spd 8 / gr 9 / 190g | `spirit`. **`the_errand_passes`** (death-triggers): when destroyed, one allied stack of your choice immediately gains a free move (no attack). |
| 3 | **Sentries** | 24 / 3–6 / A5 D9 / spd 3 / gr 6 / 300g | **`still_on_watch`** (retaliation): unlimited retaliations. They never stopped guarding. |
| 4 | **Bone Choir** | 40 / 6–10 / A8 D6 / spd 5 / gr 4 / 620g + 1 essence | `ranged(8)`. **`swelling_dirge`** (damage-computation): +5% damage per stack destroyed this battle (any side). |
| 5 | **The Brides** | 90 / 12–20 / A12 D10 / spd 7 / gr 2 / 1400g + 1 essence | `spirit`. **`unfinished_vow`** (death-triggers): the first time this stack is destroyed each battle, it returns at 50% of its pre-battle size. |
| 6 | **The Ferry** | 180 / 20–30 / A14 D13 / spd 6 / gr 1 / 3000g + 2 iron + 2 essence | `flying` (it glides above the ground it should not cross). **`crossing`** (declare): may spend its action to carry one adjacent allied stack to any free hex. |

## The Vespiary (Craft+Wild — consumption & terrain)

**Faction passive `render_down`** (post-battle): after a won battle, gain Larvae at your castle's pool equal to 10% of enemy HP destroyed ÷ Larva HP. The hive wastes nothing.

| T | Unit | Stats | Abilities |
|---|---|---|---|
| 1 | **Larval Tide** | 4 / 1–1 / A1 D1 / spd 3 / gr 20 / 30g | — (the swarm is the ability) |
| 2 | **Paper-Wasp Lancers** | 13 / 3–5 / A6 D2 / spd 9 / gr 10 / 200g | `flying`. **`sting_and_circle`** (apply): after attacking, returns to the hex it attacked from. |
| 3 | **Silk-Spinners** | 20 / 2–4 / A4 D5 / spd 5 / gr 7 / 330g + 1 timber | `ranged(6)`. **`web`** (apply): ranged attacks also apply Chill 2. |
| 4 | **Amber-Carriers** | 55 / 5–8 / A7 D11 / spd 4 / gr 4 / 640g | **`resin_trail`** (apply/terrain): hexes it moves through become resin for 3 rounds; enemies starting a turn on resin gain Chill 1. First persistent-tile ability — implement tiles generically. |
| 5 | **Dragonfly Cavalry** | 85 / 11–18 / A12 D8 / spd 10 / gr 2 / 1350g + 1 essence | `flying`. **`skim`** (declare): its attack may strike two adjacent enemy stacks in one pass. |
| 6 | **The Half-Woken Queen** | 200 / 18–28 / A13 D14 / spd 5 / gr 1 / 3200g + 2 iron + 2 essence | **`brood_call`** (declare): once per battle, spend action — spawn a Larval Tide stack on an adjacent free hex, size = (units died this battle, both sides) ÷ 2. |

## The Hagwood (Wild+Grave — bargains & curse-twisting)

**Faction passive `crooked_luck`** (damage-computation): enemy stacks fighting a Hagwood army have luck −1. Things just go wrong in the wood.

| T | Unit | Stats | Abilities |
|---|---|---|---|
| 1 | **Crow Chorus** | 5 / 1–2 / A3 D1 / spd 7 / gr 16 / 60g | `flying`, `beast`. **`pecking_order`** (apply): attacks apply Hex 1. |
| 2 | **Fence-Post Familiars** | 16 / 2–5 / A4 D6 / spd 2 / gr 9 / 170g | **`boundary`** (declare): enemy stacks beginning their turn adjacent have their speed halved that turn. |
| 3 | **Besom Riders** | 22 / 4–7 / A7 D4 / spd 8 / gr 6 / 380g + 1 essence | `flying`. **`sweep`** (apply): after attacking, pushes the target 1 hex. |
| 4 | **Rusalka** | 38 / 5–9 / A8 D7 / spd 6 / gr 4 / 700g + 1 essence | `spirit`. **`beckoning_song`** (declare): once per battle, force one enemy stack to move its full speed toward the Rusalka. |
| 5 | **Leshy** | 110 / 14–22 / A12 D12 / spd 5 / gr 2 / 1500g + 1 timber + 1 essence | `beast`. **`home_ground`** (apply/terrain): at battle start, creates 2 thicket hexes anywhere. **`thicket_walk`** (declare): may enter and occupy obstacle/thicket hexes. |
| 6 | **The Walking Hut** | 190 / 20–32 / A14 D13 / spd 7 / gr 1 / 3100g + 3 timber + 2 essence | **`fowl_legs`** (turn-advance): at round end, may relocate to any free hex. **`crone_favor`** (passive): while it lives, your hero's Wild and Grave spells cost −1 mana. |

## The Wildergrass Clans (Rite+Wild — blood price)

**Faction passive `blood_price`** (death-triggers): allied stacks gain +20 meter when an allied stack is destroyed (replacing the standard −30), and only +5 (not +25) when destroying an enemy stack. Grief is fuel; victory is quiet.

| T | Unit | Stats | Abilities |
|---|---|---|---|
| 1 | **Outriders** | 6 / 1–3 / A3 D2 / spd 8 / gr 15 / 65g | **`skirmish`** (apply): may spend remaining speed to move after attacking. |
| 2 | **Drum-Callers** | 14 / 2–4 / A4 D4 / spd 5 / gr 9 / 190g | **`war_drums`** (turn-advance): at round start, allied stacks that lost units since their last turn gain +10 meter. |
| 3 | **Ashmane Wolves** | 18 / 4–8 / A8 D3 / spd 9 / gr 7 / 310g | `beast`. **`pack_hunger`** (damage-computation): +15% damage against stacks that have already lost units this battle. |
| 4 | **Aurochs Herd** | 60 / 7–11 / A8 D10 / spd 6 / gr 4 / 620g + 1 iron | `beast`. **`trample`** (declare/apply): may move through enemy stacks, dealing 5% of their current HP as it passes. |
| 5 | **Grass-Serpent** | 95 / 13–21 / A12 D9 / spd 7 / gr 2 / 1400g + 1 essence | `beast`. **`undergrass`** (declare/retaliation): moves beneath the field — ignores obstacles; its attacks are never retaliated. |
| 6 | **Thunderbird** | 170 / 19–30 / A15 D11 / spd 11 / gr 1 / 3000g + 2 iron + 2 essence | `flying`, `beast`. **`storm_wake`** (apply): when it attacks, all enemies adjacent to its target gain Burn 2. |

(The Stampede, the Cortège → reserved for tier 7.)

## Dwelling costs (all four new factions, same pattern)
T1 prebuilt · T2 1200g+3t · T3 2000g+4t+1i (req T2) · T4 3200g+4t+3i (req T3) · T5 5500g+6t+5i (req T4) · **T6 8000g + 8 timber + 6 iron + 2 essence (req T5)** — T6 dwelling cost also applies retroactively to Hearthguard/Wound-Wrights.

## Verb-coverage check (why these 24 units)
Death triggers: 4 distinct on-death behaviors (Unfinished). Recursion: Brides, brood_call, render_down. Terrain: resin, thicket, home_ground. Forced movement: sweep, beckoning_song, trample, crossing. Turn-order-adjacent: fowl_legs, skirmish, sting_and_circle. Meter economy: war_drums, blood_price, rampant. Cross-system hooks: crooked_luck (luck), crone_favor (mana), hallowed_cargo (spare_parts). Every faction has ≥1 flyer and ≤2 human-shaped units.
