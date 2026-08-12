# 18komputer - Task List

## Phase 1: Setup & Data Preparation
- [x] Initialize Vite + React project mirroring the `portfolio` setup.
- [x] Install core dependencies (Chakra UI, Framer Motion, Wouter) and testing framework (Vitest, React Testing Library).
- [x] **TDD:** Write tests for the `.txt` to JSON parsing logic.
- [x] Build the Node.js parsing script to satisfy tests and convert `../games/*.txt` into JSON files (per `game_data_schema.md`).
- [x] Generate the `index.json` manifest of all available games.

## Phase 1: Core UI Implementation
- [x] **Main Menu:** TDD the landing hub (New Game, Resume Game, User Management).
- [x] **State API Mock:** TDD the `localStorage` manager that mimics asynchronous REST API calls.
- [x] **Raise Funds (Setup):** TDD the form to activate companies and set initial market/par values.
- [x] **Revenue Calculator:** TDD the touch-friendly train revenue calculator with dynamic stops, multipliers, and bonuses.
- [x] **Company Values & Results:** TDD the final dashboard (Company ORs Table, Player Assets Table, Net Worth).

## Phase 1: Receipt Printing
- [x] **Phomemo D30:** Print an operating round summary to die-cut labels over Web Bluetooth.
- [x] **Printer registry:** Hold each printer's Bluetooth name, ids and settings in one place so the UI holds none.
- [x] **GOOJPRT PT-210:** TDD an ESC/POS text driver for the 58mm receipt printer (32 columns, built-in font).
- [x] **Pick the printer automatically** from the Bluetooth name, and reconnect to the one last used.
- [x] **Probe tool** that lists the services a device offers, for when a printer will not connect.
      Hidden by default now that both printers work; pass `showProbe` to `ReceiptPrinter` to bring it back.
- [x] **Confirm the PT-210 over Bluetooth.** It does speak Bluetooth Low Energy, so no USB cable is needed.
      If a future printer turns out to be classic Bluetooth only, add a `navigator.serial` transport;
      the payload bytes are the same either way.

## Phase 1: Rules still to flesh out
- [x] **Half pay is not legal in every title.** Each game's JSON now carries `allowsHalfPay`, taken
      from the `payout:` line in the source `.txt`, and the Full Pay / Half Pay toggle only appears
      on the 32 titles that have a half pay rule. Withholding is a separate operation, allowed almost
      everywhere, and needs no button because it pays nothing per share. The three 1840 variants are marked `Custom` in the
      source and were given the option deliberately; check that against the rules if it looks wrong.
- [ ] **Corporate structures are only mapped correctly for the 1817 family.** The ids in each game's
      `corporateStructures` are read through one table in `src/utils/corporateStructures.js`, and
      those ids mean different things in different titles. Reading the real structures needs
      `scripts/parse-games.js` to parse the game-level `corporate structures:` block (its
      `common stock` fraction is the share count) and a way to regenerate the JSON without losing
      the hand-added `sharePrices`, `maxPlayerHolding`, `hasPullmans` and `stockMarket`.
- [x] **Stock markets are a grid, not a list.** Each title's JSON now carries `stockMarket`, imported
      from the reference implementation by `scripts/import-markets.js`, and the price picker moves a
      company around that grid by the real rules. 36 titles are two dimensional, 15 are flat.
- [ ] **19 titles still have no grid.** Four kinds of gap, none of them affecting how those titles
      behave today, since they fall back to the flat `sharePrices` list:
      - **Zigzag markets** (1860, 1862, 18Cuba, 18España and the three 18CZ cuts). One row drawn as
        two staggered rows: up and down move one cell, left and right move two, and running off
        either end either clamps to the last cell or cancels the move depending on the title.
      - **The hex market** (1854), an offset grid where moves run diagonally.
      - **Markets chosen at run time** (1861, 1867), which pick between two grids by player count,
        and 1832, which builds its grid in code from two halves.
      - **Titles the reference repo does not have** (18DO, 18IN, 18Korea, 18Milwaukee, 1899 DAIHAN,
        Railways of the Lost Atlas, Harzbahn 1873), which need their grids entering by hand.
- [x] **Nothing recorded what makes a price move.** Each title's JSON now carries `priceMovement`,
      imported by `scripts/import-price-movement.js`: what a sold out company does, what paying and
      withholding a dividend do, what selling shares does, and what shares left in the bank pool do.
      64 of the 70 titles have it. The other six (18DO, 18IN, 18Korea, 18 Milwaukee, 1899 DAIHAN,
      Railways of the Lost Atlas) are not in the reference repository at all. Nothing reads this
      data yet.
- [ ] **53 of those 64 titles carry at least one `custom` note**, meaning the reference decides
      that rule in code rather than with a setting, so what we recorded is the headline behaviour
      and not the whole story. By trigger: 36 `dividendPaid`, 34 `soldOut`, 19 `sharesSold`,
      9 `dividendWithheld`, 2 `presidentBankrupt`. Each note names the reference file to read. The
      ones most worth a hand pass are the titles whose payout steps carry extra conditions (1846
      needs $165 before the third square, 1840 keys its steps to bands of absolute revenue) and the
      11 titles that replace the share-selling rule wholesale.
- [ ] **The rarer price triggers are not recorded at all.** Beyond the seven in `priceMovement`, the
      reference moves prices for taking and repaying loans, buying trains, going trainless,
      nationalisation, mergers, and a handful of private company powers. There are around a hundred
      of these spread across per-title code with no shared pattern, so they were left out rather
      than half captured.
- [ ] **A price that arrives without a square has to be guessed.** Games saved before the grid
      existed, links shared from an older copy, and the CSV import all carry only the money value.
      The picker finds the first square holding that value, which is right unless the title has the
      same value in two places; tapping the correct square fixes it for good.

## Phase 2: Backend Integration (Future)
- [ ] Setup Elixir Phoenix backend.
- [ ] Migrate `localStorage` mock API calls to actual REST endpoints.
