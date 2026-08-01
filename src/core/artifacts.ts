import {
  ARTIFACTS, EQUIPMENT_SLOTS, KIT_PIECES, slotAccepts,
} from '../content/artifacts';
import { findOwnedHero } from './heroes';
import type { ArtifactEffectTag } from '../content/artifacts';
import type {
  ArtifactInstance, EquipmentSlotId, GameState, Hero, HeroArtifacts,
  PrimaryStat, SpellSchool,
} from './types';
import { terrainIdAt } from '../content/terrain';

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

export function artifactEffectTotal(
  hero: Pick<Hero, 'artifacts'> | { artifacts: HeroArtifacts },
  effect: ArtifactEffectTag,
  value: 'amount' | 'percent' = 'amount',
): number {
  return equippedArtifacts(hero).reduce((sum, item) => {
    const definition = ARTIFACTS[item.id];
    return sum + (definition.effects.includes(effect)
      ? definition.values?.[value] ?? 0 : 0);
  }, 0);
}

export function artifactStatBonus(
  hero: Pick<Hero, 'artifacts'> | { artifacts: HeroArtifacts },
  stat: PrimaryStat,
): number {
  const pieces = equippedArtifacts(hero);
  const ownBonuses = pieces.reduce(
    (sum, item) => sum + (ARTIFACTS[item.id].values?.[stat] ?? 0),
    0,
  );
  return ownBonuses + (kitPieceCount(hero) >= 2 ? 2 : 0);
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
): void {
  if (state.phase !== 'adventure') throw new Error('Artifacts cannot be equipped in combat');
  const hero = findOwnedHero(state, state.activePlayer, heroId);
  const item = hero?.artifacts.backpack[backpackIndex];
  if (!hero || !item) throw new Error('Backpack artifact missing');
  if (!slotAccepts(equipmentSlot, ARTIFACTS[item.id].slot)) {
    throw new Error('Artifact does not fit that equipment slot');
  }
  if (item.id === 'seamstone' && !chosenSchool && !item.chosenSchool) {
    throw new Error('Choose a resonance school for Seamstone');
  }
  const equipped = hero.artifacts.equipment[equipmentSlot];
  hero.artifacts.backpack.splice(backpackIndex, 1);
  if (equipped) hero.artifacts.backpack.push(equipped);
  hero.artifacts.equipment[equipmentSlot] = {
    ...item,
    chosenSchool: item.id === 'seamstone'
      ? chosenSchool ?? item.chosenSchool : undefined,
  };
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
  if (ARTIFACTS[item.id].class === 'burden') {
    throw new Error(`${ARTIFACTS[item.id].name} cannot be unequipped: ${ARTIFACTS[item.id].burdenRemoval}`);
  }
  hero.artifacts.equipment[equipmentSlot] = null;
  hero.artifacts.backpack.push(item);
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
