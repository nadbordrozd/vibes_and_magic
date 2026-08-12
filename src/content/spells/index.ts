import type { SpellId, SpellSchool } from '../../core/types';
import { spellFlavor } from '../flavor';
import { spellRulePlainText, type SpellRuleVersions } from '../spellLexicon';
import { SPELL_RULE_PRESENTATIONS } from './rulePresentation';

export type EffectOperation = 'amplify' | 'reflect' | 'sour' | 'unmake' | 'overgrow';

export interface SpellDefinition {
  id: SpellId;
  name: string;
  flavor: string;
  school: SpellSchool;
  mana: number | 'X';
  kind: 'staple' | 'enchantment' | 'twister' | 'scaling' | 'build-around'
    | 'adventure' | 'topology';
  rarity?: 'common' | 'uncommon' | 'rare';
  base: string;
  plus: string;
  rulePresentation?: SpellRuleVersions;
  aiHints: {
    target: 'strongestEnemy' | 'weakestAlly' | 'strongestAlly'
      | 'self' | 'enchantmentSlot' | 'counterPile';
    castWhen: 'always' | 'losing' | 'winning' | 'round1';
    manaAbove?: number;
  };
  effectOperation?: EffectOperation;
}
import { EXPANSION_SPELLS } from './expansion';

const spell = (
  id: SpellId, name: string, school: SpellSchool, mana: number | 'X',
  kind: SpellDefinition['kind'], base: string, plus: string,
  target: SpellDefinition['aiHints']['target'] = 'strongestEnemy',
  castWhen: SpellDefinition['aiHints']['castWhen'] = 'always',
  effectOperation?: EffectOperation,
): SpellDefinition => ({
  id, name, flavor: spellFlavor(name), school, mana, kind, base, plus,
  aiHints: { target, castWhen }, effectOperation,
});

const presentedSpell = (
  id: SpellId, name: string, school: SpellSchool, mana: number | 'X',
  kind: SpellDefinition['kind'],
  target: SpellDefinition['aiHints']['target'] = 'strongestEnemy',
  castWhen: SpellDefinition['aiHints']['castWhen'] = 'always',
  effectOperation?: EffectOperation,
): SpellDefinition => {
  const rules = SPELL_RULE_PRESENTATIONS[id];
  if (!rules) throw new Error(`Missing structured spell rules: ${id}`);
  return {
    ...spell(id, name, school, mana, kind,
      spellRulePlainText(rules.standard), spellRulePlainText(rules.upgraded),
      target, castWhen, effectOperation),
    rulePresentation: rules,
  };
};

export const SPELLS: Record<SpellId, SpellDefinition> = Object.fromEntries([
  presentedSpell('rally', 'Rally', 'rite', 5, 'staple', 'strongestAlly'),
  presentedSpell('blessing', 'Blessing', 'rite', 3, 'staple', 'strongestAlly'),
  presentedSpell('standardOfDawn', 'Standard of Dawn', 'rite', 5, 'enchantment', 'enchantmentSlot', 'round1'),
  presentedSpell('amplify', 'Amplify', 'rite', 4, 'twister', 'counterPile', 'always', 'amplify'),
  presentedSpell('sanctuary', 'Sanctuary', 'rite', 4, 'staple', 'strongestAlly'),
  presentedSpell('oathOfIron', 'Oath of Iron', 'rite', 4, 'staple', 'strongestAlly'),
  presentedSpell('consecrate', 'Consecrate', 'rite', 3, 'staple', 'weakestAlly'),
  presentedSpell('hymnOfTheHost', 'Hymn of the Host', 'rite', 5, 'scaling', 'self'),
  presentedSpell('trial', 'Trial', 'rite', 6, 'build-around'),
  presentedSpell('forgeSpark', 'Forge-Spark', 'craft', 3, 'staple'),
  presentedSpell('ward', 'Ward', 'craft', 4, 'staple', 'strongestAlly'),
  presentedSpell('reflect', 'Reflect', 'craft', 4, 'twister', 'counterPile', 'always', 'reflect'),
  presentedSpell('forgefire', 'Forgefire', 'craft', 5, 'enchantment', 'enchantmentSlot', 'round1'),
  presentedSpell('clockworkEscort', 'Clockwork Escort', 'craft', 5, 'staple', 'self'),
  presentedSpell('wallOfTheMaker', 'Wall of the Maker', 'craft', 4, 'staple', 'self'),
  presentedSpell('quicksilver', 'Quicksilver', 'craft', 3, 'staple', 'strongestAlly'),
  presentedSpell('unmake', 'Unmake', 'craft', 4, 'staple', 'counterPile', 'always', 'unmake'),
  presentedSpell('ironclad', 'Ironclad', 'craft', 6, 'enchantment', 'enchantmentSlot', 'round1'),
  presentedSpell('wither', 'Wither', 'grave', 3, 'staple'),
  presentedSpell('graveChill', 'Grave-Chill', 'grave', 3, 'staple'),
  presentedSpell('mournersVeil', "Mourner's Veil", 'grave', 4, 'staple', 'strongestAlly'),
  presentedSpell('dirge', 'Dirge', 'grave', 5, 'scaling'),
  presentedSpell('lastCandle', 'Last Candle', 'grave', 5, 'enchantment', 'enchantmentSlot', 'round1'),
  presentedSpell('sour', 'Sour', 'grave', 4, 'twister', 'counterPile', 'always', 'sour'),
  presentedSpell('remembrance', 'Remembrance', 'grave', 5, 'staple', 'weakestAlly'),
  presentedSpell('reckoning', 'Reckoning', 'grave', 'X', 'build-around', 'self', 'losing'),
  presentedSpell('quiet', 'Quiet', 'grave', 4, 'staple'),
  ...EXPANSION_SPELLS,
].map((entry) => [entry.id, entry])) as Record<SpellId, SpellDefinition>;

const BASE_COMMON = new Set<SpellId>([
  'rally', 'blessing', 'sanctuary', 'oathOfIron', 'consecrate',
  'forgeSpark', 'ward', 'clockworkEscort', 'wallOfTheMaker', 'quicksilver',
  'wither', 'graveChill', 'mournersVeil', 'remembrance',
]);
for (const id of Object.keys(SPELLS) as SpellId[]) {
  if (SPELLS[id].rarity) continue;
  SPELLS[id].rarity = BASE_COMMON.has(id) ? 'common'
    : id === 'trial' || id === 'reckoning' ? 'rare' : 'uncommon';
}

SPELLS.reckoning.aiHints.manaAbove = 12;

export const SPELL_IDS = Object.keys(SPELLS) as SpellId[];
export const SCHOOL_SPELLS = (school: SpellSchool) =>
  SPELL_IDS.filter((id) => SPELLS[id].school === school);
const PROVENANCE = new Set<SpellId>([
  'hourglassCrack', 'borrowShape', 'echo', 'loyalUntoDeath',
]);
export const ACQUIRABLE_SCHOOL_SPELLS = (school: SpellSchool) =>
  SCHOOL_SPELLS(school).filter((id) => !PROVENANCE.has(id) && id !== 'summonSkiff');

export const SCROLL_SPELL_IDS = SPELL_IDS.filter((id) =>
  SPELLS[id].rarity !== 'rare'
  && !['adventure', 'topology'].includes(SPELLS[id].kind));

export function validateSpells(): void {
  for (const definition of Object.values(SPELLS)) {
    if (!definition.name || !definition.flavor.trim() || !definition.base || !definition.plus) {
      throw new Error(`Invalid spell definition: ${definition.id}`);
    }
  }
}
