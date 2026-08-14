import type { SpellId } from '../../core/types';
import type { ContentAssetRequirement } from '../v2/schema';

/** All docs-61 P2 rows, including the two existing entries whose Upgraded rules are repaired. */
export const P2_SPELL_AUDIT_IDS = [
  'scrying', 'bellBookAndCandle', 'processionOfLamps', 'dayspring', 'theLongOath',
  'prospect', 'falseColors', 'counterweight', 'bulwark', 'standingMirror',
  'theUnmakingEngine', 'mirrorHall',
  'secondGrave', 'ashenPall', 'theLedgerBalanced', 'ossuary', 'stealAway',
  'theLongSilence', 'harvest', 'theDebtCalled',
  'beastSense', 'illWind', 'rootTheSky', 'beastSovereign', 'windShear',
  'theLongGreen', 'theWeatherItself',
] as const satisfies readonly SpellId[];

export const P2_NEW_SPELL_IDS = P2_SPELL_AUDIT_IDS.filter((id) =>
  id !== 'falseColors' && id !== 'standingMirror') as Exclude<
    typeof P2_SPELL_AUDIT_IDS[number], 'falseColors' | 'standingMirror'
  >[];

const school = (id: typeof P2_NEW_SPELL_IDS[number]) => {
  const rite = new Set<SpellId>([
    'scrying', 'bellBookAndCandle', 'processionOfLamps', 'dayspring', 'theLongOath',
  ]);
  const craft = new Set<SpellId>([
    'prospect', 'counterweight', 'bulwark', 'theUnmakingEngine', 'mirrorHall',
  ]);
  const grave = new Set<SpellId>([
    'secondGrave', 'ashenPall', 'theLedgerBalanced', 'ossuary', 'stealAway',
    'theLongSilence', 'harvest', 'theDebtCalled',
  ]);
  return rite.has(id) ? 'rite' as const : craft.has(id) ? 'craft' as const
    : grave.has(id) ? 'grave' as const : 'wild' as const;
};

const tier = (id: typeof P2_NEW_SPELL_IDS[number]): 1 | 2 | 3 | 4 | 5 => {
  if (['prospect', 'beastSense'].includes(id)) return 1;
  if (['scrying', 'counterweight', 'secondGrave', 'illWind'].includes(id)) return 2;
  if (['bellBookAndCandle', 'processionOfLamps', 'ashenPall', 'rootTheSky'].includes(id)) return 3;
  if (['bulwark', 'theLedgerBalanced', 'ossuary', 'stealAway', 'beastSovereign', 'windShear'].includes(id)) return 4;
  return 5;
};

const SUBJECTS: Record<typeof P2_NEW_SPELL_IDS[number], string> = {
  scrying: 'a brass seeing-glass casting a measured circle across a folded map',
  bellBookAndCandle: 'a handbell, open oath-book, and single candle joined by dawn thread',
  processionOfLamps: 'a road of small hooded lamps leading two hero pennants onward',
  dayspring: 'a full sunrise lifting fallen company figures across the allied line',
  theLongOath: 'an unbroken illuminated oath winding around a battle standard',
  prospect: 'a surveyor pick revealing ore marks beneath a gridded map',
  counterweight: 'a heavy brass plumb holding a company marker against opposing arrows',
  bulwark: 'a straight portable wall with one compact watchtower at its centre',
  theUnmakingEngine: 'a great toothed machine drawing loose enchantment threads from an army',
  mirrorHall: 'a corridor of standing mirrors repeating one spell toward a second target',
  secondGrave: 'one company marker rising from a second neatly marked grave',
  ashenPall: 'a broad ash veil settling hex and chill marks across an enemy line',
  theLedgerBalanced: 'a black ledger balancing fallen allied figures against one enemy company',
  ossuary: 'a bone cabinet releasing one small candle-lit company',
  stealAway: 'a mine cart quietly changing tracks toward a distant rival banner',
  theLongSilence: 'a dark bell wrapped shut while coins of mana fall away',
  harvest: 'a grave sickle moving enemy life into restored allied company figures',
  theDebtCalled: 'an opened debt ledger pinning a distant hero pennant in place',
  beastSense: 'a pawprint and antler seen clearly through a woodland scouting glass',
  illWind: 'a cold wind carrying chill pips toward several distant hero banners',
  rootTheSky: 'thick roots pulling winged company figures down toward the field',
  beastSovereign: 'an antlered green crown above a gathered line of beasts',
  windShear: 'a radial gust scattering company markers from one chosen hex',
  theLongGreen: 'a great green wave restoring allies and binding enemies in thorned counters',
  theWeatherItself: 'a five-part weather wheel of hail, fog, squall, sun, and frost',
};

export const P2_SPELL_ASSET_REQUIREMENTS: readonly ContentAssetRequirement[] =
  P2_NEW_SPELL_IDS.map((id) => ({
    canonicalId: `spell:${id}`, nativeAssetId: `spell:${id}`,
    introducedBy: 'docs-60-67', visualSubject: SUBJECTS[id],
    accessibleName: `${id} spell icon`,
    semantics: { family: 'spell', school: school(id), tier: tier(id) },
  }));
