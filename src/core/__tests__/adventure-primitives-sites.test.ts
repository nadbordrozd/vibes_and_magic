import { describe, expect, it } from 'vitest';
import { SPELLS } from '../../content/spells';
import { V2_ACQUISITION_SITES, ACQUISITION_SITE_ASSET_REQUIREMENTS } from '../../content/acquisitionSites';
import { createBorderMarches, validateMap } from '../../content/maps/borderMarches';
import { createManywhere } from '../../content/maps/manywhere';
import { validateSpellTomeInstance } from '../../content/items';
import { developmentPlaceholderId } from '../../content/v2/assets';
import { registeredEffectPrimitiveHandlers } from '../../content/v2/registries';
import { EFFECT_PRIMITIVE_IDS } from '../../content/v2/schema';
import { apply, createGame, incomeForPlayer, legalActions } from '../game';
import { createBattle } from '../combat/setup';
import {
  applyPrebattleConditions, attachPrebattleCondition, denyEnemyMovement,
  grantTerrainIgnoreDay, restoreRemoteMana, revealGuardianIntel,
  stealMineProduction, teleportHeroInRadius,
} from '../game/adventurePrimitives';
import { seededSpellTome, offerChestChoice } from '../game/chests';
import {
  canCastAdventureSpell, castAdventureSpell, fickleWeatherOffers,
} from '../game/adventureSpells';
import { adventureMovementCost, adventurePath } from '../game/navigation';
import { guardianIntel } from '../selectors';
import { mapObjectName } from '../../ui/inspection';
import { ADVENTURE_OBJECT_INTERACTION_ROUTES } from '../../ui/adventureStructureInteractions';
import type { GameState, Hero, SpellId } from '../types';
import { tile } from '../../content/terrain';

function game(): [GameState, Hero, Hero] {
  const state = createGame({ seed: 9805, p1: 'human', p2: 'human' });
  return [state, state.players.p1.hero!, state.players.p2.hero!];
}

