import type { SpellId, SpellSchool } from '../../core/types';
import type { EffectOperation, SpellDefinition } from './index';
import { spellFlavor } from '../flavor';
import { spellRulePlainText } from '../spellLexicon';
import { SPELL_RULE_PRESENTATIONS } from './rulePresentation';

const spell = (
  id: SpellId, name: string, school: SpellSchool, mana: number | 'X',
  kind: SpellDefinition['kind'], base: string, plus: string,
  target: SpellDefinition['aiHints']['target'] = 'strongestEnemy',
  castWhen: SpellDefinition['aiHints']['castWhen'] = 'always',
  effectOperation?: EffectOperation,
  rarity: SpellDefinition['rarity'] = 'uncommon',
): SpellDefinition => ({
  id, name, flavor: spellFlavor(name), school, mana, kind, base, plus, rarity, effectOperation,
  aiHints: { target, castWhen },
});

const presentedSpell = (
  id: SpellId, name: string, school: SpellSchool, mana: number | 'X',
  kind: SpellDefinition['kind'],
  target: SpellDefinition['aiHints']['target'] = 'strongestEnemy',
  castWhen: SpellDefinition['aiHints']['castWhen'] = 'always',
  effectOperation?: EffectOperation,
  rarity: SpellDefinition['rarity'] = 'uncommon',
): SpellDefinition => {
  const rules = SPELL_RULE_PRESENTATIONS[id];
  if (!rules) throw new Error(`Missing structured spell rules: ${id}`);
  return {
    ...spell(id, name, school, mana, kind,
      spellRulePlainText(rules.standard), spellRulePlainText(rules.upgraded),
      target, castWhen, effectOperation, rarity),
    rulePresentation: rules,
  };
};

