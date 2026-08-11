import { describe, it, expect } from 'vitest';
import { buildQrRaster, PRINT_WIDTH_DOTS, MIN_DOTS_PER_MODULE } from './qrRaster.js';

const SHORT = 'https://kimko.github.io/18komputer/';
const GAME_URL = 'https://kimko.github.io/18komputer/game/game_1786043602870_246/dashboard';
const MAGIC_LINK = 'https://kimko.github.io/18komputer/resume#import=' + 'A'.repeat(700);
const REMOTE_LINK = 'https://kimko.github.io/18komputer/resume#remote=game_1786043602870_246';
const header = (raster) => Array.from(raster.slice(0, 8));

// The corner finder square is exactly 7 modules wide, so its first solid run gives the scale.
const measureDotsPerModule = (raster) => {
  const rowBytes = raster[4] + raster[5] * 256;
  const height = raster[6] + raster[7] * 256;
  const bit = (x, y) => (raster[8 + y * rowBytes + (x >> 3)] >> (7 - (x & 7))) & 1;

  for (let y = 0; y < height; y++) {
    let x = 0;
    while (x < rowBytes * 8 && !bit(x, y)) x++;
    if (x === rowBytes * 8) continue;
    let run = 0;
    while (x + run < rowBytes * 8 && bit(x + run, y)) run++;
    return run / 7;
  }
  return 0;
};
const widthBytes = (raster) => raster[4] + raster[5] * 256;
const heightDots = (raster) => raster[6] + raster[7] * 256;

describe('buildQrRaster', () => {
  it('starts with the ESC/POS raster command', () => {
    expect(header(buildQrRaster(SHORT)).slice(0, 4)).toEqual([0x1d, 0x76, 0x30, 0x00]);
  });

  it('sends exactly as many bytes as the header promises', () => {
    const raster = buildQrRaster(SHORT);
    expect(raster.length).toBe(8 + widthBytes(raster) * heightDots(raster));
  });

  it('prints a square', () => {
    const raster = buildQrRaster(SHORT);
    expect(widthBytes(raster) * 8).toBe(heightDots(raster));
  });

  it('never prints wider than the paper', () => {
    const raster = buildQrRaster(SHORT);
    expect(widthBytes(raster) * 8).toBeLessThanOrEqual(PRINT_WIDTH_DOTS);
  });

  it('leaves a white margin around the code, or no scanner will find it', () => {
    const raster = buildQrRaster(SHORT);
    const bytes = widthBytes(raster);
    const firstRow = Array.from(raster.slice(8, 8 + bytes));
    expect(firstRow.every((b) => b === 0)).toBe(true);
  });

  it('actually inks something', () => {
    const raster = buildQrRaster(SHORT);
    expect(Array.from(raster.slice(8)).some((b) => b !== 0)).toBe(true);
  });

  it('prints a readable code for a game address', () => {
    const raster = buildQrRaster(GAME_URL);
    expect(raster).not.toBeNull();
    expect(widthBytes(raster) * 8).toBeLessThanOrEqual(PRINT_WIDTH_DOTS);
    expect(Array.from(raster.slice(8)).some((b) => b !== 0)).toBe(true);
  });

  it('prints a readable code for a link that fetches the game from the sheet', () => {
    const raster = buildQrRaster(REMOTE_LINK);
    expect(raster).not.toBeNull();
    expect(Array.from(raster.slice(8)).some((b) => b !== 0)).toBe(true);
  });

  it('keeps squares at or above the 0.75mm that scans off thermal paper', () => {
    [SHORT, GAME_URL, REMOTE_LINK].forEach((text) => {
      expect(measureDotsPerModule(buildQrRaster(text))).toBeGreaterThanOrEqual(MIN_DOTS_PER_MODULE);
    });
  });

  it('prints nothing rather than an unscannable block when the link is too long', () => {
    expect(buildQrRaster('https://x/' + 'A'.repeat(2500))).toBeNull();
  });

  it('refuses a whole-game link, which only fits at a size no camera can read', () => {
    expect(buildQrRaster(MAGIC_LINK)).toBeNull();
  });

  it('prints nothing for no link at all', () => {
    expect(buildQrRaster('')).toBeNull();
    expect(buildQrRaster(undefined)).toBeNull();
  });
});
