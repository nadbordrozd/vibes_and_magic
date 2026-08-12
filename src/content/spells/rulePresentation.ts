import type { SpellId } from '../../core/types';
import {
  spellRuleTerm as term,
  spellRuleText as text,
  type SpellRulePresentation,
  type SpellRuleToken,
  type SpellRuleVersions,
} from '../spellLexicon';

const rule = (...tokens: SpellRuleToken[]): SpellRulePresentation => tokens;

export const RITE_CRAFT_SPELL_IDS = [
  'rally', 'blessing', 'standardOfDawn', 'amplify', 'sanctuary', 'oathOfIron',
  'consecrate', 'hymnOfTheHost', 'trial', 'beacon', 'census', 'feastDay', 'clarion',
  'vigilOfTheHost', 'oathbind', 'waysideShrine', 'echo',
  'forgeSpark', 'ward', 'reflect', 'forgefire', 'clockworkEscort', 'wallOfTheMaker',
  'quicksilver', 'unmake', 'ironclad', 'gate', 'saltTheVein', 'falseColors',
  'clockworkCourier', 'brittle', 'standingMirror', 'summonSkiff', 'hourglassCrack',
] as const satisfies readonly SpellId[];

export type RiteCraftSpellId = typeof RITE_CRAFT_SPELL_IDS[number];

/**
 * Canonical structured rules for the first two schools. Grave and Wild can add parallel records
 * and join SPELL_RULE_PRESENTATIONS without changing the catalog or token contract.
 */
export const RITE_CRAFT_SPELL_RULES: Record<RiteCraftSpellId, SpellRuleVersions> = {
  rally: {
    standard: rule(text('One allied company gains 50 '), term('morale'), text('.')),
    upgraded: rule(text('Two different allied companies each gain 50 '), term('morale'), text('.')),
  },
  blessing: {
    standard: rule(text('One allied company’s next attack rolls maximum damage.')),
    upgraded: rule(text('One allied company gains 10 '), term('morale'),
      text(', and its next attack rolls maximum damage.')),
  },
  standardOfDawn: {
    standard: rule(text('Create a '), term('battle-enchantment'),
      text('. Whenever an allied company destroys an enemy company, every surviving allied company gains 10 '),
      term('morale'), text('.')),
    upgraded: rule(text('Create a '), term('battle-enchantment'),
      text('. Whenever an allied company destroys an enemy company, every surviving allied company gains 10 '),
      term('morale'), text('.')),
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
      text(' from one allied company, then heal up to 8% of its maximum HP. '),
      term('spell-power'), text(' can increase the percentage; lost units are not revived.')),
    upgraded: rule(term('cleanse', 'Cleanse'), text(' every '), term('counter'),
      text(' from one allied company, then heal up to 15% of its maximum HP and grant 5 '),
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
    standard: rule(text('Choose an enemy company with more units than your largest surviving company. It loses at least 25% of its current HP; '),
      term('spell-power'), text(' can increase the percentage.')),
    upgraded: rule(text('Choose an enemy company with more units than your largest surviving company. It loses at least 35% of its current HP; '),
      term('spell-power'), text(' can increase the percentage.')),
  },
  beacon: {
    standard: rule(text('Move the casting hero to the entrance of their nearest owned City.')),
    upgraded: rule(text('Move the casting hero to the entrance of any chosen owned City.')),
  },
  census: {
    standard: rule(text('This spell has no gameplay effect. Census expires at the end of today.')),
    upgraded: rule(text('This spell has no gameplay effect. Census expires at the end of tomorrow.')),
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
    standard: rule(text('Repeat the last non-Echo spell cast in this battle, using your '),
      term('spell-power'), text(', its recorded Standard or Upgraded rules, and its recorded X-mana spend.')),
    upgraded: rule(text('Repeat the last non-Echo spell cast in this battle, using your '),
      term('spell-power'), text(' and its recorded X-mana spend, but always use the repeated spell’s Upgraded rules.')),
  },
  forgeSpark: {
    standard: rule(text('Give one enemy '), term('burn', 'Burn 3'),
      text(', increased by '), term('spell-power'), text(' and other '), term('burn', 'Burn'),
      text(' bonuses.')),
    upgraded: rule(text('Give one enemy '), term('burn', 'Burn 4'),
      text(', increased by '), term('spell-power'),
      text(' and other '), term('burn', 'Burn'),
      text(' bonuses, and give every adjacent enemy '), term('burn', 'Burn 1'), text('.')),
  },
  ward: {
    standard: rule(text('Give one allied company a '), term('timed-effect'),
      text(' that makes the next attack against it deal 0 damage, then ends.')),
    upgraded: rule(text('Give one allied company a '), term('timed-effect'),
      text(' that makes the next attack against it deal 0 damage, gives the attacker '),
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
      text(', or '), term('cleanse'), text(' every '), term('counter'),
      text(' from one chosen company. Protected '), term('battle-enchantment', 'enchantments'),
      text(' cannot be removed.')),
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
    standard: rule(text('This spell has no gameplay effect. False Colors expires when an enemy hero comes adjacent.')),
    upgraded: rule(text('Choose a '), term('guardian'),
      text(' band size when casting. This choice has no gameplay effect. False Colors expires when an enemy hero comes adjacent.')),
  },
  clockworkCourier: {
    standard: rule(text('Swap one item slot or one army-company slot between the casting hero and another owned hero.')),
    upgraded: rule(text('Swap one item slot or one army-company slot between the casting hero and another owned hero; army-company slots may instead be swapped with an owned City garrison.')),
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
      text(' a 30-HP immobile Standing Mirror, replacing your previous one. While it survives, each eligible enemy spell is copied once using your '),
      term('spell-power'),
      text(', the enemy cast’s Standard or Upgraded rules, and an automatically chosen opposing target.')),
    upgraded: rule(term('summon', 'Summon'),
      text(' a 30-HP immobile Standing Mirror, replacing your previous one. While it survives, each eligible enemy spell is copied once using your '),
      term('spell-power'),
      text(', the enemy cast’s Standard or Upgraded rules, and an automatically chosen opposing target.')),
  },
  summonSkiff: {
    standard: rule(term('summon', 'Summon'),
      text(' a new boat on the nearest unoccupied water tile beside land.')),
    upgraded: rule(text('Move the nearest unoccupied boat, regardless of owner, to the nearest unoccupied water tile beside land. If no unoccupied boat exists, '),
      term('summon'), text(' a new one there.')),
  },
  hourglassCrack: {
    standard: rule(text('Give one company one '), term('extra-action'),
      text(' and make it skip the next round.')),
    upgraded: rule(text('Give one company one '), term('extra-action'),
      text(' and choose which one of the next three rounds it skips.')),
  },
};

/** Single extension point consumed by catalogs and future semantic rule surfaces. */
export const SPELL_RULE_PRESENTATIONS: Partial<Record<SpellId, SpellRuleVersions>> = {
  ...RITE_CRAFT_SPELL_RULES,
};

export function spellRuleVersions(spellId: RiteCraftSpellId): SpellRuleVersions {
  return RITE_CRAFT_SPELL_RULES[spellId];
}
