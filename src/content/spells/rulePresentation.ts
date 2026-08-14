import type { SpellId } from '../../core/types';
import {
  spellRuleTerm as term,
  spellRuleText as text,
  type SpellRulePresentation,
  type SpellRuleToken,
  type SpellRuleVersions,
} from '../spellLexicon';
import { P2_NEW_SPELL_RULES } from './p2Rules';

const rule = (...tokens: SpellRuleToken[]): SpellRulePresentation => tokens;

export const RITE_CRAFT_SPELL_IDS = [
  'rally', 'blessing', 'standardOfDawn', 'amplify', 'sanctuary', 'oathOfIron',
  'consecrate', 'hymnOfTheHost', 'trial',
  'kindle', 'sunlance', 'steadyHands', 'wellspring', 'secondWind', 'litanyOfDawn',
  'holdTheLine', 'consecratedGround', 'reprise',
  'scrying', 'bellBookAndCandle', 'processionOfLamps', 'dayspring', 'theLongOath',
  'beacon', 'census', 'feastDay', 'clarion', 'vigilOfTheHost', 'oathbind',
  'waysideShrine', 'echo',
  'forgeSpark', 'ward', 'reflect', 'forgefire', 'clockworkEscort', 'wallOfTheMaker',
  'quicksilver', 'unmake', 'ironclad',
  'rivet', 'whetstone', 'shrapnel',
  'ammunitionCart', 'detonate', 'clockworkDouble', 'blink', 'overclock', 'dimensionDoor',
  'prospect', 'counterweight', 'bulwark', 'theUnmakingEngine', 'mirrorHall',
  'gate', 'saltTheVein', 'falseColors', 'clockworkCourier', 'brittle', 'standingMirror',
  'summonSkiff', 'hourglassCrack',
] as const satisfies readonly SpellId[];

export type RiteCraftSpellId = typeof RITE_CRAFT_SPELL_IDS[number];

/**
 * Canonical structured rules for the first two schools. Grave and Wild can add parallel records
 * and join SPELL_RULE_PRESENTATIONS without changing the catalog or token contract.
 */