describe('adventure primitive registry and legality', () => {
  it('registers all seven generic adventure primitives at the canonical stage', () => {
    const ids = EFFECT_PRIMITIVE_IDS.filter((id) => [
      'hero-teleport-radius', 'terrain-ignore-day', 'remote-mana', 'production-steal',
      'enemy-movement-denial', 'prebattle-condition', 'guardian-intel',
    ].includes(id));
    expect(ids).toHaveLength(7);
    for (const id of ids) expect(registeredEffectPrimitiveHandlers().get(id)).toMatchObject({
      id, stage: 'adventure-apply', apply: expect.any(Function),
    });
    expect(SPELLS.deathsLedger.primitives).toContain('guardian-intel');
  });

  it('teleports only to explored, in-range, unoccupied legal stopping tiles', () => {
    const [state, hero, enemy] = game();
    hero.position = { x: 12, y: 12 };
    const destination = { x: 12, y: 13 };
    state.players.p1.explored = [];
    expect(teleportHeroInRadius(state, hero.id, destination, 2)).toMatchObject({
      ok: false, reason: { code: 'target-not-explored' },
    });
    state.players.p1.explored.push('12,13', '20,12');
    expect(teleportHeroInRadius(state, hero.id, { x: 20, y: 12 }, 2)).toMatchObject({
      ok: false, reason: { code: 'destination-out-of-range' },
    });
    enemy.position = destination;
    expect(teleportHeroInRadius(state, hero.id, destination, 2)).toMatchObject({
      ok: false, reason: { code: 'destination-occupied' },
    });
    enemy.position = { x: 20, y: 10 };
    expect(teleportHeroInRadius(state, hero.id, destination, 2)).toEqual({
      ok: true, value: destination,
    });
  });

  it('crosses ignored domains at one fixed all-terrain cost but refuses them as endpoints', () => {
    const [state, hero] = game();
    hero.position = { x: 12, y: 12 };
    state.map.objects = [];
    state.castles = [];
    state.map.terrain[12][13] = tile('mountain');
    state.map.terrain[12][14] = tile('mountain');
    state.players.p1.explored.push('13,12', '14,12', '15,12');
    expect(grantTerrainIgnoreDay(state, hero.id, 65, ['mountain', 'water'], true).ok).toBe(true);
    expect(adventureMovementCost(state, hero, { x: 12, y: 12 }, { x: 13, y: 12 })).toBe(65);
    expect(adventureMovementCost(state, hero, { x: 12, y: 12 }, { x: 13, y: 11 })).toBe(65);
    expect(adventureMovementCost(state, hero, { x: 14, y: 12 }, { x: 15, y: 12 })).toBe(65);
    expect(adventurePath(state, { x: 13, y: 12 })).toBeNull();
    expect(adventurePath(state, { x: 15, y: 12 })?.some((position) =>
      position.x === 13 || position.x === 14)).toBe(true);
  });

  it('executes MOVE_HERO across Mountain/Water without a boat and releases an embarked boat', () => {
    let [state, hero, enemy] = game();
    state.map.objects = [];
    state.castles = [];
    hero.position = { x: 12, y: 12 };
    enemy.position = { x: 20, y: 12 };
    hero.movement = 1_000;
    for (let y = 0; y < state.map.height; y += 1) {
      state.map.terrain[y][13] = tile('mountain');
      state.map.terrain[y][14] = tile('water');
    }
    state.map.objects.push({
      id: 'left-behind-boat', kind: 'boat', position: { ...hero.position },
      owner: hero.owner, occupiedBy: hero.id,
    });
    hero.embarkedBoatId = 'left-behind-boat';
    expect(grantTerrainIgnoreDay(state, hero.id, 65, ['mountain', 'water']).ok).toBe(true);
    state = apply(state, { type: 'MOVE_HERO', destination: { x: 15, y: 12 } });
    hero = state.players.p1.hero!;
    expect(hero.position).toEqual({ x: 15, y: 12 });
    expect(hero.movement).toBe(805);
    expect(hero.embarkedBoatId).toBeNull();
    expect(state.map.objects.find((object) => object.id === 'left-behind-boat')).toMatchObject({
      kind: 'boat', position: { x: 12, y: 12 }, occupiedBy: null,
    });
  });

  it('teleports an embarked hero without moving their boat and rejects ignored-domain endpoints', () => {
    const [state, hero] = game();
    hero.position = { x: 12, y: 12 };
    state.map.objects = [];
    state.castles = [];
    const boat = {
      id: 'teleport-boat', kind: 'boat' as const, position: { ...hero.position },
      occupiedBy: hero.id, owner: hero.owner,
    };
    state.map.objects.push(boat);
    hero.embarkedBoatId = boat.id;
    state.players.p1.explored.push('15,12', '16,12');
    state.map.terrain[12][15] = tile('meadow');
    state.map.terrain[12][16] = tile('water');
    expect(teleportHeroInRadius(state, hero.id, { x: 16, y: 12 }, 5)).toMatchObject({
      ok: false, reason: { code: 'destination-illegal' },
    });
    expect(teleportHeroInRadius(state, hero.id, { x: 15, y: 12 }, 5)).toMatchObject({ ok: true });
    expect(hero.embarkedBoatId).toBeNull();
    expect(boat).toMatchObject({ position: { x: 12, y: 12 }, occupiedBy: null });
  });

  it('rejects Mountain and Water teleport endpoints even when a road makes them traversable', () => {
    const [state, hero] = game();
    hero.position = { x: 12, y: 12 };
    state.map.objects = [];
    state.castles = [];
    const mountain = { x: 13, y: 12 };
    const water = { x: 14, y: 12 };
    state.map.terrain[mountain.y][mountain.x] = tile('mountain');
    state.map.terrain[water.y][water.x] = tile('water');
    state.map.roads = [mountain, water];
    state.players.p1.explored.push('13,12', '14,12');
    expect(teleportHeroInRadius(state, hero.id, mountain, 3)).toMatchObject({
      ok: false, reason: { code: 'destination-illegal' },
    });
    expect(teleportHeroInRadius(state, hero.id, water, 3)).toMatchObject({
      ok: false, reason: { code: 'destination-illegal' },
    });
  });

  it('rejects malformed registry payloads with stable reasons before mutation', () => {
    const [state, hero, enemy] = game();
    const cases: Array<[typeof EFFECT_PRIMITIVE_IDS[number], unknown, string]> = [
      ['hero-teleport-radius', { destination: { x: Number.NaN, y: 2 }, radius: 3 }, 'destination-illegal'],
      ['terrain-ignore-day', { movementCost: 65, domains: ['lava'] }, 'invalid-value'],
      ['remote-mana', { targetHeroId: hero.id, amount: 4, movement: false }, 'invalid-value'],
      ['production-steal', { mineId: 'west-gold', days: 2, hidden: 'yes' }, 'invalid-value'],
      ['enemy-movement-denial', {
        targetHeroId: enemy.id, days: 2, denyManaRegeneration: 1,
      }, 'invalid-value'],
      ['prebattle-condition', {
        target: { heroId: enemy.id, playerId: 'p2' },
        condition: { expiresWeek: 1, remainingBattles: 1, counters: { chill: 1 } },
      }, 'invalid-value'],
      ['prebattle-condition', {
        target: { heroId: enemy.id },
        condition: { expiresWeek: 1, remainingBattles: 1, counters: { fear: 1 } },
      }, 'invalid-value'],
      ['guardian-intel', { radius: 5, throughDay: 1.5 }, 'invalid-value'],
    ];
    const before = structuredClone(state);
    for (const [id, payload, reason] of cases) {
      const result = registeredEffectPrimitiveHandlers().get(id)!
        .apply({ state, casterId: hero.id }, payload) as { ok: boolean; reason?: { code: string } };
      expect(result).toMatchObject({ ok: false, reason: { code: reason } });
    }
    expect(state).toEqual(before);
  });

  it('rejects fractional remote-mana amounts and movement grants without mutation', () => {
    const [state, hero] = game();
    hero.mana = 1;
    hero.movement = 77;
    const handler = registeredEffectPrimitiveHandlers().get('remote-mana')!;
    const before = structuredClone(state);
    for (const payload of [
      { targetHeroId: hero.id, amount: 4.5, movement: 0 },
      { targetHeroId: hero.id, amount: 4, movement: 12.5 },
      { targetHeroId: hero.id, amount: 0, movement: 0 },
      { targetHeroId: hero.id, amount: 4, movement: -1 },
    ]) {
      expect(handler.apply({ state, casterId: hero.id }, payload)).toMatchObject({
        ok: false, reason: { code: 'invalid-value' },
      });
      expect(state).toEqual(before);
    }
    expect(state.replay).toEqual(before.replay);
  });

  it('enforces owned/enemy targets and serializes remote mana, denial, and prebattle effects', () => {
    const [state, hero, enemy] = game();
    hero.mana = 0; enemy.mana = 0;
    expect(restoreRemoteMana(state, hero.id, enemy.id, 5)).toMatchObject({
      ok: false, reason: { code: 'target-not-owned' },
    });
    expect(restoreRemoteMana(state, hero.id, hero.id, 5, 40)).toMatchObject({ ok: true });
    expect(hero.mana).toBe(5);
    expect(denyEnemyMovement(state, hero.id, hero.id, 2)).toMatchObject({
      ok: false, reason: { code: 'target-not-enemy' },
    });
    enemy.movement = 900;
    expect(denyEnemyMovement(state, hero.id, enemy.id, 2, true))
      .toEqual({ ok: true, value: state.day + 2 });
    expect(enemy).toMatchObject({ movement: 0, adventureEffects: {
      movementDeniedThroughDay: state.day + 2, manaRegenDeniedThroughDay: state.day + 2,
    } });
    const attached = attachPrebattleCondition(state, hero.id, { heroId: enemy.id }, {
      expiresWeek: state.week, remainingBattles: 1, counters: { chill: 2 },
      rangedShotsMultiplier: 0.5,
    });
    expect(attached.ok).toBe(true);
    expect(JSON.parse(JSON.stringify(enemy)).adventureEffects.prebattleConditions).toHaveLength(1);
    const [battle] = createBattle(hero.army, enemy.army, hero, enemy, {
      kind: 'hero', targetId: enemy.id, destination: enemy.position,
      attackerHeroId: hero.id, defenderHeroId: enemy.id, defenderPlayerId: 'p2',
      battlefield: 'land',
    }, state.rng);
    applyPrebattleConditions(state, battle, enemy, 'defender');
    expect(battle.stacks.filter((stack) => stack.side === 'defender')
      .every((stack) => stack.counters.chill === 2)).toBe(true);
    expect(enemy.adventureEffects.prebattleConditions).toEqual([]);
  });

  it('redirects only explored enemy mine production and reveals exact guardian counts/abilities', () => {
    const [state, hero] = game();
    const mine = state.map.objects.find((object) => object.kind === 'mine')!;
    if (mine.kind !== 'mine') throw new Error('fixture mine');
    mine.owner = 'p2';
    state.players.p1.explored = [];
    expect(stealMineProduction(state, hero.id, mine.id, 2)).toMatchObject({
      ok: false, reason: { code: 'mine-not-enemy' },
    });
    state.players.p1.explored.push(`${mine.position.x},${mine.position.y}`);
    const beforeP1 = incomeForPlayer(state, 'p1')[mine.resource];
    const beforeP2 = incomeForPlayer(state, 'p2')[mine.resource];
    expect(stealMineProduction(state, hero.id, mine.id, 2, true)).toEqual({ ok: true, value: mine.id });
    expect(mine.productionRedirect).toMatchObject({
      startsDay: state.day + 1, throughDay: state.day + 2,
    });
    expect(incomeForPlayer(state, 'p1')[mine.resource]).toBe(beforeP1);
    expect(incomeForPlayer(state, 'p2')[mine.resource]).toBe(beforeP2);
    state.day += 1;
    expect(incomeForPlayer(state, 'p1')[mine.resource]).toBeGreaterThan(beforeP1);
    expect(incomeForPlayer(state, 'p2')[mine.resource]).toBeLessThan(beforeP2);

    const guardian = state.map.objects.find((object) => object.kind === 'guardian')!;
    if (guardian.kind !== 'guardian') throw new Error('fixture guardian');
    hero.position = { ...guardian.position, x: guardian.position.x + 3 };
    expect(guardianIntel(state, guardian)?.exact).toBe(false);
    expect(revealGuardianIntel(state, hero.id, 3)).toMatchObject({ ok: true });
    expect(guardianIntel(state, guardian)).toMatchObject({ exact: true, count: expect.any(Number) });
    expect(guardianIntel(state, guardian)!.abilities).toEqual(expect.any(Array));
  });
});

