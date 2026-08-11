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

### 4. Manage Companies (Setup Phase)
The initial game setup flow has been implemented.
- **UI:** A scrollable list of all valid companies for the selected 18xx title, displaying their full names, short names, and dynamically applying their correct hex market colors as borders.
- **Actions:**
  - Users can activate/deactivate companies dynamically.
  - Upon activation, a row of inline buttons appears allowing the user to select the company's initial par value (restricted only to the values valid for that specific 18xx title).
  - **Co. Structure:** Titles that offer more than one corporate structure (1817 and its siblings offer 10, 5 and 2 share companies) show a second row of buttons for choosing one. Titles with a single structure show nothing, since there is nothing to choose, and every company is a 10-share company. The structure can still be changed after shares are in players' hands, unlike the par value, which locks. What it cannot do is strand somebody: a structure that could not express what players already hold is greyed out. Somebody on 30% blocks the move to a 5-share company, and somebody owning a 2-share company outright blocks the move away from it. Holdings are never rewritten to make a switch fit.
  - Toggling a company, selecting a par value, or picking a structure immediately merges these updates into the game instance via the API state manager (autosaving to local storage).

### 5. Revenue Calculator
The core utility for running Operating Rounds has been implemented.
- **UI:** A mobile-first, touch-friendly calculator layout optimized for rapid data entry.
- **Features:**
  - Dynamic selector for the active operating company. Every company keeps its own colour at full strength; the selected one is picked out by a white ring rather than by dimming the rest. Its full name sits in a banner above the row, so the short code on the button is never the only clue about which company you are running.
  - **Telling trains apart:** each train card is headed by its number in a badge, which is the fastest thing to find when scrolling a phone, and the cards are spaced far enough apart to read as separate blocks.
  - **Multiple Trains:** Users can calculate multiple trains simultaneously. Trains can be added, removed, or duplicated via a "Copy Train" button. State is tracked independently for each company.
  - **Interactive History:** Each train has an itemized string of tapped stops (e.g., `60 + 70 + 40`). Stops can be instantly deleted by tapping them.
  - **Dynamic Bonuses**: Fully supports 18xx-specific revenue bonuses (like Towns, Ports, or 1822 Pullmans), rendered distinctly without counting against stop limits.
  - **Grand Total & Payouts:** A real-time Grand Total tracks all trains. Below the total, a table generates the Revenue Per Share payout, one column per share.
  - **Co. Structure:** The payout table follows the structure chosen on the Manage Companies screen. A 10-share company shows ten columns from 10% to 100%, and a 5-share company shows five columns of 20% each. A 2-share company gets no table: one player owns the whole thing, so the line above says what that player takes and what stays behind. The same buttons appear here, so the choice can be made from either screen; there is only one value and the two screens cannot disagree, and the same greying-out applies. Titles with a single structure show no buttons at all.
  - **Full or Half Pay:** On half pay the company keeps half the revenue. The dividend per share is rounded up to the next whole dollar and the company keeps the remainder, so a $190 run on a 10-share company pays $10 per share and leaves $90 with the company. The same run on a 5-share company divides evenly: $19 per share, $95 kept. A 2-share company is a straight split with no rounding to do, because there is only one holder: $95 to the shareholder and $95 kept, with the odd dollar going to the shareholder on an odd total. Both figures are shown under the Grand Total. The kept amount is not carried between rounds.
- **Data Flow:** The calculator currently acts as a pure visual aid. Users can manually enter operating decisions into the final dashboard, or tap the company's subtitle inside the Dashboard's OR Numpad to automatically fetch the Grand Total from the calculator.

