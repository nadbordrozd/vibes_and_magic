import { describe, expect, it } from 'vitest';
import { ARTIFACTS } from '../../content/artifacts';
import { SPELLS } from '../../content/spells';
import { SKILLS } from '../../content/skills';
import { UNITS } from '../../content/units';
import { makeArmy } from '../army';
import { applyBattleAction, createBattle } from '../combat/battle';
import { p2WeatherForecastForSide } from '../combat/p2SpellEffects';
import { totalStackHp } from '../combat/magicEffects';
import { apply as applyGame, createGame } from '../game';
import { dealCurrentMageGuild } from '../game/guildDeals';
import type {
  Action, BattleSide, BattleStack, BattleState, CounterId, Coord, EquipmentSlotId, GameState,
  SecondarySkillId, SkillRank, SpellId,
} from '../types';

type CastAction = Extract<Action, { type: 'BATTLE_CAST' }>;
type AdventureCast = Extract<Action, { type: 'CAST_ADVENTURE_SPELL' }>;

type BattleOp =
  | { op: 'stack'; id: string; count?: number; topHp?: number; shots?: number; morale?: number;
      position?: Coord; counters?: Partial<Record<CounterId, number>> }
  | { op: 'upgrade'; side: BattleSide; spellId: SpellId }
  | { op: 'equip'; side: BattleSide; slot: EquipmentSlotId; artifactId: keyof typeof ARTIFACTS }
  | { op: 'skill'; side: BattleSide; skillId: SecondarySkillId; rank: SkillRank }
  | { op: 'cast'; side: BattleSide; action: CastAction }
  | { op: 'advance-round' }
  | { op: 'attack'; attackerId: string; targetId: string };

type AdventureOp =
  | { op: 'support-hero'; id: string }
  | { op: 'skill'; player: 'p1' | 'p2'; skillId: SecondarySkillId; rank: SkillRank }
  | { op: 'explore'; player: 'p1' | 'p2'; position: Coord }
  | { op: 'mine'; id: string; owner: 'p1' | 'p2'; exploredBy: 'p1' | 'p2' }
  | { op: 'cast'; action: AdventureCast };

interface BattleCombo {
  kind: 'battle'; id: string; name: string; executedPieces: readonly string[];
  optionalPieces?: readonly string[];
  seed?: number; script: readonly BattleOp[];
}
interface AdventureCombo {
  kind: 'adventure'; id: string; name: string; executedPieces: readonly string[];
  optionalPieces?: readonly string[];
  script: readonly AdventureOp[];
}
type Combo = BattleCombo | AdventureCombo;

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value as Record<string, unknown>)
    .sort().map((key) => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`)
    .join(',')}}`;
  return JSON.stringify(value);
}

function battleFixture(seed = 6200, operations: readonly BattleOp[] = []): BattleState {
  const game = createGame({ seed, p1: 'human', p2: 'human' });
  for (const hero of [game.players.p1.hero!, game.players.p2.hero!]) {
    hero.spellPower = 6; hero.mana = 999;
    hero.knownSpells = Object.keys(SPELLS) as SpellId[];
  }
  for (const operation of operations) {
    if (operation.op === 'upgrade') {
      const hero = operation.side === 'attacker' ? game.players.p1.hero! : game.players.p2.hero!;
      if (!hero.upgradedSpells.includes(operation.spellId)) hero.upgradedSpells.push(operation.spellId);
    } else if (operation.op === 'equip') {
      const hero = operation.side === 'attacker' ? game.players.p1.hero! : game.players.p2.hero!;
      hero.artifacts.equipment[operation.slot] = { id: operation.artifactId };
    } else if (operation.op === 'skill') {
      const hero = operation.side === 'attacker' ? game.players.p1.hero! : game.players.p2.hero!;
      hero.skills[operation.skillId] = operation.rank;
    }
  }
  const [battle] = createBattle(
    makeArmy([
      { unitId: 'lanceKnight', count: 24 }, { unitId: 'longbowman', count: 30 },
      { unitId: 'woodenColossus', count: 8 }, { unitId: 'ashmaneWolves', count: 20 },
    ]),
    makeArmy([
      { unitId: 'tinSoldier', count: 35 }, { unitId: 'hobbyKnight', count: 18 },
      { unitId: 'boneChoir', count: 15 }, { unitId: 'stuffedSentinel', count: 8 },
    ]),
    game.players.p1.hero!, game.players.p2.hero!, {
      kind: 'hero', targetId: game.players.p2.hero!.id, destination: { x: 5, y: 5 },
      attackerHeroId: game.players.p1.hero!.id,
      defenderHeroId: game.players.p2.hero!.id, defenderPlayerId: 'p2',
    }, seed,
  );
  battle.obstacles = [];
  for (const hero of [battle.attackerHero, battle.defenderHero!]) {
    hero.spellPower = 6; hero.mana = 999; hero.manaMaximum = 999;
    hero.knownSpells = Object.keys(SPELLS) as SpellId[];
  }
  return battle;
}

