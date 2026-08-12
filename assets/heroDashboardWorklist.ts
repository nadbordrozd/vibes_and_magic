import { HEROES } from '../src/content/heroes';
import type { HeroDefinitionId, SpecialtyId } from '../src/core/types';
import {
  HERO_DASHBOARD_ICON_SIZE, HERO_PORTRAIT_SIZE, type HeroDashboardAssetId,
} from './heroDashboardManifest';

export interface HeroDashboardWorkItem {
  id: HeroDashboardAssetId;
  category: 'hero-portrait' | 'hero-specialty' | 'hero-primary-stat' | 'hero-vital';
  w: 32 | 96;
  h: 32 | 96;
  source: string;
}

const primary = ['attack', 'defense', 'knowledge'] as const;
const vitals = ['experience', 'movement', 'mana', 'luck'] as const;

export function heroDashboardWorklist(): HeroDashboardWorkItem[] {
  const portraits = Object.values(HEROES).map((hero) => ({
    id: `hero-portrait:${hero.id}` as `hero-portrait:${HeroDefinitionId}`,
    category: 'hero-portrait' as const, w: HERO_PORTRAIT_SIZE, h: HERO_PORTRAIT_SIZE,
    source: `canonical hero:${hero.name}; ${hero.faction}; ${hero.heroClass}; ${hero.specialty.id}`,
  }));
  const specialtyOwners = new Map<SpecialtyId, HeroDefinitionId>();
  for (const hero of Object.values(HEROES)) specialtyOwners.set(hero.specialty.id, hero.id);
  const specialties = [...specialtyOwners].map(([id, owner]) => ({
    id: `hero-specialty:${id}` as `hero-specialty:${SpecialtyId}`,
    category: 'hero-specialty' as const, w: HERO_DASHBOARD_ICON_SIZE,
    h: HERO_DASHBOARD_ICON_SIZE,
    source: `canonical hero specialty:${owner}; ${HEROES[owner].specialty.description}`,
  }));
  return [
    ...portraits,
    ...specialties,
    ...primary.map((id) => ({ id: `hero-primary-stat:${id}` as const,
      category: 'hero-primary-stat' as const, w: HERO_DASHBOARD_ICON_SIZE,
      h: HERO_DASHBOARD_ICON_SIZE, source: `canonical primary stat:${id}` })),
    ...vitals.map((id) => ({ id: `hero-vital:${id}` as const,
      category: 'hero-vital' as const, w: HERO_DASHBOARD_ICON_SIZE,
      h: HERO_DASHBOARD_ICON_SIZE, source: `canonical hero vital:${id}` })),
  ];
}
