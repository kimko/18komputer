# Results Receipt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Print an end-of-game keepsake from the results page - final standings with a per-player breakdown, and a QR code that reopens the finished game.

**Architecture:** Four new pure modules (link builder, text layout, QR rasteriser, results payload builder) plus one new component. The existing operating-round receipt is untouched; the results receipt is a second, separate payload builder on the same printer plumbing.

**Tech Stack:** React 19, Vite, Chakra UI v3, Vitest, `qrcode-generator` (new), ESC/POS over Web Bluetooth.

## Global Constraints

- Receipt is **32 columns** (`COLS` in `src/services/printer/Pt210Driver.js`). No line may exceed it.
- Print head is **384 dots** wide.
- QR uses **error correction level L** and **byte mode** (the payload contains lowercase, which alphanumeric mode cannot encode).
- QR modules must be **at least 3 dots** (0.375mm). Below that, print no QR at all.
- **PT-210 only.** The D30 gets no results builder.
- Tests are colocated as `<Name>.test.js(x)`. Components wrap in `<ChakraProvider value={defaultSystem}>`.
- Comments: only where the reason is not inferable, one line, never restating what the code does.
- Never use the em dash character in source or output.
- The pre-commit hook runs Playwright and bumps the version. Do not run `npm run test:e2e` by hand.

---

### Task 1: Move the magic link out of the Dashboard

The Share button builds the link inline. The QR must use the same builder or the two will drift.

**Files:**
- Create: `src/services/printer/shareLink.js`
- Create: `src/services/printer/shareLink.test.js`
- Modify: `src/components/Dashboard.jsx` (the `handleShare` callback)

**Interfaces:**
- Consumes: nothing
- Produces:
  - `buildShareToken(gameInstance, dashboardState, { includeCalculator = true }) -> string`
  - `buildShareLink(origin, pathname, token) -> string`

- [ ] **Step 1: Write the failing test**

```javascript
// src/services/printer/shareLink.test.js
import { describe, it, expect } from 'vitest';
import LZString from 'lz-string';
import { buildShareToken, buildShareLink } from './shareLink.js';

const gameInstance = {
  id: 'inst_1',
  gameId: '1817',
  gameName: '1817 4p Aug-07',
  players: ['Liam', 'Kim'],
  staticConfig: { name: 'should not travel' },
  state: {
    activeCompanies: [{ shortName: 'UR', name: 'Union Railroad', totalShares: 5, parValue: 50 }],
    calculatorState: { UR: { trains: [{ id: 1, stops: [100, 100] }], isHalfPay: true } },
    dashboardState: { ors: {}, shareValues: {}, playerAssets: {} }
  }
};
const dashboardState = {
  ors: { UR: { or1: 410 } },
  shareValues: { UR: 440 },
  playerAssets: { Liam: { cash: 2765, shares: { UR: 60 } } }
};

const decode = (token) => JSON.parse(LZString.decompressFromEncodedURIComponent(token));

describe('buildShareToken', () => {
  it('carries the game and the freshest dashboard state', () => {
    const back = decode(buildShareToken(gameInstance, dashboardState));
    expect(back.gameName).toBe('1817 4p Aug-07');
    expect(back.state.dashboardState).toEqual(dashboardState);
  });

  it('leaves the static game config behind, since the app already has it', () => {
    expect(decode(buildShareToken(gameInstance, dashboardState)).staticConfig).toBeUndefined();
  });

  it('stamps when it was exported', () => {
    expect(decode(buildShareToken(gameInstance, dashboardState)).exportedAt).toBeTypeOf('string');
  });

  it('keeps the calculator state by default', () => {
    expect(decode(buildShareToken(gameInstance, dashboardState)).state.calculatorState).toBeDefined();
  });

  it('drops the calculator state when asked, and nothing else', () => {
    const back = decode(buildShareToken(gameInstance, dashboardState, { includeCalculator: false }));
    expect(back.state.calculatorState).toBeUndefined();
    expect(back.state.activeCompanies).toEqual(gameInstance.state.activeCompanies);
    expect(back.state.dashboardState).toEqual(dashboardState);
  });

  it('is much shorter without the calculator state', () => {
    const full = buildShareToken(gameInstance, dashboardState);
    const slim = buildShareToken(gameInstance, dashboardState, { includeCalculator: false });
    expect(slim.length).toBeLessThan(full.length);
  });
});

describe('buildShareLink', () => {
  it('keeps the repo path segment on GitHub Pages', () => {
    expect(buildShareLink('https://kimko.github.io', '/18komputer/game/inst_1/dashboard', 'TOKEN'))
      .toBe('https://kimko.github.io/18komputer/resume#import=TOKEN');
  });

  it('uses the site root when the app is served from it', () => {
    expect(buildShareLink('http://localhost:5173', '/game/inst_1/dashboard', 'TOKEN'))
      .toBe('http://localhost:5173/resume#import=TOKEN');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/printer/shareLink.test.js`
