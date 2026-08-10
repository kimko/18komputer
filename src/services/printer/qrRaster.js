import qrcode from 'qrcode-generator';

export const PRINT_WIDTH_DOTS = 384;
export const QUIET_ZONE_MODULES = 4;
// Measured on the PT-210: 0.75mm squares scan, 0.63mm and below do not.
export const MIN_DOTS_PER_MODULE = 6;

const GS_RASTER = [0x1d, 0x76, 0x30, 0x00];

export function buildQrRaster(text, { dotsPerModule: forcedDots } = {}) {
  if (!text) return null;

  const qr = qrcode(0, 'L');
  qr.addData(String(text));
  try {
    qr.make();
  } catch {
    return null;
  }

  const modules = qr.getModuleCount() + QUIET_ZONE_MODULES * 2;
  const dotsPerModule = forcedDots || Math.floor(PRINT_WIDTH_DOTS / modules);
  if (dotsPerModule < MIN_DOTS_PER_MODULE) return null;
  if (modules * dotsPerModule > PRINT_WIDTH_DOTS) return null;

  const sideDots = modules * dotsPerModule;
  const rowBytes = Math.ceil(sideDots / 8);
  const canvasDots = rowBytes * 8;
  const data = new Uint8Array(rowBytes * canvasDots);

  for (let y = 0; y < sideDots; y++) {
    const row = Math.floor(y / dotsPerModule) - QUIET_ZONE_MODULES;
    if (row < 0 || row >= qr.getModuleCount()) continue;
    for (let x = 0; x < sideDots; x++) {
      const col = Math.floor(x / dotsPerModule) - QUIET_ZONE_MODULES;
      if (col < 0 || col >= qr.getModuleCount()) continue;
      if (qr.isDark(row, col)) {
        data[y * rowBytes + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }

  return Uint8Array.from([
    ...GS_RASTER,
    rowBytes & 0xff, (rowBytes >> 8) & 0xff,
    canvasDots & 0xff, (canvasDots >> 8) & 0xff,
    ...data
  ]);
}
