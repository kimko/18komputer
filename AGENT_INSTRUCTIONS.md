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
5. **Version Control:** Work on a local `feat/...` branch and commit as often as you like; small,
   incremental commits are the point, because they make rollback easy. Those commits are scratch and
   nobody else ever sees them. When the branch is production ready, squash the whole thing into one
   commit on `main` with a proper summary message, then push. **We do not use pull requests.**

   The squash is done with a squash merge, not an interactive rebase:
   ```bash
   git checkout main
   git merge --squash feat/whatever
   git commit          # one commit, one good message
   git push
   git branch -D feat/whatever   # -D, because a squash merge leaves it unmerged as far as git knows
   ```
   Write that final message for somebody reading `git log` on `main` in six months: what changed and
   why, not a list of the scratch commits.
6. **Auto-Versioning:** One commit on `main` is one patch bump (e.g. `v1.0.0` -> `v1.0.1`), done
   automatically in `.husky/pre-commit` via `npm version patch --no-git-tag-version`. The hook only
   does this on `main`, so the scratch commits on a branch do not each burn a version number. Never
   bypass it unless explicitly necessary.
7. **Local checks are the gate:** `.husky/pre-commit` runs the linters on every commit, and on `main`
   also runs the full Playwright suite against the dev server, so the squashed commit is checked
   before it lands. `.husky/pre-push` runs `npm run lint` across the whole project and then the unit
   tests, and stops at the first failure, so a lint warning blocks the push. GitHub deliberately runs
   none of this. Do not add lint or full test workflows back.
8. **Deployments:** `deploy.yml` triggers on `push` to `main`. It builds, serves the build inside the runner, and runs the `@smoke` tagged tests against it. Nothing is published to GitHub Pages unless that smoke test passes, so a broken build cannot reach users and there is no rollback step. After publishing it runs the same smoke tests against the live site, which reports a problem but does not undo anything. DO NOT run `gh workflow run deploy.yml` manually via CLI after pushing, as this will cause GitHub to cancel both jobs due to concurrency limits.
9. **Smoke tests:** Mark a test with `{ tag: '@smoke' }` to include it in the deployment gate. Keep the tagged set small and fast; it runs twice on every push to `main`.
10. **User Journey:** Always update the `USER_JOURNEY.md` document every time a new feature is completed to reflect all current capabilities of the app.
