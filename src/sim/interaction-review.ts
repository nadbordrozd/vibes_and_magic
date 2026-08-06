import { mkdirSync } from 'node:fs';
import puppeteer, { type Page } from 'puppeteer-core';
import { makeArmy } from '../core/army';
import { createBattle } from '../core/combat/setup';
import { createGame } from '../core/game';
import type { Coord, GameState, UnitId } from '../core/types';
import { actionSave } from '../ui/persistence';

const executablePath = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/google-chrome';
const baseUrl = process.env.BM_URL ?? 'http://127.0.0.1:5173/';
const outputDir = '.pixel-work/review/interactions';
mkdirSync(outputDir, { recursive: true });

function combatState(
  attackerUnit: UnitId, defenderUnit: UnitId,
  attackerPosition: Coord, defenderPosition: Coord,
): GameState {
  const state = createGame({
    seed: 917, mapId: 'grand-muster', difficulty: 'normal', p1: 'human', p2: 'dormant',
  });
  const attacker = state.players.p1.hero!;
  const defender = structuredClone(attacker);
  defender.id = 'interaction-review-defender';
  defender.name = 'Review Target';
  defender.owner = 'p2';
  const [battle] = createBattle(
    makeArmy([{ unitId: attackerUnit, count: 20 }]),
    makeArmy([{ unitId: defenderUnit, count: 40 }]),
    attacker, defender,
    {
      kind: 'hero', targetId: defender.id, destination: { x: 20, y: 20 },
      attackerHeroId: attacker.id, defenderHeroId: defender.id,
      defenderPlayerId: 'p2', battlefield: 'land', terrain: 'meadow',
    }, state.rng,
  );
  battle.obstacles = [];
  battle.obstacleProps = [];
  battle.stacks[0].position = attackerPosition;
  battle.stacks[1].position = defenderPosition;
  battle.order = [battle.stacks[0].id, battle.stacks[1].id];
  battle.currentStackId = battle.stacks[0].id;
  state.battle = battle;
  state.phase = 'combat';
  state.replay = [];
  return state;
}

async function loadState(page: Page, state: GameState): Promise<void> {
  const save = actionSave(state);
  await page.evaluate(({ persisted, initial }) => {
    localStorage.setItem('border-marches.save.v4', JSON.stringify(persisted));
    localStorage.setItem('border-marches.save.v4.initial', JSON.stringify(initial));
    localStorage.setItem('border-marches.save.v4.setup', JSON.stringify(initial.setup));
    localStorage.setItem('border-marches.save.v4.meta', JSON.stringify({
      savedAt: Date.now(), day: initial.day, week: initial.week,
      activePlayer: initial.activePlayer,
    }));
  }, { persisted: save, initial: state });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.$eval('.load-button', (node) => (node as HTMLButtonElement).click());
  await page.waitForSelector('.combat-shell');
}

const browser = await puppeteer.launch({
  executablePath, headless: true, args: ['--disable-gpu'],
});

try {
  const page = await browser.newPage();
  page.on('pageerror', (error) => console.error(`browser page error: ${
    error instanceof Error ? error.stack ?? error.message : String(error)
  }`));
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.goto(baseUrl, { waitUntil: 'networkidle0' });

  await loadState(page, combatState(
    'longbowman', 'yeoman', { x: 2, y: 4 }, { x: 9, y: 4 },
  ));
  const rangedTarget = await page.$('.battle-hex.attackable[data-occupant-id="defender-0"]');
  const rangedBox = await rangedTarget?.boundingBox();
  if (!rangedTarget || !rangedBox) throw new Error('Ranged target does not expose its whole hex');
  await page.mouse.click(
    rangedBox.x + rangedBox.width / 2, rangedBox.y + rangedBox.height / 2,
    { button: 'right' },
  );
  await page.waitForFunction(() => document.querySelector('.active-unit')?.textContent
    ?.includes('Yeoman'));
  await page.mouse.move(rangedBox.x + rangedBox.width / 2, rangedBox.y + 5);
  await page.waitForSelector('.combat-sword-cursor[data-attack-type="BATTLE_ATTACK"]');
  await page.screenshot({ path: `${outputDir}/ranged-aim.png` });
  await page.mouse.click(rangedBox.x + rangedBox.width / 2, rangedBox.y + 5);
  await page.waitForSelector('.ranged-projectile');
  await page.screenshot({ path: `${outputDir}/ranged-projectile.png` });
  await page.waitForSelector('.damage-effect');
  await page.screenshot({ path: `${outputDir}/ranged-damage.png` });
  await page.waitForSelector('.damage-effect', { hidden: true });

  await loadState(page, combatState(
    'yeoman', 'yeoman', { x: 3, y: 4 }, { x: 6, y: 4 },
  ));
  const meleeTarget = await page.$('.battle-hex.attackable[data-occupant-id="defender-0"]');
  const meleeBox = await meleeTarget?.boundingBox();
  if (!meleeTarget || !meleeBox) throw new Error('Melee target does not expose its whole hex');
  const x = meleeBox.x + meleeBox.width / 2;
  await page.mouse.move(x, meleeBox.y + 5);
  await page.waitForSelector('.combat-sword-cursor');
  const top = await page.$eval('.combat-sword-cursor', (node) => ({
    x: node.getAttribute('data-destination-x'),
    y: node.getAttribute('data-destination-y'),
    angle: node.getAttribute('data-angle'),
  }));
  await page.mouse.move(x, meleeBox.y + meleeBox.height - 5);
  const bottom = await page.$eval('.combat-sword-cursor', (node) => ({
    x: node.getAttribute('data-destination-x'),
    y: node.getAttribute('data-destination-y'),
    angle: node.getAttribute('data-angle'),
  }));
  if (`${top.x},${top.y}` === `${bottom.x},${bottom.y}` || top.angle === bottom.angle) {
    throw new Error(`Melee aim did not change approach: ${JSON.stringify({ top, bottom })}`);
  }
  await page.screenshot({ path: `${outputDir}/melee-bottom-approach.png` });
  await page.mouse.click(x, meleeBox.y + meleeBox.height - 5);
  await page.waitForSelector('.attack-bump');
  await page.waitForSelector('.damage-effect');
  await page.screenshot({ path: `${outputDir}/melee-damage.png` });

  console.log(
    `Interaction review passed: full-hex right-click stats; ranged projectile/damage; `
    + `directional single-click melee (${top.x},${top.y} → ${bottom.x},${bottom.y}).`,
  );
} finally {
  await browser.close();
}
