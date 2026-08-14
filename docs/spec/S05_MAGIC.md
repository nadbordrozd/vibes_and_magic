# Magic, Effects, Bargains, and Debts

## Schools and faction pairs

There are exactly four schools: Rite, Craft, Grave, and Wild. Every playable faction owns one unique
unordered pair, covering all six combinations:

| Faction | Pair |
|---|---|
| Hearthguard | Rite + Craft |
| Wound-Wrights | Craft + Grave |
| The Unfinished | Rite + Grave |
| The Vespiary | Craft + Wild |
| The Hagwood | Wild + Grave |
| Wildergrass Clans | Rite + Wild |

Rite and Grave are thematic opposites; Craft and Wild are thematic opposites. Opposition guides
acquisition weighting and voice, not a universal damage-resistance rule. Faction abilities are not
spells and do not consume spellbook or casting resources.

## Mana and casting

Maximum mana is `10 × effective Knowledge`, raised to `12 × effective Knowledge` by Attunement rank
3. Field regeneration is +2 per day plus explicit modifiers; entering a friendly town restores the
pool fully. A neutral army has no hero and never casts.

In combat, a hero may cast once per round at the start of any allied stack’s turn, before that stack
acts. Casting does not consume the stack action, but does consume the hero act shared with item use
and the faction Knack. Skills and artifacts may explicitly waive or add a bounded hero act. Targets
and spend are explicit actions.

A faction Knack is not a spell. It costs no mana, never scales with Spell Power, and cannot be
Echoed, copied by Standing Mirror or Mirror Hall, reflected by Mirrorshard Pendant, stopped by
Sanctuary, or upgraded by resonance. Ordinary source hooks named by its actual operation still
apply: Ill-Wish is a raw counter application, and Blood Drum is a cause-aware sacrifice. The Rusted
Tongue's `knack_block` is the only printed Knack disable.

Sundered Hourglass and Twicetold R3 expose their current bounded credits through the shared hero-act
ledger, so either may pay for a Knack. Pocket Sundial remains the precise doc-60 pre-first-stack
spell cast which replaces that round's normal cast; it does not create a prebattle Knack phase. The
Long Oath's bounded second-act credit uses this same ledger and may pay for a Knack rather than
remaining spell-only.

Unless a spell says otherwise, values printed for SP 0 scale as follows, rounded down:

- duration: +1 round per 6 Spell Power;
- fresh spell-created counter magnitude: +1 per 5 Spell Power by default; a catalog entry must opt
  out explicitly when its printed counter amount is fixed. Copying, spreading, converting, or
  detonating an existing pile preserves/consumes that resolved magnitude and never scales it again;
- percentage-of-HP effect: +1 percentage point per 2 Spell Power.

The target-scaling law in [`S01_RATIONALE.md`](S01_RATIONALE.md) governs exceptions. X-cost spells
spend all remaining mana and record the amount spent. Scaling spells expose their battle statistic
in the tooltip. Topology and adventure spells still use explicit actions.

## Four counters, exactly

Counters are visible pips on a stack, capped at 9. They persist within a battle and never between
battles. Every counter type on a stack decreases by 1 at that stack’s turn end, subject to explicit
skill modifiers.

| Counter | School | Rule |
|---|---|---|
| Burn | Craft | At turn start, take `N%` of current total HP, minimum `N` HP. |
| Chill | Grave | Passive speed `−N`, minimum speed 1. |
| Hex | Grave | Passive damage taken `+5%` per point. |
| Bloom | Wild | At turn start, heal `N%` of max HP; never resurrect dead units. |

No fifth generic counter may be added. A distinct persistent behavior uses a timed effect,
enchantment, tile, Debt, or specific stack field instead.

## Battle enchantments

### Creature spell support

A creature `caster` is a company-owned real spell source. Its cast spends the company's action and
one repertoire charge, never the commanding hero act or mana. Fixed cast power excludes commanding
hero Spell Power, skills, specialties, artifacts, and personal all-upgraded rules. Side/battle
resonance still applies: declared and midbattle resonance, omen and tile resonance, and terrain
resonance subject to Seam-Ripper ownership. It works without a commanding hero and participates in
Sanctuary, Spellbound targeting, Curse-Eater, spell statistics, Standing Mirror, and Mirrorshard copying.
Copied creature casts retain creature-source provenance. Hedge Caster remains the generic
one-spell, one-charge case; doc 64 supersedes Bone Choir's transitional case with Wither and
Grave-Chill, two company charges, and fixed Spell Power 3.

