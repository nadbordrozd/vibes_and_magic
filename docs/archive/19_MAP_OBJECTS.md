# Adventure Map Objects & Week Omens

Everything a hero can ride to. Standard objects (mines, piles, chests, waystations, barrows, school shrines, guardians, locks) are established; this doc adds the creative layer. Assimilation Laws apply: mundane first read, one or two strange landmarks per region.

## Dwellings (recruit on the map)

- **Faction dwellings** (T1–T3 of each faction, weekly growth ~half castle rate, anyone may recruit for gold): Yeoman Crofts, Tin Rows, Candle Chapel, Larval Warren, Crow Gallows, Outrider Camp, etc. — one data entry per unit, names per faction register. These are the cross-faction acquisition workhorses: a Hearthguard player recruiting Crow Chorus is the system working.
- **Neutral-culture dwellings** (rare, 0–2 per map): **The Masque Ring** (Gloaming: recruit Masked Duelists; the only source), **The Kennels of the Old Seal** (Hearth-Hounds), **The Bell-Tower Annex** (Wax Servitors). Units specced when placed.

## Creative locations

1. **The Seam** (terrain feature, not a visitable): a visible scar across tiles where two worlds meet — grass abruptly becoming moss-carpet, wrong-angle shadows. Essence deposits and Seamborn encounters cluster on seams. Teaches the setting wordlessly.
2. **Wandering Tinker's Cart** (moving object!): a neutral cart that travels a seeded route, ~2 tiles/day. Visiting: buy 1 seed-random item (C/U) at 150% value; stock refreshes weekly. The only ambulant shop; catching it is a routing puzzle.
3. **The Unstruck Bell Monastery** (unique, 1 per map max): first visitor per game is taught **Hourglass Crack**. Any visitor may pay 3 essence for a **Timing Blessing**: for 3 days, your stacks +1 speed in round 1 (Vanguard R2, rented).
4. **The Gloaming Ring** (mushroom circle): "leave a gift, take a favor" — deposit one item; next week it is replaced by a seed-random item one tier higher. A lockbox that pays interest in wonder. (Deposit a Relic: it returns unchanged, with a note declining politely.)
5. **Storyteller's Fire**: hear one seeded rumour (a lock's lever hint, a shrine's location, an omen preview) and your army starts its next battle at +10 meter. Usable once per hero per week.
6. **The Chrysalis Pool** (unique): pay gold = 150% of the difference in unit value: convert one T1–T3 stack into the same faction's next-tier unit at half count. Once per week per hero. Mundane read: a hot spring; second read: it's molting you.
7. **The Half-Built Bridge** (Menders' leftovers — too-perfect masonry, unfinished mid-span): pay 10 timber + 5 iron to complete it, permanently opening a crossing through otherwise impassable terrain. Player-built topology; first come, everyone benefits.
8. **Hedge School**: pay 1500g: this hero immediately gets a level-up draft (deal 3, stats and skills only, no XP granted). Once per hero.
9. **The Reliquary Cairn**: sacrifice one artifact → receive a seed-random artifact of the same class. A gamble shrine for dupe vanillas.
10. **Toll Gate** (on chokepoints): pay 500g or fight the Keeper (authored guardian). Payment is per-pass; the AI pays when it can.
11. **Omen Stone**: read next week's omen (Ritualist R2, free, for whoever walks there).
12. **Barrow-Field** (large barrow variant): Grave resonance, a +face scroll, and a Pale-Procession-eligible tile — 200 dead are always enough here.

## Week omens (implementation spec — was penciled in 13)

Seeded per week, announced to all players at week start (banner + log line). Distribution: Quiet Week 45%; each named omen ~9%.

| Omen | Effect all week |
|---|---|
| **Quiet Week** | nothing; the common case |
| **Week of Embers** | all Burn applications +1 |
| **Week of the Veil** | every battle has Grave resonance (stacks with tile resonance) |
| **Week of Plenty** | all growth +25% |
| **Week of Still Air** | ranged stacks +4 shots; no tile resonance anywhere |
| **Week of the Open Road** | all terrain costs 100 for everyone |
| **Week of the Loud Sky** | all battles: both sides +5 meter/round |

Omens are the environmental dealer: narrow spells, Ritualist, Fickle Weather, and the Omen Stone all key off this system. Announce with one flavor line each, per the tone register ("The bells hold their breath. Even the quiet ones.").
