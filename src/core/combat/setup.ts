import {
  BATTLE_COLS, BATTLE_ROWS, MAX_ARMY_SLOTS,
} from '../../content/constants';
import { UNITS } from '../../content/units';
import { ARTIFACTS } from '../../content/artifacts';
import { SPELLS } from '../../content/spells';
import { SKILLS } from '../../content/skills';
import { coordKey } from '../map/pathfinding';
import { randomInt } from '../rng';
import {
  artifactEffectTotal, artifactStatBonus, chosenArtifactResonance,
  conditionalArtifactStatBonus,
  cloneArtifacts, equippedArtifacts, hasArtifactEffect, hasEquippedArtifact,
} from '../artifacts';
import { rangedShotBonus } from '../omens';
import { skillRank, specialtyHandler } from '../heroBehaviors';
import { hasAbility, stackHasAbility } from './abilities';
import type {
  Army, ArmyStack, BattleContext, BattleSide, BattleStack,
  BattleState, Coord, Hero, OmenId,
} from '../types';
import { applyRoundMorale, turnOrder } from './round';
import { beginStackTurn } from './magicEffects';
import { createBattleTile, placeBattleTile } from './tiles';
import { beastSpeedBonus } from '../skills/expansionHooks';
import { maximumMana } from '../heroBehaviors';
import { footprintFits, occupiedByStacks, stackHexes } from './footprint';
import { BATTLEFIELD_TEMPLATES, TERRAIN } from '../../content/terrain';
import { armyFitsCapacity, assertHeroArmyFitsCapacity } from '../army';
import { castStoredSpell, legalSpellCasts } from './spells';
import { isUpgraded } from './spellModifiers';

const DEPLOY_ROWS = [4, 2, 6, 0, 8, 1, 7, 3, 5];

export function legalAmbushDeployments(
  battle: BattleState, stack: BattleStack,
): Coord[] {
  if (!stackHasAbility(stack, 'ambush')) return [];
  const occupied = occupiedByStacks(battle.stacks, stack.id);
  const blockers = new Set([...battle.obstacles, ...battle.tiles.map((tile) => tile.position)]
    .map((coord) => `${coord.x},${coord.y}`));
  const edge = Math.floor(BATTLE_COLS / 2);
  const result: Coord[] = [];
  for (let y = 0; y < BATTLE_ROWS; y += 1) for (let x = 0; x < BATTLE_COLS; x += 1) {
    if ((stack.side === 'attacker' ? x < edge : x >= edge)
        && footprintFits(stack, { x, y }, occupied, blockers)) result.push({ x, y });
  }
  return result;
}

function passiveAbilities(hero: Hero) {
  return equippedArtifacts(hero).flatMap((item) => {
    const definition = ARTIFACTS[item.id];
    return definition.effects.includes('melee_reflect')
      ? ['mask_reflect' as const] : [];
  });
}

function armyToBattleStacks(
  army: Army, side: BattleSide, hero: Hero | null, omen: OmenId,
): BattleStack[] {
  return army.flatMap((stack, slot) => {
    if (!stack || stack.count <= 0) return [];
    const unit = UNITS[stack.unitId];
    const specialty = hero ? specialtyHandler(hero) : null;
    const hp = specialty?.unitHp?.(stack.unitId) ?? unit.hp;
    return [{
      id: `${side}-${slot}`, side, slot, unitId: stack.unitId,
      count: stack.count, topHp: hp, hpOverride: hp === unit.hp ? undefined : hp,
      position: {
        x: side === 'attacker'
          ? (hero && skillRank(hero, 'tactician') >= 1 ? 1 : 0)
          : BATTLE_COLS - unit.hexSize - (hero && skillRank(hero, 'tactician') >= 1 ? 1 : 0),
        y: DEPLOY_ROWS[slot],
      },
      shots: (unit.shots ?? 0) + (unit.abilities.includes('ranged')
        ? rangedShotBonus(omen) + (hero ? artifactEffectTotal(hero, 'extra_shots') : 0)
        : 0),
      morale: hero && skillRank(hero, 'command') === 3
        ? SKILLS.command.values.startingMeter : 0,
      retaliated: false,
      defended: false, waited: false, bonusActions: 0,
      attacksMade: 0, movedHexes: 0, overwindPrimed: false,
      overwindUsed: false, skipRound: null, summoned: false,
      counters: { burn: 0, chill: 0, hex: 0, bloom: 0 }, effects: [],
      meterThreshold: hero
        ? artifactEffectTotal(hero, 'meter_threshold') || undefined : undefined,
      abilityUses: {}, countAtTurnStart: stack.count,
      temporaryAbilities: [],
      artifactSpeedBonus: hero
        ? (unit.abilities.includes('beast')
          ? artifactEffectTotal(hero, 'beast_speed') + beastSpeedBonus(hero) : 0)
          + (unit.tier <= 2 ? artifactEffectTotal(hero, 'low_tier_speed') || 0 : 0)
        : 0,
      specialtySpeedBonus: specialty?.unitSpeedBonus?.(stack.unitId) ?? 0,
      damageDealt: 0, damageTaken: 0, extraActionsTaken: 0,
    }];
  });
}

