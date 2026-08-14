import { ITEMS, itemName } from '../content/items';
import { ABILITY_PRESENTATION } from '../content/abilityPresentation';
import { SPELLS } from '../content/spells';
import { BATTLE_COLS, BATTLE_ROWS } from '../content/constants';
import { UNITS } from '../content/units';
import { artifactEffectTotal } from '../core/artifacts';
import { skillRank } from '../core/heroBehaviors';
import { footprintFits, occupiedByStacks, stacksAdjacent } from '../core/combat/footprint';
import { wildcallSummonPlan } from '../core/combat/p1GraveWildSpellEffects';
import { legalCombatItemUses } from '../core/combat/items';
import {
  effectiveResonances, isUpgraded, legalSpellCasts,
} from '../core/combat/spells';
import { spellManaCost } from '../core/combat/spellModifiers';
import {
  currentKnack, legalKnackActions, legalKnackPlacements, requiredKnackPositions,
} from '../core/combat/knacks';
import type {
  AbilityId, Action, BattleHero, BattleSide, BattleStack, BattleState, Coord, ItemInstance, SpellId,
} from '../core/types';

export type CombatTargetAction = Extract<
  Action, { type: 'BATTLE_CAST' | 'BATTLE_USE_ITEM' | 'BATTLE_USE_ABILITY' | 'BATTLE_USE_KNACK' }
>;
export type CombatTargetField =
  'spellId' | 'effectId' | 'actImmediately' | 'targetId' | 'secondaryTargetId'
  | 'artifactSecondTargetId' | 'mirrorTargetId' | 'mirrorSecondaryTargetId' | 'destination'
  | 'replaceEnchantment' | 'skipRound' | 'counterId' | 'school';
export type CombatTargetStage = CombatTargetField | 'positions' | 'confirm';
export type CombatTargetValue = string | number | boolean | Coord;

export interface CombatTargetSource {
  kind: 'spell' | 'item' | 'ability' | 'knack';
  spellId?: SpellId;
  inventorySlot?: number;
  abilityId?: AbilityId;
}

export interface CombatTargetDraft {
  source: CombatTargetSource;
  options: CombatTargetAction[];
  selections: Partial<Record<CombatTargetField, CombatTargetValue>>;
  positions: Coord[];
  history: Array<{
    selections: Partial<Record<CombatTargetField, CombatTargetValue>>;
    positions: Coord[];
  }>;
}

function actionTargetValue(
  action: CombatTargetAction, field: CombatTargetField,
): CombatTargetValue | undefined {
  if (field === 'destination') {
    return action.type === 'BATTLE_USE_ABILITY' ? action.destination : undefined;
  }
  if (field === 'spellId') {
    return action.type === 'BATTLE_USE_ABILITY' ? action.spellId : undefined;
  }
  if (field === 'effectId') {
    return action.type === 'BATTLE_CAST' || action.type === 'BATTLE_USE_ITEM'
      || action.type === 'BATTLE_USE_ABILITY'
      ? action.effectId : undefined;
  }
  if (field === 'school') return action.type === 'BATTLE_USE_ITEM' ? action.school : undefined;
  if (field === 'actImmediately') {
    return action.type === 'BATTLE_CAST' || action.type === 'BATTLE_USE_ABILITY'
      ? action.actImmediately : undefined;
  }
  if (field === 'targetId') return action.targetId;
  if (field === 'counterId') return action.type === 'BATTLE_CAST' ? action.counterId : undefined;
  if (field === 'secondaryTargetId') {
    return action.secondaryTargetId;
  }
  if (field === 'artifactSecondTargetId') {
    return action.type === 'BATTLE_CAST' ? action.artifactSecondTargetId : undefined;
  }
  if (field === 'mirrorTargetId') {
    return action.type === 'BATTLE_CAST' ? action.mirrorTargetId : undefined;
  }
  if (field === 'mirrorSecondaryTargetId') {
    return action.type === 'BATTLE_CAST' ? action.mirrorSecondaryTargetId : undefined;
  }
  if (field === 'replaceEnchantment') {
    return action.type === 'BATTLE_CAST' || action.type === 'BATTLE_USE_ITEM'
      || action.type === 'BATTLE_USE_ABILITY'
      ? action.replaceEnchantment : undefined;
  }
  return action.type === 'BATTLE_CAST' || action.type === 'BATTLE_USE_ITEM'
    || action.type === 'BATTLE_USE_ABILITY'
    ? action.skipRound : undefined;
}

