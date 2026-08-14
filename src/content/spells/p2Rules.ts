import type { SpellId } from '../../core/types';
import {
  spellRuleTerm as term, spellRuleText as text,
  type SpellRulePresentation, type SpellRuleToken, type SpellRuleVersions,
} from '../spellLexicon';

const rule = (...tokens: SpellRuleToken[]): SpellRulePresentation => tokens;

export const P2_NEW_RULE_IDS = [
  'scrying', 'bellBookAndCandle', 'processionOfLamps', 'dayspring', 'theLongOath',
  'prospect', 'counterweight', 'bulwark', 'theUnmakingEngine', 'mirrorHall',
  'secondGrave', 'ashenPall', 'theLedgerBalanced', 'ossuary', 'stealAway',
  'theLongSilence', 'harvest', 'theDebtCalled',
  'beastSense', 'illWind', 'rootTheSky', 'beastSovereign', 'windShear',
  'theLongGreen', 'theWeatherItself',
] as const satisfies readonly SpellId[];

export type P2NewRuleId = typeof P2_NEW_RULE_IDS[number];

export const P2_NEW_SPELL_RULES: Record<P2NewRuleId, SpellRuleVersions> = {
  scrying: {
    standard: rule(text('Reveal a radius-6 circle around one owned hero, owned City, or explored map object. Show exact '), term('guardian'), text(' counts there through day end.')),
    upgraded: rule(text('Reveal a radius-9 circle around one owned hero, owned City, or explored map object. Show exact '), term('guardian'), text(' counts and guarded rewards there through day end.')),
  },
  bellBookAndCandle: {
    standard: rule(text('Create a '), term('battle-enchantment'), text('. The first allied '), term('extra-action'), text(' each round restores 2 mana and gives that company +1 Attack for the round.')),
    upgraded: rule(text('Create a '), term('battle-enchantment'), text('. The first two allied '), term('extra-action', 'extra actions'), text(' each round restore 3 mana and give those companies +1 Attack for the round.')),
  },
  processionOfLamps: {
    standard: rule(text('Restore this hero’s movement to its full daily maximum. Once per week.')),
    upgraded: rule(text('Restore this hero’s movement to its full daily maximum and give one adjacent owned hero half of their daily maximum. Once per week.')),
  },
  dayspring: {
    standard: rule(term('cleanse', 'Cleanse'), text(' all allied companies, restore 20 × '), term('spell-power'), text(' HP to each with '), term('resurrection'), text(' up to starting count, and grant 30 '), term('morale'), text('.')),
    upgraded: rule(term('cleanse', 'Cleanse'), text(' all allied companies, restore 30 × '), term('spell-power'), text(' HP to each with '), term('resurrection'), text(', grant 30 '), term('morale'), text(', and extend allied '), term('timed-effect', 'timed effects'), text(' by 2 rounds.')),
  },
  theLongOath: {
    standard: rule(text('Create a '), term('battle-enchantment'), text('. Allies cannot lose '), term('morale'), text(', gain 15 each round start, and your hero may cast one extra spell costing at most 5 mana each round.')),
    upgraded: rule(text('Create a '), term('battle-enchantment'), text('. Allies cannot lose '), term('morale'), text(', gain 15 each round start, and your hero may cast one extra spell costing at most 9 mana each round.')),
  },
  prospect: {
    standard: rule(text('Reveal every mine and resource pile within 12 tiles. The next resource pile this hero collects this week yields double.')),
    upgraded: rule(text('Reveal every mine, resource pile, essence deposit, and Seam within 18 tiles. The next resource pile this hero collects this week yields double.')),
  },
  counterweight: {
    standard: rule(text('For 3 rounds one ally cannot be forcibly moved or teleported, and its retaliations deal double damage.')),
    upgraded: rule(text('For 3 rounds one ally cannot be forcibly moved or teleported, its retaliations deal double damage, and it may retaliate without limit.')),
  },
  bulwark: {
    standard: rule(text('Create five '), term('wall-hex', 'wall hexes'), text(' in one chosen column and an immobile Watchtower of 5 + 2 × '), term('spell-power'), text(' units using your tier-2 ranged profile.')),
    upgraded: rule(text('Create six '), term('wall-hex', 'wall hexes'), text(' in one chosen column and an immobile Watchtower of 5 + 2 × '), term('spell-power'), text(' units with +2 Attack and unlimited ammunition.')),
  },
  theUnmakingEngine: {
    standard: rule(text('Deal 25 + 9 × '), term('spell-power'), text(' '), term('impact-damage'), text(' to every enemy company and remove all their '), term('timed-effect', 'timed effects'), text('.')),
    upgraded: rule(text('Deal 25 + 9 × '), term('spell-power'), text(' '), term('impact-damage'), text(' to every enemy, remove their '), term('timed-effect', 'timed effects'), text(', and destroy both enemy '), term('battle-enchantment', 'enchantments'), text(', including protected ones.')),
  },
  mirrorHall: {
    standard: rule(text('Create a '), term('battle-enchantment'), text('. Each later eligible spell is copied once to a chosen second legal target, but the copy cannot grant mana or '), term('extra-action', 'extra actions'), text('.')),
    upgraded: rule(text('Create a '), term('battle-enchantment'), text('. Each later eligible spell is copied to a chosen second target; a copied tier-5 spell resolves at half magnitude.')),
  },
  secondGrave: {
    standard: rule(text('The first time one chosen allied company is destroyed this battle, return it at 30% of its starting count.')),
    upgraded: rule(text('The first time one chosen allied company is destroyed this battle, return it at 50% of its starting count with '), term('bloom', 'Bloom 3'), text('.')),
  },
  ashenPall: {
    standard: rule(text('Every enemy gains '), term('hex', 'Hex 3'), text(' and '), term('chill', 'Chill 2'), text('.')),
    upgraded: rule(text('Every enemy gains '), term('hex', 'Hex 4'), text(' and '), term('chill', 'Chill 3'), text('; its '), term('counter', 'counters'), text(' do not decay at the end of its next turn.')),
  },
  theLedgerBalanced: {
    standard: rule(text('Mark one enemy for this battle. Whenever an allied company is destroyed, the marked enemy loses the same number of units, up to its current count.')),
    upgraded: rule(text('As Standard; each allied company also triggers once when first reduced below half its starting count.')),
  },
  ossuary: {
    standard: rule(text('Create a '), term('battle-enchantment'), text('. Each company destroyed on either side '), term('summon', 'summons'), text(' allied Candle-Wisps with count derived from its starting maximum HP.')),
    upgraded: rule(text('Create a '), term('battle-enchantment'), text('. Each company destroyed on either side '), term('summon', 'summons'), text(' allied Bone Choir at half the Candle-Wisp count.')),
  },
  stealAway: {
    standard: rule(text('Redirect the next 3 days of one explored enemy mine’s production to you. Once per week.')),
    upgraded: rule(text('Redirect the next 5 days of one explored enemy mine’s production to you without identifying you to its owner. Once per week.')),
  },
  theLongSilence: {
    standard: rule(text('Create a '), term('battle-enchantment'), text('. The enemy hero cannot cast spells. At each round start pay 3 mana or end this '), term('battle-enchantment', 'enchantment'), text('.')),
    upgraded: rule(text('Create a '), term('battle-enchantment'), text('. The enemy hero cannot cast spells or use items. At each round start pay 2 mana or end this '), term('battle-enchantment', 'enchantment'), text('.')),
  },
  harvest: {
    standard: rule(text('Every enemy loses 20% of current HP. Distribute the removed HP among allies as healing and '), term('resurrection'), text(' up to their starting counts.')),
    upgraded: rule(text('Every enemy loses 30% of current HP. Distribute the removed HP among allies as healing and '), term('resurrection'), text(' up to their starting counts.')),
  },
  theDebtCalled: {
    standard: rule(text('Set one enemy hero’s remaining movement today to 0 and deny movement tomorrow. Once per week.')),
    upgraded: rule(text('Set one enemy hero’s remaining movement today to 0, deny movement for the next 2 days, and deny mana regeneration during them. Once per week.')),
  },
  beastSense: {
    standard: rule(text('Reveal exact counts for every neutral '), term('guardian'), text(' within 10 tiles. '), term('beast', 'Beast'), text('-only '), term('guardian', 'guardians'), text(' ignore this hero through day end.')),
    upgraded: rule(text('Reveal exact counts for every neutral '), term('guardian'), text(' within 16 tiles. '), term('beast', 'Beast'), text('-only '), term('guardian', 'guardians'), text(' there ignore all your heroes through day end.')),
  },
  illWind: {
    standard: rule(text('This week, each enemy hero’s next battle begins with every company at '), term('chill', 'Chill 2'), text('.')),
    upgraded: rule(text('This week, each enemy hero’s next battle begins with every company at '), term('chill', 'Chill 3'), text(' and ranged ammunition halved.')),
  },
  rootTheSky: {
    standard: rule(text('Every enemy takes 10 + 4 × '), term('spell-power'), text(' '), term('impact-damage'), text('. Flying enemies lose Flying for 3 rounds and are '), term('forced-movement', 'pushed'), text(' 1 position.')),
    upgraded: rule(text('Every enemy takes 10 + 4 × '), term('spell-power'), text(' '), term('impact-damage'), text('. Flying enemies lose Flying for 4 rounds, are '), term('forced-movement', 'pushed'), text(' 1 position, and gain '), term('chill', 'Chill 2'), text('.')),
  },
  beastSovereign: {
    standard: rule(text('Create a '), term('battle-enchantment'), text('. Allied '), term('beast', 'Beasts'), text(' gain +2 Attack, +2 Defense, +2 speed, and '), term('bloom', 'Bloom 1'), text(' each round start.')),
    upgraded: rule(text('Create a '), term('battle-enchantment'), text('. Allied '), term('beast', 'Beasts'), text(' gain +2 Attack, +2 Defense, +2 speed, '), term('bloom', 'Bloom 1'), text(' each round, and unlimited retaliations.')),
  },
  windShear: {
    standard: rule(term('forced-movement', 'Push'), text(' every enemy 2 positions away from one chosen position. A company blocked early loses 6% of current HP.')),
    upgraded: rule(term('forced-movement', 'Push'), text(' every enemy 3 positions away from one chosen position. A company blocked early loses 10% of current HP and gains '), term('chill', 'Chill 1'), text('.')),
  },
  theLongGreen: {
    standard: rule(text('Restore 18 × '), term('spell-power'), text(' HP to every ally with '), term('resurrection'), text(', grant allies '), term('bloom', 'Bloom 5'), text(', and give enemies '), term('chill', 'Chill 3'), text(' and '), term('hex', 'Hex 3'), text('.')),
    upgraded: rule(text('Restore 26 × '), term('spell-power'), text(' HP to every ally with '), term('resurrection'), text(', grant '), term('bloom', 'Bloom 6'), text(', and give enemies '), term('chill', 'Chill 4'), text(' and '), term('hex', 'Hex 4'), text('.')),
  },
  theWeatherItself: {
    standard: rule(text('Create a '), term('battle-enchantment'), text('. Each round deterministically brings Hail, Fog, Squall, Sun, or Frost for both sides.')),
    upgraded: rule(text('Create a '), term('battle-enchantment'), text('. Preview next round’s deterministic weather; Sun affects only allies and Frost only enemies.')),
  },
};
