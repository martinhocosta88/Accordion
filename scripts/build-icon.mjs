import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const svgPath = path.join(root, 'assets', 'icon.svg');
const pngPath = path.join(root, 'assets', 'icon.png');
const icoPath = path.join(root, 'assets', 'icon.ico');

const sizes = [16, 24, 32, 48, 64, 128, 256];

const svg = await readFile(svgPath);

const pngBuffers = await Promise.all(
  sizes.map((size) =>
    sharp(svg, { density: Math.ceil((size / 256) * 384) })
      .resize(size, size)
      .png()
      .toBuffer(),
  ),
);

const icoBuffer = await pngToIco(pngBuffers);
await writeFile(icoPath, icoBuffer);

const mainPng = pngBuffers[sizes.indexOf(256)];
await writeFile(pngPath, mainPng);

console.log(`Wrote ${icoPath} (${icoBuffer.length} bytes) and ${pngPath} (${mainPng.length} bytes)`);