Resistance is printed, rationed creature metadata, never a universal statistic. Low Magic
Immunity blocks tiers 1–2; school resistance blocks only single-target spells of its school;
counter immunities prevent and clear the named counter; wards spend deterministic charges; and
Spellbound blocks friendly and hostile selection while untargeted mass effects remain counterplay.
A resistance-blocked spell still spends its committed cast. Spell Deflect pauses a paid cast for
a serialized defender-owned redirect choice and resumes without a second act or charge.

Spell Battery reduces fixed hero spell costs once per living company, minimum one; distinct split
stacks therefore each contribute. Mana Leech transfers one mana only after actual enemy HP damage,
once per round, and creates none when the enemy hero has zero. Spell Shrug halves impact-spell
damage. Spellbound blocks selection as a friendly or hostile spell target and Borrow Shape source,
but untargeted mass effects still apply. Ward Bearer validates the original hostile single-target
spell first, then selects the stable first generically legal adjacent bearer (also respecting
Puppet Strings' HP gate) and consumes one use only after successful resolution. Any later
spell-specific failure consumes no bearer use.

Echoing applies once to every explicitly selected allied company target of a spell cast by that
side's hero, including a hero-used scroll: +1 to a newly increased counter pile (respecting its cap)
and +1 round to a newly created timed effect. Mass and incidental secondary recipients, hostile
targets, creature casts, Echo/counterfeit copies, and mirror/reflection casts do not qualify.

Each side has exactly two visible enchantment slots. The Tuning Peg is the printed exception: its
owner has three, and that owner's enchantments resist Sour and Standard Unmake while Upgraded
Unmake remains an answer. An enchantment persists for the battle and is a
targetable object. Casting a third requires choosing one of the caster’s existing enchantments to
replace. Sour, Amplify, Reflect, and Unmake may target valid friendly or hostile enchantments.
Persistent physical pseudo-stacks/tiles such as Standing Mirror and Wall+ do not consume these slots.

## Twisters

Each school owns one effect-targeting-effect verb:

- **Amplify / Rite:** double a counter pile (cap 9), enchantment numbers, or timed magnitude; its
  upgrade also extends applicable duration/decay.
- **Reflect / Craft:** copy a valid active effect to another legal target; its upgrade copies to two.
- **Sour / Grave:** Bloom becomes equal Hex; a beneficial timed effect is removed and leaves Hex 2;
  an enemy enchantment is destroyed. The upgrade adds its catalog rider.
- **Overgrow / Wild:** spread an effect at its current magnitude to every adjacent stack, friend or
  foe; its upgrade may exclude one adjacent stack.

Twisters operate through target-selection and effect-operation registries rather than spell-specific
UI assumptions.

Counter conversion and detonation operate on already-resolved piles. They preserve or consume the
stored magnitude without Spell Power scaling, application bonuses, application twisters, or creature
application hooks. Detonation clears the pile before its immediate effect is computed.

## Standard and upgraded spells

Every spell has one standard version and one upgraded version. The design law is that an upgrade
changes behavior through targets, riders, triggers, topology, or interaction; permanent per-hero
upgrades record which spell upgrade is known. Presentation states implemented behavior rather than
inventing a missing rider. The doc-61 retunes close the former equality set: Standing Mirror,
Shed Skin, Hedgerow March, Standard of Dawn, and Unmake all have distinct executable Upgraded
behavior. Temporary resonance causes eligible spells to use their upgraded rules without
changing learned state. Internal `base`, `plus`, and `upgradedSpells` identifiers may remain stable
serialization names, but player-facing copy always says Standard, Upgraded, or Upgraded here and
never describes spell versions as faces. See [work order 51](../51_CITY_SPELLBOOK_SPRITES.md) and
[work order 55](../55_RITE_CRAFT_SPELL_RULES.md), and
[work order 56](../56_GRAVE_WILD_SPELL_RULES.md).

Upgrade channels are:

1. school shrines teach their staple when unknown and offer an upgrade to a known school spell;
2. guild inscription at a friendly guild costs 4 essence;
3. the rare Inscribe level card appears from level 4;
4. terrain/site resonance upgrades that school for both sides during that battle;
5. explicit specialties, skills, artifacts, stored scroll versions, or the complete Tailor’s Kit.

A stored standard scroll stays standard even on resonant terrain; an authored upgraded scroll stays
upgraded. Bottled Echo repeats the recorded version and X spend while recalculating scaling from its
user’s SP.

## Resonance

A battle can be resonant in zero or more schools. Deepwood supplies Wild, Barrowfield Grave,
Lacquer Flats Craft, and cities/consecration Rite. A Seam supplies all four. Point barrows and mines
may retain authored Grave/Craft resonance on another terrain. Still Air suppresses tile resonance;
the Veil supplies Grave globally.

Resonance applies equally to both sides unless an explicit artifact changes ownership. Seamstone
replaces tile choice with its equipped school. The complete Tailor’s Kit supplies all schools.
Resolver ownership rules remain explicit when effects collide.

Artifact spell exceptions use the same rules on both battle sides. Spare Tongue snapshots nearby
owned spell loans at battle creation and applies half Spell Power to a borrowed cast. Pauper's
Grimoire permits only tier-1/2 spells and sets their mana cost to zero in both combat and adventure
casting. Wax-Sealed Envelope derives its legal prebattle cast from the battle seed and recomputes
living order after that cast before the first company turn.

## Spell acquisition

Mage Guilds have five sequential levels. A complete guild deals 4/3/3/2/2 new spells at levels
1–5. Each slot independently selects tier N 70% of the time and tier N−1 30% of the time (level 1
is tier 1); levels 4 and 5 guarantee at least one own-tier spell. The dedicated setup stream retains
the established approximately 80/20 weighting between the city faction's pair and other schools.
A visiting friendly hero learns every revealed spell. The complete catalog has 31 spells in each
school, with an 8/8/7/5/3 tier distribution. Fly remains an ordinary guild-eligible tier-5 entry,
so deterministic deals can build through level 5 while retaining each level's own-tier guarantee.
Costs, deal
sizes, spell IDs, source exclusions, and AI hints live in
[`../../src/content/spells/index.ts`](../../src/content/spells/index.ts) and
[`../../src/content/spells/expansion.ts`](../../src/content/spells/expansion.ts).

Common staples can be reliable. Uncommon and rare acquisition obeys offer-shaped anti-planning.
Provenance spells never appear in guilds and come only from their named sites. Summon Skiff is live
only on maps where a shore/boat target exists.

Ordinary school shrines teach tier-1 or tier-2 spells. Ordinary scrolls draw combat spells from
tiers 1–3; higher-tier scrolls require authored lock, barrow, or provenance sources. Palimpsest draws
within the host Mage Guild's revealed range, while a shrine-hosted rank-3 draw is limited to that
school's ordinary tier-1/2 pool.

Spell Tomes are setup-seeded named permanent-learning pickups. Generic Tome pools exclude
provenance-only spells and Summon Skiff. Chest and Reliquary Cairn Tomes are capped at tier 3;
tier-4/5 generic Tomes require a puzzle lock or barrow source. The Reliquary of Pages is a distinct
globally claimed site whose stored Tome is exactly tier 4. These caps are validated both when a
Tome is authored or seeded and when it is claimed. The Cairn Tome is a globally single-claim
pickup, independent of the Cairn's repeatable artifact exchange.

The Stacks costs 3 essence once per hero, deals three unknown guild-eligible spells no higher than
the player's best owned Mage Guild, and requires one explicit follow-up choice. Wild Shrine teaches
one hidden setup-seeded unknown ordinary spell once per hero, weighted toward higher tiers. Neither
site exposes a future outcome before its action. Both and the guarded Reliquary of Pages are
registered map-object handlers rather than spell-ID branches.

The doc-63 combat consumables use the shared hero-act, target-draft, replay, and battle-persistence
boundaries. Vial of Borrowed Hours reserves an immediate company action against the shared maximum
of two granted actions per company per round. Counterfeit Coin reads the enemy side's last explicit
hero-cast action, preserves that cast's Standard/Upgraded face, spends no mana, and resolves with the
Coin user's Spell Power; it cannot copy Echo and cannot forge a branch, target, or placement not
legal for the recorded face. Grave-Dust Sachet claims the next destruction event on either side and
returns an ordinary, non-summoned/non-cloned company on the user's side at ceil(25% of starting
count). Tuning Fork is a battle-local school upgrade. Sealing Wax uses the shared protected-
enchantment ledger. Wildfire and Iron Filings apply fixed printed counter quantities (ordinary caps
and immunities still apply), Loose Thread uses footprint-safe empty-hex teleport, and Ledger Page
clamps three mana per settled company destruction to maximum mana.

