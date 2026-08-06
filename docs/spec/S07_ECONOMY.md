# Economy, Recruitment, Castles, and Difficulty

## Resources

There are exactly four strategic resources:

- **Gold:** recruitment, heroes, most buildings, trades, payments, and ransom.
- **Timber:** general construction and boats.
- **Iron:** high-tier dwellings, fortification, and war-machine construction.
- **Essence:** guilds, inscriptions, shrines, special buildings, bargains, and anomaly content.

Iron is principally army breadth; Essence is principally magic/trick depth. Sources and spends may
cross that boundary only where an authored behavior benefits from it. Numeric defaults live in
[`../../src/content/constants.ts`](../../src/content/constants.ts), building/content costs in their
catalogs, and market rates in
[`../../src/content/marketplace.ts`](../../src/content/marketplace.ts).

## Income and pickups

Owned income sites pay at the documented daily or weekly boundary. Village Hall begins at 500 gold
per day; Town and City Hall add their catalog income. Mines produce their resource daily. Captured
Watermills, Windmills, Trading Camps, and Lighthouses use their registry-defined recurring hooks.

Rich Vein pays on ten daily income dates beginning after capture and does not refresh if recaptured.
Resource piles are one-time pickups modified by Forager. Trade Goods derive a whole-gold value from
their authored pickup coordinate and sale distance. Offers, seeded contents, and temporary stocks
refresh only on their declared day/week boundary.

## Marketplace

Marketplace access requires a visiting hero unless a captured Trading Camp grants remote access.
Rates are deliberately unfavorable and represented as explicit trades. Resource-to-resource exchange
is two trades through gold, not a hidden direct conversion. Peddler and artifacts may improve rates;
Beggar’s Ring worsens all prices against its wearer. Peddler R2 may sell items and artifacts at the
catalog percentages and adds one seeded scroll to weekly stock. Kit pieces cannot be sold.

## Recruitment and growth

Dwellings accumulate weekly growth and do not discard unbought recruits. Castle recruitment pays
the unit’s resource cost and adds to a visiting hero first, otherwise to the garrison. Compatible
stacks merge, and seven-slot capacity is enforced. Neutral/faction map dwellings replenish at their
authored rate and allow cross-faction recruitment; mixed armies retain their combat morale penalty.

Difficulty and Week of Plenty modify growth at the weekly boundary, rounded down. Faction buildings
and artifacts hook the same generic calculation. Dormant buildings produce no growth; a Dormant AI
does not recruit the growth that accumulates. Neutral town garrisons never grow before capture.
Neutral map guardians follow their separate growth rule in [`S03_ADVENTURE.md`](S03_ADVENTURE.md).

## Common castle tree

Every faction has the common categories below. Exact IDs, costs, prerequisites, functions, upgrade
links, categories, and flavor are authoritative in
[`../../src/content/buildings.ts`](../../src/content/buildings.ts).

- Village Hall → Town Hall → City Hall (one upgrade line). Treasury is retired and never stacks.
- Marketplace and prebuilt Tavern.
- Walls → Keep (one upgrade line).
- Mage Guild 1 → 2 → 3 (one upgrade line).
- Six separately slotted, sequential dwellings, each recruiting a different tier.
- Two faction-special buildings.
- Coastal-only Shipyard where the map geometry qualifies.

Each castle begins with Village Hall, Tavern, and tier-1 dwelling. Each castle may build exactly one
stage/building per day. Effects of lower stages persist after upgrade; no refunds and no skipped
stages. A Debt-dormant building remains built but supplies none of its rules until payment wakes it.

## Faction buildings

Every faction has two special buildings that reinforce its verb: Hearthguard morale/growth;
Wound-Wright recovery/consumables; Unfinished recovered losses/death triggers; Vespiary rendering/
tunnel travel; Hagwood bargain access/town relocation; Wildergrass beast growth/loss recovery.
Generic hooks and the building catalog are authoritative. Hen-Legged relocation is a deterministic
week-start choice to a legal explored destination; Deep Tunnels connect owned qualifying castles at
their movement cost.

## Building-card UI contract

The castle build panel is a stable grouped grid: hall line, economy, military line, Mage Guild line,
dwellings 1–6, then faction specials. Upgrade chains occupy one slot that shows the next unbuilt
stage, or the final built stage. Dwellings remain separate slots.

Card faces show only a category glyph and in-world name. Exactly four computed states exist:

| Color | State |
|---|---|
| Gold | built |
| Green | buildable now |
| Red | unavailable now because prerequisites/resources/day build are blocking |
| Grey | unavailable in this castle, including bans or inland Shipyard |

Map data may list `bannedBuildings`; another faction’s special buildings do not appear at all.
Clicking any state opens one shared detail dialog with picture, flavor, generated function, costs,
requirements, exact state reasons, and Build only when green. Missing resources/prerequisites are
individually marked. After a build, all otherwise-green cards become red with “Already built today.”
Rules/state computation remains core-side.

All 36 dwellings use faction-specific in-world names and flavor from the building catalog. “Tier N
Dwelling” is not player-facing text.

## Difficulty

Difficulty is one global game setting recorded in save/replay headers. It has only four authorized
levers:

| | Easy | Normal | Hard | Brutal |
|---|---:|---:|---:|---:|
| Human starting resources | 200% | 100% | 100% | 75% |
| AI income | 75% | 100% | 125% | 150% |
| AI dwelling growth | 75% | 100% | 125% | 150% |
| Guardian size | 75% | 100% | 100% | 125% |

Fractional resource and growth results round down. Difficulty gives the AI no extra vision or rule
exceptions beyond documented strategy-layer knowledge. Values are centralized in
[`../../src/content/constants.ts`](../../src/content/constants.ts).

## AI economy constraints

AI builds and recruits through ordinary legal actions and pays ordinary costs. It may use exact
hidden state for evaluation where already logged, but cannot create resources, bypass prerequisites,
or ignore one-build-per-day. It hires a second hero above the configured gold threshold and a third
above the higher threshold, never exceeding three. Dormant AI is the explicit no-economy exception.
