import puppeteer from 'puppeteer-core';

const executablePath = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/google-chrome';
const baseUrl = process.env.BM_URL ?? 'http://localhost:5173/';
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--disable-gpu'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.goto(baseUrl, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'smoke-menu.png' });
  await page.locator('.start-button').click();
  await page.waitForSelector('.adventure-map');
  await page.screenshot({ path: 'smoke-adventure.png' });
  await page.locator('.topbar-action').click();
  await page.waitForSelector('.notice-toast');
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('.load-button');
  await page.locator('.load-button').click();
  await page.waitForSelector('.adventure-map');

  await page.locator('.hero-panel .secondary').click();
  await page.waitForSelector('.castle-screen');
  await page.screenshot({ path: 'smoke-castle.png' });
  await page.locator('.castle-screen .close-button').click();
  await page.waitForSelector('.castle-screen', { hidden: true });

  const map = await page.$('.adventure-map');
  if (!map) throw new Error('Adventure map was not rendered');
  const box = await map.boundingBox();
  if (!box) throw new Error('Adventure map has no visible bounds');
  const targetX = box.x + box.width * (4.5 / 28);
  const targetY = box.y + box.height * (10.5 / 20);
  await page.mouse.click(targetX, targetY);
  await page.mouse.click(targetX, targetY);
  await page.waitForFunction(
    () => document.querySelector('.meter-label b')?.textContent !== '2000 / 2000',
  );
  await page.locator('.castle-shortcuts .secondary').click();
  await page.waitForSelector('.remote-castle-note');
  await page.locator('.castle-screen .close-button').click();
  await page.waitForSelector('.castle-screen', { hidden: true });
  const mineX = box.x + box.width * (7.5 / 28);
  const mineY = box.y + box.height * (10.5 / 20);
  await page.mouse.click(mineX, mineY);
  await page.mouse.click(mineX, mineY);
  await page.waitForSelector('.combat-shell');
  await page.screenshot({ path: 'smoke-combat.png' });
  await (await page.$('.battle-stack.azure'))!.click();
  await page.waitForFunction(
    () => document.querySelector('.active-unit')?.textContent?.includes('Top HP'),
  );
  await page.screenshot({ path: 'smoke-unit-stats.png' });
  let animatedAttack = false;
  for (let turn = 0; turn < 8 && !animatedAttack; turn += 1) {
    const attack = await page.$('.attack-selected:not([disabled])');
    if (attack) {
      await attack.click();
      await page.waitForSelector('.attack-bump');
      await page.waitForSelector('.damage-effect');
      await page.screenshot({ path: 'smoke-damage.png' });
      await page.waitForSelector('.damage-effect', { hidden: true });
      animatedAttack = true;
      break;
    }
    const reachable = await page.$$('.battle-hex.reachable');
    const options = (await Promise.all(reachable.map(async (hex) => ({
      hex,
      box: await hex.boundingBox(),
    })))).filter((option) => option.box !== null);
    const furthest = options.sort((a, b) => b.box!.x - a.box!.x)[0];
    if (!furthest?.box) throw new Error('No reachable combat hex for animation check');
    await page.mouse.click(
      furthest.box.x + furthest.box.width / 2,
      furthest.box.y + furthest.box.height / 2,
    );
    await page.waitForFunction(
      () => [...document.querySelectorAll('.stack-motion')]
        .some((node) => parseFloat(getComputedStyle(node).transitionDuration) > 0),
    );
    await page.waitForSelector('.combat-actions .auto:not([disabled])');
    await (await page.$('.battle-stack.azure'))!.click();
  }
  if (!animatedAttack) throw new Error('Could not reach an animated attack in browser smoke');
  await page.waitForSelector('.combat-actions .auto:not([disabled])');
  await page.locator('.combat-actions .auto').click();
  await page.waitForSelector('.result-dialog');
  await page.screenshot({ path: 'smoke-result.png' });

  const title = await page.title();
  if (title !== 'Border Marches') throw new Error(`Unexpected page title: ${title}`);
  console.log(
    'Browser smoke passed: save/load → remote castle → map animation '
    + '→ combat movement/attack/damage → unit inspection → result',
  );
} finally {
  await browser.close();
}
