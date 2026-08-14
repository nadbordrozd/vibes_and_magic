import type {
  ContentAssetRequirement, V2AcquisitionSiteDefinition, V2AcquisitionSiteKind,
} from './v2/schema';
import { validateAcquisitionSites } from './v2/validation';
import { ensureAcquisitionSiteHandlersRegistered } from '../core/game/acquisitionSites';
import { validateContentAssets } from './v2/assets';

/** Site definitions become runtime map-object registrations in the acquisition-sites phase. */
export const V2_ACQUISITION_SITES: Readonly<
  Partial<Record<V2AcquisitionSiteKind, V2AcquisitionSiteDefinition>>
> = Object.freeze({
  stacks: {
    kind: 'stacks', name: 'The Stacks',
    flavor: 'Three shelves lean close. Only one book means to leave.',
    handlerId: 'stacks', oncePerHero: true,
  },
  wildShrine: {
    kind: 'wildShrine', name: 'Wild Shrine',
    flavor: 'The roots keep no catalogue, and offer no apology.',
    handlerId: 'wildShrine', oncePerHero: true,
  },
  reliquaryOfPages: {
    kind: 'reliquaryOfPages', name: 'Reliquary of Pages',
    flavor: 'One guarded page waits behind a dozen empty clasps.',
    handlerId: 'reliquaryOfPages', oncePerHero: false,
  },
});

export const ACQUISITION_SITE_ASSET_REQUIREMENTS: readonly ContentAssetRequirement[] =
  Object.values(V2_ACQUISITION_SITES).map((site) => ({
    canonicalId: `site:${site.kind}`,
    nativeAssetId: `map-object:${site.kind}`,
    introducedBy: 'docs-60-67',
    accessibleName: site.name,
    visualSubject: site.kind === 'stacks'
      ? 'three leaning outdoor bookshelves beneath a patched awning'
      : site.kind === 'wildShrine'
        ? 'a root-wrapped stone shrine with closed books tucked into its hollows'
        : 'a sealed stone reliquary holding one clasped vellum page',
    semantics: { family: 'site', siteKind: site.kind },
  }));

export function validateV2AcquisitionSites(): void {
  ensureAcquisitionSiteHandlersRegistered();
  validateAcquisitionSites(Object.values(V2_ACQUISITION_SITES), 'final');
  validateContentAssets(ACQUISITION_SITE_ASSET_REQUIREMENTS,
    new Set(ACQUISITION_SITE_ASSET_REQUIREMENTS.map((row) => row.nativeAssetId)), 'release');
}
