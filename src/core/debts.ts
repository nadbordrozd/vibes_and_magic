import type {
  BuildingId, DebtEntry, DebtTrigger, GameState, Hero, UnitTier,
} from './types';
import { maximumDebtSlots } from './artifacts';
import { FACTION_UNITS, UNITS } from '../content/units';

export const MAX_ACTIVE_DEBTS = 2;

export type DebtEvent =
  | { kind: 'day-start'; day: number }
  | { kind: 'week-start'; week: number }
  | { kind: 'battle-complete'; battle: number }
  | { kind: 'level-up'; heroId: string; level: number };

interface DebtHandler {
  tag: string;
  resolve: (state: GameState, hero: Hero, debt: DebtEntry) => void;
}

export const DEBT_HANDLER_REGISTRY: Record<string, DebtHandler> = {
  announce: {
    tag: 'announce',
    resolve: (state, hero, debt) => {
      state.eventLog.push(`Debt called for ${hero.name}: ${debt.description}`);
    },
  },
  'first-harvest': {
    tag: 'first-harvest',
    resolve: (state, hero, debt) => {
      const target = state.castles.filter((castle) => castle.owner === hero.owner)
        .flatMap((castle) => FACTION_UNITS[castle.faction].map((unitId, index) => ({
          castle, tier: (index + 1) as UnitTier, growth: UNITS[unitId].growth,
          built: index === 0 || castle.buildings.includes(
            `dwelling${index + 1}` as BuildingId,
          ),
        })))
        .filter((candidate) => candidate.built)
        .sort((a, b) => b.growth - a.growth
          || a.castle.id.localeCompare(b.castle.id) || a.tier - b.tier)[0];
      if (target) target.castle.growthEffects.push({
        id: debt.id, multiplier: 0, expiresWeek: state.week, tier: target.tier,
      });
      state.eventLog.push(`${debt.name}: the highest-growth dwelling falls barren.`);
    },
  },
  'borrowed-legion-departs': {
    tag: 'borrowed-legion-departs',
    resolve: (state, hero, debt) => {
      const smallest = hero.army.map((stack, slot) => ({ stack, slot }))
        .filter((entry) => entry.stack)
        .sort((a, b) => a.stack!.count - b.stack!.count || a.slot - b.slot)[0];
      if (smallest) hero.army[smallest.slot] = null;
      state.eventLog.push(`${debt.name}: the legion takes its companion and leaves.`);
    },
  },
  'persistent-cuckoo': {
    tag: 'persistent-cuckoo', resolve: () => undefined,
  },
  'milk-teeth': {
    tag: 'milk-teeth',
    resolve: (state, hero, debt) => {
      state.players[hero.owner].adventureEffects.tierOneGrowth.push({
        multiplier: debt.data?.surcharge ? 0.4 : 0.5,
        startWeek: state.week, endWeek: state.week + 1,
      });
    },
  },
  'long-nap': {
    tag: 'long-nap',
    resolve: (state, hero, debt) => {
      state.eventLog.push(`${debt.name}: ${hero.name} does not wake today.`);
    },
  },
  'never-by-iron': {
    tag: 'never-by-iron',
    resolve: (state, hero, debt) => {
      state.eventLog.push(`${debt.name}: ${hero.name}'s iron tithe is complete.`);
    },
  },
  'third-child': {
    tag: 'third-child',
    resolve: (_state, hero) => { hero.draftBonusCards = -2; },
  },
  'what-was-promised': {
    tag: 'what-was-promised',
    resolve: (state, hero, debt) => {
      const player = state.players[hero.owner];
      const castle = state.castles.find((candidate) => candidate.id === debt.data?.castleId);
      const buildingId = debt.data?.buildingId;
      if (!castle || typeof buildingId !== 'string') return;
      const wasDormant = Boolean(
        castle.dormantBuildings[buildingId as keyof typeof castle.dormantBuildings],
      );
      if (player.resources.essence >= 3) {
        player.resources.essence -= 3;
        castle.dormantBuildings[buildingId as keyof typeof castle.dormantBuildings] = false;
        if (wasDormant && buildingId === 'chapelOfTheBanner'
            && castle.buildings.includes('chapelOfTheBanner')) {
          for (const ownerHero of player.heroes) ownerHero.moraleBonus += 5;
        }
      } else {
        castle.dormantBuildings[buildingId as keyof typeof castle.dormantBuildings] = true;
        if (!wasDormant && buildingId === 'chapelOfTheBanner'
            && castle.buildings.includes('chapelOfTheBanner')) {
          for (const ownerHero of player.heroes) ownerHero.moraleBonus -= 5;
        }
        // Keep the visible weekly Debt alive until the missed instalment is paid.
        debt.remainingTriggers += 1;
      }
    },
  },
};

