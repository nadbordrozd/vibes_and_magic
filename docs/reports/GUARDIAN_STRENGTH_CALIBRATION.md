# Guardian strength calibration report

Generated deterministically with seeds 11, 29, 47. Each result combines both attacker/defender seatings on open meadow.

## Stable-direction ability adjustments

Adjustments are additive and the combined multiplier is clamped to 0.85–1.35. Matchup- and choice-dependent traits are deliberately absent.

| Ability | Adjustment |
|---|---:|
| `all_adjacent` | +0.20 |
| `arc_shot` | +0.10 |
| `blast_shot` | +0.12 |
| `breath` | +0.12 |
| `brittle_bones` | -0.06 |
| `caster` | +0.10 |
| `cleave` | +0.08 |
| `first_strike` | +0.10 |
| `flying` | +0.05 |
| `full_heal` | +0.25 |
| `hungry` | -0.05 |
| `immobile` | -0.15 |
| `line_strike` | +0.10 |
| `low_magic_immune` | +0.08 |
| `melee_reflect` | +0.25 |
| `mindless` | -0.04 |
| `no_retaliation` | +0.08 |
| `phalanx` | +0.06 |
| `ranged` | +0.15 |
| `slow_witted` | -0.10 |
| `sniper` | +0.08 |
| `soft_body` | +0.06 |
| `spell_frail` | -0.06 |
| `spell_shrug` | +0.05 |
| `spellbound` | +0.05 |
| `still_on_watch` | +0.08 |
| `warded_hide` | +0.06 |

## Count invariance

| Unit | Counts | Rating / one-unit rating |
|---|---:|---:|
| Yeoman | 4, 8, 16, 32 | 4, 8, 16, 32 |
| Longbowman | 4, 8, 16, 32 | 4, 8, 16, 32 |
| Marionette | 4, 8, 16, 32 | 4, 8, 16, 32 |
| Stuffed Sentinel | 4, 8, 16, 32 | 4, 8, 16, 32 |
| Oriflamme Wyvern | 4, 8, 16, 32 | 4, 8, 16, 32 |
| The Sleeper | 4, 8, 16, 32 | 4, 8, 16, 32 |

## Same-unit battle outcomes

Each row uses 12 defenders. Equal stacks split by seating; doubling only the left count must win every paired battle.

| Unit | Equal-count left wins | Double-count left wins |
|---|---:|---:|
| Yeoman | 50% | 100% |
| Longbowman | 50% | 100% |
| Marionette | 50% | 100% |
| Stuffed Sentinel | 50% | 100% |
| Oriflamme Wyvern | 50% | 100% |
| The Half-Woken Queen | 50% | 100% |

## Same-stack-type break-even counts

For 12 units in the left column, empirical is the first opposing count winning at least half of 6 paired battles.

| Left | Right | Empirical | Chosen estimate | Chosen error | Legacy estimate | Legacy error |
|---|---|---:|---:|---:|---:|---:|
| Yeoman ×12 | Tin Soldier | 13 | 13.0 | 0.3% | 12.6 | 3.1% |
| Longbowman ×12 | Hobby Knight | 10 | 10.2 | 1.9% | 7.5 | 24.6% |
| Marionette ×12 | Sentries | 12 | 11.1 | 7.9% | 10.7 | 11.1% |
| Lance Knight ×12 | Stuffed Sentinel | 13 | 13.6 | 4.3% | 10.8 | 16.9% |
| Bone Choir ×12 | Rusalka | 15 | 15.5 | 3.5% | 14.4 | 3.8% |
| Oriflamme Warden ×12 | Dragonfly Cavalry | 19 | 16.0 | 16.0% | 29.1 | 53.2% |
| Silk-Spinners ×12 | Ashmane Wolves | 12 | 8.5 | 29.0% | 6.7 | 44.4% |
| Amber-Carriers ×12 | Aurochs Herd | 10 | 8.3 | 16.5% | 7.9 | 20.6% |
| The Brides ×12 | Leshy | 8 | 9.1 | 13.2% | 8.7 | 9.1% |
| Oriflamme Wyvern ×12 | Thunderbird | 12 | 14.5 | 21.0% | 17.7 | 47.9% |
| Reliquary Ark ×12 | The Walking Hut | 9 | 7.8 | 13.6% | 5.1 | 43.9% |
| The Half-Woken Queen ×12 | The Ferry | 8 | 10.3 | 28.3% | 12.3 | 53.3% |

Chosen median absolute break-even error: **13.6%**; legacy: **24.6%**.

## Mixed-army ordering

