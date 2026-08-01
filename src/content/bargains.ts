import type { BargainId } from '../core/types';

export interface BargainDefinition {
  id: BargainId;
  name: string;
  flavor: string;
  benefit: string;
  debt: string;
}

export const BARGAINS: Record<BargainId, BargainDefinition> = {
  firstHarvest: {
    id: 'firstHarvest', name: 'The First Harvest', flavor: 'Take the grain before the field has finished deciding.', benefit: 'Gain 4,000 gold now.',
    debt: 'Your highest-growth dwelling produces nothing in the called week.',
  },
  borrowedLegion: {
    id: 'borrowedLegion', name: 'Borrowed Legion',
    flavor: 'They will march for you awhile. They will know when awhile is over.',
    benefit: 'A neutral stack worth about 80% of your army joins for seven days.',
    debt: 'On day eight it departs and takes your smallest stack.',
  },
  cuckoosDeal: {
    id: 'cuckoosDeal', name: "The Cuckoo's Deal",
    flavor: 'One nest is watched, and another learns who watched it.',
    benefit: 'Permanently inspect one enemy castle.',
    debt: 'Its owner permanently sees your highest-level hero.',
  },
  milkTeeth: {
    id: 'milkTeeth', name: 'Milk Teeth', flavor: 'Everything young grows quickly, then remembers the ache.', benefit: 'Tier-one growth doubles for two weeks.',
    debt: 'Tier-one growth is halved for the following two weeks.',
  },
  longNap: {
    id: 'longNap', name: 'The Long Nap', flavor: 'Wake stronger. Sleep when the old calendar asks.', benefit: '+3 to every primary stat permanently.',
    debt: 'This hero sleeps every seventh day.',
  },
  neverByIron: {
    id: 'neverByIron', name: 'Never By Iron',
    flavor: 'Cold iron turns aside, but keeps a strict account.',
    benefit: 'Your army cannot be retaliated against for three battles.',
    debt: 'Your iron income is zero for ten days.',
  },
  thirdChild: {
    id: 'thirdChild', name: 'The Third Child', flavor: 'The third gift is generous. The fourth remembers.', benefit: 'Your next level draft deals six cards.',
    debt: 'The draft after that deals one card.',
  },
  whatWasPromised: {
    id: 'whatWasPromised', name: 'What Was Promised',
    flavor: 'The missing things arrive first. Payment follows faithfully.',
    benefit: 'Gain exactly the missing resources for the next castle building.',
    debt: 'Pay 3 essence each week for three weeks or the building is dormant.',
  },
};

export const BARGAIN_IDS = Object.keys(BARGAINS) as BargainId[];

export function validateBargains(): void {
  if (Object.values(BARGAINS).some((entry) =>
    !entry.name || !entry.flavor.trim() || !entry.benefit || !entry.debt)) {
    throw new Error('Bargain catalog contains an incomplete definition');
  }
}
