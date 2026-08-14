import type { SpellId, SpellSchool } from '../../core/types';
import { spellFlavor } from '../flavor';
import {
  DOCS_60_67_SPELL_LEXICON_ASSET_REQUIREMENTS, spellRulePlainText,
  type SpellRuleVersions,
} from '../spellLexicon';
import { SPELL_RULE_PRESENTATIONS } from './rulePresentation';
import {
  SPELL_MANA_BANDS,
  type SpellScalingShape, type SpellTargetingMode, type SpellTier, type SpellV2Fields,
} from '../v2/schema';
import { validateSpellV2Schemas } from '../v2/validation';
import { validateContentAssets } from '../v2/assets';
import {
  P1_RITE_CRAFT_SPELL_ASSET_REQUIREMENTS,
} from './p1RiteCraft';
import { P1_GRAVE_WILD_SPELL_ASSET_REQUIREMENTS } from './p1GraveWild';
import { P2_SPELL_ASSET_REQUIREMENTS } from './p2';
export {
  P1_RITE_CRAFT_AUDIT_IDS, P1_RITE_CRAFT_SPELL_ASSET_REQUIREMENTS,
  P1_RITE_CRAFT_SPELL_IDS,
} from './p1RiteCraft';
export {
  P1_GRAVE_WILD_AUDIT_IDS, P1_GRAVE_WILD_SPELL_ASSET_REQUIREMENTS,
  P1_GRAVE_WILD_SPELL_IDS,
} from './p1GraveWild';
export { P2_NEW_SPELL_IDS, P2_SPELL_AUDIT_IDS, P2_SPELL_ASSET_REQUIREMENTS } from './p2';

export type EffectOperation = 'amplify' | 'reflect' | 'sour' | 'unmake' | 'overgrow';

