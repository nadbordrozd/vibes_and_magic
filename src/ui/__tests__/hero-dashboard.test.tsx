import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HERO_DASHBOARD_MANIFEST } from '../../../assets/heroDashboardManifest';
import { ASSET_MANIFEST, assetId } from '../../../assets/manifest';
import { ARTIFACTS, EQUIPMENT_SLOTS } from '../../content/artifacts';
import { HEROES } from '../../content/heroes';
import { ITEMS } from '../../content/items';
import { SKILLS } from '../../content/skills';
import { UNITS } from '../../content/units';
import { apply, createGame } from '../../core/game';
import { effectivePrimaryStat } from '../../core/artifacts';
import type { EquipmentSlotId, Hero } from '../../core/types';
import { actionSave, replaySave, stateHash } from '../persistence';
import { ArtifactSprite, ItemSprite, UnitPortrait } from '../assets';
import {
  AdventureHeroDetails, compatibleDashboardSlots, dashboardEquipmentPreview,
} from '../components/AdventureHeroDetails';
import { ContentIcon } from '../components/ContentIcon';
import { ResourceIcon } from '../components/ResourceToken';

function fixture(): [ReturnType<typeof createGame>, Hero] {
  const state = createGame({ seed: 5903, mapId: 'grand-muster', p1: 'human', p2: 'dormant' });
  const hero = state.players.p1.hero!;
  hero.skills = {
    logistics: 3, scouting: 3, attunement: 3, ritualist: 3, provisioner: 3, command: 3,
  };
  const unitIds = Object.keys(UNITS) as Array<keyof typeof UNITS>;
  hero.army = Array.from({ length: 7 }, (_, index) => ({
    unitId: unitIds[index], count: index + 2,
  }));
  const equipped: Record<EquipmentSlotId, keyof typeof ARTIFACTS> = {
    head: 'circletOfSmallRites', cloak: 'travelersCloak', amulet: 'seamstone',
    weapon: 'skirmishersBlade', shield: 'yeomansBuckler', armor: 'quiltedCoat',
    ring1: 'ringOfSmallMendings', ring2: 'ringOfTheSteadyHand', boots: 'cobblersPride',
    misc1: 'tailorsNeedle', misc2: 'mirrorMask',
  };
  for (const slot of EQUIPMENT_SLOTS) hero.artifacts.equipment[slot] = {
    id: equipped[slot], ...(equipped[slot] === 'seamstone' ? { chosenSchool: 'rite' as const } : {}),
  };
  hero.artifacts.backpack = [{ id: 'queensAmber' }, { id: 'patternbook' }, { id: 'quietHorseshoe' }];
  hero.inventory = [
    { id: 'spellScroll', storedSpellId: 'rally', plus: true },
    { id: 'waybread' }, { id: 'potionOfVigor' }, { id: 'tradeGoods', origin: { x: 2, y: 3 } },
    null, null, null, null,
  ];
  hero.adventureEffects.nextBattleLuckBonus = 1;
  hero.adventureEffects.nextBattleMeterBonus = 10;
  return [state, hero];
}

function renderDashboard(state: ReturnType<typeof createGame>, hero: Hero): string {
  return renderToStaticMarkup(<AdventureHeroDetails state={state} hero={hero}
    dispatch={() => undefined} onClose={() => undefined} onOpenSpellbook={() => undefined}
    onUseItem={() => undefined} onUnstitch={() => undefined} />);
}