describe('Spell Tomes, acquisition sites, and replay authority', () => {
  it('debits real casting gates at hero-daily and player-weekly scope', () => {
    const [state, hero] = game();
    hero.knownSpells = ['beacon', 'fickleWeather']; hero.mana = 100; hero.movement = 10_000;
    const second = structuredClone(hero);
    second.id = 'p1-time-gate-second'; second.name = 'Second Caster';
    second.spellUses = { daily: {}, weekly: {} };
    state.players.p1.heroes.push(second);
    castAdventureSpell(state, { type: 'CAST_ADVENTURE_SPELL', spellId: 'beacon' });
    expect(hero.spellUses.daily.beacon).toBe(state.day);
    expect(canCastAdventureSpell(state, 'beacon')).toBe(false);
    state.players.p1.activeHeroId = second.id; state.players.p1.hero = second;
    expect(canCastAdventureSpell(state, 'beacon')).toBe(true);
    castAdventureSpell(state, {
      type: 'CAST_ADVENTURE_SPELL', spellId: 'fickleWeather',
      omen: fickleWeatherOffers(state, false)[0],
    });
    expect(state.players.p1.spellUses.weekly.fickleWeather).toBe(state.week);
    state.players.p1.activeHeroId = hero.id; state.players.p1.hero = hero;
    expect(canCastAdventureSpell(state, 'fickleWeather')).toBe(false);
    expect(JSON.parse(JSON.stringify(state)).players.p1.spellUses.weekly.fickleWeather)
      .toBe(state.week);
  });

  it("routes Upgraded Death's Ledger through the reducer and preserves costs on failed targeting", () => {
    let [state, hero] = game();
    hero.knownSpells = ['deathsLedger'];
    hero.upgradedSpells = ['deathsLedger'];
    hero.mana = 100; hero.movement = 1_000;
    const action = { type: 'CAST_ADVENTURE_SPELL', spellId: 'deathsLedger' } as const;
    state = apply(state, action);
    expect(state.replay.at(-1)).toEqual(action);
    expect(Object.keys(state.players.p1.adventureEffects.guardianIntel ?? {}).length)
      .toBeGreaterThan(0);

    const failed = createGame({ seed: 9806, p1: 'human', p2: 'human' });
    const failedHero = failed.players.p1.hero!;
    failedHero.knownSpells = ['fickleWeather'];
    failedHero.mana = 100; failedHero.movement = 1_000;
    const before = structuredClone(failed);
    expect(() => apply(failed, {
      type: 'CAST_ADVENTURE_SPELL', spellId: 'fickleWeather', omen: failed.omen,
    })).toThrow(/Choose a dealt omen/);
    expect(failedHero.mana).toBe(before.players.p1.hero!.mana);
    expect(failedHero.movement).toBe(before.players.p1.hero!.movement);
    expect(failed.players.p1.spellUses).toEqual(before.players.p1.spellUses);
    expect(failed.replay).toEqual(before.replay);
  });

  it('keeps Tome selection stable without consuming gameplay RNG and enforces source caps', () => {
    expect(seededSpellTome(7, 'same', 'lock')).toEqual(seededSpellTome(7, 'same', 'lock'));
    for (const source of ['chest', 'reliquary-cairn'] as const) {
      expect(SPELLS[seededSpellTome(7, source, source).storedSpellId].tier).toBeLessThanOrEqual(3);
    }
    expect(SPELLS[seededSpellTome(7, 'pages', 'reliquary-pages').storedSpellId].tier).toBe(4);
    expect((SPELLS[seededSpellTome(7, 'barrow', 'barrow').storedSpellId].tier ?? 1))
      .toBeLessThanOrEqual(5);
    expect(() => validateSpellTomeInstance({
      id: 'spellTome', storedSpellId: 'beacon', tomeSource: 'chest',
    })).toThrow(/tiers 1–3/);
    expect(() => validateSpellTomeInstance({
      id: 'spellTome', storedSpellId: 'rally', tomeSource: 'reliquary-pages',
    })).toThrow(/exactly tier 4/);
    const invalidMap = createBorderMarches(7);
    invalidMap.objects.push({
      id: 'invalid-high-chest-tome', kind: 'item', position: { x: 5, y: 5 },
      item: { id: 'spellTome', storedSpellId: 'beacon', tomeSource: 'chest' }, collected: false,
    });
    expect(() => validateMap(invalidMap)).toThrow(/tiers 1–3/);
    const [state, hero] = game();
    const objectId = Array.from({ length: 1000 }, (_, index) => `tome-chest-${index}`)
      .find((id) => {
        const copy = structuredClone(state); offerChestChoice(copy, id, hero);
        return copy.pendingChoice?.kind === 'chest' && copy.pendingChoice.item.id === 'spellTome';
      })!;
    const before = state.rng;
    offerChestChoice(state, objectId, hero);
    expect(state.rng).toBe(before);
  });

  it('consumes the Cairn Tome globally while leaving artifact exchange reusable', () => {
    let state = createGame({ seed: 9810, mapId: 'manywhere', p1: 'human', p2: 'human' });
    const cairn = state.map.objects.find((object) => object.kind === 'reliquaryCairn')!;
    const first = state.players.p1.hero!;
    first.position = { ...cairn.position };
    state = apply(state, {
      type: 'USE_RELIQUARY_CAIRN', objectId: cairn.id, backpackIndex: -2,
    });
    expect(state.map.objects.find((object) => object.id === cairn.id))
      .toMatchObject({ tomeClaimed: true });
    const second = structuredClone(state.players.p1.hero!);
    second.id = 'second-cairn-visitor'; second.name = 'Second Cairn Visitor';
    second.position = { ...cairn.position }; second.knownSpells = [];
    second.artifacts.backpack = [{ id: 'travelersCloak' }];
    state.players.p1.heroes.push(second);
    state.players.p1.activeHeroId = second.id; state.players.p1.hero = second;
    expect(() => apply(state, {
      type: 'USE_RELIQUARY_CAIRN', objectId: cairn.id, backpackIndex: -2,
    })).toThrow(/already been claimed/);
    const exchanged = apply(state, {
      type: 'USE_RELIQUARY_CAIRN', objectId: cairn.id, backpackIndex: 0,
    });
    expect(exchanged.players.p1.hero!.artifacts.backpack[0].id).not.toBe('travelersCloak');
    expect(exchanged.map.objects.find((object) => object.id === cairn.id))
      .toMatchObject({ tomeClaimed: true });
  });

  it('routes all sites through explicit actions with seeded offers and authored map presence', () => {
    for (const createMap of [createManywhere, createBorderMarches]) {
      const map = createMap(19); validateMap(map);
      expect(map.objects.filter((object) => Object.hasOwn(V2_ACQUISITION_SITES, object.kind)))
        .toHaveLength(3);
      expect(map.objects.some((object) => object.kind === 'reliquaryOfPages'
        && map.objects.some((guard) => guard.kind === 'guardian' && guard.protects === object.id)))
        .toBe(true);
    }
    let state = createGame({ seed: 19, mapId: 'manywhere', p1: 'human', p2: 'human' });
    const stacks = state.map.objects.find((object) => object.kind === 'stacks')!;
    const hero = state.players.p1.hero!;
    hero.position = { ...stacks.position }; hero.knownSpells = [];
    state.players.p1.resources.essence = 3;
    state.castles.find((castle) => castle.owner === 'p1')!.buildings.push('mageGuild3');
    state = apply(state, { type: 'USE_ACQUISITION_SITE', objectId: stacks.id });
    expect(state.pendingChoice).toMatchObject({ kind: 'acquisitionSite', options: expect.any(Array) });
    expect(legalActions(state).every((action) => action.type === 'CHOOSE_ACQUISITION_SPELL')).toBe(true);
    const option = state.pendingChoice?.kind === 'acquisitionSite'
      ? state.pendingChoice.options[0] : 'rally' as SpellId;
    state = apply(state, { type: 'CHOOSE_ACQUISITION_SPELL', spellId: option });
    expect(state.players.p1.hero!.knownSpells).toContain(option);
    expect(state.replay.slice(-2).map((action) => action.type)).toEqual([
      'USE_ACQUISITION_SITE', 'CHOOSE_ACQUISITION_SPELL',
    ]);
    expect(JSON.parse(JSON.stringify(state)).map.objects.find(
      (object: { id: string }) => object.id === stacks.id,
    ).visitedBy).toContain(hero.id);
  });

  it('keeps Wild Shrine and guarded Pages outcomes setup-seeded without RNG drift', () => {
    const visitWild = () => {
      let state = createGame({ seed: 1901, mapId: 'manywhere', p1: 'human', p2: 'human' });
      const shrine = state.map.objects.find((object) => object.kind === 'wildShrine')!;
      const hero = state.players.p1.hero!;
      hero.position = { ...shrine.position }; hero.knownSpells = [];
      const rng = state.rng;
      state = apply(state, { type: 'USE_ACQUISITION_SITE', objectId: shrine.id });
      expect(state.rng).toBe(rng);
      expect(state.map.objects.find((object) => object.id === shrine.id))
        .toMatchObject({ visitedBy: [hero.id] });
      return state.players.p1.hero!.knownSpells;
    };
    expect(visitWild()).toEqual(visitWild());

    let state = createGame({ seed: 1902, mapId: 'manywhere', p1: 'human', p2: 'human' });
    const pages = state.map.objects.find((object) => object.kind === 'reliquaryOfPages')!;
    const hero = state.players.p1.hero!;
    hero.position = { ...pages.position }; hero.knownSpells = [];
    expect(() => apply(state, { type: 'USE_ACQUISITION_SITE', objectId: pages.id }))
      .toThrow(/Defeat the guardian/);
    state.map.objects = state.map.objects.filter((object) =>
      !(object.kind === 'guardian' && object.protects === pages.id));
    const rng = state.rng;
    state = apply(state, { type: 'USE_ACQUISITION_SITE', objectId: pages.id });
    expect(state.rng).toBe(rng);
    expect(state.players.p1.hero!.knownSpells).toContain(pages.tomeSpellId);
    expect(SPELLS[pages.tomeSpellId].tier).toBe(4);
    expect(state.map.objects.find((object) => object.id === pages.id)).toMatchObject({ claimed: true });
  });

  it('keeps outcomes hidden until action, exposes inspection/routing, and uses typed placeholders', () => {
    const map = createManywhere(21);
    for (const object of map.objects.filter((candidate) =>
      Object.hasOwn(V2_ACQUISITION_SITES, candidate.kind))) {
      expect(mapObjectName(object)).toMatch(/Stacks|Shrine|Reliquary/);
      expect(ADVENTURE_OBJECT_INTERACTION_ROUTES[object.kind]).toBe('contextual-dialog');
    }
    expect(map.objects.find((object) => object.kind === 'wildShrine')).not.toHaveProperty('spellId');
    for (const requirement of ACQUISITION_SITE_ASSET_REQUIREMENTS) {
      expect(developmentPlaceholderId(requirement.semantics))
        .toBe(`content-placeholder:site:${requirement.semantics.family === 'site'
          ? requirement.semantics.siteKind : ''}`);
    }
  });
});
