import { ITEMS, itemName } from '../content/items';
import { SPELLS } from '../content/spells';
import { BATTLE_COLS, BATTLE_ROWS } from '../content/constants';
import { artifactEffectTotal } from '../core/artifacts';
import { skillRank } from '../core/heroBehaviors';
import { occupiedByStacks } from '../core/combat/footprint';
import { legalCombatItemUses } from '../core/combat/items';
import {
  effectiveResonances, isUpgraded, legalSpellCasts,
} from '../core/combat/spells';
import { spellManaCost } from '../core/combat/spellModifiers';
import type {
  Action, BattleHero, BattleSide, BattleStack, BattleState, Coord, ItemInstance, SpellId,
} from '../core/types';

export type CombatTargetAction = Extract<
  Action, { type: 'BATTLE_CAST' | 'BATTLE_USE_ITEM' }
>;
export type CombatTargetField =
  'effectId' | 'targetId' | 'secondaryTargetId' | 'replaceEnchantment' | 'skipRound';
export type CombatTargetStage = CombatTargetField | 'positions' | 'confirm';
export type CombatTargetValue = string | number;

export interface CombatTargetSource {
  kind: 'spell' | 'item';
  spellId?: SpellId;
  inventorySlot?: number;
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

const FIELD_ORDER: CombatTargetField[] = [
  'effectId', 'targetId', 'secondaryTargetId', 'replaceEnchantment', 'skipRound',
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

export function matchingTargetActions(draft: CombatTargetDraft): CombatTargetAction[] {
  return draft.options.filter((action) => FIELD_ORDER.every((field) =>
    !Object.hasOwn(draft.selections, field) || action[field] === draft.selections[field]));
}

function resolvedSpellId(battle: BattleState, source: CombatTargetSource): SpellId | null {
  if (source.kind === 'spell') {
    if (source.spellId === 'echo') return battle.lastSpellCast?.spellId ?? null;
    return source.spellId ?? null;
  }
  const item = itemAt(battle, source.inventorySlot!);
  if (!item) return null;
  const definition = ITEMS[item.id];
  if (definition.behavior === 'echo') return battle.lastSpellCast?.spellId ?? null;
  if (definition.behavior === 'scroll') {
    return definition.spellId ?? item.storedSpellId as SpellId | undefined ?? null;
  }
  return definition.behavior === 'walls' ? 'wallOfTheMaker' : null;
}

export function requiredCombatPositions(
  battle: BattleState, source: CombatTargetSource,
): number {
  const spellId = resolvedSpellId(battle, source);
  if (spellId === 'thicket') return 3;
  if (spellId !== 'wallOfTheMaker') return 0;
  const hero = activeHero(battle);
  return 3 + (hero ? artifactEffectTotal(hero, 'extra_wall') : 0);
}

export function legalCombatPlacements(battle: BattleState): Coord[] {
  const occupied = new Set([
    ...occupiedByStacks(battle.stacks),
    ...battle.obstacles.map((coord) => `${coord.x},${coord.y}`),
    ...battle.tiles.map((tile) => `${tile.position.x},${tile.position.y}`),
  ]);
  return Array.from({ length: BATTLE_ROWS }, (_, y) =>
    Array.from({ length: BATTLE_COLS }, (_, x) => ({ x, y })))
    .flat().filter((coord) => !occupied.has(`${coord.x},${coord.y}`));
}

export function combatTargetStage(
  battle: BattleState, draft: CombatTargetDraft,
): CombatTargetStage {
  const matches = matchingTargetActions(draft);
  for (const field of FIELD_ORDER) {
    if (!Object.hasOwn(draft.selections, field)
        && matches.some((action) => Object.hasOwn(action, field))) return field;
  }
  const required = requiredCombatPositions(battle, draft.source);
  if (required > 0 && draft.positions.length < required) return 'positions';
  return 'confirm';
}

export function combatTargetChoices(
  draft: CombatTargetDraft, field: CombatTargetField,
): CombatTargetValue[] {
  return [...new Set(matchingTargetActions(draft)
    .filter((action) => Object.hasOwn(action, field))
    .map((action) => action[field] as CombatTargetValue))];
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
  if (!legalCombatPlacements(battle).some((candidate) =>
    candidate.x === position.x && candidate.y === position.y)) return draft;
  const exists = draft.positions.some((candidate) =>
    candidate.x === position.x && candidate.y === position.y);
  const required = requiredCombatPositions(battle, draft.source);
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
  return draft.positions.length ? { ...action, positions: draft.positions } : action;
}

export function combatTargetStackIds(draft: CombatTargetDraft): string[] {
  const stage = FIELD_ORDER.find((field) => field === combatTargetStagePlaceholder(draft));
  if (stage !== 'targetId' && stage !== 'secondaryTargetId') return [];
  return combatTargetChoices(draft, stage).map(String);
}

// Kept battle-independent so board highlighting never needs to duplicate option filtering.
function combatTargetStagePlaceholder(draft: CombatTargetDraft): CombatTargetField | null {
  const matches = matchingTargetActions(draft);
  return FIELD_ORDER.find((field) => !Object.hasOwn(draft.selections, field)
    && matches.some((action) => Object.hasOwn(action, field))) ?? null;
}

export function combatTargetName(battle: BattleState, source: CombatTargetSource): string {
  if (source.kind === 'spell') return SPELLS[source.spellId!].name;
  return itemName(itemAt(battle, source.inventorySlot!)!);
}

export function combatTargetFace(
  battle: BattleState, source: CombatTargetSource,
): 'Base' | 'Plus' | 'Item' {
  const hero = activeHero(battle);
  if (source.kind === 'item') {
    const item = itemAt(battle, source.inventorySlot!);
    if (!item) return 'Item';
    const definition = ITEMS[item.id];
    if (definition.behavior === 'scroll') return item.plus ? 'Plus' : 'Base';
    if (definition.behavior === 'echo') return battle.lastSpellCast?.plus ? 'Plus' : 'Base';
    return 'Item';
  }
  if (!hero) return 'Base';
  const spellId = source.spellId!;
  const definition = SPELLS[spellId];
  const plus = isUpgraded(battle, hero, spellId)
    || (definition.kind === 'twister' && skillRank(hero, 'twicetold') >= 2);
  return plus ? 'Plus' : 'Base';
}

export function combatTargetCost(battle: BattleState, source: CombatTargetSource): string {
  const hero = activeHero(battle);
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
  if (draft.source.kind === 'item') {
    const item = itemAt(battle, draft.source.inventorySlot!);
    text = item ? ITEMS[item.id].description : 'Unavailable item.';
  } else {
    const definition = SPELLS[spellId ?? draft.source.spellId!];
    text = face === 'Plus' ? definition.plus : definition.base;
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
  if (draft.selections.replaceEnchantment !== undefined) {
    details.push(`replace slot ${Number(draft.selections.replaceEnchantment) + 1}`);
  }
  if (draft.selections.skipRound !== undefined) details.push(`skip round ${draft.selections.skipRound}`);
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
  if (stage === 'targetId') return 'Choose the primary company on the battlefield.';
  if (stage === 'secondaryTargetId') {
    return resolvedSpellId(battle, draft.source) === 'overgrow'
      ? 'Choose the adjacent company to exclude.' : 'Choose the secondary company.';
  }
  if (stage === 'replaceEnchantment') return 'Choose which occupied enchantment slot to replace.';
  if (stage === 'skipRound') return 'Choose the future round this company will skip.';
  if (stage === 'positions') {
    return `Choose ${requiredCombatPositions(battle, draft.source) - draft.positions.length} more empty hex${requiredCombatPositions(battle, draft.source) - draft.positions.length === 1 ? '' : 'es'}.`;
  }
  return 'Review the exact cost and consequence, then confirm.';
}

export function combatTargetCoverageFamilies(): readonly string[] {
  const families = new Set<string>(['global-confirm']);
  for (const spell of Object.values(SPELLS).filter((entry) =>
    entry.kind !== 'adventure' && entry.kind !== 'topology')) {
    if (spell.effectOperation) families.add('effect-operation');
    if (spell.kind === 'enchantment') families.add('enchantment-replacement');
    if (spell.id === 'wallOfTheMaker' || spell.id === 'thicket') families.add('hex-placement');
    if (spell.id === 'rally' || spell.id === 'reflect' || spell.id === 'borrowShape'
        || spell.id === 'overgrow') families.add('multi-stage');
    else if (['rally', 'blessing', 'sanctuary', 'oathOfIron', 'consecrate', 'ward',
      'quicksilver', 'mournersVeil', 'remembrance', 'clarion', 'bloom', 'shedSkin',
      'loyalUntoDeath', 'trial', 'forgeSpark', 'wither', 'graveChill', 'dirge',
      'quiet', 'oathbind', 'brittle', 'gale'].includes(spell.id)) families.add('unit-target');
    if (spell.id === 'hourglassCrack') families.add('parameter-choice');
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
    'type', 'spellId', 'inventorySlot', 'effectId', 'targetId', 'secondaryTargetId',
    'replaceEnchantment', 'skipRound', 'positions',
  ]);
  return [...new Set(actions.flatMap((action) => Object.keys(action))
    .filter((field) => !supported.has(field)))].sort();
}

export function activeCombatResonanceLabel(battle: BattleState): string {
  const hero = activeHero(battle);
  return hero ? effectiveResonances(battle, hero).join(' + ') : '';
}
