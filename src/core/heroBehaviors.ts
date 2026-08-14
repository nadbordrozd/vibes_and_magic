import { HEROES } from '../content/heroes';
import { SKILLS } from '../content/skills';
import { artifactEffectTotal, effectivePrimaryStat, rosterArtifactStatBonus } from './artifacts';
import type {
  BattleHero, Hero, SecondarySkillId, SkillRank, SpecialtyId,
} from './types';

export interface SpecialtyHandler {
  rangedAdjacentPenalty?: (hero: BattleHero, unitId: string) => boolean;
  spellAlwaysUpgraded?: (spellId: string) => boolean;
  unitAttackBonus?: (unitId: string) => number;
  unitDefenseBonus?: (unitId: string) => number;
  bannerMeter?: () => number;
  logisticsRate?: (rank: SkillRank) => number;
  foragerRate?: (rank: SkillRank) => number;
  recoveryBonus?: () => number;
  lastLightHex?: () => number;
  retaliationMultiplier?: (unitId: string) => number;
  unfinishedBusinessRate?: () => number;
  unitHp?: (unitId: string) => number | undefined;
  renderRate?: () => number;
  unitSpeedBonus?: (unitId: string) => number;
  debtDelay?: () => number;
  retaliationAppliesHex?: (unitId: string) => boolean;
  sweepDistance?: (unitId: string) => number;
  bloodPriceMeter?: () => number;
  packHungerMultiplier?: () => number;
  skirmishIgnoresSlows?: (unitId: string) => boolean;
  surrenderMultiplier?: () => number;
  crossingUses?: () => number;
  dirgeMultiplier?: () => number;
  resinDurationBonus?: () => number;
  broodMultiplier?: () => number;
  diagonalBoundary?: () => boolean;
  stormWakeBurn?: () => number;
  garrisonMeter?: () => number;
}

const value = (id: SpecialtyId, key: string): number =>
  Object.values(HEROES).find((hero) => hero.specialty.id === id)
    ?.specialty.values[key] ?? 0;

export const SPECIALTY_REGISTRY: Record<SpecialtyId, SpecialtyHandler> = {
  steadyAim: {
    rangedAdjacentPenalty: (_hero, unitId) => unitId === 'longbowman',
  },
  brightRally: { spellAlwaysUpgraded: (spellId) => spellId === 'rally' },
  roadwise: {
    logisticsRate: (rank) => value('roadwise', `rank${rank}`),
  },
  highBanner: { bannerMeter: () => value('highBanner', 'meter') },
  tinCaptain: {
    unitAttackBonus: (unitId) => unitId === 'tinSoldier'
      ? value('tinCaptain', 'attack') : 0,
    unitDefenseBonus: (unitId) => unitId === 'tinSoldier'
      ? value('tinCaptain', 'defense') : 0,
  },
  brightWither: { spellAlwaysUpgraded: (spellId) => spellId === 'wither' },
  masterForager: {
    foragerRate: (rank) => value('masterForager', `rank${rank}`),
  },
  masterMender: { recoveryBonus: () => value('masterMender', 'recovery') },
  deepLastLight: { lastLightHex: () => value('deepLastLight', 'hex') },
  brightRemembrance: { spellAlwaysUpgraded: (spellId) => spellId === 'remembrance' },
  watchfulRetaliation: { retaliationMultiplier: (unitId) => unitId === 'sentries' ? value('watchfulRetaliation', 'multiplier') : 1 },
  heavyUnfinishedBusiness: { unfinishedBusinessRate: () => value('heavyUnfinishedBusiness', 'rate') },
  nurturingBrood: { unitHp: (unitId) => unitId === 'larvalTide' ? value('nurturingBrood', 'hp') : undefined },
  masterRenderer: { renderRate: () => value('masterRenderer', 'rate') },
  swiftPaperWasps: { unitSpeedBonus: (unitId) => unitId === 'paperWaspLancers' ? value('swiftPaperWasps', 'speed') : 0 },
  brightBloom: { spellAlwaysUpgraded: (spellId) => spellId === 'bloom' },
  gentleDebts: { debtDelay: () => value('gentleDebts', 'delay') },
  brightSour: { spellAlwaysUpgraded: (spellId) => spellId === 'sour' },
  vengefulCrows: { retaliationAppliesHex: (unitId) => unitId === 'crowChorus' },
  farSweep: { sweepDistance: (unitId) => unitId === 'besomRiders' ? value('farSweep', 'distance') : 1 },
  dearerBloodPrice: { bloodPriceMeter: () => value('dearerBloodPrice', 'meter') },
  hungryPack: { packHungerMultiplier: () => value('hungryPack', 'multiplier') },
  brightGale: { spellAlwaysUpgraded: (spellId) => spellId === 'gale' },
  unhinderedSkirmish: { skirmishIgnoresSlows: (unitId) => unitId === 'outriders' },
  kennelMuster: { garrisonMeter: () => 5 },
  brightTrial: { spellAlwaysUpgraded: (spellId) => spellId === 'trial' },
  brightEscort: { spellAlwaysUpgraded: (spellId) => spellId === 'clockworkEscort' },
  swiftMarionettes: { unitSpeedBonus: (unitId) => unitId === 'marionette' ? 1 : 0 },
  doubleFerry: { crossingUses: () => 2 },
  deepDirge: { dirgeMultiplier: () => 1.25 },
  lastingResin: { resinDurationBonus: () => 2 },
  greaterBroodCall: { broodMultiplier: () => 1.5 },
  diagonalFenceSlow: { diagonalBoundary: () => true },
  loopholeBargains: {},
  burningStormWake: { stormWakeBurn: () => 3 },
  costlySurrender: { surrenderMultiplier: () => 2 },
};

