import {
  ARTIFACTS, ARTIFACT_SETS, EQUIPMENT_SLOTS, KIT_PIECES, slotAccepts,
} from '../content/artifacts';
import { findOwnedHero } from './heroes';
import type { ArtifactEffectTag } from '../content/artifacts';
import type {
  ArtifactInstance, EquipmentSlotId, GameState, Hero, HeroArtifacts,
  PrimaryStat, SpellSchool, BattleSide, BattleState, Player, ResourceCost, Resources,
} from './types';
import { terrainIdAt } from '../content/terrain';
import { sameCoord } from './map/pathfinding';
import {
  assertHeroArmyFitsCapacity, synchronizeHeroArmyCapacity,
} from './army';

function reliquarianRank(hero: { skills?: Hero['skills'] }): number {
  return hero.skills?.reliquarian ?? 0;
}

export function emptyArtifacts(): HeroArtifacts {
  return {
    equipment: Object.fromEntries(
      EQUIPMENT_SLOTS.map((slot) => [slot, null]),
    ) as HeroArtifacts['equipment'],
    backpack: [],
  };
}

export function cloneArtifacts(artifacts: HeroArtifacts): HeroArtifacts {
  return {
    equipment: Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => {
      const item = artifacts.equipment[slot];
      return [slot, item ? { ...item } : null];
    })) as HeroArtifacts['equipment'],
    backpack: artifacts.backpack.map((item) => ({ ...item })),
  };
}

export function equippedArtifacts(
  hero: Pick<Hero, 'artifacts'> | { artifacts: HeroArtifacts },
): ArtifactInstance[] {
  return EQUIPMENT_SLOTS.flatMap((slot) => {
    const item = hero.artifacts.equipment[slot];
    return item ? [item] : [];
  });
}

export function effectiveArtifactDefinition(item: ArtifactInstance) {
  const definition = ARTIFACTS[item.id];
  return definition.effects.includes('weekly_backpack_copy') && item.copiedArtifactId
    ? ARTIFACTS[item.copiedArtifactId] : definition;
}

export function artifactEffectTotal(
  hero: Pick<Hero, 'artifacts'> | { artifacts: HeroArtifacts },
  effect: ArtifactEffectTag,
  value: 'amount' | 'percent' = 'amount',
): number {
  return equippedArtifacts(hero).reduce((sum, item) => {
    const definition = effectiveArtifactDefinition(item);
    const multiplier = definition.class === 'charm'
      && reliquarianRank(hero as { skills?: Hero['skills'] }) >= 2 ? 1.5 : 1;
    return sum + (definition.effects.includes(effect)
      ? (definition.values?.[value] ?? 0) * multiplier : 0);
  }, 0);
}

export function artifactStatBonus(
  hero: Pick<Hero, 'artifacts'> | { artifacts: HeroArtifacts },
  stat: PrimaryStat,
): number {
  const pieces = equippedArtifacts(hero);
  const ownBonuses = pieces.reduce(
    (sum, item) => sum + (effectiveArtifactDefinition(item).values?.[stat] ?? 0)
      * (effectiveArtifactDefinition(item).class === 'charm'
        && reliquarianRank(hero as { skills?: Hero['skills'] }) >= 2 ? 1.5 : 1),
    0,
  );
  const debts = 'debts' in hero ? (hero as { debts?: unknown[] }).debts?.length ?? 0 : 0;
  const debtBonus = hasArtifactEffect(hero, 'debt_slot_bonus')
    ? debts * Math.max(1, artifactEffectTotal(hero, 'debt_slot_bonus')) : 0;
  return ownBonuses + (kitPieceCount(hero) >= 2 ? 2 : 0) + debtBonus;
}

/** Campaign-roster conditional bonus. Kept outside the definition lookup so battle setup must
 * serialize the hero count it evaluated instead of consulting mutable global state later. */
