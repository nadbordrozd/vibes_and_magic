# Heroes, Progression, Armies, Items, and Equipment

## Hero model

A hero is an off-battlefield commander with faction, class, level, XP, Attack, Defense, Spell Power,
Knowledge, luck, movement, mana, one specialty, up to six secondary skills, spellbook/upgrades, seven
army slots, consumable inventory, equipment, backpack, Debts, and per-hero visit state. Every hero
maintains those resources independently.

Hero primary stats add to every commanded stack. Attack/Defense enter the damage formula in
[`S04_COMBAT.md`](S04_COMBAT.md). Knowledge sets maximum mana to `10×K`; Spell Power follows
[`S05_MAGIC.md`](S05_MAGIC.md). Starting stats, class draft weights, specialties, starting spells,
and stories are authoritative in
[`../../src/content/heroes/index.ts`](../../src/content/heroes/index.ts) and
[`../../src/content/heroStories.ts`](../../src/content/heroStories.ts).

Specialties are behavioral identities, not ornamental text. Each specialty ID has a generic handler
or catalog hook. A new specialty must cause an observable rules delta and receive a focused test.

## Leveling and drafts

The next-level XP threshold follows `round(1000 × 1.4^(level−2))`. On leveling, deal three seeded
cards and let the player choose one. The ordinary pool contains the four +1 primary-stat cards, 21
secondary skills, and Inscribe from level 4. Hagwood’s bargain access may replace one skill card
from level 3. Chronicler, Beggar’s Coin, and other explicit effects change offer size or options.

Offers are class-weighted and sampled without forcing outcomes. A held skill card raises that skill
one rank; a rank-3 skill is no longer eligible. A hero with six distinct skills cannot be offered a
seventh. Inscribe upgrades a known spell. Any skip, reroll, upgrade, or bargain choice is an explicit
action and part of the replay.

## Secondary skills

There are 21 skills, each with three cumulative ranks. Their exact rules, values, class weights, and
flavor are the single-source catalog in
[`../../src/content/skills.ts`](../../src/content/skills.ts). The stable behavioral families are:

- movement/information: Logistics, Scouting, Wayfaring;
- neutral/economic interaction: Diplomacy, Forager, Peddler, Ransomer;
- magic: Attunement, Spellthief, Palimpsest, Twicetold, Curse-Eater, Ritualist;
- drafting/items: Alchemist, Chronicler, Provisioner;
- army/defense: Command, Warden, Beastmaster, Vanguard, Siegewright.

The rules that are easy to lose during a port are:

- Scouting normally replaces guardian bands with exact information only at allowed range; AI may
  read exact core state as a documented strategy advantage.
- Diplomacy affects neutral guardians, never town garrisons. Recruitment requires every stack to
  fit or merge; no partial purchase.
- Forager’s post-occupancy ranks are pile bonus at R1, pickup range 2 at R2, and range 3 plus the
  larger pile bonus at R3.
- Warden is installed when a hero transfers troops into a garrison. Capture clears the installer.
- Rank gates are self-rarity; no separate skill-rarity UI exists. Chronicler R3 and Twicetold R3
  count as rare for exposure accounting.
- AI is allowed to ignore high-complexity draft cards; that is an AI limitation, not a hidden player
  restriction.

## Tavern, hiring, defeat, and ransom

Every castle starts with a Tavern, Village Hall, and tier-1 dwelling prebuilt. A Tavern deals two
heroes from that castle faction’s roster using the game seed and refreshes weekly. An ordinary hire
costs 1500 gold, arrives at the castle with the faction’s starter army and full mana, and is limited
by the three-hero-per-player cap.

A defeated or retreated/surrendered hero returns to the Tavern pool immediately and can be re-hired
for 2500 gold with levels, stats, skills, spells, upgrades, specialty, and retained property intact.
Ordinary defeat loses the army and drops carried artifacts to the victor; retreat loses the army but
protects artifacts and blocks defeat-only rewards; surrender keeps the surviving army. The complete
matrix is in [`S04_COMBAT.md`](S04_COMBAT.md).

