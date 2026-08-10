export const ADVENTURE_PROP_CATALOG = [
  {
    id: 'old-oak',
    label: 'Old Oak',
    group: 'obstacles',
    prop: 'old oak',
    footprint: { w: 1, h: 1 },
    anomaly: false,
  },
  {
    id: 'the-spool',
    label: 'The Spool',
    group: 'shape-props',
    prop: 'the Spool',
    footprint: { w: 2, h: 1 },
    anomaly: true,
  },
  {
    id: 'the-block',
    label: 'The Block',
    group: 'shape-props',
    prop: 'the Block',
    footprint: { w: 2, h: 1 },
    anomaly: true,
  },
] as const;

export type AdventurePropDefinition = typeof ADVENTURE_PROP_CATALOG[number];
export type AdventurePropId = AdventurePropDefinition['id'];

export function adventurePropById(id: string): AdventurePropDefinition | undefined {
  return ADVENTURE_PROP_CATALOG.find((entry) => entry.id === id);
}

export function adventurePropByName(prop: string): AdventurePropDefinition | undefined {
  return ADVENTURE_PROP_CATALOG.find((entry) => entry.prop === prop);
}
