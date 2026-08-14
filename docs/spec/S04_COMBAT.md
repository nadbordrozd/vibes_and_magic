# Combat Rules

## Battlefield and armies

Combat is round-based on a 13×9 hex field. A hero is off-board and cannot be attacked; hero primary
stats, skills, specialties, spellbook, mana, equipment, and applicable installed-garrison effects
modify the army. Each side fields every occupied slot of its commander's derived seven-to-nine-slot
army. Neutral guardians have no hero and retain the fixed seven-slot limit.

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

The speed delta is clamped to `[-3,6]`. Stable role adjustments are limited to ranged, flying,
no-retaliation, incoming-minimum, unlimited-retaliation, full-heal, melee-reflection, immobile,
Sniper, First Strike, Phalanx, Spell Shrug, All Adjacent, Breath, Line Strike, Cleave, Blast Shot,
Arc Shot, Warded Hide, Low-Magic Immune, Spellbound, Caster, Spell Frail, Slow Witted, Hungry,
Mindless, and Brittle Bones. They are additive and the combined ability multiplier remains clamped
to `[0.85,1.35]`; matchup- and choice-dependent traits are excluded. Exact adjustments,
implementation, calibration method, authored guardian rosters, and threshold audit are in
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

A hero may take one hero act per round at the start of any allied stack turn. Casting, combat item
use, or the hero's faction Knack uses that shared act unless a named rule explicitly waives or adds
one. A Knack costs no mana, is itself limited to once per round, and derives rank from hero level:
rank 1 at level 1, rank 2 at level 6, and rank 3 at level 12. Named credits are bounded state, never
an inference from whether a spell was cast. The hero act never consumes the stack’s action. No
pre-battle deployment or item-use phase is inserted.

The zero-mana Knack floor is subject to its printed target existing. In particular, Lay Resin is
not an executable action when the battlefield has fewer legal empty hexes than its current rank
requires. Its permanent control remains visible and disabled with a precise placement reason; an
uncompleted generic placement draft is never counted as a legal action.

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

Doc-63 creature support enters the named resolution stages rather than running after an action.
Hex Feeder makes the ordinary Hex bonus additive at +15% per pip total; Counter-Eater's consumed
piles grant Attack only until its next turn, while Soul Tithe persists for the battle. Burn Conduit
transfers exactly two already-resolved Burn without reapplying source bonuses, or creates fixed
non-spell Burn 1 when empty. Sniper removes only the beyond-seven penalty. Chain Shot spends one
shot total and chooses the stable first adjacent non-primary company, including a friendly company,
for a non-recursive half-damage shot. First Strike consumes the ordinary retaliation allowance
before melee damage. Phalanx is one nonstacking 15% adjacent-allied reducer; Blood Drum's printed
self-payment bypasses it.

Unstable deals 20% of battle-start maximum HP to every adjacent living company on either side.
Chained deaths queue by stable company ID and settle once. Silence the Passing suppresses hostile
death triggers and its Upgraded face doubles its owner's triggers. Siphon heals half the HP actually
removed (so overkill is excluded) to the stable lowest-current-HP allied survivor without
resurrection. Blink Step enumerates only footprint-legal noncurrent anchors. Altar is the explicit
summon-sacrifice exception: cause-aware death settlement runs first, then a living Altar restores
its battle-start company and grants two mana, capped normally.

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

Flat spell **impact damage** is a separate damage-computation primitive:
`(base + coefficient × effective Spell Power) × (1 + 0.05 × target Hex) × registered modifiers`.
Its declared capped/half-rate curve is applied before routing. It ignores Attack, Defense, luck,
retaliation, and melee reflection. It obeys Mourner's Veil, Ironclad, and Ward: Ward consumes the
next impact instance, and its Upgraded Burn rider applies when that instance names a source company.
A link routes its printed share once; linked damage never enters another link.

Recipient protection resolves once for each company before a composite spell face. If immunity or
Ward blocks that recipient, every same-recipient part of that face is skipped together: impact,
counters, displacement or teleport, grounding, and effect removal. Enchantment-level state remains
global unless its own rule names recipients. This prevents a blocked impact from leaking its rider.

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

## Generic combat operations and bounds

Mass targeting is one shared mode (`mass-enemy`, `mass-ally`, or `mass-all`) with stable side/slot/ID
ordering; all-spell immunity removes a company from friendly and hostile spell target sets. Generic
operations cover impact, resurrection, HP-capped once-per-battle mind control, one damage link per
company, legal-footprint teleport, action-count stun, nearest-company berserk, summoned clone,
all-spell immunity, counter detonation/conversion, sacrifice, ammunition grants, bounded extra
actions, serialized delayed triggers, side-scoped mid-battle resonance, persistent hazard hexes,
and hero-to-hero mana drain.

