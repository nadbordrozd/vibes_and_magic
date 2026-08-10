# Combat Rules

## Battlefield and armies

Combat is round-based on a 13×9 hex field. A hero is off-board and cannot be attacked; hero primary
stats, skills, specialties, spellbook, mana, equipment, and applicable installed-garrison effects
modify the army. Each side fields every occupied slot of its seven-stack army. Neutral guardians
have no hero.

At battle setup, derive the battlefield template, resonance, obstacles, shallow hexes, siege pieces,
timing effects, hero modifiers, stack footprints, and initial counts. Stack count and top-unit HP
represent casualties exactly; only effects explicitly allowed to revive can increase count after
deaths.

An authored advanced-combat fixture may begin with fully developed Walls/Keep cities, advanced
heroes, complete faction-school spellbooks, and full faction rosters. Starting recruit counts must
derive from canonical weekly unit growth, guardian bands must derive through `unitStrength`, and
the fixture must exercise ordinary guardian, hero-versus-hero, and city-siege battle setup rather
than a presentation-only combat state.

## Strategic army-strength rating

Strategic comparisons use one pure catalog-derived rating, not battle simulation and not the old
`HP × average damage` product. For each unit:

```text
d = max(1, midpoint(minDamage,maxDamage))
unitStrength = sqrt(HP × d)
  × (1 + (Attack + Defense) / 40)
  × (1 + 0.04 × clamp(Speed - 5, -3, 6))
  × boundedAbilityMultiplier
armyStrength = sum(count × unitStrength)
```

The speed delta is clamped to `[-3,6]`. Stable role adjustments for ranged, flying,
no-retaliation, incoming-minimum, unlimited-retaliation, full-heal, melee-reflection, and immobile
are additive and the combined ability multiplier is clamped to `[0.85,1.35]`. Exact adjustments,
implementation, calibration method, and threshold audit are in
[`../39_GUARDIAN_STRENGTH.md`](../39_GUARDIAN_STRENGTH.md). The rating uses only canonical unit
statistics, abilities, and count; it is additive for mixed armies, linear in count, finite for every
legal unit, and independent of hero or battlefield state. It is a cheap ordering estimate, not a
substitute for combat resolution.

## Round and turn sequence

At round start, reset round-scoped defenses and retaliations, advance tile/enchantment durations,
apply morale gains, and order living stacks by effective speed. Stable ties favor attacker, then
army slot. Wait moves the stack after normal actors; Defend ends its action with the defense bonus.
A stack may move within speed, attack, use an activated ability, wait, or defend as its legal action
set permits. Movement plus a reachable melee strike is one explicit combined action.

Normally, each stack retaliates once per round against a legal melee attacker. No-retaliation,
unlimited/double retaliation, range, and footprint rules are registered exceptions. Ranged stacks
shoot while they have shots; adjacent enemies impose the melee penalty unless an explicit ability
removes it.

A hero may take one hero act per round at the start of any allied stack turn. A spell or item uses
that act unless a skill explicitly waives it. It never consumes the stack’s action. No pre-battle
deployment or item-use phase is inserted.

## Combat pointing and feedback

The whole footprint of an enemy stack is one target: every occupied hex accepts hover, attack, and
right-click inspection. A legal enemy attack is one left click; combat never requires a double
click. Right-click selects the unit and shows its statistics without taking an action.

An attackable enemy hex replaces the pointer with a sword. For melee, pointer position around the
target chooses the nearest legal approach direction and rotates the sword toward the target; the
chosen adjacent origin is part of the dispatched move-and-attack action. Ranged attacks do not
choose an approach. They show a basic projectile travelling from the attacking footprint to the
target footprint, followed by the ordinary target-damage animation.

## Deterministic damage

For unit range `[min,max]` and luck `L` clamped to `[-5,5]`:

```text
base = clamp(min, max, midpoint(min,max) + (max-min) * 0.10 * L)
```

Thus luck 0 is the exact midpoint and each point shifts ten percent of the range width. There is no
random damage roll.

Let `A` be unit attack plus hero/other attack bonuses and `D` unit defense plus hero/other defense:

```text
if A >= D: multiplier = 1 + min(3.00, 0.05 * (A-D))
if D >  A: multiplier = 1 - min(0.70, 0.025 * (D-A))
damage = round(count * positionedBase * multiplier * registeredModifiers)
damage is at least 1
```

Ranged damage is ×0.5 when an enemy is adjacent or the target is more than seven hexes away. Shooting
through defending city walls is ×0.7. The relevant defaults are centralized in
[`../../src/content/constants.ts`](../../src/content/constants.ts).

### Pinned positioning precedence

Within `damage-computation`, resolve **base luck → attacker positioning overrides → defender
positioning overrides last**. A defender effect that pins incoming damage to range minimum defeats
an attacker effect that pins its attack to maximum. This ordering is absolute and tested.

## Morale (deterministic)

Every stack has visible morale. Default threshold is 100. When it reaches threshold, subtract the
threshold and give that stack one extra action immediately after its normal action; repeat if enough
morale remains. There are no random morale events. The interface announces the extra action with a
brief rally animation over that company.