Expected: FAIL - cannot resolve `./shareLink.js`

- [ ] **Step 3: Write the implementation**

```javascript
// src/services/printer/shareLink.js
import LZString from 'lz-string';

// The static game config is left out because the app loads it from its own data files.
export function buildShareToken(gameInstance, dashboardState, { includeCalculator = true } = {}) {
  const { staticConfig: _ignored, ...game } = gameInstance;
  const state = { ...game.state, dashboardState };
  if (!includeCalculator) delete state.calculatorState;

  return LZString.compressToEncodedURIComponent(
    JSON.stringify({ ...game, state, exportedAt: new Date().toISOString() })
  );
}

export function buildShareLink(origin, pathname, token) {
  const segments = pathname.split('/').filter(Boolean);
  const root = segments.length > 0 && segments[0] !== 'game' ? `/${segments[0]}` : '';
  return `${origin}${root}/resume#import=${token}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/printer/shareLink.test.js`
Expected: PASS (8 tests)

- [ ] **Step 5: Use it from the Dashboard**

In `src/components/Dashboard.jsx`, add the import and replace the body of `handleShare` between
`if (!gameInstance) return;` and the `navigator.clipboard` call. Delete the local
`gameDataToShare`, `shareInstance`, `compressedData`, `pathSegments`, `rootSegment` and
`resumeLink` variables, and the `LZString` import if nothing else uses it. Keep the existing
`console.log('MAGIC_LINK_DASHBOARD_STATE', ...)` line, which the e2e test reads.

```javascript
import { buildShareToken, buildShareLink } from '../services/printer/shareLink.js';

// inside handleShare, replacing the inline link building:
console.log('MAGIC_LINK_DASHBOARD_STATE', JSON.stringify(dashboardState));
const token = buildShareToken(gameInstance, dashboardState);
const resumeLink = buildShareLink(window.location.origin, window.location.pathname, token);
```

- [ ] **Step 6: Run the suite to prove the Share button still works**

Run: `npx vitest run src/components/Dashboard.test.jsx src/services/printer/shareLink.test.js`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/services/printer/shareLink.js src/services/printer/shareLink.test.js src/components/Dashboard.jsx
git commit -m "refactor: one place builds the magic link"
```

---

### Task 2: The slip text

**Files:**
- Create: `src/services/printer/resultsLayout.js`
- Create: `src/services/printer/resultsLayout.test.js`

**Interfaces:**
- Consumes: `centerText`, `spreadLine`, `sanitizeAscii`, `COLS` from `./Pt210Driver.js`; `getPlayerNetWorth`, `getPlayerShareValue`, `getPlayerOperatingIncome`, `getPlayerTotalShares`, `formatCurrency` from `../../utils/dashboardMath.js`
- Produces: `buildResultsReceipt(resultsData) -> { header: string[], body: Array<{ text: string, bold: boolean }> }`
  where `resultsData` is `{ gameName, players, activeCompanies, dashboardState, maxOr, printedAt }`

- [ ] **Step 1: Write the failing test**

```javascript
// src/services/printer/resultsLayout.test.js
import { describe, it, expect } from 'vitest';
import { buildResultsReceipt } from './resultsLayout.js';

const activeCompanies = [
  { shortName: 'UR', totalShares: 5, parValue: 50 },
  { shortName: 'R', totalShares: 10, parValue: 50 }
];

const resultsData = {
  gameName: '1817 4p Aug-07',
  players: ['Kim', 'Liam'],
  activeCompanies,
  maxOr: 3,
  printedAt: new Date('2026-08-10T09:00:00Z'),
  dashboardState: {
    shareValues: { UR: 440, R: 440 },
    ors: { UR: { or1: 410, or2: 410 }, R: { or1: 680, or2: 680 } },
    playerAssets: {
      // Liam: 3 UR shares ($1,320) + 6 R shares ($2,640), income 60% of 820 + 60% of 1360
      Liam: { cash: 2765, shares: { UR: 60, R: 60 } },
      // Kim: 2 R shares ($880), income 20% of 1360
      Kim: { cash: 1923, shares: { R: 20 } }
    }
  }
};

const lines = (data = resultsData) => {
  const { header, body } = buildResultsReceipt(data);
  return [...header, ...body.map((b) => b.text)];
};

