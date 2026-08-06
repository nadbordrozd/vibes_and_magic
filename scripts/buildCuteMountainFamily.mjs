import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const outputDirectory = resolve('public/assets/decorations');
const reviewPath = resolve('.pixel-work/review/doc33-mountain-family-v2-contact.png');
const executablePath = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : '/usr/bin/google-chrome';

// Each size class has its own generated source. Nothing here enlarges a small source or derives a
// small piece from a massif: every final file is cut from a distinct authored subject in its class.
const groups = [
  {
    source: 'assets/sources/mountain-family-v2/granite-scatter-transparent.png',
    palette: 'granite',
    columns: 3, rows: 2,
    pieces: Array.from({ length: 6 }, (_, index) => ({
      file: `mountain-granite-scatter-${index + 1}.png`, w: 32, h: 48, maxVisibleH: 30,
    })),
  },
  {
    source: 'assets/sources/mountain-family-v2/granite-knolls-transparent.png',
    palette: 'granite',
    columns: 2, rows: 2,
    pieces: Array.from({ length: 4 }, (_, index) => ({
      file: `mountain-granite-knoll-${index + 1}.png`, w: 64, h: 64, maxVisibleH: 52,
    })),
  },
  {
    source: 'assets/sources/mountain-family-v3/granite-ridges-topdown-transparent.png',
    palette: 'granite',
    columns: 2, rows: 2,
    pieces: Array.from({ length: 4 }, (_, index) => ({
      file: `mountain-granite-ridge-${index + 1}.png`, w: 96, h: 96, maxVisibleH: 88,
    })),
  },
  {
    source: 'assets/sources/mountain-family-v2/granite-massifs-transparent.png',
    palette: 'granite',
    columns: 2, rows: 1,
    pieces: Array.from({ length: 2 }, (_, index) => ({
      file: `mountain-granite-massif-${index + 1}.png`, w: 160, h: 112, maxVisibleH: 88,
    })),
  },
  {
    source: 'assets/sources/mountain-family-v2/snowcap-scatter-transparent.png',
    palette: 'snowcap', columns: 3, rows: 2,
    pieces: Array.from({ length: 6 }, (_, index) => ({
      file: `mountain-snowcap-scatter-${index + 1}.png`, w: 32, h: 48, maxVisibleH: 30,
    })),
  },
  {
    source: 'assets/sources/mountain-family-v2/snowcap-knolls-transparent.png',
    palette: 'snowcap', columns: 2, rows: 2,
    pieces: Array.from({ length: 4 }, (_, index) => ({
      file: `mountain-snowcap-knoll-${index + 1}.png`, w: 64, h: 64, maxVisibleH: 52,
    })),
  },
  {
    source: 'assets/sources/mountain-family-v3/snowcap-ridges-topdown-transparent.png',
    palette: 'snowcap', columns: 2, rows: 2,
    pieces: Array.from({ length: 4 }, (_, index) => ({
      file: `mountain-snowcap-ridge-${index + 1}.png`, w: 96, h: 96, maxVisibleH: 88,
    })),
  },
  {
    source: 'assets/sources/mountain-family-v2/snowcap-massifs-transparent.png',
    palette: 'snowcap', columns: 2, rows: 1,
    pieces: Array.from({ length: 2 }, (_, index) => ({
      file: `mountain-snowcap-massif-${index + 1}.png`, w: 160, h: 112, maxVisibleH: 88,
    })),
  },
];

const palettes = {
  granite: [
    [31, 38, 34], [43, 50, 44], [54, 61, 52], [68, 72, 61],
    [79, 82, 68], [93, 94, 76], [109, 107, 87], [126, 121, 98],
    [145, 137, 111], [166, 157, 129], [190, 181, 151], [216, 207, 177],
    [39, 69, 34], [51, 88, 40], [67, 108, 47], [86, 132, 55],
    [111, 157, 67], [139, 177, 82],
  ],
  snowcap: [
    [44, 40, 55], [59, 58, 72], [74, 78, 91], [91, 101, 106], [113, 119, 121],
    [137, 143, 141], [168, 171, 163], [193, 198, 190], [220, 222, 211],
  ],
};

mkdirSync(outputDirectory, { recursive: true });
mkdirSync(dirname(reviewPath), { recursive: true });
const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--disable-gpu'] });