## Adventure magic

Adventure spells are explicit map actions. The standard cost is printed mana plus 300 movement;
Provisioner rank 2 reduces only the movement surcharge by 150. They compete with battle mana and
route tempo and therefore are not free daily rituals. Once-per-day/week restrictions, visible target
requirements, created topology, delayed costs, and destination legality are serialized in state.
Day/week use ledgers exist independently on heroes and players. Beacon and Summon Skiff debit the
casting hero's daily ledger; Fickle Weather debits the owning player's weekly ledger, so changing
heroes cannot bypass it. Every shipped tier-4/5 adventure or topology spell must declare a gate.
Successful resolution records the gate; failed targeting never consumes it.

The adventure effect registry implements seven JSON-safe primitives at `adventure-apply`:
radius-limited explored-tile hero teleport; fixed-cost same-day terrain/domain traversal; remote
owned-hero mana restoration; explored enemy-mine production redirection; named enemy-hero movement
and optional mana-regeneration denial; future-battle condition attachment; and radius guardian
count/ability intelligence. Wellspring uses remote owned-hero mana restoration and Dimension Door
uses explored radius-limited teleport; their failed primitive requests do not spend mana, movement,
or their daily gate. Upgraded Dimension Door permits exactly two uses per hero per day through a
serialized count ledger. Every target, owner, range, occupancy, and destination failure returns a
stable reason code and player-facing sentence. Death's Ledger's Upgraded guardian-count rule uses
the guardian-intel primitive.

