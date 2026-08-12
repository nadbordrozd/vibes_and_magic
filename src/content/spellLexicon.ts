import type { SpellId } from '../core/types';

/** Stable semantic IDs used by spell rules, help, inspection, and later icon work. */
export type SpellLexiconId =
  | 'ability' | 'active-effect' | 'barrowfield' | 'battle-enchantment'
  | 'beast' | 'beneficial-effect' | 'bloom' | 'burn' | 'chill' | 'cleanse' | 'counter'
  | 'death-trigger' | 'deepwood' | 'extra-action' | 'forced-movement' | 'company-status'
  | 'growth' | 'guardian' | 'harmful-effect' | 'hex' | 'morale' | 'omen' | 'phase'
  | 'resonance' | 'spell-power' | 'summon' | 'timed-effect' | 'twister'
  | 'undergrowth' | 'wall-hex';

export interface SpellLexiconEntry {
  id: SpellLexiconId;
  name: string;
  /** Player-safe definition. This is rules copy, never an engine diagnostic. */
  rule: string;
  /** Literal subject only; style is supplied by a later image work order. */
  visualSubject: string;
  /** Lower-case phrases recognized in authored player-facing rules. */
  aliases: readonly string[];
  /** Individual search/index tokens, including useful inflections. */
  tokens: readonly string[];
}

const entry = (
  id: SpellLexiconId, name: string, rule: string, visualSubject: string,
  aliases: readonly string[], tokens: readonly string[],
): SpellLexiconEntry => ({ id, name, rule, visualSubject, aliases, tokens });

