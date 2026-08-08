# 18komputer - User Journey

This document tracks the current capabilities and functional flows of the application from an end-user and system perspective. It must be updated every time a new feature is completed.

## Current Capabilities

### 1. Game Data Provisioning
The application's underlying data layer currently supports **70 different 18xx titles**.
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
  - **RESUME GAME:** Routes to `/resume`. Displays a grid of all active games loaded from `localStorage`. Users can delete games, import a game from a JSON file, or click a game to instantly resume where they left off.
  - **USER MANAGEMENT:** Routes to `/users` (future player profile settings).
  - **Active Game Navigation:** When inside a game, both desktop and mobile views feature a unified `Home` button that safely returns the user to the Main Menu without risking data loss.

### 3. Persistent State Manager
An asynchronous API layer has been implemented to handle game state.
- **Data Store:** Currently powered by browser `localStorage` but architected with Promises to mimic network latency for a seamless swap to the Elixir backend later.
- **Operations Supported:**
  - `createGame(gameId, players)`: Spawns a new game instance with a unique ID and initialized data schema.
  - `getGame(instanceId)`: Fetches the current state of a running game instance.
  - `updateGameState(instanceId, updates)`: Deep merges incoming state modifications (e.g., active companies, player assets).
  - `deleteGame(instanceId)`: Permanently removes a game from local storage.
  - `importGame(gameData)`: Saves an imported JSON game payload directly to local storage.
  - `getGamesList()`: Retrieves a catalog of all saved instances, sorted by creation date (used by the 'Resume Game' menu).

### 4. Activating Companies (Setup Phase)
The initial game setup flow has been implemented.
- **UI:** A scrollable list of all valid companies for the selected 18xx title, displaying their full names, short names, and dynamically applying their correct hex market colors as borders.
- **Actions:**
  - Users can activate/deactivate companies dynamically.
  - Upon activation, a row of inline buttons appears allowing the user to select the company's initial par value (restricted only to the values valid for that specific 18xx title).
  - Toggling a company or selecting a par value immediately merges these updates into the game instance via the API state manager (autosaving to local storage).

### 5. Revenue Calculator
The core utility for running Operating Rounds has been implemented.
- **UI:** A mobile-first, touch-friendly calculator layout optimized for rapid data entry.
- **Features:**
  - Dynamic selector for the active operating company.
  - **Multiple Trains:** Users can calculate multiple trains simultaneously. Trains can be added, removed, or duplicated via a "Copy Train" button. State is tracked independently for each company.
  - **Interactive History:** Each train has an itemized string of tapped stops (e.g., `60 + 70 + 40`). Stops can be instantly deleted by tapping them.
  - **Dynamic Bonuses**: Fully supports 18xx-specific revenue bonuses (like Towns, Ports, or 1822 Pullmans), rendered distinctly without counting against stop limits.
  - **Grand Total & Payouts:** A real-time Grand Total tracks all trains. Below the total, a table dynamically generates the Revenue Per Share payout (from 10% to 100%).
- **Data Flow:** The calculator currently acts as a pure visual aid. Users can manually enter operating decisions into the final dashboard, or tap the company's subtitle inside the Dashboard's OR Numpad to automatically fetch the Grand Total from the calculator.

### 6. Company Values & Results (Dashboard)
The final game summary dashboard is implemented and provides real-time mathematical aggregation.
- **UI:** A unified view consisting of two main grids (Company Values & Results, Player Holdings).
- **Features:**
  - **Company Values Grid:** Displays each active company, its current Share Value, and rows for its Operating Rounds (ORs). Clicking any numerical cell opens a touch-friendly Numpad or Price Picker popup to quickly set values.
  - **Player Holdings Grid:** Displays each player (and the Bank) as columns. Tracks Cash, per-company share percentages, Total Shares, Share Value, Operating Income, and total Net Worth. 
  - **Smart Validation:** The Share Count popup dynamically restricts available share percentages based on what remains in the Bank, preventing users from allocating more than 100% of a company.
  - **Details Toggle:** A "Details" button expands the Player Holdings grid to show a breakdown of how the final Net Worth is calculated (showing the separate Share Value and Op Income values).
  - **Magic Links (Share):** A "Share" button at the top-right allows users to instantly export the current game state. It generates a compressed URL (via LZString) and copies it to the clipboard. Anyone who clicks the link will automatically have the game imported and opened on their device.
- **Data Flow:** All interactions (updating ORs, changing prices, modifying shares or cash) immediately dispatch updates to the mock API, persisting the state to `localStorage`.

### 7. Printing an Operating Round Receipt
The Revenue Calculator can print the trains it just totalled to a pocket Bluetooth printer, so the table gets a paper record of the run.
- **UI:** A "Receipt Printer" panel below the Grand Total, with Pair, Print, Disconnect and Probe buttons. The panel names whichever printer is connected.
- **Two supported printers:**
  - **Phomemo D30**, a die-cut label printer. Text is drawn onto a small picture and sent as a bitmap, one label per four lines, so a long run prints as several labels.
  - **GOOJPRT PT-210**, a 58mm receipt printer. Sends plain text using the printer's own built-in font, 32 characters per line, so a whole receipt is about 270 bytes and prints as one continuous strip. The company name is bold and double height, the total is pushed to the right edge, and long routes wrap on a `+` so no stop value is ever cut in half.
- **Features:**
  - **Pair once.** The pairing dialog lists both printers, and the app works out which one you picked from its Bluetooth name. There is nothing to configure.
  - **Reconnects on its own.** On later visits the app reconnects in the background, preferring the printer you used last. If a printer is out of range it gives up after 5 seconds and tries the next one rather than hanging.
  - **Probe.** When a printer will not connect, Probe pairs with anything nearby and lists the services and characteristics it offers, on screen rather than only in the browser console. This is the tool for working out whether a printer is reachable at all.
  - **Accented company names** are converted to plain letters before printing, because these printers cannot render them.
- **Requirements:** Web Bluetooth, so Chrome on desktop or Android, or Bluefy on iOS. Automatic reconnect additionally needs the browser to be able to list already-paired devices, and quietly does nothing where it cannot.

---
*Phase 1 (Stateless Frontend) is functionally complete.*
