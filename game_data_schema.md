# 18komputer Game Data Schema & Mapping

## Overview
This document defines the target JSON structure for the web calculator and how the custom `.txt` files from `18XXc-also/games` will be mapped to this structure by our build script.

## Target JSON Structure (`GameData` Interface)

```typescript
interface GameData {
  id: string;             // Derived from filename (e.g., "1817")
  name: string;           // From "Name: '...'"
  bggId: number;          // From "bggId: ..."
  revenueStops: number[]; // From "revenue stops: [...]"
  maxOr: number;          // From "max or: ..."
  ownership: number[];    // From "ownership: [...]"
  sharePrices: number[];  // Every price in the market, flattened and sorted
  parValues: number[];    // From "par values: [...]"
  
  companies: Company[];
  trains: Train[];
  revenueBonuses: RevenueBonus[];
  hasPullmans?: boolean;  // Injected for 1822 family games
  allowsHalfPay?: boolean; // true when "payout:" is not PayoutOption.Full; absent means the title has no half pay
  maxPlayerHolding?: number; // most of one company a single player may hold; absent means the usual 60
  stockMarket?: StockMarket; // absent means the title has no grid, so sharePrices is the whole market
  priceMovement?: PriceMovement; // absent means we have no reference for the title
  // Other properties like assets, corporateStructures can be added as needed.
}

interface StockMarket {
  type: '1d' | '2d';
  grid: string[][];       // rows top down, so row 0 holds the highest prices
}

// What moves a company's price, and which way. Descriptive only; no code reads it yet.
type PriceMovement = Partial<Record<Trigger, Rule>>;

type Trigger =
  | 'soldOut'            // every share in players' hands at the end of a stock round
  | 'dividendPaid'
  | 'dividendWithheld'
  | 'sharesSold'         // players selling shares
  | 'sharesInPool'       // shares left sitting in the bank pool at the end of a stock round
  | 'presidentBankrupt'
  | 'corporationCloses';

interface Rule {
  move: 'up' | 'down' | 'left' | 'right' | null;  // null means this trigger moves nothing
  squares: number | Count;
  maxSquares?: number;   // ceiling on a Count, never on a fixed number
  custom?: string;       // what the reference does that we have not captured, and where it lives
}

// Counts that depend on the sale or the payout rather than being a fixed number.
type Count =
  | 'perShare' | 'per10Percent' | 'perSale'
  | 'perShareIfPresident' | 'perSaleIfPresident' | 'per10PercentIfPresidentElseOne'
  | 'perMultipleOfPrice'      // one more square per whole multiple of the share price paid out
  | 'perHalfMultipleOfPrice'  // as above, but every half multiple
  | 'perRevenueBand';         // steps keyed to bands of absolute revenue, not to the price

interface Company {
  name: string;
  shortName: string;
  color: string;          // Extracted HEX string from Dart's `Color(...)`
}

interface Train {
  name: string;
  cost: number;
}

interface RevenueBonus {
  label: string;          // e.g., "Bridge", "Coal"
  adds: number[];         // e.g., [10]
}
```

## Mapping & Parsing Rules

The `.txt` files use a custom indent-based key-value format with embedded Dart structures. The parsing script will apply the following transformations:

### 1. Primitives and Arrays
- **Strings**: Extract values within single quotes (e.g., `Name: '1817'` → `"1817"`).
- **Numbers**: Parse raw numbers (e.g., `bggId: 421` → `421`).
- **Arrays**: Parse comma-separated values inside brackets (e.g., `revenue stops: [10, 20, 30]` → `[10, 20, 30]`). `null` values should be omitted or converted to standard JSON `null`.

### 2. Nested Objects (Companies, Trains, Bonuses)
Nested lists begin with a key (e.g., `companies:`) followed by indented blocks. Each block is separated by a blank line or a new name property.
- **Companies**: 
  - `name`, `short name` map to strings.
  - `color`: The string `Color(alpha: 1.0000, red: 0.1373, green: 0.4510, blue: 0.2000, ...)` will be converted to a hex string `#RRGGBB` by multiplying the red, green, and blue floating-point values by 255.
