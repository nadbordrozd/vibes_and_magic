import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SPELLS, SPELL_IDS } from '../../content/spells';
import {
  SPELL_SCHOOL_NAMES, SPELL_SCHOOL_ORDER,
} from '../../content/spellPresentation';
import { makeArmy } from '../../core/army';
import { createBattle } from '../../core/combat/battle';
import { createGame } from '../../core/game';
import type { BattleState } from '../../core/types';
import {
  adventureSpellbookEntries, AdventureSpellbook,
} from '../components/AdventureSpellbook';
import {
  Spellbook, orderedSpellbookEntries, type SpellbookEntry,
} from '../components/Spellbook';
import {
  combatSpellbookEntries, SpellbookPanel,
} from '../components/SpellbookPanel';

function gameWithEverySpell() {
  const state = createGame({ seed: 1504, mapId: 'grand-muster', p1: 'human', p2: 'dormant' });
  const hero = state.players.p1.hero!;
  hero.knownSpells = [...SPELL_IDS];
  hero.mana = 200;
  hero.movement = 2_000;
  return state;
}

function battleWithEverySpell(): BattleState {
  const game = createGame({ seed: 1505, p1: 'human', p2: 'human' });
  const [battle] = createBattle(
    makeArmy([{ unitId: 'yeoman', count: 20 }, { unitId: 'longbowman', count: 12 }]),
    makeArmy([{ unitId: 'tinSoldier', count: 20 }, { unitId: 'hobbyKnight', count: 12 }]),
    game.players.p1.hero!, game.players.p2.hero!, {
      kind: 'hero', targetId: game.players.p2.hero!.id, destination: { x: 5, y: 5 },
      attackerHeroId: game.players.p1.hero!.id, defenderHeroId: game.players.p2.hero!.id,
      defenderPlayerId: 'p2',
    }, 1505,
  );
  battle.currentStackId = 'attacker-0';
  battle.attackerHero.knownSpells = [...SPELL_IDS];
  battle.attackerHero.upgradedSpells = ['rally'];
  battle.attackerHero.mana = 200;
  battle.resonance = 'rite';
  battle.terrainResonances = ['craft'];
  return battle;
}

function genericEntries(): SpellbookEntry[] {
  return SPELL_IDS.map((id) => ({
    id, manaCost: SPELLS[id].mana === 'X' ? 'X mana · all remaining' : `${SPELLS[id].mana} mana`,
    targetSummary: 'A legal target',
    upgrade: { active: 'standard', learned: false },
  }));
}

