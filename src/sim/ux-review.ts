import { mkdirSync } from 'node:fs';
import puppeteer, { type Page } from 'puppeteer-core';
import { makeArmy } from '../core/army';
import { createBattle } from '../core/combat/setup';
import { createBattleTile } from '../core/combat/tiles';
import { createGame } from '../core/game';
import type { GameState, PlayerId } from '../core/types';
import { castleEntrance } from '../core/map/occupancy';
import { actionSave } from '../ui/persistence';
import { combatAbilityFixtures } from './combat-action-fixtures';
import { pendingChoiceFixtures } from './pending-choice-fixtures';

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
      { unitId: 'ferry', count: 3 }, { unitId: 'couriers', count: 9 },
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
  const actor = battle.stacks.find((stack) => stack.id === 'attacker-0')!;
  battle.currentStackId = actor.id;
  battle.order = [actor.id, ...battle.order.filter((id) => id !== actor.id)];
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

type Controller = GameState['players'][PlayerId]['controller'];

function resultHeroFixture(
  attackerController: Controller,
  defenderController: Controller,
  attackerWins: boolean,
): GameState {
  const state = createGame({
    seed: 3462 + Number(attackerWins), mapId: 'border-marches', difficulty: 'normal',
    p1: attackerController, p2: defenderController,
  });
  const attacker = state.players.p1.hero!;
  const defender = state.players.p2.hero!;
  attacker.army = attackerWins
    ? makeArmy([{ unitId: 'oriflammeWyvern', count: 40 }])
    : makeArmy([{ unitId: 'yeoman', count: 1 }]);
  defender.army = attackerWins
    ? makeArmy([{ unitId: 'tinSoldier', count: 1 }])
    : makeArmy([{ unitId: 'ferry', count: 40 }]);
  const [battle] = createBattle(
    attacker.army, defender.army, attacker, defender,
    {
      kind: 'hero', targetId: defender.id, destination: defender.position,
      attackerHeroId: attacker.id, defenderHeroId: defender.id,
      defenderPlayerId: 'p2', battlefield: 'land', terrain: 'meadow',
    }, state.rng,
  );
  battle.obstacles = []; battle.obstacleProps = [];
  const humanSide = attackerController === 'human' ? 'attacker' : 'defender';
  const current = battle.stacks.find((stack) => stack.side === humanSide)!;
  battle.currentStackId = current.id;
  battle.order = [current.id, ...battle.order.filter((id) => id !== current.id)];
  state.battle = battle; state.phase = 'combat'; state.pendingChoice = null; state.replay = [];
  return state;
}

function guardianResultFixture(): GameState {
  const state = createGame({ seed: 3465, p1: 'human', p2: 'ai' });
  const attacker = state.players.p1.hero!;
  attacker.army = makeArmy([{ unitId: 'oriflammeWyvern', count: 40 }]);
  const guardian = state.map.objects.find((object) => object.kind === 'guardian'
    && object.protects)!;
  if (guardian.kind !== 'guardian') throw new Error('Guardian result fixture missing');
  guardian.army = [{ unitId: 'tinSoldier', count: 1 }];
  guardian.drop = { id: 'potionOfVigor' };
  const [battle] = createBattle(
    attacker.army, guardian.army, attacker, null,
    {
      kind: 'guardian', targetId: guardian.id, destination: guardian.position,
      attackerHeroId: attacker.id, completeMoveTo: guardian.position,
      battlefield: 'land', terrain: 'meadow',
    }, state.rng,
  );
  battle.obstacles = []; battle.obstacleProps = [];
  state.battle = battle; state.phase = 'combat'; state.pendingChoice = null; state.replay = [];
  return state;
}

function castleResultFixture(): GameState {
  const state = createGame({ seed: 3466, p1: 'human', p2: 'ai' });
  const attacker = state.players.p1.hero!;
  const castle = state.castles.find((candidate) => candidate.owner === 'p2')!;
  attacker.army = makeArmy([{ unitId: 'oriflammeWyvern', count: 40 }]);
  castle.garrison = makeArmy([{ unitId: 'tinSoldier', count: 1 }]);
  const [battle] = createBattle(
    attacker.army, castle.garrison, attacker, null,
    {
      kind: 'castle', targetId: castle.id, destination: castle.position,
      attackerHeroId: attacker.id, defenderPlayerId: 'p2',
      battlefield: 'land', terrain: 'meadow',
    }, state.rng,
  );
  battle.obstacles = []; battle.obstacleProps = [];
  state.battle = battle; state.phase = 'combat'; state.pendingChoice = null; state.replay = [];
  return state;
}

