import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const executablePath = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/google-chrome';
const baseUrl = process.env.BM_URL ?? 'http://127.0.0.1:5173/';
const outputDir = '.pixel-work/review';
mkdirSync(outputDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath, headless: true, args: ['--disable-gpu'],
});

try {
  const setup = await browser.newPage();
  await setup.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await setup.goto(baseUrl, { waitUntil: 'networkidle0' });
  await setup.locator('.start-button').click();
  await setup.waitForSelector('.adventure-map');
  const setupChoice = await setup.$('.choice-dialog .primary');
  if (setupChoice) {
    await setupChoice.click();
    await setup.waitForSelector('.choice-dialog', { hidden: true });
  }
  await setup.$eval('.rail-commands', (commands) => {
    const menu = [...commands.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Menu & saves'))!;
    menu.click();
  });
  await setup.locator('.command-menu-grid .primary').click();
  await setup.waitForSelector('.notice-toast');
  await setup.close();

  for (const mode of ['scattered', 'border'] as const) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
    const url = new URL(baseUrl);
    url.searchParams.set('forestExperiment', mode);
    await page.goto(url.toString(), { waitUntil: 'networkidle0' });
    await page.locator('.load-button').click();
    await page.waitForSelector('.adventure-map');
    const choice = await page.$('.choice-dialog .primary');
    if (choice) {
      await choice.click();
      await page.waitForSelector('.choice-dialog', { hidden: true });
    }
    await page.screenshot({ path: `${outputDir}/forest-${mode}-ingame.png` });
    console.log(`ok forest ${mode} screenshot`);
    await page.close();
  }
} finally {
  await browser.close();
}