export interface SpellDefinition extends SpellV2Fields {
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
  presentedSpell('kindle', 'Kindle', 'rite', 2, 'staple'),
  presentedSpell('sunlance', 'Sunlance', 'rite', 4, 'staple'),
  presentedSpell('steadyHands', 'Steady Hands', 'rite', 3, 'staple', 'strongestAlly'),
  presentedSpell('wellspring', 'Wellspring', 'rite', 5, 'adventure', 'strongestAlly'),
  presentedSpell('secondWind', 'Second Wind', 'rite', 6, 'staple', 'weakestAlly', 'losing'),
  presentedSpell('litanyOfDawn', 'Litany of Dawn', 'rite', 10, 'staple', 'self'),
  presentedSpell('holdTheLine', 'Hold the Line', 'rite', 15, 'enchantment', 'enchantmentSlot', 'round1'),
  presentedSpell('consecratedGround', 'Consecrated Ground', 'rite', 13, 'build-around', 'self', 'round1'),
  presentedSpell('reprise', 'Reprise', 'rite', 13, 'staple', 'strongestAlly'),
  presentedSpell('scrying', 'Scrying', 'rite', 6, 'adventure', 'self'),
  presentedSpell('bellBookAndCandle', 'Bell, Book, and Candle', 'rite', 11, 'enchantment', 'enchantmentSlot', 'round1'),
  presentedSpell('processionOfLamps', 'Procession of Lamps', 'rite', 9, 'adventure', 'self'),
  presentedSpell('dayspring', 'Dayspring', 'rite', 24, 'staple', 'self', 'losing'),
  presentedSpell('theLongOath', 'The Long Oath', 'rite', 21, 'enchantment', 'enchantmentSlot', 'round1'),
  presentedSpell('forgeSpark', 'Forge-Spark', 'craft', 4, 'staple'),
  presentedSpell('ward', 'Ward', 'craft', 4, 'staple', 'strongestAlly'),
  presentedSpell('reflect', 'Reflect', 'craft', 4, 'twister', 'counterPile', 'always', 'reflect'),
  presentedSpell('forgefire', 'Forgefire', 'craft', 5, 'enchantment', 'enchantmentSlot', 'round1'),
  presentedSpell('clockworkEscort', 'Clockwork Escort', 'craft', 5, 'staple', 'self'),
  presentedSpell('wallOfTheMaker', 'Wall of the Maker', 'craft', 4, 'staple', 'self'),
  presentedSpell('quicksilver', 'Quicksilver', 'craft', 3, 'staple', 'strongestAlly'),
  presentedSpell('unmake', 'Unmake', 'craft', 4, 'staple', 'counterPile', 'always', 'unmake'),
  presentedSpell('ironclad', 'Ironclad', 'craft', 6, 'enchantment', 'enchantmentSlot', 'round1'),
  presentedSpell('rivet', 'Rivet', 'craft', 2, 'staple', 'strongestAlly'),
  presentedSpell('whetstone', 'Whetstone', 'craft', 3, 'staple', 'strongestAlly'),
  presentedSpell('shrapnel', 'Shrapnel', 'craft', 4, 'staple', 'strongestAlly'),
  presentedSpell('ammunitionCart', 'Ammunition Cart', 'craft', 6, 'staple', 'self'),
  presentedSpell('detonate', 'Detonate', 'craft', 9, 'build-around'),
  presentedSpell('clockworkDouble', 'Clockwork Double', 'craft', 11, 'build-around', 'strongestAlly'),
  presentedSpell('blink', 'Blink', 'craft', 10, 'staple', 'strongestAlly'),
  presentedSpell('overclock', 'Overclock', 'craft', 13, 'staple', 'strongestAlly'),
  presentedSpell('dimensionDoor', 'Dimension Door', 'craft', 16, 'adventure', 'self'),
  presentedSpell('prospect', 'Prospect', 'craft', 6, 'adventure', 'self'),
  presentedSpell('counterweight', 'Counterweight', 'craft', 7, 'staple', 'strongestAlly'),
  presentedSpell('bulwark', 'Bulwark', 'craft', 14, 'staple', 'self', 'round1'),
  presentedSpell('theUnmakingEngine', 'The Unmaking Engine', 'craft', 24, 'staple', 'self', 'losing'),
  presentedSpell('mirrorHall', 'Mirror Hall', 'craft', 22, 'enchantment', 'enchantmentSlot', 'round1'),
  presentedSpell('wither', 'Wither', 'grave', 3, 'staple'),
  presentedSpell('graveChill', 'Grave-Chill', 'grave', 3, 'staple'),
  presentedSpell('mournersVeil', "Mourner's Veil", 'grave', 4, 'staple', 'strongestAlly'),
  presentedSpell('dirge', 'Dirge', 'grave', 5, 'scaling'),
  presentedSpell('lastCandle', 'Last Candle', 'grave', 5, 'enchantment', 'enchantmentSlot', 'round1'),
  presentedSpell('sour', 'Sour', 'grave', 4, 'twister', 'counterPile', 'always', 'sour'),
  presentedSpell('remembrance', 'Remembrance', 'grave', 5, 'staple', 'weakestAlly'),
  presentedSpell('reckoning', 'Reckoning', 'grave', 'X', 'build-around', 'self', 'losing'),
  presentedSpell('quiet', 'Quiet', 'grave', 4, 'staple'),
  presentedSpell('pinchOfAsh', 'Pinch of Ash', 'grave', 2, 'staple'),
  presentedSpell('tithe', 'Tithe', 'grave', 2, 'staple', 'strongestAlly'),
  presentedSpell('grudge', 'Grudge', 'grave', 3, 'staple'),
  presentedSpell('yoke', 'Yoke', 'grave', 7, 'build-around'),
  presentedSpell('graveBargain', 'Grave Bargain', 'grave', 0, 'build-around', 'weakestAlly'),
  presentedSpell('puppetStrings', 'Puppet Strings', 'grave', 11, 'build-around'),
  presentedSpell('secondGrave', 'Second Grave', 'grave', 7, 'staple', 'weakestAlly', 'losing'),
  presentedSpell('ashenPall', 'Ashen Pall', 'grave', 10, 'staple', 'self'),
  presentedSpell('theLedgerBalanced', 'The Ledger Balanced', 'grave', 15, 'build-around'),
  presentedSpell('ossuary', 'Ossuary', 'grave', 14, 'enchantment', 'enchantmentSlot', 'round1'),
  presentedSpell('stealAway', 'Steal Away', 'grave', 13, 'adventure', 'self'),
  presentedSpell('theLongSilence', 'The Long Silence', 'grave', 22, 'enchantment', 'enchantmentSlot', 'round1'),
  presentedSpell('harvest', 'Harvest', 'grave', 25, 'staple', 'self', 'losing'),
  presentedSpell('theDebtCalled', 'The Debt Called', 'grave', 20, 'adventure', 'self'),
  presentedSpell('nettle', 'Nettle', 'wild', 2, 'staple'),
  presentedSpell('bramblelash', 'Bramblelash', 'wild', 4, 'staple'),
  presentedSpell('wildcall', 'Wildcall', 'wild', 8, 'staple', 'self'),
  presentedSpell('sapAndSinew', 'Sap and Sinew', 'wild', 6, 'staple', 'strongestAlly'),
  presentedSpell('verdantSurge', 'Verdant Surge', 'wild', 10, 'staple', 'self'),
  presentedSpell('theTurningYear', 'The Turning Year', 'wild', 15, 'build-around', 'counterPile'),
  presentedSpell('fly', 'Fly', 'wild', 18, 'adventure', 'self'),
  presentedSpell('beastSense', 'Beast Sense', 'wild', 3, 'adventure', 'self'),
  presentedSpell('illWind', 'Ill Wind', 'wild', 8, 'adventure', 'self'),
  presentedSpell('rootTheSky', 'Root the Sky', 'wild', 11, 'staple', 'self'),
  presentedSpell('beastSovereign', 'Beast Sovereign', 'wild', 14, 'enchantment', 'enchantmentSlot', 'round1'),
  presentedSpell('windShear', 'Wind Shear', 'wild', 13, 'staple', 'self'),
  presentedSpell('theLongGreen', 'The Long Green', 'wild', 23, 'staple', 'self', 'losing'),
  presentedSpell('theWeatherItself', 'The Weather Itself', 'wild', 21, 'enchantment', 'enchantmentSlot', 'round1'),
  ...EXPANSION_SPELLS,
].sort((a, b) => ['rite', 'craft', 'grave', 'wild'].indexOf(a.school)
  - ['rite', 'craft', 'grave', 'wild'].indexOf(b.school))
  .map((entry) => [entry.id, entry])) as Record<SpellId, SpellDefinition>;

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

