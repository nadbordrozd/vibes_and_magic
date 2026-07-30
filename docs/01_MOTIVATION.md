# Project Motivation

## What this is

A turn-based strategy game in the lineage of Heroes of Might and Magic 2/3/4. HoMM3 is the explicit baseline: map exploration with heroes, resource gathering, town building, weekly unit growth, stack-based tactical combat on a hex battlefield. Where we don't explicitly deviate, HoMM3's design is the default answer to any question.

The game is a personal project, non-commercial, built for the web so anyone can play it in a browser with zero install. It will be developed almost entirely by AI coding agents, so the codebase is optimized for agent legibility over human convention.

## The design thesis

HoMM3 is extremely well balanced, and that balance has a cost: few decisions are high-leverage. Faction choice, skill picks, build order — none of them matter *that* much. Power grows on a predictable schedule and objectives fall on a predictable schedule. Combat has a common-sense line of play that everyone knows and rarely deviates from.

We keep the scheduled, balanced power curve — it's good. We deviate by adding a modest amount (think +30%, not +300%) of **tactical leverage**: combos, tricks, and build-arounds where the right combination of spells, abilities, positioning, and preparation lets a clever player beat a much stronger force. Reference points from the original games: ranged units + Slow, the Blind spell, Armageddon with a lone black dragon, Town Portal, Diplomacy snowballs, HoMM4's Hypnosis+Martyr trick.

The key structural insight: in all of those examples, leverage lives on the **attrition/tempo axis**, not the power axis. Tricks don't make you stronger — they make wins *cheaper* (fewer casualties) and *faster* (map mobility, tempo). Power stays on schedule for everyone; the skilled player fights the same battles for free and converts the saved army into tempo. This is how "balanced progression" and "high-leverage decisions" coexist.

Second reference genre: Slay the Spire / Magic: The Gathering deckbuilding. Hero progression is a draft (random offers, player picks), so runs have identity and lucky synergies create build-around moments — random *offers*, never random *outcomes*.

## Hard constraints

- **Fluidity.** No mechanic that an optimizing player would fiddle with before every combat. No loadout screens. Anything obviously correct gets automated. Preparation costs are paid in map-days, never in clicks.
- **Determinism.** No dice-roll swing mechanics. Morale and luck exist but are deterministic and manipulable.
- **Simplicity of moment-to-moment play.** Round-based combat (no ATB), hero off the battlefield, no deployment caps, no unit-wound bookkeeping.
- **It must still feel like Heroes.** Weekly growth, town building, secondary skills, exploration loop, hex battlefield, one retaliation per round — unchanged.

## Scope philosophy

The engine (state model, resolution pipeline, data-driven content) carries the ambition; the content (factions, spells, artifacts) is deliberately deferred and will be iterated cheaply on top. Most of the "combo depth" thesis will be delivered later by adding effects that hook the resolution pipeline — the engine must make that easy from day one.