export function conditionalArtifactStatBonus(
  hero: Pick<Hero, 'artifacts'> | { artifacts: HeroArtifacts }, ownedHeroCount: number,
  rosterHasEffect = hasArtifactEffect(hero, 'exact_hero_count_stats'),
): number {
  if (!rosterHasEffect) return 0;
  return ownedHeroCount === 2 ? 2 : ownedHeroCount >= 3 ? -1 : 0;
}

export function rosterArtifactStatBonus(player: Pick<Player, 'heroes'>): number {
  const living = player.heroes.filter((hero) => hero.alive);
  return living.some((hero) => hasArtifactEffect(hero, 'exact_hero_count_stats'))
    ? living.length === 2 ? 2 : living.length >= 3 ? -1 : 0 : 0;
}

export function effectivePlayerPrimaryStat(
  player: Pick<Player, 'heroes'>, hero: Hero, stat: PrimaryStat,
): number {
  return effectivePrimaryStat(hero, stat) + rosterArtifactStatBonus(player);
}

export function effectivePrimaryStat(
  hero: Pick<Hero, 'artifacts'> & Record<PrimaryStat, number>,
  stat: PrimaryStat,
): number {
  return hero[stat] + artifactStatBonus(hero, stat);
}

export function kitPieceCount(
  hero: Pick<Hero, 'artifacts'> | { artifacts: HeroArtifacts },
): number {
  return new Set(equippedArtifacts(hero)
    .filter((item) => KIT_PIECES.includes(item.id))
    .map((item) => item.id)).size;
}

export function kitBonuses(
  hero: Pick<Hero, 'artifacts'> | { artifacts: HeroArtifacts },
): {
  pieces: number; allStats: boolean; revealEssenceAndSeams: boolean;
  allSpellsUpgraded: boolean;
  allResonances: boolean; canUnstitch: boolean;
} {
  const pieces = kitPieceCount(hero);
  return {
    pieces,
    allStats: pieces >= 2,
    revealEssenceAndSeams: pieces >= 2,
    allSpellsUpgraded: pieces >= 3,
    allResonances: pieces >= 4,
    canUnstitch: pieces >= 4,
  };
}

export function chosenArtifactResonance(
  hero: Pick<Hero, 'artifacts'> | { artifacts: HeroArtifacts },
): SpellSchool | null {
  return equippedArtifacts(hero).find((item) => item.id === 'seamstone')
    ?.chosenSchool ?? null;
}

export function addArtifact(hero: Hero, artifact: ArtifactInstance): void {
  hero.artifacts.backpack.push({ ...artifact });
}

export function hasEquippedArtifact(
  hero: { artifacts: HeroArtifacts },
  artifactId: ArtifactInstance['id'],
): boolean {
  return equippedArtifacts(hero).some((item) => item.id === artifactId);
}

export function hasArtifactEffect(
  hero: Pick<Hero, 'artifacts'> | { artifacts: HeroArtifacts }, effect: ArtifactEffectTag,
): boolean {
  return equippedArtifacts(hero).some((item) => effectiveArtifactDefinition(item).effects.includes(effect));
}

export function equippedArtifactWithEffect(
  hero: Pick<Hero, 'artifacts'> | { artifacts: HeroArtifacts }, effect: ArtifactEffectTag,
): ArtifactInstance | undefined {
  return equippedArtifacts(hero).find((item) => effectiveArtifactDefinition(item).effects.includes(effect));
}

export function artifactSetProgress(
  hero: Pick<Hero, 'artifacts'> | { artifacts: HeroArtifacts }, setId: string,
) {
  const set = ARTIFACT_SETS[setId];
  if (!set) return null;
  const equipped = new Set(equippedArtifacts(hero).map((item) => effectiveArtifactDefinition(item).id));
  const owned = new Set([...equippedArtifacts(hero), ...hero.artifacts.backpack]
    .map((item) => effectiveArtifactDefinition(item).id));
  const equippedCount = set.memberIds.filter((id) => equipped.has(id as ArtifactInstance['id'])).length;
  return {
    id: set.id, name: set.name, equipped: equippedCount, total: set.memberIds.length,
    members: set.memberIds.map((id) => ({ id, owned: owned.has(id as ArtifactInstance['id']),
      equipped: equipped.has(id as ArtifactInstance['id']) })),
    bonuses: set.bonuses.map((bonus) => ({ ...bonus, active: equippedCount >= bonus.pieces })),
  };
}

