import { makeArmy } from '../core/army';
import { createBattle } from '../core/combat/setup';
import { createGame } from '../core/game';
import type { AbilityId, GameState, UnitId } from '../core/types';

export interface CombatAbilityFixture {
  name: string;
  abilityId: AbilityId;
  state: GameState;
}

function fixture(
  name: string,
  abilityId: AbilityId,
  actorId: UnitId,
  allies: UnitId[] = [],
): CombatAbilityFixture {
  const state = createGame({
    seed: 7600 + name.length, mapId: 'grand-muster', p1: 'human', p2: 'dormant',
  });
  const attacker = state.players.p1.hero!;
  const defender = structuredClone(state.players.p2.hero!);
  defender.owner = 'p2';
  const [battle] = createBattle(
    makeArmy([
      { unitId: actorId, count: 3 },
      ...allies.map((unitId) => ({ unitId, count: 8 })),
    ]),
    makeArmy([
      { unitId: 'tinSoldier', count: 18 },
      { unitId: 'woodenColossus', count: 2 },
    ]),
    attacker, defender,
    {
      kind: 'hero', targetId: defender.id, destination: { x: 20, y: 20 },
      attackerHeroId: attacker.id, defenderHeroId: defender.id,
      defenderPlayerId: 'p2', battlefield: 'land', terrain: 'meadow',
    }, state.rng,
  );
  battle.obstacles = [];
  battle.obstacleProps = [];
  battle.tiles = [];
  const actor = battle.stacks.find((stack) => stack.side === 'attacker' && stack.slot === 0)!;
  const ally = battle.stacks.find((stack) => stack.side === 'attacker' && stack.slot === 1);
  const enemies = battle.stacks.filter((stack) => stack.side === 'defender');
  actor.position = { x: 0, y: 4 };
  if (ally) ally.position = { x: 2, y: 4 };
  enemies[0].position = abilityId === 'trample' ? { x: 2, y: 4 } : { x: 8, y: 4 };
  enemies[1].position = { x: 10, y: 6 };
  battle.currentStackId = actor.id;
  battle.order = [actor.id, ...battle.order.filter((id) => id !== actor.id)];
  battle.casualties.attacker.yeoman = 8;
  state.battle = battle;
  state.phase = 'combat';
  state.pendingChoice = null;
  state.replay = [];
  return { name, abilityId, state };
}

export function combatAbilityFixtures(): CombatAbilityFixture[] {
  return [
    fixture('procession-of-repair', 'procession_of_repair', 'reliquaryArk', ['tinSoldier']),
    fixture('brood-call', 'brood_call', 'halfWokenQueen'),
    fixture('beckoning-song', 'beckoning_song', 'rusalka'),
    fixture('the-lure', 'the_lure', 'lanternAngler'),
    fixture('crossing', 'crossing', 'ferry', ['candleWisps']),
    fixture('trample', 'trample', 'aurochsHerd'),
  ];
}
