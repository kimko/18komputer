# 18komputer - AI Agent Guide

## Project Overview
This project is a web-based calculator for 18xx board games. It is being built in two phases:
1. **Phase 1 (Current):** A stateless frontend application using Vite, React, Chakra UI, and Framer Motion. All state is temporarily persisted in `localStorage`.
2. **Phase 2:** An Elixir Phoenix backend with SQL storage will be integrated later. The frontend must be designed with RESTful API integration in mind.

## Design System & Aesthetics
- **Core Aesthetic:** Sleek, modern SaaS dashboard with a premium dark mode, glassmorphism effects, and smooth micro-animations.
- **Tech Stack:** Vite + React, Chakra UI, Framer Motion, Wouter.

## Key Documentation
Before writing code, always reference:
- `architecture_design.md`: Contains the business logic for the Main Menu, Raise Funds, Revenue Calculator, and Company Values/Results dashboards.
- `game_data_schema.md`: Details the JSON schema and mapping rules for converting the custom 18xx `.txt` files into JSON data.

## Workflow Rules
1. **Test-Driven Development (TDD):** All development must be strictly Test-Driven. Write tests (using Vitest and React Testing Library) before implementing any parsing logic, business logic, or UI components. Follow the Red-Green-Refactor cycle.
2. **Data Handling:** Never parse `.txt` game files on the client. A Node script handles converting them to JSON ahead of time.
3. **State:** Keep Phase 1 state management clean and localized, masking `localStorage` interactions behind async functions to easily swap them for standard `fetch` API calls in Phase 2.
4. **Task Tracking:** Always refer to and update the `TODO.md` file upon completing major milestones.
5. **Version Control:** Always do incremental commits for easy rollback and branching. Keep commit messages terse.
6. **Auto-Versioning:** Every time a commit is made, the patch version (e.g. `v1.0.0` -> `v1.0.1`) MUST be incremented automatically via the `scripts/bump-version.js` pre-commit hook. Never bypass this unless explicitly necessary.
7. **Deployments:** The `deploy.yml` GitHub Action is configured to automatically trigger on `push` to `main`. DO NOT run `gh workflow run deploy.yml` manually via CLI after pushing, as this will cause GitHub to cancel both jobs due to concurrency limits.
8. **User Journey:** Always update the `USER_JOURNEY.md` document every time a new feature is completed to reflect all current capabilities of the app.