export function hasArtifactSetBonus(
  hero: Pick<Hero, 'artifacts'> | { artifacts: HeroArtifacts }, setId: string, pieces: number,
): boolean {
  return (artifactSetProgress(hero, setId)?.equipped ?? 0) >= pieces;
}

export function maximumDebtSlots(hero: Pick<Hero, 'artifacts'> | { artifacts: HeroArtifacts }): number {
  return hasArtifactEffect(hero, 'debt_slot_bonus') ? 3 : 2;
}

/** Player-wide credit is derived from the largest equipped allowance, never stacked. */
export function artifactGoldCredit(player: Pick<Player, 'heroes'>): number {
  return Math.max(0, ...player.heroes.filter((hero) => hero.alive)
    .map((hero) => artifactEffectTotal(hero, 'gold_debt')));
}

/** Canonical affordability boundary for every player payment. Non-gold resources stay bounded at 0. */
export function canPlayerAfford(
  player: Pick<Player, 'heroes' | 'resources'>, cost: ResourceCost, count = 1,
): boolean {
  const credit = artifactGoldCredit(player);
  return Object.entries(cost).every(([resource, amount]) => {
    const available = player.resources[resource as keyof Resources]
      + (resource === 'gold' ? credit : 0);
    return available >= (amount ?? 0) * count;
  });
}

/** Apply a payment already validated by canPlayerAfford. */
export function payPlayer(
  player: Pick<Player, 'resources' | 'heroes' | 'artifactState'>, cost: ResourceCost, count = 1,
): void {
  const goldSpent = (cost.gold ?? 0) * count;
  const refundPercent = Math.max(0, ...player.heroes.filter((hero) => hero.alive)
    .map((hero) => artifactEffectTotal(hero, 'spend_refund', 'percent')));
  if (goldSpent > 0 && refundPercent > 0) {
    player.artifactState.goldSpentThisWeek += goldSpent;
    player.artifactState.weeklyRefundPercent = Math.max(
      player.artifactState.weeklyRefundPercent, refundPercent,
    );
    player.artifactState.weeklyRefundGold = Math.floor(
      player.artifactState.goldSpentThisWeek * player.artifactState.weeklyRefundPercent / 100,
    );
  }
  for (const [resource, amount] of Object.entries(cost)) {
    player.resources[resource as keyof Resources] -= (amount ?? 0) * count;
  }
}

function stableIndex(seed: number, key: string, length: number): number {
  let hash = seed >>> 0;
  for (const char of key) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return length ? hash % length : 0;
}

/** Resolve Empty Frame only at the serialized week boundary without consuming campaign RNG. */
export function resolveWeeklyArtifactInstances(state: GameState): void {
  for (const hero of Object.values(state.players).flatMap((player) => player.heroes)
    .sort((a, b) => a.id.localeCompare(b.id))) {
    const pool = hero.artifacts.backpack.filter((item) =>
      !ARTIFACTS[item.id].effects.includes('weekly_backpack_copy'))
      .map((item) => item.id).sort();
    for (const frame of equippedArtifacts(hero).filter((item) =>
      ARTIFACTS[item.id].effects.includes('weekly_backpack_copy'))) {
      frame.copiedArtifactId = pool.length
        ? pool[stableIndex(state.seed, `${state.week}:${hero.id}:empty-frame`, pool.length)] : undefined;
    }
  }
}