export function splitGuardianArmy(stacks: ArmyStack[], split = true): Army {
  if (!split) {
    const result: Array<ArmyStack | null> = Array(MAX_ARMY_SLOTS).fill(null);
    stacks.slice(0, MAX_ARMY_SLOTS).forEach((stack, index) => {
      result[index] = { ...stack };
    });
    return result;
  }
  const result: Array<ArmyStack | null> = Array(MAX_ARMY_SLOTS).fill(null);
  let slot = 0;
  for (const stack of stacks) {
    const splits = Math.min(5, stack.count);
    const base = Math.floor(stack.count / splits);
    let remainder = stack.count % splits;
    for (let index = 0; index < splits && slot < MAX_ARMY_SLOTS; index += 1) {
      result[slot++] = {
        unitId: stack.unitId,
        count: base + (remainder-- > 0 ? 1 : 0),
      };
    }
  }
  return result;
}

function createObstacles(rngState: number, stacks: BattleStack[]): [Coord[], number] {
  const obstacles: Coord[] = [];
  const used = new Set(stacks.flatMap((stack) => stackHexes(stack)).map(coordKey));
  let rng = rngState;
  while (obstacles.length < 8) {
    let x: number;
    let y: number;
    [x, rng] = randomInt(rng, BATTLE_COLS - 4);
    [y, rng] = randomInt(rng, BATTLE_ROWS);
    const coord = { x: x + 2, y };
    const key = coordKey(coord);
    if (!used.has(key)) {
      used.add(key);
      obstacles.push(coord);
    }
  }
  return [obstacles, rng];
}

function siegeStack(
  id: string, side: BattleSide, unitId: 'siegeWall' | 'siegeRam' | 'watchtower',
  count: number, position: Coord, slot: number,
): BattleStack {
  return {
    id, side, slot, unitId, count, topHp: UNITS[unitId].hp, position,
    shots: UNITS[unitId].shots ?? 0, morale: 0, retaliated: false,
    defended: false, waited: false, bonusActions: 0, attacksMade: 0,
    movedHexes: 0, overwindPrimed: false, overwindUsed: false,
    skipRound: null, summoned: true,
    counters: { burn: 0, chill: 0, hex: 0, bloom: 0 }, effects: [],
    abilityUses: {}, countAtTurnStart: count, temporaryAbilities: [],
    damageDealt: 0, damageTaken: 0, extraActionsTaken: 0,
  };
}