/**
 * Docs 60–61 migration metadata for the shipped 68-spell catalog. The later spell batches append
 * the four cantrips and the rest of the 124-entry distribution; this table deliberately describes
 * resolver truth for the entries that exist today.
 */
const SPELL_TIER: Record<SpellId, SpellTier> = {
  rally: 1, blessing: 1, consecrate: 1, census: 1,
  sanctuary: 2, oathOfIron: 2, clarion: 2, standardOfDawn: 2, amplify: 2,
  waysideShrine: 2,
  hymnOfTheHost: 3, vigilOfTheHost: 3, trial: 3, feastDay: 3,
  oathbind: 4, beacon: 4, echo: 5,
  kindle: 1, sunlance: 1, steadyHands: 1, wellspring: 1, secondWind: 2,
  litanyOfDawn: 3, holdTheLine: 4, consecratedGround: 4, reprise: 4,
  scrying: 2, bellBookAndCandle: 3, processionOfLamps: 3,
  dayspring: 5, theLongOath: 5,

  forgeSpark: 1, ward: 1, falseColors: 1, saltTheVein: 1,
  quicksilver: 2, wallOfTheMaker: 2, reflect: 2, unmake: 2,
  clockworkEscort: 2, clockworkCourier: 2,
  forgefire: 3, ironclad: 3, brittle: 3, gate: 3,
  standingMirror: 4, summonSkiff: 4, hourglassCrack: 5,
  rivet: 1, whetstone: 1, shrapnel: 1, ammunitionCart: 2,
  detonate: 3, clockworkDouble: 3, blink: 3, overclock: 4, dimensionDoor: 4,
  prospect: 1, counterweight: 2, bulwark: 4,
  theUnmakingEngine: 5, mirrorHall: 5,

  wither: 1, graveChill: 1, mournersVeil: 1, borrowedTime: 1, graveSpeech: 1,
  quiet: 2, remembrance: 2, sour: 2, theToll: 2, coldRoad: 2, deathsLedger: 2,
  dirge: 3, lastCandle: 3, silenceThePassing: 3, paleProcession: 3,
  reckoning: 4, loyalUntoDeath: 4,
  pinchOfAsh: 1, tithe: 1, grudge: 1, yoke: 2, graveBargain: 3, puppetStrings: 3,
  secondGrave: 2, ashenPall: 3, theLedgerBalanced: 4, ossuary: 4,
  stealAway: 4, theLongSilence: 5, harvest: 5, theDebtCalled: 5,

  bloom: 1, gale: 1, rains: 1, thicket: 1, murmuration: 1,
  overgrow: 2, shedSkin: 2, hedgerowMarch: 2, greenTide: 2, wildGrowth: 2,
  storm: 3, stampedeCall: 3, greenway: 3, rootAndRuin: 3, beastTongue: 3,
  borrowShape: 4, fickleWeather: 4,
  nettle: 1, bramblelash: 1, wildcall: 2, sapAndSinew: 2,
  verdantSurge: 3, theTurningYear: 4, fly: 5,
  beastSense: 1, illWind: 2, rootTheSky: 3, beastSovereign: 4,
  windShear: 4, theLongGreen: 5, theWeatherItself: 5,
};