Defaults are +25 when that stack destroys an enemy, +10 to each ally when any allied stack destroys
an enemy, hero/skill/artifact/omen gains at round start, and −30 when an ally is destroyed. A mixed-
faction army loses 5 per stack at round start unless an explicit rule removes it. Faction passives,
skills, spells, and artifacts may alter gains, drains, or threshold through registered hooks.

Morale is clamped at zero on drains but otherwise retained until spent. Standard morale, all flat
death-triggered morale changes, and other flat death-trigger magnitudes use the proportionality guard
below.

## Destruction proportionality guard

For a destroyed stack:

```text
scale = min(1, destroyedStackMaxHP / (0.10 * armyTotalMaxHP))
```

`destroyedStackMaxHP` uses that stack’s count at battle start and unit max HP.
`armyTotalMaxHP` sums the original, non-summoned stacks on the destroyed stack’s side. A stack worth
at least 10% of its army triggers the full flat effect; a sacrificial splinter scales proportionally.

Apply this scale to every morale effect and flat-magnitude effect triggered by stack destruction,
including the standard drain/gains, `blood_price`, `last_light`, Last Candle, and related round hooks.
Percent-of-self effects such as `unfinished_business` already scale with the stack and are exempt.
Stack splitting does not change the denominator.

## Counters, enchantments, and death

Counter and enchantment rules are in [`S05_MAGIC.md`](S05_MAGIC.md). Turn-start damage/healing and
turn-end decay occur through pipeline hooks. When a stack reaches zero, resolve damage routing and
then death triggers before retaliation. Revivals and last-stack saves occur at their declared stage;
winner detection must account for pending revival. Summoned stacks do not inflate original-army
proportionality.

The standard event order is the nine-stage pipeline in [`S02_ENGINE.md`](S02_ENGINE.md). All unit,
spell, tile, artifact, and faction effects must register into it or an equivalent generic hook.

## Wide units and terrain reach

Combat footprints follow [`S02_ENGINE.md`](S02_ENGINE.md). Every adjacency, attack range,
retaliation, aura, AoE, collision, forced movement, and tile effect works over all occupied hexes.
Wide movement succeeds only when the entire destination footprint fits. A push moves the whole
footprint and collides when any hex is blocked. Created trail tiles cover the swept area.

Current 2-hex assignments and the Sleeper’s 3-hex assignment live in
[`../../src/content/units.ts`](../../src/content/units.ts). Size is authored data; the generic rule
must work for any legal unit.

## Sea and Mire battlefields

In sea combat, outer columns 0–2 and 10–12 are deck and columns 3–9 are shallows. Land units pay +1
movement per shallow hex. Aquatic units ignore that penalty and gain +1 speed while anchored in
shallows; flying units are unaffected. Sea battlefields have no random obstacles. All ordinary
spells and abilities remain legal, including created walls.

Mire templates create 2–3 shallow hexes and reuse the same aquatic/land interaction. Amphibious
shore battles use the standard land template without modifiers.

## Sieges

Assaulting a city with Walls creates six 30-HP, attackable, impassable wall hexes across the
defender’s edge two columns with two authored gaps. Flying crosses; ranged attacks through walls use
the ×0.7 penalty. Walls grant defenders +2 defense. A Keep adds another +2 defense and an immobile
Watchtower using the defender’s tier-2 ranged profile (or Longbowman equivalent) at `10 + 2×week`
units.

The attacker receives one 2-hex Ram stack with catalog stats; it deals double damage to siege walls.
There is no catapult minigame. Siegewright modifies wall bonuses/HP/breach via normal hooks. A
Warden-installed garrison uses its installer’s allowed stats, Command, and remote casting range.

## Retreat and surrender matrix

| Rule | Retreat | Surrender |
|---|---|---|
| Eligible battle | Hero vs hero or guardian | Enemy hero only |
| Heroless garrison | Never | Never |
| Timing | Hero act on any allied turn | Hero act on any allied turn |
| Immediate payment | None | 25% of surviving army gold value, rounded up, to opponent |
| Army | Entire army lost | Surviving army retained |
| Hero | Returns to Tavern pool | Returns to Tavern pool |
| Retained progression | Levels, skills, spells, artifacts | Same, plus army |
| Re-hire | Standard 2500g ransom | Standard 2500g ransom |
| Victor rewards | No Spellthief and no artifact loot | No defeat-only loot; payment is the reward |
| Ransomer | Applies to the outcome | Applies; Erdem doubles surrender cost |

Retreat is also available against neutral guardians; surrender is not because nobody can accept
payment. AI retreats when projected to lose and hero level is at least 4; if it can afford surrender
and the remaining army exceeds 3000g, it prefers surrender. Neutrals never use either.

## Result accounting

The result records winner, casualties and value on both sides, per-stack damage dealt/taken, spells
cast, and extra actions. Apply post-battle recovery, rewards, artifact transfer, hero defeat/ransom,
guardian removal, city ownership, and pending adventure movement through deterministic outcome
handlers. Game-end statistics aggregate player totals.