function withdrawalResultFixture(): GameState {
  const state = resultHeroFixture('human', 'ai', true);
  state.players.p1.resources.gold = 100_000;
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
  hero.army = makeArmy([
    { unitId: 'yeoman', count: 9 }, { unitId: 'longbowman', count: 4 },
  ]);
  hero.skills.warden = 1;
  castle.garrison = makeArmy([
    { unitId: 'yeoman', count: 2 }, { unitId: 'bannerman', count: 6 },
  ]);
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
      overflowing: [...document.querySelectorAll<HTMLElement>('body *')].flatMap((node) => {
        const box = node.getBoundingClientRect();
        return box.right > document.documentElement.clientWidth + 2
          ? [`${node.tagName.toLowerCase()}.${node.className.toString().replaceAll(' ', '.')}: ${Math.round(box.left)}..${Math.round(box.right)}`]
          : [];
      }).slice(0, 12),
    };
  });
  if (audit.unnamed.length || audit.unexplained.length || audit.horizontalOverflow > 2) {
    throw new Error(`${screen} UX audit failed: ${JSON.stringify(audit)}`);
  }
}

async function auditChoiceDialog(page: Page, screen: string): Promise<void> {
  const audit = await page.$eval('.choice-dialog', (dialog) => {
    const box = dialog.getBoundingClientRect();
    const unnamed = [...dialog.querySelectorAll<HTMLElement>('button, select, input')]
      .filter((node) => !(node.getAttribute('aria-label') || node.getAttribute('title')
        || node.textContent?.trim() || node.closest('label')?.textContent?.trim()))
      .map((node) => node.outerHTML.slice(0, 180));
    const unexplained = [...dialog.querySelectorAll<HTMLButtonElement>('button:disabled')]
      .filter((node) => !(node.title.trim() || node.dataset.disabledReason?.trim()))
      .map((node) => node.textContent?.trim() || node.outerHTML.slice(0, 120));
    return {
      unnamed, unexplained,
      outsideViewport: Math.max(0, -box.left) + Math.max(0, box.right - window.innerWidth),
      internalOverflow: dialog.scrollWidth - dialog.clientWidth,
    };
  });
  if (audit.unnamed.length || audit.unexplained.length || audit.outsideViewport > 2
      || audit.internalOverflow > 2) {
    throw new Error(`${screen} choice-dialog audit failed: ${JSON.stringify(audit)}`);
  }
}

async function inspect(page: Page, selector: string): Promise<void> {
  await page.$eval(selector, (node) => node.dispatchEvent(new MouseEvent('contextmenu', {
    bubbles: true, cancelable: true,
  })));
  await page.waitForSelector('.inspection-card');
}

async function capturePendingChoiceMatrix(page: Page): Promise<void> {
  for (const fixture of pendingChoiceFixtures()) {
    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
    await loadState(page, fixture.state, '.choice-dialog');
    const evidence = await page.$eval('.choice-dialog', (node) => ({
      copy: node.textContent ?? '',
      inspectionTargets: node.querySelectorAll('[data-inspect-kind][data-inspect-id]').length,
      disabledReasons: [...node.querySelectorAll<HTMLButtonElement>('button:disabled')]
        .map((button) => button.dataset.disabledReason || button.title).filter(Boolean),
    }));
    for (const fragment of fixture.expected) {
      if (!evidence.copy.includes(fragment)) {
        throw new Error(`${fixture.name} choice omitted ${JSON.stringify(fragment)}: ${evidence.copy}`);
      }
    }
    for (const reason of fixture.disabledReasons ?? []) {
      if (!evidence.disabledReasons.includes(reason)) {
        throw new Error(`${fixture.name} choice omitted disabled reason ${JSON.stringify(reason)}: ${JSON.stringify(evidence.disabledReasons)}`);
      }
    }
    if (evidence.inspectionTargets < fixture.minimumInspectionTargets) {
      throw new Error(`${fixture.name} exposes ${evidence.inspectionTargets}/${fixture.minimumInspectionTargets} inspection targets`);
    }
    if (fixture.minimumInspectionTargets > 0) {
      await inspect(page, '.choice-dialog [data-inspect-kind][data-inspect-id]');
      await page.locator('.inspection-close').click();
      await page.waitForSelector('.inspection-card', { hidden: true });
    }
    await auditVisibleControls(page, `choice-${fixture.name}-desktop`);
    await page.screenshot({
      path: `${output}/choice-${fixture.name}-desktop.png`, fullPage: true,
    });
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await auditChoiceDialog(page, `choice-${fixture.name}-narrow`);
    await page.screenshot({
      path: `${output}/choice-${fixture.name}-narrow.png`, fullPage: false,
    });
  }
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
}

