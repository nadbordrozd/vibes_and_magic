import { mkdirSync } from 'node:fs';
import puppeteer, { type Page } from 'puppeteer-core';
import { createGame } from '../core/game';
import { castleEntrance } from '../core/map/occupancy';
import type { GameState } from '../core/types';
import { actionSave } from '../ui/persistence';

const executablePath = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/google-chrome';
const baseUrl = process.env.BM_URL ?? 'http://127.0.0.1:5173/';
const output = '.pixel-work/review/service-actions';
mkdirSync(output, { recursive: true });

function fixture(): GameState {
  const state = createGame({
    seed: 5303, mapId: 'grand-muster', difficulty: 'normal',
    p1: 'human', p2: 'dormant',
  });
  const hero = state.players.p1.hero!;
  hero.inventory = [
    { id: 'saltedMeat' }, { id: 'militiaWrit' }, { id: 'cartographersCase' },
    { id: 'ferrymansCoin' }, { id: 'waybread' }, null,
  ];
  state.players.p1.resources = { gold: 50_000, timber: 50, iron: 50, essence: 50 };
  state.replay = [];
  return state;
}

function palimpsestFixture(): GameState {
  const state = fixture();
  const hero = state.players.p1.hero!;
  const castle = state.castles.find((candidate) => candidate.owner === 'p1'
    && candidate.faction === hero.faction)!;
  hero.position = castleEntrance(castle);
  hero.skills.palimpsest = 2;
  hero.knownSpells = ['rally', 'ward'];
  hero.upgradedSpells = ['ward'];
  if (!castle.buildings.includes('mageGuild1')) castle.buildings.push('mageGuild1');
  castle.guildDeck = ['blessing', 'quiet', 'forgeSpark'];
  return state;
}

function serviceFixture(disabled = false): GameState {
  const state = fixture();
  const hero = state.players.p1.hero!;
  const monastery = state.map.objects.find((object) => object.kind === 'monastery')!;
  hero.position = { ...monastery.position };
  if (disabled) state.players.p1.resources.essence = 0;
  return state;
}

function hedgeSchoolFixture(): GameState {
  const state = fixture();
  const hero = state.players.p1.hero!;
  const school = state.map.objects.find((object) => object.kind === 'hedgeSchool')!;
  hero.position = { ...school.position };
  return state;
}

async function load(page: Page, state: GameState): Promise<void> {
  const save = actionSave(state);
  await page.goto(baseUrl, { waitUntil: 'networkidle0' });
  await page.evaluate(({ persisted, initial }) => {
    localStorage.clear();
    localStorage.setItem('border-marches.save.v4', JSON.stringify(persisted));
    localStorage.setItem('border-marches.save.v4.initial', JSON.stringify(initial));
    localStorage.setItem('border-marches.save.v4.setup', JSON.stringify(initial.setup));
  }, { persisted: save, initial: state });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.locator('.load-button').click();
  await page.waitForSelector('.adventure-map');
  if (await page.$('.objective-primer')) await page.locator('.choice-dialog .primary').click();
}

async function clickText(page: Page, selector: string, text: string): Promise<void> {
  await page.$$eval(selector, (nodes, wanted) => {
    const node = nodes.find((candidate) => candidate.textContent?.includes(wanted));
    if (!node) throw new Error(`No matching control contains ${wanted}`);
    (node as HTMLButtonElement).click();
  }, text);
}

async function openItems(page: Page): Promise<void> {
  await clickText(page, '.rail-commands button', 'Hero details');
  await page.waitForSelector('.hero-details-dialog');
  await clickText(page, '.hero-details-tabs button', 'Items');
}

async function audit(page: Page, name: string): Promise<void> {
  const result = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    unexplained: [...document.querySelectorAll<HTMLButtonElement>('button:disabled')]
      .filter((button) => {
        const box = button.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && !button.title && !button.dataset.disabledReason;
      }).map((button) => button.textContent?.trim()),
  }));
  if (result.overflow > 2 || result.unexplained.length) {
    throw new Error(`${name} audit failed: ${JSON.stringify(result)}`);
  }
}

