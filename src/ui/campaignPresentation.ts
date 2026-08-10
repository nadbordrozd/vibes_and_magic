import {
  builtInPortableMapDocuments, LEGACY_MAP_FACTORIES, type LegacyMapId,
} from '../content/maps/catalog';
import type { BuiltInMapId, GameMap } from '../core/types';

const MAP_FACTORIES = LEGACY_MAP_FACTORIES satisfies Record<LegacyMapId, (seed?: number) => GameMap>;

const MAP_STYLES: Record<LegacyMapId, string> = {
  'border-marches': 'Two-player conquest campaign',
  crosstitch: 'Two-to-four-player conquest campaign',
  'crosstitch-kit': 'Two-to-four-player artifact-assembly scenario',
  'torn-sound': 'Two-player naval conquest campaign',
  manywhere: 'One-to-three-player exploration sandbox',
  'grand-muster': 'Oversized creature and structure showcase sandbox',
  'crooked-crown': 'Four-player dense labyrinth conquest campaign',
  'sixfold-trial': 'Six-player advanced combat proving ground',
};

export interface CampaignPresentation {
  id: BuiltInMapId;
  name: string;
  style: string;
  objective: string;
  flavor: string;
}

const LEGACY_CAMPAIGN_PRESENTATIONS = (Object.keys(MAP_FACTORIES) as LegacyMapId[])
  .map((id): CampaignPresentation => {
    const map = MAP_FACTORIES[id](1);
    return {
      id, name: map.name, style: MAP_STYLES[id],
      objective: map.victory.mechanics, flavor: map.victory.flavor,
    };
  });

export function portableCampaignPresentations(
  documents = builtInPortableMapDocuments(),
): CampaignPresentation[] {
  return documents.map((document): CampaignPresentation => ({
    id: document.id as BuiltInMapId,
    name: document.metadata.name,
    style: document.metadata.style,
    objective: document.victory.mechanics,
    flavor: document.victory.flavor,
  }));
}

export const CAMPAIGN_PRESENTATIONS = LEGACY_CAMPAIGN_PRESENTATIONS
  .concat(portableCampaignPresentations());

export const CAMPAIGN_PRESENTATION = Object.fromEntries(
  CAMPAIGN_PRESENTATIONS.map((entry) => [entry.id, entry]),
) as Record<BuiltInMapId, CampaignPresentation>;