function stack(state: BattleState, id: string): BattleStack {
  const result = state.stacks.find((candidate) => candidate.id === id);
  if (!result) throw new Error(`Missing scripted company ${id}`);
  return result;
}

function driveTo(
  initial: BattleState, predicate: (candidate: BattleStack) => boolean,
): BattleState {
  let state = initial;
  const startRound = state.round;
  for (let guard = 0; guard < 40; guard += 1) {
    const actor = state.stacks.find((candidate) => candidate.id === state.currentStackId);
    if (actor && predicate(actor)) return state;
    state = applyBattleAction(state, { type: 'BATTLE_DEFEND' });
    if (state.round !== startRound) throw new Error('Scripted actor was not reachable this round');
  }
  throw new Error('Scripted actor drive exceeded its finite guard');
}

function advanceRound(initial: BattleState): BattleState {
  let state = initial;
  const round = state.round;
  for (let guard = 0; guard < 80 && !state.winner && state.round === round; guard += 1) {
    state = applyBattleAction(state, { type: 'BATTLE_DEFEND' });
  }
  if (!state.winner && state.round === round) throw new Error('Round did not terminate');
  return state;
}

function executeBattle(seed: number, operations: readonly BattleOp[]): BattleState {
  let state = battleFixture(seed, operations);
  for (const operation of operations) {
    if (operation.op === 'stack') {
      const target = stack(state, operation.id);
      if (operation.count !== undefined) target.count = operation.count;
      if (operation.topHp !== undefined) target.topHp = operation.topHp;
      if (operation.shots !== undefined) target.shots = operation.shots;
      if (operation.morale !== undefined) target.morale = operation.morale;
      if (operation.position) target.position = { ...operation.position };
      if (operation.counters) Object.assign(target.counters, operation.counters);
    } else if (operation.op === 'upgrade' || operation.op === 'equip' || operation.op === 'skill') {
      // Pre-battle loadout operations were applied before createBattle and remain in the replay log.
    } else if (operation.op === 'advance-round') {
      state = advanceRound(state);
    } else if (operation.op === 'cast') {
      state = driveTo(state, (candidate) => candidate.side === operation.side);
      try {
        state = applyBattleAction(state, operation.action);
      } catch (error) {
        throw new Error(`${operation.action.spellId}: ${(error as Error).message}`);
      }
    } else {
      state = driveTo(state, (candidate) => candidate.id === operation.attackerId);
      state = applyBattleAction(state, { type: 'BATTLE_ATTACK', targetId: operation.targetId });
    }
  }
  return state;
}

function adventureFixture(): GameState {
  const state = createGame({ seed: 6217, p1: 'human', p2: 'human' });
  const hero = state.players.p1.hero!;
  hero.knownSpells = Object.keys(SPELLS) as SpellId[];
  hero.knowledge = 100;
  hero.mana = 999; hero.movement = 20_000; hero.dailyMovementMaximum = 20_000;
  return state;
}

function executeAdventure(operations: readonly AdventureOp[]): GameState {
  let state = adventureFixture();
  for (const operation of operations) {
    if (operation.op === 'support-hero') {
      const source = state.players.p1.hero!;
      const support = structuredClone(source);
      support.id = operation.id; support.name = 'Combo Support'; support.mana = 0;
      state.players.p1.heroes.push(support);
    } else if (operation.op === 'skill') {
      const hero = state.players[operation.player].hero;
      if (!hero) throw new Error(`Missing scripted ${operation.player} hero`);
      hero.skills[operation.skillId] = operation.rank;
    } else if (operation.op === 'explore') {
      state.players[operation.player].explored.push(`${operation.position.x},${operation.position.y}`);
    } else if (operation.op === 'mine') {
      const mine = state.map.objects.find((object) => object.id === operation.id);
      if (!mine || mine.kind !== 'mine') throw new Error(`Missing scripted mine ${operation.id}`);
      mine.owner = operation.owner;
      state.players[operation.exploredBy].explored.push(`${mine.position.x},${mine.position.y}`);
    } else {
      try {
        state = applyGame(state, operation.action);
      } catch (error) {
        throw new Error(`${operation.action.spellId}: ${(error as Error).message}`);
      }
    }
  }
  return state;
}