const SPELL_TARGETING: Record<SpellId, SpellTargetingMode> = {
  rally: 'single-ally', blessing: 'single-ally', consecrate: 'single-ally', census: 'self',
  sanctuary: 'single-ally', oathOfIron: 'single-ally', clarion: 'single-ally',
  standardOfDawn: 'enchantment', amplify: 'counter-pile', waysideShrine: 'position',
  hymnOfTheHost: 'mass-ally', vigilOfTheHost: 'enchantment', trial: 'single-enemy',
  feastDay: 'self', oathbind: 'single-enemy', beacon: 'self', echo: 'none',
  kindle: 'single-enemy', sunlance: 'single-enemy', steadyHands: 'single-ally',
  wellspring: 'owned-hero', secondWind: 'single-ally', litanyOfDawn: 'mass-ally',
  holdTheLine: 'enchantment', consecratedGround: 'mass-all', reprise: 'single-ally',
  scrying: 'position', bellBookAndCandle: 'enchantment', processionOfLamps: 'self',
  dayspring: 'mass-ally', theLongOath: 'enchantment',

  forgeSpark: 'single-enemy', ward: 'single-ally', falseColors: 'self',
  saltTheVein: 'enemy-mine', quicksilver: 'single-ally', wallOfTheMaker: 'positions',
  reflect: 'counter-pile', unmake: 'counter-pile', clockworkEscort: 'self',
  clockworkCourier: 'owned-hero', forgefire: 'enchantment', ironclad: 'enchantment',
  brittle: 'single-enemy', gate: 'positions', standingMirror: 'position',
  summonSkiff: 'position', hourglassCrack: 'single-any',
  rivet: 'single-ally', whetstone: 'single-ally', shrapnel: 'single-ally',
  ammunitionCart: 'mass-ally', detonate: 'single-enemy', clockworkDouble: 'single-ally',
  blink: 'single-any', overclock: 'single-ally', dimensionDoor: 'position',
  prospect: 'self', counterweight: 'single-ally', bulwark: 'positions',
  theUnmakingEngine: 'mass-enemy', mirrorHall: 'enchantment',

  wither: 'single-enemy', graveChill: 'single-enemy', mournersVeil: 'single-ally',
  borrowedTime: 'self', graveSpeech: 'self', quiet: 'single-enemy',
  remembrance: 'single-ally', sour: 'counter-pile', theToll: 'self',
  coldRoad: 'position', deathsLedger: 'self', dirge: 'single-enemy',
  lastCandle: 'enchantment', silenceThePassing: 'enchantment', paleProcession: 'self',
  reckoning: 'mass-all', loyalUntoDeath: 'single-ally',
  pinchOfAsh: 'single-enemy', tithe: 'single-ally', grudge: 'single-enemy',
  yoke: 'single-any', graveBargain: 'single-ally', puppetStrings: 'single-enemy',
  secondGrave: 'single-ally', ashenPall: 'mass-enemy',
  theLedgerBalanced: 'single-enemy', ossuary: 'enchantment', stealAway: 'enemy-mine',
  theLongSilence: 'enchantment', harvest: 'mass-all', theDebtCalled: 'enemy-hero',

  bloom: 'single-ally', gale: 'single-enemy', rains: 'mass-all', thicket: 'positions',
  murmuration: 'positions', overgrow: 'counter-pile', shedSkin: 'single-ally',
  hedgerowMarch: 'enchantment', greenTide: 'self', wildGrowth: 'owned-site',
  storm: 'mass-all', stampedeCall: 'mass-ally', greenway: 'position',
  rootAndRuin: 'positions', beastTongue: 'owned-site', borrowShape: 'single-ally',
  fickleWeather: 'self',
  nettle: 'single-enemy', bramblelash: 'single-enemy', wildcall: 'position',
  sapAndSinew: 'single-ally', verdantSurge: 'mass-all',
  theTurningYear: 'counter-pile', fly: 'self',
  beastSense: 'self', illWind: 'self', rootTheSky: 'mass-enemy',
  beastSovereign: 'enchantment', windShear: 'position',
  theLongGreen: 'mass-all', theWeatherItself: 'enchantment',
};

