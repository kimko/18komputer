# 18komputer - Design & Architecture (Updated)

## Overview
This document outlines the architecture and design approach for building the web version of the 18komputer calculator app based on our design interview.

## Phase 1: Frontend Only (Stateless)
- **Framework & Setup:** The project will exactly mirror the `~/Projects/portfolio` setup, using **Vite, React, Chakra UI, Framer Motion, and Wouter**. 
- **State Persistence:** We will use `localStorage` initially so that the game data isn't lost on refresh. The application will be architected to interact with a RESTful API to easily transition to a backend later.

## Phase 2: Add Backend (State Persistence)
- **Tech Stack:** **Elixir Phoenix** with SQL storage.
- **Integration:** The frontend will use standard REST API patterns (e.g., `GET /api/game/:id`, `POST /api/game/:id/state`) that we will mock using `localStorage` during Phase 1.

---

## Business Logic & UI Design

### 0) Main Menu
The landing page of the application before entering a specific game.
- **UI:** A clean, centralized navigation hub.
- **Actions:**
  - **New Game:** Opens a modal or flow to select from available 18xx titles (populated from our parsed JSON files) and configure the players.
  - **Resume Game:** Select from a list of existing, ongoing games (loaded from `localStorage`).
  - **User Management (Sub-menu):** A smaller section/menu for managing player profiles or settings (e.g., adding/editing player names that can be selected in the New Game flow).

### A) Raise Funds Menu (Setup)
Instead of a continuous "Raise Funds" flow, this section acts as the primary setup area.
- **UI:** A form or table to activate companies.
- **Actions:** Select from available companies and set their initial market/par values. The companies activated here will populate the subsequent tables.

### B) Revenue Calculator
A highly interactive, touch-friendly calculator for computing the revenue of a company's operating trains.

- **UI Structure:**
  - **Train Tabs/Sections:** Start with one active train. A button allows adding additional trains to calculate their routes independently.
  - **Header:** Each train displays a dynamic summary (e.g., "4 stops for 140").
  - **Revenue Centers List:** A vertical list of possible stop values (e.g., 20, 30, 40... 100) populated from the specific 18xx game's JSON data.
  - **Special Bonuses:** Additional sections for game-specific bonuses (e.g., "Bridge", "Coal").
  
- **Row Interactions:**
  - Each revenue center row displays a multiplier (number of stops).
  - Prominent, easy-to-tap `[ + ]` and `[ - ]` buttons to increment/decrement the stop count.
  - A `[ Clear ]` button to instantly reset that specific row's count to 0.
  - A global "Reset" button at the bottom to clear the entire train's route.

- **Data Flow:** The total revenue calculated across all trains here acts purely as a visual aid. The user will manually enter the final calculated revenue into the Company ORs Table in section C.

### C) Company values and Results
1. **Company ORs Table:**
   - One row per active company.
   - Columns: Company Name, Share Value, OR1, OR2, OR3.
2. **Player Assets Table:**
   - Rows: 1 row for total cash, followed by 1 row per company.
   - Columns: 1 column per player.
- **Behavior:** The available companies in these tables are determined by the selections made in the "Raise Funds" menu. Operating round revenues will be entered manually (e.g., pulling from the Revenue calculator).

A final dashboard providing a summary of the game state.
- **UI:** A unified view showing:
  - Current stock prices and market capitalization.
  - Company treasuries.
  - Player net worth (Cash + Stock Value).

---

## II: Support for 18xc-games files (`../games`)
Instead of parsing the custom `.txt` files on the client in real-time, we will use an ahead-of-time approach.
- **Strategy:** Build a Node.js script that runs once during development (or build time) to convert all the `.txt` files in `../games` into a clean set of `.json` files.
- **Integration:** The generated JSON files will be shipped directly with the web application, making them instantly accessible without client-side parsing overhead.
