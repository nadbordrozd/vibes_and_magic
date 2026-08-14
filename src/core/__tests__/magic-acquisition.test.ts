import { describe, expect, it } from 'vitest';
import { SPELLS } from '../../content/spells';
import { SPELL_MANA_BANDS } from '../../content/v2/schema';
import { BUILDINGS } from '../../content/buildings';
import { FACTIONS } from '../../content/factions';
import { HEROES } from '../../content/heroes';
import { apply, createGame } from '../game';
import { guildSpellCount, visitShrine } from '../game/magic';
import { build } from '../game/economy';
import { dealCurrentMageGuild, dealMageGuild } from '../game/guildDeals';
import { palimpsestForget } from '../game/palimpsest';
import {
  canUseTimeGatedSpell, recordTimeGatedSpellUse, spellUseOwner,
} from '../game/spellUsage';
import { startingSpellbook } from '../game/setup';
import { drawLevelOptions } from '../progression';
import { terrainId } from '../../content/terrain';
import type { FactionId, HeroDefinitionId, SpellSchool } from '../types';

describe('magic acquisition', () => {
  it('gives all 36 heroes one deterministic tier-1 spell from each faction school', () => {
    const definitions = Object.keys(HEROES) as HeroDefinitionId[];
    expect(definitions).toHaveLength(36);
    for (const definitionId of definitions) {
      const first = startingSpellbook(definitionId, 1776);
      expect(startingSpellbook(definitionId, 1776)).toEqual(first);
      expect(new Set(first).size).toBe(first.length);
      const definition = HEROES[definitionId];
      const tierOnes = first.filter((id) => SPELLS[id].tier === 1);
      expect(tierOnes).toHaveLength(2);
      for (const school of FACTIONS[definition.faction].schools) {
        expect(tierOnes.filter((id) => SPELLS[id].school === school)).toHaveLength(1);
      }
    }

    const corwin = startingSpellbook('corwin', 1776);
    expect(corwin).toContain('rally');
    expect(corwin.some((id) => SPELLS[id].tier === 1 && SPELLS[id].school === 'craft')).toBe(true);
    const silas = startingSpellbook('silas', 1776);
    expect(silas).toContain('wither');
    expect(silas.some((id) => SPELLS[id].tier === 1 && SPELLS[id].school === 'craft')).toBe(true);
    const maud = startingSpellbook('maud', 1776);
    expect(maud).toContain('trial');
    expect(maud.filter((id) => SPELLS[id].tier === 1)).toHaveLength(2);
  });

  it('deals deterministic current guilds without leaking provenance or Summon Skiff', () => {
    const first = createGame({ seed: 77, p1: 'human', p2: 'ai' });
    const again = createGame({ seed: 77, p1: 'human', p2: 'ai' });
    expect(first.castles[0].guildDeck).toEqual(again.castles[0].guildDeck);
    for (const castle of first.castles) {
      expect(castle.guildDeck).toHaveLength(14);
      expect(castle.guildDeck.every((id) => SPELLS[id].acquisition?.guild)).toBe(true);
      expect(castle.guildDeck).not.toEqual(expect.arrayContaining([
        'hourglassCrack', 'borrowShape', 'echo', 'loyalUntoDeath', 'summonSkiff',
      ]));
      expect(castle.guildDeck.slice(10, 12).some((id) => SPELLS[id].tier === 4)).toBe(true);
      expect(dealCurrentMageGuild(castle.faction, 77, `${castle.owner}:${castle.id}`)
        .unavailableLevels).not.toContain(5);
    }
  });

  it('applies independent 70/30 tier and 80/20 school rolls with level 4/5 guarantees', () => {
    const schools: SpellSchool[] = ['rite', 'craft', 'grave', 'wild'];
    const candidates = ([1, 2, 3, 4, 5] as const).flatMap((tier) =>
      schools.flatMap((school) => Array.from({ length: 8 }, (_, index) => ({
        id: `${school}-${tier}-${index}`, school, tier,
        acquisition: { guild: true },
      }))));
    let ownTier = 0;
    let tierSamples = 0;
    let native = 0;
    let schoolSamples = 0;
    for (let seed = 0; seed < 500; seed += 1) {
      const deal = dealMageGuild('hearthguard', seed, 'distribution', candidates);
      expect(deal.levels.map((level) => level.length)).toEqual([4, 3, 3, 2, 2]);
      expect(deal.unavailableLevels).toEqual([]);
      for (const level of [4, 5] as const) {
        expect(deal.levels[level - 1].some((id) =>
          candidates.find((candidate) => candidate.id === id)?.tier === level)).toBe(true);
      }
      deal.levels.forEach((stage, levelIndex) => stage.forEach((id, slot) => {
        const candidate = candidates.find((entry) => entry.id === id)!;
        if (levelIndex > 0 && !(levelIndex >= 3 && slot === 0)) {
          tierSamples += 1;
          if (candidate.tier === levelIndex + 1) ownTier += 1;
        }
        schoolSamples += 1;
        if (FACTIONS.hearthguard.schools.includes(candidate.school as 'rite' | 'craft')) native += 1;
      }));
    }
    expect(ownTier / tierSamples).toBeGreaterThan(0.66);
    expect(ownTier / tierSamples).toBeLessThan(0.74);
    expect(native / schoolSamples).toBeGreaterThan(0.77);
    expect(native / schoolSamples).toBeLessThan(0.83);
  });

  it('unlocks 4/3/3/2/2 guild spells through the current tier-5 deal', () => {
    let game = createGame({ seed: 3, p1: 'human', p2: 'ai' });
    game.players.p1.resources = { gold: 100_000, timber: 100, iron: 100, essence: 100 };
    game = apply(game, {
      type: 'BUILD', castleId: 'p1-castle', buildingId: 'mageGuild1',
    });
    expect(guildSpellCount(game.castles[0])).toBe(4);
    expect(game.castles[0].guildDeck.slice(0, 4).every((id) =>
      game.players.p1.hero!.knownSpells.includes(id))).toBe(true);
    game.castles[0].builtOnDay = null;
    game = apply(game, {
      type: 'BUILD', castleId: 'p1-castle', buildingId: 'mageGuild2',
    });
    expect(guildSpellCount(game.castles[0])).toBe(7);
    game.castles[0].builtOnDay = null;
    game = apply(game, {
      type: 'BUILD', castleId: 'p1-castle', buildingId: 'mageGuild3',
    });
    expect(guildSpellCount(game.castles[0])).toBe(10);
    game.castles[0].builtOnDay = null;
    build(game, 'p1-castle', 'townHall');
    game.castles[0].builtOnDay = null;
    build(game, 'p1-castle', 'mageGuild4');
    expect(guildSpellCount(game.castles[0])).toBe(12);
    game.castles[0].builtOnDay = null;
    build(game, 'p1-castle', 'cityHall');
    game.castles[0].builtOnDay = null;
    game.players.p1.hero!.artifacts.equipment.weapon = { id: 'splitReed' };
    game.players.p1.hero!.position = { x: 0, y: 0 };
    build(game, 'p1-castle', 'mageGuild5');
    expect(guildSpellCount(game.castles[0])).toBe(14);
    expect(game.players.p1.hero!.removableBurdens).toContain('splitReed');
    expect(BUILDINGS.mageGuild4).toMatchObject({
      cost: { gold: 4500, iron: 4, essence: 9 }, prerequisite: 'mageGuild3',
      additionalPrerequisites: ['townHall'],
    });
    expect(BUILDINGS.mageGuild5).toMatchObject({
      cost: { gold: 8000, iron: 8, essence: 16 }, prerequisite: 'mageGuild4',
      additionalPrerequisites: ['cityHall'],
    });
  });

  it('migrates all 124 spells into valid tier bands and tier-aware ordinary pools', () => {
    expect(Object.values(SPELLS)).toHaveLength(124);
    for (const spell of Object.values(SPELLS)) {
      expect(spell).toMatchObject({
        tier: expect.any(Number), scaling: expect.any(String), targeting: expect.any(String),
        primitives: expect.any(Array), acquisition: expect.any(Object),
      });
      if (spell.mana !== 'X' && spell.id !== 'graveBargain') {
        const [minimum, maximum] = SPELL_MANA_BANDS[spell.tier!];
        expect(spell.mana).toBeGreaterThanOrEqual(minimum);
        expect(spell.mana).toBeLessThanOrEqual(maximum);
      }
      if (spell.id === 'graveBargain') expect(spell.mana).toBe(0);
      expect(Boolean(spell.acquisition?.ordinaryScroll)).toBe(
        spell.tier! <= 3 && !['adventure', 'topology'].includes(spell.kind)
          && !spell.acquisition?.provenance && spell.id !== 'summonSkiff',
      );
    }
    for (const faction of Object.keys(FACTIONS) as FactionId[]) {
      expect(FACTIONS[faction].schools).toHaveLength(2);
    }
  });

  it('serializes independent hero/player daily and weekly spell-use ledgers', () => {
    const game = createGame({ seed: 1780, p1: 'human', p2: 'human' });
    const hero = game.players.p1.hero!;
    const heroOwner = spellUseOwner(game, hero, false);
    const playerOwner = spellUseOwner(game, hero, true);
    expect(canUseTimeGatedSpell(heroOwner, 'beacon', game.day, game.week)).toBe(true);
    recordTimeGatedSpellUse(heroOwner, 'beacon', game.day, game.week);
    recordTimeGatedSpellUse(playerOwner, 'fickleWeather', game.day, game.week);
    expect(canUseTimeGatedSpell(heroOwner, 'beacon', game.day, game.week)).toBe(false);
    expect(canUseTimeGatedSpell(playerOwner, 'fickleWeather', game.day, game.week)).toBe(false);
    expect(game.players.p1.spellUses.daily.beacon).toBeUndefined();
    const restored = JSON.parse(JSON.stringify(game)) as typeof game;
    expect(restored.players.p1.hero!.spellUses.daily.beacon).toBe(game.day);
    expect(restored.players.p1.spellUses.weekly.fickleWeather).toBe(game.week);
  });

  it('keeps ordinary shrine and shrine-hosted Palimpsest offers at tier 2 or below', () => {
    const game = createGame({ seed: 1781, p1: 'human', p2: 'human' });
    const hero = game.players.p1.hero!;
    const shrine = game.map.objects.find(
      (object) => object.kind === 'shrine' && object.school === 'rite',
    )!;
    if (shrine.kind !== 'shrine') throw new Error('missing shrine');
    expect(SPELLS[shrine.teaches].tier).toBeLessThanOrEqual(2);
    shrine.cleared = true;
    hero.position = { ...shrine.position };
    hero.skills.palimpsest = 3;
    hero.knownSpells = ['trial'];
    palimpsestForget(game, shrine.id, 'trial');
    expect(game.pendingChoice?.kind).toBe('palimpsest');
    if (game.pendingChoice?.kind === 'palimpsest') {
      expect(game.pendingChoice.options.every((id) => SPELLS[id].tier! <= 2)).toBe(true);
    }
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
    expect(shrines.every((shrine) => game.map.objects.some((object) =>
      object.kind === 'guardian' && object.protects === shrine.id
      && object.army.length > 0))).toBe(true);
    expect(game.map.terrain.flat().filter((terrain) =>
      terrainId(terrain) === 'barrowfield').length).toBeGreaterThanOrEqual(4);
  });
});