export const RITE_CRAFT_SPELL_RULES = {
  ...Object.fromEntries([
    'scrying', 'bellBookAndCandle', 'processionOfLamps', 'dayspring', 'theLongOath',
    'prospect', 'counterweight', 'bulwark', 'theUnmakingEngine', 'mirrorHall',
  ].map((id) => [id, P2_NEW_SPELL_RULES[id as keyof typeof P2_NEW_SPELL_RULES]])),
  rally: {
    standard: rule(text('One allied company gains 50 '), term('morale'), text('.')),
    upgraded: rule(text('Two different allied companies each gain 50 '), term('morale'), text('.')),
  },
  blessing: {
    standard: rule(text('One allied company’s next attack rolls maximum damage.')),
    upgraded: rule(text('Every allied company’s next attack rolls maximum damage.')),
  },
  standardOfDawn: {
    standard: rule(text('Create a '), term('battle-enchantment'),
      text('. When an allied attack destroys an enemy company, every surviving allied company gains 10 '),
      term('morale'), text('. The gain is reduced proportionally if the destroyed company began with less than 10% of its side’s starting army HP.')),
    upgraded: rule(text('Create a '), term('battle-enchantment'),
      text('. When an allied attack destroys an enemy company, every surviving allied company gains 10 '),
      term('morale'), text('. On the first such kill each round, the killer also gains +2 speed and one '),
      term('extra-action'), text('.')),
  },
  amplify: {
    standard: rule(text('Choose one '), term('active-effect'), text('—a '), term('counter'),
      text(', '), term('timed-effect'), text(', or '), term('battle-enchantment'),
      text('—and double its magnitude. A doubled '), term('counter'), text(' remains capped at 9.')),
    upgraded: rule(text('Choose one '), term('active-effect'), text('—a '), term('counter'),
      text(', '), term('timed-effect'), text(', or '), term('battle-enchantment'),
      text('—and double its magnitude. A '), term('counter'),
      text(' also gains 1 after doubling, capped at 9; a '), term('timed-effect'),
      text(' also lasts 1 extra round.')),
  },
  sanctuary: {
    standard: rule(text('Give one allied company a '), term('timed-effect'),
      text(' that prevents enemy spells from targeting it. Duration starts at 2 rounds and can be extended by '),
      term('spell-power'), text('.')),
    upgraded: rule(term('cleanse', 'Cleanse'), text(' every '), term('counter'),
      text(' from one allied company, then give it a '), term('timed-effect'),
      text(' that prevents enemy spells from targeting it. Duration starts at 2 rounds and can be extended by '),
      term('spell-power'), text('.')),
  },
  oathOfIron: {
    standard: rule(text('For at least 2 rounds, incoming attacks against one allied company roll minimum damage; '),
      term('spell-power'), text(' can extend the duration.')),
    upgraded: rule(text('For at least 2 rounds, incoming attacks against one allied company roll minimum damage and it can retaliate without limit; '),
      term('spell-power'), text(' can extend the duration.')),
  },
  consecrate: {
    standard: rule(term('cleanse', 'Cleanse'), text(' every '), term('counter'),
      text(' from one allied company, then heal its surviving top unit by up to 8% of the company’s maximum HP. '),
      term('spell-power'), text(' can increase the percentage; lost units are not revived.')),
    upgraded: rule(term('cleanse', 'Cleanse'), text(' every '), term('counter'),
      text(' from one allied company, then heal its surviving top unit by up to 15% of the company’s maximum HP and grant 5 '),
      term('morale'), text(' per '), term('counter'), text(' removed. '), term('spell-power'),
      text(' can increase the healing percentage; lost units are not revived.')),
  },
  hymnOfTheHost: {
    standard: rule(text('Every surviving allied company gains 8 '), term('morale'),
      text(' for each '), term('extra-action'), text(' your side has taken in this battle.')),
    upgraded: rule(text('Every surviving allied company gains 12 '), term('morale'),
      text(' for each '), term('extra-action'), text(' your side has taken in this battle.')),
  },
  trial: {
    standard: rule(text('Choose an enemy company with more units than your largest surviving company. It loses at least 30% of its current HP; '),
      term('spell-power'), text(' can increase the percentage.')),
    upgraded: rule(text('Choose an enemy company with more units than your largest surviving company. It loses at least 45% of its current HP; '),
      term('spell-power'), text(' can increase the percentage.')),
  },
  beacon: {
    standard: rule(text('Move the casting hero to the entrance of their nearest owned City.')),
    upgraded: rule(text('Move the casting hero to the entrance of any chosen owned City.')),
  },
  census: {
    standard: rule(text('Until day end, explored enemy heroes and Cities show exact army composition and hero level.')),
    upgraded: rule(text('Until day end, explored enemy heroes and Cities show exact armies and levels; heroes also show mana, known spells, and equipped artifacts.')),
  },
  feastDay: {
    standard: rule(text('Every City you own when this is cast gains 25% '), term('growth'),
      text(' for the current week. Feast Day can be cast only once each week.')),
    upgraded: rule(text('Every City you own when this is cast gains 25% '), term('growth'),
      text(' for the current week and immediately grants 500 gold. Feast Day can be cast only once each week.')),
  },
  clarion: {
    standard: rule(text('Set one allied company’s '), term('morale'), text(' to 80.')),
    upgraded: rule(text('Set one allied company’s '), term('morale'),
      text(' to 100, immediately granting an '), term('extra-action'), text(' at the usual threshold.')),
  },
  vigilOfTheHost: {
    standard: rule(text('Create a '), term('battle-enchantment'),
      text('. At each round start, the surviving allied company with the lowest '),
      term('morale'), text(' gains 15 '), term('morale'), text('.')),
    upgraded: rule(text('Create a '), term('battle-enchantment'),
      text('. At each round start, the two surviving allied companies with the lowest '),
      term('morale'), text(' each gain 15 '), term('morale'), text('.')),
  },
  oathbind: {
    standard: rule(text('Give one enemy a harmful '), term('timed-effect'),
      text(' that prevents it from gaining new '), term('counter'), text(' or other '),
      term('timed-effect', 'timed effects'),
      text('. Existing '), term('active-effect', 'active effects'),
      text(' remain. Duration starts at 2 rounds and can be extended by '),
      term('spell-power'), text('.')),
    upgraded: rule(text('Give one enemy a harmful '), term('timed-effect'),
      text(' that disables its '), term('ability', 'abilities'),
      text(' and prevents it from gaining new '), term('counter'), text(' or other '),
      term('timed-effect', 'timed effects'),
      text('. Existing '), term('active-effect', 'active effects'),
      text(' remain. Duration starts at 3 rounds and can be extended by '),
      term('spell-power'), text('.')),
  },
  waysideShrine: {
    standard: rule(text('Place a shrine on the casting hero’s tile. The next battle fought there has Rite '),
      term('resonance'), text(', then the shrine disappears.')),
    upgraded: rule(text('Place a shrine on the casting hero’s tile and choose Rite, Craft, Grave, or Wild. The next battle fought there has that school’s '),
      term('resonance'), text(', then the shrine disappears.')),
  },
  echo: {
    standard: rule(text('Cast the last non-Echo spell again with new legal targets, your '),
      term('spell-power'), text(', its previous Standard or Upgraded rules, and its previous X-mana spend.')),
    upgraded: rule(text('Cast the last non-Echo spell again with new legal targets, your '),
      term('spell-power'), text(', and its previous X-mana spend, but always use that spell’s Upgraded rules.')),
  },
  kindle: {
    standard: rule(text('Deal 12 fixed '), term('impact-damage'), text(' to one enemy company. This does not scale with '), term('spell-power'), text('.')),
    upgraded: rule(text('Deal 16 fixed '), term('impact-damage'), text(' to one enemy company and reduce its '), term('morale'), text(' by 10. This does not scale with '), term('spell-power'), text('.')),
  },
  sunlance: {
    standard: rule(text('Deal 8 + 4 × '), term('spell-power'), text(' '), term('impact-damage'), text(', capped at 40, to one enemy. Increase it by half if that company destroyed an ally this battle.')),
    upgraded: rule(text('Deal 8 + 4 × '), term('spell-power'), text(' '), term('impact-damage'), text(', capped at 40, to one enemy. Increase it by half if it destroyed an ally, then give the nearest living ally 10 '), term('morale'), text('.')),
  },
  steadyHands: {
    standard: rule(text('One ally gains +1 speed until round end and its next attack cannot be retaliated against.')),
    upgraded: rule(text('Two different allies each gain +1 speed until round end and their next attack cannot be retaliated against.')),
  },
  wellspring: {
    standard: rule(text('Restore 10 + 2 × '), term('spell-power'), text(' mana to one owned hero anywhere on the map. Once per day.')),
    upgraded: rule(text('Restore 16 + 3 × '), term('spell-power'), text(' mana to one owned hero anywhere on the map and give that hero 150 movement. Once per day.')),
  },
  secondWind: {
    standard: rule(term('resurrection', 'Restore'), text(' 20 × '), term('spell-power'), text(' HP to one allied non-'), term('summon', 'summoned'), text(' company, reviving units only up to its starting count.')),
    upgraded: rule(term('resurrection', 'Restore'), text(' 30 × '), term('spell-power'), text(' HP to one allied non-'), term('summon', 'summoned'), text(' company, reviving units only up to its starting count.')),
  },
  litanyOfDawn: {
    standard: rule(text('Every allied company gains 25 '), term('morale'), text(' and its next attack rolls maximum damage.')),
    upgraded: rule(text('Every allied company gains 40 '), term('morale'), text(', its next attack rolls maximum damage, and it ignores the adjacent-enemy ranged penalty this round.')),
  },
  holdTheLine: {
    standard: rule(text('Create a '), term('battle-enchantment'), text('. Once each round, the first allied company that would be destroyed instead survives with one unit at 1 HP.')),
    upgraded: rule(text('Create a '), term('battle-enchantment'), text('. Once each round, the first allied company that would be destroyed instead survives with one unit at 1 HP and gains '), term('bloom', 'Bloom 3'), text('.')),
  },
  consecratedGround: {
    standard: rule(text('Make the battlefield Rite-'), term('resonance', 'resonant'), text(' for both sides for the rest of the battle.')),
    upgraded: rule(text('Give only your side Rite '), term('resonance'), text(' for the rest of the battle.')),
  },
  reprise: {
    standard: rule(text('One ally takes an '), term('extra-action'), text(' now and another before normal order at the start of the next round.')),
    upgraded: rule(text('One ally takes two consecutive '), term('extra-action', 'extra actions'), text(' now.')),
  },
  forgeSpark: {
    standard: rule(text('Deal 8 + 4 × '), term('spell-power'), text(' '), term('impact-damage'),
      text(', capped at 40, then give one enemy '), term('burn', 'Burn 3'), text(' increased by other '), term('burn', 'Burn'),
      text(' bonuses.')),
    upgraded: rule(text('Deal 8 + 4 × '), term('spell-power'), text(' '), term('impact-damage'),
      text(', capped at 40, give the target '), term('burn', 'Burn 4'),
      text(', and give every adjacent enemy '), term('burn', 'Burn 2'), text('.')),
  },
  rivet: {
    standard: rule(text('One ally gains +2 Defense until its next turn and its next retaliation this round deals double damage.')),
    upgraded: rule(text('One ally gains +3 Defense until its next turn, its next retaliation this round deals double damage, and it may retaliate once more this round.')),
  },
  whetstone: {
    standard: rule(text('One ally gains +3 Attack for 2 rounds.')),
    upgraded: rule(text('One ally gains +3 Attack for 2 rounds, and its first attack this round prevents retaliation.')),
  },
  shrapnel: {
    standard: rule(text('One allied ranged company’s next shot also deals half damage to every company adjacent to its target.')),
    upgraded: rule(text('One allied ranged company’s next shot also deals half damage to every company adjacent to its target and consumes no ammunition.')),
  },
  ammunitionCart: {
    standard: rule(text('Every allied ranged company regains its full printed ammunition.')),
    upgraded: rule(text('Every allied ranged company regains its full printed ammunition and ignores the ranged damage penalty for targets beyond distance 7 for this battle.')),
  },
  detonate: {
    standard: rule(term('detonate', 'Detonate'), text(' one enemy’s entire '), term('burn', 'Burn'), text(' pile for pile × (8 + 3 × '), term('spell-power'), text(') '), term('impact-damage'), text('.')),
    upgraded: rule(term('detonate', 'Detonate'), text(' one enemy’s entire '), term('burn', 'Burn'), text(' pile for pile × (8 + 3 × '), term('spell-power'), text(') '), term('impact-damage'), text(', then deal half that damage to every adjacent company.')),
  },
  clockworkDouble: {
    standard: rule(term('clone', 'Summon a copy'), text(' of one eligible allied company at 25% + 5% × '), term('spell-power'), text(' of its current count, capped at 100%. It cannot be revived, duplicated, or survive the battle.')),
    upgraded: rule(term('clone', 'Summon a copy'), text(' of one eligible allied company at 25% + 5% × '), term('spell-power'), text(' of its current count, capped at 100%. It also copies current '), term('counter', 'counters'), text(' and '), term('timed-effect', 'timed effects'), text('.')),
  },
  blink: {
    standard: rule(text('Teleport one company on either side to any legal empty position.')),
    upgraded: rule(text('Teleport two different companies to legal empty positions, or teleport one and let it act immediately if it has not acted this round.')),
  },
  overclock: {
    standard: rule(text('One ally takes an '), term('extra-action'), text(' now and another at round end, then is '), term('stun', 'stunned'), text(' for the following round.')),
    upgraded: rule(text('One ally takes an '), term('extra-action'), text(' now and another at round end, acts normally next round, then is '), term('stun', 'stunned'), text(' one round later.')),
  },
  dimensionDoor: {
    standard: rule(text('Teleport this hero to a legal unoccupied explored tile within 6 + '), term('spell-power'), text(' tiles, ignoring intervening terrain and blockers. Once per day.')),
    upgraded: rule(text('Teleport this hero to a legal unoccupied explored tile within 10 + '), term('spell-power'), text(' tiles, ignoring intervening terrain and blockers. Twice per day.')),
  },
  ward: {
    standard: rule(text('Give one allied company a '), term('timed-effect'),
      text(' that makes the next damage instance against it deal 0 damage, then ends.')),
    upgraded: rule(text('Give one allied company a '), term('timed-effect'),
      text(' that makes the next damage instance against it deal 0 damage, gives the attacker '),
      term('burn', 'Burn 2'), text(', then ends.')),
  },
  reflect: {
    standard: rule(text('Choose a '), term('counter'), text(' or '), term('timed-effect'),
      text(' on any company. Add the same '), term('counter'),
      text(' amount or a copy of that '), term('timed-effect'),
      text(' to one chosen living company; the original effect remains unchanged.')),
    upgraded: rule(text('Choose a '), term('counter'), text(' or '), term('timed-effect'),
      text(' on any company. Add the same '), term('counter'),
      text(' amount or a copy of that '), term('timed-effect'),
      text(' to two different chosen living companies; the original effect remains unchanged.')),
  },
  forgefire: {
    standard: rule(text('Create a '), term('battle-enchantment'), text('. Enemy '),
      term('burn'), text(' deals double damage.')),
    upgraded: rule(text('Create a '), term('battle-enchantment'), text('. Enemy '),
      term('burn'), text(' deals double damage and does not decay at turn end.')),
  },
  clockworkEscort: {
    standard: rule(term('summon', 'Summon'),
      text(' 5 Tin Soldiers, plus 5 more per point of '), term('spell-power'),
      text('. They remain only for this battle.')),
    upgraded: rule(term('summon', 'Summon'),
      text(' 2 Marionettes, plus 2 more per point of '), term('spell-power'),
      text('. They remain only for this battle.')),
  },
  wallOfTheMaker: {
    standard: rule(text('Create three persistent '), term('wall-hex', 'wall hexes'),
      text(' on distinct empty battlefield hexes. They block movement for the rest of the battle.')),
    upgraded: rule(text('Create three persistent '), term('wall-hex', 'wall hexes'),
      text(' on distinct empty battlefield hexes. They block movement for the rest of the battle; at each adjacent enemy’s turn start, that enemy gains '),
      term('burn', 'Burn 1'), text(' once.')),
  },
  quicksilver: {
    standard: rule(text('Give one allied company +3 speed and '), term('phase'),
      text('. Duration starts at 2 rounds and can be extended by '), term('spell-power'), text('.')),
    upgraded: rule(text('Give one allied company +3 speed and '), term('phase'),
      text(' for the rest of the battle.')),
  },
  unmake: {
    standard: rule(text('Remove one chosen '), term('battle-enchantment'),
      text(', or '), term('cleanse'), text(' every '), term('counter'),
      text(' from one chosen company. Protected '), term('battle-enchantment', 'enchantments'),
      text(' cannot be removed.')),
    upgraded: rule(text('Remove one chosen '), term('battle-enchantment'),
      text(', including a protected one, or '), term('cleanse'), text(' every '), term('counter'),
      text(' from two chosen companies. Removing a '), term('battle-enchantment'), text(' gives its owner’s living companies '),
      term('chill', 'Chill 2'), text('.')),
  },
  ironclad: {
    standard: rule(text('Create a '), term('battle-enchantment'),
      text('. Allied companies with at least 12 combined unit and hero Defense take half damage.')),
    upgraded: rule(text('Create a '), term('battle-enchantment'),
      text('. Allied companies with at least 10 combined unit and hero Defense take half damage.')),
  },
  gate: {
    standard: rule(text('Open a passage between two different explored map tiles. Your heroes can travel directly between its entrances through the end of tomorrow.')),
    upgraded: rule(text('Open a passage between two different explored map tiles. Your heroes can travel directly between its entrances through the end of the current week.')),
  },
  saltTheVein: {
    standard: rule(text('Choose an explored enemy mine with an owner. It produces no resources for 5 days, including today.')),
    upgraded: rule(text('Choose an explored enemy mine with an owner. It produces no resources for 8 days, including today.')),
  },
  falseColors: {
    standard: rule(text('Choose a displayed '), term('guardian'),
      text(' band. Enemy threat evaluation uses it instead of this hero’s true army until an enemy hero comes adjacent.')),
    upgraded: rule(text('Choose a displayed '), term('guardian'),
      text(' band. Enemy threat evaluation uses it, and enemies judging the displayed fight unfavourable will not attack this turn.')),
  },
  clockworkCourier: {
    standard: rule(text('Swap one item slot or one army slot between the casting hero and another owned hero.')),
    upgraded: rule(text('Swap one item slot or one army slot between the casting hero and another owned hero. An army slot may instead be swapped with an owned City garrison.')),
  },
  brittle: {
    standard: rule(text('Give one enemy a harmful '), term('timed-effect'),
      text(' that disables its '), term('ability', 'abilities'),
      text('. Duration starts at 2 rounds and can be extended by '), term('spell-power'), text('.')),
    upgraded: rule(text('Give one enemy a harmful '), term('timed-effect'),
      text(' that disables its '), term('ability', 'abilities'), text(' and gives it '),
      term('burn', 'Burn 2'),
      text('. Duration starts at 3 rounds and can be extended by '), term('spell-power'), text('.')),
  },
  standingMirror: {
    standard: rule(term('summon', 'Summon'),
      text(' a 30-HP immobile Standing Mirror, replacing the old one. While it survives, it copies each enemy spell once using your '),
      term('spell-power'), text(' and that spell’s Standard or Upgraded rules. It cannot copy Standing Mirror, Echo, or '),
      term('twister', 'Twisters'), text('; a copy without a valid opposing target does nothing.')),
    upgraded: rule(term('summon', 'Summon'),
      text(' a 30-HP immobile Standing Mirror. It copies enemy spells and '), term('twister', 'Twisters'),
      text(' once using your '), term('spell-power'),
      text('; you choose each legal copy target, and Standing Mirror, Echo, and Mirror Hall remain excluded.')),
  },
  summonSkiff: {
    standard: rule(term('summon', 'Summon'),
      text(' a new boat on the nearest unoccupied water tile beside land.')),
    upgraded: rule(text('Move the nearest unoccupied boat, regardless of owner, to the nearest unoccupied water tile beside land without changing its owner. If no unoccupied boat exists, '),
      term('summon'), text(' a new one there.')),
  },
  hourglassCrack: {
    standard: rule(text('Give one company one '), term('extra-action'),
      text(' and make it skip the next round.')),
    upgraded: rule(text('Give one company one '), term('extra-action'),
      text(' and choose which one of the next three rounds it skips.')),
  },
} as Record<RiteCraftSpellId, SpellRuleVersions>;

