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
  - **NEW GAME:** Routes to `/new` (future game selection and player setup).
  - **RESUME GAME:** Routes to `/resume` (future existing game loader).
  - **USER MANAGEMENT:** Routes to `/users` (future player profile settings).

---
*Next up: State API Mock (`localStorage` implementation) and the Raise Funds setup flow.*
