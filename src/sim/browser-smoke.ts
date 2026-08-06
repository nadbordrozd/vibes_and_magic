import puppeteer, { type Page } from 'puppeteer-core';

async function clickMapTile(
  page: Page, x: number, y: number, mapWidth = 28, mapHeight = 20,
): Promise<void> {
  await page.$eval('.adventure-map', (node, target) => {
    const map = node as SVGSVGElement;
    const frame = map.closest<HTMLElement>('.map-frame');
    if (!frame) throw new Error('Adventure map frame is missing');
    const frameBounds = frame.getBoundingClientRect();
    const mapBounds = map.getBoundingClientRect();
    const mapLeft = frame.scrollLeft + mapBounds.left - frameBounds.left;
    const mapTop = frame.scrollTop + mapBounds.top - frameBounds.top;
    frame.scrollTo({
      left: mapLeft + mapBounds.width * ((target.x + 0.5) / target.mapWidth)
        - frame.clientWidth / 2,
      top: mapTop + mapBounds.height * ((target.y + 0.5) / target.mapHeight)
        - frame.clientHeight / 2,
    });
  }, { x, y, mapWidth, mapHeight });
  await page.evaluate(() => new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const index = y * mapWidth + x;
  const target = await page.$$eval('.terrain-cell', (nodes, targetIndex) => {
    const target = nodes[targetIndex];
    if (!target) throw new Error(`Adventure tile ${targetIndex} is missing`);
    const rect = target.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, index);
  await page.mouse.move(target.x, target.y);
  await page.evaluate(() => new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.mouse.click(target.x, target.y);
  await new Promise((resolve) => setTimeout(resolve, 100));
  await page.waitForFunction(() => Boolean(document.querySelector('.combat-shell'))
    || document.querySelector('.adventure-map')?.getAttribute('data-moving') === 'false');
}

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
  page.on('pageerror', (error) => console.error(`browser page error: ${
    error instanceof Error ? error.message : String(error)
  }`));
  page.on('console', (message) => {
    if (message.type() === 'error') console.error(`browser console error: ${message.text()}`);
  });
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.goto(baseUrl, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'smoke-menu.png' });
  await page.locator('.start-button').click();
  await page.waitForSelector('.adventure-map');
  await page.locator('.choice-dialog .primary').click();
  await page.waitForSelector('.choice-dialog', { hidden: true });
  await page.waitForSelector('.terrain-composite');
  await page.screenshot({ path: 'smoke-adventure.png' });
  await page.locator('.topbar-action').click();
  await page.waitForSelector('.notice-toast');
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('.load-button');
  await page.locator('.load-button').click();
  await page.waitForSelector('.adventure-map');
  await page.locator('.choice-dialog .primary').click();
  await page.waitForSelector('.choice-dialog', { hidden: true });
  await page.waitForSelector('.terrain-composite');
  const resourceIconCount = await page.$$eval('.resource-bar .resource-icon', (icons) =>
    icons.filter((icon) => icon.getBoundingClientRect().width >= 30).length);
  if (resourceIconCount !== 4) throw new Error('Top bar does not show four readable resource sprites');
  const emptyTerrain = await page.$$eval(
    '.terrain-cell.terrain-seen.terrain-reachable.terrain-hitbox',
    (nodes) => nodes.flatMap((node) => {
      const box = node.getBoundingClientRect();
      const frame = node.closest('.map-frame')!.getBoundingClientRect();
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      const top = document.elementFromPoint(x, y);
      const cell = node.parentNode as SVGGElement;
      const mapX = Number(cell.dataset.mapX);
      const mapY = Number(cell.dataset.mapY);
      return top === node && x > frame.left && x < frame.right && y > frame.top && y < frame.bottom
        && !(mapX === 4 && mapY === 10) && !(mapX === 7 && mapY === 11)
        ? [{ x, y }] : [];
    }),
  );
  let emptyDestinationVerified = false;
  for (const point of emptyTerrain) {
    await page.mouse.move(point.x, point.y);
    await page.waitForSelector('.inspect-label');
    const terrainLabel = await page.$eval('.inspect-label b', (node) => node.textContent ?? '');
    if (!terrainLabel) throw new Error('Empty terrain hover did not expose a terrain label');
    await page.mouse.click(point.x, point.y);
    if (await page.$('.path-preview')) {
      emptyDestinationVerified = true;
      break;
    }
  }
  if (!emptyDestinationVerified) throw new Error('No empty reachable terrain accepted a destination click');
  // Restore the deterministic saved opening after proving an empty tile accepts a single click;
  // the randomly chosen visible test tile must not alter the later guardian encounter setup.
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('.load-button');
  await page.locator('.load-button').click();
  await page.waitForSelector('.adventure-map');
  await page.locator('.choice-dialog .primary').click();
  await page.waitForSelector('.choice-dialog', { hidden: true });
  await page.$eval('.map-object-glyph[data-inspect-kind="object"]', (node) =>
    node.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })));
  await page.waitForSelector('.inspection-card .inspection-flavor');
  await page.screenshot({ path: 'smoke-inspection-undiscovered.png' });
  await page.locator('.inspection-close').click();
  await page.waitForSelector('.inspection-card', { hidden: true });

  await page.locator('.castle-shortcuts .secondary').click();
  await page.waitForSelector('.castle-screen');
  await page.screenshot({ path: 'smoke-castle.png' });
  const forbiddenDwellingLabel = await page.$eval('.castle-screen', (node) =>
    /Tier [1-6] Dwelling/.test(node.textContent ?? ''));
  if (forbiddenDwellingLabel) throw new Error('Castle still shows a generic dwelling name');
  await page.waitForSelector('.building-card.gold[data-inspect-id="tavern@hearthguard"]');
  await page.locator('.building-card.red[data-inspect-id="dwelling3@hearthguard"]').click();
  await page.waitForSelector('.building-detail .building-state-line.locked');
  await page.waitForSelector('.building-detail .building-costs .resource-icon');
  await page.locator('.building-detail .inspection-close').click();
  await page.$eval('.building-card[data-inspect-id="tavern@hearthguard"]', (node) =>
    node.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })));
  await page.waitForSelector('.building-detail .building-state-line.built');
  await page.locator('.building-detail .inspection-close').click();
  await page.locator('.building-card.green[data-inspect-id="marketplace@hearthguard"]').click();
  await page.locator('.building-detail .primary').click();
  await page.waitForSelector('.building-card.gold[data-inspect-id="marketplace@hearthguard"]');
  await page.waitForSelector('.building-card.red[data-inspect-id="townHall@hearthguard"]');
  await page.locator('.castle-screen .close-button').click();
  await page.waitForSelector('.castle-screen', { hidden: true });

  // The castle's full 3x2 picture is now an entrance-routed hit target, so leave by the first
  // passable tile below its footprint rather than clicking a non-entrance footprint cell.
  await clickMapTile(page, 4, 11);
  await page.waitForFunction(
    () => document.querySelector('.meter-label b')?.textContent !== '2000 / 2000',
  );
  await page.locator('.castle-shortcuts .secondary').click();
  await page.waitForSelector('.remote-castle-note');
  await page.locator('.castle-screen .close-button').click();
  await page.waitForSelector('.castle-screen', { hidden: true });
  const guardianPresentation = await page.$eval(
    '.guardian-object[data-guardian-unit="yeoman"]',
    (node) => ({
      cursor: getComputedStyle(node).cursor,
      title: node.querySelector('title')?.textContent ?? '',
      caption: node.querySelector('.guard-count')?.textContent ?? '',
      sprite: Boolean(node.querySelector('.guardian-unit-pixel')),
      shield: Boolean(node.querySelector('.guardian-shield')),
    }),
  );
  if (!guardianPresentation.cursor.includes('data:image/svg+xml')
      || !guardianPresentation.title.includes('Yeoman') || guardianPresentation.caption
      || !guardianPresentation.sprite || guardianPresentation.shield) {
    throw new Error(`Guardian presentation is incomplete: ${JSON.stringify(guardianPresentation)}`);
  }
  await page.screenshot({ path: 'smoke-before-combat.png' });
  await clickMapTile(page, 7, 11);
  await page.waitForSelector('.combat-shell');
  await page.screenshot({ path: 'smoke-combat.png' });
  await page.$eval('.battle-stack[data-inspect-kind="unit"]', (node) =>
    node.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })));
  await page.waitForSelector('.inspection-card .inspection-mechanics');
  await page.screenshot({ path: 'smoke-inspection-unit.png' });
  await page.locator('.inspection-close').click();
  await page.waitForSelector('.inspection-card', { hidden: true });
  const selectDefender = () => page.$eval('.battle-hex.enemy-occupied', (node) =>
    node.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true, cancelable: true, clientX: 1, clientY: 1,
    })));
  await selectDefender();
  await page.waitForFunction(
    () => document.querySelector('.active-unit')?.textContent?.includes('Top HP'),
  );
  await page.screenshot({ path: 'smoke-unit-stats.png' });
  let animatedAttack = false;
  for (let turn = 0; turn < 12 && !animatedAttack; turn += 1) {
    // Re-select after each AI response. Puppeteer's click resolves before React necessarily commits
    // the selected target, so wait two frames before checking the context-sensitive attack button.
    await selectDefender();
    await page.evaluate(() => new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const attack = await page.$('.battle-hex.attackable');
    if (attack) {
      const box = await attack.boundingBox();
      if (!box) throw new Error('Attackable enemy hex has no hit box');
      await page.mouse.move(box.x + box.width / 2, box.y + box.height - 3);
      await page.waitForSelector('.combat-sword-cursor');
      await page.mouse.click(box.x + box.width / 2, box.y + box.height - 3);
      await page.waitForSelector('.attack-bump, .ranged-projectile');
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
    if (!furthest?.box) {
      // A wide stack can be legally boxed in even though it can still defend. Advance to the next
      // human stack instead of making the animation smoke depend on every footprint having a move.
      await page.$eval('.combat-actions', (node) => {
        const defend = [...node.querySelectorAll<HTMLButtonElement>('button')]
          .find((button) => button.textContent?.includes('Defend') && !button.disabled);
        if (!defend) throw new Error('Active stack can neither move nor defend');
        defend.click();
      });
      await page.waitForSelector('.combat-actions .auto:not([disabled])');
      await selectDefender();
      continue;
    }
    await page.mouse.click(
      furthest.box.x + furthest.box.width / 2,
      furthest.box.y + furthest.box.height / 2,
    );
    await page.waitForFunction(
      () => [...document.querySelectorAll('.stack-motion')]
        .some((node) => parseFloat(getComputedStyle(node).transitionDuration) > 0),
    );
    await page.waitForSelector('.combat-actions .auto:not([disabled])');
    await selectDefender();
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
    + '→ castle cards/detail/build → flavor inspection → combat movement/attack/damage '
    + '→ generated unit card → result',
  );
} finally {
  await browser.close();
}
