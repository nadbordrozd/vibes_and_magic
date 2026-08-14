import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const root = process.cwd();
const helper = '/home/nadbor/.codex/skills/.system/imagegen/scripts/remove_chroma_key.py';
const python = resolve('.venv/bin/python');
const windowsChrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const wslChrome = '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe';
const browserExecutable = process.platform === 'win32' ? windowsChrome
  : existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : wslChrome;
const windowsCwd = process.cwd();
const wslRoot = process.platform === 'win32'
  ? `/mnt/${windowsCwd[0].toLowerCase()}${windowsCwd.slice(2).replaceAll('\\', '/')}` : windowsCwd;
const wslRepoPath = (relative) => `${wslRoot}/${relative.replaceAll('\\', '/')}`;
const wsl = (args, options = {}) => execFileSync('wsl.exe', ['-e', ...args], options);
const digest = (value) => createHash('sha256').update(value).digest('hex');
const jobFiles = readdirSync(resolve('assets/jobs'))
  .filter((file) => /^docs-60-67-native-\d+(?:-[a-z-]+)?-built-in\.json$/.test(file)).sort();
const requests = jobFiles.flatMap((file) => {
  const job = JSON.parse(readFileSync(resolve('assets/jobs', file), 'utf8'));
  if (job.status !== 'ready' || job.generator !== 'built-in-imagegen') {
    throw new Error(`${file}: expected ready built-in-imagegen job`);
  }
  return job.requests;
});
const stagingRoot = resolve('.pixel-work/staging/docs-60-67-native');
if (!requests.length || new Set(requests.map((request) => request.id)).size !== requests.length) {
  throw new Error(`Expected one or more distinct requests, found ${requests.length}`);
}