describe('shared stitched spellbook contract', () => {
  it('audits all 68 catalog entries, icons, and concrete Standard/Upgraded copy', () => {
    expect(SPELL_IDS).toHaveLength(68);
    const iconFiles = SPELL_IDS.map((id) =>
      `public/assets/icons/spells/${id}.png`);
    expect(new Set(iconFiles).size).toBe(68);
    for (const id of SPELL_IDS) {
      const spell = SPELLS[id];
      expect(spell.name.trim(), id).not.toBe('');
      expect(spell.base.trim(), `${id} Standard`).not.toBe('');
      expect(spell.plus.trim(), `${id} Upgraded`).not.toBe('');
      if (['standardOfDawn', 'unmake', 'standingMirror', 'shedSkin', 'hedgerowMarch'].includes(id)) {
        expect(spell.plus, `${id} resolver-identical versions`).toBe(spell.base);
      } else {
        expect(spell.plus, `${id} mechanical delta`).not.toBe(spell.base);
      }
      expect(spell.plus, `${id} obsolete wording`).not.toMatch(/(?:\+|base|plus|current) face/i);
      expect(readFileSync(iconFiles[SPELL_IDS.indexOf(id)]).byteLength, `${id} icon`).toBeGreaterThan(0);
    }
  });

  it('pins canonical school grouping, counts, and catalog order', () => {
    expect(SPELL_SCHOOL_ORDER).toEqual(['rite', 'craft', 'grave', 'wild']);
    const ordered = orderedSpellbookEntries([...genericEntries()].reverse());
    expect(ordered.map((entry) => entry.id)).toEqual(SPELL_IDS);
    for (const school of SPELL_SCHOOL_ORDER) {
      const expected = SPELL_IDS.filter((id) => SPELLS[id].school === school);
      expect(expected, SPELL_SCHOOL_NAMES[school]).toHaveLength(17);
      expect(ordered.filter((entry) => SPELLS[entry.id].school === school)
        .map((entry) => entry.id)).toEqual(expected);
    }
  });

  it('renders accessible tabs and a name-plus-mana large-icon grid before any Cast control', () => {
    const entries = genericEntries();
    const html = renderToStaticMarkup(<Spellbook context="Map magic" title="Spellbook test"
      heroName="Aldith" mana={30} maxMana={40} movement={900}
      debts={[]} entries={entries} onClose={() => undefined} onCast={() => {
        throw new Error('Static selection must never cast');
      }} />);
    expect(html).toContain('role="tablist"');
    expect(html.match(/role="tab"/g)).toHaveLength(4);
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('role="tabpanel"');
    for (const id of SPELL_IDS.filter((spellId) => SPELLS[spellId].school === 'rite')) {
      expect(html, id).toContain(`data-spell-id="${id}"`);
      expect(html, id).toContain(SPELLS[id].name.replaceAll("'", '&#x27;'));
      expect(html, id).toContain(SPELLS[id].mana === 'X' ? 'all remaining' : `${SPELLS[id].mana} mana`);
    }
    expect(html).toContain('width="64"');
    expect(html).not.toContain('data-cast-spell-id=');
    expect(html).toContain('Selection never casts.');
  });

  it('keeps all learned spells in both adapters with exact disabled reasons', () => {
    const state = gameWithEverySpell();
    const adventure = adventureSpellbookEntries(state);
    expect(adventure).toHaveLength(68);
    expect(adventure.find((entry) => entry.id === 'rally')?.disabledReason)
      .toBe('Combat-only spell. Cast it during a battle.');
    expect(adventure.find((entry) => entry.id === 'beacon')?.movementCost).toBe('300 movement');

    const battle = battleWithEverySpell();
    const combat = combatSpellbookEntries(battle, 'attacker');
    expect(combat).toHaveLength(68);
    expect(combat.find((entry) => entry.id === 'beacon')?.disabledReason)
      .toBe('Adventure-only spell. Cast it from the adventure map.');
    expect(combat.find((entry) => entry.id === 'rally')?.upgrade)
      .toEqual({ active: 'upgraded', learned: true });
    expect(combat.find((entry) => entry.id === 'forgeSpark')?.upgrade)
      .toEqual({ active: 'upgraded', learned: false, reason: 'Craft resonance' });
    expect(combat.find((entry) => entry.id === 'wither')?.upgrade.active).toBe('standard');
    expect(combat.every((entry) => entry.currentValues === undefined)).toBe(true);
    expect(combat.every((entry) => entry.legalConsequences === undefined)).toBe(true);
    expect(adventure.every((entry) => entry.legalConsequences === undefined)).toBe(true);
  });

  it('renders both adapters through the shared component without mutating or casting', () => {
    const state = gameWithEverySpell();
    const before = JSON.stringify(state);
    const adventure = renderToStaticMarkup(<AdventureSpellbook state={state}
      onClose={() => undefined} onCast={() => { throw new Error('must select first'); }} />);
    expect(adventure).toContain('stitched-spellbook');
    expect(adventure).toContain('17 learned');
    expect(JSON.stringify(state)).toBe(before);

    const battle = battleWithEverySpell();
    const battleBefore = JSON.stringify(battle);
    const combat = renderToStaticMarkup(<SpellbookPanel battle={battle} side="attacker"
      maxMana={200} onClose={() => undefined}
      onSelect={() => { throw new Error('must select first'); }} />);
    expect(combat).toContain('Battle spellbook');
    expect(combat).toContain('data-upgrade-state="learned"');
    expect(combat).toContain('data-upgrade-state="temporary"');
    expect(JSON.stringify(battle)).toBe(battleBefore);
  });

  it('pins keyboard and responsive wide/narrow static contracts', () => {
    const component = readFileSync(new URL('../components/Spellbook.tsx', import.meta.url), 'utf8');
    const css = readFileSync(new URL('../styles/combat.css', import.meta.url), 'utf8');
    for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) expect(component).toContain(key);
    expect(component).toContain('role="tab"');
    expect(component).toContain('aria-controls=');
    expect(component).toContain('aria-pressed=');
    expect(component).toContain('data-cast-spell-id=');
    expect(css).toContain('grid-template-columns: 1fr 1fr');
    expect(css).toContain('@media (max-width: 760px)');
    expect(css).toContain("data-detail-open='true'");
    expect(css).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
  });

  it('contains no obsolete spell-version wording in player-facing sources', () => {
    const sources = [
      '../../content/spells/index.ts', '../../content/spells/expansion.ts', '../../content/heroes/index.ts',
      '../../content/skills.ts', '../../content/artifacts.ts', '../inspection.ts', '../combatTargeting.ts',
      '../components/Spellbook.tsx', '../components/CombatScreen.tsx',
      '../components/SpellbookPanel.tsx', '../components/AdventureSpellbook.tsx',
      '../components/AdventureSpellTargetDialog.tsx', '../components/ContextHelp.tsx',
      '../components/CastleScreen.tsx', '../components/Dialogs.tsx',
    ].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');
    for (const prefix of ['base', '\\+', 'current', 'compare', 'normal', 'plus']) {
      expect(sources).not.toMatch(new RegExp(`${prefix}\\s+faces?`, 'i'));
    }
    const spellbookSources = [
      '../components/Spellbook.tsx', '../components/SpellbookPanel.tsx',
      '../components/AdventureSpellbook.tsx',
    ].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');
    expect(spellbookSources).not.toMatch(/eligible target.*available|legal cast paths?/i);
    expect(spellbookSources).not.toMatch(/Spell Power \$\{|rules below|After Cast|currently|grants no additional effect/i);
  });
});