async function captureAttackPrediction(page: Page, state: GameState): Promise<void> {
  const battle = state.battle!;
  const actor = battle.stacks.find((stack) => stack.id === battle.currentStackId)!;
  const target = battle.stacks.find((stack) => stack.side !== actor.side && stack.count > 0)!;
  const selector = `.battle-hex.attackable[data-occupant-id="${target.id}"]`;
  await page.$eval(selector, (node) => node.dispatchEvent(new MouseEvent('contextmenu', {
    bubbles: true, cancelable: true,
  })));
  await page.waitForSelector('.attack-prediction');
  const evidence = await page.evaluate(({ targetId, actorId }) => ({
    copy: document.querySelector('.attack-prediction')?.textContent ?? '',
    targetHexes: document.querySelectorAll(
      `.battle-hex.attack-preview-target[data-occupant-id="${targetId}"]`,
    ).length,
    originHexes: document.querySelectorAll(
      `.battle-hex.attack-preview-origin[data-occupant-id="${actorId}"]`,
    ).length,
  }), { targetId: target.id, actorId: actor.id });
  for (const fragment of [
    'Damage', 'Casualties', 'Ranged / range', 'Adjacency', 'Walls', 'Retaliation',
    'Origin / direction', 'Origin footprint', 'Target footprint',
  ]) if (!evidence.copy.includes(fragment)) {
    throw new Error(`Attack prediction omitted ${JSON.stringify(fragment)}: ${evidence.copy}`);
  }
  if (evidence.targetHexes !== 2 || evidence.originHexes !== 1) {
    throw new Error(`Attack footprint preview is incomplete: ${JSON.stringify(evidence)}`);
  }
  await auditVisibleControls(page, 'attack-prediction-desktop');
  await page.screenshot({ path: `${output}/combat-attack-prediction-desktop.png`, fullPage: true });
  await page.setViewport({ width: 800, height: 900, deviceScaleFactor: 1 });
  await auditVisibleControls(page, 'attack-prediction-narrow');
  await page.screenshot({ path: `${output}/combat-attack-prediction-narrow.png`, fullPage: true });
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
}

async function captureCombatAbilityMatrix(page: Page): Promise<void> {
  for (const { name, abilityId, state } of combatAbilityFixtures()) {
    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
    await loadState(page, state, `.combat-abilities [data-ability-control="${abilityId}"]`);
    const selector = `.combat-abilities [data-ability-control="${abilityId}"]`;
    const control = await page.$eval(selector, (node) => ({
      text: node.textContent?.trim() ?? '',
      inspectKind: node.getAttribute('data-inspect-kind'),
      inspectId: node.getAttribute('data-inspect-id'),
    }));
    if (!control.text || control.text.includes('_') || control.inspectKind !== 'ability'
        || control.inspectId !== abilityId) {
      throw new Error(`${name} ability control is not named and inspectable: ${JSON.stringify(control)}`);
    }
    await page.locator(selector).click();
    await page.waitForSelector('.combat-targeting-banner');
    for (let step = 0; step < 4; step += 1) {
      const stage = await page.$eval('.combat-targeting-banner', (node) =>
        node.getAttribute('data-target-stage'));
      if (stage === 'confirm') break;
      const choiceSelector = stage === 'targetId' || stage === 'secondaryTargetId'
        ? '.battle-hex.target-choice' : stage === 'destination'
          ? '.battle-hex.destination-choice' : null;
      if (!choiceSelector) throw new Error(`${name} exposes unsupported targeting stage ${stage}`);
      await page.locator(choiceSelector).click();
    }
    const targeting = await page.$eval('.combat-targeting-banner', (node) => ({
      stage: node.getAttribute('data-target-stage'), copy: node.textContent ?? '',
    }));
    if (targeting.stage !== 'confirm' || !targeting.copy.includes('Cancel')
        || !targeting.copy.includes('Prediction')) {
      throw new Error(`${name} targeting is incomplete: ${JSON.stringify(targeting)}`);
    }
    const destinationHexes = await page.$$eval('.battle-hex.destination-selected', (nodes) =>
      nodes.length);
    const expectedDestinationHexes = abilityId === 'trample' ? 2
      : abilityId === 'crossing' ? 1 : 0;
    if (destinationHexes !== expectedDestinationHexes) {
      throw new Error(`${name} destination footprint is incomplete: ${destinationHexes}/${expectedDestinationHexes}`);
    }
    await auditVisibleControls(page, `${name}-targeting-desktop`);
    await page.screenshot({ path: `${output}/ability-${name}-desktop.png`, fullPage: true });
    await page.setViewport({ width: 800, height: 900, deviceScaleFactor: 1 });
    await auditVisibleControls(page, `${name}-targeting-narrow`);
    await page.screenshot({ path: `${output}/ability-${name}-narrow.png`, fullPage: true });
    await page.$eval('.combat-targeting-controls', (node) => {
      const cancel = [...node.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent?.includes('Cancel'));
      if (!cancel) throw new Error('Targeting mode has no Cancel control');
      cancel.click();
    });
    await page.waitForSelector('.combat-targeting-banner', { hidden: true });
  }
}