describe('buildResultsReceipt', () => {
  it('never writes past the edge of the paper', () => {
    lines().forEach((line) => expect(line.length).toBeLessThanOrEqual(32));
  });

  it('titles the slip with the game and what it is', () => {
    const { header } = buildResultsReceipt(resultsData);
    expect(header[0].trim()).toBe('1817 4P AUG-07');
    expect(header[1].trim()).toBe('FINAL RESULTS');
  });

  it('lists players richest first, numbered', () => {
    const positions = lines().filter((l) => /^\d /.test(l));
    expect(positions[0]).toContain('1 LIAM');
    expect(positions[1]).toContain('2 KIM');
  });

  it('prints the winner in bold and nobody else', () => {
    const { body } = buildResultsReceipt(resultsData);
    const bold = body.filter((b) => b.bold).map((b) => b.text);
    expect(bold).toHaveLength(1);
    expect(bold[0]).toContain('LIAM');
  });

  it('breaks each player into shares, cash, stock and income', () => {
    const all = lines().join('\n');
    expect(all).toContain('SHARES');
    expect(all).toContain('CASH');
    expect(all).toContain('STOCK');
    expect(all).toContain('INCOME');
  });

  it('counts shares by corporate structure, not by percentage', () => {
    // Liam holds 60% of a five-share company (3) and 60% of a ten-share one (6)
    const liamShares = lines().find((l) => l.includes('SHARES'));
    expect(liamShares).toContain('9');
  });

  it('puts money against the right edge', () => {
    // Liam: 3 UR shares + 6 R shares at $440 = $3,960 stock, $1,308 income, $2,765 cash
    const winner = lines().find((l) => l.startsWith('1 LIAM'));
    expect(winner.endsWith('$8,033')).toBe(true);
  });

  it('truncates a name too long for the column instead of wrapping it', () => {
    const long = {
      ...resultsData,
      players: ['Bartholomew Fotheringay-Smythe'],
      dashboardState: {
        ...resultsData.dashboardState,
        playerAssets: { 'Bartholomew Fotheringay-Smythe': { cash: 100, shares: {} } }
      }
    };
    const position = lines(long).find((l) => l.startsWith('1 '));
    expect(position.length).toBe(32);
    expect(lines(long).filter((l) => l.includes('FOTHERINGAY'))).toHaveLength(1);
  });

  it('shows a fractional share count rather than rounding to a number that is not true', () => {
    const odd = {
      ...resultsData,
      players: ['Kim'],
      activeCompanies: [{ shortName: 'B', totalShares: 5, parValue: 50 }],
      dashboardState: {
        shareValues: { B: 100 }, ors: {},
        playerAssets: { Kim: { cash: 0, shares: { B: 30 } } }
      }
    };
    expect(lines(odd).join('\n')).toContain('1.5');
  });

  it('says so plainly when nobody has anything yet', () => {
    const empty = {
      ...resultsData, players: [], activeCompanies: [],
      dashboardState: { shareValues: {}, ors: {}, playerAssets: {} }
    };
    expect(lines(empty).join('\n')).toContain('NO RESULTS YET');
  });

  it('closes with an invitation to scan and the date it was printed', () => {
    const all = lines().join('\n');
    expect(all).toContain('SCAN TO OPEN RESULTS');
    expect(all).toContain('10 AUG 2026');
  });

  it('strips accents, since the printer only speaks plain ASCII', () => {
    const accented = {
      ...resultsData, players: ['Zoë'],
      dashboardState: { ...resultsData.dashboardState, playerAssets: { 'Zoë': { cash: 5, shares: {} } } }
    };
    expect(lines(accented).join('\n')).toContain('ZOE');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/printer/resultsLayout.test.js`
Expected: FAIL - cannot resolve `./resultsLayout.js`

- [ ] **Step 3: Write the implementation**

```javascript
// src/services/printer/resultsLayout.js
import { COLS, centerText, spreadLine, sanitizeAscii } from './Pt210Driver.js';
import {
  getPlayerNetWorth,
  getPlayerShareValue,
  getPlayerOperatingIncome,
  getPlayerTotalShares,
  formatCurrency
} from '../../utils/dashboardMath.js';

const INDENT = '    ';
const RULE = '-'.repeat(COLS);
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const upper = (text) => sanitizeAscii(text).toUpperCase();
const formatDate = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const formatShares = (n) => String(Number(Number(n).toFixed(1)));

// The money is fixed width, so the name gives up characters rather than wrapping onto its own line.
const positionLine = (rank, name, money) => {
  const room = COLS - money.length - 1 - String(rank).length - 1;
  return spreadLine(`${rank} ${upper(name).slice(0, room)}`, money)[0];
};

export function buildResultsReceipt({ gameName, players, activeCompanies, dashboardState, maxOr, printedAt }) {
  const header = [centerText(upper(gameName || 'GAME')), centerText('FINAL RESULTS')];
  const body = [];
  const push = (text, bold = false) => body.push({ text, bold });

  push(RULE);

  const ranked = [...(players || [])]
    .map((p) => ({ p, net: getPlayerNetWorth(dashboardState, activeCompanies, maxOr, p) }))
    .sort((a, b) => b.net - a.net);

  if (ranked.length === 0) {
    push(centerText('NO RESULTS YET'));
  }

  ranked.forEach(({ p, net }, i) => {
    push(positionLine(i + 1, p, formatCurrency(net)), i === 0);
    const row = (label, value) => push(spreadLine(INDENT + label, value)[0]);
    row('SHARES', formatShares(getPlayerTotalShares(dashboardState, activeCompanies, p)));
    row('CASH', formatCurrency(Number(dashboardState.playerAssets[p]?.cash || 0)));
    row('STOCK', formatCurrency(getPlayerShareValue(dashboardState, activeCompanies, p)));
    row('INCOME', formatCurrency(getPlayerOperatingIncome(dashboardState, activeCompanies, maxOr, p)));
  });

  push(RULE);
  push('');
  push(centerText('SCAN TO OPEN RESULTS'));
  push(centerText(formatDate(printedAt || new Date())));

  return { header, body };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/printer/resultsLayout.test.js`
Expected: PASS (12 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/printer/resultsLayout.js src/services/printer/resultsLayout.test.js
git commit -m "feat: lay out the results slip"
```

---

### Task 3: Turn a link into printer dots

**Files:**
- Create: `src/services/printer/qrRaster.js`
- Create: `src/services/printer/qrRaster.test.js`
- Modify: `package.json` (add `qrcode-generator`)

**Interfaces:**
- Consumes: `qrcode-generator`
- Produces:
  - `PRINT_WIDTH_DOTS = 384`, `MIN_DOTS_PER_MODULE = 3`, `QUIET_ZONE_MODULES = 4`
  - `buildQrRaster(text) -> Uint8Array | null` - null when it will not fit legibly

- [ ] **Step 1: Add the dependency**

```bash
npm install qrcode-generator
```

- [ ] **Step 2: Write the failing test**

```javascript
// src/services/printer/qrRaster.test.js
import { describe, it, expect } from 'vitest';
import { buildQrRaster, PRINT_WIDTH_DOTS, MIN_DOTS_PER_MODULE } from './qrRaster.js';

const SHORT = 'https://kimko.github.io/18komputer/';
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

  it('grows the code when the link is longer', () => {
    const long = 'https://kimko.github.io/18komputer/resume#import=' + 'A'.repeat(700);
    expect(heightDots(buildQrRaster(long))).toBeGreaterThan(heightDots(buildQrRaster(SHORT)));
  });

  it('keeps modules at or above the size that scans off thermal paper', () => {
    const long = 'https://kimko.github.io/18komputer/resume#import=' + 'A'.repeat(700);
    const raster = buildQrRaster(long);
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/services/printer/qrRaster.test.js`
Expected: FAIL - cannot resolve `./qrRaster.js`

- [ ] **Step 4: Write the implementation**

```javascript
// src/services/printer/qrRaster.js
import qrcode from 'qrcode-generator';

export const PRINT_WIDTH_DOTS = 384;
export const QUIET_ZONE_MODULES = 4;
// Below this a module is under 0.375mm, which thermal ink bleeds into unreadable.
export const MIN_DOTS_PER_MODULE = 3;

const GS_RASTER = [0x1d, 0x76, 0x30, 0x00];

export function buildQrRaster(text) {
  if (!text) return null;

  const qr = qrcode(0, 'L');
  qr.addData(String(text));
  try {
    qr.make();
  } catch {
    return null;
  }

  const modules = qr.getModuleCount() + QUIET_ZONE_MODULES * 2;
  const dotsPerModule = Math.floor(PRINT_WIDTH_DOTS / modules);
  if (dotsPerModule < MIN_DOTS_PER_MODULE) return null;

  const sideDots = modules * dotsPerModule;
  const rowBytes = Math.ceil(sideDots / 8);
  const data = new Uint8Array(rowBytes * sideDots);

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
    sideDots & 0xff, (sideDots >> 8) & 0xff,
    ...data
  ]);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/services/printer/qrRaster.test.js`
Expected: PASS (10 tests)

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/services/printer/qrRaster.js src/services/printer/qrRaster.test.js
git commit -m "feat: render a QR code as printer dots"
```

---

### Task 4: Build the results payload

**Files:**
- Modify: `src/services/printer/Pt210Driver.js` (append a new exported function; change nothing existing)
- Modify: `src/services/printer/Pt210Driver.test.js` (append a new describe block)
- Modify: `src/services/printer/printerRegistry.js`
- Modify: `src/services/printer/printerRegistry.test.js`

**Interfaces:**
- Consumes: `buildResultsReceipt` (Task 2), `buildQrRaster` (Task 3)
- Produces:
  - `generateResultsPayload(resultsData) -> Promise<Uint8Array[]>` where `resultsData` is the Task 2 shape plus `shareUrl: string`
  - `PT210.buildResultsPayloads` in the registry; the D30 has no such key

- [ ] **Step 1: Write the failing tests**

Add `generateResultsPayload` to the existing import block at the top of
`src/services/printer/Pt210Driver.test.js`, then append the new describe at the very end of the
file, so the `decodeLines` and `contains` helpers defined around line 333 are already in scope.

```javascript
// append to src/services/printer/Pt210Driver.test.js
describe('generateResultsPayload', () => {
  const resultsData = {
    gameName: '1817 4p Aug-07',
    players: ['Liam'],
    activeCompanies: [{ shortName: 'UR', totalShares: 5, parValue: 50 }],
    maxOr: 3,
    printedAt: new Date('2026-08-10T09:00:00Z'),
    dashboardState: {
      shareValues: { UR: 440 }, ors: { UR: { or1: 410 } },
      playerAssets: { Liam: { cash: 2765, shares: { UR: 60 } } }
    },
    shareUrl: 'https://kimko.github.io/18komputer/resume#import=ABC'
  };

  it('produces one payload, because a receipt is one continuous strip', async () => {
    expect(await generateResultsPayload(resultsData)).toHaveLength(1);
  });

  it('prints the standings', async () => {
    const [payload] = await generateResultsPayload(resultsData);
    const text = decodeLines(payload).join('\n');
    expect(text).toContain('FINAL RESULTS');
    expect(text).toContain('1 LIAM');
    expect(text).toContain('SCAN TO OPEN RESULTS');
  });

  it('includes the raster command for the code', async () => {
    const [payload] = await generateResultsPayload(resultsData);
    expect(contains(payload, [0x1d, 0x76, 0x30, 0x00])).toBe(true);
  });

  it('never writes a text line wider than the paper', async () => {
    const [payload] = await generateResultsPayload(resultsData);
    decodeLines(payload).forEach((line) => expect(line.length).toBeLessThanOrEqual(32));
  });

  it('feeds the paper past the tear bar', async () => {
    const [payload] = await generateResultsPayload(resultsData);
    expect(contains(payload, [0x1b, 0x64])).toBe(true);
  });

  it('prints the slip and says so when the link is too long to encode', async () => {
    const [payload] = await generateResultsPayload({
      ...resultsData,
      shareUrl: 'https://x/' + 'A'.repeat(2500)
    });
    const text = decodeLines(payload).join('\n');
    expect(text).toContain('1 LIAM');
    expect(text).toContain('LINK TOO LONG');
    expect(contains(payload, [0x1d, 0x76, 0x30, 0x00])).toBe(false);
  });
});
```

```javascript
// append to src/services/printer/printerRegistry.test.js, inside the PRINTERS describe
it('lets the receipt printer print results, and not the label printer', () => {
  expect(typeof findPrinterById('pt210').buildResultsPayloads).toBe('function');
  expect(findPrinterById('d30').buildResultsPayloads).toBeUndefined();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/services/printer/Pt210Driver.test.js src/services/printer/printerRegistry.test.js`
Expected: FAIL - `generateResultsPayload is not defined`, and `buildResultsPayloads` is undefined

- [ ] **Step 3: Write the implementation**

Add to the imports at the top of `src/services/printer/Pt210Driver.js`:

```javascript
import { buildResultsReceipt } from './resultsLayout.js';
import { buildQrRaster } from './qrRaster.js';
```

Append to the end of `src/services/printer/Pt210Driver.js`:

```javascript
const ESC_ALIGN_CENTER = [0x1b, 0x61, 0x01];

export const generateResultsPayload = async (resultsData = {}) => {
  const { header, body } = buildResultsReceipt(resultsData);
  const raster = buildQrRaster(resultsData.shareUrl);
  const bytes = [];
  const push = (...sequences) => sequences.forEach((sequence) => bytes.push(...sequence));
  const pushLine = (text) => {
    for (let i = 0; i < text.length; i++) bytes.push(text.charCodeAt(i) & 0x7f);
    push(LF);
  };

  push(ESC_INIT);
  if (PT210_STYLE.useCharTable) push(ESC_CHARSET_PC437);
  push(ESC_ALIGN_LEFT, ESC_BOLD_ON);
  if (PT210_STYLE.useDoubleHeightHeader) push(GS_SIZE_DBL_HEIGHT);
  header.forEach(pushLine);
  if (PT210_STYLE.useDoubleHeightHeader) push(GS_SIZE_NORMAL);
  push(ESC_BOLD_OFF);

  body.forEach(({ text, bold }) => {
    if (bold) push(ESC_BOLD_ON);
    pushLine(text);
    if (bold) push(ESC_BOLD_OFF);
  });

  if (raster) {
    push(ESC_ALIGN_CENTER);
    push(raster);
    push(ESC_ALIGN_LEFT, LF);
  } else {
    pushLine(centerText('LINK TOO LONG TO PRINT'));
  }

  push(ESC_FEED_LINES(FEED_LINES));
  return [new Uint8Array(bytes)];
};
```

In `src/services/printer/printerRegistry.js`, change the import and add one key to `PT210`:

```javascript
import { generatePt210Payload, generateResultsPayload } from './Pt210Driver.js';

// inside the PT210 object, after buildPayloads:
  buildResultsPayloads: generateResultsPayload,
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/services/printer/`
Expected: PASS, including the existing "sends no cut and no bitmap commands" test, which still
describes the operating-round receipt and must not have changed.

- [ ] **Step 5: Commit**

```bash
git add src/services/printer/Pt210Driver.js src/services/printer/Pt210Driver.test.js src/services/printer/printerRegistry.js src/services/printer/printerRegistry.test.js
git commit -m "feat: build the results receipt payload"
```

---

### Task 5: Send it

**Files:**
- Modify: `src/services/printer/PrinterService.js`
- Modify: `src/services/printer/PrinterService.test.js`

**Interfaces:**
- Consumes: `printer.buildResultsPayloads` (Task 4)
- Produces: `printResults(characteristic, printer, resultsData, { sleep }) -> Promise<void>`

- [ ] **Step 1: Write the failing test**

Add `printResults` to the existing `import { printReceipt } from './PrinterService.js'` at the top
of the file. The file already declares a module-level `characteristic` and mocks `streamToDevice`;
reuse both rather than redeclaring them.

```javascript
// append to src/services/printer/PrinterService.test.js
describe('printResults', () => {
  const payload = new Uint8Array([1, 2, 3]);

  it('refuses when no printer is selected', async () => {
    await expect(printResults(characteristic, null, {})).rejects.toThrow('no printer is selected');
  });

  it('explains itself when the printer cannot do results', async () => {
    const labelPrinter = { id: 'd30', displayName: 'Phomemo D30', buildPayloads: vi.fn() };
    await expect(printResults(characteristic, labelPrinter, {}))
      .rejects.toThrow('Phomemo D30 cannot print results');
  });

  it('builds from the results builder, not the receipt one', async () => {
    const buildResultsPayloads = vi.fn().mockResolvedValue([payload]);
    const buildPayloads = vi.fn();
    const printer = { id: 'pt210', buildResultsPayloads, buildPayloads, chunkSize: 128, writeMode: 'auto' };

    await printResults(characteristic, printer, { gameName: 'x' });

    expect(buildResultsPayloads).toHaveBeenCalledWith({ gameName: 'x' });
    expect(buildPayloads).not.toHaveBeenCalled();
  });

  it('sends every payload in order', async () => {
    const second = new Uint8Array([4]);
    const printer = {
      id: 'pt210',
      buildResultsPayloads: vi.fn().mockResolvedValue([payload, second]),
      chunkSize: 128, writeMode: 'auto'
    };

    await printResults(characteristic, printer, {});

    expect(streamToDevice).toHaveBeenNthCalledWith(1, characteristic, payload, expect.any(Object));
    expect(streamToDevice).toHaveBeenNthCalledWith(2, characteristic, second, expect.any(Object));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/printer/PrinterService.test.js`
Expected: FAIL - `printResults is not a function`

- [ ] **Step 3: Write the implementation**

In `src/services/printer/PrinterService.js`, extract the send loop out of `printReceipt` and add
`printResults` beside it:

```javascript
const sendPayloads = async (characteristic, printer, payloads, sleep) => {
  console.log(`[Printer] Sending ${payloads.length} payload(s) to the ${printer.displayName || printer.id}.`);

  for (let i = 0; i < payloads.length; i++) {
    await streamToDevice(characteristic, payloads[i], {
      chunkSize: printer.chunkSize,
      writeMode: printer.writeMode,
    });

    if (i < payloads.length - 1 && printer.interPayloadDelayMs) {
      await sleep(printer.interPayloadDelayMs);
    }
  }
};

export const printResults = async (
  characteristic,
  printer,
  resultsData,
  { sleep = defaultSleep } = {}
) => {
  if (!printer) {
    throw new Error('Cannot print: no printer is selected.');
  }
  if (!printer.buildResultsPayloads) {
    throw new Error(`The ${printer.displayName || printer.id} cannot print results. Connect the receipt printer.`);
  }

  await sendPayloads(characteristic, printer, await printer.buildResultsPayloads(resultsData), sleep);
};
```

Rewrite the body of `printReceipt` after its `if (!printer)` guard to call the same helper:

```javascript
  await sendPayloads(characteristic, printer, await printer.buildPayloads(receiptData), sleep);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/services/printer/PrinterService.test.js`
Expected: PASS, including all nine pre-existing `printReceipt` tests

- [ ] **Step 5: Commit**

```bash
git add src/services/printer/PrinterService.js src/services/printer/PrinterService.test.js
git commit -m "feat: send a results receipt to the printer"
```

---

### Task 6: The button on the results page

**Files:**
- Create: `src/components/ResultsPrinter.jsx`
- Create: `src/components/ResultsPrinter.test.jsx`

**Interfaces:**
- Consumes: `useWebBluetooth`, `printResults` (Task 5), `buildShareToken`/`buildShareLink` (Task 1)
- Produces: `<ResultsPrinter gameInstance dashboardState maxOr />`

- [ ] **Step 1: Write the failing test**

```javascript
// src/components/ResultsPrinter.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import ResultsPrinter from './ResultsPrinter.jsx';
import { useWebBluetooth } from '../hooks/useWebBluetooth.js';
import { printResults } from '../services/printer/PrinterService.js';

vi.mock('../hooks/useWebBluetooth.js', () => ({ useWebBluetooth: vi.fn() }));
vi.mock('../services/printer/PrinterService.js', () => ({ printResults: vi.fn() }));

const gameInstance = {
  id: 'inst_1', gameId: '1817', gameName: '1817 4p Aug-07', players: ['Liam'],
  state: { activeCompanies: [{ shortName: 'UR', totalShares: 5 }], calculatorState: {}, dashboardState: {} }
};
const dashboardState = { ors: {}, shareValues: {}, playerAssets: { Liam: { cash: 10, shares: {} } } };

const bluetooth = (overrides = {}) => ({
  connect: vi.fn(), disconnect: vi.fn(), isConnected: false, isConnecting: false,
  error: null, characteristic: null, deviceName: null, printer: null, ...overrides
});

const renderIt = () => render(
  <ChakraProvider value={defaultSystem}>
    <ResultsPrinter gameInstance={gameInstance} dashboardState={dashboardState} maxOr={3} />
  </ChakraProvider>
);

describe('ResultsPrinter', () => {
  beforeEach(() => { vi.clearAllMocks(); printResults.mockResolvedValue(); });

  it('offers to pair when nothing is connected', () => {
    useWebBluetooth.mockReturnValue(bluetooth());
    renderIt();
    expect(screen.getByRole('button', { name: /pair/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /print results/i })).not.toBeInTheDocument();
  });

  it('offers to print once the receipt printer is connected', () => {
    useWebBluetooth.mockReturnValue(bluetooth({
      isConnected: true, characteristic: {}, deviceName: 'PT-210',
      printer: { id: 'pt210', displayName: 'GOOJPRT PT-210', buildResultsPayloads: vi.fn() }
    }));
    renderIt();
    expect(screen.getByRole('button', { name: /print results/i })).toBeInTheDocument();
  });

  it('says results need the receipt printer when a label printer is connected', () => {
    useWebBluetooth.mockReturnValue(bluetooth({
      isConnected: true, characteristic: {}, deviceName: 'D30',
      printer: { id: 'd30', displayName: 'Phomemo D30' }
    }));
    renderIt();
    expect(screen.getByText(/receipt printer/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /print results/i })).not.toBeInTheDocument();
  });

  it('prints the standings and a link to the game', async () => {
    const printer = { id: 'pt210', displayName: 'GOOJPRT PT-210', buildResultsPayloads: vi.fn() };
    useWebBluetooth.mockReturnValue(bluetooth({ isConnected: true, characteristic: {}, printer }));
    renderIt();

    fireEvent.click(screen.getByRole('button', { name: /print results/i }));

    await waitFor(() => expect(printResults).toHaveBeenCalled());
    const [, sentPrinter, data] = printResults.mock.calls[0];
    expect(sentPrinter).toBe(printer);
    expect(data.gameName).toBe('1817 4p Aug-07');
    expect(data.players).toEqual(['Liam']);
    expect(data.shareUrl).toContain('#import=');
  });

  it('shows a print failure on screen, not only in the console', async () => {
    printResults.mockRejectedValue(new Error('printer jammed'));
    useWebBluetooth.mockReturnValue(bluetooth({
      isConnected: true, characteristic: {},
      printer: { id: 'pt210', buildResultsPayloads: vi.fn() }
    }));
    renderIt();

    fireEvent.click(screen.getByRole('button', { name: /print results/i }));

    expect(await screen.findByText(/printer jammed/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ResultsPrinter.test.jsx`
Expected: FAIL - cannot resolve `./ResultsPrinter.jsx`

- [ ] **Step 3: Write the implementation**

```jsx
// src/components/ResultsPrinter.jsx
import { useState } from 'react';
import { Box, Button, Flex, Text } from '@chakra-ui/react';
import { useWebBluetooth } from '../hooks/useWebBluetooth.js';
import { printResults } from '../services/printer/PrinterService.js';
import { buildShareToken, buildShareLink } from '../services/printer/shareLink.js';

export default function ResultsPrinter({ gameInstance, dashboardState, maxOr }) {
  const { connect, disconnect, isConnected, isConnecting, error, characteristic, deviceName, printer } = useWebBluetooth();
  const [isPrinting, setIsPrinting] = useState(false);
  const [printError, setPrintError] = useState(null);

  const canPrintResults = Boolean(printer?.buildResultsPayloads);

  const handlePrint = async () => {
    setIsPrinting(true);
    setPrintError(null);
    try {
      // The calculator scratch is left out to keep the QR small enough to scan.
      const token = buildShareToken(gameInstance, dashboardState, { includeCalculator: false });
      await printResults(characteristic, printer, {
        gameName: gameInstance.gameName,
        players: gameInstance.players,
        activeCompanies: gameInstance.state?.activeCompanies || [],
        dashboardState,
        maxOr,
        printedAt: new Date(),
        shareUrl: buildShareLink(window.location.origin, window.location.pathname, token)
      });
    } catch (err) {
      console.error('Print failed:', err);
      setPrintError(`Print failed: ${err.message}`);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Flex direction="column" gap="2" mt="4" p="4" bg="gray.800" borderRadius="md" border="1px solid" borderColor="gray.700">
      <Text fontSize="sm" color="gray.400" fontWeight="bold">Results Receipt</Text>

      {!isConnected && (
        <Button size="sm" colorPalette="teal" onClick={connect} loading={isConnecting}>
          Pair Printer
        </Button>
      )}

      {isConnected && !canPrintResults && (
        <Text fontSize="sm" color="orange.300">
          {deviceName || 'This printer'} prints labels. Results need the receipt printer.
        </Text>
      )}

      {isConnected && canPrintResults && (
        <Flex gap="2">
          <Button size="sm" colorPalette="teal" onClick={handlePrint} loading={isPrinting}>
            Print Results
          </Button>
          <Button size="sm" variant="outline" color="white" onClick={disconnect}>Disconnect</Button>
        </Flex>
      )}

      {error && <Text fontSize="sm" color="red.300">{error}</Text>}
      {printError && <Box><Text fontSize="sm" color="red.300">{printError}</Text></Box>}
    </Flex>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ResultsPrinter.test.jsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/ResultsPrinter.jsx src/components/ResultsPrinter.test.jsx
git commit -m "feat: add the results receipt button"
```

---

### Task 7: Put it on the results page

**Files:**
- Modify: `src/components/Dashboard.jsx`
- Modify: `src/components/Dashboard.test.jsx`
- Modify: `USER_JOURNEY.md`

**Interfaces:**
- Consumes: `<ResultsPrinter>` (Task 6)
- Produces: nothing further

- [ ] **Step 1: Write the failing test**

```javascript
// append inside the Dashboard describe in src/components/Dashboard.test.jsx
it('offers to print the results', async () => {
  renderWithChakra(<Dashboard />);
  await screen.findByText('Player Holdings');
  expect(screen.getByText('Results Receipt')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Dashboard.test.jsx`
Expected: FAIL - unable to find the text "Results Receipt"

- [ ] **Step 3: Write the implementation**

In `src/components/Dashboard.jsx`, import the component and mount it at the end of the Data Grids
tab, after `<PlayerHoldingsGrid>` and inside the same `<Tabs.Content value="grids">`:

```jsx
import ResultsPrinter from './ResultsPrinter.jsx';

          <ResultsPrinter
            gameInstance={gameInstance}
            dashboardState={dashboardState}
            maxOr={maxOr}
          />
```

- [ ] **Step 4: Run the whole suite and the linters**

Run: `npx vitest run && npm run lint`
Expected: PASS, no warnings

- [ ] **Step 5: Document it**

In `USER_JOURNEY.md`, under the Company Values & Results section, after the Magic Links bullet:

```markdown
  - **Results Receipt:** When the game is over, the results page prints a keepsake slip on the PT-210: the game name, every player in finishing order with their net worth, and under each one their shares, cash, stock value and operating income. The winner's line prints bold. Below the standings it prints a QR code that reopens the finished game on a phone, so nobody has to type anything in. The code carries the results but not the calculator's scratch working, which is what keeps it small enough to scan off thermal paper. If a game is large enough that the code would come out too dense to read, the slip prints the numbers and says the link was too long instead. The D30 label printer says plainly that results need the receipt printer, rather than producing a run of unreadable labels.
```

- [ ] **Step 6: Commit**

```bash
git add src/components/Dashboard.jsx src/components/Dashboard.test.jsx USER_JOURNEY.md
git commit -m "feat: print the game result on a receipt"
```

---

## Verification

After Task 7, check it on the real printer:

1. `npm run dev`, open a finished game, go to Results.
2. Pair the PT-210, press Print Results.
3. The slip should show the standings with the winner bold, and a QR roughly 4cm square.
4. Scan the QR with a phone camera. It should open the results for that game.
5. Press Share and confirm the clipboard link still imports correctly, since Task 1 moved that code.
6. Pair the D30 instead and confirm the message rather than a print attempt.
