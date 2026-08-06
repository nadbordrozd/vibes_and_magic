import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const job = process.argv[2];
if (!job || !/^[a-z0-9-]+$/.test(job)) {
  throw new Error('Usage: tsx src/sim/terrain-candidate-review.ts <job-name>');
}

const executablePath = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/google-chrome';
const source = resolve(`assets/jobs/${job}-candidates.html`);
const output = resolve(`.pixel-work/review/${job}-candidates.png`);
mkdirSync(resolve('.pixel-work/review'), { recursive: true });

const browser = await puppeteer.launch({
  executablePath, headless: true, args: ['--disable-gpu', '--allow-file-access-from-files'],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1200, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(source).href, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: output, fullPage: true });
} finally {
  await browser.close();
}

console.log(output);
