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

  presentedSpell('coldRoad', 'Cold Road', 'grave', 5, 'topology', 'self', 'always', undefined, 'rare'),
  presentedSpell('borrowedTime', 'Borrowed Time', 'grave', 4, 'adventure', 'self'),
  presentedSpell('paleProcession', 'Pale Procession', 'grave', 5, 'adventure', 'self'),
  presentedSpell('silenceThePassing', 'Silence the Passing', 'grave', 4, 'staple', 'self'),
  presentedSpell('theToll', 'The Toll', 'grave', 5, 'scaling', 'self'),
  presentedSpell('deathsLedger', "Death's Ledger", 'grave', 6, 'adventure', 'self', 'always', undefined, 'rare'),
  presentedSpell('graveSpeech', 'Grave-Speech', 'grave', 5, 'adventure', 'self', 'always', undefined, 'rare'),

  presentedSpell('gale', 'Gale', 'wild', 3, 'staple', 'strongestEnemy', 'always', undefined, 'common'),
  presentedSpell('bloom', 'Bloom', 'wild', 3, 'staple', 'strongestAlly', 'always', undefined, 'common'),
  presentedSpell('overgrow', 'Overgrow', 'wild', 4, 'twister', 'counterPile', 'always', 'overgrow', 'common'),
  presentedSpell('thicket', 'Thicket', 'wild', 4, 'staple', 'self', 'always', undefined, 'common'),
  presentedSpell('rains', 'Rains', 'wild', 3, 'staple', 'self', 'always', undefined, 'common'),
  presentedSpell('beastTongue', 'Beast Tongue', 'wild', 5, 'adventure', 'self'),
  presentedSpell('stampedeCall', 'Stampede Call', 'wild', 6, 'build-around', 'self'),
  presentedSpell('storm', 'Storm', 'wild', 6, 'build-around', 'self'),
  presentedSpell('greenway', 'Greenway', 'wild', 5, 'topology', 'self'),
  presentedSpell('wildGrowth', 'Wild Growth', 'wild', 5, 'adventure', 'self'),
  presentedSpell('murmuration', 'Murmuration', 'wild', 3, 'adventure', 'self', 'always', undefined, 'common'),
  presentedSpell('greenTide', 'Green Tide', 'wild', 5, 'adventure', 'self'),
  presentedSpell('rootAndRuin', 'Root and Ruin', 'wild', 5, 'adventure', 'self'),
  presentedSpell('fickleWeather', 'Fickle Weather', 'wild', 6, 'adventure', 'self', 'always', undefined, 'rare'),
  presentedSpell('shedSkin', 'Shed Skin', 'wild', 4, 'staple', 'weakestAlly'),
  presentedSpell('hedgerowMarch', 'Hedgerow March', 'wild', 5, 'enchantment', 'enchantmentSlot', 'round1'),

  presentedSpell('hourglassCrack', 'Hourglass Crack', 'craft', 6, 'build-around', 'strongestAlly', 'always', undefined, 'rare'),
  presentedSpell('borrowShape', 'Borrow Shape', 'wild', 5, 'build-around', 'strongestAlly', 'always', undefined, 'rare'),
  presentedSpell('echo', 'Echo', 'rite', 4, 'build-around', 'self', 'always', undefined, 'rare'),
  presentedSpell('loyalUntoDeath', 'Loyal Unto Death', 'grave', 4, 'build-around', 'strongestAlly', 'always', undefined, 'rare'),
];