export function scheduleDebt(
  hero: Hero,
  debt: Omit<DebtEntry, 'remainingTriggers'> & { remainingTriggers?: number },
): void {
  if (hero.debts.length >= maximumDebtSlots(hero)) {
    throw new Error(`A hero may carry at most ${maximumDebtSlots(hero)} Debts`);
  }
  if (hero.debts.some((entry) => entry.id === debt.id)) {
    throw new Error('Debt ids must be unique per hero');
  }
  hero.debts.push({
    ...debt,
    trigger: { ...debt.trigger },
    remainingTriggers: debt.remainingTriggers ?? 1,
  });
}

function isDue(trigger: DebtTrigger, event: DebtEvent): boolean {
  return trigger.kind === 'day-start' && event.kind === 'day-start'
      && event.day >= trigger.dueDay
    || trigger.kind === 'week-start' && event.kind === 'week-start'
      && event.week >= trigger.dueWeek
    || trigger.kind === 'battle-complete' && event.kind === 'battle-complete'
      && event.battle >= trigger.dueBattle
    || trigger.kind === 'level-up' && event.kind === 'level-up'
      && event.level >= trigger.dueLevel;
}

function reschedule(entry: DebtEntry): void {
  const interval = entry.interval ?? 0;
  if (entry.trigger.kind === 'day-start') entry.trigger.dueDay += interval;
  else if (entry.trigger.kind === 'week-start') entry.trigger.dueWeek += interval;
  else if (entry.trigger.kind === 'battle-complete') entry.trigger.dueBattle += interval;
  else entry.trigger.dueLevel += interval;
}

export function resolveDebtEvent(state: GameState, event: DebtEvent): string[] {
  const triggered: string[] = [];
  for (const player of Object.values(state.players)) {
    for (const hero of [...player.heroes, ...player.tavernPool]) {
      if (event.kind === 'level-up' && event.heroId !== hero.id) continue;
      for (const debt of hero.debts.filter((entry) => isDue(entry.trigger, event))) {
        const handler = DEBT_HANDLER_REGISTRY[debt.handlerTag];
        if (!handler) throw new Error(`Unknown Debt handler: ${debt.handlerTag}`);
        handler.resolve(state, hero, debt);
        debt.remainingTriggers -= 1;
        triggered.push(debt.id);
        if (debt.remainingTriggers > 0) {
          if (!debt.interval || debt.interval <= 0) {
            throw new Error('Recurring Debt requires a positive interval');
          }
          reschedule(debt);
        }
      }
      hero.debts = hero.debts.filter((debt) => debt.remainingTriggers > 0);
    }
  }
  return triggered;
}

export function debtCountdown(debt: DebtEntry, state: {
  day: number; week: number; metrics: { battles: number };
}): string {
  if (debt.trigger.kind === 'day-start') {
    return `${Math.max(0, debt.trigger.dueDay - state.day)} day(s)`;
  }
  if (debt.trigger.kind === 'week-start') {
    return `${Math.max(0, debt.trigger.dueWeek - state.week)} week(s)`;
  }
  if (debt.trigger.kind === 'battle-complete') {
    return `${Math.max(0, debt.trigger.dueBattle - state.metrics.battles)} battle(s)`;
  }
  return `level ${debt.trigger.dueLevel}`;
}

export function effectIsManipulable(kind: string): boolean {
  return kind !== 'debt';
}

export function tryManipulateDebt(
  _hero: Hero,
  _debtId: string,
  _operation: 'sour' | 'unmake' | 'waxSeal',
): false {
  return false;
}