const CAPPED_SCALING = new Set<SpellId>([
  'forgeSpark', 'wither', 'sunlance', 'bramblelash',
]);
const OPEN_SCALING = new Set<SpellId>([
  'consecrate', 'sanctuary', 'oathOfIron', 'quicksilver', 'clockworkEscort',
  'graveChill', 'mournersVeil', 'bloom', 'rains', 'quiet', 'remembrance',
  'trial', 'brittle', 'dirge', 'silenceThePassing', 'oathbind', 'reckoning',
  'wellspring', 'secondWind', 'detonate', 'clockworkDouble', 'dimensionDoor',
  'tithe', 'grudge', 'yoke', 'puppetStrings', 'wildcall', 'sapAndSinew',
  'verdantSurge', 'theTurningYear',
  'dayspring', 'bellBookAndCandle', 'bulwark', 'theUnmakingEngine',
  'secondGrave', 'ashenPall', 'theLedgerBalanced', 'ossuary', 'harvest',
  'rootTheSky', 'beastSovereign', 'windShear', 'theLongGreen', 'theWeatherItself',
]);
const PROVENANCE = new Set<SpellId>([
  'hourglassCrack', 'borrowShape', 'echo', 'loyalUntoDeath',
]);

for (const id of Object.keys(SPELLS) as SpellId[]) {
  const definition = SPELLS[id];
  const tier = SPELL_TIER[id];
  if (definition.mana !== 'X' && id !== 'graveBargain') {
    const [minimum, maximum] = SPELL_MANA_BANDS[tier];
    definition.mana = Math.max(minimum, Math.min(maximum, definition.mana));
  }
  const scaling: SpellScalingShape = CAPPED_SCALING.has(id)
    ? 'capped' : OPEN_SCALING.has(id) ? 'open' : 'fixed';
  const provenance = PROVENANCE.has(id);
  const ordinaryScroll = tier <= 3 && !['adventure', 'topology'].includes(definition.kind);
  Object.assign(definition, {
    tier, scaling, targeting: SPELL_TARGETING[id],
    ...(id === 'kindle' || id === 'rivet' || id === 'pinchOfAsh' || id === 'nettle'
      ? { cantrip: true } : {}),
    primitives: id === 'deathsLedger' ? ['guardian-intel']
      : id === 'wellspring' ? ['remote-mana']
        : id === 'dimensionDoor' ? ['hero-teleport-radius']
          : id === 'fly' ? ['terrain-ignore-day']
            : id === 'kindle' || id === 'sunlance' || id === 'forgeSpark'
              || id === 'wither' || id === 'nettle' || id === 'bramblelash'
            ? ['impact-damage']
            : id === 'secondWind' ? ['resurrect']
              : id === 'detonate' ? ['counter-detonate']
                : id === 'clockworkDouble' ? ['clone']
                  : id === 'blink' ? ['teleport-stack']
                    : id === 'reprise' || id === 'overclock' ? ['grant-extra-action']
                      : id === 'consecratedGround' ? ['mid-battle-resonance']
                        : id === 'ammunitionCart' ? ['grant-shots']
                          : id === 'yoke' ? ['damage-link']
                            : id === 'graveBargain' ? ['sacrifice']
                              : id === 'puppetStrings' ? ['mind-control']
                                : id === 'theTurningYear' ? ['counter-convert']
                                  : id === 'scrying' || id === 'beastSense' ? ['guardian-intel']
                                    : id === 'dayspring' || id === 'secondGrave'
                                      || id === 'harvest' || id === 'theLongGreen' ? ['resurrect']
                                      : id === 'theUnmakingEngine' || id === 'rootTheSky'
                                        ? ['impact-damage']
                                        : id === 'theLongOath' || id === 'bellBookAndCandle'
                                          ? ['grant-extra-action']
                                          : id === 'bulwark' ? ['hazard-hex']
                                            : id === 'mirrorHall' || id === 'ossuary'
                                              ? ['clone']
                                              : id === 'theLedgerBalanced'
                                                || id === 'theWeatherItself' ? ['delayed-trigger']
                                                : id === 'windShear' || id === 'counterweight'
                                                  ? ['teleport-stack']
                                                  : id === 'ashenPall' || id === 'beastSovereign'
                                                    ? ['counter-convert']
                                                    : id === 'stealAway' ? ['production-steal']
                                                      : id === 'theDebtCalled'
                                                        ? ['enemy-movement-denial']
                                                        : id === 'illWind'
                                                          ? ['prebattle-condition'] : [],
    acquisition: {
      guild: !provenance && id !== 'summonSkiff',
      ordinaryScroll: ordinaryScroll && !provenance && id !== 'summonSkiff',
      provenance,
    },
    ...(id === 'beacon' || id === 'summonSkiff' || id === 'wellspring'
      || id === 'dimensionDoor' || id === 'fly'
      ? { timeGate: 'once-per-day' as const }
      : id === 'fickleWeather'
        ? { timeGate: 'once-per-week' as const, timeGateScope: 'player' as const } : {}),
  });
}