const FIELD_ORDER: CombatTargetField[] = [
  'spellId', 'effectId', 'actImmediately', 'targetId', 'secondaryTargetId',
  'artifactSecondTargetId', 'mirrorTargetId', 'mirrorSecondaryTargetId', 'destination',
  'replaceEnchantment', 'skipRound',
  'counterId',
  'school',
];

function activeSide(battle: BattleState): BattleSide | null {
  return battle.stacks.find((stack) => stack.id === battle.currentStackId)?.side ?? null;
}

function activeHero(battle: BattleState): BattleHero | null {
  const side = activeSide(battle);
  return side === 'attacker' ? battle.attackerHero
    : side === 'defender' ? battle.defenderHero : null;
}

function itemAt(battle: BattleState, inventorySlot: number): ItemInstance | null {
  const item = activeHero(battle)?.inventory[inventorySlot];
  return item && typeof item !== 'string' ? item : null;
}

export function beginSpellTargeting(
  battle: BattleState, spellId: SpellId, effectId?: string,
): CombatTargetDraft | null {
  const options = legalSpellCasts(battle).filter((action) => action.spellId === spellId);
  const narrowed = effectId ? options.filter((action) => action.effectId === effectId) : options;
  if (!options.length) return null;
  const keepEffect = Boolean(effectId && narrowed.length);
  return {
    source: { kind: 'spell', spellId }, options,
    selections: keepEffect ? { effectId } : {}, positions: [],
    history: keepEffect ? [{ selections: {}, positions: [] }] : [],
  };
}

export function beginItemTargeting(
  battle: BattleState, inventorySlot: number,
): CombatTargetDraft | null {
  const options = legalCombatItemUses(battle)
    .filter((action) => action.inventorySlot === inventorySlot);
  if (!options.length) return null;
  return {
    source: { kind: 'item', inventorySlot }, options,
    selections: {}, positions: [], history: [],
  };
}

export function beginAbilityTargeting(
  actions: Action[], abilityId: AbilityId,
): CombatTargetDraft | null {
  const options = actions.filter((action): action is Extract<
    Action, { type: 'BATTLE_USE_ABILITY' }
  > => action.type === 'BATTLE_USE_ABILITY' && action.abilityId === abilityId);
  if (!options.length) return null;
  return {
    source: { kind: 'ability', abilityId }, options,
    selections: {}, positions: [], history: [],
  };
}

export function beginKnackTargeting(battle: BattleState): CombatTargetDraft | null {
  const options = legalKnackActions(battle);
  if (!options.length) return null;
  return { source: { kind: 'knack' }, options, selections: {}, positions: [], history: [] };
}

export function matchingTargetActions(draft: CombatTargetDraft): CombatTargetAction[] {
  return draft.options.filter((action) => FIELD_ORDER.every((field) =>
    !Object.hasOwn(draft.selections, field)
      || targetValueEqual(actionTargetValue(action, field), draft.selections[field])));
}

function targetValueEqual(
  left: CombatTargetValue | undefined, right: CombatTargetValue | undefined,
): boolean {
  if (left && right && typeof left === 'object' && typeof right === 'object') {
    return left.x === right.x && left.y === right.y;
  }
  return left === right;
}

function resolvedSpellId(battle: BattleState, source: CombatTargetSource): SpellId | null {
  if (source.kind === 'knack') return null;
  if (source.kind === 'ability') return null;
  if (source.kind === 'spell') {
    if (source.spellId === 'echo') return battle.lastSpellCast?.spellId ?? null;
    return source.spellId ?? null;
  }
  const item = itemAt(battle, source.inventorySlot!);
  if (!item) return null;
  const definition = ITEMS[item.id];
  if (definition.behavior === 'echo') return battle.lastSpellCast?.spellId ?? null;
  if (definition.behavior === 'counterfeit') {
    const side = activeSide(battle);
    const enemy = side === 'attacker' ? 'defender' : 'attacker';
    return side ? battle.lastHeroSpellAction[enemy]?.action.spellId ?? null : null;
  }
  if (definition.behavior === 'scroll') {
    return definition.spellId ?? item.storedSpellId as SpellId | undefined ?? null;
  }
  return definition.behavior === 'walls' ? 'wallOfTheMaker' : null;
}

