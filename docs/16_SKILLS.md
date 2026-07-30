# Skill Catalog — 21 Skills, 3 Ranks

**Supersedes 11_MILESTONE_HEROES §3.** All skills now have three ranks; drafting a held skill's card raises it one rank. Ranks are cumulative unless stated. The filler test still applies: every rank must add behavior or a decision, with pure-number ranks tolerated only where the number IS the behavior (tempo, economy).

## The original eight, extended to R3

1. **Logistics** — R1 +10% daily move · R2 +20% · R3 +30% and unspent move points ≤300 carry to tomorrow.
2. **Scouting** — R1 exact guardian counts/abilities/lock-tells from 3 tiles · R2 +2 reveal radius; inspect enemy hero armies exactly · R3 also see enemy heroes' spells, items, and mana.
3. **Wayfaring** — R1 forest costs 100 · R2 all passable terrain costs 100 · R3 all terrain costs 90, diagonals no longer ×1.41.
4. **Diplomacy** — R1 neutrals ≤50% your power: pay 2× gold value to disperse · R2 ≤80%; or 3× to recruit · R3 ≤120% may be paid to *stand aside* (tile becomes passable without a fight; they remain).
5. **Attunement** — R1 +2 mana/day · R2 +4/day; shrines offer their upgrade twice for this hero · R3 +6/day; once per day, declare one battle resonant in a school of your choice.
6. **Command** — R1 +3 meter/round to all allies · R2 +6 · R3 +10, and your stacks' meters start battles at 20.
7. **Forager** — R1 piles +50% · R2 collect piles from adjacent tiles without stepping on them · R3 range 2, piles +100%.
8. **Spellthief** — R1 defeat an enemy hero: learn one of their spells · R2 also copy one of their upgrades per victory · R3 any spell an enemy hero casts against you that you don't know is learned after the battle (base face), win or lose.

## New skills (9–21)

9. **Alchemist** (consumables) — R1 the first item you use each battle doesn't consume your hero-act (item + spell same round, once) · R2 once per battle, a used item is not expended · R3 your potions affect one additional valid target.
10. **Chronicler** (drafts) — R1 level-up drafts deal 4 cards · R2 may skip a draft entirely for +300 XP · R3 once per level-up, reroll the whole deal.
11. **Palimpsest** (spellbook-as-deck) — R1 at a friendly guild, forget a known spell → draw 2 offers from that guild's pool, keep 1 · R2 draw 3 · R3 also usable at shrines (drawing from the shrine's school).
12. **Twicetold** (twisters) — R1 your first twister each battle (Amplify/Reflect/Sour/Overgrow) costs 0 mana · R2 your twisters resolve as their + face · R3 once per battle, casting a twister doesn't count as your hero-act.
13. **Curse-Eater** (counters) — R1 counters on your stacks decay 2 per turn · R2 each counter that expires or is removed from your stack grants it +5 meter · R3 the first Hex or Burn applied to your army each battle is redirected to a target of your choice instead.
14. **Ritualist** (shrines & omens) — R1 shrines usable twice per hero · R2 you see next week's omen in advance · R3 once per game, choose an upcoming week's omen.
15. **Peddler** (economy) — R1 marketplace rates ×0.75 for you · R2 may sell items at 60% value; your marketplaces stock 1 random scroll weekly (purchasable — the exception that proves the found-not-bought rule, gated behind two ranks of a skill) · R3 rates ×0.5; Trade Goods worth +50%.
16. **Warden** (garrisons) — R1 garrisons you install fight with your primary stats · R2 they also get your Command bonus · R3 you may cast into a garrison battle from ≤5 tiles away (your mana, one cast/round).
17. **Ransomer** (hero kills) — R1 defeated enemy heroes pay you their 1500g hire cost · R2 also take one random item they carried · R3 their ransom re-hire cost doubles.
18. **Beastmaster** — R1 `beast` dwellings on the map recruit at −25% · R2 your `beast` stacks +1 speed · R3 once per week, one neutral `beast` stack ≤30% of your power joins you free.
19. **Vanguard** (turn order) — R1 your fastest stack +2 speed in round 1 · R2 all your stacks +1 speed in round 1 · R3 at battle start, designate one stack: it acts first this battle regardless of speed.
20. **Provisioner** (items) — R1 +1 item slot · R2 +2 slots; your adventure spells cost 150 fewer move points · R3 on day 1 of each week, gain a random common consumable.
21. **Siegewright** (castles; partially dormant until sieges exist) — R1 enemy Walls bonuses halved when you attack · R2 your Wall of the Maker hexes have 40 HP and must be destroyed to pass, not walked around... (spec with sieges) · R3 breach one wall hex before assaulting a castle.

## Draft integration

- Pool now: 4 stat cards, 21 skill cards, Inscribe. Skill base weight 3; class flavor weights: Banneret — Command, Vanguard, Warden 6; Guildmaster — Attunement, Twicetold, Palimpsest 6. New factions assign their own flavor weights at spec time (Hagwood ⇒ Curse-Eater/Ritualist; Wildergrass ⇒ Beastmaster/Vanguard; etc.).
- Rarity within the draft: ranks are self-gating (R3 only offered to R2 holders), so no extra rarity machinery needed; Chronicler R3 and Twicetold R3 count as rare-tier for exposure accounting.
- AI drafting additions: takes Alchemist R1 if carrying ≥2 items; still ignores Diplomacy/Spellthief/Palimpsest (log as known limitation).
- Max skills per hero: 6 distinct (HoMM discipline — forces identity). A draft never offers a 7th new skill.
