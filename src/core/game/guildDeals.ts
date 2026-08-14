import { FACTIONS } from '../../content/factions';
import { SPELLS, type SpellDefinition } from '../../content/spells';
import { nextRandom } from '../rng';
import type { FactionId, SpellId, SpellSchool } from '../types';
import type { SpellTier } from '../../content/v2/schema';

export const MAGE_GUILD_DEAL_SIZES = [4, 3, 3, 2, 2] as const;
export const MAGE_GUILD_CUMULATIVE_DEALS = [4, 7, 10, 12, 14] as const;

export interface MageGuildCandidate<Id extends string = SpellId> {
  id: Id;
  school: SpellSchool;
  tier?: SpellTier;
  acquisition?: { guild: boolean };
}

export interface MageGuildDeal<Id extends string = SpellId> {
  levels: readonly (readonly Id[])[];
  flat: readonly Id[];
  unavailableLevels: readonly SpellTier[];
}

function streamSeed(seed: number, key: string): number {
  return [...key].reduce(
    (value, character) => Math.imul(value ^ character.charCodeAt(0), 16777619) >>> 0,
    seed >>> 0,
  );
}
/**
 * Deals one complete city guild from a dedicated setup stream. No campaign RNG is consumed.
 * A high level with no eligible spell of its own tier is left unavailable rather than silently
 * breaking the level-4/5 guarantee; this is the expected transition behavior before P2 supplies
 * the first ordinary tier-5 entries.
 */
export function dealMageGuild<Id extends string>(
  faction: FactionId,
  seed: number,
  streamKey: string,
  candidates: readonly MageGuildCandidate<Id>[],
): MageGuildDeal<Id> {
  const nativeSchools = new Set<SpellSchool>(FACTIONS[faction].schools);
  const used = new Set<Id>();
  const levels: Id[][] = [];
  const unavailableLevels: SpellTier[] = [];
  let rng = streamSeed(seed, `mage-guild:${streamKey}:${faction}`);

  const roll = () => {
    let value: number;
    [value, rng] = nextRandom(rng);
    return value;
  };

  const eligible = (tier: SpellTier, native: boolean) => candidates.filter((candidate) =>
    candidate.tier === tier && candidate.acquisition?.guild
    && nativeSchools.has(candidate.school) === native && !used.has(candidate.id));

  const pickAtTier = (tier: SpellTier): Id | null => {
    const preferNative = roll() < 0.8;
    let pool = eligible(tier, preferNative);
    if (!pool.length) pool = eligible(tier, !preferNative);
    if (!pool.length) return null;
    const index = Math.floor(roll() * pool.length);
    return pool[index].id;
  };

  for (let rawLevel = 1; rawLevel <= 5; rawLevel += 1) {
    const level = rawLevel as SpellTier;
    const size = MAGE_GUILD_DEAL_SIZES[level - 1];
    const ownTierExists = candidates.some((candidate) => candidate.tier === level
      && candidate.acquisition?.guild && !used.has(candidate.id));
    if (level >= 4 && !ownTierExists) {
      levels.push([]);
      unavailableLevels.push(level);
      continue;
    }
    const stage: Id[] = [];
    for (let slot = 0; slot < size; slot += 1) {
      const forcedOwnTier = level >= 4 && slot === 0;
      const rolledTier = level === 1 || forcedOwnTier || roll() < 0.7
        ? level : (level - 1) as SpellTier;
      let id = pickAtTier(rolledTier);
      if (!id && level > 1) {
        const alternate = rolledTier === level ? (level - 1) as SpellTier : level;
        id = pickAtTier(alternate);
      }
      if (!id) break;
      used.add(id);
      stage.push(id);
    }
    if (stage.length !== size || (level >= 4
        && !stage.some((id) => candidates.find((candidate) => candidate.id === id)?.tier === level))) {
      stage.forEach((id) => used.delete(id));
      levels.push([]);
      unavailableLevels.push(level);
    } else {
      levels.push(stage);
    }
  }

  return { levels, flat: levels.flat(), unavailableLevels };
}

export function dealCurrentMageGuild(
  faction: FactionId, seed: number, streamKey: string,
): MageGuildDeal<SpellId> {
  return dealMageGuild(
    faction, seed, streamKey,
    Object.values(SPELLS) as Array<SpellDefinition & MageGuildCandidate>,
  );
}
