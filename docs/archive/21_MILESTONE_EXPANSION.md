# Milestone: The Full Game Expansion

Starting point: completed Milestones 10–12 (two factions, magic, heroes, tricks). This milestone lands docs 14–20: all six factions playable, artifacts, the complete spell/skill/consumable catalogs, castle trees, siege-lite, map objects, omens, bargains. It is large — execute in phases, each with its own sim gate, committing per phase. Judgment calls → DECISIONS.md; do not ask.

## Phase A — Engine prerequisites

New machinery several content packs depend on. Build first, content-free, with tests:
1. **Persistent battlefield tiles** (generic system: tile type, duration, on-enter/on-turn-start hooks) — consumers: resin, thicket, undergrowth, walls, Standing Mirror hex.
2. **Artifact slots & equipment** (18): paper-doll state on hero, equip/unequip actions (adventure only), backpack, drop-on-defeat, set detection for the Kit. Migrate the six trinkets from item inventory to Misc artifacts (one-time save-format note).
3. **3-rank skills** (16 supersedes 11 §3): extend rank machinery, add the 13 new skills, enforce 6-skill cap, update draft pool and weights.
4. **Omen system** (19): seeded weekly roll, week-start announcement event, effect hooks (growth, Burn application, resonance, terrain cost, shots, meter).
5. **Debt entries** (20): spellbook-visible scheduled triggers, cap 2, untargetable by all effect-manipulation.

## Phase B — The four new factions

Implement 14 in full: 24 units, 4 faction passives, abilities in the registry with their named stages. Notable engine touches: `render_down` (post-battle economy hook), `blood_price` (meter-rule override per side), `crooked_luck` (luck modifier by opposing faction), `fowl_legs`/`crossing`/`beckoning_song` (non-standard movement), `brood_call` (mid-battle spawn), T6 dwellings for all six factions. Combat AI: teach it the new ability tags generically (value stacks by ability count, use activated abilities when their aiHint fires) — per-ability finesse is not required this milestone; log gaps.
Gate: sim league, all 15 faction pairings × 40 games, zero crashes, every pairing inside 10–90% (degeneracy only).

## Phase C — Spells, skills, consumables complete

Implement 15 (Wild school + 24 additions + 4 provenance rares — provenance sourcing waits for Phase E sites; until then they exist but are unobtainable), 17's full item catalog, guild dealing updated for all six factions' pairs. Bargains (20): the eight cards, dealing rules, draft integration for Hagwood.
Gate: spell-decisive metric re-run; every school ≥ 5% decisive appearance (no dead school); zero crashes.

## Phase D — Castles & sieges

20's common tree (City Hall replaces Treasury — migration), 12 faction specials (Hen-Legged Fence: implement the relocation; if genuinely blocked, ship it as "may not relocate adjacent to enemy heroes" and log), siege-lite (wall hexes, Watchtower, Ram). Castle screen scales to 6 factions.

## Phase E — Maps & map objects

1. New map **"Crosstitch"**: 36×28, four castle slots (any faction mix), two seams crossing at center, full object placement per 19 (one of each unique, dwellings, Kit pieces at four corners' locks).
2. Update **Border Marches**: faction-select compatible (any faction in either slot; guardians stay authored), add 2–3 creative objects, both Kit... no — Border Marches gets no Kit (too small; log).
3. Main menu: map select (2 maps), per-slot faction picker (6 options + random), 2–4 players on Crosstitch, human/AI per slot.
4. Implement 19's objects, including the Tinker's Cart route walker and Gloaming Ring deposit ledger. Wire provenance spell sources (monastery, Masque Ring, Seamborn placeholder: Seamborn guardians on seams teach Echo on defeat — full faction still deferred).

## Phase F — Acceptance

1. Full test suite green; sim league (15 pairings × 40 on Border Marches, plus 100 four-player games on Crosstitch) zero crashes.
2. Exposure audit (13): instrumented sim reports distinct content encountered per game — target 25–40% of each catalog; adjust deal/drop weights only.
3. Spell-decisive ≥ 10% holds; lock-resistance holds; median 1v1 game ≤ 9 weeks, four-player ≤ 12.
4. Human playability: pick any faction, feel its verb within two battles (the faction-differentiation smoke test: auto-battle logs for each faction must show its signature mechanic firing — meter extra actions, spare_parts, death triggers, render_down, Debts taken, blood_price).
5. UI completeness: paper-doll, Debt display with countdowns, omen banner, tile overlays (resin/thicket), set-bonus display for the Kit, faction-colored everything per the visual identity laws (05).

## Explicitly deferred (log, don't build)

Tier 7 units, the Seamborn as a recruitable faction, campaigns/story, map editor, random map generation, full siege systems, multiplayer beyond hot-seat, art beyond SVG tokens, sound.
