import { HEROES } from '../src/content/heroes';
import type { HeroDefinitionId, SpecialtyId } from '../src/core/types';
import { SPELL_EFFECT_ICON_MANIFEST, type ContentIconManifestEntry } from './iconManifest';

export const HERO_PORTRAIT_SIZE = 96 as const;
export const HERO_DASHBOARD_ICON_SIZE = 32 as const;

export type HeroPrimaryStatIconId = 'attack' | 'defense' | 'spellPower' | 'knowledge';
export type HeroVitalIconId = 'experience' | 'movement' | 'mana' | 'luck';
export type HeroDashboardAssetId = `hero-portrait:${HeroDefinitionId}`
  | `hero-specialty:${SpecialtyId}`
  | `hero-primary-stat:${Exclude<HeroPrimaryStatIconId, 'spellPower'>}`
  | `hero-vital:${HeroVitalIconId}`;

export interface HeroDashboardManifestEntry {
  file: string;
  w: 32 | 96;
  h: 32 | 96;
  generator: 'built-in-imagegen';
}

const portraitEntries = Object.values(HEROES).map((hero) => [
  `hero-portrait:${hero.id}`,
  { file: `assets/hero-dashboard/portraits/${hero.id}.png`, w: 96, h: 96,
    generator: 'built-in-imagegen' },
] as const);

const specialtyIds = [...new Set(Object.values(HEROES).map((hero) => hero.specialty.id))];
const specialtyEntries = specialtyIds.map((id) => [
  `hero-specialty:${id}`,
  { file: `assets/hero-dashboard/specialties/${id}.png`, w: 32, h: 32,
    generator: 'built-in-imagegen' },
] as const);

const primaryEntries = (['attack', 'defense', 'knowledge'] as const).map((id) => [
  `hero-primary-stat:${id}`,
  { file: `assets/hero-dashboard/primary-stats/${id}.png`, w: 32, h: 32,
    generator: 'built-in-imagegen' },
] as const);

const vitalEntries = (['experience', 'movement', 'mana', 'luck'] as const).map((id) => [
  `hero-vital:${id}`,
  { file: `assets/hero-dashboard/vitals/${id}.png`, w: 32, h: 32,
    generator: 'built-in-imagegen' },
] as const);

export const HERO_DASHBOARD_MANIFEST: Readonly<Record<HeroDashboardAssetId,
HeroDashboardManifestEntry>> = Object.freeze(Object.fromEntries([
  ...portraitEntries, ...specialtyEntries, ...primaryEntries, ...vitalEntries,
]) as Record<HeroDashboardAssetId, HeroDashboardManifestEntry>);

export function heroPortraitAsset(id: HeroDefinitionId): HeroDashboardManifestEntry {
  return HERO_DASHBOARD_MANIFEST[`hero-portrait:${id}`];
}

export function heroSpecialtyAsset(id: SpecialtyId): HeroDashboardManifestEntry {
  return HERO_DASHBOARD_MANIFEST[`hero-specialty:${id}`];
}

/** Spell Power deliberately reuses the installed spell-effect lexicon bitmap. */
export function heroPrimaryStatAsset(id: HeroPrimaryStatIconId):
HeroDashboardManifestEntry | ContentIconManifestEntry {
  return id === 'spellPower'
    ? SPELL_EFFECT_ICON_MANIFEST['spell-power']
    : HERO_DASHBOARD_MANIFEST[`hero-primary-stat:${id}`];
}

export function heroVitalAsset(id: HeroVitalIconId): HeroDashboardManifestEntry {
  return HERO_DASHBOARD_MANIFEST[`hero-vital:${id}`];
}
