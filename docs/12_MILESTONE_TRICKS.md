# Milestone 12: Tricks on the Map

Starting point: completed Milestone 11. This milestone lands the adventure-layer half of the leverage thesis: consumables, pickup variety, the first two puzzle-lock guardians, and the marketplace. Judgment calls → `docs/DECISIONS.md`; do not ask.

## 1. Consumables

Hero inventory: 6 item slots, exchangeable between adjacent heroes. Items are found, never bought.

**Timing rule (absolute):** in combat, using an item counts as the hero's cast for that round. One hero act per round, item or spell, never both. No pre-battle item screens exist or will ever exist.

Item types (data-driven, `content/items/`):
- **Scrolls** — cast a specific spell's base face once, no mana, castable even if the spell is unknown and off-school. Scrolls found on barrow tiles carry the + face. Initial scroll pool: Rally, Blessing, Forge-Spark, Ward, Wither, Quiet, Dirge, Sour, Amplify, Reflect.
- **Potions** (combat, target one allied stack): *Potion of Vigor* (+40 meter), *Draught of Iron* (Oath of Iron base face, 2 rounds), *Smelling Salts* (remove all counters), *Bottled Echo* (repeat the last spell cast by anyone this battle, recomputed with your SP — the effect-targeting-effect family as an item).
- **Adventure items** (used on map, cost 0 move): *Cartographer's Case* (reveal a 7-radius circle anywhere explored±3), *Waybread* (+600 move points today).

Sources: added to chest reward tables (chests now offer gold / XP / item), 4 new item pickups placed on the map, and **guardian drops** — each authored guardian entry may list a drop; give the two central Drake/Golem guardians one scroll each.

## 2. New pickup and map-object shapes

- **Overseer's Charter** (item): consumed while standing on an owned mine → that mine permanently yields +50%. 1 per side, placed behind the iron-mine guardians.
- **Rich Vein** (map object): flaggable like a mine; yields 3 essence/day for 10 days from flagging, then depletes (visibly crumbles). 1 per side, unguarded, off-axis — a tempo question, not a fight.
- **Trade Goods** (item): worth 300g + 25g per tile of straight-line distance from its pickup location, sold automatically on entering any friendly castle (toast shows the price). 2 per side, placed near the center so the value flows *outward*.
- **Waystation** (map object): visiting hero restores full movement; usable once per day per hero. 1 at each central gap — contested tempo ground.

## 3. Puzzle-lock guardians (2, center map, mirrored placement)

Both display their tell when a hero is adjacent, or from 3 tiles with Scouting. Both are far stronger than any brute-force army available by week 6 — the sim must show the naive AI losing to them (see acceptance). Rewards are deliberately disproportionate.

1. **The Sleeper** (first Seamborn appearance — silhouette: a low hill with too-regular seams). One stack, power ≈ 4× a typical week-6 army. **Rule: at each round end, it heals to full.** Tell: *"It does not wake. It mends. Whatever is done to it must be done in one breath."* Levers (not stated in game): one-round burst — Forgefire+Burn stacking, springloaded+charge alpha, Reckoning, meter-fueled double actions. Reward: 6000g, 12 essence, and a + -face scroll cache (2 scrolls).
2. **The Mirror-Bound** (Gloaming Court neutrals — masked figures around a standing mirror). **Rule: all melee damage against them is dealt to the attacker instead; ranged and spell damage resolves normally.** Tell: *"Blades return to their wielders. The mirror does not care for arrows."* Levers: ranged armies, spell damage, summons as melee fodder. Reward: 4000g, 8 essence, and the defeated stack's **mask** — an item granting its holder's army: enemy melee attackers take 20% of the damage they deal (the game's first artifact-like item; inventory slot, passive while held).

Author both as ability-registry entries hooking the pipeline (`full_heal` at turn-advance; `melee_reflect` at damage-routing) — no special-case code.

## 4. Marketplace

- Building, both castles: 500g + 2 timber. Exchange rates (deliberately bad, a concession not a strategy): sell 1 timber/iron/essence → 150g; buy 1 timber → 400g, 1 iron → 600g, 1 essence → 800g. Resource-to-resource routes through gold. No player-to-player trade.
- AI: sells surplus (>15 of a rare) only when blocked on a build by gold; buys only the last 1–2 missing units of a resource for its next build.

## 5. Tests & acceptance

- Tests: item timing rule (item use consumes the round's cast — assert casting is refused after item use and vice versa); Bottled Echo recompute with different SP; scroll + face on barrow sourcing; Overseer permanence across save/replay; Rich Vein depletion schedule; Trade Goods pricing at known distances; each puzzle-lock rule as a pipeline test (Sleeper heals between rounds; Mirror-Bound reflects melee, not ranged/spells); mask passive.
- Sim: 300 games, zero crashes, existing gates hold. New checks: (a) the scripted AI, which does not understand the puzzle-locks, **loses to both in ≥ 95% of forced attempts** (add `--assault-locks` harness mode) — proving brute force fails; (b) spell-decisive rate from Milestone 10 does not regress.
- Human acceptance: beat the Sleeper with a burst build and the Mirror-Bound with a ranged/magic build; feel the difference between routing for the Waystation vs. not; sell Trade Goods across the map and regret selling them next door.

## 6. Explicitly deferred (log, don't build)

Sieges beyond the Walls bonus; artifact/equipment system proper (the mask is a one-off precursor); Hagwood, Wild school, bargains/Debts (next milestone); ultimate artifact; Seamborn as recruitable.