The following constraints are executable and expose stable blocked-reason text: mana never exceeds
the battle-captured effective maximum; mana-granting spells cannot be copied except by Echo; returns
derived from a company use its starting maximum HP; non-morale granted actions cap at two per company
per round and never grant a hero act; copy effects cannot recursively copy themselves, prohibited
mirror/twister/tier-5 content, clones, or copied abilities; summoned/cloned companies cannot be
cloned or resurrected; control cannot repeat, extend, or pass to a third party; one duration-bound
link per living company expires from both serialized endpoints and never retriggers; counter caps
remain 9 unless a printed artifact raises them to at most 15, and
conversion/detonation do not count as applications; detonation removes its pile before computing;
resurrection stops at starting count; and only one once-per-company destruction save may claim a
single destruction event.

Artifact combat rules enter those same generic stages by effect tag. The first-push credit is one
serialized use per side and applies to spell or company forced movement. Enemy death-trigger
reduction floors counter and morale magnitudes at zero without reducing percent-of-self damage.
Counter eating is an explicit once-per-battle replay action over any visible nonempty pile and grants
`5×N` morale. The doc-63 casting, healing, summoning, enchantment, counter, action, and mana effects
use bounded serialized credits and never create an artifact-ID resolver branch.

Temporary control changes a company's tactical `side`: targeting, acting, friendly effects, and
Grave Bargain's allied-company check use that current side. It never changes persistent army
ownership. Elimination, original-army denominators, surrender valuation, casualty attribution,
owner-bound destruction saves, battle metrics, and post-battle army reconstruction use
`originalSide ?? side`.

Battle round 100 remains the final playable round. If neither side has been eliminated when the
next round would begin, the side with the greater surviving proportion of its original,
non-summoned army HP wins; an exact tie favors the defender. State records `round-limit` and the log
prints the result. This deterministic stalemate rule covers wall-and-shoot, Chill-lock, and
attrition configurations without weakening finite combo blowouts. Fixed Quiet Yard, Standing Cold,
and Attrition Wall fixtures create their relevant wall, Chill, and resurrection/protection state
through ordinary spell actions before the terminal boundary, then play multiple complete rounds
through ordinary Defend actions and record `round-limit`. They therefore exercise normal turn/round
transition and termination rather than merely invoking a private winner helper.

## Wide units and terrain reach

Combat footprints follow [`S02_ENGINE.md`](S02_ENGINE.md). Every adjacency, attack range,
retaliation, aura, AoE, collision, forced movement, and tile effect works over all occupied hexes.
Wide movement succeeds only when the entire destination footprint fits. A push moves the whole
footprint and collides when any hex is blocked. Created trail tiles cover the swept area.

Multi-hex attacks use that same union. Primary damage resolves first, then secondary victims in
ascending stack-ID order; every victim recomputes Defense, Hex, and damage reducers. Secondary
victims never retaliate and receive no primary-only riders. Breath and Cleave permit only the
primary to retaliate. All Adjacent, Line Strike, Blast Shot, and Arc Shot permit none. Ranged
patterns spend exactly one shot regardless of victim count.

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
Warden-installed garrison uses its installer’s allowed stats, Command, and remote casting range. It
receives the installer's faction Knack only when Warden rank 3's five-tile remote-casting check
passes; lower ranks and an out-of-range installer leave the garrison without hero-act authority.

## Skills-v2 battle boundaries

Tactician reads a persisted adventure-map company-slot designation during setup; no deployment
phase exists. R1 advances ordinary deployment one column, R2 places the designation at the
furthest-forward footprint-legal anchor on its half nearest the center row, and R3 gives it first
order in round one. Beguiler R1 and Curse-Eater R3 are serialized battle-opening target choices
that gate ordinary actions; AI chooses the stable first legal company. Beguiler R3 is a free
once-per-battle control action capped by current total HP `25 × hero level`. Duelist R1 adds two
Attack and Defense only in hero battles; R2 removes the opponent's retreat/surrender actions.

Post-victory settlement uses original ownership and cause-aware casualties. Reaper restores 10% or
20% of the winner's own casualties and R3 additionally raises `floor(15% × enemy casualties)` as
the winner faction's tier-1 unit. Duelist R3 pauses settlement for an explicit artifact trophy
choice. This choice precedes ordinary mandatory artifact transfer and, on surrender, is the named
exception to equipment protection. Both human and AI choices are replay actions.

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

## Artifact rule exceptions

Combat artifacts dispatch by registered effect tag. The setup choice for free deployment is
serialized and limited to the owner's half. Destruction can stage Attack/Defense inheritance for the
next allied company to act; the smallest original company alone receives proportionality sizing.
That same weighted proportionality scales both morale and destruction triggers. Prior-faction battle
count includes identifiable non-hero opponents, is copied into battle context, and caps Grudge damage at 30%. The first
forced push, beckon, or teleport may be warded once per side. Chill retaliation suppression,
conditional hero-count stats, Long Table capacity, and all three small-set bonuses use the same
generic registries. No artifact ID is a combat behavior switch.