Permanent or temporary map changes—Gate pairs, thickets, consecrated sites, bridge completion,
boat placement—must be explicit data. A future renderer cannot infer them from logs or flavor.

## Bargains and Debts

Bargains are offer cards whose immediate benefit and exact Debt are both visible before acceptance.
The current eight definitions live in
[`../../src/content/bargains.ts`](../../src/content/bargains.ts). Hagwood heroes can receive one in
level drafts from level 3 by replacing one skill card; others encounter them at a Bargain Post or
rare Crone site. A hero at the two-Debt cap receives no offer.

Debts are spellbook-visible scheduled state. They cannot be targeted, dispelled, Soured, traded,
sealed, or voluntarily waived. Scheduled obligations fire deterministically. An unpaid What Was
Promised installment keeps the named building dormant until a later payment; dormancy suppresses
income, growth, services, travel, defense, and faction hooks.

The binding future-content law is repeated because it is an acceptance spot-check: every Debt is
**concrete, scheduled, and visible—never random, hidden, or waivable.** Altered non-Hagwood or hero-
specialty terms must be printed on the offered card.

## Catalog boundary

The catalog supplies spell names, school, mana, kind, rarity, standard/upgraded text, AI hints, effect operation,
and provenance eligibility. Rules code supplies generic operation handlers. See
[`S09_CONTENT_INDEX.md`](S09_CONTENT_INDEX.md) for validation invariants and data ownership.

Combat spell mechanics may compose only the registered primitives and shared target/routing helpers
listed in S04. Illegal control, link, copy, counter, resurrection, hazard, movement, resource, and
action requests return their stable reason code plus player-readable text; callers must display that
text rather than silently clamping an attempted action. Mass modes and all-spell immunity share one
target enumerator so single and mass casts do not disagree about ownership or immunity.

All four schools author their Standard and Upgraded rules once as structured presentations in
[`../../src/content/spells/rulePresentation.ts`](../../src/content/spells/rulePresentation.ts).
Stable lexicon references remain available to semantic presentation, while existing catalog
`base`/`plus` strings are exact deterministic plain-text projections. The all-124 presentation map
is complete and typed. Rite/Craft supplies 62 records, including every doc-61 addition and retune.

Reusable player mechanics are defined once in
[`../../src/content/spellLexicon.ts`](../../src/content/spellLexicon.ts). Stable term IDs, names,
plain-English rules, aliases/tokens, and literal future-art subjects belong to that content layer;
the all-spell coverage table maps every catalog entry to its real resolver branch and either a
lexicon term or an explicit ordinary-language disposition. Structured rule tokens may reference a
term ID without copying its definition. The lexicon is explanatory and cannot override a resolver,
create an effect, or infer mechanics from presentation. See [work order 53](../53_SPELL_EFFECT_LEXICON.md).