export const GRAVE_WILD_SPELL_IDS = [
  'wither', 'graveChill', 'mournersVeil', 'dirge', 'lastCandle', 'sour',
  'remembrance', 'reckoning', 'quiet',
  'pinchOfAsh', 'tithe', 'grudge', 'yoke', 'graveBargain', 'puppetStrings',
  'secondGrave', 'ashenPall', 'theLedgerBalanced', 'ossuary', 'stealAway',
  'theLongSilence', 'harvest', 'theDebtCalled',
  'coldRoad', 'borrowedTime', 'paleProcession', 'silenceThePassing', 'theToll',
  'deathsLedger', 'graveSpeech', 'loyalUntoDeath',
  'nettle', 'bramblelash', 'wildcall', 'sapAndSinew', 'verdantSurge',
  'theTurningYear', 'fly',
  'beastSense', 'illWind', 'rootTheSky', 'beastSovereign', 'windShear',
  'theLongGreen', 'theWeatherItself',
  'gale', 'bloom', 'overgrow', 'thicket', 'rains', 'beastTongue', 'stampedeCall',
  'storm', 'greenway', 'wildGrowth', 'murmuration', 'greenTide', 'rootAndRuin',
  'fickleWeather', 'shedSkin', 'hedgerowMarch', 'borrowShape',
] as const satisfies readonly SpellId[];

