# PoC Specification

Goal: a playable engine test. One map, two factions, two castles, mines, a few guardians, hot-seat and vs-AI play, minimalist SVG graphics. No spells, no artifacts, no secondary skills, no marketplace. Everything not specified here defaults first to `03_MECHANICS.md`, then to HoMM3 behaviour, then to your own judgment — log judgment calls in `docs/DECISIONS.md` instead of asking.

Build order is mandatory: **Phase 1** headless core with tests → **Phase 2** sim harness + AI → **Phase 3** SVG UI. Phases 1–2 must pass before any UI work starts.

---

## 1. Game setup

- Main menu: title, map selection list (containing the single map "Border Marches"), and for each of 2 player slots a toggle: Human / AI. Default: P1 Human, P2 AI. Start button. A "New Game" always uses a fresh random seed (display the seed; allow typing a custom one).
- Hot seat: when both players are Human, show a "Pass device — Player N's turn" interstitial between turns that hides the map until clicked (fog differs per player).
- Players: Player 1 = Crimson faction, west castle. Player 2 = Azure faction, east castle. Fixed for PoC.

## 2. Map: "Border Marches"

- 28×20 square grid (map layer is squares; battlefield is hexes). Coordinates (0,0) top-left.
- Terrain: `grass` (cost 100 move points), `forest` (cost 150, passable), `mountain` (impassable), `water` (impassable). Author the map as a TS data file with a rough left-right mirror symmetry; a mountain spine down the middle with two gaps (one north, one south).
- Objects (author exact placements in the map file; keep mirrored fairness):
  - 2 castles: Crimson at (3,10), Azure at (24,10). Each castle's tile is enterable by its owner or attackable by the enemy.
  - Mines, per side: 1 gold mine (+1000 gold/day), 1 timber camp (+2/day), 1 iron mine (+1/day), 1 essence spring (+1/day). Plus 1 neutral extra gold mine near each middle gap.
  - Each mine is guarded by a neutral stack (see §7) except the two timber camps.
  - ~10 loose resource piles per side (mix: 500–1000 gold, 3–6 timber, 2–3 iron, 2–3 essence).
  - 2 treasure chests per side: grant 1500 gold OR 1000 hero XP (chooser dialog; AI takes XP).
- Fog of war: per-player, permanent reveal (explored stays visible; no unit-visibility recompute). Heroes reveal radius 5, castles radius 7.

## 3. Turn structure

- Sequential player turns; P1 then P2 = one day. 7 days = week; on day 1 of each week, castle dwellings restock growth.
- On a player's turn they may, in any order: move heroes (each has its own move pool), build (≤1 building per castle per day), recruit, initiate combat by moving onto an enemy/guardian, end turn.
- Daily income at turn start: castle 500 gold base (+1000 with Treasury built) + owned mines.

## 4. Heroes

- Each player starts with 1 hero at their castle. No hero hiring in PoC. If a player's hero dies and they own no castle garrison able to defend, they can still win only via garrison defense; if they lose all castles they lose immediately; if their hero dies they may not get a new one (PoC simplification) — losing your hero AND having no castle = loss; losing all castles = loss regardless of hero.
- Movement: 2000 move points/day. Moving one tile costs the destination tile's terrain cost; diagonals cost ×1.41 (rounded). Pathfinding: A*.
- Starting stats: Crimson hero A2 D2 SP1 K1 (class weights: attack 40 / defense 30 / sp 15 / k 15). Azure hero A1 D1 SP2 K2 (weights 15/15/40/30).
- XP: 500 per guardian battle won + 1 XP per HP of enemy units killed in any battle. Level thresholds: level N requires 1000 × 1.4^(N−2) cumulative XP (level 2 at 1000). On level-up: draft of 3 options drawn without replacement from {+1 A, +1 D, +1 SP, +1 K} weighted by class; human picks via dialog, AI picks its class's highest-weight available option.
- Mana: pool 10×K, starts full, +1/day in field, full in friendly castle at turn start. (Unused in PoC combat; implement the bookkeeping.)
- Army: 7 slots. Stacks of same unit type merge automatically. Garrison: each castle has 7 garrison slots; hero in castle can freely swap units with garrison.

## 5. Factions and units

