import type { SpellId } from '../../core/types';
import type { ContentAssetRequirement } from '../v2/schema';

export const P1_GRAVE_WILD_SPELL_IDS = [
  'pinchOfAsh', 'tithe', 'grudge', 'yoke', 'graveBargain', 'puppetStrings',
  'nettle', 'bramblelash', 'wildcall', 'sapAndSinew', 'verdantSurge',
  'theTurningYear', 'fly',
] as const satisfies readonly SpellId[];

export const P1_GRAVE_WILD_AUDIT_IDS = [
  'pinchOfAsh', 'tithe', 'grudge', 'wither', 'yoke', 'graveBargain', 'puppetStrings',
  'nettle', 'bramblelash', 'wildcall', 'sapAndSinew', 'shedSkin', 'hedgerowMarch',
  'verdantSurge', 'theTurningYear', 'fly',
] as const satisfies readonly SpellId[];

const subjects: Record<typeof P1_GRAVE_WILD_SPELL_IDS[number], string> = {
  pinchOfAsh: 'a thumb and finger scattering ash across a marked company token',
  tithe: 'a dark offering bowl receiving one red wooden counter',
  grudge: 'a knotted black thread tightening around a company marker',
  yoke: 'two company markers joined by one gravewood yoke',
  graveBargain: 'one fallen company token beside a replenished black mana cup',
  puppetStrings: 'a company marker pulled across a battle seam by bone strings',
  nettle: 'a stinging nettle sprig laid across a chilled company marker',
  bramblelash: 'a thorn whip striking a marker beside fresh undergrowth',
  wildcall: 'a horn calling one shadowed woodland beast onto an empty hex',
  sapAndSinew: 'green sap binding a swift beast limb like a tendon',
  verdantSurge: 'green counter pips flowing across both battle lines',
  theTurningYear: 'four seasonal counter pips turning around one chosen pip',
  fly: 'a small hero pennant crossing mountains and water beneath broad wings',
};

export const P1_GRAVE_WILD_SPELL_ASSET_REQUIREMENTS: readonly ContentAssetRequirement[] =
  P1_GRAVE_WILD_SPELL_IDS.map((id) => ({
    canonicalId: `spell:${id}`,
    semantics: {
      family: 'spell',
      school: ['pinchOfAsh', 'tithe', 'grudge', 'yoke', 'graveBargain', 'puppetStrings']
        .includes(id) ? 'grave' : 'wild',
      tier: id === 'yoke' || id === 'wildcall' || id === 'sapAndSinew' ? 2
        : id === 'graveBargain' || id === 'puppetStrings' || id === 'verdantSurge' ? 3
          : id === 'theTurningYear' ? 4 : id === 'fly' ? 5 : 1,
    },
    introducedBy: 'docs-60-67', nativeAssetId: `spell:${id}`,
    visualSubject: subjects[id], accessibleName: `${id} spell icon`,
  }));