const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--disable-gpu'] });
try {
  const page = await browser.newPage();
  page.on('pageerror', (error) => { throw error; });
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await load(page, fixture());

  await openItems(page);
  await clickText(page, '.item-inventory button', 'Salted Meat');
  await page.waitForSelector('.item-target-dialog');
  const heroChoices = await page.$$('.item-target-options button');
  if (heroChoices.length !== fixture().players.p1.heroes.length) {
    throw new Error(`Salted Meat shows ${heroChoices.length} hero choices`);
  }
  await audit(page, 'Salted Meat target choice');
  await page.screenshot({ path: `${output}/01-item-hero-targets-desktop.png`, fullPage: true });
  await page.locator('.item-target-options button').click();
  await page.waitForSelector('.action-confirm-dialog');
  await page.screenshot({ path: `${output}/02-item-confirm-desktop.png`, fullPage: true });
  await page.locator('.action-confirm-dialog .dialog-actions button').click();

  await openItems(page);
  await clickText(page, '.item-inventory button', "Ferryman's Coin");
  await page.waitForSelector('.map-item-target-prompt');
  const mapPrompt = await page.$eval('.map-item-target-prompt', (node) => node.textContent ?? '');
  if (!mapPrompt.includes('Nothing is consumed until')) throw new Error('Map item lacks safe targeting copy');
  await page.screenshot({ path: `${output}/03-item-map-target-mode.png`, fullPage: true });
  await page.locator('.map-item-target-prompt button').click();

  await page.setViewport({ width: 700, height: 860, deviceScaleFactor: 1 });
  await openItems(page);
  await clickText(page, '.item-inventory button', 'Militia Writ');
  await page.waitForSelector('.item-target-dialog');
  await audit(page, 'Militia Writ narrow target choice');
  await page.screenshot({ path: `${output}/04-item-castle-targets-narrow.png`, fullPage: true });

  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await load(page, palimpsestFixture());
  await clickText(page, '.palimpsest-service button', 'Forget Rally');
  await page.waitForSelector('.action-confirm-dialog');
  await audit(page, 'Palimpsest confirmation');
  await page.screenshot({ path: `${output}/05-palimpsest-confirm.png`, fullPage: true });
  await clickText(page, '.action-confirm-dialog button', 'Confirm');
  await page.waitForSelector('.action-confirm-dialog', { hidden: true });
  await page.waitForSelector('.choice-dialog');
  const offer = await page.$eval('.choice-dialog', (node) => node.textContent ?? '');
  if (!offer.includes('Forgotten spell · Palimpsest')
      || !offer.includes('every other offer is lost')) {
    throw new Error('Palimpsest offer did not open with source and commitment copy');
  }
  await page.screenshot({ path: `${output}/06-palimpsest-offer.png`, fullPage: true });

  await load(page, serviceFixture());
  await page.waitForSelector('.structure-dialog');
  const focus = await page.$eval(':focus', (node) => node.className);
  if (!String(focus).includes('structure-dialog-close')) {
    throw new Error(`Structure dialog did not receive focus: ${focus}`);
  }
  await page.keyboard.press('m');
  if (await page.$('.adventure-layout.world-view')) {
    throw new Error('Structure dialog allowed the map shortcut through its modal state');
  }
  await page.keyboard.press('Escape');
  await page.waitForSelector('.structure-dialog', { hidden: true });
  const restored = await page.$eval(':focus', (node) => node.className);
  if (!String(restored).includes('map-frame')) {
    throw new Error(`Escape did not restore map focus: ${restored}`);
  }

  await load(page, serviceFixture());
  await page.waitForSelector('.structure-dialog');
  await audit(page, 'structure dialog');
  await page.screenshot({ path: `${output}/07a-structure-dialog-desktop.png`, fullPage: true });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await audit(page, 'structure dialog narrow');
  await page.screenshot({ path: `${output}/07b-structure-dialog-narrow.png` });
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await clickText(page, '.structure-dialog button', 'Timing Blessing');
  await page.waitForSelector('.action-confirm-dialog');
  await audit(page, 'service confirmation');
  await page.screenshot({ path: `${output}/07-service-confirm.png`, fullPage: true });
  await page.locator('.action-confirm-dialog .dialog-actions button').click();
  await page.waitForSelector('.action-confirm-dialog', { hidden: true });
  const confirmationCancelFocus = await page.$eval(':focus', (node) => node.className);
  if (!String(confirmationCancelFocus).includes('map-frame')) {
    throw new Error(`Confirmation cancellation did not restore map focus: ${confirmationCancelFocus}`);
  }

  await load(page, serviceFixture(true));
  await page.waitForSelector('.structure-dialog');
  const disabled = await page.$eval('.structure-action button', (button) => ({
    disabled: (button as HTMLButtonElement).disabled,
    title: (button as HTMLButtonElement).title,
  }));
  if (!disabled.disabled || !disabled.title.includes('costs')) {
    throw new Error(`Disabled service lacks a plain reason: ${JSON.stringify(disabled)}`);
  }
  await page.screenshot({ path: `${output}/08-service-disabled.png`, fullPage: true });

  await load(page, hedgeSchoolFixture());
  await page.waitForSelector('.structure-dialog');
  await clickText(page, '.structure-dialog button', 'Attend a lesson');
  await page.waitForSelector('.action-confirm-dialog');
  await clickText(page, '.action-confirm-dialog button', 'Confirm');
  await page.waitForSelector('.choice-cards');
  const choiceFocused = await page.$eval(':focus', (node) => Boolean(node.closest('.choice-dialog')));
  if (!choiceFocused) throw new Error('Hedge School confirmation did not focus its lesson choice');
  await page.screenshot({ path: `${output}/09-hedge-school-choice.png`, fullPage: true });

  console.log(`Service action review passed. Screenshots written to ${output}.`);
} finally {
  await browser.close();
}