export function requiredCombatPositions(
  battle: BattleState, source: CombatTargetSource, draft?: CombatTargetDraft,
): number {
  if (source.kind === 'knack') return requiredKnackPositions(battle);
  const spellId = source.kind === 'ability'
    ? draft?.selections.spellId as SpellId | undefined : resolvedSpellId(battle, source);
  if (spellId === 'clockworkDouble') return 1;
  if (spellId === 'blink') return draft?.selections.actImmediately === false ? 2 : 1;
  if (spellId === 'thicket') return 3;
  if (spellId === 'wildcall') return 1;
  if (spellId === 'bulwark' || spellId === 'windShear') return 1;
  if (spellId === 'bramblelash') {
    const hero = activeHero(battle);
    return hero?.upgradedSpells.includes(spellId) ? 0 : 1;
  }
  if (source.kind === 'item') {
    const item = itemAt(battle, source.inventorySlot!);
    if (item && ITEMS[item.id].behavior === 'teleportAlly') {
      return draft?.selections.secondaryTargetId ? 2 : 1;
    }
  }
  if (spellId !== 'wallOfTheMaker') return 0;
  const hero = activeHero(battle);
  return 3 + (hero ? artifactEffectTotal(hero, 'extra_wall')
    + artifactEffectTotal(hero, 'created_hex_bonus') : 0);
}

export function legalCombatPlacements(battle: BattleState, draft?: CombatTargetDraft): Coord[] {
  if (draft?.source.kind === 'knack') return legalKnackPlacements(battle, draft.positions);
  const spellId = draft?.source.kind === 'ability'
    ? draft.selections.spellId as SpellId | undefined
    : draft ? resolvedSpellId(battle, draft.source) : null;
  const placementIndex = draft?.positions.length ?? 0;
  if ((spellId === 'bulwark' || spellId === 'windShear') && draft) {
    const unique = new Map(matchingTargetActions(draft).flatMap((action) =>
      action.positions?.slice(0, 1) ?? []).map((position) =>
      [`${position.x},${position.y}`, position] as const));
    return [...unique.values()];
  }
  const primaryId = draft?.selections.targetId as string | undefined;
  const secondaryId = draft?.selections.secondaryTargetId as string | undefined;
  const targetId = spellId === 'blink' && placementIndex === 1 ? secondaryId : primaryId;
  const selectedTarget = targetId ? battle.stacks.find((candidate) => candidate.id === targetId) : null;
  const hero = activeHero(battle);
  const wildcallPlan = spellId === 'wildcall' && hero
    ? wildcallSummonPlan(battle, hero, isUpgraded(battle, hero, 'wildcall')) : null;
  const target = spellId === 'bramblelash' && selectedTarget
    ? { ...selectedTarget, unitId: 'yeoman' as const }
    : wildcallPlan && battle.stacks[0]
      ? { ...battle.stacks[0], unitId: wildcallPlan.unitId }
      : selectedTarget;
  const item = draft?.source.kind === 'item'
    ? itemAt(battle, draft.source.inventorySlot!) : null;
  const looseThread = Boolean(item && ITEMS[item.id].behavior === 'teleportAlly');
  const looseThreadTarget = looseThread && placementIndex === 1 && secondaryId
    ? battle.stacks.find((candidate) => candidate.id === secondaryId) : target;
  const exclusions = spellId === 'blink' || looseThread
    ? placementIndex === 0 ? [primaryId] : [primaryId, secondaryId]
    : [];
  const occupied = new Set([
    ...occupiedByStacks(battle.stacks.filter((stack) => !exclusions.includes(stack.id))),
    ...battle.obstacles.map((coord) => `${coord.x},${coord.y}`),
    ...battle.tiles.map((tile) => `${tile.position.x},${tile.position.y}`),
  ]);
  if (spellId === 'blink' && placementIndex === 1 && primaryId && draft?.positions[0]) {
    const primary = battle.stacks.find((candidate) => candidate.id === primaryId);
    if (primary) for (let offset = 0; offset < UNITS[primary.unitId].hexSize; offset += 1) {
      occupied.add(`${draft.positions[0].x + offset},${draft.positions[0].y}`);
    }
  }
  if (looseThread && placementIndex === 1 && primaryId && draft?.positions[0]) {
    const primary = battle.stacks.find((candidate) => candidate.id === primaryId);
    if (primary) for (let offset = 0; offset < UNITS[primary.unitId].hexSize; offset += 1) {
      occupied.add(`${draft.positions[0].x + offset},${draft.positions[0].y}`);
    }
  }
  return Array.from({ length: BATTLE_ROWS }, (_, y) =>
    Array.from({ length: BATTLE_COLS }, (_, x) => ({ x, y })))
    .flat().filter((coord) => {
      if (spellId === 'bramblelash' && selectedTarget && target
          && !stacksAdjacent(selectedTarget, { ...target, id: 'bramble-placement', position: coord })) {
        return false;
      }
      return (looseThreadTarget ?? target) ? footprintFits((looseThreadTarget ?? target)!, coord, occupied, new Set())
        : !occupied.has(`${coord.x},${coord.y}`);
    });
}

