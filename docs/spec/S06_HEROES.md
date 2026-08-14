# Heroes, Progression, Armies, Items, and Equipment

## Hero model

A hero is an off-battlefield commander with faction, class, level, XP, Attack, Defense, Spell Power,
Knowledge, luck, movement, mana, one specialty, up to six secondary skills, spellbook/upgrades,
seven to nine derived army slots, consumable inventory, equipment, backpack, Debts, per-hero visit state, and serialized
daily/weekly spell-use ledgers. Players retain a parallel ledger for player-wide effects. Every hero
maintains those resources independently.

Every hero also derives exactly one combat Knack from faction and its rank from current level (rank
1 at level 1, rank 2 at level 6, rank 3 at level 12). Neither the Knack nor its rank is duplicated in
persistent hero state. Battle state records only bounded per-round use and shared hero-act credits
needed for deterministic save/replay. Heroless armies have no Knack; a remote Warden receives one
only inside the rank-3 five-tile casting boundary.

Hero primary stats add to every commanded stack. Attack/Defense enter the damage formula in
[`S04_COMBAT.md`](S04_COMBAT.md). Knowledge sets maximum mana to `10×K`; Spell Power follows
[`S05_MAGIC.md`](S05_MAGIC.md), with Attunement rank 3 raising the cap to `12×K`. Every hero starts
with one deterministic tier-1 spell from each faction school. Authored tier-1 spells satisfy their
matching school slot; authored higher-tier identity spells remain as bonus entries and cannot
suppress either required tier-1 school. Starting stats, class draft weights, specialties, authored spells,
and stories are authoritative in
[`../../src/content/heroes/index.ts`](../../src/content/heroes/index.ts) and
[`../../src/content/heroStories.ts`](../../src/content/heroStories.ts).

Specialties are behavioral identities, not ornamental text. Each specialty ID has a generic handler
or catalog hook. A new specialty must cause an observable rules delta and receive a focused test.

## One-screen hero presentation

Hero Details is one dashboard with no tabs or section modes. Its single reading order exposes
portrait/identity, all four primary stats, movement/mana/experience/luck, every current army
position (normally seven, up to nine), all
learned secondary skills, eleven ordinary equipped-artifact positions plus Reliquarian's gated
third Misc position, the complete backpack, every actual
consumable position, specialty, and currently relevant special/status controls. Desktop may compose
those regions into bands and columns; 390 px uses the same DOM order as one vertical flow. The
complete hierarchy, dimensions, interaction behavior, asset disposition, and browser gates are in
[work order 59](../59_HERO_DASHBOARD.md).

Every occupied company, skill, artifact, and consumable and each primary stat/specialty is a
graphical, keyboard-focusable detail target with a visible semantic name/value. Ordinary click,
touch tap, Enter, or Space opens details first; a separate labeled action begins split, equip,
unequip, item use, or another consequential route. Empty states remain compact and do not invent
catalog entries or hidden capacity.

## Leveling and drafts

The next-level XP threshold follows `round(1000 × 1.4^(level−2))`. On leveling, deal three seeded
cards and let the player choose one. The ordinary pool contains the four +1 primary-stat cards, 30
secondary skills, Inscribe from level 4, and the rare Adept/Grimoire cards from level 6. Adept
opens an explicit known-spell choice and permanently reduces its mana cost by two (minimum one).
Grimoire consumes the seeded campaign RNG to deal an unknown guild-eligible spell of tier at most
`ceil(resulting level / 3)` from a school already known; the player cannot name its outcome.
Hagwood’s bargain access may replace one skill card
from level 3. Chronicler, Beggar’s Coin, and other explicit effects change offer size or options.

Offers are class-weighted and sampled without forcing outcomes. A held skill card raises that skill
one rank; a rank-3 skill is no longer eligible. A hero with six distinct skills cannot be offered a
seventh. Inscribe upgrades a known spell. Any skip, reroll, upgrade, or bargain choice is an explicit
action and part of the replay.

## Secondary skills

There are 30 skills, each with three cumulative ranks. Their exact rules, values, class weights, and
flavor are the single-source catalog in
[`../../src/content/skills.ts`](../../src/content/skills.ts). The stable behavioral families are:

