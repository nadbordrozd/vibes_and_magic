# Spells v1

Rite, Craft, Grave fully specified (the schools of the two implemented factions). Wild penciled for later. Format: name (mana) [type, pipeline stage] — base face → **+ face**. Numbers at SP 0; default SP scaling per 08. All numbers are penciled and expected to change with sim data.

## Rite (oaths, blessings, meter)

1. **Rally** (3) [staple, turn-advance]: target ally +30 meter. → **+** two target allies +30.
2. **Blessing** (3) [staple, damage-computation]: target ally's next attack resolves at range maximum (overrides luck). → **+** also grants +10 meter on cast.
3. **Standard of Dawn** (5) [enchantment]: allied kills grant +10 additional meter. → **+** also allies are immune to meter drain.
4. **Amplify** (4) [twister, varies]: per 08. → **+** also extends the amplified effect's duration/decay by 1 round.
5. **Sanctuary** (4) [staple, target-selection]: target ally cannot be targeted by enemy spells for 2 rounds. → **+** also removes all counters from it on cast.
6. **Oath of Iron** (4) [staple, damage-computation]: for 2 rounds, damage dealt TO target ally resolves at attacker's range minimum. → **+** also unlimited retaliations for the duration.
7. **Consecrate** (3) [staple, apply]: remove all counters from target ally; heal 8% max HP. → **+** heal 15%, and each counter removed grants +5 meter.
8. **Hymn of the Host** (5) [scaling, turn-advance]: all allies gain +8 meter per extra action taken by your side so far this battle. → **+** ×1.5, round up.
9. **Beacon** (–) [topology] **PENCILED**: hero travels to nearest friendly town.
10. **Trial** (6) [build-around, apply]: target enemy stack that has more units than any of your stacks takes 25% of its current HP as damage. → **+** 35%.

## Craft (making, wards, forge-fire, mirrors)

1. **Forge-Spark** (3) [staple, apply]: Burn 3 on target enemy. → **+** Burn 4, and adjacent enemies get Burn 1.
2. **Ward** (4) [staple, damage-routing]: the next enemy attack against target ally deals 0 damage. → **+** and that attacker gains Burn 2.
3. **Reflect** (4) [twister, varies]: per 08. → **+** copy onto two additional targets.
4. **Forgefire** (5) [enchantment, build-around]: all Burn damage counts double. → **+** Burn on enemies no longer decays.
5. **Clockwork Escort** (5) [staple, summon/apply]: summon a friendly stack of Tin Soldiers, size 5 × (SP+1), placed on a free hex adjacent to your edge; vanishes after battle. → **+** Marionettes, size 2 × (SP+1).
6. **Wall of the Maker** (4) [staple, apply/terrain]: create 3 impassable wall hexes on free hexes of your choice; persist all battle. → **+** enemies adjacent to a wall at their turn start gain Burn 1.
7. **Quicksilver** (3) [staple, declare]: target ally +3 speed and ignores obstacles/units when moving, 2 rounds. → **+** whole battle.
8. **Gate** (–) [topology] **PENCILED**: paired passage between two points.
9. **Unmake** (4) [staple, varies]: destroy target enchantment OR remove all counters from one stack (any side). → **+** do both with one cast.
10. **Ironclad** (6) [enchantment, build-around]: allied stacks with total Defense ≥ 12 (incl. hero) take half damage. → **+** threshold 10.

## Grave (endings, memory, curses)

1. **Wither** (3) [staple, apply]: Hex 3 on target enemy. → **+** Hex 5 and Chill 2.
2. **Grave-Chill** (3) [staple, apply]: Chill 3 on target enemy. → **+** also −20 meter.
3. **Mourner's Veil** (4) [staple, damage-computation]: target ally takes −20% damage for 2 rounds. → **+** 3 rounds, and attackers gain Hex 1.
4. **Dirge** (5) [scaling, apply]: target enemy takes damage = 3% of its current HP per stack destroyed so far this battle (any side). → **+** 5%.
5. **Last Candle** (5) [enchantment, death-triggers, build-around]: whenever an allied stack is destroyed, all enemies gain Hex 2 and all allies +20 meter. → **+** also the caster refunds 2 mana per trigger.
6. **Sour** (4) [twister, varies]: per 08. → **+** souring an enchantment additionally applies Hex 3 to all enemy stacks.
7. **Cold Road** (–) [topology] **PENCILED**: travel between two barrows.
8. **Remembrance** (5) [staple, apply]: revive units in target ally stack up to 20% of that stack's losses this battle (only spell that resurrects). → **+** 35%.
9. **Reckoning** (X) [X-cost, build-around, apply]: spend all remaining mana; EVERY stack on the field (both sides) takes damage = 2% of its current HP per mana spent, cap 60%. → **+** allied stacks take half.
10. **Quiet** (4) [staple, retaliation]: target enemy cannot retaliate for 2 rounds. → **+** also Chill 2.

## Wild — PENCILED ONLY (implement with Hagwood/Vespiary milestone)

1. **Gale** [staple, forced movement]: push enemy stack 2 hexes.
2. **Bloom** [staple]: Bloom 3 on ally.
3. **Overgrow** [twister]: per 08.
4. **Thicket** [terrain]: hexes become slowing undergrowth.
5. **Rains** [staple]: remove all Burn field-wide; allies gain Bloom 1.
6. **Beast Tongue** [build-around, adventure]: parley with beast-type neutral guardians (Diplomacy-family).
7. **Stampede Call** [build-around]: all your beast-type stacks immediately move their speed toward the enemy.
8. **Storm** [build-around]: field-wide %HP lightning, stronger vs flying.
9. **Greenway** [topology]: travel along rivers/forest edges.
10. **Wild Growth** [adventure]: target dwelling/castle's growth +50% this week.

## AI hints (data-driven)

Each spell entry carries an `aiHints` field: `{target: strongestEnemy | weakestAlly | strongestAlly | self | enchantmentSlot | counterPile, castWhen: always | losing | winning | round1 | manaAbove(n)}`. Initial assignments: damage/counter spells → strongestEnemy/always; buffs → strongestAlly/always; enchantments → round1; Reckoning → losing + manaAbove(12); twisters → biggest eligible pile/always. The combat AI evaluates castable spells by hints and casts the first applicable each round.
