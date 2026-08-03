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
  stockPrices: number[];  // From "stock prices: [...]"
  parValues: number[];    // From "par values: [...]"
  
  companies: Company[];
  trains: Train[];
  revenueBonuses: RevenueBonus[];
  hasPullmans?: boolean;  // Injected for 1822 family games
  // Other properties like assets, corporateStructures can be added as needed.
}

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
| `stockPrices` | **A) Raise Funds** & **C) Results** | Used to set the initial/current market value of an active company's shares. Used to calculate Player Net Worth in the Results dashboard. |
| `parValues` | **A) Raise Funds** | Used to set the initial par value when a company is floated/activated. |
| `trains` | **C) Results** | Used to track company train rosters and their associated costs (if train purchasing is eventually tracked). |
| `maxOr` | **C) Results** | Determines the number of Operating Round columns (e.g., OR1, OR2, OR3) displayed in the Company ORs Table. |
| `ownership` | **A) Raise Funds** & **C) Results** | Used to validate or distribute share percentages when assigning ownership in the Player Assets table. |
