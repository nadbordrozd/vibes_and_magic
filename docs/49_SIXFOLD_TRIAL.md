# 49 — The Sixfold Trial advanced-combat showcase

Status: implemented and verified 2026-08-10. This work order adds a normal selectable six-player
scenario and extends the configurable player pipeline from four to six without representing the
extra factions as allied castles owned by one player.

## Authored map and setup authority

The Sixfold Trial is a deterministic 54×42 proving ground with six real player slots. The default
setup assigns Hearthguard, Wound-Wrights, Unfinished, Vespiary, Hagwood, and Wildergrass once each;
all six controller and faction selections travel through `NewGameOptions`, the campaign-setup replay
header, canonical five-field saves and links, state hashing, turn order, outcome accounting, and the
main-menu presentation. Older maps retain their four-key serialized player shape.

`SIXFOLD_PLAYER_SETUP` is executable authority for slot, default faction, castle entrance,
representative hero, level/stat package, and six rank-three secondary skills. Every castle contains
Village/Town/City Hall, Tavern, Marketplace, Walls/Keep, Mage Guild 1–3, all six dwellings, and its
two catalog-owned faction specials. No building is dormant.

Each starting army is a legal seven-slot army containing the six faction units plus one empty slot.
Counts derive as `UNITS[unitId].growth × SIXFOLD_RECRUIT_WEEKS`, with the week constant pinned to
two. Castles do not duplicate those recruits in reserve. Heroes begin at level 8 with +7 to every
primary stat, full mana, full Logistics-adjusted movement, six rank-three skills, and XP exactly one
ordinary 1,000-XP chest below level 9. Known and upgraded spells and castle guild decks derive from
both configured faction schools through `SCHOOL_SPELLS`; this yields all 34 canonical school
members, including provenance spells, rather than a maintained showcase subset.

## Quick-access combat field

Three horizontal and three vertical trunks provide 258 road tiles and multiple exits at every
castle. The field contains 36 reachable chests and 18 ordinary artifact rewards. Every artifact is
behind a separately authored linked guardian; relic-class rewards occupy later masterwork seals.
The 18 static encounters use ability-rich faction and neutral units and cover four executable
army-strength bands: skirmish 100–220, field 240–440, elite 500–800, and ordeal 850–1,300, with at
least four encounters in each. Six independently owned developed castles and full heroes provide
immediate hero-versus-hero and Walls/Keep siege opportunities.

## Acceptance

`lintSixfoldTrial` and general map lint pin dimensions, six starts, exits, object bounds,
footprints, non-overlap, reachability, guard links/efficacy, 36 chests, 18 ordinary artifacts,
18 guardians, four populated strength bands, and determinism. Focused tests derive castle
completeness, two-week armies, 34-school spellbooks, hero progression, controller/faction slots, a
real guardian entry, spell and ability actions, hero battle and full Keep siege, five-field
save/replay/hash parity, and compressed-link parity.

The dedicated browser review writes `.pixel-work/review/sixfold-trial/audit.json` and eleven original
captures covering the full 1728×1344 native map, developed castle, full army/skills, complete
spellbook, advanced neutral combat, spell/ability UI, developed-castle siege, and full-army hero
duel at desktop plus relevant 390×844 layouts. It rejects stale overlays, browser errors, page
overflow, missing spell/skill counts, and an absent campaign selector.

Reproduce with Vite running on the selected port:

```sh
npm run dev -- --host 127.0.0.1 --port 5190
BM_URL=http://127.0.0.1:5190/ npm run review:sixfold-trial
```

Required gates are map lint, focused setup/persistence/replay/combat/spell tests, TypeScript/build,
browser smoke, the Sixfold review, relevant UX/walkthrough reviews, full suite, and diff check.
