import {
  addUnits, armyAlive, armyPower, canAfford, makeArmy, pay,
} from '../army';
import { SKILLS } from '../../content/skills';
import { UNITS } from '../../content/units';
import { HERO_MOVE_POINTS, RANGED_PICKUP_MOVE_COST } from '../../content/constants';
import {
  createBattle, splitGuardianArmy,
} from '../combat/battle';
import { turnOrder } from '../combat/round';
import {
  findPath, movementCost, pathCost, sameCoord,
} from '../map/pathfinding';
import {
  castleEntrance, guardianAt, guardiansCovering, objectEntranceTile,
  isObjectActive,
} from '../map/occupancy';
import { revealForPlayer } from '../map/visibility';
import { foragerRate, logisticsRate, skillRank } from '../heroBehaviors';
import { activeHero as selectedActiveHero, findHero, findOwnedHero } from '../heroes';
import type {
  Army, Castle, GameState, Hero, MapObject,
} from '../types';
import { discoverMapObject } from '../discovery';
import { checkVictory } from './outcomes';
import { TERRAIN, terrainIdAt } from '../../content/terrain';
import { learnGuildSpells, visitShrine } from './magic';
import { diplomacyTerms } from '../skills/diplomacy';
import { addItem, sellTradeGoods } from './items';
import { offerChestChoice } from './chests';
import { adventureMovementCost, adventurePath } from './navigation';
import { dealBargains } from './bargains';
import { visitCreativeObject } from './mapObjects';
import { artifactEffectTotal } from '../artifacts';
import { addArtifact, consumeEquippedArtifact, hasEquippedArtifact } from '../artifacts';
import { canClaimWeeklyBeast } from '../skills/expansionHooks';
import { canCastIntoGarrison } from '../skills/expansionHooks';
import { emptyArtifacts } from '../artifacts';
import { buildingIsActive } from './buildingStatus';
export { adventurePath } from './navigation';
export { diplomacyTerms } from '../skills/diplomacy';

function objectAt(
  state: GameState,
  position: { x: number; y: number },
): MapObject | undefined {
  return state.map.objects.find((object) => {
    if (object.kind === 'cache' || object.kind === 'obstacle') return false;
    if (!sameCoord(objectEntranceTile(object), position)) return false;
    if (object.kind === 'pile') return !object.collected;
    if (object.kind === 'chest') return !object.collected;
    if (object.kind === 'item') return !object.collected;
    if (['flotsam', 'sealedCask', 'castaway', 'messageBottle'].includes(object.kind)) {
      return !('collected' in object) || !object.collected;
    }
    if (object.kind === 'lock') return !object.cleared;
    return true;
  });
}