export function specialtyHandler(
  hero: Pick<Hero | BattleHero, 'specialtyId'>,
): SpecialtyHandler {
  return SPECIALTY_REGISTRY[hero.specialtyId];
}

export function skillRank(
  hero: Pick<Hero | BattleHero, 'skills'>,
  skillId: SecondarySkillId,
): SkillRank | 0 {
  return hero.skills[skillId] ?? 0;
}

export function logisticsRate(hero: Hero): number {
  const rank = skillRank(hero, 'logistics');
  if (!rank) return 0;
  return specialtyHandler(hero).logisticsRate?.(rank)
    ?? SKILLS.logistics.values[`rank${rank}`];
}

export function foragerRate(hero: Hero): number {
  const rank = skillRank(hero, 'forager');
  if (!rank) return 0;
  return specialtyHandler(hero).foragerRate?.(rank)
    ?? (rank === 3 ? SKILLS.forager.values.rank3Yield : SKILLS.forager.values.rank1Yield);
}

export function commandMeter(hero: Hero | BattleHero): number {
  const rank = skillRank(hero, 'command');
  return rank === 1 ? SKILLS.command.values.rank1Meter
    : rank === 2 ? SKILLS.command.values.rank2Meter
      : rank === 3 ? SKILLS.command.values.rank3Meter : 0;
}

export function dailyMoveArtifactBonus(hero: Hero): number {
  return artifactEffectTotal(hero, 'daily_move');
}

export function dailyManaArtifactBonus(hero: Hero): number {
  return artifactEffectTotal(hero, 'daily_mana');
}

export function dailyGoldArtifactBonus(hero: Hero): number {
  return artifactEffectTotal(hero, 'daily_gold');
}

export function consumableSlotCount(hero: Pick<Hero, 'skills'>): number {
  const rank = skillRank(hero, 'provisioner');
  return 6 + (rank === 1 ? SKILLS.provisioner.values.rank1Slots
    : rank >= 2 ? SKILLS.provisioner.values.rank2Slots : 0);
}

export function maximumMana(hero: Hero, player?: Pick<import('./types').Player, 'heroes'>): number {
  const multiplier = skillRank(hero, 'attunement') === 3 ? 12 : 10;
  const ordinary = (effectivePrimaryStat(hero, 'knowledge')
    + (player ? rosterArtifactStatBonus(player) : 0)) * multiplier;
  const penalty = artifactEffectTotal(hero, 'max_mana_penalty', 'percent');
  return Math.max(0, Math.floor(ordinary * (1 - penalty / 100)));
}

export function gainExperience(hero: Hero, baseAmount: number): number {
  const gained = Math.floor(baseAmount * (1
    + (skillRank(hero, 'loremaster') >= 1 ? SKILLS.loremaster.values.experience : 0)));
  hero.xp += gained;
  return gained;
}
