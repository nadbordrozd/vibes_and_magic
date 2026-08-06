import { mkdirSync } from 'node:fs';
import puppeteer, { type Page } from 'puppeteer-core';
import { makeArmy } from '../core/army';
import { createBattle } from '../core/combat/battle';
import { addTimedEffect } from '../core/combat/magicEffects';
import { createGame } from '../core/game';
import { actionSave } from '../ui/persistence';

const executablePath = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/google-chrome';
const baseUrl = process.env.BM_URL ?? 'http://127.0.0.1:5173/';
const outputDir = '.pixel-work/review/combat-targeting';
mkdirSync(outputDir, { recursive: true });

function reviewState() {
  const state = createGame({ seed: 662, mapId: 'grand-muster', p1: 'human', p2: 'dormant' });
  const attacker = state.players.p1.hero!;
  const defender = structuredClone(state.players.p2.hero!);
  defender.owner = 'p2';
  const [battle] = createBattle(
    makeArmy([
      { unitId: 'yeoman', count: 12 }, { unitId: 'longbowman', count: 7 },
      { unitId: 'oriflammeWyvern', count: 2 },
    ]),
    makeArmy([
      { unitId: 'tinSoldier', count: 14 }, { unitId: 'woodenColossus', count: 2 },
    ]),
    attacker, defender,
    {
      kind: 'hero', targetId: defender.id, destination: { x: 20, y: 20 },
      attackerHeroId: attacker.id, defenderHeroId: defender.id,
      defenderPlayerId: 'p2', battlefield: 'land', terrain: 'meadow',
    }, state.rng,
  );
  battle.obstacles = [{ x: 6, y: 4 }];
  battle.obstacleProps = [];
  battle.currentStackId = 'attacker-0';
  battle.attackerHero.knownSpells = [
    'rally', 'reflect', 'standardOfDawn', 'wallOfTheMaker', 'rains', 'amplify',
  ];
  battle.attackerHero.upgradedSpells = ['rally', 'reflect'];
  battle.attackerHero.mana = 100;
  battle.stacks[0].counters.bloom = 2;
  battle.stacks[3].counters.hex = 3;
  addTimedEffect(battle.stacks[1], 'blessing', 2, 1, true, 'attacker');
  battle.enchantments.attacker = [
    { id: 'standard-a', spellId: 'standardOfDawn', side: 'attacker', multiplier: 1, upgraded: false },
    { id: 'forgefire-a', spellId: 'forgefire', side: 'attacker', multiplier: 1, upgraded: false },
  ];
  battle.enchantments.defender = [
    { id: 'last-candle-d', spellId: 'lastCandle', side: 'defender', multiplier: 1, upgraded: false },
  ];
  battle.attackerHero.inventory = [
    { id: 'bannerWhistle' }, { id: 'chalkOfWalls' },
    { id: 'powderOfUnmaking' }, null, null, null,
  ];
  state.battle = battle;
  state.phase = 'combat';
  state.replay = [];
  return state;
}

async function install(page: Page, state: ReturnType<typeof reviewState>) {
  await page.goto(baseUrl, { waitUntil: 'networkidle0' });
  const save = actionSave(state);
  await page.evaluate(({ payload, initial }) => {
    localStorage.setItem('border-marches.save.v4', JSON.stringify(payload));
    localStorage.setItem('border-marches.save.v4.initial', JSON.stringify(initial));
    localStorage.setItem('border-marches.save.v4.setup', JSON.stringify(initial.setup));
    localStorage.setItem('border-marches.save.v4.meta', JSON.stringify({
      savedAt: 1, day: initial.day, week: initial.week, activePlayer: initial.activePlayer,
    }));
  }, { payload: save, initial: state });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.click('.load-button');
  await page.waitForSelector('.combat-shell');
}

async function openSpell(page: Page, spellId: string, effect = false) {
  await page.click('.spellbook-button');
  await page.waitForSelector(`.spell-card[data-inspect-id="${spellId}"]`);
  const selector = effect
    ? `.spell-card[data-inspect-id="${spellId}"] .effect-targets button:not(:disabled)`
    : `.spell-card[data-inspect-id="${spellId}"] > button:not(:disabled)`;
  await page.click(selector);
  await page.waitForSelector('.combat-targeting-banner');
}

const browser = await puppeteer.launch({
  executablePath, headless: true, args: ['--disable-gpu'],
});

