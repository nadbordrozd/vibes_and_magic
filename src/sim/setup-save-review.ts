import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import puppeteer, { type Page } from 'puppeteer-core';
import { createGame } from '../core/game';
import { actionSave, CONTENT_HASH, LOCAL_SAVE_SCHEMA } from '../ui/persistence';

const executablePath = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/google-chrome';
const baseUrl = process.env.BM_URL ?? 'http://127.0.0.1:5173/';
const output = resolve('.pixel-work/review/setup-save');
mkdirSync(output, { recursive: true });

const fixture = createGame({
  seed: 31415, mapId: 'crosstitch-kit', difficulty: 'hard', playerCount: 3,
  p1: 'human', p2: 'ai', p3: 'dormant',
  p1Faction: 'hagwood', p2Faction: 'vespiary', p3Faction: 'wildergrass',
});
const validImport = resolve(output, 'imported-campaign.vam-save.json');
const corruptImport = resolve(output, 'corrupt-campaign.vam-save.json');
writeFileSync(validImport, JSON.stringify(actionSave(fixture), null, 2));
writeFileSync(corruptImport, '{not valid json');

async function clickButtonWithText(page: Page, text: string): Promise<void> {
  await page.$$eval('button', (buttons, label) => {
    const button = buttons.find((candidate) => candidate.textContent?.includes(label));
    if (!button) throw new Error(`Button containing "${label}" was not found`);
    button.click();
  }, text);
}

async function openTitleExit(page: Page): Promise<void> {
  await clickButtonWithText(page, 'Menu & saves');
  await clickButtonWithText(page, 'Return to title');
  await page.waitForSelector('.title-exit-dialog');
}

async function chooseFile(page: Page, buttonText: string, path: string): Promise<void> {
  const chooser = page.waitForFileChooser();
  await clickButtonWithText(page, buttonText);
  await (await chooser).accept([path]);
}

async function auditMenu(page: Page, name: string): Promise<void> {
  const result = await page.evaluate(() => ({
    horizontalOverflow: document.documentElement.scrollWidth
      - document.documentElement.clientWidth,
    setupVisible: Boolean(document.querySelector('.menu-modes button.selected')?.textContent?.includes('New')),
    mapChoices: document.querySelectorAll('label select option').length,
    exactObjectives: [...document.querySelectorAll('label select option')]
      .filter((option) => (option.textContent ?? '').includes(' · ')).length,
    controllerLegend: document.querySelectorAll('.controller-legend span').length,
    saves: [...document.querySelectorAll<HTMLElement>('.save-row')].map((row) => ({
      className: row.className,
      disabled: Boolean(row.querySelector<HTMLButtonElement>('.load-button')?.disabled),
      text: row.textContent ?? '',
    })),
  }));
  if (result.horizontalOverflow > 2
      || (result.setupVisible && (result.mapChoices < 7
        || result.exactObjectives < 7 || result.controllerLegend !== 3))) {
    throw new Error(`${name} setup audit failed: ${JSON.stringify(result)}`);
  }
}

const browser = await puppeteer.launch({
  executablePath, headless: true, args: ['--disable-gpu'],
});

try {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(Crypto.prototype, 'getRandomValues', {
      configurable: true,
      value<T extends ArrayBufferView | null>(array: T): T {
        if (array && 'length' in array) (array as Uint32Array)[0] = 3_141_592_653;
        return array;
      },
    });
  });
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.goto(baseUrl, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await auditMenu(page, 'desktop empty');
  if (await page.$('.save-row')) throw new Error('Empty fixture unexpectedly rendered a save row');
  await page.screenshot({ path: `${output}/01-empty-desktop.png`, fullPage: true });

  const compatible = actionSave(fixture);
  const mismatch = { ...compatible, contentHash: 'review-old-content' };
  await page.evaluate(({ compatibleSave, mismatchSave, contentHash, schema }) => {
    const summary = {
      savedAt: Date.UTC(2026, 7, 6, 9, 30), schemaVersion: schema,
      contentHash, day: 1, week: 1, activePlayer: 'Player 1',
    };
    localStorage.setItem('border-marches.save.v4', JSON.stringify(compatibleSave));
    localStorage.setItem('border-marches.save.v4.meta', JSON.stringify(summary));
    localStorage.setItem('border-marches.save.v4.1', JSON.stringify(mismatchSave));
    localStorage.setItem('border-marches.save.v4.1.meta', JSON.stringify(summary));
    localStorage.setItem('border-marches.save.v4.auto-0', '{broken json');
  }, { compatibleSave: compatible, mismatchSave: mismatch, contentHash: CONTENT_HASH,
    schema: LOCAL_SAVE_SCHEMA });
  await page.reload({ waitUntil: 'networkidle0' });
  await auditMenu(page, 'desktop populated');
  const saveStates = await page.$$eval('.save-row', (rows) => rows.map((row) => ({
    text: row.textContent ?? '',
    disabled: Boolean(row.querySelector<HTMLButtonElement>('.load-button')?.disabled),
  })));
  if (saveStates.length !== 3 || !saveStates.some((row) => row.text.includes('content mismatch'))
      || !saveStates.some((row) => row.text.includes('corrupt data') && row.disabled)) {
    throw new Error(`Save-state fixture is incomplete: ${JSON.stringify(saveStates)}`);
  }
  await page.screenshot({ path: `${output}/02-populated-desktop.png`, fullPage: true });

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await auditMenu(page, 'narrow populated');
  await page.screenshot({ path: `${output}/03-populated-narrow.png`, fullPage: true });

  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.locator('.save-row.compatible .load-button').click();
  await page.waitForSelector('.adventure-map');
  if (await page.$('.objective-primer')) await clickButtonWithText(page, 'Take the field');
  await openTitleExit(page);
  const warning = await page.$eval('.title-exit-dialog', (node) => node.textContent ?? '');
  if (!warning.includes('entire campaign if no save exists')) {
    throw new Error(`Title exit does not state its consequence: ${warning}`);
  }
  await page.screenshot({ path: `${output}/04-title-exit-desktop.png` });
  await clickButtonWithText(page, 'Cancel — keep playing');
  if (!await page.$('.adventure-map')) throw new Error('Canceling title exit discarded the campaign');
  await openTitleExit(page);
  await clickButtonWithText(page, 'Leave and return to title');
  await page.waitForSelector('.menu-shell');

  await chooseFile(page, 'Import save file', validImport);
  await page.waitForSelector('.adventure-map');
  await page.screenshot({ path: `${output}/05-imported-campaign.png` });
  if (await page.$('.objective-primer')) await clickButtonWithText(page, 'Take the field');
  await openTitleExit(page);
  await clickButtonWithText(page, 'Leave and return to title');
  await page.waitForSelector('.menu-shell');

  await chooseFile(page, 'Import save file', corruptImport);
  await page.waitForSelector('.error-toast');
  const importError = await page.$eval('.error-toast', (node) => node.textContent ?? '');
  if (!importError.includes('No campaign was changed') || !importError.includes('Dismiss')) {
    throw new Error(`Import error is not recoverable: ${importError}`);
  }
  await page.screenshot({ path: `${output}/06-corrupt-import.png`, fullPage: true });
  await page.locator('.error-toast').click();
  await page.waitForSelector('.error-toast', { hidden: true });

  console.log(`Setup/save review passed: ${output}`);
} finally {
  await browser.close();
}
