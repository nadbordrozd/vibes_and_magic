import type { HeroDefinitionId, SpecialtyId } from '../../core/types';
import {
  heroPortraitAsset, heroPrimaryStatAsset, heroSpecialtyAsset, heroVitalAsset,
  type HeroPrimaryStatIconId, type HeroVitalIconId,
} from '../../../assets/heroDashboardManifest';

function publicAssetUrl(file: string): string {
  if (typeof document === 'undefined') return file;
  return new URL(file, document.baseURI).toString();
}

function RequiredDashboardImage({
  file, size, className,
}: { file: string; size: 32 | 96; className?: string }) {
  return <img src={publicAssetUrl(file)} width={size} height={size} alt="" aria-hidden="true"
    className={`hero-dashboard-bitmap ${className ?? ''}`}
    style={{ imageRendering: 'pixelated', objectFit: 'contain' }} />;
}

/** Required catalog-backed hero identity art. This family intentionally has no fallback path. */
export function HeroIdentityPortrait({
  heroId, className,
}: { heroId: HeroDefinitionId; className?: string }) {
  const entry = heroPortraitAsset(heroId);
  return <RequiredDashboardImage file={entry.file} size={entry.w} className={className} />;
}

/** Required catalog-backed specialty art. */
export function HeroSpecialtyIcon({
  specialtyId, className,
}: { specialtyId: SpecialtyId; className?: string }) {
  const entry = heroSpecialtyAsset(specialtyId);
  return <RequiredDashboardImage file={entry.file} size={entry.w} className={className} />;
}

/** Spell Power resolves through the existing effect-icon file; the other three stats are new. */
export function HeroPrimaryStatIcon({
  stat, className,
}: { stat: HeroPrimaryStatIconId; className?: string }) {
  const entry = heroPrimaryStatAsset(stat);
  return <RequiredDashboardImage file={entry.file} size={entry.w} className={className} />;
}

/** Required catalog-backed movement/mana/experience/luck art. */
export function HeroVitalIcon({
  vital, className,
}: { vital: HeroVitalIconId; className?: string }) {
  const entry = heroVitalAsset(vital);
  return <RequiredDashboardImage file={entry.file} size={entry.w} className={className} />;
}