/** Refresh the serialized Compass pointer whenever adventure state may have changed. */
export function refreshArtifactPointers(state: GameState): void {
  for (const player of Object.values(state.players)) for (const hero of player.heroes) {
    const compass = equippedArtifacts(hero).find((item) =>
      effectiveArtifactDefinition(item).effects.includes('object_compass'));
    const kind = compass?.chosenObjectKind;
    if (!kind) { hero.artifactState.compassTargetId = null; continue; }
    hero.artifactState.compassVisitedIds ??= [];
    const visited = new Set(hero.artifactState.compassVisitedIds);
    const reachedCurrent = state.map.objects.find((object) =>
      object.id === hero.artifactState.compassTargetId && sameCoord(object.position, hero.position));
    if (reachedCurrent) visited.add(reachedCurrent.id);
    hero.artifactState.compassVisitedIds = [...visited].sort();
    const explored = new Set(player.explored);
    const current = state.map.objects.find((object) => object.id === hero.artifactState.compassTargetId
      && object.kind === kind && !visited.has(object.id));
    const nearest = current ?? state.map.objects.filter((object) => object.kind === kind
      && !visited.has(object.id))
      .sort((a, b) => Math.max(Math.abs(a.position.x - hero.position.x),
        Math.abs(a.position.y - hero.position.y))
        - Math.max(Math.abs(b.position.x - hero.position.x),
          Math.abs(b.position.y - hero.position.y)) || a.id.localeCompare(b.id))[0];
    hero.artifactState.compassTargetId = nearest?.id ?? null;
    if (nearest) explored.add(`${nearest.position.x},${nearest.position.y}`);
    player.explored = [...explored].sort();
  }
}

export function markBurdenRemovalReady(
  hero: Pick<Hero, 'artifacts' | 'removableBurdens'>,
  trigger: NonNullable<import('../content/artifacts').ArtifactDefinition['burdenRemovalTrigger']>,
): ArtifactInstance['id'][] {
  const ready = equippedArtifacts(hero).filter((item) =>
    ARTIFACTS[item.id].class === 'burden'
      && ARTIFACTS[item.id].burdenRemovalTrigger === trigger).map((item) => item.id);
  if (ready.length) hero.removableBurdens = [...new Set([...(hero.removableBurdens ?? []), ...ready])];
  return ready;
}

export function canUnequipArtifact(
  hero: Pick<Hero, 'artifacts' | 'removableBurdens' | 'skills' | 'skillUses'>,
  artifactId: ArtifactInstance['id'],
): boolean {
  const definition = ARTIFACTS[artifactId];
  return definition.class !== 'burden'
    || Boolean(hero.removableBurdens?.includes(artifactId))
    || (reliquarianRank(hero) >= 3 && !hero.skillUses.game.reliquarian);
}

/** Shared forced-movement boundary for both spells and company abilities. */
export function forcedMoveDistance(
  battle: BattleState, sourceSide: BattleSide, printedDistance: number,
  targetSide?: BattleSide,
): number {
  if (targetSide) {
    const targetHero = targetSide === 'attacker' ? battle.attackerHero : battle.defenderHero;
    if (targetHero && hasArtifactEffect(targetHero, 'forced_move_ward')
        && !battle.artifactEffectUses[targetSide].forced_move_ward) {
      battle.artifactEffectUses[targetSide].forced_move_ward = 1;
      battle.log.push("Deadman's Wedge prevents the first forced movement.");
      return 0;
    }
  }
  const hero = sourceSide === 'attacker' ? battle.attackerHero : battle.defenderHero;
  if (!hero || !hasArtifactEffect(hero, 'push_bonus')
      || battle.artifactEffectUses[sourceSide].push_bonus) return printedDistance;
  battle.artifactEffectUses[sourceSide].push_bonus = 1;
  return printedDistance + Math.max(1, artifactEffectTotal(hero, 'push_bonus') || 1);
}