export function combatTargetStage(
  battle: BattleState, draft: CombatTargetDraft,
): CombatTargetStage {
  const matches = matchingTargetActions(draft);
  for (const field of FIELD_ORDER) {
    if (!Object.hasOwn(draft.selections, field)
        && matches.some((action) => Object.hasOwn(action, field)
          && actionTargetValue(action, field) !== undefined)) return field;
  }
  const required = requiredCombatPositions(battle, draft.source, draft);
  if (required > 0 && draft.positions.length < required) return 'positions';
  return 'confirm';
}

export function combatTargetChoices(
  draft: CombatTargetDraft, field: CombatTargetField,
): CombatTargetValue[] {
  const values = matchingTargetActions(draft)
    .filter((action) => Object.hasOwn(action, field))
    .map((action) => actionTargetValue(action, field))
    .filter((value): value is CombatTargetValue => value !== undefined);
  if (field === 'destination') {
    const unique = new Map(values.map((value) => {
      const coord = value as Coord;
      return [`${coord.x},${coord.y}`, coord] as const;
    }));
    return [...unique.values()];
  }
  return [...new Set(values)];
}

export function combatTargetDestinations(draft: CombatTargetDraft): Coord[] {
  return combatTargetStagePlaceholder(draft) === 'destination'
    ? combatTargetChoices(draft, 'destination') as Coord[] : [];
}

export function chooseCombatTarget(
  draft: CombatTargetDraft, field: CombatTargetField, value: CombatTargetValue,
): CombatTargetDraft {
  return {
    ...draft,
    selections: { ...draft.selections, [field]: value },
    history: [...draft.history, {
      selections: { ...draft.selections }, positions: draft.positions.map((position) => ({ ...position })),
    }],
  };
}

export function toggleCombatPosition(
  battle: BattleState, draft: CombatTargetDraft, position: Coord,
): CombatTargetDraft {
  const key = `${position.x},${position.y}`;
  if (!legalCombatPlacements(battle, draft).some((candidate) =>
    candidate.x === position.x && candidate.y === position.y)) return draft;
  const exists = draft.positions.some((candidate) =>
    candidate.x === position.x && candidate.y === position.y);
  const required = requiredCombatPositions(battle, draft.source, draft);
  const positions = exists
    ? draft.positions.filter((candidate) => `${candidate.x},${candidate.y}` !== key)
    : draft.positions.length < required ? [...draft.positions, { ...position }] : draft.positions;
  if (positions === draft.positions) return draft;
  return {
    ...draft, positions,
    history: [...draft.history, {
      selections: { ...draft.selections }, positions: draft.positions.map((candidate) => ({ ...candidate })),
    }],
  };
}