function beginBattle(
  state: GameState,
  defenderArmy: Army,
  context: Parameters<typeof createBattle>[4],
  defenderHero: Hero | null = null,
  walls = false,
  keep = false,
): void {
  const hero = selectedActiveHero(state);
  const battleTerrain = terrainIdAt(state.map, context.destination);
  const battleContext = {
    ...context,
    terrain: battleTerrain,
    onSeam: state.map.seams?.some((seam) => sameCoord(seam, context.destination)) ?? false,
    battlefield: context.battlefield ?? (battleTerrain === 'water' ? 'sea'
      : battleTerrain === 'mire' ? 'mire' : 'land'),
  };
  const [battle, nextRng] = createBattle(
    hero.army, defenderArmy, hero, defenderHero, battleContext, state.rng, walls,
    state.omen, keep, state.week,
  );
  state.rng = nextRng;
  state.battle = battle;
  battle.attackerHero.withdrawalGold = state.players[hero.owner].resources.gold;
  if (battle.defenderHero && defenderHero) {
    battle.defenderHero.withdrawalGold = state.players[defenderHero.owner].resources.gold;
  }
  battle.attackerHero.luck += hero.adventureEffects.nextBattleLuckBonus;
  hero.adventureEffects.nextBattleLuckBonus = 0;
  if (battle.defenderHero && defenderHero) {
    battle.defenderHero.luck += defenderHero.adventureEffects.nextBattleLuckBonus;
    defenderHero.adventureEffects.nextBattleLuckBonus = 0;
  }
  if (hero.adventureEffects.timingBlessingUntilDay >= state.day) {
    battle.timingSpeedBonus.attacker = 1;
  }
  if (defenderHero?.adventureEffects.timingBlessingUntilDay
      && defenderHero.adventureEffects.timingBlessingUntilDay >= state.day) {
    battle.timingSpeedBonus.defender = 1;
  }
  for (const [side, combatant] of [
    ['attacker', hero], ['defender', defenderHero],
  ] as const) {
    if (!combatant?.adventureEffects.nextBattleMeterBonus) continue;
    const bonus = combatant.adventureEffects.nextBattleMeterBonus;
    battle.stacks.filter((stack) => stack.side === side && stack.count > 0)
      .forEach((stack) => { stack.morale += bonus; });
    combatant.adventureEffects.nextBattleMeterBonus = 0;
  }
  if (battle.timingSpeedBonus.attacker || battle.timingSpeedBonus.defender) {
    battle.stacks.forEach((stack) => {
      const bonus = battle.timingSpeedBonus[stack.side];
      if (bonus) stack.roundSpeedBonus = (stack.roundSpeedBonus ?? 0) + bonus;
    });
    battle.order = turnOrder(battle.stacks);
    battle.currentStackId = battle.order[0] ?? null;
  }
  const terrain = battleTerrain;
  const object = state.map.objects.find((item) =>
    sameCoord(item.position, context.destination));
  battle.resonance = context.kind === 'castle' ? 'rite'
    : object?.kind === 'mine' ? 'craft'
      : TERRAIN[terrain].resonance;
  const placedResonance = state.mapEffects.find((effect) => effect.kind === 'resonance'
    && sameCoord(effect.position, context.destination));
  if (placedResonance?.kind === 'resonance') {
    battle.resonance = placedResonance.school;
    state.mapEffects = state.mapEffects.filter((effect) => effect.id !== placedResonance.id);
  }
  if (hero.declaredResonance?.day === state.day) {
    battle.chosenResonance.attacker = hero.declaredResonance.school;
    hero.attunementResonanceUsedDay = state.day;
    hero.declaredResonance = null;
  }
  if (defenderHero?.declaredResonance?.day === state.day) {
    battle.chosenResonance.defender = defenderHero.declaredResonance.school;
    defenderHero.attunementResonanceUsedDay = state.day;
    defenderHero.declaredResonance = null;
  }
  if (state.magicDisabled) {
    battle.attackerHero.knownSpells = [];
    if (battle.defenderHero) battle.defenderHero.knownSpells = [];
  }
  state.phase = 'combat';
}

