# Implementation Decisions

- The PoC uses a compact hand-authored object layout over a deterministic mirrored terrain generator; both are data-only and produce the specified 28×20 map.
- AI vision is unrestricted, as explicitly accepted by the PoC specification.
- A hero entering a guarded objective remains on the adjacent tile until combat resolves, then occupies and claims the destination on victory.
- Treasure and mine guards use the locally themed faction units named by the specification; guardians have no hero bonuses.
- Hero-versus-hero combat is supported when heroes meet outside castles, although the supplied AI primarily targets castles.
- The permanent-reveal fog model records explored coordinates as string keys so game state remains JSON serializable.
- A deterministic battle seed derived from the game PRNG chooses obstacle coordinates; obstacles affect movement but never deployment columns.
- Combat movement and a following melee strike are represented as one explicit action when an enemy is reachable this turn, matching the PoC combat AI requirement.
- Castle recruitment adds units to a visiting hero first and otherwise to the garrison; same-type stacks merge automatically.
- For static hosting, random new-game seeds use browser crypto in the UI and are passed into the pure core; the core itself performs no I/O or ambient randomness.
- To prevent deterministic mine-recapture loops, strategy AI switches to an aggressive enemy-hero/castle objective after day 14; this is an AI-aggression tuning rule, not a game-rule change.
- Local saves use a versioned, optional `localStorage` adapter in the UI layer; the saved payload is the unchanged JSON-serializable core state.
- Adventure movement is committed after its legal path animation; combat actions are queued until movement, bump, and damage feedback finish, preventing animation timing from affecting deterministic rules.
- One shared UI motion setting controls both adventure and combat timing and defaults to Fast; Off commits actions immediately.
## 2026-07-30 — Real factions and magic milestone

- Faction balance baseline (seeds 1–200): Hearthguard 0.5%, Wound-Wrights
  99.5%, zero crashes. Following document 06's tuning order, final tuning is
  Yeoman growth 14→17, Tin Soldier growth 16→12, and (only after testing growth)
  Hobby Knight damage 3–5→3–4. The post-tuning gate (same seeds) is Hearthguard
  49.5%, Wound-Wrights 50.5%, zero crashes.
- `charge` uses the hex distance of the immediately preceding move action as its
  straight-line distance because the current combat action records a destination,
  not individual path nodes.
- Initial magic diagnostic (seeds 1–20) produced Wound-Wrights 100%, zero
  matched winner flips, median battle length 3, and 80 casts. Unit stats remain
  locked; Rally was raised 30→50 meter so Rite can generate an action within the
  observed short battles. Further spell-only tuning and its accepted run follow.
- Strategy AI intercepts an enemy hero that is within one day’s movement of its
  home castle when the defender can reach that hero this turn. Matched diagnostics
  were otherwise decided by empty-castle races with no final battle, making the
  required spell-decisive battle metric meaningless.
## 2026-07-30 — Hero layer milestone

- `Player.heroes` plus `activeHeroId` is authoritative; the existing `Player.hero`
  field remains a synchronized selected-hero compatibility view for Milestone-10
  callers while old single-hero saves are rejected rather than guessed into a roster.
- A defeated hero replaces one current Tavern offer immediately, making the
  documented 2500g re-hire available without waiting for the next weekly refresh.
- Diplomacy recruitment is offered only when every guardian stack can merge into
  or occupy the hero's seven army slots; a partly recruitable guardian cannot be bought.
- Attunement R2's two shrine choices resolve consecutively on the first visit, with
  the first chosen upgrade removed from the second offer.
- Spellthief R2 copies the alphabetically first still-unowned upgrade known by the
  defeated hero after the player chooses which spell to learn.
- When several allied heroes occupy a defending castle, the first roster hero is
  the field commander; other heroes do not merge additional armies into that siege.
- Six empty consumable slots are present on heroes so Milestone-11 exchanges
  conserve items before Milestone 12 supplies the item catalog and acquisition rules.
- Strategy AI intentionally ignores Diplomacy and Spellthief draft cards, continues
  to read exact hidden state, and uses straight-line threat reach for Gatherer flight.
