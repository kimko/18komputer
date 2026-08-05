# 18komputer — Code Review

**Date:** August 4, 2026  
**Scope:** Full repository review — source components, utilities, API layer, tests, build scripts, and configuration.  
**Repository:** [18XXc-also](/Users/kkopowski/Projects/18XXc-games/18XXc-also)

---

## Executive Summary

The 18komputer codebase is a well-structured React application with a clear architecture and solid foundational design. The project follows good conventions: TDD practices are in place, the tech stack is appropriate, and the separation between game data, UI, and state is clean. However, there are several areas that need attention, particularly around **data integrity**, **test coverage gaps**, **build robustness**, and **component decomposition**.

| Severity | Count | Summary |
|----------|-------|---------|
| 🔴 Critical | 3 | Build script silent failures, parser brittleness, state mutation risks |
| 🟠 High | 6 | API race conditions, monolithic components, missing test coverage for critical paths |
| 🟡 Medium | 24 | Error handling gaps, validation issues, performance concerns, accessibility |
| 🔵 Low | 18 | Code style, dead CSS, minor optimizations |

> [!IMPORTANT]
> All **116 tests pass**, the build succeeds, and the linter reports only **1 warning** (unused import). The app is functional — these findings are about hardening, not fixing breakage.

---

## 🔴 Critical Issues

### 1. Build script silently swallows parse errors
**File:** [`build-games.js`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/scripts/build-games.js)

The script wraps parsing in a `try/catch` and logs to `console.error`, but **does not exit with a non-zero status code**. If a game file is corrupted, the build will appear to succeed and CI will pass with missing or broken game data.

```diff
 } catch (err) {
   console.error(`Failed to parse ${file}: ${err.message}`);
+  process.exit(1);
 }
```

### 2. Parser uses brittle regex that breaks on unexpected input
**File:** [`parse-games.js`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/scripts/parse-games.js)

- The `extractBlock` function regex `(?:\\n[a-z]+[a-z ]*:|$)` assumes block headers always start with a lowercase letter. Uppercase or differently-spaced headers will cause silent misparsing.
- Hardcodes `\n` line endings — will fail or capture `\r` on Windows CRLF files.
- `parseFloat` on color RGBA values doesn't check for `NaN`, causing `Math.round(NaN * 255)` to propagate `NaN` into hex color strings.

### 3. Shallow merge in `updateGameState` can silently lose nested data
**File:** [`mockApi.js`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/api/mockApi.js)

`updateGameState` performs `...db[instanceId].state, ...updates`. If `updates` contains nested objects (e.g., updating a single field inside `playerAssets`), the entire nested object is **overwritten** rather than merged. This can cause silent data loss.

---

## 🟠 High Issues

### 4. API race conditions on rapid interactions
**Files:** [`ActivateCompany.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/ActivateCompany.jsx), [`RevenueCalculator.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/RevenueCalculator.jsx), [`Dashboard.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/Dashboard.jsx)

Components fire un-debounced, optimistic `updateGameState` calls on every button click (e.g., every `+` tap on a revenue stop). Rapid interactions generate concurrent requests that can resolve out-of-order, silently overwriting state.

**Recommendation:** Debounce saves or serialize them through a queue.

### 5. `RevenueCalculator` is a 350-line monolith
**File:** [`RevenueCalculator.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/RevenueCalculator.jsx)

Handles train management, revenue center interactions, bonus tracking, and total calculations in a single file with complex nested state. The `trains` state uses index-based mutation with spread operators that are error-prone.

**Recommendation:** Extract into `TrainCard`, `RevenueCenterRow`, and `BonusSection` sub-components. Use `useReducer` for the trains state.

### 6. `PlayerHoldingsGrid` has zero tests despite containing critical business logic
**File:** [`PlayerHoldingsGrid.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/grids/PlayerHoldingsGrid.jsx)

Net worth, share values, and operating income are calculated **inline in JSX** with no dedicated tests. This is the most financially-critical component in the app.

### 7. `CompanyValuesGrid` has zero tests
**File:** [`CompanyValuesGrid.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/grids/CompanyValuesGrid.jsx)

### 8. Test coverage is shallow for critical user flows
Most component tests only verify that elements render. Key untested flows include:

| Component | Untested Flows |
|-----------|---------------|
| [`NewGame.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/NewGame.jsx) | Full game creation flow, validation (empty names, min players) |
| [`GameLayout.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/GameLayout.jsx) | State loading, tab switching, state persistence |
| [`RevenueCalculator.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/RevenueCalculator.jsx) | Incrementing/decrementing stops, total calculations, Pullman logic |

### 9. Full game state re-saved on every tab change
**File:** [`GameLayout.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/GameLayout.jsx)

`handleStateChange` calls `updateGame()` which serializes the entire game state to `localStorage` on every minor interaction, including tab switches.

---

## 🟡 Medium Issues

### Error Handling & Validation

| # | File | Issue |
|---|------|-------|
| 10 | [`NewGame.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/NewGame.jsx) | No validation for empty or duplicate player names |
| 11 | [`NewGame.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/NewGame.jsx) | `createGame()` promise rejection is unhandled |
| 12 | [`ResumeGame.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/ResumeGame.jsx) | No error state if `localStorage` is corrupted |
| 13 | [`ResumeGame.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/ResumeGame.jsx) | `useEffect` fetching `getGamesList` lacks cleanup; state update on unmounted component possible |
| 14 | [`GameLayout.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/GameLayout.jsx) | No redirect or error display when `gameId` doesn't exist in storage |
| 15 | [`mockApi.js`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/api/mockApi.js) | No data validation on `createGame`/`updateGame` — accepts any shape |
| 16 | [`mockApi.js`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/api/mockApi.js) | `JSON.parse` without try-catch in `listGames` |
| 17 | [`mockApi.js`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/api/mockApi.js) | No migration strategy for schema changes in stored data |
| 18 | [`Dashboard.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/Dashboard.jsx) | `handleAddPlayer`/`handleRemovePlayer` don't revert UI on API failure |

### Data & Logic

| # | File | Issue |
|---|------|-------|
| 19 | [`PlayerHoldingsGrid.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/grids/PlayerHoldingsGrid.jsx) | Bank share calculation hardcodes `10 - totalPlayerShares`. Not all 18xx games use 10 shares. |
| 20 | [`CompanyValuesGrid.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/grids/CompanyValuesGrid.jsx) | Hardcodes 3 OR columns (OR1, OR2, OR3). Should be data-driven. |
| 21 | [`dashboardMath.js`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/utils/dashboardMath.js) | Division by zero potential in `calculateNetWorth` if a company has 0 shares issued |
| 22 | [`colorUtils.js`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/utils/colorUtils.js) | `hexToRgb` only handles 6-char hex codes. 3-char shorthand (`#FFF`) returns null. |
| 23 | [`PricePickerPopup.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/popups/PricePickerPopup.jsx) | `Number('')` evaluates to `0`; could accidentally select a valid option |
| 24 | [`RevenueCalculator.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/RevenueCalculator.jsx) | `handleCopyTrain` uses `Date.now()` for IDs — duplicate keys if clicked rapidly |

### Performance

| # | File | Issue |
|---|------|-------|
| 25 | [`PlayerHoldingsGrid.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/grids/PlayerHoldingsGrid.jsx) | Heavy inline calculations inside `.map()` loops. `getShareValue`/`getCompanyOrTotal` called per player-company pair without memoization. |
| 26 | [`CompanyValuesGrid.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/grids/CompanyValuesGrid.jsx) | `getCompanyOrTotal` called twice per company in render |
| 27 | [`NewGame.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/NewGame.jsx) | `gameIndex.filter()` with regex runs on every render — needs `useMemo` |

### Accessibility

| # | File | Issue |
|---|------|-------|
| 28 | [`GameLayout.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/GameLayout.jsx) | Custom leave-game modal lacks `role="dialog"`, `aria-modal="true"`, and focus trapping |
| 29 | [`NewGame.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/NewGame.jsx) | Player name `<Input>` lacks `aria-label` |
| 30 | [`NewGame.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/NewGame.jsx) | Uses array index as `key` in `players.map()` despite items being removable |

### Architecture

| # | File | Issue |
|---|------|-------|
| 31 | Multiple files | Redundant dynamic imports: `ActivateCompany`, `RevenueCalculator`, and `Dashboard` each independently import `../data/games/${data.gameId}.json`. Should be centralized in a context or hook. |
| 32 | App-wide | No `ErrorBoundary` component — any unhandled error crashes the entire app |
| 33 | [`dashboardMath.js`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/utils/dashboardMath.js) | No dedicated unit tests for this critical math utility |

