import { mkdirSync } from 'node:fs';
import puppeteer, { type Page } from 'puppeteer-core';
import { makeArmy } from '../core/army';
import { createBattle } from '../core/combat/setup';
import { createBattleTile } from '../core/combat/tiles';
import { createGame } from '../core/game';
import type { GameState } from '../core/types';
import { castleEntrance } from '../core/map/occupancy';
import { actionSave } from '../ui/persistence';

const executablePath = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/google-chrome';
const baseUrl = process.env.BM_URL ?? 'http://127.0.0.1:5173/';
const output = '.pixel-work/review/ux';
mkdirSync(output, { recursive: true });

function adventureFixture(): GameState {
  const state = createGame({
    seed: 3401, mapId: 'grand-muster', difficulty: 'normal',
    p1: 'human', p2: 'dormant',
  });
  const hero = state.players.p1.hero!;
  hero.skills = { ...hero.skills, logistics: 3, scouting: 2, command: 1 };
  for (const spell of ['census', 'gate', 'falseColors'] as const) {
    if (!hero.knownSpells.includes(spell)) hero.knownSpells.push(spell);
  }
  hero.mana = Math.max(hero.mana, 30);
  hero.artifacts.backpack.push({ id: 'travelersCloak' }, { id: 'tinkersSpectacles' });
  hero.inventory[0] = { id: 'cartographersCase' };
  hero.inventory[1] = { id: 'potionOfVigor' };
  const neighbor = state.players.p1.heroes.find((candidate) => candidate.id !== hero.id);
  if (neighbor) neighbor.position = { x: hero.position.x + 1, y: hero.position.y };
  state.replay = [];
  return state;
}

function combatFixture(): GameState {
  const state = adventureFixture();
  const attacker = state.players.p1.hero!;
  const defender = structuredClone(attacker);
  defender.id = 'ux-review-defender';
  defender.name = 'The Lantern Host';
  defender.owner = 'p2';
  const [battle] = createBattle(
    makeArmy([
      { unitId: 'longbowman', count: 18 }, { unitId: 'bannerman', count: 8 },
      { unitId: 'lanceKnight', count: 5 }, { unitId: 'oriflammeWarden', count: 2 },
    ]),
    makeArmy([
      { unitId: 'candleWisps', count: 30 }, { unitId: 'couriers', count: 9 },
      { unitId: 'boneChoir', count: 5 }, { unitId: 'brides', count: 3 },
    ]),
    attacker, defender,
    {
      kind: 'hero', targetId: defender.id, destination: { x: 20, y: 20 },
      attackerHeroId: attacker.id, defenderHeroId: defender.id,
      defenderPlayerId: 'p2', battlefield: 'land', terrain: 'meadow',
    }, state.rng,
  );
  battle.obstacles = [];
  battle.obstacleProps = [];
  battle.tiles.push(
    createBattleTile(battle, 'resin', { x: 5, y: 3 }, 3, 'attacker'),
    createBattleTile(battle, 'undergrowth', { x: 6, y: 4 }, -1, 'defender', true),
  );
  state.battle = battle;
  state.phase = 'combat';
  state.replay = [];
  return state;
}

function moraleFixture(): GameState {
  const state = combatFixture();
  const battle = state.battle!;
  const stack = battle.stacks.find((candidate) => candidate.side === 'attacker'
    && candidate.count > 0)!;
  battle.currentStackId = stack.id;
  battle.order = [stack.id, ...battle.order.filter((id) => id !== stack.id)];
  stack.bonusActions = 1;
  stack.morale = 0;
  return state;
}

function choiceFixture(): GameState {
  const state = adventureFixture();
  const hero = state.players.p1.hero!;
  state.day = 2;
  state.players.p1.resources.gold = 0;
  state.pendingChoice = {
    kind: 'diplomacy', objectId: 'ux-guardian', playerId: 'p1', heroId: hero.id,
    disbandCost: 2400, recruitCost: 3600, canStandAside: true,
  };
  return state;
}

