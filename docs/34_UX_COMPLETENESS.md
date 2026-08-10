# UX Completeness Work Order

Status: implemented and verified 2026-08-04. This document changes presentation only. The canonical S-files and executable
content catalogs remain authoritative for mechanics, values, content behavior, balance, and AI.

## 1. Outcome

A new player can complete the game's ordinary adventure, development, and combat loops without
consulting project documentation or guessing which screen elements are interactive. HoMM2 is the
reference for information hierarchy and interaction clarity: strong selection state, obvious
primary actions, concise status panels, visible costs, right-click information, and immediate action
feedback. Systems without a HoMM2 analogue follow the same grammar rather than inventing isolated
controls.

Completion requires both implementation and evidence. An inventory of shortcomings is not a
deliverable.

## 2. Six questions every state must answer

Every screen, modal, object, control, and transient mode must make these answers available in the
interface:

1. **Identity:** What am I looking at?
2. **Affordance:** What can I do here?
3. **Availability:** Why can or cannot I do it now?
4. **Prediction:** What will it cost, target, or cause?
5. **Feedback:** What just happened?
6. **Reference:** Where can I learn the underlying rule again?

## 3. Shared interaction grammar

- Hover identifies any inspectable subject. Right-click opens its full card. Inspect mode provides
  the equivalent one-click path and remains visibly active until dismissed.
- Left-click acts or selects. It never secretly means “show rules,” and ordinary actions never
  require double-click.
- The visually strongest enabled button is the screen's next ordinary action. Destructive or
  irreversible actions state their consequence before commitment.
- Every disabled control exposes a plain-language reason. Disabled styling alone is insufficient.
- Costs use the canonical resource sprites. Content names use catalog presentation names, never raw
  IDs or enum casing.
- Selection, legal target, dangerous target, destination, ownership, active turn, and inspected
  subject have distinct, consistent visual states.
- Modal and targeting modes state what the player is choosing and always expose Cancel or Close.
- Action feedback names the actor, action, result, and important resource/count delta. Persistent
  state belongs in a panel; transient confirmation belongs in a notice and/or log.
- Keyboard shortcuts supplement visible controls. No required action is discoverable only through a
  shortcut.

## 4. Information hierarchy

Every major screen uses the same order:

1. current context and objective;
2. current actor/selection and its essential resources;
3. legal primary actions;
4. detailed inventory/loadout/content;
5. history, reference, and secondary system controls.

Numbers that determine an immediate decision include labels and maxima or deltas where useful.
Icons never stand alone until their meaning has been taught by adjacent text and remains available
on hover/inspection.

## 5. Inspection coverage contract

The binding list from `S01_RATIONALE.md` is exhaustive: terrain, map objects, units in every
surface, buildings, spells, artifacts, consumables, skills, heroes, counters, enchantments, omens,
and battle-created tiles are inspectable wherever they appear. A full card orders:

1. presentation name and category;
2. in-world flavor;
3. generated mechanics from authoritative data;
4. state-specific facts such as current count, rank, equipped slot, availability, owner, duration,
   or remaining uses.

Terrain and decorations retain the canonical short label/phrase treatment. Empty slots and empty
enchantment spaces identify what they accept even though they have no content card.

## 6. Screen coverage matrix

| Surface | Required comprehension evidence |
|---|---|
| Title/setup/load | Map objective/style, player-controller meanings, faction identity, difficulty effect, seed purpose, save metadata, clear primary start/load action |
| Adventure header/map | Day/week/omen/objective, resources and income, selected hero, safe route/fight cue, terrain/object identity, fog, movement feedback, turn completion |
| Hero sidebar | Primary stats, movement/mana, specialty, army, consumables, equipment/backpack, secondary skill names/ranks/rules, spell access; nearby structures open contextual dialogs over the map |
| Castle | Ownership/visiting context, building state and prerequisites, daily build limit, recruitment availability/cost/capacity, garrison transfer, guild, tavern, market and faction services |
| Combat | Active stack/side, reachable/attackable states, full-footprint targets, damage prediction, attack direction, spell/item targeting, counters/effects, wait/defend/retreat/surrender, log and result |
| Offers/choices | Choice source, mutually exclusive outcomes, exact cost/consequence, inspectable offered content, disabled reason, cancel only where rules permit |
| Exchange/equipment | Source/destination, selected slot, valid destination, split/transfer result, artifact slot/class/effect, Burden restriction |
| Spellbooks | Cast timing, mana/movement cost, base and upgrade effects, current active face, valid targets, why a spell is unavailable, Debts and triggers |
| Results/victory | Winner/outcome, casualties/rewards, persistent consequences, next action |
| Global reference | Contextual controls, interaction legend, terminology/glossary, objective, and a way to reopen help from every playable phase |