const C = (spellId: SpellId, extra: Omit<CastAction, 'type' | 'spellId'> = {}): CastAction =>
  ({ type: 'BATTLE_CAST', spellId, ...extra });

const COMBOS: readonly Combo[] = [
  { kind: 'battle', id: '1.1', name: 'The Bonfire', executedPieces: [
    'forgeSpark', 'amplify', 'forgefire', 'detonate', 'bellows',
  ], optionalPieces: ['forgeAshGauntlets'], script: [
    { op: 'equip', side: 'attacker', slot: 'misc1', artifactId: 'bellows' },
    { op: 'stack', id: 'defender-0', count: 100, topHp: UNITS.tinSoldier.hp },
    { op: 'cast', side: 'attacker', action: C('forgeSpark', { targetId: 'defender-0' }) },
    { op: 'advance-round' },
    { op: 'cast', side: 'attacker', action: C('amplify', { effectId: 'counter:defender-0:burn' }) },
    { op: 'advance-round' },
    { op: 'cast', side: 'attacker', action: C('forgefire') },
    { op: 'advance-round' },
    { op: 'cast', side: 'attacker', action: C('detonate', { targetId: 'defender-0' }) },
  ] },
  { kind: 'battle', id: '1.2', name: "The Martyr's Knot", executedPieces: [
    'puppetStrings', 'yoke', 'graveBargain',
  ], script: [
    { op: 'stack', id: 'defender-0', count: 1, topHp: 1 },
    { op: 'upgrade', side: 'attacker', spellId: 'puppetStrings' },
    { op: 'cast', side: 'attacker', action: C('puppetStrings', { targetId: 'defender-0' }) },
    { op: 'advance-round' },
    { op: 'cast', side: 'attacker', action: C('yoke', {
      targetId: 'defender-0', secondaryTargetId: 'defender-1',
    }) },
    { op: 'advance-round' },
    { op: 'cast', side: 'attacker', action: C('graveBargain', { targetId: 'defender-0' }) },
  ] },
  { kind: 'battle', id: '1.3', name: 'The Quiet Yard', executedPieces: [
    'wallOfTheMaker', 'ammunitionCart', 'shrapnel', 'longbowman',
  ], optionalPieces: ['sappersChalk'], script: [
    { op: 'stack', id: 'attacker-1', topHp: UNITS.longbowman.hp, shots: 0 },
    { op: 'cast', side: 'attacker', action: C('wallOfTheMaker', {
      positions: [{ x: 5, y: 2 }, { x: 5, y: 4 }, { x: 5, y: 6 }],
    }) },
    { op: 'advance-round' },
    { op: 'cast', side: 'attacker', action: C('ammunitionCart') },
    { op: 'advance-round' },
    { op: 'cast', side: 'attacker', action: C('shrapnel', { targetId: 'attacker-1' }) },
  ] },
  { kind: 'battle', id: '1.4', name: 'The Shared Grave', executedPieces: ['yoke', 'storm'], script: [
    { op: 'upgrade', side: 'attacker', spellId: 'yoke' },
    { op: 'cast', side: 'attacker', action: C('yoke', {
      targetId: 'defender-0', secondaryTargetId: 'defender-1',
    }) },
    { op: 'advance-round' }, { op: 'cast', side: 'attacker', action: C('storm') },
  ] },
  { kind: 'battle', id: '1.5', name: 'The Standing Cold', executedPieces: [
    'graveChill', 'overgrow', 'ashenPall', 'amplify',
  ], optionalPieces: ['hexwrightsTally'], script: [
    { op: 'stack', id: 'defender-1', position: { x: 11, y: 1 } },
    { op: 'cast', side: 'attacker', action: C('graveChill', { targetId: 'defender-0' }) },
    { op: 'advance-round' },
    { op: 'cast', side: 'attacker', action: C('overgrow', {
      effectId: 'counter:defender-0:chill',
    }) },
    { op: 'advance-round' },
    { op: 'cast', side: 'attacker', action: C('amplify', {
      effectId: 'counter:defender-0:chill',
    }) },
    { op: 'advance-round' }, { op: 'upgrade', side: 'attacker', spellId: 'ashenPall' },
    { op: 'cast', side: 'attacker', action: C('ashenPall') },
  ] },
  { kind: 'battle', id: '1.6', name: 'The Reprise Chain', executedPieces: [
    'litanyOfDawn', 'reprise', 'standardOfDawn', 'command', 'vanguard', 'bannerOfTheFirstField',
  ], script: [
    { op: 'equip', side: 'attacker', slot: 'cloak', artifactId: 'bannerOfTheFirstField' },
    { op: 'skill', side: 'attacker', skillId: 'command', rank: 3 },
    { op: 'skill', side: 'attacker', skillId: 'vanguard', rank: 3 },
    { op: 'upgrade', side: 'attacker', spellId: 'standardOfDawn' },
    { op: 'cast', side: 'attacker', action: C('standardOfDawn') },
    { op: 'advance-round' },
    { op: 'upgrade', side: 'attacker', spellId: 'litanyOfDawn' },
    { op: 'cast', side: 'attacker', action: C('litanyOfDawn') },
    { op: 'advance-round' }, { op: 'upgrade', side: 'attacker', spellId: 'reprise' },
    { op: 'cast', side: 'attacker', action: C('reprise', { targetId: 'attacker-0' }) },
  ] },
  { kind: 'battle', id: '1.7', name: 'The Second Sunrise', executedPieces: [
    'consecratedGround', 'blessing',
  ], script: [
    { op: 'cast', side: 'attacker', action: C('consecratedGround') },
    { op: 'advance-round' },
    { op: 'cast', side: 'attacker', action: C('blessing', { targetId: 'attacker-0' }) },
  ] },
  { kind: 'battle', id: '1.8', name: 'The Double Blessing', executedPieces: [
    'whetstone', 'blessing', 'quicksilver', 'clockworkDouble',
  ], script: [
    { op: 'cast', side: 'attacker', action: C('blessing', { targetId: 'attacker-0' }) },
    { op: 'advance-round' },
    { op: 'cast', side: 'attacker', action: C('quicksilver', { targetId: 'attacker-0' }) },
    { op: 'advance-round' },
    { op: 'cast', side: 'attacker', action: C('whetstone', { targetId: 'attacker-0' }) },
    { op: 'advance-round' }, { op: 'upgrade', side: 'attacker', spellId: 'clockworkDouble' },
    { op: 'cast', side: 'attacker', action: C('clockworkDouble', {
      targetId: 'attacker-0', positions: [{ x: 4, y: 1 }],
    }) },
  ] },
  { kind: 'battle', id: '1.9', name: 'The Overclocked Colossus', executedPieces: [
    'overclock', 'sanctuary', 'mournersVeil', 'woodenColossus',
  ], script: [
    { op: 'cast', side: 'attacker', action: C('sanctuary', { targetId: 'attacker-2' }) },
    { op: 'advance-round' },
    { op: 'cast', side: 'attacker', action: C('mournersVeil', { targetId: 'attacker-2' }) },
    { op: 'advance-round' },
    { op: 'cast', side: 'attacker', action: C('overclock', { targetId: 'attacker-2' }) },
    { op: 'advance-round' },
  ] },
  { kind: 'battle', id: '1.10', name: 'The Blink Assassination', executedPieces: [
    'blink', 'steadyHands', 'ashmaneWolves',
  ], optionalPieces: ['marionette', 'maskedDuelist'], script: [
    { op: 'upgrade', side: 'attacker', spellId: 'blink' },
    { op: 'cast', side: 'attacker', action: C('blink', {
      targetId: 'attacker-3', positions: [{ x: 9, y: 4 }], actImmediately: true,
    }) },
    { op: 'advance-round' },
    { op: 'cast', side: 'attacker', action: C('steadyHands', { targetId: 'attacker-3' }) },
  ] },
  { kind: 'battle', id: '1.11', name: 'The Harvest Engine', executedPieces: [
    'ossuary', 'reckoning', 'silenceThePassing',
  ], script: [
    { op: 'cast', side: 'attacker', action: C('ossuary') }, { op: 'advance-round' },
    { op: 'upgrade', side: 'attacker', spellId: 'silenceThePassing' },
    { op: 'cast', side: 'attacker', action: C('silenceThePassing') },
    { op: 'advance-round' },
    { op: 'stack', id: 'defender-0', count: 1, topHp: 1 },
    { op: 'stack', id: 'defender-1', count: 1, topHp: 1 },
    { op: 'cast', side: 'attacker', action: C('reckoning') },
  ] },
  { kind: 'battle', id: '1.12', name: 'The Turning Year', executedPieces: [
    'rains', 'verdantSurge', 'theTurningYear',
  ], script: [
    { op: 'stack', id: 'attacker-0', counters: { burn: 4 } },
    { op: 'cast', side: 'attacker', action: C('rains') }, { op: 'advance-round' },
    { op: 'cast', side: 'attacker', action: C('verdantSurge') }, { op: 'advance-round' },
    { op: 'upgrade', side: 'attacker', spellId: 'theTurningYear' },
    { op: 'cast', side: 'attacker', action: C('theTurningYear', { counterId: 'bloom' }) },
  ] },
  { kind: 'battle', id: '1.13', name: 'The Ledger', executedPieces: [
    'theLedgerBalanced', 'graveBargain', 'secondGrave',
  ], optionalPieces: ['loyalUntoDeath', 'lastCandle', 'quietLedger', 'blood_price'], script: [
    { op: 'stack', id: 'attacker-0', count: 1, topHp: 1 },
    { op: 'cast', side: 'attacker', action: C('theLedgerBalanced', { targetId: 'defender-0' }) },
    { op: 'advance-round' },
    { op: 'cast', side: 'attacker', action: C('secondGrave', { targetId: 'attacker-0' }) },
    { op: 'advance-round' },
    { op: 'cast', side: 'attacker', action: C('graveBargain', { targetId: 'attacker-0' }) },
  ] },
  { kind: 'battle', id: '1.14', name: 'The Mirror Hall Turn', executedPieces: [
    'mirrorHall', 'wither',
  ], script: [
    { op: 'cast', side: 'attacker', action: C('mirrorHall') }, { op: 'advance-round' },
    { op: 'cast', side: 'attacker', action: C('wither', {
      targetId: 'defender-0', mirrorTargetId: 'defender-1',
    }) },
  ] },
  { kind: 'battle', id: '1.15', name: 'The Borrowed Shape', executedPieces: [
    'borrowShape', 'stuffedSentinel',
  ], script: [
    { op: 'stack', id: 'attacker-0', position: { x: 5, y: 4 } },
    { op: 'stack', id: 'defender-3', position: { x: 6, y: 4 } },
    { op: 'cast', side: 'attacker', action: C('borrowShape', {
      targetId: 'attacker-0', secondaryTargetId: 'defender-3',
    }) },
  ] },
  { kind: 'battle', id: '1.16', name: 'Weather Abuse', executedPieces: [
    'theWeatherItself',
  ], optionalPieces: ['counterweight'], seed: 6204, script: [
    { op: 'upgrade', side: 'attacker', spellId: 'theWeatherItself' },
    { op: 'cast', side: 'attacker', action: C('theWeatherItself') },
    { op: 'advance-round' },
  ] },
  { kind: 'adventure', id: '1.17', name: 'Adventure: the Raider', executedPieces: [
    'dimensionDoor', 'beacon', 'fly', 'processionOfLamps', 'wellspring', 'logistics',
  ], script: [
    { op: 'skill', player: 'p1', skillId: 'logistics', rank: 3 },
    { op: 'support-hero', id: 'p1-combo-support' },
    { op: 'explore', player: 'p1', position: { x: 0, y: 4 } },
    { op: 'cast', action: { type: 'CAST_ADVENTURE_SPELL', spellId: 'dimensionDoor',
      target: { x: 0, y: 4 } } },
    { op: 'cast', action: { type: 'CAST_ADVENTURE_SPELL', spellId: 'beacon' } },
    { op: 'cast', action: { type: 'CAST_ADVENTURE_SPELL', spellId: 'fly' } },
    { op: 'cast', action: { type: 'CAST_ADVENTURE_SPELL', spellId: 'processionOfLamps' } },
    { op: 'cast', action: { type: 'CAST_ADVENTURE_SPELL', spellId: 'wellspring',
      targetHeroId: 'p1-combo-support' } },
  ] },
  { kind: 'adventure', id: '1.18', name: 'Adventure: the Siege that never arrives', executedPieces: [
    'theDebtCalled', 'stealAway', 'saltTheVein', 'illWind',
  ], script: [
    { op: 'mine', id: 'west-gold', owner: 'p2', exploredBy: 'p1' },
    { op: 'cast', action: { type: 'CAST_ADVENTURE_SPELL', spellId: 'theDebtCalled',
      targetHeroId: 'p2-petra' } },
    { op: 'cast', action: { type: 'CAST_ADVENTURE_SPELL', spellId: 'stealAway',
      targetId: 'west-gold' } },
    { op: 'cast', action: { type: 'CAST_ADVENTURE_SPELL', spellId: 'saltTheVein',
      targetId: 'west-gold' } },
    { op: 'cast', action: { type: 'CAST_ADVENTURE_SPELL', spellId: 'illWind' } },
  ] },
  { kind: 'battle', id: '1.19', name: 'The Grudge Stack', executedPieces: [
    'grudge', 'sunlance',
  ], script: [
    { op: 'stack', id: 'attacker-0', count: 1, topHp: UNITS.lanceKnight.hp,
      position: { x: 4, y: 4 } },
    { op: 'stack', id: 'attacker-1', count: 1, topHp: UNITS.longbowman.hp,
      position: { x: 4, y: 3 } },
    { op: 'stack', id: 'attacker-2', count: 1, topHp: UNITS.woodenColossus.hp,
      position: { x: 4, y: 5 } },
    { op: 'stack', id: 'attacker-3', count: 1, topHp: UNITS.ashmaneWolves.hp,
      position: { x: 5, y: 3 } },
    { op: 'stack', id: 'defender-0', position: { x: 5, y: 4 } },
    { op: 'upgrade', side: 'attacker', spellId: 'grudge' },
    { op: 'cast', side: 'attacker', action: C('grudge', { targetId: 'defender-0' }) },
    { op: 'advance-round' },
    { op: 'attack', attackerId: 'attacker-3', targetId: 'defender-0' },
    { op: 'attack', attackerId: 'attacker-0', targetId: 'defender-0' },
    { op: 'cast', side: 'attacker', action: C('sunlance', { targetId: 'defender-0' }) },
  ] },
  { kind: 'battle', id: '1.20', name: 'Yoke the Indestructible', executedPieces: [
    'yoke', 'oathOfIron', 'ironclad',
  ], optionalPieces: ['stuffedSentinel'], script: [
    { op: 'cast', side: 'attacker', action: C('oathOfIron', { targetId: 'attacker-0' }) },
    { op: 'advance-round' }, { op: 'cast', side: 'attacker', action: C('ironclad') },
    { op: 'advance-round' },
    { op: 'cast', side: 'attacker', action: C('yoke', {
      targetId: 'attacker-0', secondaryTargetId: 'defender-0',
    }) },
    { op: 'cast', side: 'defender', action: C('kindle', { targetId: 'attacker-0' }) },
  ] },
] as const;