async function captureResultFixture(
  page: Page,
  name: string,
  state: GameState,
  action: 'auto' | 'retreat' | 'surrender' = 'auto',
  expected: string[] = [],
): Promise<void> {
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await loadState(page, state, '.combat-shell');
  const button = action === 'auto' ? '.combat-actions .auto'
    : action === 'retreat' ? '.combat-actions button:nth-last-of-type(3)'
      : '.combat-actions button:nth-last-of-type(2)';
  if (action === 'auto') await page.locator(button).click();
  else {
    await page.$eval('.combat-actions', (node, wanted) => {
      const target = [...node.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
        candidate.textContent?.includes(wanted === 'retreat' ? 'Retreat' : 'Surrender'));
      if (!target || target.disabled) throw new Error(`${wanted} result fixture action unavailable`);
      target.click();
    }, action);
  }
  await page.waitForSelector('.result-dialog');
  await auditVisibleControls(page, `${name}-desktop`);
  const copy = await page.$eval('.result-dialog', (node) => node.textContent ?? '');
  for (const fragment of [
    'Attacker', 'Defender', 'Human-controlled side', 'Actual winner',
    'Persistent consequences', 'Continue to', ...expected,
  ]) if (!copy.includes(fragment)) {
    throw new Error(`${name} result omitted ${JSON.stringify(fragment)}: ${copy}`);
  }
  await page.screenshot({ path: `${output}/result-${name}-desktop.png`, fullPage: true });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await auditVisibleControls(page, `${name}-narrow`);
  await page.screenshot({ path: `${output}/result-${name}-narrow.png`, fullPage: true });
}

async function captureResultMatrix(page: Page): Promise<void> {
  await captureResultFixture(page, 'attacker-win',
    resultHeroFixture('human', 'ai', true), 'auto', ['Victory']);
  await captureResultFixture(page, 'attacker-loss',
    resultHeroFixture('human', 'ai', false), 'auto', ['Defeat']);
  await captureResultFixture(page, 'defender-win',
    resultHeroFixture('ai', 'human', false), 'auto', ['Victory', 'Defender · Player 2']);
  await captureResultFixture(page, 'defender-loss',
    resultHeroFixture('ai', 'human', true), 'auto', ['Defeat', 'Defender · Player 2']);
  await captureResultFixture(page, 'hotseat-attacker-win',
    resultHeroFixture('human', 'human', true), 'auto', ['Both sides', 'hot seat', 'Player 1 wins']);
  await captureResultFixture(page, 'hotseat-defender-win',
    resultHeroFixture('human', 'human', false), 'auto', ['Both sides', 'hot seat', 'Player 2 wins']);
  await captureResultFixture(page, 'guardian', guardianResultFixture(), 'auto',
    ['Guardian encounter', 'Guardian removed']);
  await captureResultFixture(page, 'castle', castleResultFixture(), 'auto',
    ['Castle assault', 'Castle ownership', 'captured']);
  await captureResultFixture(page, 'retreat', withdrawalResultFixture(), 'retreat',
    ['Retreat', 'Tavern return', 'army was lost']);
  await captureResultFixture(page, 'surrender', withdrawalResultFixture(), 'surrender',
    ['Surrender', 'Tavern return', 'retained the surviving army']);
}