export function preventArtifactTeleport(battle: BattleState, targetSide: BattleSide): boolean {
  const hero = targetSide === 'attacker' ? battle.attackerHero : battle.defenderHero;
  if (!hero || !hasArtifactEffect(hero, 'forced_move_ward')
      || battle.artifactEffectUses[targetSide].forced_move_ward) return false;
  battle.artifactEffectUses[targetSide].forced_move_ward = 1;
  battle.log.push("Deadman's Wedge prevents the first forced movement.");
  return true;
}

export function priceMultiplier(hero: { artifacts: HeroArtifacts }): number {
  return hasEquippedArtifact(hero, 'beggarsRing') ? 1.5 : 1;
}

export function consumeEquippedArtifact(
  hero: { artifacts: HeroArtifacts },
  artifactId: ArtifactInstance['id'],
): boolean {
  const slot = EQUIPMENT_SLOTS.find(
    (candidate) => hero.artifacts.equipment[candidate]?.id === artifactId,
  );
  if (!slot) return false;
  hero.artifacts.equipment[slot] = null;
  return true;
}

export function equipArtifact(
  state: GameState,
  heroId: string,
  backpackIndex: number,
  equipmentSlot: EquipmentSlotId,
  chosenSchool?: SpellSchool,
  chosenObjectKind?: string,
  chosenDwellingTier?: 1 | 2 | 3 | 4 | 5 | 6,
): void {
  if (state.phase !== 'adventure') throw new Error('Artifacts cannot be equipped in combat');
  const hero = findOwnedHero(state, state.activePlayer, heroId);
  const item = hero?.artifacts.backpack[backpackIndex];
  if (!hero || !item) throw new Error('Backpack artifact missing');
  if (!slotAccepts(equipmentSlot, ARTIFACTS[item.id].slot)) {
    throw new Error('Artifact does not fit that equipment slot');
  }
  if (equipmentSlot === 'misc3' && reliquarianRank(hero) < 1) {
    throw new Error('Reliquarian rank 1 is required for the third Misc slot');
  }
  if (item.id === 'seamstone' && !chosenSchool && !item.chosenSchool) {
    throw new Error('Choose a resonance school for Seamstone');
  }
  const itemDefinition = ARTIFACTS[item.id];
  if (itemDefinition.effects.includes('object_compass')
      && !(chosenObjectKind ?? item.chosenObjectKind)?.trim()) {
    throw new Error('Choose an object kind for The Patient Compass');
  }
  if (itemDefinition.effects.includes('dwelling_growth_choice')
      && !(chosenDwellingTier ?? item.chosenDwellingTier)) {
    throw new Error('Choose a dwelling tier for The Growing Ledger');
  }
  const equipped = hero.artifacts.equipment[equipmentSlot];
  const projectedArtifacts = cloneArtifacts(hero.artifacts);
  projectedArtifacts.backpack.splice(backpackIndex, 1);
  if (equipped) projectedArtifacts.backpack.push({ ...equipped });
  projectedArtifacts.equipment[equipmentSlot] = {
    ...item,
    chosenSchool: item.id === 'seamstone'
      ? chosenSchool ?? item.chosenSchool : undefined,
    chosenObjectKind: itemDefinition.effects.includes('object_compass')
      ? chosenObjectKind ?? item.chosenObjectKind : undefined,
    chosenDwellingTier: itemDefinition.effects.includes('dwelling_growth_choice')
      ? chosenDwellingTier ?? item.chosenDwellingTier : undefined,
  };
  assertHeroArmyFitsCapacity(hero.army, { ...hero, artifacts: projectedArtifacts });
  hero.artifacts.backpack.splice(backpackIndex, 1);
  if (equipped) hero.artifacts.backpack.push(equipped);
  hero.artifacts.equipment[equipmentSlot] = {
    ...item,
    chosenSchool: item.id === 'seamstone'
      ? chosenSchool ?? item.chosenSchool : undefined,
    chosenObjectKind: itemDefinition.effects.includes('object_compass')
      ? chosenObjectKind ?? item.chosenObjectKind : undefined,
    chosenDwellingTier: itemDefinition.effects.includes('dwelling_growth_choice')
      ? chosenDwellingTier ?? item.chosenDwellingTier : undefined,
  };
  synchronizeHeroArmyCapacity(hero);
  if (itemDefinition.effects.includes('object_compass')) refreshArtifactPointers(state);
  state.lastMessage = `${ARTIFACTS[item.id].name} equipped.`;
  if (kitPieceCount(hero) === 4) state.lastMessage = 'It has been used exactly once.';
  else if (item.id === 'bellsClapper') {
    state.lastMessage = "The Bell's Clapper is fitted. Somewhere, no bell rings.";
  }
}

