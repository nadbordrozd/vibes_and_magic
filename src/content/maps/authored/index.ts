/**
 * Promotion adds one generated import and one entry here. Portable bytes stay in adjacent
 * `.vam-map.json` assets; no terrain or entity data is transcribed into TypeScript.
 */
// PROMOTED_MAP_IMPORTS
export const BUILT_IN_PORTABLE_MAPS = [
  // PROMOTED_MAP_ENTRIES
] as const;
export type PortableBuiltInMapId = (typeof BUILT_IN_PORTABLE_MAPS)[number] extends {
  id: infer Id extends string;
} ? Id : never;