- movement/information: Logistics, Scouting, Wayfaring;
- neutral/economic interaction: Diplomacy, Forager, Peddler, Ransomer;
- magic/control: Attunement, Spellthief, Palimpsest, Twicetold, Curse-Eater, Ritualist,
  Evoker, Tallykeeper, and Beguiler;
- drafting/items: Alchemist, Chronicler, Provisioner, Reliquarian, and Loremaster;
- army/defense: Command, Warden, Beastmaster, Vanguard, Siegewright, Tactician, Reaper,
  Quartermaster, and Duelist.

The rules that are easy to lose during a port are:

- Scouting normally replaces guardian bands with exact information only at allowed range; AI may
  read exact core state as a documented strategy advantage.
- Diplomacy affects neutral guardians, never town garrisons. Recruitment requires every stack to
  fit or merge; no partial purchase.
- Forager’s post-occupancy ranks are pile bonus at R1, pickup range 2 at R2, and range 3 plus the
  larger pile bonus at R3.
- Warden is installed when a hero transfers troops into a garrison. Capture clears the installer.
- New offers of Reaper, Beguiler, Duelist, and Quartermaster require hero level 5. A held gated
  skill remains upgrade-eligible below the gate. Chronicler R3, Twicetold R3, Reaper R3,
  Beguiler R3, Duelist R3, and Loremaster R3 count as rare for exposure accounting.
- Every skill declares all six positive class weights. Weights bias each sampled card and never
  force an outcome; the six-distinct-skill cap is unchanged.
- AI is allowed to ignore high-complexity draft cards; that is an AI limitation, not a hidden player
  restriction.

## Derived army capacity

A hero's capacity is `min(9, 7 + quartermaster + artifact bonuses)`. `quartermaster` is one when
Quartermaster is rank 1 or higher and zero otherwise. Each equipped artifact effect tagged
`army_slot_bonus` contributes its positive integer amount; The Long Table contributes one. Higher
Quartermaster ranks do not add further slots. Garrisons, guardians, and every other heroless army
remain fixed at seven.

The army array is synchronized to exactly this derived capacity at rules-owned mutation and setup
boundaries. Capacity itself is not serialized, so canonical saves remain the five-field action-log
payload and replay derives the same array shape from skills and equipped artifacts. Recruitment,
Diplomacy and other joins, splitting, merging, friendly-hero and garrison transfers, authored setup,
battle setup, casualties, results, retreat, and surrender all use the destination hero's current
capacity. AI and UI consume the same army array/selectors and do not own a parallel slot rule.

Adding capacity appends empty positions. Removing or replacing a capacity source is illegal while
any position outside the prospective capacity is occupied; the whole action rejects before moving
an artifact, spending a resource, clearing a choice, or losing a company. The same preflight applies
to forced artifact transfer such as a Duelist trophy. Once every removed tail position is empty, the
array safely shrinks and any out-of-range Tactician designation is cleared.

## Tavern, hiring, defeat, and ransom

Every city starts with a Tavern, Village Hall, and tier-1 dwelling prebuilt. A Tavern deals two
heroes from that city faction’s roster using the game seed and refreshes weekly. An ordinary hire
costs 1500 gold, arrives at the city with the faction’s starter army and full mana, and is limited
by the three-hero-per-player cap.

A defeated or retreated/surrendered hero returns to the Tavern pool immediately and can be re-hired
for 2500 gold with levels, stats, skills, spells, upgrades, specialty, and retained property intact.
Ordinary defeat loses the army and drops carried artifacts to the victor; retreat loses the army but
protects artifacts and blocks defeat-only rewards; surrender keeps the surviving army. The complete
matrix is in [`S04_COMBAT.md`](S04_COMBAT.md).
Ransomer R3 is the explicit exception to immediate availability: its defeated victim cannot be
rehired by anyone until seven full day numbers have elapsed, and then retains the doubled ransom
multiplier.

## Multiple heroes and transfers

The strongest-army AI hero is Main; others are Gatherers. Humans are not assigned roles. Friendly
adjacent heroes, or a visiting hero and city garrison, may exchange stacks, consumables, and legal
artifacts through explicit actions. Transfers conserve counts and instances. Same-unit stacks merge;
otherwise each destination's derived capacity applies, while a garrison remains seven slots.
Gatherers may deliver surplus to Main and avoid threats using
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
The authored catalog contains exactly 50 item definitions: 37 pre-v2 items, the named Spell Tome
kind, and twelve doc-63 consumables. All 50 own distinct native PNGs; the Tome and twelve added
consumables also own accepted docs-60–67 provenance records.

