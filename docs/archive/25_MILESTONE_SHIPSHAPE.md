# Milestone: Ship-Shape

The seven gaps from the mechanics audit, plus three small adds. Judgment calls → DECISIONS.md; do not ask.

## 1. Retreat & surrender

- **Retreat** (hero battles and guardian battles; heroless garrisons cannot): available as the hero's act on any allied stack's turn. Battle ends immediately: the army is lost; the hero returns to the tavern pool with artifacts, spells, skills, and levels intact (re-hire at the standard 2500g ransom). A retreated-from enemy wins the battle but gets **no Spellthief trigger and no artifact loot** — those require defeating the hero. That tension is intended: chase or let them buy their life.
- **Surrender** (only against an enemy hero — someone must accept payment): pay 25% of your remaining army's gold value to the opposing player; your hero goes to the tavern pool **with the surviving army intact** (re-hire 2500g, army included). Ransomer ranks apply to both outcomes.
- AI: retreats when projected to lose with hero level ≥ 4; surrenders instead when it can afford it and remaining army value > 3000g. Neutrals never retreat.
- UI: both as buttons next to Auto-resolve, with cost/consequence preview.

## 2. Stack splitting

- Splitting is an **adventure-map action only** (hero screen, exchange screen, garrison) — a split dialog with a count slider, plus "split evenly." Never at battle start, never in combat (fluidity rule).
- **The proportionality guard** (new global combat rule, pinned now to preempt sacrificial-splinter degeneracy): every meter effect and flat-magnitude effect triggered by a stack's destruction — the standard −30 drain, `blood_price`, `last_light`, Last Candle, `war_drums`-adjacent triggers — scales by `min(1, destroyedStackMaxHP / (0.10 × armyTotalMaxHP))`. A stack worth ≥10% of the army triggers full effect; a 1-unit chaff stack triggers almost nothing. Percent-of-self effects (`unfinished_business`) already scale and are exempt.
- Sim check regardless: a scripted "sacrificer" AI (splits 1-unit stacks as fodder) must NOT beat the standard AI in >60% of matched games for Wildergrass or Unfinished. If it does even with the guard, report — don't tune unilaterally.

## 3. Guardian growth

- On each week start, neutral guardian stacks grow **+10%** (round down, min +1), capped at **5× original size**. Objects flagged `static: true` (puzzle-locks, authored bosses, the Kit guards) never grow. Display bands update; Scouting sees exact.
- This restores the clear-it-now-or-pay-later pressure; the lint tool is unaffected (zones don't change).

## 4. Difficulty settings

Per-game setting in the menu (per human player on hot-seat? No — one global setting; log). Four levels, four levers:

| | Easy | Normal | Hard | Brutal |
|---|---|---|---|---|
| Human start resources | 200% | 100% | 100% | 75% |
| AI income | 75% | 100% | 125% | 150% |
| AI dwelling growth | −25% | +0% | +25% | +50% |
| Guardian sizes | 75% | 100% | 100% | 125% |

The AI never gains vision or rule cheats beyond what's already logged. Difficulty is stored in the save/replay header.

## 5. Save / load / replay links

- **A save is `{contentHash, mapId, difficulty, seed, actionLog}`** — the deterministic engine makes replaying the log the load mechanism. Implement: autosave at each turn end (3 rotating slots), manual save slots, export/import as a file, all via a storage adapter (localStorage where available).
- **Shareable links:** compress the save (deflate → base64url) into a URL fragment. Two link types: *game link* (load and continue) and *battle replay link* (spectate one battle, step/play controls). Warn when a link exceeds ~50KB compressed; offer file export instead.
- `contentHash` covers all content data files. On mismatch: local loads allowed with a desync warning; URL replays refused (numbers changed → the log diverges).
- CI determinism guard: golden saves replayed on every build must produce identical final-state hashes.

## 6. Minimap & world view

- Corner minimap: terrain colors, object dots (owner-colored; neutral grey), hero pips, viewport rectangle, fog respected, click-to-pan, two sizes.
- Zoomed-out world view (keyboard `M` toggle): whole map at low LOD — below the zoom threshold, render terrain + major objects only (SVG perf: hide decorations, disable tooltips).

## 7. Per-map victory conditions

- Map data gains `victory` (and optional `defeat`) fields. Types for now: `conquest` (default — current rules), `hold {objectId, days}`, `assemble {setId}` (the Tailor's Kit), `slay {objectId}` (e.g., the Sleeper). Loss overrides mirror them.
- UI: objective on the map-start splash and persistently in the status bar (in-world phrasing from the map file + plain mechanics line, per the flavor system).
- AI understands `conquest` only; on other maps it plays conquest and contests the objective opportunistically (log as limitation).
- Both existing maps stay `conquest`; wire one demonstration: a Crosstitch variant "Crosstitch: The Kit" with `assemble`.

## Small adds

- **Roads:** terrain overlay, move cost 65, drawn on both maps linking castles toward the center. (The flavor label already exists.)
- **Mana Spring** (map object): visiting hero's mana refills; once per week per hero; one per map, center-adjacent, guarded. Flavor: "The water remembers being sky. Drink standing up."
- **Battle statistics:** result screen gains per-stack damage dealt/taken, spells cast, extra actions taken, casualty values both sides; game-end screen gets totals per player (tables; graphs someday).

## Acceptance

Tests for every rule above (retreat/surrender consequence matrix; proportionality guard boundary at exactly 10%; growth cap; save→load→hash identity; victory triggers). Sim league zero crashes; sacrificer check passes; golden-replay CI green. Human acceptance: save mid-game, reload, share a battle link to another browser, surrender a doomed fight and re-hire with the army intact, and lose a mine to a guardian you ignored for five weeks.