for (const id of ['processionOfLamps', 'stealAway', 'theDebtCalled'] as const) {
  SPELLS[id].timeGate = 'once-per-week';
}

SPELLS.reckoning.aiHints.manaAbove = 12;

export const SPELL_IDS = Object.keys(SPELLS) as SpellId[];
export const SCHOOL_SPELLS = (school: SpellSchool) =>
  SPELL_IDS.filter((id) => SPELLS[id].school === school);
export const ACQUIRABLE_SCHOOL_SPELLS = (school: SpellSchool) =>
  SCHOOL_SPELLS(school).filter((id) => SPELLS[id].acquisition?.guild);

export const SCROLL_SPELL_IDS = SPELL_IDS.filter((id) =>
  SPELLS[id].acquisition?.ordinaryScroll);

export function validateSpells(): void {
  for (const definition of Object.values(SPELLS)) {
    if (!definition.name || !definition.flavor.trim() || !definition.base || !definition.plus) {
      throw new Error(`Invalid spell definition: ${definition.id}`);
    }
    if (['adventure', 'topology'].includes(definition.kind)
        && (definition.tier ?? 1) >= 4 && !definition.timeGate) {
      throw new Error(`Tier-${definition.tier} adventure spell lacks a time gate: ${definition.id}`);
    }
  }
  validateSpellV2Schemas(Object.values(SPELLS), 'final');
  const assetRequirements = [
    ...P1_RITE_CRAFT_SPELL_ASSET_REQUIREMENTS,
    ...P1_GRAVE_WILD_SPELL_ASSET_REQUIREMENTS,
    ...P2_SPELL_ASSET_REQUIREMENTS,
    ...DOCS_60_67_SPELL_LEXICON_ASSET_REQUIREMENTS,
  ];
  validateContentAssets(assetRequirements,
    new Set(assetRequirements.map((row) => row.nativeAssetId)), 'release');
}