function assertOutcome(combo: Combo, finalState: BattleState | GameState): string {
  if (combo.kind === 'adventure') {
    const state = finalState as GameState;
    if (combo.id === '1.17') {
      const support = state.players.p1.heroes.find((hero) => hero.id === 'p1-combo-support')!;
      const hero = state.players.p1.hero!;
      const castle = state.castles.find((candidate) => candidate.owner === 'p1')!;
      expect(hero.position).toEqual({
        x: castle.position.x + castle.entrance.dx, y: castle.position.y + castle.entrance.dy,
      });
      expect(hero.adventureEffects.terrainIgnore?.day).toBe(state.day);
      expect(hero.skills.logistics).toBe(3);
      expect(hero.movement).toBe(hero.dailyMovementMaximum - 600);
      expect(support.mana).toBeGreaterThan(0);
      expect(state.eventLog.filter((line) => [
        'Dimension Door', 'Beacon', 'Fly', 'Procession of Lamps', 'Wellspring',
      ].some((name) => line.includes(name)))).toHaveLength(5);
      return 'jump, return, terrain pass, movement refill, and remote refuel all resolve';
    }
    const mine = state.map.objects.find((object) => object.id === 'west-gold');
    expect(state.players.p2.hero!.adventureEffects.movementDeniedThroughDay).toBeGreaterThan(state.day);
    expect(mine?.kind === 'mine' ? mine.productionRedirect?.recipient : null).toBe('p1');
    expect(mine?.kind === 'mine' ? mine.suppressedUntilDay : 0).toBeGreaterThanOrEqual(state.day);
    expect(state.players.p2.hero!.adventureEffects.prebattleConditions?.length ?? 0).toBeGreaterThan(0);
    return 'movement, production, suppression, and next-battle scopes all persist';
  }
  const battle = finalState as BattleState;
  const a0 = stack(battle, 'attacker-0'); const d0 = stack(battle, 'defender-0');
  switch (combo.id) {
    case '1.1': expect(d0.counters.burn).toBe(0); expect(d0.damageTaken).toBeGreaterThan(0);
      expect(battle.enchantments.attacker.some((effect) => effect.spellId === 'forgefire')).toBe(true);
      { const burnTicks = battle.log.filter((line) => line.includes('Burn damage.'))
        .map((line) => Number(line.match(/suffers (\d+) Burn/)?.[1] ?? 0));
      expect(burnTicks).toHaveLength(3);
      expect(burnTicks.at(-1)).toBeGreaterThan(burnTicks.at(-2)!); } break;
    case '1.2': expect(d0.count).toBe(0); expect(battle.casualties.defender.tinSoldier).toBe(1); break;
    case '1.3': expect(battle.tiles.filter((tile) => tile.type === 'wall')).toHaveLength(3);
      expect(stack(battle, 'attacker-1').shots).toBe(UNITS.longbowman.shots);
      expect(stack(battle, 'attacker-1').effects.some((effect) => effect.spellId === 'shrapnel')).toBe(true); break;
    case '1.4': expect(stack(battle, 'defender-1').damageTaken).toBeGreaterThan(0); break;
    case '1.5': expect(d0.counters.chill).toBeGreaterThan(0);
      expect(stack(battle, 'defender-1').counters.chill).toBeGreaterThan(0); break;
    case '1.6': expect(a0.grantedActionsThisRound).toBe(2); expect(a0.meterThreshold).toBe(80);
      expect(a0.morale).toBeGreaterThanOrEqual(0);
      expect(battle.enchantments.attacker.some((effect) => effect.spellId === 'standardOfDawn')).toBe(true);
      expect(battle.attackerHero.skills).toMatchObject({ command: 3, vanguard: 3 }); break;
    case '1.7': expect(battle.resonance).toBe('rite');
      expect(battle.stacks.filter((entry) => entry.side === 'attacker')
        .every((entry) => entry.effects.some((effect) => effect.spellId === 'blessing'))).toBe(true); break;
    case '1.8': {
      const clone = battle.stacks.find((entry) => entry.cloneOf === a0.id)!;
      expect(clone.effects.map((effect) => effect.spellId)).toEqual(expect.arrayContaining([
        'whetstone', 'blessing', 'quicksilver',
      ])); break;
    }
    case '1.9': expect(stack(battle, 'attacker-2').extraActionsTaken).toBe(2);
      expect(battle.log).toContain('Wooden Colossus is stunned and forfeits its action.');
      expect(battle.log.filter((line) => line.includes('Wooden Colossus takes a')
        && line.includes('granted action'))).toHaveLength(2); break;
    case '1.10': expect(stack(battle, 'attacker-3').position).toEqual({ x: 9, y: 4 });
      expect(stack(battle, 'attacker-3').effects.some((effect) =>
        effect.spellId === 'steadyHands' && effect.magnitude === 2)).toBe(true); break;
    case '1.11': expect(battle.stacks.filter((entry) => entry.summoned
      && entry.side === 'attacker')).toHaveLength(4); break;
    case '1.12': expect(a0.counters.bloom).toBeGreaterThan(0); expect(a0.counters.burn).toBe(0); break;
    case '1.13': expect(d0.count).toBe(battle.initialCounts[d0.id] - 1);
      expect(a0.count).toBe(8); expect(stack(battle, 'attacker-1').counters.bloom).toBeGreaterThan(0);
      expect(battle.log.some((line) => line.includes('The Ledger Balanced removes 1'))).toBe(true); break;
    case '1.14': expect(d0.counters.hex).toBeGreaterThan(0);
      expect(stack(battle, 'defender-1').counters.hex).toBeGreaterThan(0); break;
    case '1.15': expect(a0.copiedAbilityIds).toContain('soft_body'); break;
    case '1.16': expect(battle.p2Weather?.kind).toBe('sun');
      expect(p2WeatherForecastForSide(battle, 'attacker')).not.toBeNull();
      expect(battle.stacks.filter((entry) => entry.side === 'attacker').every((entry) => entry.morale > 0)).toBe(true);
      expect(battle.stacks.filter((entry) => entry.side === 'defender').every((entry) => entry.morale === 0)).toBe(true); break;
    case '1.19': expect(d0.counters.hex).toBeGreaterThanOrEqual(4);
      expect(d0.damageTaken).toBeGreaterThan(0); break;
    case '1.20': expect(d0.damageTaken).toBeGreaterThan(0); expect(a0.damageLink?.targetId).toBe(d0.id); break;
    default: throw new Error(`Missing qualitative assertion for ${combo.id}`);
  }
  return `${combo.id} resolves to its documented qualitative state`;
}

