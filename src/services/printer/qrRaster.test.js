import { describe, it, expect } from 'vitest';
import { buildQrRaster, PRINT_WIDTH_DOTS, MIN_DOTS_PER_MODULE } from './qrRaster.js';

const SHORT = 'https://kimko.github.io/18komputer/';
const LONG = 'https://kimko.github.io/18komputer/resume#import=' + 'A'.repeat(700);
const header = (raster) => Array.from(raster.slice(0, 8));
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

  it('still prints a readable code for a full-length game link', () => {
    const raster = buildQrRaster(LONG);
    expect(raster).not.toBeNull();
    expect(widthBytes(raster) * 8).toBeLessThanOrEqual(PRINT_WIDTH_DOTS);
    expect(Array.from(raster.slice(8)).some((b) => b !== 0)).toBe(true);
  });

  it('keeps modules at or above the size that scans off thermal paper', () => {
    const raster = buildQrRaster(LONG);
    const modulesAcross = Math.round((widthBytes(raster) * 8) / MIN_DOTS_PER_MODULE);
    expect(widthBytes(raster) * 8 / modulesAcross).toBeGreaterThanOrEqual(MIN_DOTS_PER_MODULE);
  });

  it('prints nothing rather than an unscannable block when the link is too long', () => {
    expect(buildQrRaster('https://x/' + 'A'.repeat(2500))).toBeNull();
  });

  it('prints nothing for no link at all', () => {
    expect(buildQrRaster('')).toBeNull();
    expect(buildQrRaster(undefined)).toBeNull();
  });
});