try {
  const page = await browser.newPage();
  await page.setContent('<!doctype html>');
  const inputs = groups.map((group) => ({
    ...group,
    sourceUrl: `data:image/png;base64,${readFileSync(resolve(group.source)).toString('base64')}`,
  }));
  const results = await page.evaluate(async ({ inputs, palettes }) => {
    const nearest = (red, green, blue, palette) => palette.reduce((best, color) => {
      const distance = (red - color[0]) ** 2 + (green - color[1]) ** 2
        + (blue - color[2]) ** 2;
      return distance < best.distance ? { color, distance } : best;
    }, { color: palette[0], distance: Number.POSITIVE_INFINITY }).color;

    const output = [];
    for (const group of inputs) {
      const palette = palettes[group.palette];
      const image = new Image();
      image.src = group.sourceUrl;
      await image.decode();
      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = image.width;
      sourceCanvas.height = image.height;
      const sourceContext = sourceCanvas.getContext('2d');
      sourceContext.drawImage(image, 0, 0);
      const sourcePixels = sourceContext.getImageData(0, 0, image.width, image.height);

      for (let index = 0; index < group.pieces.length; index += 1) {
        const piece = group.pieces[index];
        const column = index % group.columns;
        const row = Math.floor(index / group.columns);
        const cellLeft = Math.floor(column * image.width / group.columns);
        const cellRight = Math.floor((column + 1) * image.width / group.columns);
        const cellTop = Math.floor(row * image.height / group.rows);
        const cellBottom = Math.floor((row + 1) * image.height / group.rows);
        let minX = cellRight;
        let minY = cellBottom;
        let maxX = cellLeft;
        let maxY = cellTop;
        for (let y = cellTop; y < cellBottom; y += 1) for (let x = cellLeft; x < cellRight; x += 1) {
          if (sourcePixels.data[(y * image.width + x) * 4 + 3] > 32) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
        if (maxX < minX || maxY < minY) throw new Error(`No subject found for ${piece.file}`);

        const sourceWidth = maxX - minX + 1;
        const sourceHeight = maxY - minY + 1;
        const canvas = document.createElement('canvas');
        canvas.width = piece.w;
        canvas.height = piece.h;
        const context = canvas.getContext('2d');
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        const scale = Math.min(piece.w / sourceWidth, piece.maxVisibleH / sourceHeight);
        const width = Math.max(1, Math.round(sourceWidth * scale));
        const height = Math.max(1, Math.round(sourceHeight * scale));
        const left = Math.floor((piece.w - width) / 2);
        const top = piece.h - height;
        context.drawImage(sourceCanvas, minX, minY, sourceWidth, sourceHeight,
          left, top, width, height);

        const pixels = context.getImageData(0, 0, piece.w, piece.h);
        for (let offset = 0; offset < pixels.data.length; offset += 4) {
          if (pixels.data[offset + 3] < 112) {
            pixels.data[offset + 3] = 0;
            continue;
          }
          const color = nearest(
            pixels.data[offset], pixels.data[offset + 1], pixels.data[offset + 2], palette,
          );
          pixels.data.set([...color, 255], offset);
        }

        // A one-pixel scree contact at both extremes guarantees that the visible mass covers its
        // declared contact while still self-terminating instead of ending in a cut cliff.
        for (const x of [0, piece.w - 1]) {
          for (let y = 0; y < piece.h - 1; y += 1) pixels.data[(y * piece.w + x) * 4 + 3] = 0;
          pixels.data.set([...palette[3], 255], ((piece.h - 1) * piece.w + x) * 4);
        }
        context.putImageData(pixels, 0, 0);
        output.push({ ...piece, data: canvas.toDataURL('image/png').split(',')[1] });
      }
    }
    return output;
  }, { inputs, palettes });

  for (const result of results) {
    writeFileSync(resolve(outputDirectory, result.file), Buffer.from(result.data, 'base64'));
  }

  const contact = await page.evaluate(async (results) => {
    const columns = 4;
    const cardWidth = 300;
    const cardHeight = 220;
    const canvas = document.createElement('canvas');
    canvas.width = columns * cardWidth;
    canvas.height = Math.ceil(results.length / columns) * cardHeight;
    const context = canvas.getContext('2d');
    context.fillStyle = '#111511';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = '13px sans-serif';
    context.textAlign = 'center';
    context.imageSmoothingEnabled = false;
    for (let index = 0; index < results.length; index += 1) {
      const item = results[index];
      const image = new Image();
      image.src = `data:image/png;base64,${item.data}`;
      await image.decode();
      const cardX = (index % columns) * cardWidth;
      const cardY = Math.floor(index / columns) * cardHeight;
      context.fillStyle = '#e0dccb';
      context.fillRect(cardX + 8, cardY + 28, 88, 176);
      context.fillStyle = '#263229';
      context.fillRect(cardX + 106, cardY + 28, 88, 176);
      context.fillStyle = '#eee';
      context.fillText(item.file.replace('mountain-granite-', ''), cardX + cardWidth / 2, cardY + 18);
      const scale = Math.min(1, 82 / item.w, 160 / item.h);
      const width = Math.round(item.w * scale);
      const height = Math.round(item.h * scale);
      for (const panelX of [cardX + 8, cardX + 106]) {
        context.drawImage(image, panelX + (88 - width) / 2, cardY + 196 - height, width, height);
      }
      const mask = document.createElement('canvas');
      mask.width = item.w;
      mask.height = item.h;
      const maskContext = mask.getContext('2d');
      maskContext.drawImage(image, 0, 0);
      maskContext.globalCompositeOperation = 'source-in';
      maskContext.fillStyle = '#000';
      maskContext.fillRect(0, 0, item.w, item.h);
      context.fillStyle = '#e0dccb';
      context.fillRect(cardX + 204, cardY + 28, 88, 176);
      context.drawImage(mask, cardX + 204 + (88 - width) / 2, cardY + 196 - height, width, height);
    }
    return canvas.toDataURL('image/png').split(',')[1];
  }, results);
  writeFileSync(reviewPath, Buffer.from(contact, 'base64'));
  console.log(`ok ${results.length} native mountain pieces`);
  console.log(reviewPath);
} finally {
  await browser.close();
}