describe('one-screen hero dashboard', () => {
  it('renders the binding DOM order with no tabs or hidden category panels', () => {
    const [state, hero] = fixture();
    const before = JSON.stringify(state);
    const html = renderDashboard(state, hero);
    const regions = [
      'identity', 'primary-stats', 'vitals-status', 'army', 'secondary-skills',
      'equipped-artifacts', 'artifact-backpack', 'consumables', 'special-controls',
    ];
    let cursor = -1;
    for (const region of regions) {
      const next = html.indexOf(`data-dashboard-region="${region}"`);
      expect(next, region).toBeGreaterThan(cursor);
      cursor = next;
    }
    expect(html).not.toContain('hero-details-tabs');
    expect(html).not.toContain('role="tab"');
    expect(html).not.toContain('aria-pressed');
    expect(html).toContain('Close · return to map');
    expect(JSON.stringify(state)).toBe(before);
  });

  it('uses every required graphical family and exact occupied/empty position counts', () => {
    const [state, hero] = fixture();
    const html = renderDashboard(state, hero);
    expect(html).toContain(HERO_DASHBOARD_MANIFEST[`hero-portrait:${hero.definitionId}`].file);
    expect(html).toContain(HERO_DASHBOARD_MANIFEST[`hero-specialty:${hero.specialtyId}`].file);
    for (const id of ['attack', 'defense', 'knowledge'] as const) {
      expect(html).toContain(HERO_DASHBOARD_MANIFEST[`hero-primary-stat:${id}`].file);
    }
    expect(html).toContain('assets/icons/effects/spell-power.png');
    for (const id of ['movement', 'mana', 'experience', 'luck'] as const) {
      expect(html).toContain(HERO_DASHBOARD_MANIFEST[`hero-vital:${id}`].file);
    }
    for (const [id, rank] of Object.entries(hero.skills)) {
      expect(html).toContain(`${SKILLS[id as keyof typeof SKILLS].name}`);
      expect(html).toContain(`Rank ${rank}`);
    }
    for (let slot = 1; slot <= 7; slot += 1) expect(html).toContain(`Army slot ${slot},`);
    for (const slot of EQUIPMENT_SLOTS) {
      expect(html).toContain(`Equipped ${slot.startsWith('ring') ? `Ring ${slot.at(-1)}`
        : slot.startsWith('misc') ? `Misc ${slot.at(-1)}`
          : `${slot[0].toUpperCase()}${slot.slice(1)}`}`);
    }
    for (let slot = 1; slot <= 8; slot += 1) expect(html).toContain(`Consumable position ${slot},`);
    expect((html.match(/class="unit-portrait/g) ?? [])).toHaveLength(7);
    expect((html.match(/Backpack position \d,/g) ?? [])).toHaveLength(3);
  });

  it('renders all 36 portrait and specialty consumer pairs without a fallback route', () => {
    const [state, base] = fixture();
    for (const definition of Object.values(HEROES)) {
      const hero: Hero = { ...base, name: definition.name, definitionId: definition.id,
        faction: definition.faction, specialtyId: definition.specialty.id };
      const html = renderDashboard(state, hero);
      expect(html, definition.id).toContain(HERO_DASHBOARD_MANIFEST[`hero-portrait:${definition.id}`].file);
      expect(html, definition.id).toContain(HERO_DASHBOARD_MANIFEST[`hero-specialty:${definition.specialty.id}`].file);
      expect(html, definition.id).not.toContain('hero-portrait-fallback');
    }
  });

  it('renders every reused skill, artifact, item, unit, and resource family without fallback', () => {
    const html = renderToStaticMarkup(<>
      {(Object.keys(SKILLS) as Array<keyof typeof SKILLS>).map((id) =>
        <ContentIcon key={`skill-${id}`} kind="skill" id={id} decorative />)}
      {(Object.keys(ARTIFACTS) as Array<keyof typeof ARTIFACTS>).map((id) =>
        <ArtifactSprite key={`artifact-${id}`} artifactId={id} />)}
      {(Object.keys(ITEMS) as Array<keyof typeof ITEMS>).map((id) =>
        <ItemSprite key={`item-${id}`} itemId={id} />)}
      {(Object.keys(UNITS) as Array<keyof typeof UNITS>).map((id) =>
        <UnitPortrait key={`unit-${id}`} unitId={id} />)}
      {(['gold', 'timber', 'iron', 'essence'] as const).map((id) =>
        <ResourceIcon key={`resource-${id}`} resource={id} />)}
    </>);
    expect(Object.keys(SKILLS)).toHaveLength(21);
    expect(Object.keys(ARTIFACTS)).toHaveLength(90);
    expect(Object.keys(ITEMS)).toHaveLength(37);
    expect(Object.keys(UNITS)).toHaveLength(50);
    for (const resource of ['gold', 'timber', 'iron', 'essence'] as const) {
      expect(html).toContain(ASSET_MANIFEST[assetId.mapObject('pile', resource)].file);
    }
    expect(html).not.toMatch(/(?:artifact|item|unit-portrait|resource-icon)-fallback/);
  });

  it('uses effective primary stats and effective Knowledge for the visible mana maximum', () => {
    const [state, hero] = fixture();
    hero.attack = 4;
    hero.knowledge = 3;
    hero.artifacts.equipment.weapon = { id: 'swordOfTheFirstField' };
    hero.artifacts.equipment.amulet = { id: 'deepWellAmulet' };
    const html = renderDashboard(state, hero);
    expect(html).toContain(`Attack, ${effectivePrimaryStat(hero, 'attack')}: open stat details`);
    expect(html).toContain('Knowledge, 6: open stat details');
    expect(html).toContain(`Mana, ${hero.mana} / 60: open vital details`);
  });

  it('derives six or eight consumable positions from the core Provisioner helper', () => {
    const [state, hero] = fixture();
    hero.skills.provisioner = undefined;
    hero.inventory = Array(6).fill(null);
    const six = renderDashboard(state, hero);
    expect(six).toContain('Consumables · 0/6');
    expect(six).not.toContain('Consumable position 7,');
    hero.skills.provisioner = 3;
    const eight = renderDashboard(state, hero);
    expect(eight).toContain('Consumables · 0/8');
    expect(eight).toContain('Consumable position 8, empty');
  });

  it('keeps all item timings inspectable and exposes Use only after adventure-item detail', () => {
    const [state, hero] = fixture();
    const html = renderDashboard(state, hero);
    for (const slot of [0, 1, 2, 3]) {
      const item = hero.inventory[slot];
      if (!item || typeof item === 'string') continue;
      expect(html).toContain(`${ITEMS[item.id].use} timing: open item details`);
    }
    const source = readFileSync(new URL('../components/AdventureHeroDetails.tsx', import.meta.url), 'utf8');
    expect(source).toMatch(/onClick=\{\(event\) => openDetail\(\{ kind: 'item', slot \}/);
    expect(source).toContain("if (itemDefinition.use === 'adventure')");
    expect(source).toContain('Use item…');
    expect(source).not.toMatch(/hero-dashboard-item-grid[\s\S]{0,900}onUseItem\(/);
  });

  it('keeps exact typed equipment compatibility, displacement, and reducer outcomes', () => {
    const [state, hero] = fixture();
    hero.artifacts.backpack = [{ id: 'queensAmber' }, { id: 'patternbook' }];
    hero.artifacts.equipment.ring1 = { id: 'beggarsRing' };
    expect(compatibleDashboardSlots(hero, 0)).toEqual(['ring1', 'ring2']);
    expect(compatibleDashboardSlots(hero, 1)).toEqual(['misc1', 'misc2']);
    expect(dashboardEquipmentPreview(hero, 0, 'ring1'))
      .toContain("Beggar's Ring is displaced to the backpack");
    const next = apply(state, { type: 'EQUIP_ARTIFACT', heroId: hero.id,
      backpackIndex: 0, equipmentSlot: 'ring1' });
    const nextHero = next.players.p1.heroes.find((candidate) => candidate.id === hero.id)!;
    expect(nextHero.artifacts.equipment.ring1).toEqual({ id: 'queensAmber', chosenSchool: undefined });
    expect(nextHero.artifacts.backpack.at(-1)).toEqual({ id: 'beggarsRing' });

    const unequipped = apply(next, { type: 'UNEQUIP_ARTIFACT', heroId: hero.id,
      equipmentSlot: 'ring1' });
    const unequippedHero = unequipped.players.p1.heroes.find((candidate) => candidate.id === hero.id)!;
    expect(unequippedHero.artifacts.equipment.ring1).toBeNull();
    expect(unequippedHero.artifacts.backpack.at(-1)).toEqual({ id: 'queensAmber', chosenSchool: undefined });
    const saveJson = JSON.parse(JSON.stringify(actionSave(unequipped))) as ReturnType<typeof actionSave>;
    expect(saveJson.actionLog.slice(-2).map((action) => action.type))
      .toEqual(['EQUIP_ARTIFACT', 'UNEQUIP_ARTIFACT']);

    hero.artifacts.backpack = [{ id: 'seamstone' }];
    hero.artifacts.equipment.amulet = null;
    const seamed = apply(state, { type: 'EQUIP_ARTIFACT', heroId: hero.id,
      backpackIndex: 0, equipmentSlot: 'amulet', chosenSchool: 'wild' });
    expect(seamed.players.p1.heroes.find((candidate) => candidate.id === hero.id)!
      .artifacts.equipment.amulet).toEqual({ id: 'seamstone', chosenSchool: 'wild' });

    hero.artifacts.equipment.head = { id: 'leadenCrown' };
    expect(() => apply(state, { type: 'UNEQUIP_ARTIFACT', heroId: hero.id,
      equipmentSlot: 'head' })).toThrow('Visit any shrine and pay 5 essence');
  });

  it('replays a dashboard Split action from its five-field save JSON without state drift', () => {
    const state = createGame({ seed: 5903, mapId: 'grand-muster', p1: 'human', p2: 'dormant' });
    const hero = state.players.p1.hero!;
    expect(hero.army[0]!.count).toBeGreaterThan(1);
    expect(hero.army[6]).toBeNull();
    const next = apply(state, { type: 'SPLIT_ARMY', holder: { kind: 'hero', id: hero.id },
      sourceSlot: 0, destinationSlot: 6, count: 3 });
    const save = JSON.parse(JSON.stringify(actionSave(next))) as ReturnType<typeof actionSave>;
    expect(Object.keys(save).sort()).toEqual(['actionLog', 'contentHash', 'difficulty', 'mapId', 'seed']);
    expect(save.actionLog.at(-1)).toEqual({ type: 'SPLIT_ARMY',
      holder: { kind: 'hero', id: hero.id }, sourceSlot: 0, destinationSlot: 6, count: 3 });
    expect(stateHash(replaySave(save))).toBe(stateHash(next));
  });

  it('keeps ordinary graphical activation detail-first and every consequence explicitly labeled', () => {
    const source = readFileSync(new URL('../components/AdventureHeroDetails.tsx', import.meta.url), 'utf8');
    for (const kind of [
      'identity', 'specialty', 'primary', 'vital', 'company', 'skill',
      'equipment', 'backpack', 'item', 'status',
    ]) expect(source).toContain(`kind: '${kind}'`);
    for (const action of [
      'Split company…', 'Equip…', 'Unequip to backpack…', 'Use item…',
      'Open adventure spellbook', 'DECLARE_RESONANCE', 'CHOOSE_NEXT_OMEN',
      'DIG_CACHE', 'Unstitch to an explored tile',
    ]) expect(source).toContain(action);
    expect(source).toContain('aria-disabled={!compatible || undefined}');
    expect(source).toContain("artifact.class === 'burden'");
    expect(source).toContain("item.id === 'seamstone'");
  });

  it('codifies close-first focus, nested focus containment, Escape layering, and 390 CSS', () => {
    const source = readFileSync(new URL('../components/AdventureHeroDetails.tsx', import.meta.url), 'utf8');
    const css = readFileSync(new URL('../styles/game.css', import.meta.url), 'utf8');
    expect(source).toContain('closeRef.current?.focus()');
    expect(source).toContain('priorFocus.current === null');
    expect(source).toContain("event.key === 'Escape'");
    expect(source).toContain('event.stopImmediatePropagation()');
    expect(source).toContain("document.querySelector('.spell-glossary-popover')");
    expect(source).toContain(".spell-glossary-popover, .hero-dashboard-nested-backdrop");
    expect(source).toContain("event.key !== 'Tab'");
    expect(source).toContain('detailInvoker.current.focus()');
    expect(source).not.toContain('HeroDetailsTab');
    expect(css).toContain('width: min(1180px, calc(100vw - 32px))');
    expect(css).toContain('@media (max-width: 560px)');
    expect(css).toContain('width: calc(100vw - 16px)');
    expect(css).toContain('max-height: calc(100dvh - 16px)');
    expect(css).toContain('grid-template-columns: repeat(4, minmax(0, 1fr))');
    expect(css).toContain('min-height: 44px');
    expect(css).not.toContain('.hero-details-tabs');
  });
});
