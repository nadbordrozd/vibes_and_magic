import type {
  ContentAssetRequirement, ContentAssetSemantics, ContentAssetMode,
  ResolvedContentAsset,
} from './schema';

function semanticParts(semantics: ContentAssetSemantics): readonly (string | number)[] {
  switch (semantics.family) {
    case 'spell': return [semantics.family, semantics.school, semantics.tier];
    case 'skill': return [semantics.family, semantics.skillFamily];
    case 'knack': return [semantics.family, semantics.faction];
    case 'creature': return [semantics.family, semantics.culture, semantics.tier];
    case 'artifact': return [semantics.family, semantics.artifactClass, semantics.slot];
    case 'item': return [semantics.family, semantics.itemKind];
    case 'site': return [semantics.family, semantics.siteKind];
    case 'lexicon': return [semantics.family, semantics.category];
  }
}

export function developmentPlaceholderId(semantics: ContentAssetSemantics): string {
  return `content-placeholder:${semanticParts(semantics).join(':')}`;
}

export function resolveContentAsset(
  requirement: ContentAssetRequirement,
  nativeAssetIds: ReadonlySet<string>,
  mode: ContentAssetMode,
): ResolvedContentAsset {
  if (!requirement.canonicalId.trim() || !requirement.accessibleName.trim()
      || !requirement.visualSubject.trim()
      || !requirement.nativeAssetId.trim()) {
    throw new Error('Content asset requirements need identity, visual subject, semantic text, and asset ID');
  }
  if (nativeAssetIds.has(requirement.nativeAssetId)) {
    return { kind: 'native', assetId: requirement.nativeAssetId };
  }
  if (mode === 'release') {
    throw new Error(`Release asset missing for ${requirement.canonicalId}: ${requirement.nativeAssetId}`);
  }
  if (requirement.introducedBy !== 'docs-60-67') {
    throw new Error(`Existing content cannot use a development placeholder: ${requirement.canonicalId}`);
  }
  return {
    kind: 'placeholder',
    placeholderId: developmentPlaceholderId(requirement.semantics),
    semantics: requirement.semantics,
  };
}

export function validateContentAssets(
  requirements: readonly ContentAssetRequirement[],
  nativeAssetIds: ReadonlySet<string>,
  mode: ContentAssetMode,
): ResolvedContentAsset[] {
  const canonicalIds = new Set<string>();
  const nativeOwners = new Map<string, string>();
  return requirements.map((requirement) => {
    if (canonicalIds.has(requirement.canonicalId)) {
      throw new Error(`Duplicate content asset requirement: ${requirement.canonicalId}`);
    }
    canonicalIds.add(requirement.canonicalId);
    const resolved = resolveContentAsset(requirement, nativeAssetIds, mode);
    if (resolved.kind === 'native') {
      const owner = nativeOwners.get(resolved.assetId);
      if (owner) {
        throw new Error(`Native asset ${resolved.assetId} is shared by ${owner} and ${requirement.canonicalId}`);
      }
      nativeOwners.set(resolved.assetId, requirement.canonicalId);
    }
    return resolved;
  });
}
