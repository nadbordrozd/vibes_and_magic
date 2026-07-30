import {
  BATTLE_COLS, BATTLE_ROWS,
} from '../../content/constants';
import { UNITS } from '../../content/units';
import { coordKey } from '../map/pathfinding';
import { randomInt } from '../rng';
import type {
  Army, ArmyStack, BattleContext, BattleSide, BattleStack,
  BattleState, Coord, Hero,
} from '../types';
import { applyRoundMorale, turnOrder } from './round';

const DEPLOY_ROWS = [4, 2, 6, 0, 8, 1, 7];

function armyToBattleStacks(army: Army, side: BattleSide): BattleStack[] {
  return army.flatMap((stack, slot) => {
    if (!stack || stack.count <= 0) return [];
    const unit = UNITS[stack.unitId];
    return [{
      id: `${side}-${slot}`, side, slot, unitId: stack.unitId,
      count: stack.count, topHp: unit.hp,
      position: { x: side === 'attacker' ? 0 : BATTLE_COLS - 1, y: DEPLOY_ROWS[slot] },
      shots: unit.shots ?? 0, morale: 0, retaliated: false,
      defended: false, waited: false, bonusActions: 0,
    }];
  });
}

export function splitGuardianArmy(stacks: ArmyStack[]): Army {
  const result: Array<ArmyStack | null> = Array(7).fill(null);
  let slot = 0;
  for (const stack of stacks) {
    const splits = Math.min(5, stack.count);
    const base = Math.floor(stack.count / splits);
    let remainder = stack.count % splits;
    for (let index = 0; index < splits && slot < 7; index += 1) {
      result[slot++] = {
        unitId: stack.unitId,
        count: base + (remainder-- > 0 ? 1 : 0),
      };
    }
  }
  return result;
}

function createObstacles(rngState: number): [Coord[], number] {
  const obstacles: Coord[] = [];
  const used = new Set<string>();
  let rng = rngState;
  while (obstacles.length < 8) {
    let x: number;
    let y: number;
    [x, rng] = randomInt(rng, BATTLE_COLS - 4);
    [y, rng] = randomInt(rng, BATTLE_ROWS);
    const coord = { x: x + 2, y };
    const key = coordKey(coord);
    if (!used.has(key)) {
      used.add(key);
      obstacles.push(coord);
    }
  }
  return [obstacles, rng];
}

export function createBattle(
  attackerArmy: Army,
  defenderArmy: Army,
  attackerHero: Hero,
  defenderHero: Hero | null,
  context: BattleContext,
  rng: number,
  defenderWalls = false,
): [BattleState, number] {
  const stacks = [
    ...armyToBattleStacks(attackerArmy, 'attacker'),
    ...armyToBattleStacks(defenderArmy, 'defender'),
  ];
  const [obstacles, nextRng] = createObstacles(rng);
  const order = turnOrder(stacks);
  const battle: BattleState = {
    round: 1, stacks, obstacles, order, waiting: [],
    currentStackId: order[0] ?? null,
    attackerHero: {
      attack: attackerHero.attack, defense: attackerHero.defense,
      luck: attackerHero.luck, moraleBonus: attackerHero.moraleBonus,
    },
    defenderHero: defenderHero
      ? {
        attack: defenderHero.attack, defense: defenderHero.defense,
        luck: defenderHero.luck, moraleBonus: defenderHero.moraleBonus,
      } : null,
    defenderWalls, context, log: ['Battle begins.'],
    casualties: { attacker: {}, defender: {} }, winner: null,
  };
  applyRoundMorale(battle);
  return [battle, nextRng];
}
