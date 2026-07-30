import type { SpellId, SpellSchool } from '../../core/types';

export interface SpellDefinition {
  id: SpellId;
  name: string;
  school: SpellSchool;
  mana: number | 'X';
  kind: 'staple' | 'enchantment' | 'twister' | 'scaling' | 'build-around';
  base: string;
  plus: string;
  aiHints: {
    target: 'strongestEnemy' | 'weakestAlly' | 'strongestAlly'
      | 'self' | 'enchantmentSlot' | 'counterPile';
    castWhen: 'always' | 'losing' | 'winning' | 'round1';
    manaAbove?: number;
  };
}

const spell = (
  id: SpellId, name: string, school: SpellSchool, mana: number | 'X',
  kind: SpellDefinition['kind'], base: string, plus: string,
  target: SpellDefinition['aiHints']['target'] = 'strongestEnemy',
  castWhen: SpellDefinition['aiHints']['castWhen'] = 'always',
): SpellDefinition => ({
  id, name, school, mana, kind, base, plus,
  aiHints: { target, castWhen },
});

export const SPELLS: Record<SpellId, SpellDefinition> = Object.fromEntries([
  spell('rally', 'Rally', 'rite', 5, 'staple', 'Ally +50 meter.', 'Two allies +50.', 'strongestAlly'),
  spell('blessing', 'Blessing', 'rite', 3, 'staple', 'Next attack rolls maximum.', 'Also +10 meter.', 'strongestAlly'),
  spell('standardOfDawn', 'Standard of Dawn', 'rite', 5, 'enchantment', 'Kills grant +10 meter.', 'Immune to meter drain.', 'enchantmentSlot', 'round1'),
  spell('amplify', 'Amplify', 'rite', 4, 'twister', 'Double an active effect.', 'Also extend decay/duration.', 'counterPile'),
  spell('sanctuary', 'Sanctuary', 'rite', 4, 'staple', 'Ally cannot be targeted by enemy spells.', 'Also remove counters.', 'strongestAlly'),
  spell('oathOfIron', 'Oath of Iron', 'rite', 4, 'staple', 'Incoming attacks roll minimum.', 'Unlimited retaliations.', 'strongestAlly'),
  spell('consecrate', 'Consecrate', 'rite', 3, 'staple', 'Cleanse and heal 8%.', 'Heal 15%; counters grant meter.', 'weakestAlly'),
  spell('hymnOfTheHost', 'Hymn of the Host', 'rite', 5, 'scaling', 'Allies gain 8 meter per extra action.', 'Gain ×1.5.', 'self'),
  spell('trial', 'Trial', 'rite', 6, 'build-around', 'Larger enemy takes 25% current HP.', 'Takes 35%.'),
  spell('forgeSpark', 'Forge-Spark', 'craft', 3, 'staple', 'Burn 3.', 'Burn 4; adjacent enemies Burn 1.'),
  spell('ward', 'Ward', 'craft', 4, 'staple', 'Next enemy attack deals 0.', 'Attacker also gains Burn 2.', 'strongestAlly'),
  spell('reflect', 'Reflect', 'craft', 4, 'twister', 'Copy an effect to another target.', 'Copy to two targets.', 'counterPile'),
  spell('forgefire', 'Forgefire', 'craft', 5, 'enchantment', 'Burn damage doubles.', 'Enemy Burn does not decay.', 'enchantmentSlot', 'round1'),
  spell('clockworkEscort', 'Clockwork Escort', 'craft', 5, 'staple', 'Summon Tin Soldiers.', 'Summon Marionettes.', 'self'),
  spell('wallOfTheMaker', 'Wall of the Maker', 'craft', 4, 'staple', 'Create three wall hexes.', 'Walls Burn adjacent enemies.', 'self'),
  spell('quicksilver', 'Quicksilver', 'craft', 3, 'staple', '+3 speed and phase for 2 rounds.', 'Lasts all battle.', 'strongestAlly'),
  spell('unmake', 'Unmake', 'craft', 4, 'staple', 'Destroy enchantment or counters.', 'Do both.', 'counterPile'),
  spell('ironclad', 'Ironclad', 'craft', 6, 'enchantment', 'Defense 12+ takes half damage.', 'Threshold 10.', 'enchantmentSlot', 'round1'),
  spell('wither', 'Wither', 'grave', 3, 'staple', 'Hex 6.', 'Hex 8 and Chill 2.'),
  spell('graveChill', 'Grave-Chill', 'grave', 3, 'staple', 'Chill 3.', 'Also −20 meter.'),
  spell('mournersVeil', "Mourner's Veil", 'grave', 4, 'staple', 'Ally takes −20% damage.', '3 rounds; attackers gain Hex.', 'strongestAlly'),
  spell('dirge', 'Dirge', 'grave', 5, 'scaling', '3% current HP per destroyed stack.', '5% per stack.'),
  spell('lastCandle', 'Last Candle', 'grave', 5, 'enchantment', 'Allied death: enemies Hex 2, allies +20 meter.', 'Also refund 2 mana.', 'enchantmentSlot', 'round1'),
  spell('sour', 'Sour', 'grave', 4, 'twister', 'Invert a beneficial effect.', 'Destroyed enchantment Hexes enemies.', 'counterPile'),
  spell('remembrance', 'Remembrance', 'grave', 5, 'staple', 'Revive 20% of stack losses.', 'Revive 35%.', 'weakestAlly'),
  spell('reckoning', 'Reckoning', 'grave', 'X', 'build-around', 'All stacks take 2% current HP per mana.', 'Allies take half.', 'self', 'losing'),
  spell('quiet', 'Quiet', 'grave', 4, 'staple', 'Enemy cannot retaliate.', 'Also Chill 2.'),
].map((entry) => [entry.id, entry])) as Record<SpellId, SpellDefinition>;

SPELLS.reckoning.aiHints.manaAbove = 12;

export const SPELL_IDS = Object.keys(SPELLS) as SpellId[];
export const SCHOOL_SPELLS = (school: SpellSchool) =>
  SPELL_IDS.filter((id) => SPELLS[id].school === school);