describe('doc 62 deterministic combo acceptance', () => {
  it('pins exactly twenty numbered fixtures and resolves every named catalog piece', () => {
    expect(COMBOS.map((combo) => combo.id)).toEqual(Array.from({ length: 20 }, (_, index) => `1.${index + 1}`));
    const known = new Set([
      ...Object.keys(SPELLS), ...Object.keys(ARTIFACTS), ...Object.keys(SKILLS),
      ...Object.keys(UNITS), 'blood_price',
    ]);
    const baseFixturePieces = new Set([
      'lanceKnight', 'longbowman', 'woodenColossus', 'ashmaneWolves',
      'tinSoldier', 'hobbyKnight', 'boneChoir', 'stuffedSentinel',
    ]);
    for (const combo of COMBOS) {
      const serializedScript = stable(combo.script);
      const optional = new Set(combo.optionalPieces ?? []);
      for (const piece of combo.executedPieces) {
        expect(known.has(piece), `${combo.id} missing ${piece}`).toBe(true);
        expect(optional.has(piece), `${combo.id} marks executed ${piece} optional`).toBe(false);
        expect(serializedScript.includes(JSON.stringify(piece)) || baseFixturePieces.has(piece),
          `${combo.id} does not execute ${piece}`).toBe(true);
      }
      for (const piece of optional) expect(known.has(piece), `${combo.id} missing ${piece}`).toBe(true);
    }
  });

  for (const combo of COMBOS) {
    it(`${combo.id} ${combo.name} replays its captured fixed operation log identically`, () => {
      const pinned = JSON.parse(JSON.stringify(combo.script)) as typeof combo.script;
      const first = combo.kind === 'battle'
        ? executeBattle(combo.seed ?? 6200, combo.script) : executeAdventure(combo.script);
      const captured = JSON.parse(JSON.stringify(combo.script)) as typeof combo.script;
      expect(captured).toEqual(pinned);
      const replay = combo.kind === 'battle'
        ? executeBattle(combo.seed ?? 6200, captured as readonly BattleOp[])
        : executeAdventure(captured as readonly AdventureOp[]);
      expect(stable(replay)).toBe(stable(first));
      expect(assertOutcome(combo, replay)).toBe(assertOutcome(combo, first));
    });
  }
});

describe('doc 62 two-city Mage Guild exposure', () => {
  it('surfaces a mean 30–40% of the relevant two-school pool over 200 deterministic seeds', () => {
    const relevant = Object.values(SPELLS).filter((spell) =>
      spell.school === 'rite' || spell.school === 'craft');
    expect(relevant).toHaveLength(62);
    const counts = Array.from({ length: 200 }, (_, seed) => new Set([
      ...dealCurrentMageGuild('hearthguard', seed, 'p1:first-city').flat,
      ...dealCurrentMageGuild('hearthguard', seed, 'p1:second-city').flat,
    ].filter((id) => SPELLS[id].school === 'rite' || SPELLS[id].school === 'craft')).size);
    const mean = counts.reduce((sum, value) => sum + value, 0) / counts.length;
    expect(mean).toBe(20.125);
    expect(mean / relevant.length).toBeGreaterThanOrEqual(0.30);
    expect(mean / relevant.length).toBeLessThanOrEqual(0.40);
  });
});