export function backCombatTarget(draft: CombatTargetDraft): CombatTargetDraft {
  const previous = draft.history.at(-1);
  if (!previous) return draft;
  return {
    ...draft, selections: previous.selections, positions: previous.positions,
    history: draft.history.slice(0, -1),
  };
}

export function confirmedCombatTargetAction(
  battle: BattleState, draft: CombatTargetDraft,
): CombatTargetAction | null {
  if (combatTargetStage(battle, draft) !== 'confirm') return null;
  const option = matchingTargetActions(draft)[0];
  if (!option) return null;
  const action = { ...option, ...draft.selections } as CombatTargetAction;
  if (!draft.positions.length) return action;
  return { ...action, positions: draft.positions };
}

export function combatTargetStackIds(draft: CombatTargetDraft): string[] {
  const stage = FIELD_ORDER.find((field) => field === combatTargetStagePlaceholder(draft));
  if (stage !== 'targetId' && stage !== 'secondaryTargetId'
      && stage !== 'artifactSecondTargetId' && stage !== 'mirrorTargetId'
      && stage !== 'mirrorSecondaryTargetId') return [];
  return combatTargetChoices(draft, stage).map(String);
}

// Kept battle-independent so board highlighting never needs to duplicate option filtering.
function combatTargetStagePlaceholder(draft: CombatTargetDraft): CombatTargetField | null {
  const matches = matchingTargetActions(draft);
  return FIELD_ORDER.find((field) => !Object.hasOwn(draft.selections, field)
    && matches.some((action) => Object.hasOwn(action, field)
      && actionTargetValue(action, field) !== undefined)) ?? null;
}

export function combatTargetName(battle: BattleState, source: CombatTargetSource): string {
  if (source.kind === 'spell') return SPELLS[source.spellId!].name;
  if (source.kind === 'ability') return ABILITY_PRESENTATION[source.abilityId!].name;
  if (source.kind === 'knack') return currentKnack(battle)?.definition.name ?? 'Faction Knack';
  return itemName(itemAt(battle, source.inventorySlot!)!);
}

export function combatTargetFace(
  battle: BattleState, source: CombatTargetSource,
): 'Standard' | 'Upgraded' | 'Item' | 'Ability' | 'Knack' {
  const hero = activeHero(battle);
  if (source.kind === 'ability') return 'Ability';
  if (source.kind === 'knack') return 'Knack';
  if (source.kind === 'item') {
    const item = itemAt(battle, source.inventorySlot!);
    if (!item) return 'Item';
    const definition = ITEMS[item.id];
    if (definition.behavior === 'scroll') return item.plus ? 'Upgraded' : 'Standard';
    if (definition.behavior === 'echo') return battle.lastSpellCast?.plus ? 'Upgraded' : 'Standard';
    return 'Item';
  }
  if (!hero) return 'Standard';
  const spellId = source.spellId!;
  const definition = SPELLS[spellId];
  const plus = isUpgraded(battle, hero, spellId)
    || (definition.kind === 'twister' && skillRank(hero, 'twicetold') >= 2);
  return plus ? 'Upgraded' : 'Standard';
}

export function combatTargetCost(battle: BattleState, source: CombatTargetSource): string {
  const hero = activeHero(battle);
  if (source.kind === 'ability') return '1 company action';
  if (source.kind === 'knack') return '0 mana · 1 shared hero act';
  if (source.kind === 'spell' && hero) {
    const side = activeSide(battle)!;
    const mana = spellManaCost(battle, side, hero, source.spellId!);
    const free = SPELLS[source.spellId!].kind === 'twister'
      && skillRank(hero, 'twicetold') >= 1 && !battle.twisterFreeUsed[side];
    return `${mana} mana · ${free ? 'free Twister hero act' : '1 hero act'}`;
  }
  if (source.kind === 'item' && hero) {
    const side = activeSide(battle)!;
    const preserved = skillRank(hero, 'alchemist') >= 2 && !battle.itemPreserved[side];
    const free = skillRank(hero, 'alchemist') >= 1 && battle.itemUses[side] === 0;
    return `1 item (${preserved ? 'preserved' : 'consumed'}) · ${free ? 'free first item act' : '1 hero act'}`;
  }
  return 'Unavailable';
}