- **Revenue Bonuses**:
  - `label`: Maps to the label string (e.g., `'Bridge'`).
  - `adds`: Maps to the array of numbers (e.g., `[10]`). These will populate the dynamic bonuses at the bottom of the Revenue Calculator UI.
- **Trains**:
  - `name`: String identifier.
  - `cost`: Numeric cost.

### 3. File Generation
The script will iterate through the `../games/` directory:
1. Read each `[GameID].txt`.
2. Apply the parsing regex/state machine.
3. Output a corresponding `[GameID].json` into the web app's `src/data/games/` directory.
4. (Optional) Generate an `index.json` that exports a lightweight list of all games (id, name, bggId) for the Main Menu selection screen, avoiding the need to load every single game file at startup.

## Data Usage Index

To ensure we understand how the parsed JSON data drives the frontend application, here is an index mapping the schema properties to their functional usage in the app:

| Property | Used In | Purpose / Description |
| :--- | :--- | :--- |
| `id`, `name`, `bggId` | **0) Main Menu** | Used to populate the "New Game" selection dropdown/modal. |
| `revenueStops` | **B) Revenue Calculator** | Generates the dynamic vertical list of rows (e.g., 20, 30, 40) for calculating train run revenue. |
| `revenueBonuses` | **B) Revenue Calculator** | Generates the special bonus rows (e.g., "Bridge", "Coal") below the standard revenue stops. |
| `companies` (`name`, `shortName`, `color`) | **A) Raise Funds** & **C) Results** | Populates the list of companies available to activate in Raise Funds. Provides the UI styling (color) and headers for the Company ORs and Player Assets tables. |
| `sharePrices` | **A) Raise Funds** & **C) Results** | Used to set the initial/current market value of an active company's shares. Used to calculate Player Net Worth in the Results dashboard. |
| `priceMovement` | **C) Results** | What makes a company's price move and which way, written by `scripts/import-price-movement.js`. Nothing reads it yet; it is there so a later change can offer "paid a dividend" or "sold out" instead of bare arrows. A `custom` note on a rule means the reference implementation does something we have not captured, so the rest of that rule is the headline behaviour rather than the whole story. |
| `stockMarket` | **C) Results** | The real shape of the market, written by `scripts/import-markets.js`. Each cell is a price followed by optional flag letters: `p` marks a par square, `y`/`o`/`b` are the colour zones, and `""` means no cell. A `2d` grid drives the up, down, left and right arrows in the "Set final price for" modal; a `1d` grid, or no `stockMarket` at all, leaves the modal on left and right only. |
| `parValues` | **A) Raise Funds** | Used to set the initial par value when a company is floated/activated. |
| `trains` | **C) Results** | Used to track company train rosters and their associated costs (if train purchasing is eventually tracked). |
| `allowsHalfPay` | **B) Revenue Calculator** | Shows the Full Pay / Half Pay buttons. Absent means the title has no half pay rule, so the buttons are hidden. Withholding is a separate operation and has no button either way, since it pays nothing per share. |
| `maxOr` | **C) Results** | Determines the number of Operating Round columns (e.g., OR1, OR2, OR3) displayed in the Company ORs Table. |
| `ownership` | *(nothing yet)* | Declared here from the outset but never implemented: `scripts/parse-games.js` does not emit it, no game JSON carries it, and no code reads it. The job it describes is done by `maxPlayerHolding` and `corporateStructures`. |
| `maxPlayerHolding` | **C) Results** | The most of one company a single player may hold, read by `src/utils/corporateStructures.js` and turned into the percentages the Share Count popup offers. 60 on almost every title; 100 on 1824, 1871, 1880 and 1894, which let one player take a company outright. Hand-added rather than parsed, so `scripts/build-games.js` would drop it on a regeneration; `src/data/games.test.js` names every title to catch that. A structure is never capped below one share, so 1817's 2-share company stays at 100 despite the title's 60. |