const browser = await puppeteer.launch({
  executablePath, headless: true, args: ['--disable-gpu'],
});

try {
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(120_000);
  page.on('pageerror', (error) => console.error(`browser page error: ${
    error instanceof Error ? error.message : String(error)
  }`));
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.goto(baseUrl, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  if (process.argv.includes('--choices-only')) {
    await capturePendingChoiceMatrix(page);
    console.log(`Pending-choice UX review passed. Screenshots written to ${output}.`);
  } else if (process.argv.includes('--results-only')) {
    await captureResultMatrix(page);
    console.log(`Battle-result UX review passed. Screenshots written to ${output}.`);
  } else {
    await auditVisibleControls(page, 'menu');
  await page.screenshot({ path: `${output}/01-menu.png`, fullPage: true });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await auditVisibleControls(page, 'menu-390');
  await page.screenshot({ path: `${output}/01b-menu-390.png`, fullPage: true });
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
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
  const mapFirstDesktop = await page.evaluate(() => {
    const map = document.querySelector('.map-frame')!.getBoundingClientRect();
    const rail = document.querySelector('.hero-panel') as HTMLElement;
    const minimap = document.querySelector('.rail-minimap .minimap')?.getBoundingClientRect();
    const forbidden = /Artifacts|Backpack|Consumables|Secondary skills|Ritualist|specialty/i
      .test(rail.textContent ?? '');
    return {
      mapShare: map.width / innerWidth,
      railOverflow: rail.scrollHeight - rail.clientHeight,
      minimapInside: Boolean(minimap && minimap.left >= rail.getBoundingClientRect().left
        && minimap.right <= rail.getBoundingClientRect().right),
      forbidden,
      horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
  if (mapFirstDesktop.mapShare < .78 || mapFirstDesktop.railOverflow > 2
      || !mapFirstDesktop.minimapInside || mapFirstDesktop.forbidden
      || mapFirstDesktop.horizontalOverflow > 2) {
    throw new Error(`Desktop map-first hierarchy failed: ${JSON.stringify(mapFirstDesktop)}`);
  }
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await auditVisibleControls(page, 'adventure-map-first-390');
  const narrowShell = await page.evaluate(() => ({
    pageOverflow: document.documentElement.scrollWidth - innerWidth,
    railOverflow: document.querySelector<HTMLElement>('.hero-panel')!.scrollWidth
      - document.querySelector<HTMLElement>('.hero-panel')!.clientWidth,
    nestedRailScroll: getComputedStyle(document.querySelector('.hero-panel')!).overflowY,
    mapHeight: document.querySelector('.map-frame')!.getBoundingClientRect().height,
  }));
  if (narrowShell.pageOverflow > 2 || narrowShell.railOverflow > 2
      || narrowShell.nestedRailScroll === 'auto' || narrowShell.mapHeight < 350) {
    throw new Error(`Narrow map-first shell failed: ${JSON.stringify(narrowShell)}`);
  }
  await page.screenshot({ path: `${output}/04b-adventure-map-first-390.png`, fullPage: true });
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });

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
  await page.waitForSelector('.town-list .hero-present');
  const entranceAction = await page.$eval('.town-list .hero-present', (node) =>
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

  await page.locator(`.hero-list button[data-inspect-id="${adjacentHeroId}"]`).click();
  await page.waitForSelector(`.map-hero[data-inspect-id="${adjacentHeroId}"][data-selected="true"] .selected-hero-ring`);
  await page.locator(`.hero-list button[data-inspect-id="${originalHeroId}"]`).click();
  await page.waitForSelector(`.map-hero[data-inspect-id="${originalHeroId}"][data-selected="true"] .selected-hero-ring`);
  await page.screenshot({ path: `${output}/04j-map-hero-selection.png` });
  await page.locator('.adventure-spell-button').click();
  await page.waitForSelector('.adventure-spellbook');
  await auditVisibleControls(page, 'adventure-spellbook');
  await page.screenshot({ path: `${output}/04c-adventure-spellbook.png` });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await auditVisibleControls(page, 'adventure-spellbook-390');
  await page.screenshot({ path: `${output}/04c1-adventure-spellbook-390.png` });
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.locator('.adventure-spellbook header button').click();
  await page.waitForSelector('.adventure-spellbook', { hidden: true });
  await page.$eval('.hero-panel', (panel) => {
    const button = [...panel.querySelectorAll<HTMLButtonElement>('button')]
      .find((candidate) => candidate.textContent?.includes('Exchange'));
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
  await page.$eval('.rail-commands', (commands) => {
    const details = [...commands.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Hero details'));
    if (!details) throw new Error('Hero Details command is missing');
    details.click();
  });
  await page.waitForSelector('.hero-details-dialog');
  await auditVisibleControls(page, 'hero-details');
  await page.screenshot({ path: `${output}/04c2-hero-details.png` });
  await page.$eval('.hero-details-tabs', (tabs) => {
    const equipment = [...tabs.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Equipment'));
    if (!equipment) throw new Error('Equipment detail tab is missing');
    equipment.click();
  });
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
  await page.locator('.hero-details-dialog .structure-dialog-close').click();
  await page.waitForSelector('.hero-details-dialog', { hidden: true });
  await page.$eval('.rail-commands', (commands) => {
    const menu = [...commands.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Menu & saves'));
    if (!menu) throw new Error('Menu & Saves command is missing');
    menu.click();
  });
  await page.waitForSelector('.command-menu-dialog');
  await auditVisibleControls(page, 'command-menu');
  await page.screenshot({ path: `${output}/04c3-menu-saves.png` });
  await page.locator('.command-menu-dialog .structure-dialog-close').click();
  await page.waitForSelector('.command-menu-dialog', { hidden: true });
  await inspect(page, '.hero-portrait');
  await page.screenshot({ path: `${output}/05-hero-inspection.png` });
  await page.locator('.inspection-close').click();
  await page.$eval('.rail-commands', (commands) => {
    const details = [...commands.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Hero details'))!;
    details.click();
  });
  await page.$eval('.hero-details-tabs', (tabs) => {
    const skills = [...tabs.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Special skills'))!;
    skills.click();
  });
  await inspect(page, '.hero-details-dialog .skill-summary article');
  await page.screenshot({ path: `${output}/06-skill-inspection.png` });
  await page.locator('.inspection-close').click();
  await page.$eval('.hero-details-tabs', (tabs) => {
    const equipment = [...tabs.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Equipment'))!;
    equipment.click();
  });
  await inspect(page, '.hero-details-dialog .artifact-backpack [data-inspect-kind="artifact"]');
  await page.screenshot({ path: `${output}/07-artifact-inspection.png` });
  await page.locator('.inspection-close').click();
  await page.locator('.hero-details-dialog .structure-dialog-close').click();
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
  await auditVisibleControls(page, 'adventure-compact-command');
  await page.screenshot({ path: `${output}/08c-adventure-compact-command.png` });
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.locator('.town-list button').click();
  await page.waitForSelector('.castle-screen');
  await page.waitForFunction(() => [...document.querySelectorAll<HTMLImageElement>('.recruit-unit-portrait')]
    .every((image) => image.complete && image.naturalWidth > 0));
  await auditVisibleControls(page, 'castle');
  await page.screenshot({ path: `${output}/09-castle.png`, fullPage: true });
  await page.locator('[data-castle-view="recruit"]').click();
  await page.waitForSelector('.recruit-row');
  await auditVisibleControls(page, 'castle-recruit');
  await page.screenshot({ path: `${output}/09b-castle-recruit.png` });
  await page.locator('[data-castle-view="services"]').click();
  await auditVisibleControls(page, 'castle-services');
  await page.screenshot({ path: `${output}/09c-castle-services.png` });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await auditVisibleControls(page, 'castle-services-390');
  await page.screenshot({ path: `${output}/10-castle-390.png` });

  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await loadState(page, choiceFixture(), '.choice-dialog');
  await auditVisibleControls(page, 'choice');
  await page.screenshot({ path: `${output}/11-choice.png` });
  await page.locator('.help-toggle').click();
  await page.waitForSelector('.help-dialog');
  await page.screenshot({ path: `${output}/12-choice-help.png` });
  await capturePendingChoiceMatrix(page);

  await loadState(page, combatFixture(), '.combat-shell');
  await auditVisibleControls(page, 'combat');
  const rawAbility = await page.$$eval('.ability-list [data-inspect-kind="ability"]', (nodes) =>
    nodes.some((node) => (node.textContent ?? '').includes('_')));
  if (rawAbility) throw new Error('Combat exposes a raw ability identifier');
  await page.screenshot({ path: `${output}/13-combat.png` });
  await captureAttackPrediction(page, combatFixture());
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await auditVisibleControls(page, 'combat-compact');
  await page.screenshot({ path: `${output}/13a-combat-compact.png` });
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.locator('.spellbook-button').click();
  await page.waitForSelector('.spellbook');
  await auditVisibleControls(page, 'combat-spellbook');
  await page.screenshot({ path: `${output}/13b-combat-spellbook.png` });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await auditVisibleControls(page, 'combat-spellbook-390');
  await page.screenshot({ path: `${output}/13b1-combat-spellbook-390.png` });
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
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
  await captureCombatAbilityMatrix(page);
  await loadState(page, combatFixture(), '.combat-shell');
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
  const rally = await page.$eval('.morale-rally', (node) => node.getAttribute('aria-label') ?? '');
  await page.screenshot({ path: `${output}/17b-morale-rally.png` });
  await new Promise((resolve) => setTimeout(resolve, 220));
  const moraleState = await page.evaluate(() => ({
    log: document.querySelector('.battle-log p')?.textContent ?? '',
    active: document.querySelector('.battle-stack.active')?.getAttribute('data-inspect-id') ?? '',
  }));
  if (!rally.includes('Act again') || !moraleState.log.includes('acts again')
      || !moraleState.active) {
    throw new Error(`Morale extra-action feedback is incomplete: ${JSON.stringify({
      rally, ...moraleState,
    })}`);
  }

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
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await auditVisibleControls(page, 'campaign-victory-390');
  await page.screenshot({ path: `${output}/19a-campaign-victory-390.png` });
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });

  await loadState(page, pickupFixture(), '.pickup-eligible[data-inspect-id="muster-pile-1"]');
  await dismissObjective(page);
  await page.$eval('.pickup-eligible[data-inspect-id="muster-pile-1"]', (node) =>
    node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
  await page.waitForSelector('.pickup-eligible[data-inspect-id="muster-pile-1"]', { hidden: true });
  await page.waitForFunction(() => (document.querySelector('.message-strip')?.textContent ?? '')
    .toLowerCase().includes('collected'));
  await auditVisibleControls(page, 'resource-pickup-result');
  await page.screenshot({ path: `${output}/20-resource-pickup.png` });

  await loadState(page, serviceFixture(), '.adventure-map');
  await dismissObjective(page);
  await page.waitForSelector('.structure-dialog');
  const priorHeroSummary = await page.$eval('.hero-panel', (node) => node.textContent ?? '');
  await page.$eval('.structure-dialog', (node) => {
    const button = [...node.querySelectorAll<HTMLButtonElement>('button')]
      .find((candidate) => candidate.textContent?.includes('Attend a lesson'));
    if (!button) throw new Error('Hedge School action is missing');
    button.click();
  });
  await page.waitForSelector('.action-confirm-dialog');
  await page.locator('.action-confirm-dialog .primary').click();
  await page.waitForSelector('.choice-cards');
  const lessonFocus = await page.$eval(':focus', (node) => Boolean(node.closest('.choice-dialog')));
  if (!lessonFocus) throw new Error('Hedge School confirmation did not transfer focus to its lesson choice');
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
  await page.locator('.town-list button').click();
  await page.locator('[data-castle-view="army"]').click();
  await page.waitForSelector('.direct-exchange');
  const transferCountsBefore = await page.$$eval(
    '.direct-exchange .army-slot[data-inspect-kind="unit"]',
    (slots) => slots.reduce<Record<string, number>>((total, slot) => {
      const id = slot.getAttribute('data-inspect-id') ?? '';
      total[id] = (total[id] ?? 0) + Number(slot.querySelector('b')?.textContent ?? 0);
      return total;
    }, {}),
  );
  const keyboardSource = await page.$(
    '.direct-transfer-side:first-child .army-slot-wrap:nth-child(1) .army-slot',
  );
  if (!keyboardSource) throw new Error('Castle keyboard source slot is missing');
  await keyboardSource.focus();
  await keyboardSource.press('Enter');
  await page.waitForSelector('.direct-transfer-actions');
  await auditVisibleControls(page, 'castle-transfer-targets');
  await page.screenshot({ path: `${output}/23a-castle-transfer-targets.png`, fullPage: true });
  await page.$eval('.direct-transfer-actions', (actions) => {
    const partial = [...actions.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Partial'));
    if (!partial) throw new Error('Castle transfer has no Partial control');
    partial.click();
  });
  await page.$eval('.direct-transfer-actions', (actions) => {
    const evenly = [...actions.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Split evenly'));
    if (!evenly) throw new Error('Castle transfer has no Split evenly control');
    evenly.click();
  });
  const evenAmount = await page.$eval('.direct-transfer-actions input[type="number"]',
    (input) => (input as HTMLInputElement).value);
  if (evenAmount !== '4') throw new Error(`Nine units did not split evenly as 4/5: ${evenAmount}`);
  await page.$eval('.direct-transfer-actions input[type="number"]', (input) => {
    const control = input as HTMLInputElement;
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (!setValue) throw new Error('Native number-input value setter is unavailable');
    setValue.call(control, '3');
    control.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const exactAmount = await page.$eval('.direct-transfer-actions input[type="number"]',
    (input) => (input as HTMLInputElement).value);
  if (exactAmount !== '3') throw new Error(`Exact castle transfer amount did not update: ${exactAmount}`);
  await page.locator('.direct-transfer-side:last-child .army-slot-wrap:nth-child(2) .army-slot').click();
  await page.waitForSelector('.direct-transfer-controls [role="alert"]');
  const partialRule = await page.$eval('.direct-transfer-controls [role="alert"]',
    (node) => node.textContent ?? '');
  if (!partialRule.includes('Partial stacks cannot be swapped')) {
    throw new Error(`Castle partial-swap reason is incomplete: ${partialRule}`);
  }
  await page.screenshot({ path: `${output}/23b-castle-transfer-illegal.png`, fullPage: true });
  const keyboardDestination = await page.$(
    '.direct-transfer-side:last-child .army-slot-wrap:nth-child(3) .army-slot',
  );
  if (!keyboardDestination) throw new Error('Castle keyboard destination slot is missing');
  await keyboardDestination.focus();
  await keyboardDestination.press('Enter');
  await page.waitForFunction(() => (document.querySelector('.message-strip')?.textContent ?? '')
    .includes('transferred'));
  await page.locator('.direct-transfer-side:first-child .army-slot-wrap:nth-child(1) .army-slot').click();
  await page.locator('.direct-transfer-side:last-child .army-slot-wrap:nth-child(1) .army-slot').click();
  await page.locator('.direct-transfer-side:first-child .army-slot-wrap:nth-child(2) .army-slot').click();
  await page.locator('.direct-transfer-side:last-child .army-slot-wrap:nth-child(2) .army-slot').click();
  const transferCountsAfter = await page.$$eval(
    '.direct-exchange .army-slot[data-inspect-kind="unit"]',
    (slots) => slots.reduce<Record<string, number>>((total, slot) => {
      const id = slot.getAttribute('data-inspect-id') ?? '';
      total[id] = (total[id] ?? 0) + Number(slot.querySelector('b')?.textContent ?? 0);
      return total;
    }, {}),
  );
  if (JSON.stringify(Object.entries(transferCountsAfter).sort())
      !== JSON.stringify(Object.entries(transferCountsBefore).sort())) {
    throw new Error(`Castle transfer did not conserve companies: ${JSON.stringify({
      transferCountsBefore, transferCountsAfter,
    })}`);
  }
  await page.locator('.direct-transfer-side:last-child .army-slot-wrap:nth-child(1) .army-slot').click();
  await page.keyboard.press('Escape');
  if (await page.$('.direct-exchange .army-slot.selected')) {
    throw new Error('Escape did not cancel the castle transfer selection');
  }
  await auditVisibleControls(page, 'castle-transfer-result-desktop');
  await page.screenshot({ path: `${output}/23c-castle-transfer-result.png`, fullPage: true });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.$eval('.direct-exchange', (node) => node.scrollIntoView({ block: 'center' }));
  await auditVisibleControls(page, 'castle-transfer-result-narrow');
  await page.screenshot({ path: `${output}/23d-castle-transfer-result-narrow.png` });
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.locator('[data-castle-view="recruit"]').click();
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

    await captureResultMatrix(page);
    console.log(`UX review passed. Screenshots written to ${output}.`);
  }
} finally {
  await browser.close();
}
