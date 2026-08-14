# Economy, Recruitment, Cities, and Difficulty

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

Hero-dashboard references to costs, Debt payments, or resource-affecting artifacts reuse the four
manifest-backed Gold, Timber, Iron, and Essence pickup images through the shared semantic resource
renderer. The bitmap never owns the resource ID or amount, and opening/selecting a hero detail never
spends or grants resources. Player totals and explicit economy actions remain authoritative. See
[work order 59](../59_HERO_DASHBOARD.md).

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

Dwellings accumulate weekly growth and do not discard unbought recruits. City recruitment pays
the unit’s resource cost and adds to a visiting hero first, otherwise to the garrison. Compatible
stacks merge, and the destination's capacity is enforced: a visiting hero uses the derived S06
seven-to-nine limit and a garrison remains fixed at seven. Neutral/faction map dwellings replenish at their
authored rate and allow cross-faction recruitment; mixed armies retain their combat morale penalty.

The thirteen docs 63–64 field dwellings are named per creature, use that creature's authored growth
and full resource cost, and expose complete culture, footprint, casting, resistance, pattern, and
drawback inspection before payment. Beastmaster's discount applies only to rows printing `beast`.

Difficulty and Week of Plenty modify growth at the weekly boundary, rounded down. Faction buildings
and artifacts hook the same generic calculation. Dormant buildings produce no growth; a Dormant AI
does not recruit the growth that accumulates. Neutral city garrisons never grow before capture. An
omitted neutral-city garrison is initialized once from three weeks of base tier-1 through tier-3
faction growth as specified in [`S03_ADVENTURE.md`](S03_ADVENTURE.md#city-ownership-and-neutral-cities);
it is not recruit-pool growth and receives none of these modifiers.
Neutral map guardians follow their separate growth rule in [`S03_ADVENTURE.md`](S03_ADVENTURE.md).

## Common city tree

Every faction has the common categories below. Exact IDs, costs, prerequisites, functions, upgrade
links, categories, and flavor are authoritative in
[`../../src/content/buildings.ts`](../../src/content/buildings.ts).

- Village Hall → Town Hall → City Hall (one upgrade line). Treasury is retired and never stacks.
- Marketplace and prebuilt Tavern.
- Walls → Keep (one upgrade line).
- Mage Guild 1 → 2 → 3 → 4 → 5 (one upgrade line). Levels 4 and 5 cost respectively
  4,500 gold/4 iron/9 essence and 8,000 gold/8 iron/16 essence; level 4 also requires Town Hall,
  and level 5 also requires City Hall. Their cumulative reveals are 4/7/10/12/14 spells.
- Six separately slotted, sequential dwellings, each recruiting a different tier.
- Two faction-special buildings.
- Coastal-only Shipyard where the map geometry qualifies.

Each city begins with Village Hall, Tavern, and tier-1 dwelling. Each city may build exactly one
stage/building per day. Effects of lower stages persist after upgrade; no refunds and no skipped
stages. A Debt-dormant building remains built but supplies none of its rules until payment wakes it.

## Faction buildings

Every faction has two special buildings that reinforce its verb: Hearthguard morale/growth;
Wound-Wright recovery/consumables; Unfinished recovered losses/death triggers; Vespiary rendering/
tunnel travel; Hagwood bargain access/town relocation; Wildergrass beast growth/loss recovery.
Generic hooks and the building catalog are authoritative. Hen-Legged relocation is a deterministic
week-start choice to a legal explored destination; Deep Tunnels connect owned qualifying cities at
their movement cost.

## Building-card UI contract

The city build panel is a stable grouped grid: hall line, economy, military line, Mage Guild line,
dwellings 1–6, then faction specials. Upgrade chains occupy one slot that shows the next unbuilt
stage, or the final built stage. Dwellings remain separate slots.

Card faces show only a category glyph and in-world name. Exactly four computed states exist:

| Color | State |
|---|---|
| Gold | built |
| Green | buildable now |
| Red | unavailable now because prerequisites/resources/day build are blocking |
| Grey | unavailable in this city, including bans or inland Shipyard |

Map data may list `bannedBuildings`; another faction’s special buildings do not appear at all.
Clicking any state opens one shared detail dialog with picture, flavor, generated function, costs,
requirements, exact state reasons, and Build only when green. Missing resources/prerequisites are
individually marked. After a build, all otherwise-green cards become red with “Already built today.”
Rules/state computation remains core-side.

All 36 dwellings use faction-specific in-world names and flavor from the building catalog. “Tier N
Dwelling” is not player-facing text.

City recruitment and Mage Guild presentation use the shared spell-glossary contract for reusable
terms such as Growth and for every structured Standard/Upgraded spell rule. This semantic help is a
presentation projection only: canonical growth, recruitment, inscription costs, and building state
remain owned by the catalogs and core rules above. See
[work order 57](../57_INTERACTIVE_SPELL_GLOSSARY.md).

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

## Artifact economy exceptions

Direct Marketplace exchange is a serialized 2:1 resource action. Founder permits one second build
on week day 1; Borrowed Purse exposes a player-wide -2000 gold floor at every affordability/payment
boundary and charges 25% on negative gold at week start before new income. Tithe accumulates gross
gold paid by the actual payer, floors the aggregate once, and never infers spend from net action deltas. Growing
Ledger stores one tier on its instance. Lost-mine production redirects for three days, and Tallystick
uses a stable resource-ID tie break. Open Purse doubles scheduled daily city, mine/retained-mine,
mill, and artifact income, but not one-off grants, Tally balancing, or Tithe refunds, and blocks building on odd days;
its 10,000-gold Marketplace removal is an informed explicit action keyed by removal trigger.