export const SPELL_LEXICON: Record<SpellLexiconId, SpellLexiconEntry> = {
  ability: entry('ability', 'Ability',
    'A special rule printed on a company. A disabled ability has no effect while the disabling rule lasts.',
    'a small open field manual beside a plain heraldic badge',
    ['ability', 'abilities'], ['ability', 'abilities', 'disable', 'disabled']),
  'active-effect': entry('active-effect', 'Active effect',
    'A counter, timed effect, or battle enchantment that is currently in play and can be chosen by an effect-changing spell.',
    'three labeled tokens—a pip, a small hourglass, and a hanging banner—joined by one selection ring',
    ['active effect', 'active effects'], ['active', 'effect', 'effects']),
  barrowfield: entry('barrowfield', 'Barrowfield',
    'A Grave-resonant terrain of old burial mounds. Cold Road can travel between explored Barrowfield tiles.',
    'a low grass burial mound with a small stone door and a bare thorn',
    ['barrowfield', 'barrowfields', 'barrow', 'barrows'], ['barrowfield', 'barrowfields', 'barrow', 'barrows']),
  'battle-enchantment': entry('battle-enchantment', 'Battle enchantment',
    'A lasting spell attached to one side for the battle. Each side has two slots; a third enchantment must replace one already there.',
    'two hanging cloth charms on a short wooden rail, with one empty hook emphasized',
    ['battle enchantment', 'battle enchantments', 'enchantment', 'enchantments', 'enchantment slot', 'enchantment slots'],
    ['battle', 'enchantment', 'enchantments', 'slot', 'slots']),
  beast: entry('beast', 'Beast',
    'A company whose printed abilities include Beast. Beast-specific rules affect only those companies.',
    'a plain horn-and-paw field sign tied to a short stake',
    ['beast', 'beasts', 'beast guardian', 'beast guardians'], ['beast', 'beasts', 'guardian', 'guardians']),
  'beneficial-effect': entry('beneficial-effect', 'Beneficial effect',
    'An active effect marked as helpful to its company or side. Some spells call this a buff; Sour can remove a beneficial timed effect.',
    'a company marker beneath a small upward-pointing green ribbon and a plain hourglass',
    ['beneficial effect', 'beneficial effects', 'buff', 'buffs'], ['beneficial', 'effect', 'effects', 'buff', 'buffs']),
  bloom: entry('bloom', 'Bloom',
    'At turn start, Bloom N heals N% of the company’s maximum HP, but never restores a dead unit. Like every counter, it is capped at 9 and normally falls by 1 at turn end.',
    'a green sprout curling around nine small wooden counting pips',
    ['bloom', 'blooms', 'bloom counter', 'bloom counters'], ['bloom', 'blooms', 'heal', 'heals', 'healing']),
  burn: entry('burn', 'Burn',
    'At turn start, Burn N deals N% of current total HP, with a minimum of N damage. Like every counter, it is capped at 9 and normally falls by 1 at turn end.',
    'a singed wooden company marker beside nine ember-red counting pips',
    ['burn', 'burns', 'burn counter', 'burn counters', 'burn damage'], ['burn', 'burns', 'burning', 'damage']),
  chill: entry('chill', 'Chill',
    'Chill N lowers speed by N while present, but cannot lower speed below 1. Like every counter, it is capped at 9 and normally falls by 1 at turn end.',
    'a frosted boot beside nine pale-blue counting pips',
    ['chill', 'chills', 'chill counter', 'chill counters'], ['chill', 'chills', 'speed', 'slow']),
  cleanse: entry('cleanse', 'Cleanse',
    'Remove every counter from the chosen company. Timed effects and battle enchantments remain unless the rule says otherwise.',
    'a clean linen cloth sweeping four colored counting pips from a wooden company marker',
    ['cleanse', 'cleansed', 'cleansing'], ['cleanse', 'cleansed', 'cleansing', 'remove', 'removed']),
  'company-status': entry('company-status', 'Company status',
    'A counter or timed effect currently attached to a company. A status may be beneficial or harmful and follows its own removal or duration rule.',
    'a wooden company marker carrying one colored pip and one small hourglass tag',
    ['company status', 'company statuses', 'status effect', 'status effects', 'status', 'statuses'],
    ['company', 'status', 'statuses', 'effect', 'effects']),
  counter: entry('counter', 'Counter',
    'A visible stack of pips on a company. Burn, Chill, Hex, and Bloom are the only four counters; each is capped at 9 and normally falls by 1 at that company’s turn end.',
    'four neat rows of colored wooden pips, each row ending at the ninth pip',
    ['counter', 'counters', 'counter pile', 'counter piles'], ['counter', 'counters', 'pile', 'piles', 'pip', 'pips']),
  'death-trigger': entry('death-trigger', 'Death trigger',
    'A rule that fires when a company is destroyed. A rule that suppresses death triggers prevents the stated side’s triggers from firing.',
    'a fallen wooden company marker ringing a small handbell',
    ['death trigger', 'death triggers', 'death-trigger', 'death-triggers'], ['death', 'destroyed', 'trigger', 'triggers']),
  deepwood: entry('deepwood', 'Deepwood',
    'A Wild-resonant forest terrain. Greenway and Green Tide use connected Deepwood tiles.',
    'three close old trees whose roots form a clear path opening',
    ['deepwood', 'deepwoods', 'connected forest', 'forest'], ['deepwood', 'deepwoods', 'forest', 'forests']),
  'extra-action': entry('extra-action', 'Extra action',
    'An additional company action earned after its morale meter reaches the threshold. It does not give the hero another spell cast unless another rule says so.',
    'one wooden company marker followed by a second matching action arrow',
    ['extra action', 'extra actions', 'bonus action', 'bonus actions'], ['extra', 'bonus', 'action', 'actions']),
  'forced-movement': entry('forced-movement', 'Forced movement',
    'Movement caused by a push or another rule rather than by the company’s normal move action.',
    'a wooden company marker sliding along a bold arrow after a gust',
    ['forced movement', 'push', 'pushed', 'pushes'], ['forced', 'movement', 'push', 'pushed', 'pushes']),
  growth: entry('growth', 'Growth',
    'The number of recruits a city or dwelling adds to its available pool at the weekly boundary. Growth bonuses modify that addition, not existing recruits.',
    'a small dwelling tally board with one row of newly added wooden figures',
    ['growth', 'growth bonus', 'growth bonuses', 'growth effect', 'growth effects'], ['growth', 'recruit', 'recruits', 'dwelling', 'dwellings']),
  guardian: entry('guardian', 'Guardian',
    'A neutral army protecting a map object. The protected object remains unavailable until its guardian is defeated or an explicit rule disperses it.',
    'a neutral shield-bearing company marker standing before a closed treasure chest',
    ['guardian', 'guardians', 'guardian band', 'guardian bands'], ['guardian', 'guardians', 'guarded', 'band', 'bands']),
  'harmful-effect': entry('harmful-effect', 'Harmful effect',
    'An active effect marked as harmful to its company or side. Some rules call this a debuff; it remains until its own removal or duration rule applies.',
    'a company marker beneath a small downward-pointing violet ribbon and a plain hourglass',
    ['harmful effect', 'harmful effects', 'debuff', 'debuffs'],
    ['harmful', 'effect', 'effects', 'debuff', 'debuffs']),
  hex: entry('hex', 'Hex',
    'Hex N makes the company take 5% more damage per point. Like every counter, it is capped at 9 and normally falls by 1 at turn end.',
    'a cracked violet wax charm beside nine purple counting pips',
    ['hex', 'hexes', 'hex counter', 'hex counters'], ['hex', 'hexes', 'damage']),
  morale: entry('morale', 'Morale',
    'A company meter. Reaching its threshold spends that meter and grants one extra action; excess morale carries toward another extra action.',
    'a company pennant rising beside a filled segmented meter and a second action arrow',
    ['morale', 'morale meter'], ['morale', 'meter', 'threshold']),
  omen: entry('omen', 'Omen',
    'The visible rule affecting the current week. Replacing the omen chooses a new weekly rule from the offered omens.',
    'a small weather vane above an open weekly almanac',
    ['omen', 'omens', 'weekly omen'], ['omen', 'omens', 'week', 'weekly']),
  phase: entry('phase', 'Phase',
    'A phased company can move through blocking companies and obstacles, but must finish on a legal open hex.',
    'a translucent company marker passing through a wooden barricade toward an empty hex',
    ['phase', 'phased', 'phasing'], ['phase', 'phased', 'phasing']),
  resonance: entry('resonance', 'Resonance',
    'A resonant school uses its Upgraded spell rules for both sides in that battle unless another explicit rule changes ownership or suppresses it.',
    'four school-colored tuning forks around one battlefield tile',
    ['resonance', 'resonant', 'rite resonance', 'craft resonance', 'grave resonance', 'wild resonance'],
    ['resonance', 'resonant', 'school', 'rite', 'craft', 'grave', 'wild']),
  'spell-power': entry('spell-power', 'Spell Power',
    'The hero statistic used by spell scaling. Unless a spell says otherwise, duration gains 1 per 6 Spell Power, counter magnitude gains 1 per 5, and percentage effects gain 1 point per 2.',
    'a stitched spellbook beside a measuring rod marked at two, five, and six',
    ['spell power', 'spell-power', 'sp'], ['spell', 'power', 'scaling', 'duration', 'magnitude', 'percentage']),
  summon: entry('summon', 'Summon',
    'Create a temporary company or object. A summoned battle company does not join the hero’s permanent army after battle.',
    'a newly arrived wooden soldier stepping from an open chalk circle',
    ['summon', 'summoned', 'summons', 'summoning'], ['summon', 'summoned', 'summons', 'summoning', 'temporary']),
  'timed-effect': entry('timed-effect', 'Timed effect',
    'A beneficial or harmful rule attached to a company for a stated number of rounds. Its duration falls at that company’s turn end.',
    'a company marker beside a small sandglass and two removable round beads',
    ['timed effect', 'timed effects'],
    ['timed', 'effect', 'effects', 'beneficial', 'harmful', 'duration', 'rounds']),
  twister: entry('twister', 'Twister',
    'A spell that changes an active effect instead of creating an ordinary new one: Amplify, Reflect, Sour, Unmake, or Overgrow.',
    'a curled ribbon connecting a counter pip, hourglass charm, and hanging banner',
    ['twister', 'twisters', 'twister spell', 'twister spells'], ['twister', 'twisters', 'amplify', 'reflect', 'sour', 'unmake', 'overgrow']),
  undergrowth: entry('undergrowth', 'Undergrowth',
    'A battlefield tile that slows movement through its hex. An Upgraded magical thicket also gives Chill to enemies that end there.',
    'a dense low thorn-and-fern patch contained within one empty battlefield hex',
    ['undergrowth', 'undergrowth hex', 'undergrowth hexes', 'thicket hex', 'thicket hexes'],
    ['undergrowth', 'thicket', 'thickets', 'hex', 'hexes', 'slow', 'slowing']),
  'wall-hex': entry('wall-hex', 'Wall hex',
    'A created battlefield hex that blocks movement until the wall is removed or destroyed.',
    'one short timber-and-stone barricade fitted entirely inside a battlefield hex',
    ['wall hex', 'wall hexes', 'wall tile', 'wall tiles'], ['wall', 'walls', 'hex', 'hexes', 'tile', 'tiles']),
};