function enterMapObject(state: GameState, object: MapObject, hero: Hero): void {
  discoverMapObject(state.players[hero.owner], object);
  if (object.kind === 'pile') {
    const amount = Math.floor(object.amount * (1 + foragerRate(hero)));
    state.players[hero.owner].resources[object.resource] += amount;
    object.collected = true;
    state.lastMessage = `Collected ${amount} ${object.resource}.`;
    return;
  }
  if (object.kind === 'item') {
    if (!addItem(hero, object.item)) {
      state.lastMessage = 'Inventory full.';
      return;
    }
    object.collected = true;
    state.lastMessage = 'Item collected.';
    return;
  }
  if (object.kind === 'flotsam') {
    state.players[hero.owner].resources.timber += object.timber;
    state.players[hero.owner].resources.gold += object.gold;
    object.collected = true;
    state.lastMessage = `Salvaged ${object.timber} timber and ${object.gold} gold.`;
    return;
  }
  if (object.kind === 'sealedCask') {
    offerChestChoice(state, object.id, hero);
    state.lastMessage = 'The sealed cask offers gold, experience, or salvage.';
    return;
  }
  if (object.kind === 'castaway') {
    hero.xp += 500;
    if (object.item) addItem(hero, object.item);
    object.collected = true;
    state.lastMessage = `${object.story} (+500 XP)`;
    checkVictory(state);
    return;
  }
  if (object.kind === 'messageBottle') {
    object.collected = true;
    state.lastMessage = object.rumour;
    return;
  }
  if (object.kind === 'whirlpool') {
    crossWhirlpool(state, object, hero);
    return;
  }
  if (object.kind === 'manaSpring') {
    if (object.visitedWeek[hero.id] === state.week) {
      state.lastMessage = 'The spring is quiet for this hero this week.';
    } else {
      object.visitedWeek[hero.id] = state.week; hero.mana = hero.knowledge * 10;
      state.lastMessage = 'The spring restores full mana.';
    }
    return;
  }
  if (object.kind === 'drownedBell') {
    if (!object.visitedBy.includes(hero.id)) {
      object.visitedBy.push(hero.id); hero.movement += 1000;
      hero.adventureEffects.timingBlessingUntilDay = Math.max(
        hero.adventureEffects.timingBlessingUntilDay, state.day,
      );
      state.lastMessage = 'The Drowned Bell lends speed and perfect timing.';
    }
    return;
  }
  if (object.kind === 'lighthouse') {
    object.owner = hero.owner; state.lastMessage = 'The lighthouse is flagged.'; return;
  }
  if (object.kind === 'shipwreck' && !object.cleared) {
    claimSeaReward(state, object.reward, hero); object.cleared = true;
    state.lastMessage = 'The shipwreck yields its salvage.'; return;
  }
  if (object.kind === 'richVein') {
    if (object.depleted) {
      state.lastMessage = 'The Rich Vein has crumbled.';
      return;
    }
    object.owner = hero.owner;
    if (object.flaggedOnDay === null) object.flaggedOnDay = state.day;
    state.lastMessage = 'Rich Vein flagged.';
    return;
  }
  if (object.kind === 'waystation') {
    if (object.visitedOnDay[hero.id] === state.day) {
      state.lastMessage = 'This hero has used the Waystation today.';
      return;
    }
    object.visitedOnDay[hero.id] = state.day;
    hero.movement = Math.round(HERO_MOVE_POINTS * (1 + logisticsRate(hero)));
    state.lastMessage = 'The Waystation restores full movement.';
    return;
  }
  if (object.kind === 'mine') {
    object.owner = hero.owner;
    object.cleared = true;
    state.lastMessage = `${object.resource} mine claimed.`;
    return;
  }
  if (object.kind === 'shrine') {
    object.cleared = true;
    visitShrine(state, object.id, hero);
    return;
  }
  if (object.kind === 'lock' && !object.cleared) {
    claimLock(state, object, hero);
  } else if (object.kind === 'chest') {
    object.cleared = true;
    offerChestChoice(state, object.id, hero);
  } else visitCreativeObject(state, object, hero);
}

function crossWhirlpool(
  state: GameState, object: Extract<MapObject, { kind: 'whirlpool' }>, hero: Hero,
): Extract<MapObject, { kind: 'whirlpool' }> {
  const paired = state.map.objects.find((candidate) => candidate.id === object.pairedId);
  if (!paired || paired.kind !== 'whirlpool') throw new Error('Whirlpool pair is missing');
  const weakest = hero.army.flatMap((stack, slot) => stack ? [{ stack, slot }] : [])
    .sort((a, b) => a.stack.count * UNITS[a.stack.unitId].hp
      - b.stack.count * UNITS[b.stack.unitId].hp || a.slot - b.slot)[0];
  if (weakest) weakest.stack.count = Math.max(0,
    weakest.stack.count - Math.max(1, Math.ceil(weakest.stack.count * 0.25)));
  if (weakest?.stack.count === 0) hero.army[weakest.slot] = null;
  hero.position = { ...paired.position };
  const boat = state.map.objects.find((candidate) => candidate.id === hero.embarkedBoatId);
  if (boat?.kind === 'boat') boat.position = { ...paired.position };
  state.lastMessage = 'The whirlpool concedes passage and takes its quarter.';
  return paired;
}

type GuardianObject = Extract<MapObject, { kind: 'guardian' }>;

function claimLock(
  state: GameState, object: Extract<MapObject, { kind: 'lock' }>, hero: Hero,
): void {
  object.cleared = true;
  if (hasEquippedArtifact(hero, 'hungryBlade')) {
    consumeEquippedArtifact(hero, 'hungryBlade');
    state.eventLog.push('The defeated lock releases the Hungry Blade.');
  }
  const player = state.players[hero.owner];
  player.resources.gold += object.reward.gold ?? 0;
  player.resources.essence += object.reward.essence ?? 0;
  object.reward.gold = undefined;
  object.reward.essence = undefined;
  object.reward.items = (object.reward.items ?? []).filter((item) => !addItem(hero, item));
  for (const artifact of object.reward.artifacts ?? []) addArtifact(hero, artifact);
  object.reward.artifacts = [];
  if (object.reward.teachesSpell && !hero.knownSpells.includes(object.reward.teachesSpell)) {
    hero.knownSpells.push(object.reward.teachesSpell);
  }
  object.reward.teachesSpell = undefined;
  state.lastMessage = `${object.name} yields.`;
}

