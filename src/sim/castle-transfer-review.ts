import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { makeArmy } from '../core/army';
import { createGame } from '../core/game';
import { castleEntrance } from '../core/map/occupancy';
import { actionSave } from '../ui/persistence';

const executablePath = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/google-chrome';
const baseUrl = process.env.BM_URL ?? 'http://127.0.0.1:5173/';
const output = '.pixel-work/review/castle-transfer';
mkdirSync(output, { recursive: true });

const state = createGame({
  seed: 7051, mapId: 'grand-muster', difficulty: 'normal',
  p1: 'human', p2: 'dormant',
});
const hero = state.players.p1.hero!;
const castle = state.castles.find((candidate) => candidate.owner === 'p1')!;
hero.position = castleEntrance(castle);
hero.army = makeArmy([
  { unitId: 'yeoman', count: 9 }, { unitId: 'longbowman', count: 4 },
]);
castle.garrison = makeArmy([
  { unitId: 'yeoman', count: 2 }, { unitId: 'bannerman', count: 6 },
]);
state.pendingChoice = null;
state.replay = [];

const browser = await puppeteer.launch({
  executablePath, headless: true, args: ['--disable-gpu'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.goto(baseUrl, { waitUntil: 'networkidle0' });
  const save = actionSave(state);
  await page.evaluate(({ persisted, initial }) => {
    localStorage.setItem('border-marches.save.v4', JSON.stringify(persisted));
    localStorage.setItem('border-marches.save.v4.initial', JSON.stringify(initial));
    localStorage.setItem('border-marches.save.v4.setup', JSON.stringify(initial.setup));
  }, { persisted: save, initial: state });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.locator('.load-button').click();
  await page.waitForSelector('.adventure-map');
  if (await page.$('.objective-primer')) {
    await page.locator('.choice-dialog .primary').click();
    await page.waitForSelector('.objective-primer', { hidden: true });
  }
  await page.locator('.town-list button').click();
  await page.locator('[data-castle-view="army"]').click();
  await page.waitForSelector('.direct-exchange');

  const source = await page.$(
    '.direct-transfer-side:first-child .army-slot-wrap:nth-child(1) .army-slot',
  );
  if (!source) throw new Error('Keyboard source slot is missing');
  await source.focus();
  await source.press('Enter');
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  if (!await page.$('.direct-transfer-actions')) {
    const keyboardState = await page.evaluate(() => ({
      active: document.activeElement?.outerHTML.slice(0, 400),
      selected: Boolean(document.querySelector('.direct-exchange .army-slot.selected')),
    }));
    const sourceState = await source.evaluate((slot) => ({
      disabled: (slot as HTMLButtonElement).disabled,
      connected: slot.isConnected,
      html: slot.outerHTML.slice(0, 500),
    }));
    throw new Error(`Enter did not activate the focused source: ${JSON.stringify({
      keyboardState, sourceState,
    })}`);
  }
  const selected = await page.$eval('.direct-transfer-side:first-child .army-slot.selected',
    (slot) => slot.getAttribute('data-inspect-id'));
  if (selected !== 'yeoman') throw new Error(`Enter selected ${selected ?? 'nothing'} instead of Yeoman`);

  await page.$eval('.direct-transfer-actions', (actions) => {
    const partial = [...actions.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Partial'));
    if (!partial) throw new Error('Partial control is missing');
    partial.click();
  });
  await page.$eval('.direct-transfer-actions input[type="number"]', (input) => {
    const control = input as HTMLInputElement;
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (!setValue) throw new Error('Native number input setter is missing');
    setValue.call(control, '3');
    control.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const destination = await page.$(
    '.direct-transfer-side:last-child .army-slot-wrap:nth-child(3) .army-slot',
  );
  if (!destination) throw new Error('Keyboard destination slot is missing');
  await destination.focus();
  await destination.press('Enter');
  await page.waitForFunction(() => (document.querySelector('.message-strip')?.textContent ?? '')
    .includes('transferred'));
  if (await page.$('.direct-exchange .army-slot.selected')) {
    throw new Error('Keyboard transfer did not clear the selected source');
  }
  const result = await page.$$eval('.direct-transfer-side .army-slot', (slots) =>
    slots.map((slot) => ({
      unit: slot.getAttribute('data-inspect-id'),
      count: Number(slot.querySelector('b')?.textContent ?? 0),
    })));
  if (result[0]?.unit !== 'yeoman' || result[0].count !== 6
      || result[9]?.unit !== 'yeoman' || result[9].count !== 3) {
    throw new Error(`Keyboard exact transfer produced the wrong slots: ${JSON.stringify(result)}`);
  }
  await page.$eval('.direct-exchange', (node) => node.scrollIntoView({ block: 'center' }));
  await page.screenshot({ path: `${output}/keyboard-desktop.png` });

  const cancelSource = await page.$(
    '.direct-transfer-side:last-child .army-slot-wrap:nth-child(1) .army-slot',
  );
  if (!cancelSource) throw new Error('Keyboard cancel source slot is missing');
  await cancelSource.focus();
  await cancelSource.press(' ');
  await page.waitForSelector('.direct-transfer-actions');
  await page.keyboard.press('Escape');
  if (await page.$('.direct-exchange .army-slot.selected')) {
    throw new Error('Escape did not cancel a keyboard source selection');
  }

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.$eval('.direct-exchange', (node) => node.scrollIntoView({ block: 'center' }));
  const layout = await page.$eval('.direct-exchange', (exchange) => ({
    overflow: exchange.scrollWidth - exchange.clientWidth,
    rows: [...exchange.querySelectorAll('.direct-transfer-side')].map((row) => ({
      slots: row.querySelectorAll('.army-slot').length,
      overflow: row.scrollWidth - row.clientWidth,
    })),
  }));
  if (layout.overflow > 2 || layout.rows.some((row) => row.slots !== 7 || row.overflow > 2)) {
    throw new Error(`Narrow castle transfer overflowed: ${JSON.stringify(layout)}`);
  }
  await page.screenshot({ path: `${output}/keyboard-narrow.png` });
  console.log('Castle transfer review passed: Enter/Space selection, exact keyboard transfer, Escape cancel, desktop/narrow 7-slot layout.');
} finally {
  await browser.close();
}