export function unequipArtifact(
  state: GameState,
  heroId: string,
  equipmentSlot: EquipmentSlotId,
): void {
  if (state.phase !== 'adventure') throw new Error('Artifacts cannot be unequipped in combat');
  const hero = findOwnedHero(state, state.activePlayer, heroId);
  const item = hero?.artifacts.equipment[equipmentSlot];
  if (!hero || !item) throw new Error('Equipment slot is empty');
  if (!canUnequipArtifact(hero, item.id)) {
    throw new Error(`${ARTIFACTS[item.id].name} cannot be unequipped: ${ARTIFACTS[item.id].burdenRemoval}`);
  }
  const projectedArtifacts = cloneArtifacts(hero.artifacts);
  projectedArtifacts.equipment[equipmentSlot] = null;
  projectedArtifacts.backpack.push({ ...item });
  assertHeroArmyFitsCapacity(hero.army, { ...hero, artifacts: projectedArtifacts });
  if (ARTIFACTS[item.id].class === 'burden') {
    if (!hero.removableBurdens?.includes(item.id)) hero.skillUses.game.reliquarian = true;
    hero.removableBurdens = hero.removableBurdens?.filter((id) => id !== item.id);
  }
  hero.artifacts.equipment[equipmentSlot] = null;
  hero.artifacts.backpack.push(item);
  synchronizeHeroArmyCapacity(hero);
  state.lastMessage = `${ARTIFACTS[item.id].name} returned to the backpack.`;
}

export function unstitchHero(
  state: GameState, heroId: string, destination: { x: number; y: number },
): void {
  if (state.phase !== 'adventure') throw new Error('Unstitch is an adventure action');
  const hero = findOwnedHero(state, state.activePlayer, heroId);
  if (!hero || !kitBonuses(hero).canUnstitch) throw new Error("The Tailor's Kit is incomplete");
  if (hero.unstitchUsedWeek === state.week) throw new Error('Unstitch was used this week');
  if (!state.players[hero.owner].explored.includes(`${destination.x},${destination.y}`)) {
    throw new Error('Unstitch requires an explored destination');
  }
  const terrain = terrainIdAt(state.map, destination);
  if (terrain === 'mountain' || terrain === 'water') {
    throw new Error('The pattern cannot hold that destination');
  }
  if (Object.values(state.players).some((player) => player.heroes.some((candidate) =>
    candidate.alive && candidate.id !== hero.id
    && candidate.position.x === destination.x && candidate.position.y === destination.y))) {
    throw new Error('Another hero occupies that tile');
  }
  hero.position = { ...destination };
  hero.pathMemory = [];
  hero.unstitchUsedWeek = state.week;
  state.lastMessage = 'It has been used exactly once.';
}

export function dropAllArtifacts(defeated: Hero, victor: Hero | null): number {
  const dropped = [
    ...equippedArtifacts(defeated),
    ...defeated.artifacts.backpack,
  ];
  defeated.artifacts = emptyArtifacts();
  if (victor) victor.artifacts.backpack.push(...dropped.map((item) => ({ ...item })));
  return dropped.length;
}
