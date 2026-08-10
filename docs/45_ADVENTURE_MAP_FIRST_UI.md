# Map-First Adventure UI

Status: implemented and verified 2026-08-09. This work order changes presentation and interaction
architecture only. Adventure movement, services, casting, items, equipment, saves, replay, and every
canonical action remain governed by S00–S09 and the pure core.

## 1. Composition contract

The adventure map is the primary desktop surface. A compact resource/date/turn strip sits above it,
and a narrow persistent right rail contains only:

- the minimap;
- hero and owned-town navigation;
- selected-hero identity, movement, and mana;
- a compact seven-company army summary;
- Hero Details, Spellbook, World View, Objective, Menu & Saves, contextual Exchange, and End Turn;
- the current short status or meeting result.

The linked Heroes III screenshot was inspected only as an information-hierarchy reference: dominant
map, narrow navigation/command rail, and compact turn resources. Its ornamental frame, art, icons,
dimensions, text, and decoration were not copied. Existing project imagery remains authoritative.

## 2. Secondary-surface reachability

Persistent adventure chrome is not a hero reference sheet. Removed functions have explicit homes:

| Removed from rail | Deliberate surface |
|---|---|
| primary stats, XP, class, specialty, faction passive | Hero Details · Overview |
| company inspection and splitting | Hero Details · Army |
| paper doll, equipped artifacts, backpack, Debts, Unstitch | Hero Details · Equipment |
| consumables, adventure-item targeting, Patient Stone sketch and digging | Hero Details · Items, then contextual map target/confirmation |
| expanded secondary skills, Attunement declaration, Ritualist forecast | Hero Details · Special Skills |
| full adventure spell list and casting terms | Adventure Spellbook, then contextual map target/confirmation |
| quick/manual saves, import/export/share, motion speed, title exit, activity history | Menu & Saves dialog |
| explicit object services | doc 41 contextual structure dialog |
| visiting hero/garrison transfer | doc 42 Castle · Army task |
| adjacent/routed friendly hero exchange | doc 43 map meeting and exchange dialog |

Inspection remains available globally through right-click, long press, or Inspect mode. Castle,
spellbook, save/menu, world view, object services, and inspection therefore remain usable without
reserving permanent map space for their complete content.

## 3. Responsive and input contract

Desktop uses a fixed narrow rail without an internal scroller; the map receives the remaining width
and full height beneath the status strip. The minimap is the same presentation-only map projection as
before, portaled into the rail while retaining its map-centering behavior. At narrow width the map is
a bounded first surface and the rail becomes a two-column command section below it. The page may own
the single vertical scroll; the rail never becomes a nested scroll region.

Hero Details and Menu & Saves are bounded modal tasks with root scroll lock. Spell/item/Unstitch map
targeting uses one contextual card over the map and remains cancellable. Existing structure dialogs,
pending choices, hero meetings, and castle transfers retain their focus and input guards.

## 4. Verification

- `src/ui/__tests__/adventure-map-first.test.tsx` pins persistent-rail exclusions, transient
  reachability, render purity, and primary adventure routes.
- `npm run review:ux` writes desktop and 390px map-first evidence, asserts at least 78% desktop map
  width, zero rail/page overflow, no rail nested scrolling, minimap containment, and forbidden-chrome
  absence.
- Focused service, hero-meeting, castle-transfer, and non-adventure suites guard docs 41–44.
- Production build, browser smoke, relevant review runners, static UX checks, and the full test suite
  remain the completion gates.
