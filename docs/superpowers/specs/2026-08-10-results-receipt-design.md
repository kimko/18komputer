# Printing the game result on a receipt

**Date:** 2026-08-10
**Status:** Agreed, ready for an implementation plan

## What this is

An end-of-game keepsake. One slip, printed from the results page when a game finishes, carrying the
final standings and a barcode that reopens the finished game on a phone.

The slip is meant to settle an argument at the table without anyone scanning anything. The barcode
is for afterwards.

## The measurement that shaped it

A magic link for a real four-player 1817 game is **2,492 characters**. Compressing that into a QR
needs the largest code that exists, 177×177 modules. On a 384-dot print head that is a 0.25mm
module, and thermal ink bleeds — it would not scan.

Dropping the calculator scratch data and shortening the keys brings the results-only payload to
about **762 characters**, which is a 97×97 code at 3 dots per module, or 0.375mm. Dense, but it
should scan with a decent phone in reasonable light.

| payload | characters | grid | dots per module | module size |
|---|---|---|---|---|
| full magic link | 2,492 | 185 | 2 | 0.250mm — will not scan |
| **results only** | **762** | **105** | **3** | **0.375mm — what we are building** |
| trimmed further | ~570 | 93 | 4 | 0.500mm — comfortable, not needed |

Chosen deliberately: the dense code, keeping every operating round and all holdings, over a
comfortable code that would have to drop the OR history.

## Decisions

- **Receipt printer only.** The D30 prints small die-cut labels; a 24-line slip with a barcode does
  not fit one. With a D30 connected the button explains that results need the PT-210 rather than
  failing or producing a run of unreadable labels.
- **Standings plus a per-player breakdown.** Not the company table, not one slip per player.
- **We encode the QR with a package, not by hand.** Reed-Solomon, masking and version selection are
  the package's job. Ours is turning its grid of dark modules into printer rows. The package is
  **`qrcode-generator`** (MIT, no dependencies of its own): it hands back a module grid and nothing
  else, which is exactly the part we need and none of the canvas or PNG machinery we do not.
- **Error correction level L**, the lowest, because capacity is the binding constraint.

## The slip

32 columns, at the real 1817 numbers:

```
        1817 4P AUG-07
         FINAL RESULTS
--------------------------------
1 LIAM                   $13,093
    SHARES                    19
    CASH                  $2,765
    STOCK                 $7,720
    INCOME                $2,608
2 KIM                    $11,933
    SHARES                    20
    CASH                  $1,923
    STOCK                 $7,690
    INCOME                $2,320
3 BRETT                   $9,130
    SHARES                    18
    CASH                  $1,310
    STOCK                 $5,730
    INCOME                $2,090
4 EDUARDO                 $7,851
    SHARES                    17
    CASH                    $546
    STOCK                 $5,275
    INCOME                $2,030
--------------------------------

        [ QR, 97x97 ]

     SCAN TO OPEN RESULTS
          10 AUG 2026
```

- Players are listed in finishing order by net worth. The winner's line prints bold.
- `SHARES` sits above the money so the three money lines still visibly add up to the headline.
- Share counts come from `getPlayerTotalShares`, which counts by corporate structure — 20% of a
  five-share company is 1 share, not 2. They print whole for any game played in the app, because the
  structure rules stop anyone reaching a percentage their company cannot express. A game imported
  from an older save may carry an odd holding, which prints as `1.5` rather than being rounded to a
  number that is not true.
- Names too long for the column are truncated, not wrapped, so the money always lines up.
- The date at the foot is **the date the slip was printed**. The game's own date is already in its
  name on the top line.
- About 24 lines plus the code: roughly 12cm of paper for four players.

## The pieces

Five units, each with one job.

### `src/services/printer/shareLink.js` — new

The Share button currently builds the magic link inline in `Dashboard.jsx`. The barcode must not
drift from it, so the link builder moves out here:

```
buildShareToken(gameInstance, dashboardState, { includeCalculator })
buildShareLink(origin, pathname, token)
```