## Multiple heroes and transfers

The strongest-army AI hero is Main; others are Gatherers. Humans are not assigned roles. Friendly
adjacent heroes, or a visiting hero and castle garrison, may exchange stacks, consumables, and legal
artifacts through explicit actions. Transfers conserve counts and instances. Same-unit stacks merge;
otherwise seven-slot capacity applies. Gatherers may deliver surplus to Main and avoid threats using
their documented safety ratio. Main selection, threat checks, Diplomacy, weak-guardian effects,
Beastmaster joining, and army-sized bargains all use the centralized strategic rating in
[`S04_COMBAT.md`](S04_COMBAT.md#strategic-army-strength-rating); consumers do not reproduce a local
stat formula.

On the adventure map, friendly-hero exchange becomes available only after map-driven meeting routing
has left the heroes on distinct adjacent tiles. The current exchange surface submits the canonical
army, split, and consumable transfer actions in either direction; it does not create an artifact action
or mutate hero data directly. See work order 43.

Stack splitting is adventure-only: hero, exchange, or garrison screens provide an exact count slider
and split-evenly. It never appears at battle start or in combat. Splitting does not evade the combat
destruction proportionality rule.

## Consumables and scrolls

Heroes have six base consumable slots, modified by Provisioner. The item catalog is
[`../../src/content/items/index.ts`](../../src/content/items/index.ts). Combat items target through
legal action generation, use the shared hero act, and are consumed unless a rule prevents it.
Adventure items are explicit map actions and ordinarily cost no movement unless the item says so.

Any common or uncommon combat spell may exist as a one-use scroll. A normal scroll stores the base
face; a barrow/lock + scroll stores the + face. Scrolls cost no mana or Knowledge and preserve their
stored face despite resonance. Rare spells are never scrolls. Peddler R2’s stocked scroll is the
explicit exception to “found, not bought.”

Items use instance records rather than bare IDs so stored spell face, X spend, coordinate-based
Trade Goods value, and other state survive transfer/replay. The six former passive trinkets are Misc
artifacts and no longer consume item slots.

## Artifact equipment

Each hero has 11 slots: Head, Cloak, Amulet, Weapon, Shield, Armor, two Rings, Boots, and two Misc.
Unequipped artifacts occupy an unlimited backpack. Equip and unequip freely only on the adventure
map. A burden cannot be unequipped until its visible removal condition is satisfied. Defeated heroes
drop all equipment and backpack artifacts, including Tailor’s Kit pieces; the victor receives them
without slot collision.

Artifact classes are Vanilla, Charm, Relic, Burden, Kit, and migrated Trinket. The catalog,
descriptions, values, slots, classes, and effect tags live in
[`../../src/content/artifacts.ts`](../../src/content/artifacts.ts). There are 80 ordinary discoverable
artifacts plus four Kit pieces and six migrated trinkets, 90 definitions total.

The Tailor’s Kit is four visible, uniquely authored pieces. Bonuses count equipped distinct pieces:

- each piece provides its own modest primary-stat bonus;
- 2 pieces: +2 all stats and reveal essence deposits/seams map-wide;
- 3 pieces: all spells resolve as + faces;
- 4 pieces: all-school resonance and once-per-week Unstitch to any explored legal tile.

The Kit has no inherent victory trigger. Burdens are informed consent: their upside, downside, and
removal condition are inspectable before pickup, and removal fires immediately when its stated
condition/payment is satisfied.

## Hero and catalog counts

The playable roster is six factions × six heroes. Each faction’s six-unit castle roster and neutral
creatures are separate from heroes. Counts are validated from data; do not duplicate roster tables
here. Hero story and specialty validation rejects empty or behaviorless entries—the latter includes
the known reconciliation issue tracked in
[`RECONCILIATION_BUGS.md`](RECONCILIATION_BUGS.md).