/** Completion catalog from docs 15; topology and adventure entries are dealt normally. */
export const EXPANSION_SPELLS: SpellDefinition[] = [
  presentedSpell('beacon', 'Beacon', 'rite', 5, 'topology', 'self', 'always', undefined, 'rare'),
  presentedSpell('census', 'Census', 'rite', 4, 'adventure', 'self'),
  presentedSpell('feastDay', 'Feast Day', 'rite', 6, 'adventure', 'self'),
  presentedSpell('clarion', 'Clarion', 'rite', 4, 'staple', 'strongestAlly'),
  presentedSpell('vigilOfTheHost', 'Vigil of the Host', 'rite', 5, 'enchantment', 'enchantmentSlot', 'round1'),
  presentedSpell('oathbind', 'Oathbind', 'rite', 5, 'build-around', 'strongestEnemy', 'always', undefined, 'rare'),
  presentedSpell('waysideShrine', 'Wayside Shrine', 'rite', 5, 'adventure', 'self', 'always', undefined, 'rare'),

  presentedSpell('gate', 'Gate', 'craft', 5, 'topology', 'self', 'always', undefined, 'rare'),
  presentedSpell('saltTheVein', 'Salt the Vein', 'craft', 4, 'adventure', 'self'),
  presentedSpell('falseColors', 'False Colors', 'craft', 4, 'adventure', 'self'),
  presentedSpell('clockworkCourier', 'Clockwork Courier', 'craft', 4, 'adventure', 'self'),
  presentedSpell('brittle', 'Brittle', 'craft', 4, 'staple'),
  presentedSpell('standingMirror', 'Standing Mirror', 'craft', 7, 'build-around', 'self', 'round1', undefined, 'rare'),
  presentedSpell('summonSkiff', 'Summon Skiff', 'craft', 7, 'topology', 'self', 'always', undefined, 'rare'),

  spell('coldRoad', 'Cold Road', 'grave', 5, 'topology',
    'Travel between explored barrows.', 'Travel between explored barrows and carry one adjacent allied hero with you.', 'self', 'always', undefined, 'rare'),
  spell('borrowedTime', 'Borrowed Time', 'grave', 4, 'adventure',
    'Double movement today, then have zero movement tomorrow.', 'Double movement today, then retain half movement tomorrow instead of losing all of it.', 'self'),
  spell('paleProcession', 'Pale Procession', 'grave', 5, 'adventure',
    'Raise a temporary Candle-Wisp company where at least 100 creatures died.', 'Raise a larger Candle-Wisp company at that site, and keep it for seven days.', 'self'),
  spell('silenceThePassing', 'Silence the Passing', 'grave', 4, 'staple',
    'Enemy death triggers do not fire for 3 rounds.', 'Enemy death triggers remain suppressed for 3 rounds, while your own death triggers fire twice.', 'self'),
  spell('theToll', 'The Toll', 'grave', 5, 'scaling',
    'Gain 2 mana per destroyed company.', 'Gain 3 mana per destroyed company instead of 2.', 'self'),
  spell('deathsLedger', "Death's Ledger", 'grave', 6, 'adventure',
    'Reveal every barrow and its scroll.', 'Reveal every barrow and its scroll, and reveal all guardian counts for one day.', 'self', 'always', undefined, 'rare'),
  spell('graveSpeech', 'Grave-Speech', 'grave', 5, 'adventure',
    'Replay a battle fought on this tile.', 'Replay a battle fought on this tile and permanently learn one spell that was cast in it.', 'self', 'always', undefined, 'rare'),

  spell('gale', 'Gale', 'wild', 3, 'staple',
    'Push one enemy 2 hexes; a collision costs 3% HP.', 'Push one enemy 3 hexes instead of 2; a collision costs 6% HP instead of 3% and gives Chill 1.',
    'strongestEnemy', 'always', undefined, 'common'),
  spell('bloom', 'Bloom', 'wild', 3, 'staple',
    'Give one ally Bloom 3.', 'Give the target Bloom 4 instead of 3 and each adjacent ally Bloom 1.', 'strongestAlly', 'always', undefined, 'common'),
  spell('overgrow', 'Overgrow', 'wild', 4, 'twister',
    'Spread one active effect to every adjacent company.', 'Spread one active effect to adjacent companies, but choose one adjacent company to exclude.', 'counterPile', 'always', 'overgrow', 'common'),
  spell('thicket', 'Thicket', 'wild', 4, 'staple',
    'Create three slowing undergrowth hexes.', 'Create three slowing undergrowth hexes; enemies that end there also gain Chill 1.', 'self', 'always', undefined, 'common'),
  spell('rains', 'Rains', 'wild', 3, 'staple',
    'Remove all Burn, then give allies Bloom 1.', 'Remove all Burn, give allies Bloom 1, and give enemies Chill 1.', 'self', 'always', undefined, 'common'),
  spell('beastTongue', 'Beast Tongue', 'wild', 5, 'adventure',
    'Pay beast guardians to disperse.', 'Choose either to pay beast guardians to disperse or to recruit them.', 'self'),
  spell('stampedeCall', 'Stampede Call', 'wild', 6, 'build-around',
    'All allied beasts move toward enemies.', 'All allied beasts move toward enemies and gain +2 speed for this round.', 'self'),
  spell('storm', 'Storm', 'wild', 6, 'build-around',
    'All companies lose 6% HP; flyers lose 12% instead.', 'All companies lose 6% HP, but flyers lose 18% instead of 12%.', 'self'),
  spell('greenway', 'Greenway', 'wild', 5, 'topology',
    'Travel through connected forest up to 15 tiles.', 'Travel through connected forest up to 25 tiles instead of 15.', 'self'),
  spell('wildGrowth', 'Wild Growth', 'wild', 5, 'adventure',
    'One owned dwelling gains 50% growth this week.', 'One owned dwelling gains 75% growth this week instead of 50%.', 'self'),
  spell('murmuration', 'Murmuration', 'wild', 3, 'adventure',
    'Draw a scouting path for a crow.', 'Draw a scouting path for a crow, which also reveals nearby objects along the route.', 'self', 'always', undefined, 'common'),
  spell('greenTide', 'Green Tide', 'wild', 5, 'adventure',
    'Forest costs no movement this week.', 'Forest costs no movement this week, and connected forest is also revealed.', 'self'),
  spell('rootAndRuin', 'Root and Ruin', 'wild', 5, 'adventure',
    'Grow a three-tile map thicket for 3 days.', 'Grow a five-tile map thicket for 5 days instead of three tiles for 3 days.', 'self'),
  spell('fickleWeather', 'Fickle Weather', 'wild', 6, 'adventure',
    'Replace the omen by choosing one of two offers.', 'Replace the omen by choosing one of three offers instead of two.', 'self', 'always', undefined, 'rare'),
  spell('shedSkin', 'Shed Skin', 'wild', 4, 'staple',
    'Remove one active effect from an ally and give it equal Bloom.', 'Target an ally or enemy, remove one active effect, give equal Bloom, and spread Bloom nearby.', 'weakestAlly'),
  spell('hedgerowMarch', 'Hedgerow March', 'wild', 5, 'enchantment',
    'Forced movement grants allies 10 morale.', 'Forced movement grants allies 10 morale and Bloom 1.', 'enchantmentSlot', 'round1'),

  presentedSpell('hourglassCrack', 'Hourglass Crack', 'craft', 6, 'build-around', 'strongestAlly', 'always', undefined, 'rare'),
  spell('borrowShape', 'Borrow Shape', 'wild', 5, 'build-around',
    'One ally copies abilities from an adjacent enemy.', 'One ally copies abilities from any visible enemy instead of requiring adjacency.', 'strongestAlly', 'always', undefined, 'rare'),
  presentedSpell('echo', 'Echo', 'rite', 4, 'build-around', 'self', 'always', undefined, 'rare'),
  spell('loyalUntoDeath', 'Loyal Unto Death', 'grave', 4, 'build-around',
    'One ally attacks its killer when destroyed.', 'One ally attacks its killer when destroyed, causes no allied morale drain, and restores 3 mana.', 'strongestAlly', 'always', undefined, 'rare'),
];
