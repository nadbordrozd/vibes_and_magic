# Spell Catalog — Completion to ~70

`09_SPELLS_V1.md` remains authoritative for its 30 (Rite/Craft/Grave 1–10). This doc adds: Wild in full, six new spells per school, and the four provenance rares. Format: name (mana) [rarity C/U/R, type, stage]: base → **+**. SP-scaling defaults per 08. Rarity feeds acquisition weights per 13 — no UI labels.

## Wild — full spec (replaces the pencil list)

1. **Gale** (3) [C, forced movement, apply]: push enemy stack 2 hexes directly away; if it collides with an obstacle/stack it stops and takes 3% current HP. → **+** push 3; collision 6% and Chill 1.
2. **Bloom** (3) [C, apply]: Bloom 3 on target ally. → **+** Bloom 4, and adjacent allies gain Bloom 1.
3. **Overgrow** (4) [C, twister]: per 08. → **+** may exclude one adjacent stack of your choice from the spread.
4. **Thicket** (4) [C, terrain, apply]: 3 chosen hexes become undergrowth for the battle — entering costs +2 movement. → **+** enemies ending their turn in undergrowth gain Chill 1.
5. **Rains** (3) [C, apply]: remove all Burn field-wide; all allies gain Bloom 1. → **+** all enemies gain Chill 1.
6. **Beast Tongue** (5) [U, adventure]: parley with `beast`-type neutral guardians — pay 2× their gold value, they disperse. → **+** or pay 3× to recruit them into free slots.
7. **Stampede Call** (6) [U, build-around, declare]: all allied `beast` stacks immediately move their full speed toward the nearest enemy (free move, no attack). → **+** they also gain +2 speed this round.
8. **Storm** (6) [U, build-around, apply]: every stack on the field takes 6% current HP; `flying` stacks take 12%. → **+** flyers take 18%.
9. **Greenway** (5) [U, topology, adventure]: hero travels through connected forest to any explored forest tile within 15 tiles. → **+** 25 tiles.
10. **Wild Growth** (5) [U, adventure]: target owned dwelling or castle gets +50% growth this week. → **+** +75%.

## Rite — additions (11–16)

11. **Census** (4) [U, adventure]: see exact armies, spells, and items of all enemy heroes for one day. → **+** two days, and see their move points.
12. **Feast Day** (6) [U, adventure]: all your towns +25% growth this week; castable once per week. → **+** also +500 gold per town on cast.
13. **Clarion** (4) [U, turn-advance]: set target ally's meter to 80. → **+** to 100 (immediate extra action).
14. **Vigil of the Host** (5) [U, enchantment]: at each round end, your lowest-meter stack gains +15 meter. → **+** your two lowest.
15. **Oathbind** (5) [R, target-selection]: target enemy stack can receive no effects — friendly or hostile — for 2 rounds. → **+** 3 rounds, and it loses its abilities for the duration.
16. **Wayside Shrine** (5) [R, adventure]: consecrate the hero's tile; the next battle fought on it has Rite resonance. → **+** resonance of any school you choose.

## Craft — additions (11–16)

11. **Salt the Vein** (4) [U, adventure]: target visible enemy mine yields nothing for 5 days. → **+** 8 days, and you see what it produced.
12. **False Colors** (4) [U, adventure]: your hero displays to enemies as a neutral guardian band until an enemy hero is adjacent. → **+** you choose the displayed band size.
13. **Clockwork Courier** (4) [U, adventure]: transfer any items or one stack between two of your heroes anywhere. → **+** also works to/from a garrison.
14. **Brittle** (4) [U, declare]: target enemy stack's abilities are disabled for 2 rounds. → **+** 3 rounds, and it gains Burn 2.
15. **Standing Mirror** (7) [R, apply]: summon a Mirror hex; while it stands (30 HP, attackable), every spell the enemy hero casts is also cast by you, at your SP, same targets. → **+** you choose new targets.
16. **Summon Skiff** (3) [R, adventure]: **dormant until water maps exist; reserve.** Summon a boat to the nearest shore. → **+** steal the nearest enemy boat instead, wherever it is.

## Grave — additions (11–16)

11. **Borrowed Time** (4) [U, adventure]: double your hero's move points today; zero tomorrow. → **+** tomorrow at half instead of zero.
12. **Pale Procession** (5) [U, adventure]: on a tile where 100+ units have died, raise a Candle-Wisp stack (size 5×SP) that serves for 3 days, then departs. → **+** 7 days, size 8×SP.
13. **Silence the Passing** (4) [U, death-triggers]: for 3 rounds, enemy death-trigger abilities do not fire. → **+** and yours fire twice.
14. **The Toll** (5) [U, scaling, apply]: gain mana equal to 2× stacks destroyed this battle so far. → **+** 3×.
15. **Death's Ledger** (6) [R, adventure]: reveal every barrow on the map and the scrolls each holds. → **+** also every guardian's exact size, map-wide, for one day.
16. **Grave-Speech** (5) [R, adventure]: spectate a replay of any battle previously fought on this tile. → **+** and learn one spell that was cast in it (base face).

## Provenance rares (combat; sources per 13 — never in guilds)

- **Hourglass Crack** (6) [R, declare/turn-advance] — *Unstruck Bell monastery only*: target stack (any side) acts twice this round and skips its next round. → **+** your choice of which round it skips.
- **Borrow Shape** (5) [R, declare] — *Gloaming dwellings only*: target allied stack copies all abilities of an adjacent enemy stack for the battle. → **+** any visible enemy stack, adjacency not required.
- **Echo** (4) [R, varies] — *Seamborn only*: recast the last spell cast by anyone this battle, at your SP, targets of your choice. → **+** it resolves as its + face.
- **Loyal Unto Death** (4) [R, death-triggers] — *puzzle-lock drops*: target ally: when destroyed this battle, it immediately deals its full remaining damage output to its killer. → **+** and its death drains no allied meter and grants you 3 mana.

## Catalog totals

16 per school + 4 provenance = **68 spells**: 20 common, 32 uncommon, 16 rare (counting 09's ten per school as ~5C/4U/1R each — tag them in data accordingly: staples C, build-arounds and enchantments U, twisters U, topology R, Reckoning R). Exposure budget check per 13: a guild deals 8, shrines teach 3, scrolls surface ~6, drafts/locks a few — a run should touch ~25 of 68. In range.
