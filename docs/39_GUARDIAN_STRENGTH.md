# Guardian and Army Strength Rating

## Status and scope

This work order replaces the runtime `HP × average damage` estimate with one deterministic,
catalog-derived rating for guardian, hero, garrison, and tactical-AI comparisons. Battle simulations
calibrate and regress the rating offline; they never run during gameplay.

## Canonical formula

For unit `u`, let `d` be `max(1, midpoint(minDamage,maxDamage))` and let `a(u)` be the bounded
ability multiplier below:

```text
unitStrength(u) = sqrt(HP × d)
  × (1 + (Attack + Defense) / 40)
  × (1 + 0.04 × clamp(Speed - 5, -3, 6))
  × a(u)

armyStrength = sum(stack count × unitStrength(unit))
```

The geometric HP/damage term follows the attrition shape observed when companies exchange damage:
survival and output both matter, without multiplying their full tier growth together. Attack and
Defense share a small linear adjustment; Speed is bounded to 0.88–1.24. The following stable role
adjustments are additive and their combined multiplier is clamped to 0.85–1.35:

| Ability | Adjustment |
|---|---:|
| ranged | +0.15 |
| flying | +0.05 |
| no retaliation | +0.08 |
| soft body / incoming minimum | +0.06 |
| unlimited retaliation | +0.08 |
| full heal | +0.25 |
| melee reflection | +0.25 |
| immobile | −0.15 |
| sniper | +0.08 |
| first strike | +0.10 |
| phalanx | +0.06 |
| spell shrug | +0.05 |
| all adjacent | +0.20 |
| breath | +0.12 |
| line strike | +0.10 |
| cleave | +0.08 |
| blast shot | +0.12 |
| arc shot | +0.10 |
| warded hide | +0.06 |
| low-magic immune | +0.08 |
| spellbound | +0.05 |
| caster | +0.10 |
| spell frail | −0.06 |
| slow witted | −0.10 |
| hungry | −0.05 |
| mindless | −0.04 |
| brittle bones | −0.06 |

Abilities with matchup-, terrain-, casualty-, or choice-dependent value remain outside the scalar.
The one-point damage floor gives non-attacking but legal pseudo-units a finite positive rating.
Every term comes only from the unit catalog and count. The formula is pure, additive for mixed
armies, strictly linear in each positive stack count, independent of slot order, and centralized in
[`src/core/army.ts`](../src/core/army.ts).

The rating deliberately excludes hero stats, battlefield, walls, spells, artifacts, target
composition, morale state, and player control. It is a cheap strategic estimate, not a battle
prediction API.

## Calibration contract and result

[`src/sim/guardian-strength-calibration.ts`](../src/sim/guardian-strength-calibration.ts) runs both
attacker/defender seatings for seeds 11, 29, and 47 on open meadow. It covers identical stacks,
cross-tier melee/ranged/fast/defensive/ability-bearing pairs, and six mixed armies. The committed
report is [`reports/GUARDIAN_STRENGTH_CALIBRATION.md`](reports/GUARDIAN_STRENGTH_CALIBRATION.md).
`npm run calibrate:guardian-strength` fails when that report differs from fresh deterministic output.
The same report records the exact stable-direction adjustment catalog and the re-derived Crooked
Crown and Sixfold Trial guardian rosters, so trait or authored-count drift fails the same gate.

Acceptance targets are median absolute break-even count error at most 20%, and correct ordering for
at least 80% of decisive mixed matchups. After the docs 63–64 stable-direction additions, the
selected formula reaches 13.6% median error versus 24.6% for the old estimator, and 6/6 decisive
mixed orderings. Equal identical stacks split 50/50
after seating reversal; doubled identical stacks win all paired battles.

## Consumer and threshold audit

Every army-scale consumer calls `armyPower`, and tactical AI stack ordering calls `unitStrength`.
The exported name `armyPower` remains for compatibility; its meaning is this rating.

| Consumer | Final threshold | Ruling |
|---|---:|---|
| AI guarded-object acceptance | guardian ≤ 0.80 × own | retained and named; a 25% strength cushion exceeds median estimator error |
| AI immediate hero/castle assault | own ≥ 1.25 × enemy | raised from 1.20 to share the calibrated cushion |
| Siren Rocks listen | own ≥ 1.25 × guardian | raised from 1.20 to share the calibrated cushion |
| Gatherer threat | enemy ≥ 1.50 × own | retained; intentionally more conservative than ordinary assault |
| Diplomacy ranks 1/2/3 | 0.50 / 0.80 / 1.20 × own | retained player-facing skill contract; cross-unit comparisons now use the new rating |
| Quiet Horseshoe | guardian ≤ 0.25 × own | retained literal artifact contract |
| Beastmaster weekly join | guardian ≤ 0.30 × own | retained literal skill contract |
| Borrowed Legion | 0.80 × current army | retained literal bargain contract; Candle-Wisp count now divides by `unitStrength` |

## Verification

- Formula tests cover finiteness/positivity for every catalog unit, linear count scaling, additivity,
  slot independence, and representative stat/role ordering.
- Calibration tests identical, cross-unit, and mixed armies and compares the old estimator.
- Existing focused AI, Diplomacy, bargain, Beastmaster, artifact, guardian, and water/Siren tests
  remain required, followed by the complete test suite and production build.
