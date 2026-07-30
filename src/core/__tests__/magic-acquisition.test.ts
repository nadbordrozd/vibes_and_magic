import { describe, expect, it } from 'vitest';
import { SPELLS } from '../../content/spells';
import { apply, createGame } from '../game';
import { guildSpellCount, visitShrine } from '../game/magic';
import { drawLevelOptions } from '../progression';

describe('magic acquisition', () => {
  it('starts each faction with its primary shrine staple', () => {
    const game = createGame({ seed: 1, p1: 'human', p2: 'ai' });
    expect(game.players.p1.hero!.knownSpells).toContain('rally');
    expect(game.players.p2.hero!.knownSpells).toContain('wither');
  });

  it('deals deterministic 80/20-weighted eight-card guild decks', () => {
    const first = createGame({ seed: 77, p1: 'human', p2: 'ai' });
    const again = createGame({ seed: 77, p1: 'human', p2: 'ai' });
    expect(first.castles[0].guildDeck).toEqual(again.castles[0].guildDeck);
    expect(first.castles[0].guildDeck).toHaveLength(8);
    expect(first.castles[0].guildDeck.filter((id) =>
      ['rite', 'craft'].includes(SPELLS[id].school))).toHaveLength(6);
    expect(first.castles[1].guildDeck.filter((id) =>
      ['craft', 'grave'].includes(SPELLS[id].school))).toHaveLength(6);
  });

  it('unlocks 3/3/2 guild spells and teaches a visiting hero', () => {
    let game = createGame({ seed: 3, p1: 'human', p2: 'ai' });
    game.players.p1.resources = { gold: 10000, timber: 20, iron: 20, essence: 20 };
    game = apply(game, {
      type: 'BUILD', castleId: 'p1-castle', buildingId: 'mageGuild1',
    });
    expect(guildSpellCount(game.castles[0])).toBe(3);
    expect(game.castles[0].guildDeck.slice(0, 3).every((id) =>
      game.players.p1.hero!.knownSpells.includes(id))).toBe(true);
    game.castles[0].builtOnDay = null;
    game = apply(game, {
      type: 'BUILD', castleId: 'p1-castle', buildingId: 'mageGuild2',
    });
    expect(guildSpellCount(game.castles[0])).toBe(6);
    game.castles[0].builtOnDay = null;
    game = apply(game, {
      type: 'BUILD', castleId: 'p1-castle', buildingId: 'mageGuild3',
    });
    expect(guildSpellCount(game.castles[0])).toBe(8);
  });

  it('a shrine teaches its staple and offers one permanent school upgrade', () => {
    const game = createGame({ seed: 4, p1: 'human', p2: 'ai' });
    const shrine = game.map.objects.find((object) => object.id === 'craft-shrine')!;
    if (shrine.kind !== 'shrine') throw new Error('missing shrine');
    shrine.cleared = true;
    visitShrine(game, shrine.id, game.players.p1.hero!);
    expect(game.players.p1.hero!.knownSpells).toContain('forgeSpark');
    expect(game.pendingChoice?.kind).toBe('shrine');
    const option = game.pendingChoice?.kind === 'shrine'
      ? game.pendingChoice.options[0] : 'forgeSpark';
    const next = apply(game, { type: 'CHOOSE_SPELL_UPGRADE', spellId: option });
    expect(next.players.p1.hero!.upgradedSpells).toContain(option);
  });

  it('guild inscription costs four essence', () => {
    let game = createGame({ seed: 5, p1: 'human', p2: 'ai' });
    game.players.p1.resources = { gold: 10000, timber: 20, iron: 20, essence: 20 };
    game = apply(game, {
      type: 'BUILD', castleId: 'p1-castle', buildingId: 'mageGuild1',
    });
    const spellId = game.castles[0].guildDeck[0];
    const before = game.players.p1.resources.essence;
    game = apply(game, { type: 'GUILD_INSCRIBE', castleId: 'p1-castle', spellId });
    expect(game.players.p1.resources.essence).toBe(before - 4);
    expect(game.players.p1.hero!.upgradedSpells).toContain(spellId);
  });

  it('Inscribe enters level-up drafts at level four with weight ten', () => {
    const game = createGame({ seed: 6, p1: 'human', p2: 'ai' });
    const hero = game.players.p1.hero!;
    hero.level = 4;
    const seen = Array.from({ length: 100 }, (_, seed) => drawLevelOptions(hero, seed)[0])
      .some((options) => options.includes('inscribe'));
    expect(seen).toBe(true);
  });

  it('places three guarded shrines and four Grave-resonant barrows', () => {
    const game = createGame({ seed: 7, p1: 'human', p2: 'ai' });
    const shrines = game.map.objects.filter((object) => object.kind === 'shrine');
    expect(shrines).toHaveLength(3);
    expect(shrines.every((shrine) => shrine.guard.army.length > 0)).toBe(true);
    expect(game.map.terrain.flat().filter((terrain) => terrain === 'barrow')).toHaveLength(4);
  });
});
