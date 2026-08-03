# 18XXc Web Calculator - User Journey

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
  - **NEW GAME:** Routes to `/new`. Implements a form to select one of the 70 supported 18xx titles from a dropdown, add player names dynamically to a roster, and dispatch the data to the API state manager to initialize a new instance.
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

---
*Next up: Revenue Calculator.*
