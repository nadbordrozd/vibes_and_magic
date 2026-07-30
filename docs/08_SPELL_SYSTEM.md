# Spell System — Engine Rules

Extends `07_MAGIC.md` (schools/pairs) with the combat-magic machinery. All effects hook named pipeline stages. Everything here obeys the target-scaling law: effects scale with the target (%, counters, control), never flat magnitudes.

## Casting

- The hero (off-battlefield) may cast **once per combat round**, at the moment any allied stack's turn begins (before that stack acts). Casting does not consume the stack's action.
- Costs mana (per spell). Mana rules unchanged (pool 10×Knowledge, +1/day field, full in friendly town).
- Neutral guardian armies have no hero and never cast.
- **Spell Power scaling (default rule):** listed numbers assume SP 0. Unless a spell states otherwise: durations +1 round per 6 SP; counter magnitudes +1 per 5 SP; %-of-HP effects +1 percentage point per 2 SP. Round down.

## Counters (the persistent-number system)

Exactly four counter types, ever. Displayed as colored pips on the stack token, capped at 9.

| Counter | School | Effect at afflicted stack's **turn start** |
|---|---|---|
| **Burn** (orange) | Craft | stack takes damage = N% of its current total HP (min N HP) |
| **Chill** (blue) | Grave | passive: speed −N (min 1) |
| **Hex** (purple) | Grave | passive: damage taken +5% per point |
| **Bloom** (green) | Wild | stack heals N% of max HP (cannot resurrect dead units) |

Uniform decay: every counter type on a stack decrements by 1 at that stack's **turn end**. Counters persist across rounds, not across battles. Counters are legal targets for the twister spells.

## Battle enchantments

- Spells tagged `enchantment` do not resolve-and-vanish: they occupy one of **2 enchantment slots per side**, visible in an enchantment row, and persist for the battle.
- Casting a third enchantment: caster chooses which of their own to replace.
- Enchantments are targetable objects: Sour, Amplify, Reflect, Unmake can hit them (own or enemy side's).

## Twisters (effect-targeting-effect, one per school)

- **Amplify** (Rite): double a target active effect — counter pile ×2 (cap 9), enchantment's stated numbers ×2, timed buff's magnitude ×2.
- **Reflect** (Craft): copy a target active effect onto a second target of the caster's choice (Hex pile to another enemy, buff to another ally, etc.).
- **Sour** (Grave): invert a beneficial effect — Bloom N becomes Hex N; a timed buff is removed and its target gains Hex 2; an enemy enchantment is destroyed.
- **Overgrow** (Wild): a target effect on one stack spreads at current magnitude to all stacks adjacent to it (friend or foe alike).

## Upgrades

Every spell has a base face and one **+ face**. Rule: **a + face changes behavior, not just numbers** (new targets, new riders, new triggers). A hero's upgrades are permanent, per-hero, per-spell.

Acquisition channels:
1. **Shrines** (map objects, one per school): visiting teaches the shrine's designated staple if unknown, and offers a one-time-per-hero choice to permanently upgrade one known spell of that school.
2. **Guild inscription:** at a friendly castle with a mage guild, pay **4 essence** to upgrade one known spell belonging to the guild's dealt schools.
3. **Draft rare "Inscribe":** appears in the level-up draft pool from hero level 4+ at low weight; upgrade one known spell.
4. **Terrain resonance** (temporary): each map tile may carry a school resonance. When a battle occurs on a resonant tile, **all spells of that school resolve as their + face, for both sides**, that battle. Baseline mapping: forest = Wild, barrow = Grave, castle tile = Rite, mine tiles = Craft. Show a resonance banner at battle start.

## Special spell classes

- **X-cost** (2–3 in the whole game): spend all remaining mana; effect scales per point spent.
- **Scaling:** magnitude grows with a battle statistic (deaths so far, extra actions taken, rounds elapsed). The statistic is tracked on battle state and shown in the spell tooltip.
- **Topology** (one per school): adventure-map movement spells. **Penciled only — not in this milestone.**
- **Bargains** (Hagwood specialty): outsized effect now + a visible **Debt** entry lodged in the spellbook that triggers on a stated condition. **Penciled only — not until Hagwood.**

## Precedence rule (pin this, test this)

Damage-positioning modifiers apply in stage order within damage-computation: base luck positioning → attacker-side overrides (e.g. Blessing: resolve at range max) → defender-side overrides (e.g. `soft_body`, Oath of Iron: resolve at range min) **last**. Defender-side positioning wins collisions.

## Spell acquisition (guilds)

- **Mage Guild** castle building, 3 levels: L1 1000g+2 essence (teaches 3 spells), L2 1500g+3 essence (+3), L3 2500g+5 essence (+2, may include build-arounds).
- Which spells a guild teaches is drawn (from the game seed, at map start) per `07_MAGIC.md` weights: ~80% the faction's pair, ~20% adjacent schools, opposite-exclusive school ~0%.
- A hero visiting a friendly castle learns all its guild spells (HoMM3 style).