Alchemist rank 1 waives the shared hero act for the first item used each battle. Rank 2 preserves
the first consumed item. Rank 3 lets a target-bearing potion or consumable choose one additional
distinct legal company; if only one legal company exists, the item remains usable on that one.
Global, school, enchantment, and delayed-next-destruction items do not invent a second target.

Any ordinary-pool tier-1–3 combat spell may exist as a one-use scroll. A normal scroll stores the
standard version; a barrow/lock upgraded scroll stores the upgraded version. Scrolls cost no mana or
Knowledge and preserve their stored version despite resonance. Tier-4/5 scrolls are restricted to
authored locks, barrows, and provenance sources. Peddler R2’s stocked scroll is the
explicit exception to “found, not bought.”

Items use instance records rather than bare IDs so stored spell version, X spend, coordinate-based
Trade Goods value, and other state survive transfer/replay. The six former passive trinkets are Misc
artifacts and no longer consume item slots.

## Artifact equipment

Each hero has 11 ordinary slots: Head, Cloak, Amulet, Weapon, Shield, Armor, two Rings, Boots, and two Misc.
Unequipped artifacts occupy an unlimited backpack. Equip and unequip freely only on the adventure
map. A burden cannot be unequipped until its visible removal condition is satisfied (or Reliquarian
rank 3 spends its one game-long waiver). Its complete upside, downside, and removal condition appear
in the confirmation dialog before equip; confirmation is informed consent, not a hidden lock. Defeated heroes
drop all equipment and backpack artifacts, including Tailor’s Kit pieces; the victor receives them
without slot collision.

The dashboard presents those slots as one regular grid of identically sized frames rather than a
helmet/hand/body paper doll. This is presentation only: the cells retain `head`, `cloak`, `amulet`,
`weapon`, `shield`, `armor`, `ring1`, `ring2`, `boots`, `misc1`, and `misc2`; artifact definitions
retain their typed slot; `slotAccepts` and the existing reducer continue to own compatibility and
replacement. Each cell keeps a short visible slot label, and destination review exposes both legal
and illegal reasons. No save migration or general-purpose slot is introduced.

Artifact classes are Vanilla, Charm, Relic, Burden, Kit, and migrated Trinket. The catalog,
descriptions, values, slots, classes, and effect tags live in
[`../../src/content/artifacts.ts`](../../src/content/artifacts.ts). At the doc-65 final gate
there are 138 ordinary discoverable artifacts (36 Vanilla, 44 Charm, 45 Relic, and 13 Burden), plus
four Kit pieces and six migrated trinkets: 148 definitions total. Artifact behavior dispatches by
effect tag; an artifact ID is presentation and inventory identity, never its rules branch.
Twin Coin is a roster effect: its serialized living-hero count modifies every owned hero's four
effective primary stats, including adventure Spell Power and maximum mana, whether or not that hero
holds the Coin. Empty Frame copies generic tags, values, and set membership, while retaining the
Frame's physical slot, class, and removal identity. Consecutive-city Burden progress records the
city ID and counts only days during which the matching contract remains equipped.

The Tailor’s Kit is four visible, uniquely authored pieces. Bonuses count equipped distinct pieces:

- each piece provides its own modest primary-stat bonus;
- 2 pieces: +2 all stats and reveal essence deposits/seams map-wide;
- 3 pieces: all spells use their upgraded rules;
- 4 pieces: all-school resonance and once-per-week Unstitch to any explored legal tile.

The Kit has no inherent victory trigger. Burdens are informed consent: their upside, downside, and
removal condition are inspectable before pickup, and removal fires immediately when its stated
condition/payment is satisfied.

## Hero and catalog counts

The playable roster is six factions × six heroes. Each faction’s six-unit city roster and neutral
creatures are separate from heroes. Counts are validated from data; do not duplicate roster tables
here. Hero story and specialty validation rejects empty or behaviorless entries—the latter includes
the known reconciliation issue tracked in
[`RECONCILIATION_BUGS.md`](RECONCILIATION_BUGS.md).