Player-facing semantic references use the shared contract in
[`../../src/ui/components/SpellGlossary.tsx`](../../src/ui/components/SpellGlossary.tsx). The
Spellbook renders its complete Standard and Upgraded token sequences directly; every term reference
shows the term's distinct native icon, name, and authoritative lexicon rule without changing casting
or targeting. Unstructured catalog copy is recognized deterministically by longest alias at a word
boundary. See [work order 57](../57_INTERACTIVE_SPELL_GLOSSARY.md).

## Rite/Craft P1 spell behavior

The binding doc-61 P1 batch is 24 rows: eighteen new spells and the Blessing, Census, Standard of
Dawn, Trial, Forge-Spark, and Unmake retunes. Kindle and Rivet are the current Rite/Craft cantrips.
Fixed, capped, and open scaling, target mode, tier, guild/scroll eligibility, AI hints, time gates,
structured Standard/Upgraded rules, flavor, and semantic art requirements live with the catalog.

Combat resolution composes the registered impact, resurrection, action, resonance, ammunition,
counter-detonation, clone, teleport, stun, mass-target, and shared damage-routing operations. Hold
the Line's first lethal allied hit each round leaves one unit at 1 HP and its upgrade applies base
Bloom 3 through the universal spell-counter scaling and application hooks.
Standard of Dawn's upgraded first allied kill each round grants its killer +2 speed and one extra
action. Rivet keeps its Defense duration separate from its single doubled-retaliation rider and its
upgraded additional-retaliation allowance; Whetstone likewise keeps its two-round Attack bonus after
its upgraded first-attack retaliation suppression is consumed. A standard clone excludes counters
and timed effects as well as active temporary/copied abilities, while an upgraded clone inherits
all three families consistently. Second Wind may select a fully fallen original company only while
its original footprint remains empty and unblocked.

Census is same-day visible intelligence, not an inert record: explored enemy heroes and cities show
exact armies and hero levels; its upgrade also shows hero mana, known spells, and equipped artifacts.
Wellspring and Dimension Door use explicit owned-hero/map target selection, the adventure
primitives, and the daily ledger described above. Clockwork Double and Blink use bounded staged
company/hex drafting; Upgraded Blink exposes both its two-company and act-immediately branches
without enumerating a destination cross-product, and malformed branches fail before debit.
Consecrated Ground Standard writes symmetric Rite resonance, while Upgraded writes only the caster's
side. Reprise, Overclock, and Upgraded Blink use serialized immediate, round-end, and pre-order
company-action scheduling, so their printed action order is resolver-true; a granted company action
never grants another hero cast and no spell bypasses the per-company two-grant cap.

## Grave/Wild P1 spell behavior

The binding doc-61 Grave/Wild P1 batch is sixteen audited rows: thirteen new spells plus the Wither,
Shed Skin, and Hedgerow March retunes. Grave Bargain is the single narrow exception to the ordinary
non-X mana band: its tier-3 cost is exactly 0 because the sacrificed company is its cost and mana
source. Tithe follows its exact catalog face—flat +4/+6 mana after paying its 2-mana cost, clamped to
maximum, and a 10%/8% current-HP loss that follows the global `+1 percentage point per 2 SP`
scaling rule. The doc-62 generalized statement that Tithe derives a return
from starting maximum HP is stale; only Grave Bargain does so.

## Skills-v2 magic integration

Adept's per-spell permanent reduction and Attunement R2's global one-mana reduction compose and
clamp ordinary fixed costs at one. Twicetold R1 halves the resulting first-spell cost, rounded up;
R2 upgrades twisters; R3 waives one tier-1/2 hero act per battle. Evoker modifies only registered
impact damage (+25/50/75%), adds Burn 1 from R2, and independently waives one impact cast's hero act
at R3. Tallykeeper adds one to its applications, delays enemy decay by one round from R2, and raises
its enemy cap to 12 at R3.

Loremaster R2 adds one deterministic visible option at Shrines, Mage Guild visits, Palimpsest, and
The Stacks. Palimpsest R3 may use The Stacks and draws four there (five with Loremaster). Loremaster
R3 immediately upgrades every already-known tier-1–3 spell and applies the same rule at every later
learning boundary. Grimoire is only offered when a legal unknown guild spell exists in a known
school within the resulting-level tier cap.