Made-up placeholder content; balance is not the point. Three units per faction, tiers 1–3. Stats: HP / min–max damage / Attack / Defense / Speed (battlefield hexes per move) / weekly growth / cost.

**Crimson** (melee-leaning)
- T1 **Militia**: 6 HP, 1–2 dmg, A2 D2, spd 5, growth 14, cost 60g
- T2 **Berserker**: 18 HP, 3–5 dmg, A6 D4, spd 6, growth 8, cost 200g + 1 iron
- T3 **Drake**: 60 HP, 9–14 dmg, A11 D10, spd 8, growth 3, cost 700g + 2 iron, ability `flying`

**Azure** (ranged-leaning)
- T1 **Slinger**: 5 HP, 1–3 dmg, A3 D1, spd 4, growth 14, cost 70g, ability `ranged` (12 shots)
- T2 **Frost Adept**: 14 HP, 3–6 dmg, A5 D3, spd 5, growth 8, cost 220g + 1 essence, ability `ranged` (10 shots)
- T3 **Golem**: 70 HP, 8–12 dmg, A9 D12, spd 4, growth 3, cost 650g + 2 iron

Abilities registry (PoC): `ranged` (may attack any target at no melee-range requirement; ×0.5 damage if an enemy is adjacent or the target is at hex-distance > 7; consumes 1 shot; melee attack when out of shots), `flying` (ignores obstacles and units when moving; must land on a free hex).

Starting armies: Crimson hero 20 Militia + 4 Berserkers; Azure hero 20 Slingers + 4 Frost Adepts. Starting garrisons: empty. Starting resources per player: 5000 gold, 10 timber, 3 iron, 3 essence.

## 6. Castles and buildings

