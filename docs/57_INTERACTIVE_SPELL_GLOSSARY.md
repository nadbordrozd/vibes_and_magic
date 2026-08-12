# Work order 57 — Interactive spell-effect glossary

Status: implemented 2026-08-12. The 30 definitions and native icons published by work orders 53
and 54 are now player-facing semantic help. This is presentation only: it changes no spell cost,
target, resolver, effect, acquisition, save, replay, or AI behavior.

## Authority and shared contract

[`../src/ui/components/SpellGlossary.tsx`](../src/ui/components/SpellGlossary.tsx) is the only inline
term and popover implementation. Every reference carries a stable `SpellLexiconId`, renders the
manifest-backed native effect icon and contextual label, and opens the one authoritative rule from
[`../src/content/spellLexicon.ts`](../src/content/spellLexicon.ts). The popover is portaled to the
document body and viewport-clamped so modal and scroll-container clipping cannot hide it.

References open on hover, keyboard focus, click, or tap. They expose their expanded state and
controlled detail to assistive technology. Escape and the close control restore trigger focus;
outside pointer input dismisses the detail. Inline icons are decorative because the button's
accessible name already identifies the term. The component is not placed inside another button;
button-based catalog choices keep their existing inspection route and adjacent descriptive help.

## Structured and legacy text

The shared Spellbook renders both Standard and Upgraded versions directly from the complete
`SpellRulePresentation` token record. It does not reconstruct rules from catalog strings, and it
does not add a generic Spell Power row, legal-path counts, or cast-confirmation narration.

Legacy catalog prose uses `tokenizeSpellLexiconText`, a deterministic left-to-right,
longest-alias-first tokenizer. It preserves authored case and punctuation, respects word
boundaries, and leaves the ordinary-language dispositions from work order 53 untouched. A battle
enchantment therefore wins over the overlapping enchantment alias, while words such as
`counterweight` do not become glossary references.

## Player-facing coverage

The shared semantic renderer now covers:

- complete Standard and Upgraded Spellbook rules, spell facts, flavor, and visible Debts;
- counter inspection, unit counter/status and Morale displays, battle resonance, targeting
  prompts/consequences, battle logs, abilities, and faction rules;
- the full 30-term context-help glossary plus context instructions;
- hero specialties and skill rules, City Growth and Mage Guild spell rules;
- adventure spell targeting and confirmation copy, service confirmations, item details, artifact
  management, and structure flavor;
- map-editor Guardian palette/inspection and its authored Growth explanation.

Spell, skill, artifact, consumable, scroll, ability, omen, unit, and structure choices that are
already buttons retain valid HTML and route their full catalog rules through the existing shared
inspection layer rather than nesting glossary buttons inside action buttons.

## Verification

Focused tests cover tokenizer aliases, overlaps and word boundaries; complete 68-spell token
rendering; all 30 icon consumers; accessible reference markup; shared interaction and positioning
hooks; and the unchanged selection-first Spellbook contract. The Spellbook browser journey checks
Bloom from an authored spell rule, the help glossary, and a live combat counter at desktop and
390px, including exact icon/rule content, Escape/close/outside dismissal, focus restoration,
viewport bounds, and unchanged adventure/combat cast confirmation.
