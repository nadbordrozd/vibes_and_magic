# Game Mechanics

Baseline is HoMM3. This document lists only the deviations and confirmations we have decided. Items marked **[LATER]** are design direction for future content — do not implement in the PoC, but do not architect against them.

## Confirmed unchanged from HoMM3

- Day/week cycle; dwellings replenish weekly
- Town building tree (one build per town per day)
- Map exploration: heroes with daily movement points, resource piles, mines to flag, guardian stacks on treasure
- Hex battlefield; stacks of units; speed determines act order within a round; one retaliation per attacker per round; ranged units shoot unless adjacent to an enemy (melee penalty when adjacent)
- Secondary skills exist (none in PoC)
- Victory by eliminating all enemy heroes and towns

## Settled deviations

### Combat frame
- **Round-based** combat (as HoMM3, explicitly not ATB/initiative-bar).
- **Hero is off the battlefield**: not a unit, cannot be targeted or killed in combat. Hero contributes stats passively and (later) casts one spell per round.
- **No deployment cap.** A hero fields their whole army (7 stack slots, as HoMM3).
- Design rule following from this: leverage effects must scale with the target (percentages, control, redirection), never flat magnitudes. Flat-damage effects are permanently second-class.

### Luck — deterministic damage positioning
Unit damage is a range (min–max). Luck no longer triggers randomly; it deterministically positions the roll within the range:
- luck 0 → exact midpoint of the range
- positive luck → shifted toward max (+10% of the range width per point, cap +5)
- negative luck → shifted toward min (same per point, cap −5)
No randomness in damage at all. Luck sources (later): artifacts, terrain, skills.

### Morale — deterministic extra-action meter
Each stack has a visible morale meter, 0–100.
- Fills: +25 when the stack destroys an enemy stack, +10 when any allied stack destroys an enemy stack, +(hero morale bonus) per round start.
- Drains: −30 when an allied stack is destroyed.
- At ≥100: the meter resets to 0 and the stack immediately takes one extra action after its normal action this round.
- Mixed-faction armies: all stacks get a −5 per-round-start penalty if the army contains units from more than one faction. (PoC: single-faction armies only, so implement but it won't trigger.)
No random morale procs of any kind.

### Resources — four, mapped to function not faction
- **Gold** — recruitment, most buildings
- **Timber** — generic construction (replaces wood+ore)
- **Iron** — high-tier dwellings, fortifications, war machines
- **Essence** — mage guilds, shrines, special buildings, spell-related content
The strategic axis: Iron ≈ army breadth, Essence ≈ spell/trick depth. Marketplace exchange (later) exists at deliberately bad rates.

### Primary skills
- **Attack / Defense** — exactly as HoMM3: each point of Attack above target Defense = +5% damage (cap +300%); each point of Defense above = −2.5% damage taken (cap −70%). Hero stats add to every stack's stats.
- **Spell Power** — generic potency: scales both magnitude and duration of hero spells. (No spells in PoC.)
- **Knowledge** — mana pool = 10 × Knowledge. Mana regeneration is slow and strategic: +1 per day in the field, full restore only in a friendly town. (No spells in PoC, but implement the mana field and regen.)

### Hero progression — draft, not roll
On level-up, the player is offered a draw of **3 options** and picks 1. Offers are drawn from a class-weighted table. Random offers, chosen outcomes — never forced random outcomes.
- PoC option pool: +1 Attack, +1 Defense, +1 Spell Power, +1 Knowledge (weights per class defined in content data). Later the pool grows to include secondary skills, out-of-guild spells, and rare perks.
- AI heroes pick greedily by class weight.

## [LATER] Direction for future content (do not implement yet)

- ~40 spells total; ~8 "build-around" spells with strong preconditions (Armageddon-family), ~4 map-topology spells (Town Portal-family), the rest staples. Cut numeric filler aggressively.
- Keystone effect families hooked on the pipeline: ownership change, damage redirection, turn-order/meter manipulation, death triggers, duplication, forced movement, effect-targeting-effect.
- Persistent battlefield tile states (fire, ice, corruption, walls).
- Consumables (scrolls/potions, found not bought) as the conditional-answer mechanism; no pre-fight loadout screens ever.
- Puzzle-lock guardians: a few per map, unbeatable by brute force, with a legible tell and a discoverable lever; disproportionate reward.
- Leverage effects strong vs neutrals, damped vs enemy heroes (shorter durations / level-scaled resistance).
- Ultimate artifact: pieces visible on the map from turn 1, partial set bonuses at 2/3/4 pieces, lootable from dead heroes.
- Faction identity as a pipeline verb (e.g. death-recursion, duplication, ownership theft, meter manipulation).
- Economic pickups varied by *shape* not just label: army-attaching (mercenaries), asset-attaching (mine overseers), time-decaying (rich veins), location-priced (trade goods), information (maps/rumours), tempo (waystations).
