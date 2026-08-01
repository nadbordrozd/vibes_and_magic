# Milestone 11: The Hero Layer

Starting point: completed Milestone 10 (two real factions, magic). This milestone makes heroes plural: hiring, a named roster with specialties, secondary skills in the level-up draft, and multi-hero strategy. Judgment calls → `docs/DECISIONS.md`; do not ask.

## 1. Tavern & hiring

- New building, both castles: **Tavern** — 800g + 2 timber, no prerequisite. AI builds it after Mage Guild L1.
- The tavern offers 2 heroes drawn from the player's faction roster (game-seed determined), refreshing weekly. Hire cost 1500g; hired heroes appear at the castle with a starter army (Hearthguard: 8 Yeomen; Wound-Wrights: 10 Tin Soldiers) and full mana.
- Max 3 heroes per player. Defeated heroes return to the tavern pool and can be re-hired for 2500g with their levels/skills/spells/upgrades intact (army lost).
- **Loss conditions updated:** a player is eliminated when they have no heroes AND no castles, or when they have held no castle for 7 consecutive days (countdown shown in UI).

## 2. Named hero roster

4 per faction, data-driven (`content/heroes/`). Specialties are behavior, not just numbers.

**Hearthguard (Banneret class)** — stats/weights per 06 unless noted:
- **Aldith**: Longbowmen suffer no adjacent-enemy ranged penalty under her.
- **Corwin**: knows Rally; Rally always resolves as its + face for him.
- **Berta**: starts with Logistics R1; her Logistics gives +15%/+30% instead of +10%/+20%.
- **Osric**: his Bannermen's `banner` aura grants +15 meter instead of +10.

**Wound-Wrights (Guildmaster class):**
- **Petra**: Tin Soldiers +1 Attack, +1 Defense under her.
- **Silas**: knows Wither; always + face for him.
- **Grigor**: starts with Forager R1; his Forager yields +75%/+100%.
- **Mirele**: her victories recover +10 percentage points extra via `spare_parts` (stacks with Workshop).

Each player's starting hero is drawn from the roster (seed), rest go to the tavern pool.

## 3. Secondary skills (8, two ranks each)

Enter the level-up draft alongside stat picks. Drafting a held skill's card upgrades it to Rank 2. No skill is a numeric combat multiplier; each creates decisions or tempo.

| Skill | Rank 1 | Rank 2 |
|---|---|---|
| **Logistics** | +10% daily move points | +20% |
| **Scouting** | see exact guardian counts, abilities, and puzzle-lock tells from 3 tiles | also +2 reveal radius; inspect enemy hero armies exactly |
| **Wayfaring** | forest costs 100 | all passable terrain costs 100 |
| **Diplomacy** | vs neutral guardians with power ≤ 50% of yours: pay 2× their gold value, they disband (pre-combat dialog) | threshold ≤ 80%; or pay 3× to recruit them into free/matching slots |
| **Attunement** | +2 mana/day field regen | +4/day; each shrine offers its upgrade choice twice for this hero |
| **Command** | +3 meter to all allied stacks per round start | +6 (stacks with faction/building bonuses) |
| **Forager** | resource piles yield +50% | also collect piles in adjacent tiles without stepping on them |
| **Spellthief** | defeat an enemy hero → learn one spell they knew (choice dialog) | also copy one of their spell upgrades per victory |

**Base-game change required by Scouting:** guardian stacks now display size bands, not counts — Few (1–9), Dozens (10–24), Scores (25–74), Hundreds (75+). Exact counts require Scouting or adjacency. Update UI tooltips and AI (AI still reads exact state; already logged as accepted cheat).

**Draft pool now:** 4 stat cards (weights per 06, halved), 8 skill cards (weight 4 each; Command 8 for Banneret; Attunement and Spellthief 8 for Guildmaster), Inscribe (10, level 4+). Draft still deals 3, pick 1. AI drafting: stats by class weight; takes Logistics/Scouting at R1 when offered; ignores Diplomacy/Spellthief (log as known AI limitation).

## 4. Multi-hero play

- Heroes on adjacent tiles (or hero + castle garrison) exchange units and consumable items freely via the exchange screen — enables scout heroes and army chains.
- Each hero has independent move pool, mana, spellbook, skills, level.
- UI: hero list sidebar (portraits = colored initials for now), Next Hero cycles unmoved heroes, per-hero path memory.

## 5. Strategy AI update

- Hires a 2nd hero when gold > 3500 after build priorities; a 3rd when gold > 8000.
- Per-hero role assignment each turn: the strongest-army hero is **Main** (fights per existing logic); others are **Gatherers** (route to highest-value uncontested objective: pickups, unguarded mines, chests; flee toward friendly castle if an enemy hero with ≥ 1.5× power is within 1.5 turns' reach — straight-line estimate is fine).
- Gatherers deliver: if adjacent to Main and carrying units above starter size, transfer surplus to Main.
- No two heroes target the same objective (simple claim list).

## 6. Tests & acceptance

- Tests: hiring/refresh/re-hire flow; loss-condition countdown; each specialty (assert the behavioral delta numerically); each skill rank (Diplomacy thresholds and costs; Forager adjacent collection; Spellthief learn flow; Scouting band vs exact display state); exchange conservation (no unit duplication — property test moving stacks between heroes/garrison).
- Sim: 300 games, zero crashes; win-rate sanity band 20–80% holds (no parity tuning); **multi-hero AI beats the Milestone-10 single-hero AI in >60% of 200 matched-seed games** (proves the layer matters). Median game length still ≤ 8 weeks.
- Human acceptance: hire a scout, run the two-hero economy, lose your main hero and recover by ransoming, and execute a Spellthief steal.