`Dashboard.jsx` calls it with `includeCalculator: true` (unchanged behaviour). The receipt calls it
with `false`, which is what gets the payload down to 762 characters.

This is the one piece of existing code the feature changes, and it is changed because leaving two
copies of the link format in two files is how they diverge.

### `src/services/printer/resultsLayout.js` — new

Game state in, an array of 32-column strings out. No printer, no bytes. Reuses `spreadLine`,
`centerText` and `formatCurrency` that already exist, and `getPlayerNetWorth`,
`getPlayerShareValue`, `getPlayerOperatingIncome`, `getPlayerTotalShares` from `dashboardMath.js`.

### `src/services/printer/qrRaster.js` — new

A string in, ESC/POS raster bytes out.

1. Ask the package for the module grid at error correction L.
2. Pick the largest whole number of dots per module that fits: `floor(384 / (modules + 8))`, where 8
   is the four-module quiet zone each side.
3. **Refuse below 3 dots per module** and return nothing. 0.25mm does not scan on thermal paper, and
   printing an unscannable black square is worse than printing none.
4. Scale each module, pack each row into bits (1 = black), pad the row width up to a multiple of 8,
   and wrap it in `GS v 0`.

### `Pt210Driver.generateResultsPayload` — new function in an existing file

Glues the text lines and the raster into one payload, the same way `generatePt210Payload` does for
an operating round. The operating-round builder is **not** touched, so its existing "sends no cut
and no bitmap commands" test stays true and keeps meaning what it says.

`printerRegistry.js` gives the PT-210 a `buildResultsPayloads` entry. The D30 does not get one, and
its absence is what the UI reads to know results cannot be printed there.

`PrinterService.js` gains `printResults(characteristic, printer, data)`, mirroring `printReceipt`.

### `src/components/ResultsPrinter.jsx` — new

The button on the results page, beside Share. Reuses `useWebBluetooth` exactly as the calculator's
`ReceiptPrinter` does.

## Data flow

```
Dashboard
  ├── Share button ──── buildShareToken(includeCalculator: true) ──── clipboard
  └── Print Results ─┬─ buildShareToken(includeCalculator: false) ─── qrRaster ─┐
                     └─ resultsLayout ────────────────────────────────────────┬─┘
                                                                              │
                              Pt210Driver.generateResultsPayload ─────────────┘
                                          │
                              PrinterService.printResults
                                          │
                              BleTransportService.streamToDevice
```

## Error handling

| Situation | What happens |
|---|---|
| No printer paired | The button offers to pair, as the calculator's printer does |
| D30 paired | Says results need the receipt printer; does not offer to print |
| Link too long for a 3-dot module | Prints the text slip plus a line saying the link was too long to encode |
| Print fails mid-way | Shown on screen, not only in the console |
| No players, or nobody has anything | Prints the header and a "no results yet" line rather than an empty slip |

## Testing

**`resultsLayout`** — no line wider than 32 columns · players ordered by net worth · a tie keeps both
players and does not drop one · a name too long is truncated not wrapped · a single player prints ·
a fractional share count prints as `1.5` rather than rounding · money right-aligns to the edge.

**`qrRaster`** — a known payload gives the expected grid size · byte count equals
`ceil(width / 8) × height` · each module is scaled by the chosen dot count · a payload needing
under 3 dots per module returns nothing · the quiet zone is present · row width is padded to a
multiple of 8.

**`Pt210Driver.generateResultsPayload`** — contains the raster command and the text · never a line
wider than the paper · ends with the feed past the tear bar · a payload with no QR still prints the
slip.

**`printerRegistry`** — the PT-210 has a results builder, the D30 does not.

**`shareLink`** — the same game gives the same token from both callers · `includeCalculator: false`
drops the calculator state and nothing else · the token round-trips back to the same game.

**`ResultsPrinter`** — offers to pair when nothing is connected · prints through a connected PT-210 ·
explains itself on a D30 · shows a print failure on screen.

## Out of scope

No D30 layout. No per-player slips. No company table on the slip. No paper cut command. No link
shortener — that needs the Phase 2 backend, and without it the payload size is fixed by what
LZString can do.
