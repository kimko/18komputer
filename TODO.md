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
- [x] **Probe button** that lists the services a device offers, for when a printer will not connect.
- [ ] **Confirm the PT-210 over Bluetooth.** It may be classic Bluetooth only, which browsers cannot reach.
      If so, add a USB cable transport (`navigator.serial`); the payload bytes are the same either way.
- [ ] Tune the paper feed and the style switches in `Pt210Driver.js` against real paper.

## Phase 2: Backend Integration (Future)
- [ ] Setup Elixir Phoenix backend.
- [ ] Migrate `localStorage` mock API calls to actual REST endpoints.
