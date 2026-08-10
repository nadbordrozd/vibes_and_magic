# Guardian strength calibration report

Generated deterministically with seeds 11, 29, 47. Each result combines both attacker/defender seatings on open meadow.

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
| Yeoman ×12 | Tin Soldier | 13 | 12.3 | 5.4% | 12.6 | 3.1% |
| Longbowman ×12 | Hobby Knight | 11 | 9.5 | 13.4% | 7.5 | 31.4% |
| Marionette ×12 | Sentries | 16 | 12.1 | 24.5% | 10.7 | 33.3% |
| Lance Knight ×12 | Stuffed Sentinel | 10 | 12.3 | 23.2% | 10.8 | 8.0% |
| Bone Choir ×12 | Rusalka | 17 | 14.3 | 15.9% | 14.4 | 15.1% |
| Oriflamme Warden ×12 | Dragonfly Cavalry | 23 | 17.5 | 24.0% | 29.1 | 26.6% |
| Silk-Spinners ×12 | Ashmane Wolves | 12 | 8.5 | 29.0% | 6.7 | 44.4% |
| Amber-Carriers ×12 | Aurochs Herd | 10 | 9.0 | 9.9% | 7.9 | 20.6% |
| The Brides ×12 | Leshy | 12 | 10.7 | 10.8% | 8.7 | 27.3% |
| Oriflamme Wyvern ×12 | Thunderbird | 16 | 14.3 | 10.8% | 17.7 | 10.9% |
| Reliquary Ark ×12 | The Walking Hut | 7 | 6.6 | 5.5% | 5.1 | 27.8% |
| The Half-Woken Queen ×12 | The Ferry | 13 | 11.1 | 14.5% | 12.3 | 5.6% |

Chosen median absolute break-even error: **14.5%**; legacy: **26.6%**.

## Mixed-army ordering

| Matchup | Left win rate | Observed | Chosen L/R | Legacy L/R |
|---|---:|---|---:|---:|
| low-tier melee against ranged support | 0% | right | 0.79 | 0.51 |
| fast assault against defensive line | 0% | right | 0.90 | 0.72 |
| flying force against beasts | 100% | left | 1.85 | 3.76 |
| high-tier mixed companies | 100% | left | 1.33 | 1.37 |
| ranged and control mix | 0% | right | 0.76 | 0.88 |
| three-faction combined arms | 50% | split | 1.00 | 1.00 |

Chosen ordering agreement: **5/5** decisive matchups; legacy: **5/5**.
