import { castleEntrance } from '../map/occupancy';
import { lintMap } from '../../tools/mapLint';
import { convertEditorMapDocument } from './runtime';
import type { EditorMapDiagnostic, EditorMapDocument } from './types';
import { validateEditorMapDocument } from './validation';

/** Shared zero-error launch/promotion/CI gate for a normalized portable document. */
export function validateEditorMapForPlay(document: EditorMapDocument): EditorMapDiagnostic[] {
  const diagnostics = validateEditorMapDocument(document);
  if (diagnostics.some((item) => item.severity === 'error')) return diagnostics;
  const converted = convertEditorMapDocument(document, 1, { requirePlayable: false });
  const castleStarts = converted.setup.castles.map(castleEntrance);
  const starts = [
    ...castleStarts,
    ...converted.setup.heroes.map((hero) => ({ ...hero.position })),
  ].filter((position, index, values) => values.findIndex((candidate) =>
    candidate.x === position.x && candidate.y === position.y) === index);
  return [
    ...diagnostics,
    ...lintMap(converted.map, starts, castleStarts).map((issue): EditorMapDiagnostic => ({
      code: `map-lint.${issue.code}`,
      severity: 'error',
      stage: 'playable',
      target: { kind: 'document' },
      message: issue.message,
    })),
  ];
}