export type SpellRuleToken =
  | { kind: 'text'; text: string }
  | { kind: 'term'; termId: SpellLexiconId; label?: string };

export type SpellRulePresentation = readonly SpellRuleToken[];

export interface SpellRuleVersions {
  standard: SpellRulePresentation;
  upgraded: SpellRulePresentation;
}

export const spellRuleText = (text: string): SpellRuleToken => ({ kind: 'text', text });
export const spellRuleTerm = (termId: SpellLexiconId, label?: string): SpellRuleToken => ({
  kind: 'term', termId, ...(label ? { label } : {}),
});

/** Resolve tokens for plain-text surfaces while retaining term IDs for interactive surfaces. */
export function spellRulePlainText(tokens: SpellRulePresentation): string {
  return tokens.map((token) => token.kind === 'text' ? token.text
    : token.label ?? SPELL_LEXICON[token.termId].name).join('');
}

/** Recognize authored mentions without coupling callers to capitalization or punctuation. */
export function spellLexiconTermIdsForText(text: string): SpellLexiconId[] {
  const normalized = ` ${text.toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;
  return Object.values(SPELL_LEXICON).filter((definition) => definition.aliases.some((alias) => {
    const phrase = alias.replace(/[^a-z0-9]+/g, ' ').trim();
    return phrase.length > 0 && normalized.includes(` ${phrase} `);
  })).map((definition) => definition.id);
}

type LexiconAlias = { termId: SpellLexiconId; alias: string; order: number };

const LEXICON_ALIASES: readonly LexiconAlias[] = Object.values(SPELL_LEXICON)
  .flatMap((definition, order) => definition.aliases.map((alias) => ({
    termId: definition.id, alias, order,
  })))
  .sort((left, right) => right.alias.length - left.alias.length
    || left.order - right.order || left.alias.localeCompare(right.alias));

const escapePattern = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const LEXICON_ALIAS_PATTERN = new RegExp(
  `(?<![A-Za-z0-9])(${LEXICON_ALIASES.map(({ alias }) => escapePattern(alias)
    .replace(/[\\ -]+/g, '[\\s-]+')).join('|')})(?![A-Za-z0-9])`,
  'gi',
);

const NORMALIZED_ALIAS_TO_TERM = new Map(LEXICON_ALIASES.map(({ termId, alias }) => [
  alias.toLocaleLowerCase().replace(/[\s-]+/g, ' '), termId,
] as const));

/**
 * Convert catalog prose to semantic tokens without rewriting it. Matching is left-to-right and
 * longest-first, so `battle enchantment` wins over `enchantment` and authored punctuation/case is
 * retained as the visible label.
 */
export function tokenizeSpellLexiconText(text: string): SpellRulePresentation {
  const tokens: SpellRuleToken[] = [];
  let cursor = 0;
  for (const match of text.matchAll(LEXICON_ALIAS_PATTERN)) {
    const index = match.index ?? 0;
    if (index > cursor) tokens.push(spellRuleText(text.slice(cursor, index)));
    const label = match[0];
    const termId = NORMALIZED_ALIAS_TO_TERM.get(label.toLocaleLowerCase()
      .replace(/[\s-]+/g, ' '));
    if (termId) tokens.push(spellRuleTerm(termId, label));
    else tokens.push(spellRuleText(label));
    cursor = index + label.length;
  }
  if (cursor < text.length) tokens.push(spellRuleText(text.slice(cursor)));
  return tokens.length > 0 ? tokens : [spellRuleText(text)];
}

export type OrdinarySpellTermId =
  | 'actors' | 'adjacency' | 'amounts' | 'army-transfer' | 'battle-time'
  | 'casting-resources' | 'cities-and-sites' | 'combat-stats' | 'damage-and-hp'
  | 'destinations' | 'equipment' | 'exploration' | 'learning' | 'map-time'
  | 'movement' | 'ownership' | 'replacement' | 'targets' | 'travel';

export interface OrdinarySpellTermDisposition {
  id: OrdinarySpellTermId;
  examples: readonly string[];
  reason: string;
}

/**
 * Exhaustive ordinary-language buckets used by the 68-spell coverage table below.
 * These remain prose because their rules are either literal in context or already quantified by
 * the spell. Promoting one later requires replacing its disposition with a lexicon term ID.
 */
export const ORDINARY_SPELL_TERM_DISPOSITIONS: Record<
  OrdinarySpellTermId, OrdinarySpellTermDisposition
> = {
  actors: { id: 'actors', examples: ['ally', 'enemy', 'company', 'hero', 'side'], reason: 'The affected actor is explicit in each spell target.' },
  adjacency: { id: 'adjacency', examples: ['adjacent', 'nearby'], reason: 'Ordinary spatial relationship on the battle grid.' },
  amounts: { id: 'amounts', examples: ['all', 'one', 'two', 'three', 'larger', 'lowest'], reason: 'The spell supplies the complete quantity or comparison.' },
  'army-transfer': { id: 'army-transfer', examples: ['items', 'company', 'garrison'], reason: 'Literal objects moved between named holders.' },
  'battle-time': { id: 'battle-time', examples: ['round', 'whole battle', 'next attack', 'turn start'], reason: 'The spell states the exact combat interval or trigger.' },
  'casting-resources': { id: 'casting-resources', examples: ['mana', 'mana spent'], reason: 'Visible numeric casting resources with established UI totals.' },
  'cities-and-sites': { id: 'cities-and-sites', examples: ['city', 'mine', 'dwelling', 'shore', 'boat'], reason: 'Inspectable adventure-map objects with literal names.' },
  'combat-stats': { id: 'combat-stats', examples: ['Attack', 'Defense', 'speed', 'damage'], reason: 'Visible company statistics whose numeric change is explicit.' },
  'damage-and-hp': { id: 'damage-and-hp', examples: ['current HP', 'maximum HP', 'heal', 'revive', 'losses'], reason: 'Ordinary health language; the spell supplies the exact percentage and restrictions.' },
  destinations: { id: 'destinations', examples: ['point', 'tile', 'hex', 'route'], reason: 'A target selection surface supplies the legal positions.' },
  equipment: { id: 'equipment', examples: ['items'], reason: 'Inspectable inventory objects, not a spell-only mechanic.' },
  exploration: { id: 'exploration', examples: ['visible', 'reveal', 'inspect', 'explored'], reason: 'Ordinary fog-of-war verbs with explicit duration or target.' },
  learning: { id: 'learning', examples: ['learn', 'known spell', 'recorded version'], reason: 'Spellbook state already presented directly to the player.' },
  'map-time': { id: 'map-time', examples: ['day', 'week', 'tomorrow'], reason: 'The adventure clock is visible and the spell supplies the exact interval.' },
  movement: { id: 'movement', examples: ['movement', 'move', 'travel range'], reason: 'Visible numeric movement or an explicit distance.' },
  ownership: { id: 'ownership', examples: ['friendly', 'enemy', 'owned', 'neutral'], reason: 'Ordinary map ownership shown by flags and target labels.' },
  replacement: { id: 'replacement', examples: ['replace', 'remove', 'destroy'], reason: 'Ordinary verbs whose exact object is stated by the spell.' },
  targets: { id: 'targets', examples: ['target', 'legal target', 'chosen'], reason: 'The spell and targeting surface explicitly identify the subject.' },
  travel: { id: 'travel', examples: ['travel', 'passage', 'path'], reason: 'The spell states its endpoints and the map shows the resulting route.' },
};

export type SpellRuntimeDomain = 'combat' | 'adventure';

export interface SpellMechanicsCoverage {
  /** Exact resolver branch, intended for audit/tests rather than player copy. */
  resolver: `${SpellRuntimeDomain}:${string}`;
  lexicon: readonly SpellLexiconId[];
  ordinary: readonly OrdinarySpellTermId[];
}

const coverage = (
  resolver: SpellMechanicsCoverage['resolver'],
  lexicon: readonly SpellLexiconId[],
  ordinary: readonly OrdinarySpellTermId[],
): SpellMechanicsCoverage => ({ resolver, lexicon, ordinary });

/** All catalog entries mapped to the runtime branch and their reusable/excluded terms. */
export const SPELL_MECHANICS_COVERAGE: Record<SpellId, SpellMechanicsCoverage> = {
  rally: coverage('combat:castRite.rally', ['morale'], ['actors', 'amounts']),
  blessing: coverage('combat:castRite.blessing', ['timed-effect', 'morale'], ['actors', 'battle-time', 'combat-stats']),
  standardOfDawn: coverage('combat:castRite.standardOfDawn', ['battle-enchantment', 'death-trigger', 'morale'], ['actors', 'battle-time']),
  amplify: coverage('combat:twister.amplify', ['twister', 'active-effect', 'counter', 'timed-effect', 'battle-enchantment'], ['amounts', 'battle-time', 'targets']),
  sanctuary: coverage('combat:castRite.sanctuary', ['company-status', 'timed-effect', 'cleanse', 'counter'], ['actors', 'battle-time', 'targets']),
  oathOfIron: coverage('combat:castRite.oathOfIron', ['timed-effect'], ['actors', 'battle-time', 'combat-stats']),
  consecrate: coverage('combat:castRite.consecrate', ['cleanse', 'counter', 'morale'], ['actors', 'damage-and-hp']),
  hymnOfTheHost: coverage('combat:castRite.hymnOfTheHost', ['extra-action', 'morale'], ['actors', 'amounts']),
  trial: coverage('combat:castRite.trial', [], ['actors', 'amounts', 'damage-and-hp', 'targets']),
  forgeSpark: coverage('combat:castCraft.forgeSpark', ['burn', 'counter'], ['actors', 'adjacency', 'amounts']),
  ward: coverage('combat:castCraft.ward', ['timed-effect', 'burn'], ['actors', 'battle-time', 'combat-stats']),
  reflect: coverage('combat:twister.reflect', ['twister', 'active-effect', 'counter', 'timed-effect'], ['amounts', 'targets']),
  forgefire: coverage('combat:castCraft.forgefire', ['battle-enchantment', 'burn', 'counter'], ['actors', 'battle-time']),
  clockworkEscort: coverage('combat:castCraft.clockworkEscort', ['summon'], ['actors', 'amounts']),
  wallOfTheMaker: coverage('combat:castCraft.wallOfTheMaker', ['wall-hex', 'burn'], ['amounts', 'destinations']),
  quicksilver: coverage('combat:castCraft.quicksilver', ['phase', 'timed-effect'], ['actors', 'battle-time', 'combat-stats']),
  unmake: coverage('combat:twister.unmake', ['twister', 'active-effect', 'counter', 'battle-enchantment'], ['replacement', 'targets']),
  ironclad: coverage('combat:castCraft.ironclad', ['battle-enchantment'], ['actors', 'combat-stats']),
  wither: coverage('combat:castGrave.wither', ['hex', 'chill', 'counter'], ['actors', 'amounts']),
  graveChill: coverage('combat:castGrave.graveChill', ['chill', 'counter', 'morale'], ['actors', 'amounts']),
  mournersVeil: coverage('combat:castGrave.mournersVeil', ['timed-effect', 'hex'], ['actors', 'battle-time', 'combat-stats']),
  dirge: coverage('combat:castGrave.dirge', [], ['actors', 'damage-and-hp', 'amounts']),
  lastCandle: coverage('combat:castGrave.lastCandle', ['battle-enchantment', 'death-trigger', 'hex', 'morale'], ['actors', 'casting-resources']),
  sour: coverage('combat:twister.sour', ['twister', 'active-effect', 'beneficial-effect', 'bloom', 'hex', 'timed-effect', 'battle-enchantment'], ['replacement', 'targets']),
  remembrance: coverage('combat:castGrave.remembrance', [], ['actors', 'damage-and-hp', 'amounts']),
  reckoning: coverage('combat:castGrave.reckoning', [], ['actors', 'casting-resources', 'damage-and-hp', 'amounts']),
  quiet: coverage('combat:castGrave.quiet', ['timed-effect', 'chill'], ['actors', 'battle-time']),
  beacon: coverage('adventure:castTopology.beacon', [], ['cities-and-sites', 'ownership', 'travel', 'destinations']),
  census: coverage('adventure:resolveRite.census', [], ['actors', 'exploration', 'map-time', 'movement']),
  feastDay: coverage('adventure:resolveRite.feastDay', ['growth'], ['cities-and-sites', 'ownership', 'map-time', 'casting-resources']),
  clarion: coverage('combat:expansion.clarion', ['morale', 'extra-action'], ['actors', 'amounts']),
  vigilOfTheHost: coverage('combat:expansion.vigilOfTheHost', ['battle-enchantment', 'morale'], ['actors', 'amounts', 'battle-time']),
  oathbind: coverage('combat:expansion.oathbind', ['timed-effect', 'harmful-effect', 'active-effect', 'ability'], ['actors', 'battle-time', 'targets']),
  waysideShrine: coverage('adventure:resolveRite.waysideShrine', ['resonance'], ['destinations', 'battle-time', 'ownership']),
  gate: coverage('adventure:castTopology.gate', [], ['exploration', 'travel', 'destinations', 'map-time']),
  saltTheVein: coverage('adventure:resolveCraft.saltTheVein', [], ['cities-and-sites', 'ownership', 'exploration', 'map-time']),
  falseColors: coverage('adventure:resolveCraft.falseColors', ['guardian'], ['ownership', 'actors']),
  clockworkCourier: coverage('adventure:resolveCraft.clockworkCourier', [], ['army-transfer', 'equipment', 'actors', 'cities-and-sites', 'ownership']),
  brittle: coverage('combat:expansion.brittle', ['timed-effect', 'harmful-effect', 'ability', 'burn'], ['actors', 'battle-time']),
  standingMirror: coverage('combat:expansion.standingMirror', ['summon', 'spell-power'], ['actors', 'targets', 'learning']),
  summonSkiff: coverage('adventure:castTopology.summonSkiff', ['summon'], ['cities-and-sites', 'ownership', 'travel']),
  coldRoad: coverage('adventure:castTopology.coldRoad', ['barrowfield'], ['actors', 'adjacency', 'exploration', 'travel']),
  borrowedTime: coverage('adventure:resolveGrave.borrowedTime', [], ['movement', 'map-time', 'amounts']),
  paleProcession: coverage('adventure:resolveGrave.paleProcession', ['summon'], ['actors', 'damage-and-hp', 'destinations', 'map-time']),
  silenceThePassing: coverage('combat:expansion.silenceThePassing', ['battle-enchantment', 'death-trigger'], ['actors', 'battle-time', 'amounts']),
  theToll: coverage('combat:expansion.theToll', [], ['casting-resources', 'amounts']),
  deathsLedger: coverage('adventure:resolveGrave.deathsLedger', ['barrowfield', 'guardian'], ['exploration', 'map-time']),
  graveSpeech: coverage('adventure:resolveGrave.graveSpeech', [], ['destinations', 'learning', 'battle-time']),
  gale: coverage('combat:expansion.gale', ['forced-movement', 'chill'], ['actors', 'amounts', 'damage-and-hp', 'destinations']),
  bloom: coverage('combat:expansion.bloom', ['bloom', 'counter'], ['actors', 'adjacency', 'amounts']),
  overgrow: coverage('combat:twister.overgrow', ['twister', 'active-effect', 'counter', 'timed-effect'], ['actors', 'adjacency', 'targets']),
  thicket: coverage('combat:expansion.thicket', ['undergrowth', 'chill'], ['amounts', 'destinations', 'actors']),
  rains: coverage('combat:expansion.rains', ['burn', 'bloom', 'chill', 'counter'], ['actors', 'replacement']),
  beastTongue: coverage('adventure:resolveWild.beastTongue', ['beast', 'guardian'], ['actors', 'ownership', 'casting-resources']),
  stampedeCall: coverage('combat:expansion.stampedeCall', ['beast', 'forced-movement'], ['actors', 'combat-stats', 'battle-time']),
  storm: coverage('combat:expansion.storm', [], ['actors', 'damage-and-hp', 'amounts']),
  greenway: coverage('adventure:castTopology.greenway', ['deepwood'], ['exploration', 'travel', 'destinations', 'movement']),
  wildGrowth: coverage('adventure:resolveWild.wildGrowth', ['growth'], ['cities-and-sites', 'ownership', 'map-time']),
  murmuration: coverage('adventure:resolveWild.murmuration', [], ['exploration', 'destinations', 'travel']),
  greenTide: coverage('adventure:resolveWild.greenTide', ['deepwood'], ['movement', 'map-time', 'exploration']),
  rootAndRuin: coverage('adventure:resolveWild.rootAndRuin', ['undergrowth'], ['amounts', 'destinations', 'map-time']),
  fickleWeather: coverage('adventure:resolveWild.fickleWeather', ['omen'], ['amounts', 'replacement', 'map-time']),
  shedSkin: coverage('combat:expansion.shedSkin', ['counter', 'timed-effect', 'bloom'], ['actors', 'replacement']),
  hedgerowMarch: coverage('combat:expansion.hedgerowMarch', ['battle-enchantment'], []),
  hourglassCrack: coverage('combat:expansion.hourglassCrack', ['extra-action'], ['actors', 'battle-time', 'amounts']),
  borrowShape: coverage('combat:expansion.borrowShape', ['ability'], ['actors', 'adjacency', 'exploration', 'battle-time']),
  echo: coverage('combat:resolveSpellFace.echo', ['spell-power'], ['learning', 'targets', 'casting-resources']),
  loyalUntoDeath: coverage('combat:expansion.loyalUntoDeath', ['morale'], ['actors', 'battle-time', 'casting-resources']),
};

export function validateSpellLexicon(): void {
  for (const [id, definition] of Object.entries(SPELL_LEXICON)) {
    if (definition.id !== id || !definition.name.trim() || !definition.rule.trim()
        || !definition.visualSubject.trim() || !definition.aliases.length
        || !definition.tokens.length) {
      throw new Error(`Invalid spell lexicon entry: ${id}`);
    }
  }
}