try {
  const page = await browser.newPage();
  page.on('pageerror', (error) => console.error(error));
  page.on('console', (message) => {
    if (message.type() === 'error') console.error(`browser console: ${message.text()}`);
  });
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });

  await install(page, reviewState());
  await openSpell(page, 'rally');
  await page.waitForSelector('[data-target-stage="targetId"]');
  const logBeforeCancel = await page.$$eval('.battle-log p', (nodes) => nodes.map((node) => node.textContent));
  const manaBeforeCancel = await page.$eval('.spellbook-button', (node) => node.textContent);
  await page.click('polygon.target-choice');
  await page.waitForSelector('[data-target-stage="secondaryTargetId"]');
  await page.screenshot({ path: `${outputDir}/multistage-rally-desktop.png` });
  await page.click('.combat-targeting-controls button:nth-child(2)');
  const logAfterCancel = await page.$$eval('.battle-log p', (nodes) => nodes.map((node) => node.textContent));
  const manaAfterCancel = await page.$eval('.spellbook-button', (node) => node.textContent);
  if (JSON.stringify(logBeforeCancel) !== JSON.stringify(logAfterCancel)
      || manaBeforeCancel !== manaAfterCancel) throw new Error('Cancel mutated combat state');

  await openSpell(page, 'standardOfDawn');
  await page.waitForSelector('[data-target-stage="replaceEnchantment"]');
  if (await page.$$eval('.combat-targeting-choices button', (nodes) => nodes.length) !== 2) {
    throw new Error('Replacement did not expose both occupied slots');
  }
  await page.screenshot({ path: `${outputDir}/enchantment-replacement-desktop.png` });
  await page.click('.combat-targeting-choices button:nth-child(2)');
  await page.waitForSelector('[data-target-stage="confirm"]');
  await page.click('.confirm-target');
  await page.waitForSelector('.combat-targeting-banner', { hidden: true, timeout: 5_000 });
  const replacementLog = await page.$$eval('.battle-log p', (nodes) =>
    nodes.map((node) => node.textContent ?? ''));
  if (!replacementLog.some((entry) => entry.includes('Standard of Dawn'))) {
    throw new Error(`Replacement confirmation did not dispatch: ${replacementLog.join(' | ')}`);
  }

  await install(page, reviewState());
  await openSpell(page, 'wallOfTheMaker');
  await page.waitForSelector('[data-target-stage="positions"]');
  for (let index = 0; index < 3; index += 1) {
    await page.click('polygon.placement-choice:not(.position-selected)');
  }
  await page.waitForSelector('[data-target-stage="confirm"]');
  await page.setViewport({ width: 760, height: 1100, deviceScaleFactor: 1 });
  await page.screenshot({ path: `${outputDir}/wall-placement-narrow.png`, fullPage: true });
  await page.click('.combat-targeting-controls button:nth-child(2)');

  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.click('.combat-items button[data-inspect-id="bannerWhistle"]');
  await page.waitForSelector('[data-target-stage="confirm"]');
  await page.click('.confirm-target');
  await page.waitForFunction(() => document.querySelector('.battle-log p')?.textContent
    ?.includes('Banner Whistle'));
  await page.screenshot({ path: `${outputDir}/confirmed-item-success.png` });

  const noTarget = reviewState();
  noTarget.battle!.stacks.forEach((stack) => {
    stack.counters = { burn: 0, chill: 0, hex: 0, bloom: 0 };
    stack.effects = [];
  });
  noTarget.battle!.enchantments = { attacker: [], defender: [] };
  noTarget.battle!.attackerHero.knownSpells = ['amplify', 'rains'];
  await install(page, noTarget);
  await page.click('.spellbook-button');
  await page.waitForSelector('.spell-card[data-inspect-id="amplify"] .spell-unavailable');
  const reason = await page.$eval(
    '.spell-card[data-inspect-id="amplify"] .spell-unavailable',
    (node) => node.textContent ?? '',
  );
  if (!reason.includes('active counter or enchantment')) {
    throw new Error(`Missing no-target reason: ${reason}`);
  }
  await page.screenshot({ path: `${outputDir}/no-effect-target-unavailable.png` });
  console.log('ok combat targeting · replacement/multistage/placement/cancel/success/no-target · desktop+narrow');
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
} finally {
  await browser.close();
}