| Matchup | Left win rate | Observed | Chosen L/R | Legacy L/R |
|---|---:|---|---:|---:|
| low-tier melee against ranged support | 0% | right | 0.75 | 0.51 |
| fast assault against defensive line | 0% | right | 0.91 | 0.72 |
| flying force against beasts | 100% | left | 1.94 | 3.76 |
| high-tier mixed companies | 100% | left | 1.16 | 1.37 |
| ranged and control mix | 0% | right | 0.71 | 0.88 |
| three-faction combined arms | 100% | left | 1.06 | 1.00 |

Chosen ordering agreement: **6/6** decisive matchups; legacy: **6/6**.

## Authored guardian recalibration

Counts below are re-derived through the same `unitStrength` authority. Map seeds affect ordinary seeded content but not these authored guardian rows.

### The Crooked Crown (seed 4040)

Strength range 90.79–350.79; median 181.57.

| Guardian | Unit | Count | Strength |
|---|---|---:|---:|
| `crooked-crown-reward-1-guardian` | Yeoman | 30 | 115.92 |
| `crooked-crown-reward-2-guardian` | Tin Soldier | 58 | 206.34 |
| `crooked-crown-reward-3-guardian` | Bone Choir | 7 | 211.31 |
| `crooked-crown-reward-4-guardian` | Silk-Spinners | 14 | 152.77 |
| `crooked-crown-reward-5-guardian` | Ashmane Wolves | 16 | 245.92 |
| `crooked-crown-reward-6-guardian` | Masked Duelist | 16 | 326.33 |
| `crooked-crown-reward-7-guardian` | Marionette | 25 | 350.79 |
| `crooked-crown-reward-8-guardian` | Bannerman | 17 | 274.44 |
| `crooked-crown-reward-9-guardian` | Wooden Colossus | 2 | 181.57 |
| `crooked-crown-reward-10-guardian` | Hearth-Hound | 25 | 302.92 |
| `crooked-crown-reward-11-guardian` | Oriflamme Warden | 3 | 290.03 |
| `crooked-crown-reward-12-guardian` | Wax Servitor | 14 | 241.70 |
| `crooked-crown-mine-2-guardian` | Ashmane Wolves | 11 | 169.07 |
| `crooked-crown-mine-3-guardian` | Masked Duelist | 8 | 163.17 |
| `crooked-crown-mine-5-guardian` | Bannerman | 7 | 113.01 |
| `crooked-crown-mine-6-guardian` | Wooden Colossus | 1 | 90.79 |
| `crooked-crown-mine-7-guardian` | Hearth-Hound | 8 | 96.94 |
| `crooked-crown-mine-8-guardian` | Oriflamme Warden | 1 | 96.68 |
| `crooked-crown-mine-10-guardian` | Yeoman | 40 | 154.57 |
| `crooked-crown-mine-11-guardian` | Tin Soldier | 48 | 170.76 |

### The Sixfold Trial (seed 4901)

Band populations: skirmish 4, field 4, elite 5, ordeal 4.

| Guardian | Unit | Count | Strength |
|---|---|---:|---:|
| `sixfold-guardian-1` | Masked Duelist | 7 | 142.77 |
| `sixfold-guardian-2` | Wax Servitor | 10 | 172.64 |
| `sixfold-guardian-3` | Hearth-Hound | 17 | 205.99 |
| `sixfold-guardian-4` | Sirens | 24 | 281.30 |
| `sixfold-guardian-5` | The Mirror-Bound | 2 | 314.38 |
| `sixfold-guardian-6` | The Sleeper | 2 | 459.00 |
| `sixfold-guardian-7` | Lantern-Angler | 10 | 524.72 |
| `sixfold-guardian-8` | Drowned Crew | 46 | 643.63 |
| `sixfold-guardian-9` | Hull-Turtle | 12 | 757.73 |
| `sixfold-guardian-10` | Marionette | 64 | 898.01 |
| `sixfold-guardian-11` | Bone Choir | 33 | 996.17 |
| `sixfold-guardian-12` | Silk-Spinners | 105 | 1145.77 |
| `sixfold-guardian-13` | Wooden Colossus | 2 | 181.57 |
| `sixfold-guardian-14` | Oriflamme Warden | 3 | 290.03 |
| `sixfold-guardian-15` | Bannerman | 37 | 597.32 |
| `sixfold-guardian-16` | Ashmane Wolves | 78 | 1198.88 |
| `sixfold-guardian-17` | Tin Soldier | 202 | 718.63 |
| `sixfold-guardian-18` | Yeoman | 98 | 378.69 |
