import type {
  FactionId, HeroDefinitionId, SecondarySkillId, SkillRank,
  SpecialtyId, SpellId,
} from '../../core/types';
import { HERO_STORIES } from '../heroStories';

export interface SpecialtyDefinition {
  id: SpecialtyId;
  description: string;
  values: Record<string, number>;
}

export interface HeroDefinition {
  id: HeroDefinitionId;
  name: string;
  story: string;
  faction: FactionId;
  heroClass: 'banneret' | 'guildmaster' | 'chandler' | 'broodspeaker'
    | 'crone' | 'ashrider';
  specialty: SpecialtyDefinition;
  startingSpells: SpellId[];
  startingSkills: Partial<Record<SecondarySkillId, SkillRank>>;
}

const hero = (
  id: HeroDefinitionId,
  name: string,
  faction: FactionId,
  heroClass: HeroDefinition['heroClass'],
  specialty: SpecialtyDefinition,
  startingSpells: SpellId[] = [],
  startingSkills: Partial<Record<SecondarySkillId, SkillRank>> = {},
): HeroDefinition => ({
  id, name, story: HERO_STORIES[id], faction, heroClass, specialty,
  startingSpells, startingSkills,
});

export const HEROES: Record<HeroDefinitionId, HeroDefinition> = {
  aldith: hero('aldith', 'Aldith', 'hearthguard', 'banneret', {
    id: 'steadyAim',
    description: 'Longbowmen ignore the adjacent-enemy ranged penalty.',
    values: {},
  }),
  corwin: hero('corwin', 'Corwin', 'hearthguard', 'banneret', {
    id: 'brightRally',
    description: 'Rally always uses its Upgraded rules.',
    values: {},
  }, ['rally']),
  berta: hero('berta', 'Berta', 'hearthguard', 'banneret', {
    id: 'roadwise',
    description: 'Logistics grants +15%/+30%/+45%.',
    values: { rank1: 0.15, rank2: 0.3, rank3: 0.45 },
  }, [], { logistics: 1 }),
  osric: hero('osric', 'Osric', 'hearthguard', 'banneret', {
    id: 'highBanner',
    description: 'Bannerman auras grant +15 morale.',
    values: { meter: 15 },
  }),
  petra: hero('petra', 'Petra', 'woundWrights', 'guildmaster', {
    id: 'tinCaptain',
    description: 'Tin Soldiers gain +1 Attack and Defense.',
    values: { attack: 1, defense: 1 },
  }),
  silas: hero('silas', 'Silas', 'woundWrights', 'guildmaster', {
    id: 'brightWither',
    description: 'Wither always uses its Upgraded rules.',
    values: {},
  }, ['wither']),
  grigor: hero('grigor', 'Grigor', 'woundWrights', 'guildmaster', {
    id: 'masterForager',
    description: 'Forager grants +75%/+100%/+125% pile yield.',
    values: { rank1: 0.75, rank2: 1, rank3: 1.25 },
  }, [], { forager: 1 }),
  mirele: hero('mirele', 'Mirele', 'woundWrights', 'guildmaster', {
    id: 'masterMender',
    description: 'Victories recover 10 percentage points more losses.',
    values: { recovery: 0.1 },
  }),
  maren: hero('maren', 'Maren', 'unfinished', 'chandler', {
    id: 'deepLastLight', description: "Candle-Wisps' Last Light applies Hex 3 instead of 2.", values: { hex: 3 },
  }),
  elgiva: hero('elgiva', 'Elgiva', 'unfinished', 'chandler', {
    id: 'brightRemembrance', description: 'Remembrance always uses its Upgraded rules.', values: {},
  }, ['remembrance']),
  tobiah: hero('tobiah', 'Tobiah', 'unfinished', 'chandler', {
    id: 'watchfulRetaliation', description: 'Sentries retaliate with 25% more damage.', values: { multiplier: 1.25 },
  }),
  brotherHollis: hero('brotherHollis', 'Brother Hollis', 'unfinished', 'chandler', {
    id: 'heavyUnfinishedBusiness', description: 'Unfinished Business deals 20% instead of 15%.', values: { rate: 0.2 },
  }),
  vess: hero('vess', 'Vess', 'vespiary', 'broodspeaker', {
    id: 'nurturingBrood', description: 'Larval Tide companies have 5 HP per creature.', values: { hp: 5 },
  }),
  oszra: hero('oszra', 'Oszra', 'vespiary', 'broodspeaker', {
    id: 'masterRenderer', description: 'Render Down converts 15% of destroyed enemy HP.', values: { rate: 0.15 },
  }),
  kettl: hero('kettl', 'Kettl', 'vespiary', 'broodspeaker', {
    id: 'swiftPaperWasps', description: 'Paper-Wasp Lancers gain +1 speed.', values: { speed: 1 },
  }),
  humm: hero('humm', 'Humm', 'vespiary', 'broodspeaker', {
    id: 'brightBloom', description: 'Bloom always uses its Upgraded rules.', values: {},
  }, ['bloom']),
  babaZima: hero('babaZima', 'Baba Zima', 'hagwood', 'crone', {
    id: 'gentleDebts', description: 'Debts trigger one step later or with a lighter payment.', values: { delay: 1 },
  }),
  yagaOlen: hero('yagaOlen', 'Yaga Olen', 'hagwood', 'crone', {
    id: 'brightSour', description: 'Sour always uses its Upgraded rules.', values: {},
  }, ['sour']),
  oldMarta: hero('oldMarta', 'Old Marta', 'hagwood', 'crone', {
    id: 'vengefulCrows', description: 'Crow Chorus also applies Hex when retaliating.', values: {},
  }),
  vasilisa: hero('vasilisa', 'Vasilisa', 'hagwood', 'crone', {
    id: 'farSweep', description: 'Besom Riders push targets 2 hexes.', values: { distance: 2 },
  }),
  temir: hero('temir', 'Temir', 'wildergrass', 'ashrider', {
    id: 'dearerBloodPrice', description: 'Blood Price grants 25 morale instead of 20.', values: { meter: 25 },
  }),
  saiga: hero('saiga', 'Saiga', 'wildergrass', 'ashrider', {
    id: 'hungryPack', description: "Ashmane Wolves' Pack Hunger deals 25% more damage.", values: { multiplier: 1.25 },
  }),
  anai: hero('anai', 'Anai', 'wildergrass', 'ashrider', {
    id: 'brightGale', description: 'Gale always uses its Upgraded rules.', values: {},
  }, ['gale']),
  bataar: hero('bataar', 'Bataar', 'wildergrass', 'ashrider', {
    id: 'unhinderedSkirmish', description: 'Outrider skirmish movement ignores speed and adjacency slows.', values: {},
  }),
  edwin: hero('edwin', 'Edwin', 'hearthguard', 'banneret', {
    id: 'kennelMuster', description: 'Garrisons Edwin installs gain +5 morale each round.', values: { meter: 5 },
  }),
  maud: hero('maud', 'Maud', 'hearthguard', 'banneret', {
    id: 'brightTrial', description: 'Trial always uses its Upgraded rules.', values: {},
  }, ['trial']),
  ansel: hero('ansel', 'Ansel', 'woundWrights', 'guildmaster', {
    id: 'brightEscort', description: 'Clockwork Escort always uses its Upgraded rules.', values: {},
  }, ['clockworkEscort']),
  rivka: hero('rivka', 'Rivka', 'woundWrights', 'guildmaster', {
    id: 'swiftMarionettes', description: 'Marionettes gain +1 speed.', values: { speed: 1 },
  }),
  cerys: hero('cerys', 'Cerys', 'unfinished', 'chandler', {
    id: 'doubleFerry', description: 'The Ferry may carry twice per battle.', values: { uses: 2 },
  }),
  dunstan: hero('dunstan', 'Dunstan', 'unfinished', 'chandler', {
    id: 'deepDirge', description: 'Bone Choir dirge scaling is 25% stronger.', values: { multiplier: 1.25 },
  }),
  szet: hero('szet', 'Szet', 'vespiary', 'broodspeaker', {
    id: 'lastingResin', description: 'Resin trails last two extra rounds.', values: { rounds: 2 },
  }),
  ollo: hero('ollo', 'Ollo', 'vespiary', 'broodspeaker', {
    id: 'greaterBroodCall', description: 'Brood Call spawns 50% more larvae.', values: { multiplier: 1.5 },
  }),
  agata: hero('agata', 'Agata', 'hagwood', 'crone', {
    id: 'diagonalFenceSlow', description: "Fence-Post Familiars' slow also reaches diagonally.", values: {},
  }),
  bogdan: hero('bogdan', 'Bogdan', 'hagwood', 'crone', {
    id: 'loopholeBargains', description: 'Bargains expose a loophole whose apparent benefit is part of the price.', values: {},
  }),
  qara: hero('qara', 'Qara', 'wildergrass', 'ashrider', {
    id: 'burningStormWake', description: "Thunderbirds' Storm Wake applies Burn 3.", values: { burn: 3 },
  }),
  erdem: hero('erdem', 'Erdem', 'wildergrass', 'ashrider', {
    id: 'costlySurrender', description: 'Surrendering to Erdem costs double.', values: { multiplier: 2 },
  }),
};

export const FACTION_HEROES: Record<FactionId, HeroDefinitionId[]> = {
  hearthguard: ['aldith', 'corwin', 'berta', 'osric', 'edwin', 'maud'],
  woundWrights: ['petra', 'silas', 'grigor', 'mirele', 'ansel', 'rivka'],
  unfinished: ['maren', 'elgiva', 'tobiah', 'brotherHollis', 'cerys', 'dunstan'],
  vespiary: ['vess', 'oszra', 'kettl', 'humm', 'szet', 'ollo'],
  hagwood: ['yagaOlen', 'babaZima', 'oldMarta', 'vasilisa', 'agata', 'bogdan'],
  wildergrass: ['temir', 'saiga', 'anai', 'bataar', 'qara', 'erdem'],
};

export function validateHeroes(): void {
  for (const definition of Object.values(HEROES)) {
    if (!definition.name || !definition.story.trim()
        || !FACTION_HEROES[definition.faction].includes(definition.id)) {
      throw new Error(`Invalid hero definition: ${definition.id}`);
    }
  }
}
