# 38 — New-player acceptance walkthrough

Status: implemented acceptance record. This document is a validation companion to
[34_UX_COMPLETENESS](34_UX_COMPLETENESS.md); it changes no mechanics, content, balance, AI, or
randomness. The canonical rules remain S00–S09.

## Purpose

The binding UX contract now has one reproducible, continuous browser journey instead of a set of
isolated screenshots. It starts at the real title screen, uses only visible UI actions, saves and
loads the same campaign, reaches an authored guardian battle, accepts its protected reward, and
finishes through the authored Grand Muster retirement outcome. Synthetic fixtures remain the right
tool for exhaustive modal and targeting variants that do not naturally coexist in one campaign.

Run it against a local Vite server with:

```bash
npm run review:walkthrough
```

Run the complete UX acceptance suite with:

```bash
npm run review:acceptance
```

Generated continuous-run evidence is written to
`.pixel-work/review/new-player-walkthrough/`. `audit.json` is the machine-readable manifest for the
fixture, action sequence, inspections, paired matrix evidence, paired walkthrough evidence, and
replayed persistence assertions.

## Deterministic fixture

- Campaign: The Grand Muster
- Seed: `18`
- Difficulty: Normal
- Controllers: The Muster is human; The Distant Observer is dormant
- Authored objective: “Showcase sandbox: fight, explore, build, and retire when finished.”

Seed 18 is not a synthetic state injection. It is selected through the title UI because the
authored starting state provides Berta's Logistics inspection and the real Muster chest offers the
Skirmisher's Blade artifact. The run clears browser storage first, and every later state transition
comes from an application event recorded by the ordinary action-save path.

## Exact journey

1. Select Grand Muster, enter seed 18, read setup/controller meanings, start, and restate the
   objective. Open and close contextual help.
2. On Berta, inspect the hero, Logistics, a company, terrain, an ordinary Sparring Stone, and its
   guardian. Select Vess.
3. Enter the Vespiary castle. Transfer a company with explicit source/destination/result, build the
   Marketplace, and recruit a company.
4. Save, return to the title, verify the Grand Muster/seed metadata, and load that same save. The
   new-campaign objective primer must not reopen.
5. Follow safe route intent, collect the authored three-Essence pile, open the authored chest,
   inspect and accept Skirmisher's Blade, then inspect it in Vess's backpack.
6. Travel across real days to the Hedge School, attend a lesson, choose its level reward, and verify
   the hero presentation changes. Travel to the Wagon Camp, confirm purchase of Bottled Echo, and
   verify it appears in inventory.
7. Preview fight intent and enter the authored Vespiary guardian encounter. Inspect an enemy and
   the attack prediction. Open Forge Spark, cancel targeting and prove mana/log state did not
   change, then target and cast it for real.
8. During the same battle, perform Defend, Wait, a manual move, a ranged attack, a melee
   move-attack, and targeted Bottled Echo use. Finish with Auto Combat and read winner, attacker and
   defender losses, persistent guardian removal, and the next action.
9. Continue to the map, visit the protected Sparring Stone, accept its stat reward, reopen help,
   and save. Replay the canonical action log and assert all campaign consequences remain present.
10. Retire through the visible UI and verify the authored “The Grand Muster · Expedition retired”
    outcome and objective copy.

The accepted run contains 56 actions through retirement and reaches day 6. The saved action log is
replayed before retirement so the final assertions are independent of React component state.

## Required persistence assertions

The replayed save must retain all of the following:

- map `grand-muster`, seed 18, and the exact content hash;
- the Vespiary Marketplace, a non-empty castle garrison, and the recruited/transferred army result;
- collected `muster-pile-8` and `muster-chest`;
- Skirmisher's Blade in Vess's artifact backpack;
- Vess in the Hedge School's visited set;
- Bottled Echo absent from inventory after its battle use;
- the Vespiary guardian removed and its Sparring Stone reward accepted.

The continuous manifest also requires both action and observed-UI coverage for campaign setup,
hero selection, movement, transfer, building, recruitment, chest and level choices, service use,
turn completion, every required manual combat verb, auto-combat, and the post-battle reward.

## Evidence contract

`src/sim/walkthrough-coverage.ts` is the single executable inventory. It pins all ten section-6
screen-matrix rows and all eight section-8 walkthrough steps to desktop (`1440×1000`) and narrow
(`390×844`) evidence. The harness audits every captured state for page overflow, unnamed visible
controls, and disabled controls without explanations.

The continuous path deliberately reuses evidence where one honest state satisfies more than one
requirement, so the 36 matrix/step references resolve to 30 unique screenshots. No required row or
step lacks a desktop/narrow pair.

The same manifest assigns synthetic evidence to every `PendingChoice` kind, all six
choice-driven combat abilities, setup/save/import, company/item/equipment transfer, adventure item
targets, combat stack/effect/replacement/no-target states, battle and campaign outcomes, and the
hot-seat pass screen. The focused manifest test fails when a new pending-choice kind is added
without a concrete fixture assignment.

## Presentation defects found by the journey

The walkthrough exposed two real narrow-layout defects and keeps regression assertions for them:

- the adventure top bar exceeded 390px because its resource, speed, and action groups could not
  wrap compactly;
- the combat header exceeded 390px because Save, Share replay, Motion, and Spellbook stayed on one
  fixed-height row.

Both headers now wrap into compact, named controls without changing action behavior. These are
presentation-only corrections under doc 34.

## Review boundary

This walkthrough validates discoverability, action/result explanation, persistence, deterministic
replay, and responsive presentation. It does not certify balance or replace headless mechanics
tests. It also does not replace the synthetic review runners: their purpose is exhaustive family
coverage, while this document certifies one genuine authored player journey.