if (!existsSync(browserExecutable)) throw new Error(`Chrome not found: ${browserExecutable}`);
const selectedDigests = new Map();
if (process.platform === 'win32') {
  wsl(['test', '-f', helper]); wsl(['test', '-x', wslRepoPath('.venv/bin/python')]);
  const selected = [...new Set(requests.map((request) => request.selected_output))];
  const hashes = wsl(['sha256sum', '--', ...selected], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  for (const line of hashes.trim().split('\n')) {
    const match = line.match(/^([0-9a-f]{64})\s+(.+)$/);
    if (!match) throw new Error(`Unexpected sha256sum output: ${line}`);
    selectedDigests.set(match[2], match[1]);
  }
  for (const path of selected) if (!selectedDigests.has(path)) {
    throw new Error(`Selected provider output unavailable: ${path}`);
  }
} else {
  if (!existsSync(helper) || !existsSync(python)) throw new Error('Installed chroma helper/python unavailable');
  for (const request of requests) if (!existsSync(request.selected_output)) {
    throw new Error(`${request.id}: selected provider output unavailable`);
  } else selectedDigests.set(request.selected_output, digest(readFileSync(request.selected_output)));
}
console.log(`preflight ok: ${requests.length} inputs, helper, python, Chrome`);

const pendingRequests = requests.filter((request) => !existsSync(resolve(stagingRoot, request.file)));

for (const request of pendingRequests) {
  const provider = resolve(request.provider_source);
  const source = resolve(request.source);
  mkdirSync(dirname(provider), { recursive: true });
  mkdirSync(dirname(source), { recursive: true });
  if (existsSync(provider) && existsSync(source)
      && digest(readFileSync(provider)) === selectedDigests.get(request.selected_output)) continue;
  if (process.platform === 'win32') wsl(['cp', '--', request.selected_output, wslRepoPath(request.provider_source)]);
  else writeFileSync(provider, readFileSync(request.selected_output));
  const helperArgs = [helper, '--input', wslRepoPath(request.provider_source), '--out', wslRepoPath(request.source),
    '--key-color', request.chroma_key, '--soft-matte', '--transparent-threshold', '12',
    '--opaque-threshold', '220', '--despill', '--force'];
  if (process.platform === 'win32') wsl([wslRepoPath('.venv/bin/python'), ...helperArgs], { stdio: 'ignore', timeout: 120000 });
  else execFileSync(python, helperArgs, { stdio: 'ignore', timeout: 120000 });
}
console.log(`alpha helper complete: ${pendingRequests.length} new, ${requests.length - pendingRequests.length} retained provider/source pairs`);

const browserProfile = resolve('.pixel-work/browser-profiles', `docs-60-67-${Date.now()}`);
mkdirSync(browserProfile, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: browserExecutable, userDataDir: browserProfile,
  headless: true, args: ['--disable-gpu', '--no-first-run', '--no-default-browser-check'],
});
try {
  const page = await browser.newPage();
  await page.setContent('<!doctype html>');
  const bake = async (inputs) => page.evaluate(async (inputs) => {
    const output = [];
    for (const item of inputs) {
      const image = new Image();
      image.src = item.sourceUrl;
      await image.decode();
      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = image.width;
      sourceCanvas.height = image.height;
      const sourceContext = sourceCanvas.getContext('2d');
      sourceContext.drawImage(image, 0, 0);
      const sourcePixels = sourceContext.getImageData(0, 0, image.width, image.height);
      let minX = image.width; let minY = image.height; let maxX = -1; let maxY = -1;
      for (let y = 0; y < image.height; y += 1) for (let x = 0; x < image.width; x += 1) {
        if (sourcePixels.data[(y * image.width + x) * 4 + 3] >= 32) {
          minX = Math.min(minX, x); minY = Math.min(minY, y);
          maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        }
      }
      if (maxX < minX || maxY < minY) throw new Error(`${item.id}: no visible subject`);
      const sourceWidth = maxX - minX + 1; const sourceHeight = maxY - minY + 1;
      const canvas = document.createElement('canvas');
      canvas.width = item.w; canvas.height = item.h;
      const context = canvas.getContext('2d');
      context.imageSmoothingEnabled = false;
      const scale = Math.min((item.w - 4) / sourceWidth, (item.h - 4) / sourceHeight);
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));
      const left = Math.floor((item.w - width) / 2);
      const bottomAligned = ['battle-creature', 'guardian-creature', 'dwelling', 'site'].includes(item.family);
      const top = bottomAligned ? item.h - height - 2 : Math.floor((item.h - height) / 2);
      context.drawImage(sourceCanvas, minX, minY, sourceWidth, sourceHeight, left, top, width, height);
      const pixels = context.getImageData(0, 0, item.w, item.h);
      let visible = 0; let transparent = 0; let partial = 0;
      for (let offset = 0; offset < pixels.data.length; offset += 4) {
        const alpha = pixels.data[offset + 3];
        pixels.data[offset + 3] = alpha >= 128 ? 255 : 0;
        if (pixels.data[offset + 3]) visible += 1; else transparent += 1;
        if (pixels.data[offset + 3] !== 0 && pixels.data[offset + 3] !== 255) partial += 1;
      }
      context.putImageData(pixels, 0, 0);
      const corners = [[0, 0], [item.w - 1, 0], [0, item.h - 1], [item.w - 1, item.h - 1]]
        .map(([x, y]) => context.getImageData(x, y, 1, 1).data[3]);
      if (!visible || !transparent || partial || corners.some(Boolean)) {
        throw new Error(`${item.id}: alpha/coverage/corner validation failed`);
      }
      output.push({ ...item, data: canvas.toDataURL('image/png').split(',')[1], visible, transparent });
    }
    return output;
  }, inputs);
  const results = [];
  for (let offset = 0; offset < pendingRequests.length; offset += 4) {
    const inputs = pendingRequests.slice(offset, offset + 4).map((request) => ({
      ...request,
      sourceUrl: `data:image/png;base64,${readFileSync(resolve(request.source)).toString('base64')}`,
    }));
    results.push(...await bake(inputs));
    console.log(`browser bake prepared: ${Math.min(offset + 4, pendingRequests.length)}/${pendingRequests.length} new`);
  }

  for (const result of results) {
    const target = resolve(stagingRoot, result.file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, Buffer.from(result.data, 'base64'));
    console.log(`${result.id}: ${result.w}x${result.h} visible=${result.visible} transparent=${result.transparent}`);
  }

  const inspect = async (inputs) => page.evaluate(async (inputs) => {
    const output = [];
    for (const item of inputs) {
      const image = new Image(); image.src = item.sourceUrl; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, image.width, image.height).data;
      let visible = 0; let transparent = 0; let partial = 0;
      for (let offset = 3; offset < pixels.length; offset += 4) {
        if (pixels[offset] === 0) transparent += 1;
        else if (pixels[offset] === 255) visible += 1;
        else partial += 1;
      }
      const corners = [[0, 0], [image.width - 1, 0], [0, image.height - 1], [image.width - 1, image.height - 1]]
        .map(([x, y]) => context.getImageData(x, y, 1, 1).data[3]);
      if (!visible || !transparent || partial || corners.some(Boolean)) {
        throw new Error(`${item.id}: staged alpha/coverage/corner validation failed`);
      }
      output.push({ id: item.id, visible, transparent });
    }
    return output;
  }, inputs);
  const metrics = new Map();
  for (let offset = 0; offset < requests.length; offset += 8) {
    const inputs = requests.slice(offset, offset + 8).map((request) => ({
      id: request.id,
      sourceUrl: `data:image/png;base64,${readFileSync(resolve(stagingRoot, request.file)).toString('base64')}`,
    }));
    for (const metric of await inspect(inputs)) metrics.set(metric.id, metric);
  }
  const stagedResults = requests.map((request) => ({ ...request,
    ...metrics.get(request.id),
    data: readFileSync(resolve(stagingRoot, request.file)).toString('base64') }));

  const contactSheets = await page.evaluate(async (results) => {
    const output = {};
    const families = [...new Set(results.map((item) => item.family))];
    for (const family of families) {
      const items = results.filter((item) => item.family === family);
      const columns = 5; const cardWidth = 230; const cardHeight = 190;
      const canvas = document.createElement('canvas');
      canvas.width = columns * cardWidth;
      canvas.height = Math.ceil(items.length / columns) * cardHeight;
      const context = canvas.getContext('2d');
      context.fillStyle = '#111711'; context.fillRect(0, 0, canvas.width, canvas.height);
      context.font = '11px sans-serif'; context.textAlign = 'left';
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index]; const left = index % columns * cardWidth;
        const top = Math.floor(index / columns) * cardHeight;
        context.fillStyle = '#1b231b'; context.fillRect(left + 3, top + 3, cardWidth - 6, cardHeight - 6);
        context.strokeStyle = '#c7a950'; context.strokeRect(left + 3, top + 3, cardWidth - 6, cardHeight - 6);
        const image = new Image(); image.src = `data:image/png;base64,${item.data}`; await image.decode();
        const scale = Math.min(3, Math.max(1, Math.floor(140 / Math.max(item.w, item.h))));
        const width = item.w * scale; const height = item.h * scale;
        context.fillStyle = '#e7dfca'; context.fillRect(left + (cardWidth - width) / 2, top + 30, width, height);
        context.imageSmoothingEnabled = false;
        context.drawImage(image, left + (cardWidth - width) / 2, top + 30, width, height);
        context.fillStyle = '#f0d878'; context.fillText(item.id, left + 8, top + 18);
        context.fillStyle = '#aebaa9'; context.fillText(`${item.w}x${item.h} native`, left + 8, top + cardHeight - 12);
      }
      output[family] = canvas.toDataURL('image/png').split(',')[1];
    }
    return output;
  }, stagedResults);
  const review = resolve('.pixel-work/review/docs-60-67-native');
  mkdirSync(review, { recursive: true });
  for (const [family, data] of Object.entries(contactSheets)) {
    writeFileSync(resolve(review, `${family}-contact-sheet.png`), Buffer.from(data, 'base64'));
  }
  const audit = stagedResults.map((result) => ({
    id: result.id, visible_pixels: result.visible, transparent_pixels: result.transparent,
    final_sha256: digest(readFileSync(resolve(stagingRoot, result.file))),
  }));
  if (new Set(audit.map((row) => row.final_sha256)).size !== audit.length) {
    throw new Error('Docs 60–67 final native assets must have unique bytes');
  }
  for (const result of stagedResults) {
    const target = resolve('public', result.file);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(resolve(stagingRoot, result.file), target);
  }
  console.log(`atomic public promotion complete: ${stagedResults.length} validated assets`);
  writeFileSync(resolve(review, 'bake-audit.json'), `${JSON.stringify({ version: 1, entries: audit }, null, 2)}\n`);
} finally {
  await browser.close();
}
