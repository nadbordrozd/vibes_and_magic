import type { ReactNode } from 'react';
import { assetId, manifestEntry } from '../../../assets/manifest';
import type { ResourceId, Resources } from '../../core/types';
import { SemanticSpellText } from './SpellGlossary';

export const RESOURCE_NAMES: Record<ResourceId, string> = {
  gold: 'Gold', timber: 'Timber', iron: 'Iron', essence: 'Essence',
};

export function ResourceIcon({ resource, compact = false }: {
  resource: ResourceId; compact?: boolean;
}) {
  const entry = manifestEntry(assetId.mapObject('pile', resource));
  return entry ? (
    <img className={`resource-icon ${compact ? 'compact' : ''}`} src={entry.file}
      alt={RESOURCE_NAMES[resource]} title={RESOURCE_NAMES[resource]} />
  ) : <span className="resource-icon-fallback">{RESOURCE_NAMES[resource]}</span>;
}

export function ResourceAmount({ resource, amount, compact = false, name = false }: {
  resource: ResourceId; amount: number; compact?: boolean; name?: boolean;
}) {
  return (
    <span className={`resource-amount ${compact ? 'compact' : ''}`}>
      <ResourceIcon resource={resource} compact={compact} />
      <span className="resource-value">{amount.toLocaleString()}</span>
      {name && <span className="resource-name">{RESOURCE_NAMES[resource]}</span>}
    </span>
  );
}

export function ResourceCost({ cost, compact = false }: {
  cost: Partial<Resources>; compact?: boolean;
}) {
  return (
    <span className="resource-cost-list">
      {(Object.entries(cost) as Array<[ResourceId, number | undefined]>).flatMap(
        ([resource, amount]) => amount ? [
          <ResourceAmount key={resource} resource={resource} amount={amount} compact={compact} />,
        ] : [],
      )}
    </span>
  );
}

export function ResourceRichText({ children, semantic = false }: {
  children: string; semantic?: boolean;
}) {
  const expression = /\b(\d[\d,]*)\s+(gold|timber|iron|essence)\b|\b(gold|timber|iron|essence)\b/gi;
  const output: ReactNode[] = [];
  let cursor = 0;
  for (const match of children.matchAll(expression)) {
    const before = children.slice(cursor, match.index);
    output.push(semantic && before
      ? <SemanticSpellText key={`text-${cursor}`}>{before}</SemanticSpellText> : before);
    const resource = (match[2] ?? match[3]).toLowerCase() as ResourceId;
    output.push(match[1] ? (
      <ResourceAmount key={match.index} resource={resource}
        amount={Number(match[1].replaceAll(',', ''))} compact name />
    ) : (
      <span className="resource-inline-name" key={match.index}>
        <ResourceIcon resource={resource} compact />{match[2] ?? match[3]}
      </span>
    ));
    cursor = match.index! + match[0].length;
  }
  const after = children.slice(cursor);
  output.push(semantic && after
    ? <SemanticSpellText key={`text-${cursor}`}>{after}</SemanticSpellText> : after);
  return <>{output}</>;
}