function weakGuardiansFlee(
  state: GameState, guardian: GuardianObject, hero: Hero,
): boolean {
  const percent = artifactEffectTotal(hero, 'weak_guardians_flee', 'percent');
  if (!percent || armyPower(makeArmy(guardian.army)) > armyPower(hero.army) * percent / 100) {
    return false;
  }
  clearGuardian(state, guardian, hero);
  state.lastMessage = 'The Quiet Horseshoe turns the weaker guardians aside.';
  return true;
}

function beginGuardianBattle(
  state: GameState, guardian: GuardianObject, hero: Hero, trigger: { x: number; y: number },
  deliberate = false,
): void {
  beginBattle(state, splitGuardianArmy(guardian.army, guardian.split), {
    kind: 'guardian', targetId: guardian.id,
    destination: trigger, attackerHeroId: hero.id,
    battlefield: terrainIdAt(state.map, guardian.position) === 'water'
      ? 'sea' : 'land',
    ...(deliberate ? { completeMoveTo: guardian.position } : {}),
  });
}

function offerDiplomacy(
  state: GameState,
  guardian: GuardianObject,
  hero: Hero,
  deliberate = false,
): boolean {
  const terms = diplomacyTerms(hero, guardian);
  if (!terms) return false;
  state.pendingChoice = {
    kind: 'diplomacy', objectId: guardian.id, playerId: hero.owner, heroId: hero.id,
    ...terms, canStandAside: Boolean(terms.canStandAside),
    ...(deliberate ? { completeMoveTo: { ...guardian.position } } : {}),
  };
  state.lastMessage = 'The guardians are willing to bargain.';
  return true;
}

function clearGuardian(state: GameState, guardian: GuardianObject, hero: Hero): void {
  if (guardian.drop && addItem(hero, guardian.drop)) guardian.drop = undefined;
  state.map.objects = state.map.objects.filter((object) => object.id !== guardian.id);
}

export function chooseDiplomacy(
  state: GameState,
  choice: 'fight' | 'disband' | 'recruit' | 'standAside',
): void {
  const pending = state.pendingChoice;
  if (pending?.kind !== 'diplomacy') throw new Error('No diplomacy choice pending');
  const hero = findOwnedHero(state, pending.playerId, pending.heroId);
  const object = state.map.objects.find((candidate) => candidate.id === pending.objectId);
  if (!hero || !object || object.kind !== 'guardian') {
    throw new Error('Diplomacy encounter missing');
  }
  const guardian = object;
  state.pendingChoice = null;
  if (choice === 'fight') {
    beginGuardianBattle(
      state, guardian, hero, hero.position, Boolean(pending.completeMoveTo),
    );
    return;
  }
  const cost = choice === 'recruit' ? pending.recruitCost : pending.disbandCost;
  if (cost === null || !canAfford(state.players[pending.playerId].resources, { gold: cost })) {
    throw new Error('Cannot afford diplomacy');
  }
  state.players[pending.playerId].resources =
    pay(state.players[pending.playerId].resources, { gold: cost });
  if (choice === 'standAside') {
    if (!pending.canStandAside) throw new Error('Stand aside is unavailable');
    guardian.stoodAsideFor = [
      ...(guardian.stoodAsideFor ?? []), hero.id,
    ];
    state.lastMessage = 'The guardians stand aside but keep their post.';
    return;
  }
  if (choice === 'recruit') {
    for (const stack of guardian.army) {
      hero.army = addUnits(hero.army, stack.unitId, stack.count)!;
    }
  }
  clearGuardian(state, guardian, hero);
  if (pending.completeMoveTo) hero.position = { ...pending.completeMoveTo };
}