export function createBattle(
  attackerArmy: Army,
  defenderArmy: Army,
  attackerHero: Hero,
  defenderHero: (Hero & { knackEnabled?: boolean }) | null,
  context: BattleContext,
  rng: number,
  defenderWalls = false,
  omen: OmenId = 'quiet',
  defenderKeep = false,
  week = 1,
): [BattleState, number] {
  assertHeroArmyFitsCapacity(attackerArmy, attackerHero);
  if (defenderHero) assertHeroArmyFitsCapacity(defenderArmy, defenderHero);
  else if (!armyFitsCapacity(defenderArmy, MAX_ARMY_SLOTS)) {
    throw new Error('A heroless defending army may contain at most seven occupied slots');
  }
  const stacks: BattleStack[] = [
    ...armyToBattleStacks(attackerArmy, 'attacker', attackerHero, omen),
    ...armyToBattleStacks(defenderArmy, 'defender', defenderHero, omen),
  ];
  for (const [side, hero] of [['attacker', attackerHero], ['defender', defenderHero]] as const) {
    if (!hero || skillRank(hero, 'tactician') < 2 || hero.tacticianSlot === null) continue;
    const chosen = stacks.find((stack) => stack.side === side && stack.slot === hero.tacticianSlot);
    if (!chosen) continue;
    const width = UNITS[chosen.unitId].hexSize;
    const preferredX = side === 'attacker' ? 6 - width : 7;
    const candidates = Array.from({ length: BATTLE_ROWS }, (_, y) => ({ x: preferredX, y }))
      .sort((a, b) => Math.abs(a.y - 4) - Math.abs(b.y - 4) || a.y - b.y);
    const destination = candidates.find((position) => footprintFits(chosen, position,
      occupiedByStacks(stacks, chosen.id), new Set()));
    if (destination) chosen.position = destination;
    if (skillRank(hero, 'tactician') >= 3) chosen.actsFirst = true;
  }
  const nativeFaction = context.terrain ? TERRAIN[context.terrain].nativeFaction : null;
  if (nativeFaction) for (const stack of stacks) {
    const hero = stack.side === 'attacker' ? attackerHero : defenderHero;
    if (hero?.faction === nativeFaction) stack.terrainSpeedBonus = 1;
  }
  for (const [side, hero] of [
    ['attacker', attackerHero], ['defender', defenderHero],
  ] as const) {
    if (!hero || !hasEquippedArtifact(hero, 'toyKnightsHeart')) continue;
    const construct = stacks.filter((stack) => stack.side === side
      && hasAbility(stack.unitId, 'construct'))
      .sort((a, b) => b.count * UNITS[b.unitId].hp - a.count * UNITS[a.unitId].hp)[0];
    if (construct) construct.temporaryAbilities = [
      ...(construct.temporaryAbilities ?? []), 'unfinished_vow',
    ];
  }
  if (defenderWalls) {
    const wallRows = [0, 1, 3, 4, 6, 7];
    const breached = skillRank(attackerHero, 'siegewright') >= 3 ? 1 : 0;
    wallRows.slice(breached).forEach((y, index) => stacks.push(siegeStack(
      `siege-wall-${index}`, 'defender', 'siegeWall', 1, { x: 10, y }, 20 + index,
    )));
    stacks.push(siegeStack(
      'siege-ram', 'attacker', 'siegeRam', 1, { x: 1, y: 4 }, 20,
    ));
    if (defenderKeep) stacks.push(siegeStack(
      'watchtower', 'defender', 'watchtower', 10 + 2 * week, { x: 11, y: 4 }, 30,
    ));
    for (const stack of stacks.filter((candidate) => candidate.side === 'defender'
      && candidate.slot < 20 && stackHexes(candidate).some((hex) => hex.x === 10))) {
      stack.position.x = 10 - UNITS[stack.unitId].hexSize;
    }
  }
  let [obstacles, nextRng] = context.battlefield === 'sea'
    ? [[], rng] as [Coord[], number] : createObstacles(rng, stacks);
  const template = context.terrain ? TERRAIN[context.terrain].battlefieldTemplate
    : context.battlefield === 'sea' ? 'sea' : 'meadow';
  const templateDefinition = BATTLEFIELD_TEMPLATES[template];
  const obstacleProps = templateDefinition?.wideProps
    ? [{ x: 3, y: 1 }, { x: 6, y: 3 }, { x: 3, y: 6 }, { x: 8, y: 7 }]
      .map((position, index) => ({
        position, footprint: { w: 2, h: 1 },
        kind: templateDefinition.props[index % templateDefinition.props.length],
      }))
    : obstacles.map((position, index) => ({
      position, footprint: { w: 1, h: 1 },
      kind: templateDefinition?.props[index % templateDefinition.props.length] ?? 'rock',
    }));
  if (templateDefinition?.wideProps) obstacles = obstacleProps.flatMap((prop) => [
    prop.position, { x: prop.position.x + 1, y: prop.position.y },
  ]);
  const shallowHexes = context.battlefield === 'mire'
    ? [{ x: 5, y: 2 }, { x: 7, y: 5 }, { x: 6, y: 7 }] : [];
  const order = turnOrder(stacks);
  const attackerRosterStatBonus = conditionalArtifactStatBonus(
    attackerHero, context.attackerOwnedHeroCount ?? 1, context.attackerRosterHasHeroCountStats,
  );
  const defenderRosterStatBonus = defenderHero ? conditionalArtifactStatBonus(
    defenderHero, context.defenderOwnedHeroCount ?? 1, context.defenderRosterHasHeroCountStats,
  ) : 0;
  const battle: BattleState = {
    seed: rng, round: 1, stacks, obstacles, order, waiting: [],
    currentStackId: order[0] ?? null,
    attackerHero: {
      id: attackerHero.id, faction: attackerHero.faction, level: attackerHero.level,
      definitionId: attackerHero.definitionId,
      specialtyId: attackerHero.specialtyId,
      attack: attackerHero.attack + artifactStatBonus(attackerHero, 'attack')
        + attackerRosterStatBonus
        + (context.kind === 'hero' && skillRank(attackerHero, 'duelist') >= 1 ? 2 : 0),
      defense: attackerHero.defense + artifactStatBonus(attackerHero, 'defense')
        + attackerRosterStatBonus
        + (context.kind === 'hero' && skillRank(attackerHero, 'duelist') >= 1 ? 2 : 0),
      luck: attackerHero.luck + artifactEffectTotal(attackerHero, 'luck')
        - (defenderHero ? artifactEffectTotal(defenderHero, 'enemy_luck') : 0),
      moraleBonus: attackerHero.moraleBonus,
      spellPower: attackerHero.spellPower
        + artifactStatBonus(attackerHero, 'spellPower')
        + attackerRosterStatBonus,
      mana: attackerHero.mana,
      manaMaximum: maximumMana({
        ...attackerHero, knowledge: attackerHero.knowledge + attackerRosterStatBonus,
      }),
      knownSpells: [...attackerHero.knownSpells],
      upgradedSpells: [...attackerHero.upgradedSpells],
      spellManaReductions: { ...attackerHero.spellManaReductions },
      skills: { ...attackerHero.skills },
      tacticianSlot: attackerHero.tacticianSlot,
      inventory: attackerHero.inventory.map((item) =>
        item && typeof item !== 'string' ? { ...item, origin: item.origin && { ...item.origin } } : item),
      artifacts: cloneArtifacts(attackerHero.artifacts),
      debts: attackerHero.debts.map((debt) => ({
        ...debt, trigger: { ...debt.trigger },
      })),
      knackEnabled: true,
    },
    defenderHero: defenderHero
      ? {
        id: defenderHero.id, definitionId: defenderHero.definitionId, level: defenderHero.level,
        faction: defenderHero.faction,
        specialtyId: defenderHero.specialtyId,
        attack: defenderHero.attack + artifactStatBonus(defenderHero, 'attack')
          + defenderRosterStatBonus
          + (context.kind === 'hero' && skillRank(defenderHero, 'duelist') >= 1 ? 2 : 0),
        defense: defenderHero.defense + artifactStatBonus(defenderHero, 'defense')
          + defenderRosterStatBonus
          + (context.kind === 'hero' && skillRank(defenderHero, 'duelist') >= 1 ? 2 : 0),
        luck: defenderHero.luck + artifactEffectTotal(defenderHero, 'luck')
          - artifactEffectTotal(attackerHero, 'enemy_luck'),
        moraleBonus: defenderHero.moraleBonus,
        spellPower: defenderHero.spellPower
          + artifactStatBonus(defenderHero, 'spellPower')
          + defenderRosterStatBonus,
        mana: defenderHero.mana,
        manaMaximum: maximumMana({
          ...defenderHero, knowledge: defenderHero.knowledge + defenderRosterStatBonus,
        }),
        knownSpells: [...defenderHero.knownSpells],
        upgradedSpells: [...defenderHero.upgradedSpells],
        spellManaReductions: { ...defenderHero.spellManaReductions },
        skills: { ...defenderHero.skills },
        tacticianSlot: defenderHero.tacticianSlot,
        inventory: defenderHero.inventory.map((item) =>
          item && typeof item !== 'string' ? { ...item, origin: item.origin && { ...item.origin } } : item),
        artifacts: cloneArtifacts(defenderHero.artifacts),
        debts: defenderHero.debts.map((debt) => ({
          ...debt, trigger: { ...debt.trigger },
        })),
        knackEnabled: defenderHero.knackEnabled !== false,
      } : null,
    defenderWalls, defenderKeep, context, log: ['Battle begins.'],
    casualties: { attacker: {}, defender: {} },
    initialCounts: Object.fromEntries(stacks.map((stack) => [stack.id, stack.count])),
    recovered: { attacker: {}, defender: {} }, winner: null,
    enchantments: { attacker: [], defender: [] },
    castRound: { attacker: 0, defender: 0 },
    knackUseRound: { attacker: 0, defender: 0 }, resonance: null,
    terrainResonances: context.onSeam ? ['rite', 'craft', 'grave', 'wild'] : [],
    battlefieldTemplate: template, shallowHexes, obstacleProps,
    chosenResonance: {
      attacker: chosenArtifactResonance(attackerHero),
      defender: defenderHero ? chosenArtifactResonance(defenderHero) : null,
    },
    omen,
    sideAbilities: {
      attacker: passiveAbilities(attackerHero),
      defender: defenderHero ? passiveAbilities(defenderHero) : [],
    },
    destroyedStacks: 0, extraActions: { attacker: 0, defender: 0 },
    tiles: [],
    spellCasts: 0,
    lastSpellCast: null,
    spellsCastAgainst: { attacker: [], defender: [] },
    itemUses: { attacker: 0, defender: 0 },
    itemFreeActUsed: { attacker: false, defender: false },
    itemPreserved: { attacker: false, defender: false },
    twisterFreeUsed: { attacker: false, defender: false },
    twisterActSaved: { attacker: false, defender: false },
    vanguardStack: { attacker: null, defender: null },
    firstSpellTaxPaid: { attacker: false, defender: false },
    ironNailSpent: { attacker: false, defender: false },
    counterRedirectTarget: { attacker: null, defender: null },
    counterRedirectUsed: { attacker: false, defender: false },
    sealedEnchantments: [],
    pendingFreeMove: null,
    retaliationSuppressed: {
      attacker: attackerHero.adventureEffects.noRetaliationBattles > 0,
      defender: Boolean(defenderHero
        && defenderHero.adventureEffects.noRetaliationBattles > 0),
    },
    deathTriggerMultiplier: { attacker: 1, defender: 1 },
    recentDestructionScale: { attacker: 1, defender: 1 },
    bloodPriceBonus: { attacker: 0, defender: 0 },
    timingSpeedBonus: { attacker: 0, defender: 0 },
    doubleCastUsedRound: { attacker: 0, defender: 0 },
    mirrorArtifactUsed: { attacker: false, defender: false },
    longestCandleUsed: { attacker: false, defender: false },
    longestCandlePending: { attacker: null, defender: null },
    lastToyUsed: { attacker: false, defender: false },
    clapperUsed: { attacker: false, defender: false },
    hornUsed: { attacker: false, defender: false },
    artifactEffectUses: { attacker: {}, defender: {} },
    inheritedArtifactStats: { attacker: null, defender: null },
    artifactStoredSpell: { attacker: null, defender: null },
    lastHeroSpellAction: { attacker: null, defender: null },
    spellCastsBySide: { attacker: 0, defender: 0 },
    delayedTriggers: [],
    midBattleResonance: { attacker: [], defender: [] },
    itemUpgradedSchools: { attacker: [], defender: [] }, pendingGraveDust: null,
    holdLineUsedRound: {},
    standardDawnKillRound: {},
    pendingGrantedActions: [], activeGrantedAction: null, roundOrderPending: false,
    withdrawal: null,
    beguilerOpeningResolved: {
      attacker: skillRank(attackerHero, 'beguiler') < 1,
      defender: !defenderHero || skillRank(defenderHero, 'beguiler') < 1,
    },
    beguilerControlUsed: { attacker: false, defender: false },
    evokerActUsed: { attacker: false, defender: false },
    duelistTrophyResolved: false,
    pendingAmbushStackId: stacks.filter((stack) => stackHasAbility(stack, 'ambush')
      && (stack.abilityUses?.ambush ?? 0) === 0)
      .sort((a, b) => a.side.localeCompare(b.side) || a.slot - b.slot || a.id.localeCompare(b.id))[0]?.id,
    pendingArtifactDeploymentSide: hasArtifactEffect(attackerHero, 'free_deployment')
      ? 'attacker' : defenderHero && hasArtifactEffect(defenderHero, 'free_deployment')
        ? 'defender' : undefined,
  };
  for (const side of ['attacker', 'defender'] as const) {
    if (!battle.stacks.some((stack) => stack.side === side
      && hasAbility(stack.unitId, 'home_ground'))) continue;
    const candidates = Array.from({ length: BATTLE_ROWS }, (_, y) =>
      Array.from({ length: BATTLE_COLS - 4 }, (_, x) => ({ x: x + 2, y })))
      .flat().filter((position) => !battle.obstacles.some((coord) =>
        coord.x === position.x && coord.y === position.y)
        && !battle.tiles.some((tile) => tile.position.x === position.x
          && tile.position.y === position.y)
        && !battle.stacks.some((stack) => stackHexes(stack).some((hex) =>
          hex.x === position.x && hex.y === position.y)));
    for (const position of candidates.slice(0, 2)) {
      placeBattleTile(battle, createBattleTile(battle, 'thicket', position, -1, side));
    }
  }
  applyRoundMorale(battle);
  battle.order = turnOrder(battle.stacks, battle);
  battle.currentStackId = battle.order[0] ?? null;
  for (const side of ['attacker', 'defender'] as const) {
    const hero = side === 'attacker' ? battle.attackerHero : battle.defenderHero;
    if (!hero || !hasArtifactEffect(hero, 'seeded_prebattle_spell')) continue;
    const currentStackId = battle.stacks.find((stack) => stack.side === side && stack.count > 0)?.id;
    if (!currentStackId) continue;
    const priorCurrent: string | null = battle.currentStackId;
    battle.currentStackId = currentStackId;
    const candidates = legalSpellCasts(battle).filter((action) => action.spellId !== 'echo')
      .sort((a, b) => a.spellId.localeCompare(b.spellId)
        || JSON.stringify(a).localeCompare(JSON.stringify(b)));
    battle.currentStackId = priorCurrent;
    if (!candidates.length) continue;
    let hash = (battle.seed ?? 0) >>> 0;
    for (const char of `${side}:wax-sealed-envelope`) {
      hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
    }
    const spellIds = [...new Set(candidates.map((candidate) => candidate.spellId))];
    const chosenSpellId = spellIds[hash % spellIds.length];
    const action = candidates.find((candidate) => candidate.spellId === chosenSpellId)!;
    const envelope = Object.values(hero.artifacts.equipment).find((item) => item
      && ARTIFACTS[item.id].effects.includes('seeded_prebattle_spell'));
    if (envelope) envelope.seededSpellId = action.spellId;
    castStoredSpell(battle, side, action, isUpgraded(battle, hero, action.spellId), true, 0, true);
    battle.log.push(`Wax-Sealed Envelope casts ${SPELLS[action.spellId].name} from the battle seed.`);
  }
  battle.order = turnOrder(battle.stacks, battle).filter((id) =>
    battle.stacks.some((stack) => stack.id === id && stack.count > 0));
  battle.currentStackId = battle.order[0] ?? null;
  const first = battle.stacks.find((stack) => stack.id === battle.currentStackId);
  if (first) beginStackTurn(battle, first);
  return [battle, nextRng];
}
