# Milestone: Real Factions + Magic

Starting point: the implemented PoC (placeholder Crimson/Azure factions, working engine, sim harness, SVG UI). This milestone lands `06_FACTIONS_HEARTHGUARD_WOUNDWRIGHTS.md`, `08_SPELL_SYSTEM.md`, and the Rite/Craft/Grave spells from `09_SPELLS_V1.md`. Judgment calls go in `docs/DECISIONS.md`; do not ask.

## Build order (strict)

**Step 1 — Faction swap.** Implement 06 exactly: replace Crimson/Azure content files with Hearthguard/Wound-Wrights, add their abilities to the registry, update map guardians/starting armies, add faction buildings, extend combat AI per 06 §4, add tests per 06 §5. Sim gate before proceeding: 200 games, zero crashes, win rate 35–65%.

**Step 2 — Spell engine (headless).** Counters (with pip data on stack state), enchantment slots, casting flow (once/round at allied-stack-turn-start), SP scaling defaults, upgrade flags per hero-spell, terrain resonance, twister targeting, precedence rule from 08 (with the mandated Blessing-vs-soft_body test). All in `core/`, driven by spell data files in `content/spells/`, zero UI.

**Step 3 — Spell content.** All non-penciled Rite/Craft/Grave spells from 09 (27 spells: 24 base + behaviors of their + faces; skip Beacon/Gate/Cold Road). Each spell: unit test of base face, unit test of + face. Interaction tests (minimum): Amplify on a Hex pile; Sour on Bloom; Sour destroying Forgefire (+face: Hex 3 all enemies); Reflect copying Mourner's Veil; Forgefire doubling Burn tick damage; Overgrow is out of scope; Wall of the Maker hexes block pathing; Clockwork Escort summons vanish post-battle; Reckoning cap; Remembrance cannot exceed battle losses.
**Wound-Wright interaction ruling:** `spare_parts` recovery counts units dead at battle end — units revived by Remembrance during battle are not "losses". Summoned stacks never persist and never recover. Test both.

**Step 4 — Acquisition layer.** Mage Guild building (3 levels, costs per 08) in both castles; guild spell-dealing from the game seed with 07's weights (Hearthguard guild deals Rite/Craft-heavy; Wound-Wrights deals Craft/Grave-heavy); hero learns guild spells on visit. Map additions to Border Marches: 3 shrines (Rite / Craft / Grave), placed off the main west-east axis, each guarded (reuse tier-3 guardian stacks, mirrored fairness); 4 barrow tiles (Grave resonance) scattered; forest already exists (no Wild spells yet — resonance field still implemented); castle tiles = Rite resonance, mine tiles = Craft. Shrine behavior per 08 (teach designated staple: Rite→Rally, Craft→Forge-Spark, Grave→Wither; then one-time upgrade choice). Guild inscription (4 essence). "Inscribe" draft option in the level-up pool, level 4+, weight 10 for both classes.
Starting spells: each hero starts knowing their shrine-staple of their primary school (Hearthguard: Rally; Wound-Wrights: Wither) so magic exists before guilds are built.

**Step 5 — UI.** Spellbook button during combat (enabled when casting is legal; disabled state shows why); spell cards show mana, base/+ face (owned face highlighted), current SP-scaled numbers; targeting mode with legal-target highlighting (twisters highlight effects/piles, not just stacks); counter pips (4 colors, count) on stack tokens; enchantment row (2 slots/side) across the top with tooltips; resonance banner at battle start; battle log lines for casts, counter ticks, enchantment triggers; shrine dialog; guild screen (spells known/learnable, inscription button); mana shown on hero panel (already exists) now decremented.

**Step 6 — AI casting.** Implement the `aiHints` evaluator from 09. Strategy AI addition: builds Mage Guild L1 after Treasury in its build order; routes to its own shrine if guardian power ≤ 0.8× army power.

**Step 7 — Sim upgrade.** Add `--no-magic` flag (heroes never cast). Acceptance run compares matched seeds with and without magic and reports: % of battles whose winner flips ("spell-decisive rate"), average casualty delta, win rates.

## Acceptance

1. All tests green; 500-game sim, zero crashes.
2. Faction win rate 35–65% with magic on.
3. **Spell-decisive rate ≥ 10%** of battles on matched seeds (this is the combo-thesis metric — if under 10%, raise counter magnitudes and enchantment numbers, log changes, rerun; do not touch unit stats to fix this).
4. Median battle length ≤ 12 rounds (magic must not stall fights; if exceeded, first suspect Ward/Sanctuary/Mourner's Veil stacking).
5. Playable end-to-end by a human: learn spells from guild, visit a shrine, upgrade a spell, win a battle that the auto-resolve (no-magic AI) projection loses. The battle-result screen should show the auto-resolve projection alongside the actual result so this moment is visible.