export function combatTargetConsequence(
  battle: BattleState, draft: CombatTargetDraft,
): string {
  const spellId = resolvedSpellId(battle, draft.source);
  const face = combatTargetFace(battle, draft.source);
  let text: string;
  if (draft.source.kind === 'ability') {
    text = ABILITY_PRESENTATION[draft.source.abilityId!].description;
  } else if (draft.source.kind === 'knack') {
    const current = currentKnack(battle);
    text = current ? current.definition.ranks[current.rank].effectText : 'Unavailable Knack.';
  } else if (draft.source.kind === 'item') {
    const item = itemAt(battle, draft.source.inventorySlot!);
    text = item ? ITEMS[item.id].description : 'Unavailable item.';
  } else {
    const definition = SPELLS[spellId ?? draft.source.spellId!];
    text = face === 'Upgraded' ? definition.plus : definition.base;
  }
  const details: string[] = [];
  const stackLabel = (id?: string) => {
    const stack = battle.stacks.find((candidate) => candidate.id === id);
    return stack ? `${UNITS_NAME(stack)} (${stack.side})` : null;
  };
  const primary = stackLabel(draft.selections.targetId as string | undefined);
  const secondary = stackLabel(draft.selections.secondaryTargetId as string | undefined);
  if (primary) details.push(`primary: ${primary}`);
  if (secondary) details.push(`secondary: ${secondary}`);
  if (draft.selections.effectId) details.push(`effect: ${effectTargetLabel(battle, String(draft.selections.effectId))}`);
  if (draft.selections.counterId) details.push(`counter: ${String(draft.selections.counterId)}`);
  if (draft.selections.school) details.push(`school: ${String(draft.selections.school)}`);
  if (draft.selections.replaceEnchantment !== undefined) {
    details.push(`replace slot ${Number(draft.selections.replaceEnchantment) + 1}`);
  }
  if (draft.selections.skipRound !== undefined) details.push(`skip round ${draft.selections.skipRound}`);
  if (draft.selections.actImmediately !== undefined) details.push(
    draft.selections.actImmediately ? 'branch: act immediately' : 'branch: teleport two companies',
  );
  const destination = draft.selections.destination as Coord | undefined;
  if (destination) details.push(`destination: (${destination.x},${destination.y})`);
  if (draft.positions.length) details.push(`hexes: ${draft.positions.map((p) => `${p.x},${p.y}`).join(' · ')}`);
  return `${text}${details.length ? ` ${details.join(' · ')}.` : ''}`;
}

function UNITS_NAME(stack: BattleStack): string {
  // Avoid importing presentation state; unit ids remain stable and readable in deterministic evidence.
  return stack.unitId.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase());
}

export function effectTargetLabel(battle: BattleState, effectId: string): string {
  const [kind, owner, ...rest] = effectId.split(':');
  if (kind === 'counter') {
    const stack = battle.stacks.find((candidate) => candidate.id === owner);
    return `${rest[0]} ${stack?.counters[rest[0] as keyof typeof stack.counters] ?? 0} · ${stack ? UNITS_NAME(stack) : owner}`;
  }
  if (kind === 'timed') {
    const stack = battle.stacks.find((candidate) => candidate.id === owner);
    const effect = stack?.effects.find((candidate) => candidate.id === rest.join(':'));
    return `${effect ? SPELLS[effect.spellId].name : rest.join(':')} · ${stack ? UNITS_NAME(stack) : owner}`;
  }
  const effect = battle.enchantments[owner as BattleSide]
    ?.find((candidate) => candidate.id === rest.join(':'));
  return `${effect ? SPELLS[effect.spellId].name : rest.join(':')} · ${owner}`;
}

