import type { SpellId } from '../../core/types';
import type { ContentAssetRequirement } from '../v2/schema';

export const P1_RITE_CRAFT_SPELL_IDS = [
  'kindle', 'sunlance', 'steadyHands', 'wellspring', 'secondWind', 'litanyOfDawn',
  'holdTheLine', 'consecratedGround', 'reprise', 'rivet', 'whetstone', 'shrapnel',
  'ammunitionCart', 'detonate', 'clockworkDouble', 'blink', 'overclock', 'dimensionDoor',
] as const satisfies readonly SpellId[];

/** Every docs-61 P1 Rite/Craft row, including the six repaired existing faces. */
export const P1_RITE_CRAFT_AUDIT_IDS = [
  'kindle', 'sunlance', 'steadyHands', 'wellspring', 'blessing', 'census',
  'secondWind', 'standardOfDawn', 'litanyOfDawn', 'trial', 'holdTheLine',
  'consecratedGround', 'reprise', 'rivet', 'forgeSpark', 'whetstone', 'shrapnel',
  'ammunitionCart', 'unmake', 'detonate', 'clockworkDouble', 'blink', 'overclock',
  'dimensionDoor',
] as const satisfies readonly SpellId[];

const subjects: Record<typeof P1_RITE_CRAFT_SPELL_IDS[number], string> = {
  kindle: 'a small steady votive flame striking one wooden company marker',
  sunlance: 'one narrow dawn-bright spear descending onto a company marker',
  steadyHands: 'two calm gloved hands fastening a bright wrist ribbon',
  wellspring: 'two distant cups joined by one clear rising stream',
  secondWind: 'a fallen wooden figure returning beneath a handbell',
  litanyOfDawn: 'a sunrise hymn ribbon reaching a whole company line',
  holdTheLine: 'one last standing figure braced behind a low banner',
  consecratedGround: 'a battlefield tile ringed by Rite tuning marks',
  reprise: 'one company marker followed by two close action arrows',
  rivet: 'a bright rivet fastening a small shield plate',
  whetstone: 'a whetstone drawing one clean spark from a blade',
  shrapnel: 'one ranged impact splitting toward neighboring markers',
  ammunitionCart: 'a compact arrow cart beside refilled quivers',
  detonate: 'ember pips collapsing into one contained blast',
  clockworkDouble: 'a brass pattern wheel producing a second company marker',
  blink: 'one company marker crossing between two hinged empty hexes',
  overclock: 'a wound spring driving two action arrows before a stopped gear',
  dimensionDoor: 'a folded map passing through one freestanding brass door',
};

/** Native art is deliberately pending; docs-60–67 development uses typed tier/school placeholders. */
export const P1_RITE_CRAFT_SPELL_ASSET_REQUIREMENTS: readonly ContentAssetRequirement[] =
  P1_RITE_CRAFT_SPELL_IDS.map((id) => ({
    canonicalId: `spell:${id}`,
    semantics: {
      family: 'spell',
      school: id === 'rivet' || id === 'whetstone' || id === 'shrapnel'
        || id === 'ammunitionCart' || id === 'detonate' || id === 'clockworkDouble'
        || id === 'blink' || id === 'overclock' || id === 'dimensionDoor' ? 'craft' : 'rite',
      tier: id === 'secondWind' || id === 'ammunitionCart' ? 2
        : id === 'litanyOfDawn' || id === 'detonate' || id === 'clockworkDouble'
          || id === 'blink' ? 3
          : id === 'holdTheLine' || id === 'consecratedGround' || id === 'reprise'
            || id === 'overclock' || id === 'dimensionDoor' ? 4 : 1,
    },
    introducedBy: 'docs-60-67',
    nativeAssetId: `spell:${id}`,
    visualSubject: subjects[id],
    accessibleName: `${id} spell icon`,
  }));
