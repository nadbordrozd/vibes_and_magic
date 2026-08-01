# Castles, Sieges & Bargains

## Common building tree (every faction)

| Building | Cost | Effect |
|---|---|---|
| Village Hall | prebuilt | 500g/day |
| Town Hall | 1500g | +500g/day (req nothing) |
| City Hall | 3500g + 5 timber | +1000g/day (req Town Hall) |
| Marketplace | 500g + 2 timber | per 12 |
| Tavern | 800g + 2 timber | per 11 |
| Mage Guild L1–L3 | per 08 | per 08 |
| Walls | 1500g + 3 iron | siege row (below); defenders +2 D |
| Keep | 2500g + 4 iron | req Walls; adds the Watchtower (below); defenders +2 more D |
| Dwellings T1–T6 | per 14 | weekly growth |

(Treasury from the PoC is retired; its +1000g folds into City Hall. Migration note for the agent: replace, don't stack.)

## Faction special buildings (two each; req T3 dwelling unless noted)

- **Hearthguard** — *Chapel of the Banner* (per 06: hero morale bonus +5). *Muster Field* (1400g+4 timber): T1–T2 growth +50%.
- **Wound-Wrights** — *Guild Workshop* (per 06: spare_parts →50%). *Founder's Vault* (1600g+2 essence): every second week, produces 1 seed-random common consumable; Tin Soldier growth +6.
- **Unfinished** — *Chapel of Candles* (1500g+3 essence): 20% of ALL your battle losses everywhere accrue weekly here as Candle-Wisps (the faction's attrition economy). *Lychgate* (1800g+2 iron+1 essence): when defending this town, your death-trigger abilities fire twice.
- **Vespiary** — *Rendery* (1500g+1 iron): `render_down` yields double. *Deep Tunnels* (2200g+3 iron): your heroes travel between any two owned Tunnel-castles for 500 move points.
- **Hagwood** — *Bargain Post* (1200g+2 essence): weekly, your visiting hero is dealt 2 bargains, may take one (below). *The Hen-Legged Fence* (3000g+6 timber+3 essence) **[needs-engine-support]**: on day 1 of each week, the castle may relocate to an explored tile within 3. Yes, the town walks. Log every implementation compromise.
- **Wildergrass** — *Great Kraal* (1600g+2 timber): all `beast` growth +2. *Pyre of the Fallen* (1400g+1 iron): your `blood_price` grants +10 additional meter army-wide, and units lost defending this town return at 50% next week.

## Sieges (lite — replaces the flat Walls bonus in assaults)

When assaulting a castle with Walls: the defender's edge two columns hold a **wall line** — 6 wall hexes (30 HP each, attackable, impassable until destroyed) with 2 authored gaps. `flying` crosses freely; ranged shoot over at the established ×0.7. With a **Keep**: one **Watchtower** hex — an immobile defender-side shooter (stats of the defender's T2 ranged unit or Longbowman equivalent, stack size = 10 + 2×week number). Attacker receives a free **Ram** stack (construct: 1×[80 HP, 10–14 dmg, A8 D10, spd 4], attacks walls at double damage). No catapult minigame. Siegewright (16) hooks apply. That's the whole system until it earns more.

## Bargains & Debts (the Hagwood spell-class, per 08's pencil)

**Structure:** a bargain is an offer card: an outsized benefit **now**, and a **Debt** — a visible spellbook entry with a stated trigger and cost. Debts cannot be dispelled, Soured, or traded (Wax Seal explicitly does nothing). Max 2 active Debts per hero; the Bargain Post deals nothing to a hero at cap. UI: Debts show in the spellbook with trigger countdown.

**Access:** Hagwood heroes — dealt 1 bargain among their level-up draft cards from level 3 (replacing one skill card). Everyone — the Bargain Post building and, rarely, a Crone's map encounter. Non-Hagwood heroes pay a surcharge: their Debts trigger one step sooner/harder (stated on card).

**The eight bargains:**

1. **The First Harvest** — gain 4000g now. *Debt:* on the first day of week 4 (or next week if already past), your highest-growth dwelling produces nothing that week.
2. **Borrowed Legion** — a neutral stack of ~80% your army's power joins you for 7 days. *Debt:* on day 8 it departs and takes your smallest stack with it.
3. **The Cuckoo's Deal** — choose an enemy castle: you see its builds, recruits, and guild contents forever. *Debt:* its owner sees your highest-level hero's position forever.
4. **Milk Teeth** — your T1 growth +100% for 2 weeks. *Debt:* then −50% for the 2 weeks after.
5. **The Long Nap** — this hero +3 to all primary stats, permanently. *Debt:* this hero sleeps every 7th day (no move, no actions).
6. **Never By Iron** — your army cannot be retaliated for your next 3 battles. *Debt:* your iron income is 0 for 10 days.
7. **The Third Child** — your next level-up draft deals 6 cards. *Debt:* the one after deals 1.
8. **What Was Promised** — instantly gain the exact resources missing for the next building in your current castle's queue. *Debt:* pay 3 essence on day 1 of each week for 3 weeks, or that building goes dormant until you do.

Design law for future bargains: the Debt must be **concrete, scheduled, and visible** — never a percentage chance, never hidden, never waivable. The player should be able to plan around it and still feel the bite. That's what makes it a bargain and not a gamble.
