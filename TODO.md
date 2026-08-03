# 18XXc Web Calculator - Task List

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
- [ ] **Company Values & Results:** TDD the final dashboard (Company ORs Table, Player Assets Table, Net Worth).

## Phase 2: Backend Integration (Future)
- [ ] Setup Elixir Phoenix backend.
- [ ] Migrate `localStorage` mock API calls to actual REST endpoints.