export function chooseToll(state: GameState, choice: 'pay' | 'fight'): void {
  const pending = state.pendingChoice;
  if (pending?.kind !== 'toll') throw new Error('No Toll Gate choice pending');
  const hero = findOwnedHero(state, pending.playerId, pending.heroId);
  const object = state.map.objects.find((candidate): candidate is Extract<
    MapObject, { kind: 'tollGate' }
  > => candidate.id === pending.objectId && candidate.kind === 'tollGate');
  if (!hero || !object) throw new Error('Toll Gate missing');
  state.pendingChoice = null;
  if (choice === 'pay') {
    if (state.players[hero.owner].resources.gold < pending.cost) {
      throw new Error('Cannot pay the toll');
    }
    state.players[hero.owner].resources.gold -= pending.cost;
    object.paidBy.push(hero.id);
    state.lastMessage = 'The Keeper raises the bar for this passage.';
  } else {
    const guardian = state.map.objects.find((candidate): candidate is GuardianObject =>
      candidate.kind === 'guardian' && candidate.protects === object.id);
    if (!guardian) throw new Error('Toll guardian missing');
    beginGuardianBattle(state, guardian, hero, hero.position);
  }
}

function claimSeaReward(state: GameState, reward: Extract<MapObject,
{ kind: 'shipwreck' | 'sirenRocks' }>['reward'], hero: Hero): void {
  state.players[hero.owner].resources.gold += reward.gold ?? 0;
  state.players[hero.owner].resources.essence += reward.essence ?? 0;
  for (const item of reward.items ?? []) addItem(hero, item);
  for (const artifact of reward.artifacts ?? []) addArtifact(hero, artifact);
  if (reward.teachesSpell && !hero.knownSpells.includes(reward.teachesSpell)) {
    hero.knownSpells.push(reward.teachesSpell);
  }
  reward.gold = undefined; reward.essence = undefined;
  reward.items = []; reward.artifacts = []; reward.teachesSpell = undefined;
}

export function chooseSiren(state: GameState, choice: 'listen' | 'rowPast'): void {
  const pending = state.pendingChoice;
  if (pending?.kind !== 'siren') throw new Error('No Siren choice pending');
  const hero = findOwnedHero(state, pending.playerId, pending.heroId);
  const rocks = state.map.objects.find((object) => object.id === pending.objectId);
  if (!hero || rocks?.kind !== 'sirenRocks') throw new Error('Siren Rocks missing');
  rocks.approachedBy = [...(rocks.approachedBy ?? []), hero.id];
  state.pendingChoice = null;
  if (choice === 'rowPast') {
    hero.movement = Math.max(0, hero.movement - 300);
    state.lastMessage = 'The crew rows past the song at exhausting speed.';
    return;
  }
  const guardian = state.map.objects.find((object): object is GuardianObject =>
    object.kind === 'guardian' && object.protects === rocks.id);
  if (!guardian) throw new Error('The Sirens have no guardian company');
  beginGuardianBattle(state, guardian, hero, hero.position);
}

function guardianPathDistance(state: GameState, hero: Hero, guardian: GuardianObject): number {
  const path = findPath(state.map, hero.position, guardian.position, new Set(), hero, state.omen);
  return path ? pathCost(state.map, path, hero, state.omen) : Number.POSITIVE_INFINITY;
}

function encounterGuardian(
  state: GameState, guardian: GuardianObject, hero: Hero,
  trigger: { x: number; y: number }, deliberate: boolean,
): void {
  discoverMapObject(state.players[hero.owner], guardian);
  if (!deliberate && hasEquippedArtifact(hero, 'thirdBoot')
      && hero.adventureEffects.ignoredAggroDay !== state.day) {
    hero.adventureEffects.ignoredAggroDay = state.day;
    state.lastMessage = 'The Third Boot carries the hero past one alarmed guard.';
    return;
  }
  if (guardian.army.every((stack) => UNITS[stack.unitId].abilities.includes('beast'))
      && canClaimWeeklyBeast(
        hero, armyPower(hero.army), armyPower(makeArmy(guardian.army)),
        state.week, hero.beastClaimedWeek,
      )) {
    let joined = hero.army.map((stack) => stack ? { ...stack } : null);
    for (const stack of guardian.army) {
      const next = addUnits(joined, stack.unitId, stack.count);
      if (!next) { joined = []; break; }
      joined = next;
    }
    if (joined.length) {
      hero.army = joined;
      hero.beastClaimedWeek = state.week;
      clearGuardian(state, guardian, hero);
      if (deliberate) hero.position = { ...guardian.position };
      state.lastMessage = 'The neutral beasts recognize their master and join freely.';
      return;
    }
  }
  if (weakGuardiansFlee(state, guardian, hero)) {
    if (deliberate) hero.position = { ...guardian.position };
    return;
  }
  if (!offerDiplomacy(state, guardian, hero, deliberate)) {
    beginGuardianBattle(state, guardian, hero, trigger, deliberate);
  }
}