### 6. Company Values & Results (Dashboard)
The final game summary dashboard is implemented and provides real-time mathematical aggregation.
- **UI:** A unified view consisting of two main grids (Company Values & Results, Player Holdings).
- **Features:**
  - **Company Values Grid:** Displays each active company, its current Share Value, and rows for its Operating Rounds (ORs). Clicking any numerical cell opens a touch-friendly Numpad or Price Picker popup to quickly set values.
  - **Player Holdings Grid:** Displays each player (and the Bank) as columns. Tracks Cash, per-company share percentages, Total Shares, Share Value, Operating Income, and total Net Worth. Share counts follow each company's corporate structure, so 40% is four shares of a 10-share company but only two of a 5-share one.
  - **Smart Validation:** The Share Count popup only offers percentages the company's structure allows, and only up to what remains in the Bank. A 10-share company offers 0 to 60 in tens, a 5-share company offers 0, 20, 40 and 60, and a 2-share company is all or nothing: 0 or 100.
  - **Details Toggle:** A "Details" button expands the Player Holdings grid to show a breakdown of how the final Net Worth is calculated (the separate Share Value and Op Income values), plus how many shares of each company every player and the Bank actually holds. That row names the structure it is counting in, so it reads "↳ Shares 5" for a 5-share company, which is also the quickest way to see what a company is set to without leaving the results page.
  - **Removing a Player:** The ✕ beside a name removes the player and everything they were holding; their shares go back to the bank and the Bank column rises to match. A player holding cash or shares is confirmed first, with the dialog naming what is about to go ("Their 6 shares and $500 go back to the bank"), while a player holding nothing is removed on the first click. Their holdings are deleted from the saved game rather than left orphaned under a name that no longer appears anywhere, so a shared copy carries no trace of them either.
  - **Company Names:** The grids only have room for short names, so tapping any company label flashes its full name in a small banner near the top of the screen. It fades away on its own after about a second, and tapping another company swaps the name and restarts the countdown.
  - **Share:** A "Share" button at the top-right saves the current game to a Google Sheet and copies a link to the clipboard. The link carries only the game's id, so it is short enough to fit anywhere, and the game itself is fetched from the sheet when someone opens it. Sharing the same game again updates its row rather than adding another, and if nothing has changed since the last save it does not write at all: it copies the link straight away and says "No changes". A game that has just been fetched from the sheet counts as already saved, so opening a shared link and pressing Share does not write back what was just read. A toast reports which of the three happened: game saved, game updated, or no changes. If the sheet cannot be reached the button says why and copies nothing, because a link to a game that was never saved would only fail later. Anyone who opens the link has the game imported and opened on their device; if they already have that game, they are asked which copy to keep before anything is overwritten.
  - **Results Receipt:** When the game is over, the results page prints a keepsake slip on the PT-210: the game name, every player in finishing order with their net worth, and under each one their shares, cash, stock value and operating income. Each player's position line prints double height, with the winner's also bold, while the four indented rows under it stay small. Below the standings it prints a QR code that reopens the finished game on a phone, so nobody has to type anything in. The code holds the same short link the Share button copies, which is why it scans off thermal paper where a code carrying the whole game could not. If the sheet cannot be reached the slip still prints, with a note on screen that the code opens the app rather than this particular game. The D30 label printer says plainly that results need the receipt printer, rather than producing a run of unreadable labels.
- **Data Flow:** All interactions (updating ORs, changing prices, modifying shares or cash) immediately dispatch updates to the mock API, persisting the state to `localStorage`.

### 7. Printing an Operating Round Receipt
The Revenue Calculator can print the trains it just totalled to a pocket Bluetooth printer, so the table gets a paper record of the run.
- **UI:** A "Receipt Printer" panel below the Grand Total, with Pair, Print and Disconnect buttons. The panel names whichever printer is connected.
- **Two supported printers:**
  - **Phomemo D30**, a die-cut label printer. Text is drawn onto a small picture and sent as a bitmap, one label per four lines, so a long run prints as several labels.
  - **GOOJPRT PT-210**, a 58mm receipt printer. Sends plain text using the printer's own built-in font, 32 characters per line, so a whole receipt is about 270 bytes and prints as one continuous strip. The company name is bold and double height, the total is pushed to the right edge, and long routes wrap on a `+` so no stop value is ever cut in half. Each train line and the total print double height so they can be read at a glance; the printer has no half sizes, and growing the width instead would cut the line to 21 characters and split routes across two of them. Every slip ends with the app version in the printer's small typeface.
- **Features:**
  - **The payout is on the slip (PT-210).** Under the total the receipt records the company type, whether it paid full or half, and the money going to the treasury. The slip then ends with the payout table itself: what every holding is worth, from a single share up to the whole company, in two columns for a 10-share company and one for a 5-share one. A 2-share company prints no table, since the total and the treasury line already say everything. The figures come from the same calculation as the on-screen table, so the two cannot disagree. A receipt with no routes prints no table. The label printer is left as it was, because every extra line there costs another sticker.
  - **Pair once.** The pairing dialog lists both printers, and the app works out which one you picked from its Bluetooth name. There is nothing to configure. One connection is shared by the whole app, so a printer paired on the calculator is already paired on the results screen and the other way round.
  - **Reconnects on its own.** On later visits the app reconnects in the background, preferring the printer you used last. If a printer is out of range it gives up after 5 seconds and tries the next one rather than hanging.
  - **Probe (hidden).** A diagnostics tool that pairs with anything nearby and lists the services and characteristics it offers, on screen rather than only in the browser console. It is how we established that these printers are reachable at all, and is switched off now that both work. Pass `showProbe` to `ReceiptPrinter` to bring it back for a new printer.
  - **Accented company names** are converted to plain letters before printing, because these printers cannot render them.
- **Requirements:** Web Bluetooth, so Chrome on desktop or Android, or Bluefy on iOS. Automatic reconnect additionally needs the browser to be able to list already-paired devices, and quietly does nothing where it cannot.

---
*Phase 1 (Stateless Frontend) is functionally complete.*
