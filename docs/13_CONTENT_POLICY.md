# Content Policy — Volume, Rarity, Discovery, Balance Posture

Binding policy for all content work from here on. Sits alongside 05/07/08 as canon.

## Balance posture

- **Balance is deferred until content is complete.** Penciled numbers stay penciled. The sim's job during content development is: zero crashes, games end, thesis metrics (spell-decisive rate, lock-resistance) hold. Win-rate bands are degeneracy checks (20–80%), never tuning targets.
- The only balance work permitted early: fixing **degeneracy** — a dominant line that trivializes the game (infinite loops, a strictly-correct opening, a fight-stalling stack of effects). Log fixes; touch the minimum number of numbers.
- Rationale: content additions will invalidate tuning anyway, and tuning toward parity sands off exactly the outliers that make draws exciting. The sim harness makes late balancing cheap; that's what it's for.

## Volume targets (long-run)

- Spells: ~70 (schools grow from 10 toward ~16–18 each, including adventure spells).
- Consumables: ~30. Secondary skills: ~16. Hero specialties: grow with roster.
- **The behavior test still gates everything:** volume comes from behaviorally distinct entries, never numeric filler. Reject any candidate whose description is "like X but bigger." Two entries that would never both matter in the same game = one entry too many.

## Rarity (implicit, three tiers)

No rarity labels in UI — at most an ornament difference on the card frame. Rarity lives in acquisition weights:

| Tier | What | Where it appears |
|---|---|---|
| **Common** | staples, basic potions | Guild L1–2, most scrolls, shrine-taught spells |
| **Uncommon** | build-arounds, most adventure magic, better consumables | Guild L2–3, shrine pools, chest items, draft (Inscribe-tier weights) |
| **Rare** | signature spells, weird narrow spells, provenance items | Guild L3 at trace rates, puzzle-lock drops, Spellthief, unique map landmarks |

- **Exposure budget:** a single playthrough should surface roughly 30–40% of the total pool (tune dealing weights to this, verifiable in sim by counting distinct content encountered per game). Players should meet new things on their fifth run.
- **Provenance rares:** certain rares exist ONLY at specific map landmarks — time magic only at the Unstruck Bell monastery, glamour spells only at Gloaming Court dwellings, seam magic only from Seamborn encounters. The dopamine spike and the lore delivery are the same event.

## Anti-planning rules (the StS posture)

1. **No deterministic path to any specific uncommon or rare.** All acquisition is offer-shaped: guilds deal, shrines offer, drafts deal, locks drop. A player builds around what they were dealt; they cannot route to a named spell the way an RPG routes to a talent. (Commons are exempt — staples are reliable by design.)
2. **Offers over outcomes, always** (existing draft rule, now generalized to every channel).
3. Guild construction is the pack-opening moment: building a guild level plays a short reveal of the spells dealt. Make it feel like it.
4. Cross-run variance channels, in order of impact: guild deals, draft offers, chest/scroll contents, shrine placement (map-authored for now; randomized when the map generator exists), week omens (below).

## Week omens (penciled system — implement in a later milestone)

Each week carries a seeded omen, announced on day 1 to all players (a variance channel players adapt to, and the hook that narrow spells key off):
*Week of Embers* (all Burn +1 on application) · *Week of the Veil* (Grave resonance everywhere) · *Week of Plenty* (growth +25%) · *Week of Still Air* (ranged shots +4, no resonance anywhere) · *Week of the Open Road* (all terrain costs 100) · *Quiet Week* (no omen — the common case, ~half of weeks).

## Adventure magic (new spell category)

Spells cast on the map, costing mana + 300 move points. The slow mana economy is the fluidity guard: field regen is +1/day, so adventure casting genuinely competes with saving mana for battle — never a free daily ritual. Adventure spells are mostly uncommon/rare.

## Pencil list — weird, narrow, and out-of-left-field (~tier in brackets)

**Rite:** *Census* [U, adventure]: reveal exact armies of all enemy heroes for one day. · *Feast Day* [U, adventure]: your towns' growth +25% this week (once/week). · *Oathbind* [R, combat]: target enemy stack cannot benefit from any effect for 2 rounds. · *Wayside Shrine* [R, adventure]: consecrate a tile; the next battle fought on it has Rite resonance.

**Craft:** *Salt the Vein* [U, adventure]: an enemy mine yields nothing for 5 days. · *False Colors* [U, adventure]: your hero displays as a neutral guardian band to enemies until adjacent. · *Clockwork Courier* [U, adventure]: transfer items or one stack between any two of your heroes at distance. · *Summon Skiff* [R, adventure]: the Summon Boat homage — dormant until water maps exist; reserve the name.

**Grave:** *Borrowed Time* [U, adventure]: double move points today; zero tomorrow. · *Pale Procession* [U, adventure]: on a tile where 100+ units died, raise a temporary Candle-Wisp stack for 3 days. · *Death's Ledger* [R, adventure]: reveal every barrow and its scroll contents, map-wide. · *Grave-Speech* [R, adventure]: replay (spectate) any battle previously fought on this tile — scouting and lore in one.

**Wild:** *Murmuration* [C, adventure]: a crow scouts along a path of your drawing, revealing as it flies. · *Green Tide* [U, adventure]: forest costs 0 move for your heroes this week. · *Root and Ruin* [U, adventure]: grow an impassable thicket wall (3 tiles) on the map for 3 days — map-topology denial. · *Fickle Weather* [R, adventure]: change this week's omen to one of two dealt options.

**Provenance rares (combat):** *Hourglass Crack* [R, Unstruck Bell only]: target stack acts twice this round, skips its next round. · *Borrow Shape* [R, Gloaming only]: your stack copies an adjacent enemy stack's abilities this battle. · *Echo* [R, Seamborn only]: recast the last spell cast by anyone this battle at your SP. · *Loyal Unto Death* [R, any lock drop]: target ally, when destroyed this battle, immediately deals its full damage to its killer.

**Consumable expansion (pencil):** Chalk of Walls (Wall of the Maker as an item) · Cartwright's Wheel (+1000 move, breaks a random item? no — behavior without downside dice: +1000 move, single use) · Wax Seal (protect one enchantment from Sour/Unmake this battle) · Beggar's Coin (your next draft deals 4 cards) · Militia Writ (recruit this castle's available T1 growth instantly at double cost, from anywhere).

**Skill expansion (pencil):** Chronicler (drafts deal 4 / rank 2: and may skip for +200 XP) · Peddler (marketplace rates halved; can sell items) · Warden (garrisons you leave behind fight with your hero's stats) · Ransomer (defeated enemy heroes pay you their hire cost).

All pencil entries obey existing law: pipeline stages named at spec time, target-scaling, behavior upgrades on + faces.
