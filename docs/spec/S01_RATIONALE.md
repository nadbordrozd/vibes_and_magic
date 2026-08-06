# Rationale and Decision Generators

These are the rules for making rules. Preserve their intent when adding content, reconciling an
edge case, or porting the game.

## Design thesis: leverage through attrition and tempo

Tactical systems should provide modest leverage—roughly “+30, not +300.” The interesting effects
change attrition and tempo: preserving units across a sequence of fights, advancing or delaying an
action, changing a route, making a narrow matchup affordable, or turning a bad draw into a plan.
They must not become exponential permanent power. A tool is successful when it changes the shape
or timing of a decision while the underlying Heroes economy remains legible.

## Fluidity

**Do not add a mechanic an optimizing player would use before every combat.** If an obvious action
would be repeated every time, automate it, make it a genuine map-time commitment measured in days
or movement, or remove it. No pre-battle equipment shuffle, army splitting, deployment ceremony,
or consumable ritual is allowed. Adventure actions and free equipment changes are valid because
they occur away from combat; the battle begins without an extra preparation screen.

## Randomness and anti-planning

Randomness deals options; the player chooses outcomes. Avoid hidden dice after a commitment. Luck
is a deterministic position within a damage range, maps and catalogs use seeded streams, and any
choice produced by randomness becomes an explicit replayable action.

1. There is no deterministic path to a particular uncommon or rare. Guilds deal, shrines offer,
   drafts deal, chests and scrolls expose seeded contents, and locks drop. Commons may remain
   reliable staples.
2. Offers over outcomes, always. A build is shaped around what appeared rather than routed to a
   named build-around.
3. Building a Mage Guild level is a reveal moment, not a shopping list.
4. The major cross-run variance channels are guild deals, level drafts, chest/scroll contents,
   shrine placement, and weekly omens.
5. Provenance rares are the explicit exception: a narrow rare may exist only at a named landmark,
   so discovery and lore delivery are the same event.

## Content filter and volume

Volume comes from behaviorally distinct entries, never numeric filler. Reject “like X, but bigger.”
If two entries would never both matter in the same game, combine or remove one. Every faction needs
a verb the player can observe within two battles; every skill rank must add behavior or a decision,
except where a tempo or economy number is itself the behavior. Unit abilities state the resolution
stage they hook. Upgrade faces change behavior, targeting, topology, or interaction—not merely
numbers unless the number creates a different decision.

During a single playthrough, roughly **30–40% of the total content pool should surface**. Tune
dealing and placement weights toward that exposure budget and measure distinct encountered entries,
not merely acquired entries. A player should still meet unfamiliar content on a fifth run.

## Balance posture

Balance is deferred until content is complete. During content development, simulations establish
that games terminate, do not crash, and retain thesis metrics such as spell decisiveness and lock
resistance. Broad win-rate bands are degeneracy alarms, not parity targets.

The only early balance change permitted is the minimum change that removes a degenerate line: an
infinite loop, a strictly correct opening, a fight-stalling combination, or another strategy that
trivializes decisions. Log the intervention. Do not sand off memorable outliers merely to make
factions numerically equal. Catalog values remain penciled defaults until a dedicated balance pass.

## Target-scaling law

Effects that remove a percentage of HP, disable a target, copy a target, revive a target, or derive
value from a target must scale primarily with the target, not the caster’s permanent stats. Spell
Power may affect duration, counter magnitude, secondary rider, or a constrained modifier; it must
not turn one effect into an unbounded delete button. This keeps utility useful at all army sizes and
prevents spell scaling from becoming the dominant economy.

## Bargain and Debt law

A bargain grants an outsized benefit now in exchange for a Debt. The Debt is a visible spellbook
entry with a stated trigger and cost. It cannot be dispelled, Soured, traded, hidden, waived, or
protected by Wax Seal. A hero may carry at most two active Debts.

Every future Debt must be **concrete, scheduled, and visible**—never a probability, never secret,
never optional after acceptance. A player must be able to plan around it and still feel its bite.
That makes it a bargain rather than a gamble. Non-Hagwood access may state an earlier or harsher
version on the offered card; the altered term is visible before acceptance.

## Assimilation Laws

1. The stitched worlds do not know they were stitched. Cultures explain contradictions as local
   history, theology, weather, craft, or folklore.
2. The mundane reading comes first. A place, creature, or object works as fantasy before its source
   world becomes visible on a second look.
3. Myths contradict. No faction owns the authorial explanation, and the player never receives a
   definitive cosmology.
4. Ration anomalies. Use one or two strange landmarks per region; ubiquity turns wonder into noise.
5. A displaced thing assimilates functionally. People live beside it, name it, use it, and build
   rules around it instead of treating every anomaly as an apocalypse.

The hidden authorial truth is that incompatible worlds were joined by a maker-like act. The game
never states this. Seams, scale errors, impossible materials, and repeated domestic forms are clues,
not exposition.

## Visual identity laws

- Readable silhouette and faction affiliation come before surface detail.
- Use flat, bold, emblematic shapes with restrained texture; do not chase photorealism.
- A faction owns a coherent material language and palette, but each unit also needs a distinct
  silhouette at token size.
- Mundane material is the first read; the impossible origin appears in scale, joinery, repetition,
  shadow, or motion on the second read.
- Human-shaped units are rationed: each faction has at most two. The roster must not become six
  rows of differently dressed people.
- Terrain skins and decorations are presentation-only. A skin cannot imply a mechanic that the
  gameplay terrain does not have.
- Strange props and decoration anomalies obey the same regional ration as setting anomalies.

## Writing register

1. Flavor is at most two sentences, usually one. Hero stories are one paragraph, 50–90 words.
2. Flavor is always in-world and contains no numbers or game terms such as stack, morale, tier, or
   buff. Mechanics appear separately and are generated from data.
3. Apply the Assimilation Laws: mundane first read, contradictory myth, wonder by double-take.
4. The tone is warm, wondrous, and wistful. Dry humor is welcome. Never grimdark and never wink at
   the player.
5. Voice by faction: Hearthguard plain/proud; Wound-Wrights reverent guild-speech that does not see
   its own mistake; Unfinished gentle, present-tense, unresolved; Vespiary formally courteous and
   alien; Hagwood folktale cadence shaped like a bargain; Wildergrass terse and drum-rhythmic.
   School voices are Rite ceremonial, Craft matter-of-fact, Wild weather-worded, Grave quiet.
6. Visitable-object flavor hints truthfully but obliquely at function because mechanics remain
   hidden until discovery.

## Inspection and honest information

Everything visible can be inspected. On desktop, hover gives a name and right-click or Inspect
opens the card; on mobile, tap gives a name and long-press opens the card. A card orders name,
in-world flavor, then generated mechanics. Buildings always reveal function and requirements because
the player is choosing a purchase. A visitable object shows flavor only until that player has
visited any object of its kind, after which its mechanics remain learned. Terrain has only a label
and a phrase of at most five words.
