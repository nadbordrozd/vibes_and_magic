import { createBorderMarches } from '../content/maps/borderMarches';
import { createCrosstitch, createCrosstitchKit } from '../content/maps/crosstitch';
import { createGrandMuster } from '../content/maps/grandMuster';
import { createManywhere } from '../content/maps/manywhere';
import { createTornSound } from '../content/maps/tornSound';
import { createCrookedCrown } from '../content/maps/crookedCrown';
import { createSixfoldTrial } from '../content/maps/sixfoldTrial';
import type { GameMap, MapId } from '../core/types';

const MAP_FACTORIES = {
  'border-marches': createBorderMarches,
  crosstitch: createCrosstitch,
  'crosstitch-kit': createCrosstitchKit,
  'torn-sound': createTornSound,
  manywhere: createManywhere,
  'grand-muster': createGrandMuster,
  'crooked-crown': createCrookedCrown,
  'sixfold-trial': createSixfoldTrial,
} satisfies Record<MapId, (seed?: number) => GameMap>;

const MAP_STYLES: Record<MapId, string> = {
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
  id: MapId;
  name: string;
  style: string;
  objective: string;
  flavor: string;
}

export const CAMPAIGN_PRESENTATIONS = (Object.keys(MAP_FACTORIES) as MapId[])
  .map((id): CampaignPresentation => {
    const map = MAP_FACTORIES[id](1);
    return {
      id, name: map.name, style: MAP_STYLES[id],
      objective: map.victory.mechanics, flavor: map.victory.flavor,
    };
  });

export const CAMPAIGN_PRESENTATION = Object.fromEntries(
  CAMPAIGN_PRESENTATIONS.map((entry) => [entry.id, entry]),
) as Record<MapId, CampaignPresentation>;