export function combatTargetStagePrompt(
  battle: BattleState, draft: CombatTargetDraft,
): string {
  const stage = combatTargetStage(battle, draft);
  if (stage === 'effectId') return 'Choose the counter, timed effect, or enchantment.';
  if (stage === 'spellId') return 'Choose the creature spell.';
  if (stage === 'actImmediately') return 'Choose the Upgraded branch: act immediately or teleport two companies.';
  if (stage === 'targetId') return 'Choose the primary company on the battlefield.';
  if (stage === 'secondaryTargetId') {
    return resolvedSpellId(battle, draft.source) === 'overgrow'
      ? 'Choose the adjacent company to exclude.' : 'Choose the secondary company.';
  }
  if (stage === 'artifactSecondTargetId') return 'Choose the Cracked Prism copy target.';
  if (stage === 'mirrorTargetId') return 'Choose the Mirror Hall copy target.';
  if (stage === 'mirrorSecondaryTargetId') return 'Choose the copied spell’s secondary company.';
  if (stage === 'destination') return 'Choose the explicit destination hex on the battlefield.';
  if (stage === 'replaceEnchantment') return 'Choose which occupied enchantment slot to replace.';
  if (stage === 'skipRound') return 'Choose the future round this company will skip.';
  if (stage === 'counterId') return 'Choose Burn, Chill, Hex, or Bloom as the conversion result.';
  if (stage === 'school') return 'Choose Rite, Craft, Grave, or Wild.';
  if (stage === 'positions') {
    return `Choose ${requiredCombatPositions(battle, draft.source, draft) - draft.positions.length} more empty hex${requiredCombatPositions(battle, draft.source, draft) - draft.positions.length === 1 ? '' : 'es'}.`;
  }
  return 'Review the exact cost and consequence, then confirm.';
}

export function combatTargetCoverageFamilies(): readonly string[] {
  const families = new Set<string>(['global-confirm']);
  for (const spell of Object.values(SPELLS).filter((entry) =>
    entry.kind !== 'adventure' && entry.kind !== 'topology')) {
    if (spell.effectOperation) families.add('effect-operation');
    if (spell.kind === 'enchantment') families.add('enchantment-replacement');
    if (spell.id === 'wallOfTheMaker' || spell.id === 'thicket'
        || spell.id === 'clockworkDouble' || spell.id === 'blink'
        || spell.id === 'wildcall' || spell.id === 'bramblelash') families.add('hex-placement');
    if (spell.id === 'rally' || spell.id === 'reflect' || spell.id === 'borrowShape'
        || spell.id === 'overgrow') families.add('multi-stage');
    else if (['rally', 'blessing', 'sanctuary', 'oathOfIron', 'consecrate', 'ward',
      'quicksilver', 'mournersVeil', 'remembrance', 'clarion', 'bloom', 'shedSkin',
      'loyalUntoDeath', 'trial', 'forgeSpark', 'wither', 'graveChill', 'dirge',
      'quiet', 'oathbind', 'brittle', 'gale'].includes(spell.id)) families.add('unit-target');
    if (spell.id === 'hourglassCrack' || spell.id === 'theTurningYear') families.add('parameter-choice');
  }
  for (const item of Object.values(ITEMS).filter((entry) => entry.use === 'combat')) {
    if (item.target === 'positions') families.add('hex-placement');
    if (item.target === 'enchantment') families.add('effect-operation');
    if (item.target === 'ally' || item.target === 'enemy' || !item.target) families.add('unit-target');
  }
  return [...families].sort();
}

export function unsupportedCombatTargetFields(actions: CombatTargetAction[]): string[] {
  const supported = new Set([
    'type', 'spellId', 'inventorySlot', 'abilityId', 'effectId', 'targetId', 'secondaryTargetId',
    'artifactSecondTargetId', 'mirrorTargetId', 'mirrorSecondaryTargetId', 'destination',
    'replaceEnchantment', 'skipRound', 'positions', 'actImmediately', 'counterId', 'school',
  ]);
  return [...new Set(actions.flatMap((action) => Object.keys(action))
    .filter((field) => !supported.has(field)))].sort();
}

export function activeCombatResonanceLabel(battle: BattleState): string {
  const hero = activeHero(battle);
  return hero ? effectiveResonances(battle, hero).join(' + ') : '';
}