function hotSeatFixture(): GameState {
  const state = adventureFixture();
  state.players.p2.controller = 'human';
  return state;
}

function victoryFixture(): GameState {
  const state = adventureFixture();
  state.winner = 'p1';
  state.pendingChoice = null;
  return state;
}

function pickupFixture(): GameState {
  const state = adventureFixture();
  const hero = state.players.p1.hero!;
  hero.position = { x: 27, y: 8 };
  hero.movement = 2_000;
  state.players.p1.explored = [...new Set([
    ...state.players.p1.explored, '27,8', '28,8', '27,7', '28,7', '27,9', '28,9',
  ])];
  state.pendingChoice = null;
  return state;
}

function serviceFixture(): GameState {
  const state = adventureFixture();
  const hero = state.players.p1.hero!;
  hero.position = { x: 35, y: 27 };
  state.players.p1.explored = [...new Set([...state.players.p1.explored, '35,27'])];
  state.pendingChoice = null;
  return state;
}

function castleActionFixture(): GameState {
  const state = adventureFixture();
  const hero = state.players.p1.hero!;
  const castle = state.castles.find((candidate) => candidate.owner === 'p1'
    && candidate.faction === hero.faction)!;
  hero.position = castleEntrance(castle);
  castle.garrison = Array.from({ length: 7 }, () => null);
  state.players.p1.explored = [...new Set([
    ...state.players.p1.explored, `${hero.position.x},${hero.position.y}`,
  ])];
  state.pendingChoice = null;
  return state;
}

async function loadState(page: Page, state: GameState, selector: string): Promise<void> {
  const save = actionSave(state);
  await page.evaluate(({ persisted, initial }) => {
    localStorage.setItem('border-marches.save.v4', JSON.stringify(persisted));
    localStorage.setItem('border-marches.save.v4.initial', JSON.stringify(initial));
    localStorage.setItem('border-marches.save.v4.setup', JSON.stringify(initial.setup));
    localStorage.setItem('border-marches.save.v4.meta', JSON.stringify({
      savedAt: Date.now(), day: initial.day, week: initial.week,
      activePlayer: initial.players[initial.activePlayer].name,
    }));
  }, { persisted: save, initial: state });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.locator('.load-button').click();
  await page.waitForSelector(selector);
}

async function dismissObjective(page: Page): Promise<void> {
  if (!await page.$('.objective-primer')) return;
  await page.locator('.choice-dialog .primary').click();
  await page.waitForSelector('.objective-primer', { hidden: true });
}