function enterCastle(state: GameState, castle: Castle, hero: Hero): void {
  const entrance = castleEntrance(castle);
  if (castle.owner === hero.owner) {
    hero.mana = hero.knowledge * 10;
    const learned = learnGuildSpells(hero, castle);
    const sold = sellTradeGoods(state, hero, entrance);
    state.lastMessage = sold > 0
      ? `Trade Goods sold for ${sold} gold.`
      : learned.length
      ? `Hero learned ${learned.length} Mage Guild spell${learned.length === 1 ? '' : 's'}.`
      : 'Hero entered the castle.';
    if (buildingIsActive(castle, 'bargainPost')
        && castle.bargainOfferWeek !== state.week && hero.debts.length < 2) {
      castle.bargainOfferWeek = state.week;
      dealBargains(state, hero, 2, 'post');
    }
    return;
  }
  const defenderPlayer = castle.owner === 'neutral' ? null : state.players[castle.owner];
  const defenderHero = defenderPlayer?.heroes.find((candidate) =>
    candidate.alive && sameCoord(candidate.position, entrance)) ?? null;
  const installedWarden = castle.wardenHeroId ? findHero(state, castle.wardenHeroId) : null;
  const remoteWarden = !defenderHero && installedWarden?.alive
    && installedWarden.owner === castle.owner ? installedWarden : null;
  const wardenCanCast = Boolean(remoteWarden && canCastIntoGarrison(
    remoteWarden, remoteWarden.position, entrance,
  ));
  const battleCommander: Hero | null = defenderHero ?? (remoteWarden ? {
    ...remoteWarden,
    luck: 0, moraleBonus: 0,
    knownSpells: wardenCanCast ? [...remoteWarden.knownSpells] : [],
    upgradedSpells: wardenCanCast ? [...remoteWarden.upgradedSpells] : [],
    skills: {
      warden: remoteWarden.skills.warden,
      ...((remoteWarden.skills.warden ?? 0) >= 2
        ? { command: remoteWarden.skills.command } : {}),
    },
    artifacts: emptyArtifacts(), inventory: Array(remoteWarden.inventory.length).fill(null),
  } : null);
  const combined = castle.garrison.map((stack) => stack ? { ...stack } : null);
  if (defenderHero) {
    for (const stack of defenderHero.army) {
      if (!stack) continue;
      const withUnits = addUnits(combined, stack.unitId, stack.count);
      if (withUnits) combined.splice(0, combined.length, ...withUnits);
    }
  }
  if (!armyAlive(combined)) {
    if (castle.vault) {
      const multiplier = artifactEffectTotal(hero, 'neutral_town_intel') > 0 ? 2 : 1;
      for (const resource of Object.keys(castle.vault) as Array<keyof typeof castle.vault>) {
        state.players[hero.owner].resources[resource] += castle.vault[resource] * multiplier;
      }
      castle.vault = undefined;
    }
    castle.owner = hero.owner;
    castle.wardenHeroId = null;
    const sold = sellTradeGoods(state, hero, entrance);
    state.lastMessage = sold > 0
      ? `${hero.owner} captured ${castle.id}; Trade Goods sold for ${sold} gold.`
      : `${hero.owner} captured ${castle.id}.`;
    checkVictory(state);
    return;
  }
  beginBattle(state, combined, {
    kind: 'castle', targetId: castle.id, destination: entrance,
    attackerHeroId: hero.id, defenderHeroId: defenderHero?.id,
    defenderPlayerId: castle.owner === 'neutral' ? undefined : castle.owner,
    remoteDefenderHeroId: remoteWarden?.id,
  }, battleCommander, buildingIsActive(castle, 'walls'), buildingIsActive(castle, 'keep'));
  if (state.battle && buildingIsActive(castle, 'lychgate')) {
    state.battle.deathTriggerMultiplier.defender = 2;
  }
  if (state.battle && buildingIsActive(castle, 'pyreOfTheFallen')) {
    state.battle.bloodPriceBonus.defender = 10;
  }
}