Prebuilt in both castles: Town Hall, T1 dwelling. Buildable (cost; prerequisite):
- **T2 dwelling** (1500g + 5 timber; none)
- **T3 dwelling** (3000g + 5 timber + 3 iron; T2 dwelling)
- **Treasury** (2000g + 5 timber; none) → +1000 gold/day
- **Walls** (1500g + 3 iron; none) → garrison defense bonus: all defending stacks +2 Defense, and attacker's ranged units get ×0.7 damage
Castle screen: shows buildings (built/available/unaffordable), recruit panel (available count = accumulated growth; buy up to available), garrison, visiting hero army.
Undefended castle (no garrison, no hero) is captured by simply walking in. Defended castle → battle vs garrison (+ visiting hero's army merged if a hero is stationed there; excess stacks beyond 7 stay out, garrison first).

## 7. Neutral guardians

Guardian stacks sit on a tile; entering it starts combat. They never move. Author these on the map (mirrored): timber camps unguarded; gold mines guarded by 30 Militia (west) / 30 Slingers (east); iron mines by 10 Berserkers / 10 Frost Adepts; essence springs by 8 Berserkers / 8 Frost Adepts; central neutral gold mines by 2 Drakes / 2 Golems; each treasure chest pair guarded by 15 Militia / 15 Slingers. A guardian's army splits into up to 5 equal stacks at battle start (HoMM3-style). Guardians never grow over time (PoC simplification).

## 8. Combat

- Hex battlefield, **13 columns × 9 rows**, odd-row-offset hexes. Attacker stacks deploy in column 0 (rows spread from center), defender in column 12. ~8 obstacle hexes generated from the battle seed (impassable; never on deployment columns).
- Round structure: all stacks ordered by Speed desc (ties: attacker side first, then slot order). Each stack, on its turn: move (up to Speed hexes, BFS through free hexes; `flying` ignores blockers), attack adjacent (or ranged attack), wait (act at end of round), or defend (+2 Defense until next turn). Hero is not on the field.
- Damage: `base = stacksize × rand-in-range positioned by luck (see 03_MECHANICS: luck 0 = midpoint; no RNG)`, then ×(1 + 0.05×(A_total − D_total)) if attacker A higher (cap +300%), or ×(1 − 0.025×(D_total − A_total)) if defender higher (cap −70%). A_total = unit A + hero A (heroless neutrals: unit only). Kill resolution: subtract from top-of-stack HP, carry over, as HoMM3.
- Both heroes' luck = 0 and morale bonus = 0 in PoC, but implement the luck positioning and the morale meter mechanics fully (meters fill/trigger per 03_MECHANICS §morale — extra actions will occur from kills).
- Retaliation: one per defender per round, melee only, before... standard HoMM3: retaliation happens after the attack resolves, once per round per stack. Ranged attacks are not retaliated.
- All attacks and effects, including plain melee, must flow through the resolution pipeline defined in 02_DESIGN_PRINCIPLES.
- End: one side has no stacks → winner takes casualties permanently; loser's hero is removed from the map (neutral guardians: their stack object is removed; mine becomes flaggable/flagged by walking on).
- No fleeing/surrender in PoC. Auto-combat button: both sides played by combat AI, instant resolution, result screen shown.

## 9. AI

Two scripted AIs, both deterministic given the state:

**Combat AI** (also drives auto-combat and neutrals): for each stack: if ranged with shots and no adjacent enemy → shoot the enemy stack with highest (damage output ÷ HP remaining) heuristic value; else move toward nearest enemy by path distance and attack if reachable; else move closer. Defend if no move improves distance.

**Strategy AI** (per turn): priority list — (1) if enemy hero/castle is adjacent-reachable and AI's army power ≥ 1.2× target's, attack; (2) recruit everything affordable at castle if hero is there or passing; (3) build first affordable building in fixed order [Treasury, T2, Walls, T3]; (4) move hero toward the highest-value reachable objective: unclaimed pickup > unguarded mine > guarded mine/chest whose guardian power ≤ 0.8× hero army power > enemy castle. Power = Σ stacksize × unit HP × avg damage. (5) If nothing qualifies, move toward own castle and garrison. Never split armies. Fog does not restrict the AI (AI cheats on vision; log this in DECISIONS.md as accepted).

## 10. UI (Phase 3)

Minimalist SVG. Colored shapes + text labels; **no sprite art**. Readability requirements:

- **Adventure screen:** grid map; terrain as fill colors (grass #7cb342-ish, forest darker w/ tree glyph, mountain grey triangles, water blue). Objects as simple glyphs with tooltips: castles = large squares in player color, heroes = circles with flag, mines = pickaxe/letter glyph colored by resource with owner ring, piles = small diamonds, guardians = red-outlined circle with stack size. Fog = black (unexplored). Click hero → show reachable range shading + click destination → path preview arrow → click again to move. Right panel: selected hero (stats, army list, move points, mana), resources bar (4 resources + income tooltips), day/week counter, End Turn button, Next Hero button.
- **Castle screen:** modal; buildings as labeled boxes (green=built, white=buildable, grey=locked/unaffordable with reason on hover), recruit rows with +/- and max buttons, garrison/visiting army slots with click-to-swap.
- **Combat screen:** hex grid SVG; stacks as circles (player-colored, faction letter, stack count below); active stack highlighted; reachable hexes shaded; hover enemy → damage estimate tooltip ("kills 3–4"); morale meter as small arc around each stack; buttons: Wait, Defend, Auto-resolve. Log pane listing actions ("12 Slingers shoot 5 Berserkers: 38 dmg, 2 die").
- **Dialogs:** level-up draft (3 cards), chest choice, battle result (casualties both sides, XP gained), victory/defeat screen → back to menu.
- Keyboard: Space = end turn, Enter = confirm.

## 11. Milestones and acceptance

1. **M1 — Core:** state model, map load, movement+pathfinding, resources/income, build/recruit, combat engine w/ pipeline, morale meter, luck positioning, victory conditions. ≥40 unit tests incl. replay-based regression tests. `npm test` green.
2. **M2 — Sim:** `npm run sim -- --games 100 --seed 1` completes 100 AI-vs-AI games with zero crashes; prints length distribution, win rates, casualty stats; dumps replay on any failure.
3. **M3 — UI:** full flow playable: menu → hot seat and vs-AI → adventure/castle/combat screens → victory screen. A human can, without reading code: move a hero, take a mine from a guardian, build, recruit, and assault the enemy castle.

Acceptance is M3 plus: sim shows AI-vs-AI games ending (someone wins) within 8 in-game weeks in >90% of runs — tune AI aggression, not game rules, if this fails.