async function auditVisibleControls(page: Page, screen: string): Promise<void> {
  const audit = await page.evaluate(() => {
    const unnamed: string[] = [];
    for (const node of document.querySelectorAll<HTMLElement>('button, select, input')) {
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      if (style.display !== 'none' && style.visibility !== 'hidden'
          && box.width > 0 && box.height > 0 && !(node.getAttribute('aria-label')
            || node.getAttribute('title') || node.textContent?.trim()
            || node.closest('label')?.textContent?.trim())) {
        unnamed.push(node.outerHTML.slice(0, 180));
      }
    }
    const unexplained: string[] = [];
    for (const node of document.querySelectorAll<HTMLButtonElement>('button:disabled')) {
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      if (style.display !== 'none' && style.visibility !== 'hidden'
          && box.width > 0 && box.height > 0 && !(node.title.trim()
            || node.dataset.disabledReason?.trim())) {
        unexplained.push(node.textContent?.trim() || node.outerHTML.slice(0, 120));
      }
    }
    return {
      unnamed, unexplained,
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  if (audit.unnamed.length || audit.unexplained.length || audit.horizontalOverflow > 2) {
    throw new Error(`${screen} UX audit failed: ${JSON.stringify(audit)}`);
  }
}

async function inspect(page: Page, selector: string): Promise<void> {
  await page.$eval(selector, (node) => node.dispatchEvent(new MouseEvent('contextmenu', {
    bubbles: true, cancelable: true,
  })));
  await page.waitForSelector('.inspection-card');
}

const browser = await puppeteer.launch({
  executablePath, headless: true, args: ['--disable-gpu'],
});

try {
  const page = await browser.newPage();
  page.on('pageerror', (error) => console.error(`browser page error: ${
    error instanceof Error ? error.message : String(error)
  }`));
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.goto(baseUrl, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await auditVisibleControls(page, 'menu');
  await page.screenshot({ path: `${output}/01-menu.png`, fullPage: true });
  await page.locator('.help-toggle').click();
  await page.waitForSelector('.help-dialog');
  await page.screenshot({ path: `${output}/02-menu-help.png` });
  await page.locator('.help-dialog .primary').click();

  const reviewAdventure = adventureFixture();
  const originalHeroId = reviewAdventure.players.p1.hero!.id;
  const adjacentHeroId = reviewAdventure.players.p1.heroes.find((hero) =>
    hero.id !== originalHeroId)!.id;
  await loadState(page, reviewAdventure, '.adventure-map');
  await page.waitForSelector('.choice-dialog');
  await page.screenshot({ path: `${output}/03-objective-primer.png` });
  await page.locator('.choice-dialog .primary').click();
  await page.waitForSelector('.choice-dialog', { hidden: true });
  await auditVisibleControls(page, 'adventure');
  const adventureMapAudit = await page.evaluate(() => ({
    fogInspectionLeaks: document.querySelectorAll('.terrain-unseen[data-inspect-kind]').length,
    selectedMarkers: document.querySelectorAll('.map-hero[data-selected="true"] .selected-hero-ring').length,
    castleHitboxes: document.querySelectorAll('.castle-map-object .castle-hitbox').length,
    entranceMarkers: document.querySelectorAll('.castle-map-object .entrance-marker').length,
  }));
  if (adventureMapAudit.fogInspectionLeaks !== 0 || adventureMapAudit.selectedMarkers !== 1
      || adventureMapAudit.castleHitboxes < 1 || adventureMapAudit.entranceMarkers < 1) {
    throw new Error(`Adventure spatial audit failed: ${JSON.stringify(adventureMapAudit)}`);
  }
  await page.screenshot({ path: `${output}/04-adventure.png` });

  const movePointerTo = async (selector: string): Promise<void> => {
    const node = await page.$(selector);
    const box = await node?.boundingBox();
    if (!node || !box) throw new Error(`Cannot point at ${selector}`);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  };
  await movePointerTo('.terrain-cell.terrain-seen.terrain-reachable[data-map-x="7"][data-map-y="7"]');
  await page.waitForFunction(() => document.querySelector('.destination-intent')
    ?.getAttribute('data-preview-kind') === 'safe');
  await page.screenshot({ path: `${output}/04e-safe-destination.png` });
  await movePointerTo('.terrain-cell.terrain-unseen[data-map-x="11"][data-map-y="10"]');
  await page.waitForFunction(() => document.querySelector('.destination-intent')
    ?.textContent?.includes('Explore unexplored terrain'));
  if (await page.$('.inspect-label')) {
    throw new Error('Fogged terrain exposed a hover inspection label');
  }
  await movePointerTo('.guardian-object .hero-hitbox, .guardian-object .sprite-hitbox');
  await page.waitForFunction(() => document.querySelector('.destination-intent')
    ?.getAttribute('data-preview-kind') === 'fight');
  const fightIntent = await page.$eval('.destination-intent', (node) => node.textContent ?? '');
  if (!fightIntent.includes('Fight') || !fightIntent.includes('crossed swords')) {
    throw new Error(`Guardian route does not explain the fight: ${fightIntent}`);
  }
  await page.screenshot({ path: `${output}/04f-fight-destination.png` });
  await movePointerTo('.castle-map-object .castle-hitbox');
  await page.waitForFunction(() => document.querySelector('.destination-intent')
    ?.getAttribute('data-preview-kind') === 'interaction');
  const castleIntent = await page.$eval('.destination-intent', (node) => node.textContent ?? '');
  if (!castleIntent.includes('Enter')) throw new Error(`Castle intent is unclear: ${castleIntent}`);
  const castleHitbox = await page.$('.castle-map-object .castle-hitbox');
  const castleBox = await castleHitbox?.boundingBox();
  if (!castleBox) throw new Error('Castle picture has no clickable bounds');
  await page.mouse.click(castleBox.x + castleBox.width / 2, castleBox.y + castleBox.height / 2);
  await page.waitForSelector('.castle-shortcuts .hero-present');
  const entranceAction = await page.$eval('.castle-shortcuts .hero-present', (node) =>
    node.textContent?.trim() ?? '');
  if (!entranceAction.startsWith('Enter')) {
    throw new Error(`Castle picture did not route the hero to its entrance: ${entranceAction}`);
  }
  await page.screenshot({ path: `${output}/04k-castle-entrance.png` });

  await inspect(page, '.terrain-cell.terrain-seen[data-map-x="7"][data-map-y="7"]');
  await page.screenshot({ path: `${output}/04g-terrain-inspection.png` });
  await page.locator('.inspection-close').click();
  await inspect(page, '.map-object-sprite .sprite-hitbox');
  await page.screenshot({ path: `${output}/04h-object-inspection.png` });
  await page.locator('.inspection-close').click();
  await inspect(page, '.guardian-object .sprite-hitbox');
  const guardianCard = await page.$eval('.inspection-card', (node) => node.textContent ?? '');
  if (/muster-|ux-review-|_/.test(guardianCard)) {
    throw new Error(`Guardian inspection exposes an authored identifier: ${guardianCard}`);
  }
  await page.screenshot({ path: `${output}/04i-guardian-inspection.png` });
  await page.locator('.inspection-close').click();

  await page.$eval(`.map-hero[data-inspect-id="${adjacentHeroId}"] .hero-hitbox`, (node) =>
    node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
  await page.waitForSelector(`.map-hero[data-inspect-id="${adjacentHeroId}"][data-selected="true"] .selected-hero-ring`);
  await page.$eval(`.map-hero[data-inspect-id="${originalHeroId}"] .hero-hitbox`, (node) =>
    node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
  await page.waitForSelector(`.map-hero[data-inspect-id="${originalHeroId}"][data-selected="true"] .selected-hero-ring`);
  await page.screenshot({ path: `${output}/04j-map-hero-selection.png` });
  await page.locator('.adventure-spell-button').click();
  await page.waitForSelector('.adventure-spellbook');
  await auditVisibleControls(page, 'adventure-spellbook');
  await page.screenshot({ path: `${output}/04c-adventure-spellbook.png` });
  await page.locator('.adventure-spellbook header button').click();
  await page.waitForSelector('.adventure-spellbook', { hidden: true });
  await page.$eval('.hero-panel', (panel) => {
    const button = [...panel.querySelectorAll<HTMLButtonElement>('button')]
      .find((candidate) => candidate.textContent?.includes('Exchange with'));
    if (!button) throw new Error('Adjacent-hero Exchange control is missing');
    button.click();
  });
  await page.waitForSelector('.exchange-screen');
  await auditVisibleControls(page, 'exchange');
  await page.screenshot({ path: `${output}/04d-exchange.png` });
  await page.locator('.exchange-screen .transfer-area .army-block:first-child .army-slot:not(:disabled)').click();
  await page.locator('.exchange-screen .transfer-area .army-block:last-child .army-slot:last-child').click();
  await page.waitForSelector('.transfer-dialog');
  await auditVisibleControls(page, 'exchange-company-confirmation');
  await page.screenshot({ path: `${output}/04d1-exchange-company-confirm.png` });
  await page.setViewport({ width: 700, height: 860, deviceScaleFactor: 1 });
  await auditVisibleControls(page, 'exchange-company-confirmation-narrow');
  await page.screenshot({ path: `${output}/04d2-exchange-company-confirm-narrow.png`, fullPage: true });
  await page.$eval('.transfer-dialog .dialog-actions button', (node) =>
    (node as HTMLButtonElement).focus());
  await page.keyboard.press('Enter');
  await page.waitForSelector('.transfer-dialog', { hidden: true });
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.locator('.item-transfer-side:first-child .army-slot:not(:disabled)').click();
  await page.locator('.item-transfer-side:last-child .army-slot:last-child').click();
  await page.waitForSelector('.transfer-dialog');
  await auditVisibleControls(page, 'exchange-item-confirmation');
  await page.screenshot({ path: `${output}/04d3-exchange-item-confirm.png` });
  await page.locator('.transfer-dialog .dialog-actions button').click();
  await page.locator('.exchange-screen .close-button').click();
  await page.waitForSelector('.exchange-screen', { hidden: true });
  await page.locator('.artifact-backpack > button').click();
  await page.waitForSelector('.equipment-dialog');
  await auditVisibleControls(page, 'equipment-destination');
  await page.screenshot({ path: `${output}/04d4-equipment-destination.png` });
  await page.setViewport({ width: 700, height: 860, deviceScaleFactor: 1 });
  await auditVisibleControls(page, 'equipment-destination-narrow');
  await page.screenshot({ path: `${output}/04d5-equipment-destination-narrow.png`, fullPage: true });
  await page.$eval('.equipment-dialog .dialog-actions button', (node) =>
    (node as HTMLButtonElement).focus());
  await page.keyboard.press('Enter');
  await page.waitForSelector('.equipment-dialog', { hidden: true });
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await inspect(page, '.hero-portrait');
  await page.screenshot({ path: `${output}/05-hero-inspection.png` });
  await page.locator('.inspection-close').click();
  await inspect(page, '.skill-summary article');
  await page.screenshot({ path: `${output}/06-skill-inspection.png` });
  await page.locator('.inspection-close').click();
  await inspect(page, '.artifact-backpack [data-inspect-kind="artifact"]');
  await page.screenshot({ path: `${output}/07-artifact-inspection.png` });
  await page.locator('.inspection-close').click();
  await inspect(page, '.castle-map-object .castle-hitbox');
  await page.screenshot({ path: `${output}/08-castle-inspection.png` });
  await page.locator('.inspection-close').click();
  await page.setViewport({ width: 800, height: 900, deviceScaleFactor: 1 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await auditVisibleControls(page, 'adventure-compact');
  const compactMapHeight = await page.$eval('.map-frame', (node) => node.getBoundingClientRect().height);
  if (compactMapHeight > 562) {
    throw new Error(`Compact adventure map is not a bounded viewport: ${compactMapHeight}px`);
  }
  await page.screenshot({ path: `${output}/08b-adventure-compact.png` });
  await page.$eval('.hero-panel', (node) => node.scrollIntoView({ block: 'start' }));
  await auditVisibleControls(page, 'adventure-compact-command');
  await page.screenshot({ path: `${output}/08c-adventure-compact-command.png` });
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.locator('.castle-shortcuts button').click();
  await page.waitForSelector('.castle-screen');
  await page.waitForFunction(() => [...document.querySelectorAll<HTMLImageElement>('.recruit-unit-portrait')]
    .every((image) => image.complete && image.naturalWidth > 0));
  await auditVisibleControls(page, 'castle');
  await page.screenshot({ path: `${output}/09-castle.png`, fullPage: true });

  await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1 });
  await auditVisibleControls(page, 'castle-compact');
  await page.screenshot({ path: `${output}/10-castle-compact.png` });

  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await loadState(page, choiceFixture(), '.choice-dialog');
  await auditVisibleControls(page, 'choice');
  await page.screenshot({ path: `${output}/11-choice.png` });
  await page.locator('.help-toggle').click();
  await page.waitForSelector('.help-dialog');
  await page.screenshot({ path: `${output}/12-choice-help.png` });

  await loadState(page, combatFixture(), '.combat-shell');
  await auditVisibleControls(page, 'combat');
  const rawAbility = await page.$$eval('.ability-list [data-inspect-kind="ability"]', (nodes) =>
    nodes.some((node) => (node.textContent ?? '').includes('_')));
  if (rawAbility) throw new Error('Combat exposes a raw ability identifier');
  await page.screenshot({ path: `${output}/13-combat.png` });
  await page.setViewport({ width: 800, height: 900, deviceScaleFactor: 1 });
  await auditVisibleControls(page, 'combat-compact');
  await page.screenshot({ path: `${output}/13a-combat-compact.png` });
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.locator('.spellbook-button').click();
  await page.waitForSelector('.spellbook');
  await auditVisibleControls(page, 'combat-spellbook');
  await page.screenshot({ path: `${output}/13b-combat-spellbook.png` });
  await inspect(page, '.spellbook .spell-card');
  await page.screenshot({ path: `${output}/13c-spell-inspection.png` });
  await page.locator('.inspection-close').click();
  await page.locator('.spellbook .spell-card button:not(:disabled)').click();
  await page.waitForSelector('.combat-targeting-banner');
  await auditVisibleControls(page, 'combat-spell-targeting');
  await page.screenshot({ path: `${output}/13d-combat-targeting.png` });
  await page.locator('.combat-targeting-controls button:not(:disabled)').click();
  await page.waitForSelector('.combat-targeting-banner', { hidden: true });
  await inspect(page, '.ability-list [data-inspect-kind="ability"]');
  await page.screenshot({ path: `${output}/14-ability-inspection.png` });
  await page.locator('.inspection-close').click();
  await inspect(page, '.battle-hex[data-inspect-kind="battleTile"]');
  await page.waitForSelector('.inspection-mechanics');
  await page.screenshot({ path: `${output}/15-battle-tile-inspection.png` });
  await page.locator('.inspection-close').click();
  await page.locator('.help-toggle').click();
  await page.waitForSelector('.help-dialog');
  await page.screenshot({ path: `${output}/16-combat-help.png` });
  await page.locator('.help-dialog .primary').click();
  await page.locator('.combat-actions .auto').click();
  await page.waitForSelector('.result-dialog');
  await auditVisibleControls(page, 'battle-result');
  const rawResultId = await page.$$eval('.battle-statistics tbody td:first-child', (cells) =>
    cells.some((cell) => /[a-z][A-Z]|_/.test(cell.textContent ?? '')));
  if (rawResultId) throw new Error('Battle result exposes a raw unit identifier');
  await page.screenshot({ path: `${output}/17-battle-result.png` });

  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await loadState(page, moraleFixture(), '.combat-shell');
  await page.$eval('.combat-actions', (node) => {
    const defend = [...node.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Defend') && !button.disabled);
    if (!defend) throw new Error('Morale fixture has no legal Defend action');
    defend.click();
  });
  await page.waitForSelector('.morale-rally');
  await new Promise((resolve) => setTimeout(resolve, 220));
  const moraleState = await page.evaluate(() => ({
    rally: document.querySelector('.morale-rally')?.getAttribute('aria-label') ?? '',
    log: document.querySelector('.battle-log p')?.textContent ?? '',
    active: document.querySelector('.battle-stack.active')?.getAttribute('data-inspect-id') ?? '',
  }));
  if (!moraleState.rally.includes('Act again') || !moraleState.log.includes('acts again')
      || !moraleState.active) {
    throw new Error(`Morale extra-action feedback is incomplete: ${JSON.stringify(moraleState)}`);
  }
  await page.screenshot({ path: `${output}/17b-morale-rally.png` });

  await loadState(page, hotSeatFixture(), '.adventure-map');
  await page.waitForSelector('.choice-dialog');
  await page.locator('.choice-dialog .primary').click();
  await page.waitForSelector('.choice-dialog', { hidden: true });
  await page.locator('.end-turn').click();
  await page.waitForSelector('.pass-device');
  if (await page.$('.end-turn-confirm')) throw new Error('End turn still asks for confirmation');
  await auditVisibleControls(page, 'hot-seat-pass');
  const passCopy = await page.$eval('.pass-device', (node) => node.textContent ?? '');
  if (!passCopy.includes(hotSeatFixture().players.p2.name)) {
    throw new Error('Hot-seat pass screen does not identify the next player by name');
  }
  await page.screenshot({ path: `${output}/18-hot-seat-pass.png` });

  await loadState(page, victoryFixture(), '.victory-dialog');
  await auditVisibleControls(page, 'campaign-victory');
  await page.screenshot({ path: `${output}/19-campaign-victory.png` });

  await loadState(page, pickupFixture(), '.pickup-eligible[data-inspect-id="muster-pile-1"]');
  await dismissObjective(page);
  await page.$eval('.pickup-eligible[data-inspect-id="muster-pile-1"]', (node) =>
    node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
  await page.waitForSelector('.pickup-eligible[data-inspect-id="muster-pile-1"]', { hidden: true });
  await page.waitForFunction(() => (document.querySelector('.message-strip')?.textContent ?? '')
    .toLowerCase().includes('collected'));
  await auditVisibleControls(page, 'resource-pickup-result');
  await page.screenshot({ path: `${output}/20-resource-pickup.png` });

  await loadState(page, serviceFixture(), '.map-service-card');
  await dismissObjective(page);
  const priorHeroSummary = await page.$eval('.hero-panel', (node) => node.textContent ?? '');
  await page.$eval('.map-service-card', (node) => {
    const button = [...node.querySelectorAll<HTMLButtonElement>('button')]
      .find((candidate) => candidate.textContent?.includes('Attend a lesson'));
    if (!button) throw new Error('Hedge School action is missing');
    button.click();
  });
  await page.waitForSelector('.choice-dialog');
  await auditVisibleControls(page, 'service-reward-choice');
  await page.screenshot({ path: `${output}/21-service-reward-choice.png` });
  await page.$eval('.choice-cards button:not(:disabled)', (button) =>
    (button as HTMLButtonElement).click());
  await page.waitForSelector('.choice-dialog', { hidden: true });
  await page.waitForFunction((before) => (document.querySelector('.hero-panel')?.textContent ?? '') !== before,
    {}, priorHeroSummary);
  await page.screenshot({ path: `${output}/22-service-reward-applied.png` });

  await loadState(page, castleActionFixture(), '.adventure-map');
  await dismissObjective(page);
  await page.locator('.castle-shortcuts button').click();
  await page.waitForSelector('.transfer-area .army-block');
  await page.locator('.transfer-area .army-block:first-child .army-slot').click();
  await page.locator('.transfer-area .army-block:last-child .army-slot:last-child').click();
  await page.waitForSelector('.transfer-dialog');
  await page.locator('.transfer-dialog .primary').click();
  await page.waitForSelector('.transfer-dialog', { hidden: true });
  await page.waitForFunction(() => (document.querySelector('.message-strip')?.textContent ?? '')
    .includes('transferred'));
  await page.$eval('.recruit-row', (row) => {
    const add = [...row.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.trim() === '+' && !button.disabled);
    if (!add) throw new Error('No recruitable creature is available in the walkthrough fixture');
    add.click();
  });
  await page.$eval('.recruit-row', (row) => {
    const hire = [...row.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.trim() === 'Hire' && !button.disabled);
    if (!hire) throw new Error('Recruitment did not become available after selecting a creature');
    hire.click();
  });
  await page.waitForFunction(() => (document.querySelector('.message-strip')?.textContent ?? '')
    .includes('recruited'));
  await auditVisibleControls(page, 'castle-transfer-and-recruit');
  await page.screenshot({ path: `${output}/23-castle-transfer-recruit.png`, fullPage: true });

  console.log(`UX review passed. Screenshots written to ${output}.`);
} finally {
  await browser.close();
}
