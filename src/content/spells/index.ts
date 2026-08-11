import type { SpellId, SpellSchool } from '../../core/types';
import { spellFlavor } from '../flavor';

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

export const SPELLS: Record<SpellId, SpellDefinition> = Object.fromEntries([
  spell('rally', 'Rally', 'rite', 5, 'staple', 'Grant +50 morale to one ally.', 'Grant +50 morale to two allies instead of one.', 'strongestAlly'),
  spell('blessing', 'Blessing', 'rite', 3, 'staple', 'The ally’s next attack rolls maximum damage.', 'The ally’s next attack rolls maximum damage and it gains +10 morale.', 'strongestAlly'),
  spell('standardOfDawn', 'Standard of Dawn', 'rite', 5, 'enchantment', 'Allied kills grant +10 morale.', 'Allied kills grant +10 morale, and allied morale cannot be drained.', 'enchantmentSlot', 'round1'),
  spell('amplify', 'Amplify', 'rite', 4, 'twister', 'Double one active effect.', 'Double one active effect and extend its applicable duration or decay.', 'counterPile', 'always', 'amplify'),
  spell('sanctuary', 'Sanctuary', 'rite', 4, 'staple', 'One ally cannot be targeted by enemy spells.', 'Remove that ally’s counters, then prevent enemy spells from targeting it.', 'strongestAlly'),
  spell('oathOfIron', 'Oath of Iron', 'rite', 4, 'staple', 'Incoming attacks against the ally roll minimum damage.', 'Incoming attacks against the ally roll minimum damage, and it gains unlimited retaliations.', 'strongestAlly'),
  spell('consecrate', 'Consecrate', 'rite', 3, 'staple', 'Cleanse one ally and heal 8% of its maximum HP.', 'Cleanse one ally and heal 15% of its maximum HP; removed counters also grant morale.', 'weakestAlly'),
  spell('hymnOfTheHost', 'Hymn of the Host', 'rite', 5, 'scaling', 'Allies gain 8 morale per extra action.', 'Allies gain 12 morale per extra action instead of 8.', 'self'),
  spell('trial', 'Trial', 'rite', 6, 'build-around', 'A larger enemy loses 25% of its current HP.', 'A larger enemy loses 35% of its current HP instead of 25%.'),
  spell('forgeSpark', 'Forge-Spark', 'craft', 3, 'staple', 'Give one enemy Burn 3.', 'Give the target Burn 4 instead of 3 and each adjacent enemy Burn 1.'),
  spell('ward', 'Ward', 'craft', 4, 'staple', 'The next enemy attack against the ally deals 0 damage.', 'The next enemy attack against the ally deals 0 damage, and its attacker gains Burn 2.', 'strongestAlly'),
  spell('reflect', 'Reflect', 'craft', 4, 'twister', 'Copy one active effect to one other legal target.', 'Copy one active effect to two other legal targets instead of one.', 'counterPile', 'always', 'reflect'),
  spell('forgefire', 'Forgefire', 'craft', 5, 'enchantment', 'Burn damage is doubled.', 'Burn damage is doubled, and Burn on enemies does not decay.', 'enchantmentSlot', 'round1'),
  spell('clockworkEscort', 'Clockwork Escort', 'craft', 5, 'staple', 'Summon a company of Tin Soldiers.', 'Summon the stronger Marionettes instead of Tin Soldiers.', 'self'),
  spell('wallOfTheMaker', 'Wall of the Maker', 'craft', 4, 'staple', 'Create three wall hexes.', 'Create three wall hexes that also give adjacent enemies Burn.', 'self'),
  spell('quicksilver', 'Quicksilver', 'craft', 3, 'staple', 'Give one ally +3 speed and phase for 2 rounds.', 'Give one ally +3 speed and phase for the whole battle instead of 2 rounds.', 'strongestAlly'),
  spell('unmake', 'Unmake', 'craft', 4, 'staple', 'Destroy either an enchantment or a counter pile.', 'Destroy both the chosen enchantment and its applicable counter pile.', 'counterPile', 'always', 'unmake'),
  spell('ironclad', 'Ironclad', 'craft', 6, 'enchantment', 'Allies with Defense 12 or higher take half damage.', 'Allies with Defense 10 or higher take half damage instead of requiring 12.', 'enchantmentSlot', 'round1'),
  spell('wither', 'Wither', 'grave', 3, 'staple', 'Give one enemy Hex 6.', 'Give one enemy Hex 8 instead of 6 and Chill 2.'),
  spell('graveChill', 'Grave-Chill', 'grave', 3, 'staple', 'Give one enemy Chill 3.', 'Give one enemy Chill 3 and drain 20 morale.'),
  spell('mournersVeil', "Mourner's Veil", 'grave', 4, 'staple', 'One ally takes 20% less damage.', 'For 3 rounds, one ally takes 20% less damage and its attackers gain Hex.', 'strongestAlly'),
  spell('dirge', 'Dirge', 'grave', 5, 'scaling', 'One enemy loses 3% current HP per destroyed company.', 'One enemy loses 5% current HP per destroyed company instead of 3%.'),
  spell('lastCandle', 'Last Candle', 'grave', 5, 'enchantment', 'An allied death gives enemies Hex 2 and allies +20 morale.', 'An allied death gives enemies Hex 2, allies +20 morale, and refunds 2 mana.', 'enchantmentSlot', 'round1'),
  spell('sour', 'Sour', 'grave', 4, 'twister', 'Invert one beneficial active effect.', 'Invert one beneficial active effect; destroying an enchantment also gives enemies Hex.', 'counterPile', 'always', 'sour'),
  spell('remembrance', 'Remembrance', 'grave', 5, 'staple', 'Revive 20% of one company’s losses.', 'Revive 35% of one company’s losses instead of 20%.', 'weakestAlly'),
  spell('reckoning', 'Reckoning', 'grave', 'X', 'build-around', 'All companies lose 2% current HP per mana spent.', 'All companies lose 2% current HP per mana spent, but allied companies take half that loss.', 'self', 'losing'),
  spell('quiet', 'Quiet', 'grave', 4, 'staple', 'One enemy cannot retaliate.', 'One enemy cannot retaliate and gains Chill 2.'),
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