---

## 🔵 Low Issues

| # | File | Issue |
|---|------|-------|
| 34 | [`App.css`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/App.css) | Contains large amounts of dead boilerplate CSS from the Vite starter template (`.hero`, `.framework`, `.vite`, `#next-steps`, etc.) |
| 35 | [`index.css`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/index.css) | Defines raw CSS custom properties and dark mode media queries, conflicting with Chakra UI's theme engine |
| 36 | [`App.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/App.jsx) | 404 route uses inline styles and raw `<div>` instead of Chakra components |
| 37 | [`GameLayout.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/GameLayout.jsx) | Hardcoded inline styles instead of Chakra UI style props |
| 38 | [`MainMenu.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/MainMenu.jsx) | Train emoji `🚂` lacks `role="img"` and `aria-label` |
| 39 | [`ResumeGame.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/ResumeGame.jsx) | `new Date(game.createdAt)` could display "Invalid Date" if field is missing |
| 40 | [`ResumeGame.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/ResumeGame.jsx) | No way to delete saved games |
| 41 | [`ResumeGame.test.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/ResumeGame.test.jsx) | Unused `useLocation` import (caught by linter) |
| 42 | [`ActivateCompany.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/ActivateCompany.jsx) | Loading error `catch` block only logs to console — user sees infinite spinner |
| 43 | [`NumpadPopup.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/popups/NumpadPopup.jsx) | No max value validation on input |
| 44 | [`NumpadPopup.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/popups/NumpadPopup.jsx) | Hardcoded padding/sizing instead of theme spacing tokens |
| 45 | [`ShareCountPopup.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/popups/ShareCountPopup.jsx) | `options` array rebuilt on every render — wrap in `useMemo` |
| 46 | [`vite.config.js`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/vite.config.js) | PWA `autoUpdate` without UI prompt could refresh during gameplay, losing temp state |
| 47 | [`games.test.js`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/data/games.test.js) | Color regex `/^#[0-9a-fA-F]{6}$/` rejects valid 3-char hex codes |
| 48 | [`mockApi.test.js`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/api/mockApi.test.js) | Missing tests for `updateGamePlayers` |
| 49 | [`RevenueCalculator.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/RevenueCalculator.jsx) | Uses string-interpolated indices as React keys (`key={'reg-${index}'}`) |
| 50 | [`Dashboard.jsx`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/components/Dashboard.jsx) | Inline arrow functions passed to popup children cause unnecessary re-renders |
| 51 | [`dashboardMath.js`](file:///Users/kkopowski/Projects/18XXc-games/18XXc-also/src/utils/dashboardMath.js) | `getPlayerShareValue` has O(N²) complexity due to nested `forEach`/`find` |

---

## ✅ Strengths

The review also identified several things the codebase does well:

- **Clean project structure** — Logical separation of components, API, utils, and data
- **Phase 2 readiness** — The async `mockApi` layer with simulated latency is a smart pattern for future backend migration
- **Comprehensive game data validation** — 70 tests validate all 60+ game JSON files against schema expectations
- **Good popup component design** — `NumpadPopup`, `PricePickerPopup`, and `ShareCountPopup` are well-structured and reusable
- **Pure utility functions** — `dashboardMath.js` functions are pure and well-named
- **PWA support** — Service worker and offline support configured out of the box
- **TDD discipline** — Every component has a corresponding test file, and the parser has dedicated tests

---

## Recommended Priority Actions

> [!TIP]
> These are ordered by impact-to-effort ratio.

1. **Fix `build-games.js` to exit with error code** — 1 line change, prevents broken builds
2. **Add `ErrorBoundary` component** — Prevents full-app crashes, ~20 lines
3. **Add tests for `PlayerHoldingsGrid` and `CompanyValuesGrid`** — These contain untested financial calculations
4. **Debounce `updateGameState` calls** — Prevents state corruption on rapid interactions
5. **Extract `RevenueCalculator` sub-components** — Improves maintainability of the most complex component
6. **Add `try-catch` around `JSON.parse` in `mockApi.js`** — Prevents crashes from corrupted localStorage
7. **Centralize game data imports** — Create a `useGameData(gameId)` hook to replace 3 duplicate dynamic imports
8. **Clean up dead CSS** — Remove Vite boilerplate from `App.css`
