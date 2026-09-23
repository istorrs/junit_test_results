# Repository Guidelines

## Project Structure & Module Organization

The Vue 3/TypeScript frontend lives in `client/`. Put pages in `client/src/views`, reusable UI in `client/src/components`, API calls in `client/src/api`, Pinia state in `client/src/stores`, and helpers in `client/src/utils`. Tests sit beside their subject or in `__tests__/`. The Express/Mongoose API is under `backend/src`, organized into `routes`, `models`, `services`, `middleware`, and `config`; maintenance utilities belong in `backend/scripts`. Built frontend assets go to `public/`. Deployment material lives in `ci-cd-examples/`, `jenkins/`, and `docs/`.

## Build, Test, and Development Commands

- `docker compose up -d --build`: run MongoDB, the API, and nginx together.
- `cd backend && npm install && npm run dev`: run the API with nodemon on port 5000.
- `cd client && npm install && npm run dev`: start Vite on port 5173; `/api` requests proxy to the backend.
- `cd client && npm run build`: type-check and create the production bundle in `public/`.
- `cd client && npm test`: run Vitest; use `npm run test:coverage` for coverage.
- `cd client && npm run type-check && npm run lint`: validate Vue/TypeScript and lint frontend code.
- `cd backend && npm run lint`: lint CommonJS backend code. The backend test script is currently a placeholder.

## Coding Style & Naming Conventions

Prettier and ESLint are authoritative. Frontend code uses two spaces, single quotes, no semicolons, and trailing ES5 commas. Backend JavaScript uses four spaces, single quotes, semicolons, and no trailing commas. Name Vue components in PascalCase (`TestDetailsModal.vue`), composables with a `use` prefix, and variables/functions in camelCase. Run `cd client && npm run format`; Husky and lint-staged check staged files.

## Testing Guidelines

Use Vitest, happy-dom, and Vue Test Utils. Name tests `Thing.test.ts` and place component suites near the component or under `__tests__`. Cover success, empty, loading, and error states for UI or API changes. No numeric threshold is configured; avoid reducing coverage in touched modules.

## Commit & Pull Request Guidelines

Follow the existing concise, imperative style: `Fix stale API integration docs` or `Add Progressive Web App support`. Keep commits focused and include generated lockfile changes when dependencies change. Pull requests should explain the problem and solution, list verification commands, link relevant issues, and include screenshots for visible UI changes. Call out configuration, schema, or migration impacts explicitly; never commit secrets from `.env`.