export function moveHero(
  state: GameState,
  destination: { x: number; y: number },
  avoidAggro = true,
): void {
  const hero = selectedActiveHero(state);
  if (sameCoord(hero.position, destination)) {
    const castle = state.castles.find((item) => sameCoord(castleEntrance(item), destination));
    const object = objectAt(state, destination);
    if (castle) enterCastle(state, castle, hero);
    else if (object) enterMapObject(state, object, hero);
    else throw new Error('No interaction at destination');
    return;
  }
  const origin = { ...hero.position };
  const path = adventurePath(state, destination, { avoidAggro });
  if (!path || path.length < 2) throw new Error('No path to destination');
  const passage = state.mapEffects.some((effect) => effect.kind === 'passage'
    && effect.owner === hero.owner && effect.expiresDay >= state.day
    && effect.entrances.some((entry) => sameCoord(entry, hero.position))
    && effect.entrances.some((entry) => sameCoord(entry, destination)));
  const freeForest = state.players[hero.owner].adventureEffects.greenTideUntilWeek
    >= state.week;
  let reached = path[0];
  let exitedWhirlpoolId: string | null = null;
  for (let index = 1; index < path.length; index += 1) {
    const step = path[index];
    const cost = passage ? 0 : adventureMovementCost(state, hero, reached, step, freeForest);
    if (cost > hero.movement) break;
    hero.movement -= cost;
    const fromWater = terrainIdAt(state.map, reached) === 'water';
    const toWater = terrainIdAt(state.map, step) === 'water';
    const whirlpool = state.map.objects.find((object) => object.kind === 'whirlpool'
      && sameCoord(object.position, reached)
      && state.map.objects.some((paired) => paired.id === object.pairedId
        && sameCoord(paired.position, step)));
    if (whirlpool?.kind === 'whirlpool') {
      exitedWhirlpoolId = crossWhirlpool(state, whirlpool, hero).id;
    } else if (!fromWater && toWater) {
      const boat = state.map.objects.find((object) => object.kind === 'boat'
        && sameCoord(object.position, step) && (!object.occupiedBy || object.occupiedBy === hero.id));
      if (!boat || boat.kind !== 'boat') throw new Error('A boat is required');
      hero.embarkedBoatId = boat.id; boat.occupiedBy = hero.id; boat.owner = hero.owner;
    } else if (fromWater && toWater && hero.embarkedBoatId) {
      const boat = state.map.objects.find((object) => object.id === hero.embarkedBoatId);
      if (boat?.kind === 'boat') boat.position = { ...step };
    } else if (fromWater && !toWater && hero.embarkedBoatId) {
      const boat = state.map.objects.find((object) => object.id === hero.embarkedBoatId);
      if (boat?.kind === 'boat') { boat.position = { ...reached }; boat.occupiedBy = null; }
      hero.embarkedBoatId = null;
    }
    const direct = guardianAt(state.map, step);
    const covering = guardiansCovering(state.map, step, hero.id)
      .sort((a, b) => guardianPathDistance(state, hero, a)
        - guardianPathDistance(state, hero, b) || a.id.localeCompare(b.id));
    const guardian = direct ?? covering[0];
    if (!direct) hero.position = { ...step };
    reached = step;
    const sirens = state.map.objects.find((object) => object.kind === 'sirenRocks'
      && !object.cleared && !(object.approachedBy ?? []).includes(hero.id)
      && Math.max(Math.abs(object.position.x - step.x), Math.abs(object.position.y - step.y)) === 2);
    if (sirens?.kind === 'sirenRocks') {
      state.pendingChoice = {
        kind: 'siren', objectId: sirens.id, playerId: hero.owner, heroId: hero.id,
      };
      hero.pathMemory = path.slice(index).map((coord) => ({ ...coord }));
      state.lastMessage = 'The song is about you, specifically.';
      return;
    }
    if (guardian) {
      hero.pathMemory = path.slice(index).map((coord) => ({ ...coord }));
      state.players[hero.owner].explored = revealForPlayer(
        state.players[hero.owner].explored, state.map,
        state.players[hero.owner].heroes,
        state.castles.filter((castle) => castle.owner === hero.owner),
      );
      encounterGuardian(state, guardian, hero, step, Boolean(direct));
      return;
    }
  }
  if (sameCoord(reached, path[0])) throw new Error('Not enough movement');
  if (!sameCoord(origin, hero.position)) {
    const departedGate = state.map.objects.find((object) => object.kind === 'tollGate'
      && sameCoord(objectEntranceTile(object), origin));
    if (departedGate?.kind === 'tollGate') {
      departedGate.paidBy = departedGate.paidBy.filter((heroId) => heroId !== hero.id);
    }
  }
  for (const candidate of Object.values(state.players).flatMap((player) => player.heroes)) {
    if (candidate.adventureEffects.falseColors && Object.values(state.players)
      .flatMap((player) => player.heroes).some((other) => other.alive
        && other.owner !== candidate.owner && Math.max(
          Math.abs(other.position.x - candidate.position.x),
          Math.abs(other.position.y - candidate.position.y),
        ) <= 1)) candidate.adventureEffects.falseColors = null;
  }
  const reachedIndex = path.findIndex((coord) => sameCoord(coord, hero.position));
  hero.pathMemory = path.slice(Math.max(0, reachedIndex))
    .map((coord) => ({ ...coord }));
  state.players[hero.owner].explored = revealForPlayer(
    state.players[hero.owner].explored, state.map, state.players[hero.owner].heroes,
    state.castles.filter((castle) => castle.owner === hero.owner),
  );
  if (!sameCoord(reached, destination)) {
    state.lastMessage = 'Hero moved as far as possible.';
    return;
  }

  const enemyHero = Object.values(state.players).flatMap((player) => player.heroes)
    .find((other) => other?.alive && other.owner !== hero.owner
      && sameCoord(other.position, destination));
  const castle = state.castles.find((item) => sameCoord(castleEntrance(item), destination));
  if (castle) {
    enterCastle(state, castle, hero);
  } else if (enemyHero) {
    beginBattle(state, enemyHero.army, {
      kind: 'hero', targetId: enemyHero.id, destination,
      attackerHeroId: hero.id, defenderHeroId: enemyHero.id,
      defenderPlayerId: enemyHero.owner,
      battlefield: hero.embarkedBoatId && enemyHero.embarkedBoatId ? 'sea' : 'land',
    }, enemyHero);
  } else {
    const object = objectAt(state, destination);
    if (object && object.id !== exitedWhirlpoolId) enterMapObject(state, object, hero);
  }
  if (skillRank(hero, 'forager') >= 2 && state.phase === 'adventure'
      && !state.pendingChoice) {
    const range = skillRank(hero, 'forager') === 3
      ? SKILLS.forager.values.rank3Range : SKILLS.forager.values.rank2Range;
    for (const object of state.map.objects) {
      if (object.kind === 'pile' && !object.collected
          && Math.max(Math.abs(object.position.x - hero.position.x),
            Math.abs(object.position.y - hero.position.y))
            <= range) {
        enterMapObject(state, object, hero);
      }
    }
  }
}

export function pickupObject(state: GameState, objectId: string): void {
  const hero = selectedActiveHero(state);
  const object = state.map.objects.find((candidate) => candidate.id === objectId);
  if (!object || !['pile', 'item', 'chest', 'flotsam', 'sealedCask', 'castaway',
    'messageBottle'].includes(object.kind)) {
    throw new Error('This object cannot be picked up at range');
  }
  if (!isObjectActive(object)) throw new Error('Pickup is no longer available');
  if (object.kind === 'item' && !hero.inventory.includes(null)) {
    throw new Error('Inventory full');
  }
  const rank = skillRank(hero, 'forager');
  const range = rank >= 3 ? SKILLS.forager.values.rank3Range
    : rank >= 2 ? SKILLS.forager.values.rank2Range : 1;
  const position = objectEntranceTile(object);
  if (Math.max(Math.abs(position.x - hero.position.x),
    Math.abs(position.y - hero.position.y)) > range) {
    throw new Error('Pickup is out of range');
  }
  if (hero.movement < RANGED_PICKUP_MOVE_COST) throw new Error('Not enough movement');
  hero.movement -= RANGED_PICKUP_MOVE_COST;
  enterMapObject(state, object, hero);
}