## 7. Automated gates

- Catalog lint proves that every inspection kind resolves names, flavor, and mechanics from its
  authoritative catalog.
- Deterministic browser fixtures cover every matrix row and unusual modal/targeting mode.
- Fixture audit rejects visible raw catalog IDs, unlabeled icon-only controls, inspectable content
  without inspection metadata, and disabled controls without an available reason.
- Screenshot review uses desktop and narrow/mobile viewports and records the complete fixture set.
- Existing deterministic rules, simulation, replay, and game-mechanics tests remain unchanged.

## 8. New-player acceptance walkthrough

Without project docs, a reviewer must be able to:

1. start an appropriate first game and restate its objective;
2. identify the selected hero, movement, mana, army, skills, specialty, equipment, resources, income,
   and current omen;
3. inspect terrain, an ordinary object, a guardian, a unit, an artifact, and a secondary skill;
4. choose an empty destination, distinguish a safe route from a fight, collect a resource, visit a
   service, and end the turn;
5. enter a castle, understand building states, build, recruit, and transfer a stack;
6. enter combat, identify the active stack, move, choose a melee approach or ranged target, inspect
   an enemy, use or understand Wait/Defend/spells/items, and interpret damage/casualties;
7. understand a reward/offer and the resulting persistent change;
8. reopen contextual help and recover after entering any targeting mode.

The work is complete only when the implementation, automated fixtures, screenshots, and a recorded
walkthrough jointly prove these tasks.

## 9. Implementation record

The completed pass established one shared interaction grammar rather than screen-local patches:

- persistent contextual Help and glossary, plus an explicit Inspect mode and right-click cards;
- complete presentation catalogs for creature abilities, faction rules, castle names, and spell
  categories, with player-facing names replacing raw IDs and enum values;
- full inspection cards for the binding content list, including secondary skills, artifacts,
  heroes, counters, enchantments, omens, terrain, castles, and battlefield-created tiles;
- consistent resource sprites in balances, costs, rewards, logs, choices, recruitment, markets,
  surrender, and results;
- exact disabled reasons, visible unavailable spell/choice states, explicit targeting prompts and
  Cancel controls, direct end-turn input, notice feedback, and a persistent activity log;
- readable authored hero/creature portraits, responsive adventure/castle/combat layouts, visible
  focus states, reduced-motion support, and clarified hot-seat/result/victory screens.

The adventure-map completion pass additionally made the rendered world itself a reliable control
surface. Hero and castle sprites expose real pointer hit targets; castle clicks resolve to the
authored entrance; the selected hero has an in-world marker; and large footprints mark their
entrance. Every hovered route identifies safe travel, an interaction, or a fight before the click,
while fogged tiles no longer expose terrain inspection metadata. At narrow widths the map is a
bounded scrolling viewport followed immediately by the full command panel rather than a full-height
world image.

`npm run ux-check` is the static completeness gate. It validates every presentation catalog and all
16 inspection kinds, forbids double-click actions, and scans every conditional disabled button for
an explanation. The final run tracked 56 conditional disabled states.

`npm run review:ux` is the deterministic browser acceptance gate. It audits accessible control
names, disabled reasons, raw IDs, and horizontal overflow while recording 39 desktop and compact
screens in `.pixel-work/review/ux/`. Its action fixtures additionally prove that the UI can:

1. explain setup and the map objective;
2. inspect terrain, ordinary objects, guardians, heroes, skills, artifacts, castles, spells,
   abilities, and battle tiles;
3. distinguish safe, interaction, and fight destinations and use the selected-hero, ownership,
   entrance, fog, and route states at desktop and narrow widths;
4. end a turn directly—even with movement remaining—and identify the next hot-seat player;
5. collect a resource and show the resource sprite and exact delta;
6. visit a Hedge School, make an explained reward choice, and show the persisted stat change;
7. transfer a company, recruit a creature, and show the resulting castle armies;
8. announce a morale-triggered extra action on its company and in the battle log;
9. enter spell targeting, identify legal targets, cancel safely, and interpret battle and campaign
   results.

`npm run smoke` separately passes the stateful save/load, empty-tile movement, castle build,
guardian presentation, combat move/attack/damage animation, inspection, and result route. The
non-UX rules suite finishes with 421 of 422 tests passing; the remaining pre-existing deterministic
AI assertion expects a winner by day 56 and is outside this UX-only work order.