Pinch of Ash and Nettle opt out of Spell Power scaling for both their fixed direct amounts and their
printed counter piles. Grudge, Yoke, Puppet Strings, and Sap and Sinew follow the global
`+1 round per 6 SP` duration rule from their printed base durations. Yoke is one reciprocal,
one-hop link; Standard is removable and
Upgraded is protected. Link fields and visible markers are created, transferred, expired, and removed
together. Puppet Strings controls once per battle within `40 × SP` current HP, preserves original
ownership, and returns with spell-origin Hex 3. Standard discards counters/effects/Yokes gained under
control without resurrecting state removed during control; Upgraded retains gained state.

Grave Bargain accepts any tactically allied nonsummoned company except the last tactical ally,
including a controlled enemy, while casualties and saves remain attributed to original ownership.
Its mana uses starting maximum HP and clamps at 20; every flat reward, including the fully scaled
fresh counter magnitude, passes through destruction proportionality. Spell-impact, attack, and
sacrifice deaths share destruction accounting and owner saves but remain cause-aware: impact has no
fictional company killer, while Tithe/Bargain alone opt into their printed sacrifice interactions.

Wildcall derives a deterministic legal Beast/count and full footprint from the serialized battle
seed and budget, and its summoned state—including Upgraded battle-long +2 speed—is temporary.
Hedgerow March speed and phasing are read dynamically from the live enchantment, including later
summons and immediate removal/replacement. Sap and Sinew uses battle-round duration; its upgraded
Beast retains the extra retaliation and receives Bloom exactly once at round start. Bramblelash uses
the target's complete footprint. The Turning Year directly converts eligible companies' counters,
so neither Spell Power scaling nor counter-application bonuses run again. Fly is a once-daily real
terrain-ignore effect consumed by `MOVE_HERO`, with its Upgraded guardian-aggro exemption serialized.

## Artifact spell rules

Nearby owned-hero spell loans are fixed at battle entry and cast at half Spell Power. Low-tier free
casting still rejects tiers above two. Wax-Sealed Envelope chooses uniformly among executable spell
IDs from battle seed, records the chosen ID on the authored instance, and uses the stable first legal
completion before the first company turn. The first summoned company may produce one half-count
copy. Mirrorback uses the ordinary pending deflection target action; Quiet Bell blocks enemy round-one
hero casts; Ninth Pip prevents all friendly counter decay, beneficial or harmful. These are effect-tag
handlers and preserve normal targeting, immunity, placement, and forgery checks.

## Doc 61 P2 completion

The remaining 25 catalog entries and the False Colors/Standing Mirror retunes use the same typed
metadata, primitive registry, explicit target drafts, hero-act ledger, destruction pipeline, and
seeded replay state as earlier spells. Mirror Hall copies at most once, rejects mana/action
generators, Echo, both mirrors, and Twisters, and permits an Upgraded half-magnitude tier-5 copy.
Standing Mirror's Upgraded marker permits enemy Twisters. Weather derives solely from battle seed
and round. Long Oath, Bell/Book/Candle, Second Grave, Ledger, Ossuary, and Long Silence each use a
named bounded ledger or pipeline hook rather than inferring timing from UI.

Adventure P2 targeting is explicit and serialized. Scrying chooses an owned hero/city or explored
object; Procession chooses its Upgraded adjacent companion; Steal Away chooses an explored enemy
mine; The Debt Called chooses an enemy hero. Prospect, Beast Sense, and Ill Wind store their printed
week, day, guardian, or one-battle scopes. Steal Away's “next N days” window starts at `D+1` and
ends at `D+N`; Debt Called's following-day denial includes the target hero's start turn on each
named day. Strategy AI uses the same cast actions and False Colors' displayed band when evaluating
hero threats.

## Combo and loop acceptance

The twenty doc-62 combos each have one deterministic executable fixture with a complete JSON-safe
fixed operation log. Setup transformations, loadout, round advances, casts, and attacks are explicit;
a fresh fixture interprets the captured log through public reducers and reaches the same canonical
state and qualitative outcome. Acceptance does not assert damage or win-rate parity. The seventeen numbered loop rules each have a direct executable
rejection or bounded-resolution case: mana, action, copy, control/link, counter, resurrection, and
battle-termination bounds all expose their ordinary stable state or reason rather than a test-only
clamp. The two-city exposure simulation uses the faction pair's relevant 62-spell school pool; its
200-seed Hearthguard mean is 20.125 distinct spells (32.46%).
