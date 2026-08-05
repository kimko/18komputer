# 18komputer

**[Play Now: kimko.github.io/18komputer](https://kimko.github.io/18komputer/)**

A mobile-first web assistant designed specifically for playing 18XX board games. It handles the heavy mathematical lifting—calculating complex revenues, tracking company shares, and determining player net worths—so you can focus on the game.

## Features
- **Extensive Game Library**: Built-in support for over 60 different 18XX titles.
- **Dynamic Revenue Calculator**: Add multiple trains, calculate grand totals, and generate payout tables instantly.
- **Title-Specific Mechanics**: Includes specialized features like Pullman tracking for the 1822 series.
- **Mobile-First Design**: A clean, dark-mode interface powered by Chakra UI, optimized specifically for playing at the table on your phone.
- **Seamless Sharing**: Instantly share your active game state with other players using Magic Links (compressed URLs), bypassing the need for manual file transfers.
- **Resume & Persistence**: Safely close the app and resume games later. Games are automatically saved to your browser's local storage. You can also import shared games directly.

## Tech Stack
- **Framework**: React (via Vite)
- **Styling**: Chakra UI (Dark Mode default)
- **Routing**: Wouter
- **Testing**: Vitest + React Testing Library
- **Deployment**: GitHub Pages (via GitHub Actions)

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Run the test suite:**
   ```bash
   npm run test
   ```

## Deployment
This project is configured to deploy automatically to GitHub Pages via GitHub Actions. Any push to the `main` branch will trigger a production build and deploy to the `gh-pages` environment.