export type GraveWildSpellId = typeof GRAVE_WILD_SPELL_IDS[number];

/** Canonical structured rules for Grave and Wild, derived from their runtime branches. */
export const GRAVE_WILD_SPELL_RULES = {
  ...Object.fromEntries([
    'secondGrave', 'ashenPall', 'theLedgerBalanced', 'ossuary', 'stealAway',
    'theLongSilence', 'harvest', 'theDebtCalled', 'beastSense', 'illWind',
    'rootTheSky', 'beastSovereign', 'windShear', 'theLongGreen', 'theWeatherItself',
  ].map((id) => [id, P2_NEW_SPELL_RULES[id as keyof typeof P2_NEW_SPELL_RULES]])),
  wither: {
    standard: rule(text('Deal 6 + 3 × '), term('spell-power'), text(' '), term('impact-damage'),
      text(', capped at 40, then give one enemy '), term('hex', 'Hex 6'), text(', increased by '),
      term('spell-power'), text(' and other '), term('hex', 'Hex'), text(' bonuses.')),
    upgraded: rule(text('Deal 6 + 3 × '), term('spell-power'), text(' '), term('impact-damage'),
      text(', capped at 40, then give one enemy '), term('hex', 'Hex 8'), text(', increased by '),
      term('spell-power'), text(' and other '), term('hex', 'Hex'),
      text(' bonuses, and give it '), term('chill', 'Chill 2'), text('.')),
  },
  graveChill: {
    standard: rule(text('Give one enemy '), term('chill', 'Chill 3'), text(', increased by '),
      term('spell-power'), text('.')),
    upgraded: rule(text('Give one enemy '), term('chill', 'Chill 3'), text(', increased by '),
      term('spell-power'), text(', and reduce its '), term('morale'), text(' by 20, to a minimum of 0.')),
  },
  mournersVeil: {
    standard: rule(text('Give one allied company a '), term('beneficial-effect', 'beneficial'),
      text(' '), term('timed-effect'),
      text(' that makes it take 20% less damage for at least 2 rounds; '),
      term('spell-power'), text(' can extend the duration.')),
    upgraded: rule(text('Give one allied company a '), term('beneficial-effect', 'beneficial'),
      text(' '), term('timed-effect'),
      text(' that makes it take 20% less damage for at least 3 rounds; '),
      term('spell-power'), text(' can extend the duration. After a company attacks it, that attacker gains '),
      term('hex', 'Hex 1'), text('.')),
  },
  dirge: {
    standard: rule(text('One enemy loses 3% of its current HP for every company already destroyed in this battle. '),
      term('spell-power'), text(' can increase the percentage per destroyed company; the loss is at least 1 HP and can destroy the company.')),
    upgraded: rule(text('One enemy loses 5% of its current HP for every company already destroyed in this battle. '),
      term('spell-power'), text(' can increase the percentage per destroyed company; the loss is at least 1 HP and can destroy the company.')),
  },
  lastCandle: {
    standard: rule(text('Create a '), term('battle-enchantment'), text('. Its '),
      term('death-trigger'), text(' fires when an attack destroys an allied company: every surviving ally gains 20 '),
      term('morale'), text(' and every surviving enemy gains '), term('hex', 'Hex 2'),
      text('. Both rewards scale down proportionally if that company began below 10% of its side’s starting army HP.')),
    upgraded: rule(text('Create a '), term('battle-enchantment'), text('. Its '),
      term('death-trigger'), text(' fires when an attack destroys an allied company: every surviving ally gains 20 '),
      term('morale'), text(', every surviving enemy gains '), term('hex', 'Hex 2'),
      text(', and your hero gains 2 mana. All rewards scale down proportionally if that company began below 10% of its side’s starting army HP.')),
  },
  sour: {
    standard: rule(text('Choose one '), term('bloom', 'Bloom'), text(' pile, '),
      term('beneficial-effect', 'beneficial'), text(' '), term('timed-effect'),
      text(', or unprotected '), term('battle-enchantment'), text(' on either side'),
      text('. Remove it; a removed '), term('bloom', 'Bloom'), text(' pile gives the company equal '),
      term('hex', 'Hex'), text(', while a removed '), term('timed-effect'),
      text(' gives that company '), term('hex', 'Hex 2'), text('.')),
    upgraded: rule(text('Choose one '), term('bloom', 'Bloom'), text(' pile, '),
      term('beneficial-effect', 'beneficial'), text(' '), term('timed-effect'),
      text(', or unprotected '), term('battle-enchantment'), text(' on either side'),
      text('. Remove it; a removed '), term('bloom', 'Bloom'), text(' pile gives the company equal '),
      term('hex', 'Hex'), text(', a removed '), term('timed-effect'),
      text(' gives that company '), term('hex', 'Hex 2'), text(', and a removed '),
      term('battle-enchantment'), text(' gives every surviving enemy '), term('hex', 'Hex 3'), text('.')),
  },
  remembrance: {
    standard: rule(text('Revive 20% of the units one surviving allied, non-'), term('summon', 'summoned'),
      text(' company has lost in this battle, rounded up and limited by its starting count. '),
      term('spell-power'), text(' can increase the percentage.')),
    upgraded: rule(text('Revive 35% of the units one surviving allied, non-'), term('summon', 'summoned'),
      text(' company has lost in this battle, rounded up and limited by its starting count. '),
      term('spell-power'), text(' can increase the percentage.')),
  },
  reckoning: {
    standard: rule(text('Spend all remaining mana. Every living company loses 2% of its current HP per mana spent, up to 60%; '),
      term('spell-power'), text(' can increase the percentage per mana. Each loss is at least 1 HP and can destroy the company.')),
    upgraded: rule(text('Spend all remaining mana. Every living enemy loses 2% of its current HP per mana spent, capped at 60%; every living ally loses half that amount, capped at 30%. '),
      term('spell-power'), text(' can increase the percentage per mana. Each loss is at least 1 HP and can destroy the company.')),
  },
  quiet: {
    standard: rule(text('Give one enemy a '), term('harmful-effect', 'harmful'),
      text(' '), term('timed-effect'),
      text(' that prevents retaliation for at least 2 rounds; '), term('spell-power'),
      text(' can extend the duration.')),
    upgraded: rule(text('Give one enemy a '), term('harmful-effect', 'harmful'),
      text(' '), term('timed-effect'),
      text(' that prevents retaliation for at least 2 rounds, and give it '),
      term('chill', 'Chill 2'), text('; '), term('spell-power'), text(' can extend the duration.')),
  },
  coldRoad: {
    standard: rule(text('Move the casting hero from one '), term('barrowfield'),
      text(' tile to any different explored '), term('barrowfield'),
      text(' tile, regardless of distance or connection.')),
    upgraded: rule(text('Move the casting hero from one '), term('barrowfield'),
      text(' tile to any different explored '), term('barrowfield'),
      text(' tile, regardless of distance or connection, and optionally carry one adjacent owned hero to the same destination.')),
  },
  borrowedTime: {
    standard: rule(text('Double the casting hero’s remaining movement before paying this spell’s movement cost. At the start of tomorrow, set their normal movement to 0.')),
    upgraded: rule(text('Double the casting hero’s remaining movement before paying this spell’s movement cost. At the start of tomorrow, set their normal movement to half its usual value.')),
  },
  paleProcession: {
    standard: rule(term('summon', 'Summon'), text(' 5 Candle-Wisps per point of '),
      term('spell-power'), text(' at the site of a battle with at least 100 casualties. The resulting Candle-Wisp company departs at the start of the third day after casting.')),
    upgraded: rule(term('summon', 'Summon'), text(' 8 Candle-Wisps per point of '),
      term('spell-power'), text(' at the site of a battle with at least 100 casualties. The resulting Candle-Wisp company departs at the start of the seventh day after casting.')),
  },
  silenceThePassing: {
    standard: rule(text('Create a '), term('battle-enchantment'), text(' that suppresses enemy '),
      term('death-trigger', 'death triggers'), text(' for at least 3 rounds; '),
      term('spell-power'), text(' can extend the duration.')),
    upgraded: rule(text('Create a '), term('battle-enchantment'), text(' that suppresses enemy '),
      term('death-trigger', 'death triggers'), text(' and makes allied '),
      term('death-trigger', 'death triggers'), text(' fire twice for at least 3 rounds; '),
      term('spell-power'), text(' can extend the duration.')),
  },
  theToll: {
    standard: rule(text('Your hero gains 2 mana for every company already destroyed in this battle.')),
    upgraded: rule(text('Your hero gains 3 mana for every company already destroyed in this battle.')),
  },
  deathsLedger: {
    standard: rule(text('Reveal the exact positions of every map object standing on '),
      term('barrowfield'), text('.')),
    upgraded: rule(text('Reveal the exact positions of every map object standing on '),
      term('barrowfield'), text(', and reveal '), term('guardian'), text(' army counts through the end of today.')),
  },
  graveSpeech: {
    standard: rule(text('At a tile where a battle was fought, show a summary of the latest battle there.')),
    upgraded: rule(text('At a tile where a battle was fought, show a summary of the latest battle there and optionally learn one spell cast in it that is not already known.')),
  },
  loyalUntoDeath: {
    standard: rule(text('Give one allied company a '), term('timed-effect'),
      text(' for this battle. When an attack destroys it, deal its pre-attack unit count multiplied by its unit’s average base damage to the surviving killer.')),
    upgraded: rule(text('Give one allied company a '), term('timed-effect'),
      text(' for this battle. When an attack destroys it, deal its pre-attack unit count multiplied by its unit’s average base damage to the surviving killer, prevent the normal allied '),
      term('morale'), text(' loss, and give your hero 3 mana.')),
  },
  gale: {
    standard: rule(term('forced-movement', 'Push'), text(' one enemy up to 2 spaces away from the acting company. If blocked early, it loses 3% of its current HP, with a minimum loss of 1 HP; this can destroy it.')),
    upgraded: rule(term('forced-movement', 'Push'), text(' one enemy up to 3 spaces away from the acting company. If blocked early, it loses 6% of its current HP, with a minimum loss of 1 HP, and, if it survives, gains '),
      term('chill', 'Chill 1'), text('.')),
  },
  bloom: {
    standard: rule(text('Give one allied company '), term('bloom', 'Bloom 3'), text('.')),
    upgraded: rule(text('Give one allied company '), term('bloom', 'Bloom 4'),
      text(' and every adjacent allied company '), term('bloom', 'Bloom 1'), text('.')),
  },
  overgrow: {
    standard: rule(text('Choose one '), term('counter'), text(' or '), term('timed-effect'),
      text(' on a company. Add its '), term('counter'), text(' amount or a copy of that '),
      term('timed-effect'), text(' to that company and every adjacent living company. The chosen company gains the '),
      term('counter', 'Counter'), text(' first, which may increase the amount copied to nearby companies.')),
    upgraded: rule(text('Choose one '), term('counter'), text(' or '), term('timed-effect'),
      text(' on a company. Add its '), term('counter'), text(' amount or a copy of that '),
      term('timed-effect'), text(' to that company and every adjacent living company except one chosen neighbor. The chosen company gains the '),
      term('counter', 'Counter'), text(' first, which may increase the amount copied to nearby companies.')),
  },
  thicket: {
    standard: rule(text('Create persistent '), term('undergrowth'),
      text(' on three different empty battlefield spaces. Entering one costs 2 extra movement.')),
    upgraded: rule(text('Create persistent '), term('undergrowth'),
      text(' on three different empty battlefield spaces. Entering one costs 2 extra movement, and an enemy that ends there gains '),
      term('chill', 'Chill 1'), text('.')),
  },
  rains: {
    standard: rule(text('Remove all '), term('burn', 'Burn'),
      text(' from every living company, then give every living ally '), term('bloom', 'Bloom 1'), text('.')),
    upgraded: rule(text('Remove all '), term('burn', 'Burn'),
      text(' from every living company, then give every living ally '), term('bloom', 'Bloom 1'),
      text(' and every living enemy '), term('chill', 'Chill 1'), text('.')),
  },
  beastTongue: {
    standard: rule(text('Choose a '), term('guardian'), text(' army made entirely of '), term('beast', 'Beasts'),
      text('. Pay twice its base gold value to disperse it.')),
    upgraded: rule(text('Choose a '), term('guardian'), text(' army made entirely of '), term('beast', 'Beasts'),
      text('. Either pay twice its base gold value to disperse it, or pay three times its base gold value to recruit the whole army; every company must fit.')),
  },
  stampedeCall: {
    standard: rule(text('Every living allied '), term('beast'), text(' uses '),
      term('forced-movement', 'forced movement'), text(' to move as close as it can to its nearest living enemy within its base speed.')),
    upgraded: rule(text('Every living allied '), term('beast'), text(' uses '),
      term('forced-movement', 'forced movement'), text(' to move as close as it can to its nearest living enemy within its base speed, then gains +2 speed for this round.')),
  },
  storm: {
    standard: rule(text('Every living company loses 6% of its current HP; a company with the Flying '),
      term('ability', 'ability'), text(' loses 12% instead. Each loss is at least 1 HP and can destroy the company.')),
    upgraded: rule(text('Every living company loses 6% of its current HP; a company with the Flying '),
      term('ability', 'ability'), text(' loses 18% instead. Each loss is at least 1 HP and can destroy the company.')),
  },
  greenway: {
    standard: rule(text('Move the casting hero between two explored, connected '),
      term('deepwood'), text(' tiles no more than 15 tiles apart.')),
    upgraded: rule(text('Move the casting hero between two explored, connected '),
      term('deepwood'), text(' tiles no more than 25 tiles apart.')),
  },
  wildGrowth: {
    standard: rule(text('One owned City gains 50% '), term('growth'),
      text(' for the current week. Each repeated cast multiplies its '), term('growth', 'Growth'), text(' again.')),
    upgraded: rule(text('One owned City gains 75% '), term('growth'),
      text(' for the current week. Each repeated cast multiplies its '), term('growth', 'Growth'), text(' again.')),
  },
  murmuration: {
    standard: rule(text('Reveal every chosen in-bounds map tile; the chosen tiles do not need to connect.')),
    upgraded: rule(text('Reveal every chosen in-bounds map tile and every tile within 1 tile of it; the chosen tiles do not need to connect.')),
  },
  greenTide: {
    standard: rule(text('Your heroes pay no movement to enter '), term('deepwood'),
      text(' tiles for the current week.')),
    upgraded: rule(text('Your heroes pay no movement to enter '), term('deepwood'),
      text(' tiles for the current week, and reveal every '), term('deepwood'), text(' tile on the map.')),
  },
  rootAndRuin: {
    standard: rule(text('Create three map tiles of impassable '), term('undergrowth'),
      text(' where no City or map object stands. They remain for 3 days, including today.')),
    upgraded: rule(text('Create five map tiles of impassable '), term('undergrowth'),
      text(' where no City or map object stands. They remain for 5 days, including today.')),
  },
  fickleWeather: {
    standard: rule(text('Replace the current '), term('omen'), text(' with one chosen from 2 offered alternatives. The current '),
      term('omen', 'Omen'), text(' is never among the choices. A Weathercock of Ill '), term('omen', 'Omen'),
      text(' instead offers every other '), term('omen'), text('.')),
    upgraded: rule(text('Replace the current '), term('omen'), text(' with one chosen from 3 offered alternatives. The current '),
      term('omen', 'Omen'), text(' is never among the choices. A Weathercock of Ill '), term('omen', 'Omen'),
      text(' instead offers every other '), term('omen'), text('.')),
  },
  shedSkin: {
    standard: rule(text('Remove the oldest '), term('timed-effect'),
      text(' from one ally. If none exists, remove its first nonzero '), term('counter'),
      text(' pile in '), term('burn', 'Burn'), text(', '), term('chill', 'Chill'), text(', '),
      term('hex', 'Hex'), text(', then '), term('bloom', 'Bloom'),
      text(' order. Give the ally '), term('bloom', 'Bloom'),
      text(' equal to the removed magnitude, with a minimum of 1.')),
    upgraded: rule(text('Remove one chosen '), term('timed-effect'), text(' or one chosen '),
      term('counter'), text(' pile from an ally and give it '), term('bloom', 'Bloom'),
      text(' equal to that magnitude, minimum 1. Apply the removed effect or pile at the same magnitude to one adjacent enemy.')),
  },
  hedgerowMarch: {
    standard: rule(text('Create a '), term('battle-enchantment'), text('. Allies ignore '),
      term('undergrowth'), text(' movement cost and gain +1 speed; enemies ending on '),
      term('undergrowth'), text(' gain '), term('chill', 'Chill 1'), text('.')),
    upgraded: rule(text('Create a '), term('battle-enchantment'), text('. Allies ignore '),
      term('undergrowth'), text(' movement cost, gain +2 speed, and move through enemies as if '), term('phase', 'phased'),
      text('; enemies ending on '), term('undergrowth'), text(' gain '), term('chill', 'Chill 1'), text('.')),
  },
  pinchOfAsh: {
    standard: rule(text('Give one enemy fixed '), term('hex', 'Hex 2'), text(' and reduce its '), term('morale'), text(' by 10. This does not scale with '), term('spell-power'), text('.')),
    upgraded: rule(text('Give one enemy fixed '), term('hex', 'Hex 3'), text(' and reduce its '), term('morale'), text(' by 20. This does not scale with '), term('spell-power'), text('.')),
  },
  tithe: {
    standard: rule(text('Your hero gains 4 mana, capped at maximum. One ally loses 10% of its current HP.')),
    upgraded: rule(text('Your hero gains 6 mana, capped at maximum. One ally loses 8% of its current HP and gains '), term('bloom', 'Bloom 2'), text('.')),
  },
  grudge: {
    standard: rule(text('Mark one enemy for 3 rounds. Allied companies deal 10% more damage to it and each allied attack gives it '), term('hex', 'Hex 1'), text('.')),
    upgraded: rule(text('Mark one enemy for 3 rounds. Allied companies deal 15% more damage to it and each allied attack gives it '), term('hex', 'Hex 2'), text('.')),
  },
  yoke: {
    standard: rule(text('Link two different living companies for 3 rounds. Damage to either deals 50% of that damage to the other once; ordinary '), term('cleanse', 'cleansing'), text(' can remove the link.')),
    upgraded: rule(text('Link two different living companies for 3 rounds. Damage to either deals 75% of that damage to the other once; the protected link cannot be removed by Unmake, Sour, or Shed Skin.')),
  },
  graveBargain: {
    standard: rule(text('Destroy one allied non-'), term('summon', 'summoned'), text(' company other than your last. Gain mana equal to 10% of its starting maximum HP, capped at 20; surviving allies gain 25 '), term('morale'), text(' and '), term('bloom', 'Bloom 3'), text('.')),
    upgraded: rule(text('As Standard, and every surviving enemy gains '), term('hex', 'Hex 3'), text('. Flat rewards obey destruction proportionality.')),
  },
  puppetStrings: {
    standard: rule(text('Control one enemy with current HP at most 40 × '), term('spell-power'), text(' for 2 rounds. It returns with its control-time effects discarded and '), term('hex', 'Hex 3'), text('. Each company can be controlled once.')),
    upgraded: rule(text('Control one enemy with current HP at most 40 × '), term('spell-power'), text(' for 3 rounds. It retains control-time effects when it returns with '), term('hex', 'Hex 3'), text('. Each company can be controlled once.')),
  },
  nettle: {
    standard: rule(text('Deal 10 fixed '), term('impact-damage'), text(' and give one enemy fixed '), term('chill', 'Chill 1'), text('. Neither scales with '), term('spell-power'), text('.')),
    upgraded: rule(text('Deal 10 fixed '), term('impact-damage'), text(', give one enemy fixed '), term('chill', 'Chill 2'), text(', and prevent speed bonuses until its next turn.')),
  },
  bramblelash: {
    standard: rule(text('Deal 8 + 4 × '), term('spell-power'), text(' '), term('impact-damage'), text(', capped at 40, and create '), term('undergrowth'), text(' on one chosen empty adjacent position.')),
    upgraded: rule(text('Deal 8 + 4 × '), term('spell-power'), text(' '), term('impact-damage'), text(', capped at 40, and create '), term('undergrowth'), text(' on every empty adjacent position.')),
  },
  wildcall: {
    standard: rule(term('summon', 'Summon'), text(' a deterministic neutral '), term('beast', 'Beast'), text(' for this battle with unit-strength budget 12 × '), term('spell-power'), text('.')),
    upgraded: rule(term('summon', 'Summon'), text(' a deterministic neutral '), term('beast', 'Beast'), text(' for this battle with unit-strength budget 18 × '), term('spell-power'), text(' and +2 speed.')),
  },
  sapAndSinew: {
    standard: rule(text('One ally gains +3 speed and +2 Attack for 3 rounds; a '), term('beast', 'Beast'), text(' also gains one extra retaliation each round.')),
    upgraded: rule(text('One ally gains +4 speed and +3 Attack for 3 rounds; a '), term('beast', 'Beast'), text(' also gains '), term('bloom', 'Bloom 2'), text(' each round start.')),
  },
  verdantSurge: {
    standard: rule(text('Every ally gains '), term('bloom', 'Bloom 3'), text('; every enemy gains '), term('chill', 'Chill 2'), text('.')),
    upgraded: rule(text('Every ally gains '), term('bloom', 'Bloom 4'), text(' without next-turn decay; every enemy gains '), term('chill', 'Chill 3'), text('.')),
  },
  theTurningYear: {
    standard: rule(text('Choose one '), term('counter'), text(' type. Every company converts all other '),
      term('counter', 'counters'), text(' into it one for one, capped at 9, without '),
      term('counter', 'counter'), text('-application bonuses.')),
    upgraded: rule(text('As Standard, but converted '), term('counter', 'counters'),
      text(' on your companies are doubled before the cap.')),
  },
  fly: {
    standard: rule(text('For today, this hero pays 65 movement per tile and may cross Mountain and Water but cannot stop there. Once per day.')),
    upgraded: rule(text('As Standard, and the hero ignores '), term('guardian', 'guardian'),
      text(' aggression for today. Once per day.')),
  },
  borrowShape: {
    standard: rule(text('One allied company copies every '), term('ability'),
      text(' from one adjacent living enemy for the rest of the battle, while retaining its own.')),
    upgraded: rule(text('One allied company copies every '), term('ability'),
      text(' from any living enemy for the rest of the battle, while retaining its own.')),
  },
} as Record<GraveWildSpellId, SpellRuleVersions>;

/** Single extension point consumed by catalogs and semantic rule surfaces. */
export const SPELL_RULE_PRESENTATIONS: Record<SpellId, SpellRuleVersions> = {
  ...Object.fromEntries(RITE_CRAFT_SPELL_IDS.map((id) => [id, RITE_CRAFT_SPELL_RULES[id]])),
  ...Object.fromEntries(GRAVE_WILD_SPELL_IDS.map((id) => [id, GRAVE_WILD_SPELL_RULES[id]])),
} as Record<SpellId, SpellRuleVersions>;

export function spellRuleVersions(spellId: SpellId): SpellRuleVersions {
  return SPELL_RULE_PRESENTATIONS[spellId];
}
