# 18komputer - User Journey

This document tracks the current capabilities and functional flows of the application from an end-user and system perspective. It must be updated every time a new feature is completed.

## Current Capabilities

### 1. Game Data Provisioning
While there is no user-facing UI built just yet, the application's underlying data layer currently supports **70 different 18xx titles**.
- **Data Extracted:** For each game, the system provides:
  - Game Name and BoardGameGeek ID (`bggId`)
  - Maximum Operating Rounds (`maxOr`)
  - Valid `revenueStops` and `parValues`
  - A full roster of active `companies` with their precise market colors (converted to Hex) and abbreviations.
  - Custom `revenueBonuses` (e.g., "Bridge", "Coal" stops).
- **Index:** A global `index.json` manifest is available to quickly populate dropdowns and game selection screens without loading massive datasets on startup.

### 2. Main Menu & Navigation Hub
The central landing page has been implemented, serving as the user's primary entry point.
- **UI:** A sleek, glassmorphism-styled dashboard utilizing a dark gray and teal color palette.
- **Actions & Routing:**
  - **NEW GAME:** Routes to `/new`. Implements a form to select one of the 70 supported 18xx titles from a dropdown (with a real-time wildcard text search filter), add player names dynamically to a roster, and dispatch the data to the API state manager to initialize a new instance.
  - **RESUME GAME:** Routes to `/resume` (future existing game loader).
  - **USER MANAGEMENT:** Routes to `/users` (future player profile settings).

### 3. Persistent State Manager
An asynchronous API layer has been implemented to handle game state.
- **Data Store:** Currently powered by browser `localStorage` but architected with Promises to mimic network latency for a seamless swap to the Elixir backend later.
- **Operations Supported:**
  - `createGame(gameId, players)`: Spawns a new game instance with a unique ID and initialized data schema.
  - `getGame(instanceId)`: Fetches the current state of a running game instance.
  - `updateGameState(instanceId, updates)`: Deep merges incoming state modifications (e.g., active companies, player assets).
  - `getGamesList()`: Retrieves a catalog of all saved instances, sorted by creation date (ready for the 'Resume Game' menu).

### 4. Raise Funds (Setup Phase)
The initial game setup flow has been implemented.
- **UI:** A scrollable list of all valid companies for the selected 18xx title, displaying their full names, short names, and dynamically applying their correct hex market colors as borders.
- **Actions:**
  - Users can activate/deactivate companies dynamically.
  - Upon activation, a native dropdown appears allowing the user to select the company's initial par/market value (restricted only to the values valid for that specific 18xx title).
  - Completing setup merges these active companies into the game instance via the API state manager and routes the user to the dashboard.

### 5. Revenue Calculator
The core utility for running Operating Rounds has been implemented.
- **UI:** A mobile-first, touch-friendly calculator layout optimized for rapid data entry.
- **Features:**
  - Dynamic selector for the active operating company.
  - **Multiple Trains:** Users can calculate multiple trains simultaneously. Trains can be added, removed, or duplicated via a "Copy Train" button. State is tracked independently for each company.
  - **Interactive History:** Each train has an itemized string of tapped stops (e.g., `60 + 70 + 40`). Stops can be instantly deleted by tapping them.
  - **Dynamic Bonuses**: Fully supports 18xx-specific revenue bonuses (like Towns, Ports, or 1822 Pullmans), rendered distinctly without counting against stop limits.
  - **Grand Total & Payouts:** A real-time Grand Total tracks all trains. Below the total, a table dynamically generates the Revenue Per Share payout (from 10% to 100%).
- **Data Flow:** The calculator currently acts as a pure visual aid. Users will reference the Grand Total and Payout tables to manually enter operating decisions into the final dashboard.

### 6. Company Values & Results (Dashboard)
The final game summary dashboard is implemented and provides real-time mathematical aggregation.
- **UI:** A unified view consisting of two main grids (Company Values & Results, Player Holdings).
- **Features:**
  - **Company Values Grid:** Displays each active company, its current Share Value, and rows for its Operating Rounds (ORs). Clicking any numerical cell opens a touch-friendly Numpad or Price Picker popup to quickly set values.
  - **Player Holdings Grid:** Displays each player (and the Bank) as columns. Tracks Cash, per-company share percentages, Total Shares, Share Value, Operating Income, and total Net Worth. 
  - **Smart Validation:** The Share Count popup dynamically restricts available share percentages based on what remains in the Bank, preventing users from allocating more than 100% of a company.
  - **Details Toggle:** A "Details" button expands the Player Holdings grid to show a breakdown of how the final Net Worth is calculated (showing the separate Share Value and Op Income values).
- **Data Flow:** All interactions (updating ORs, changing prices, modifying shares or cash) immediately dispatch updates to the mock API, persisting the state to `localStorage`.

---
*Phase 1 (Stateless Frontend) is functionally complete.*
