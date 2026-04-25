# Contributing to Meer

Thanks for your interest in improving Meer. This guide covers everything you need to get from a fresh clone to an open PR.

## Prerequisites

- Node.js 20+ (see `.nvmrc` — run `nvm use` if you use nvm)
- npm 10+
- A Chromium-based browser for manual testing

## Local setup

```bash
git clone https://github.com/akash2885/Meer.git
cd Meer
npm install
npm run build
```

Load the `dist/` folder as an unpacked extension in Chrome (`chrome://extensions` → Developer mode → Load unpacked). See [README.md](README.md) for the full setup walkthrough.

## Development workflow

```bash
# Start Vite dev server (hot-reload via CRXJS)
npm run dev

# Type-check
npx tsc --noEmit

# Run all tests (185 tests, ~1 s)
npm test

# Watch mode while editing
npm run test:watch

# Lint
npm run lint

# Check formatting
npm run format:check
```

All four commands must pass before pushing. CI enforces the same checks.

## Branch and commit conventions

- Branch off `dev`, not `main`
- Use [Conventional Commits](https://www.conventionalcommits.org/) for your PR title:
  `<type>: <Subject>` — subject starts with an uppercase letter
  - `feat:` — new user-visible capability
  - `fix:` — bug fix
  - `chore:` — tooling, deps, release prep
  - `ci:` — CI/CD changes
  - `docs:` — documentation only
  - `refactor:` — no behaviour change
  - `test:` — tests only
- Keep commits atomic and scoped. A PR that adds a feature should also add tests for it.

## Project layout

```
src/
  background/     Service worker — polling loop, notifications
  lib/            GitHub client (REST + GraphQL), types, priority scoring, utilities
  options/        Settings page (PAT, base URL, notification prefs)
  popup/
    components/   UI components — PRCard, CIStatus, PRComments, ActionItems, …
    hooks/        useChromeStorage, useStore
  store/          Zustand store + Chrome storage persistence
  styles/         Global Tailwind CSS
tests/            Vitest unit + component tests (mirrors src/ structure)
```

## Writing tests

Tests live in `tests/` and mirror `src/`. Each component and lib module has a corresponding `*.test.{ts,tsx}` file.

- Use [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) for component tests
- Mock Chrome APIs via the helpers in `tests/mocks/`
- Coverage thresholds: 60% lines/functions/statements, 55% branches — CI enforces these on `npm test -- --coverage`

## Pre-commit hooks (optional)

The repo ships `.husky/pre-commit` scaffolding that runs lint-staged (ESLint + Prettier) on staged files. To activate it locally:

```bash
npm install husky lint-staged --save-dev
npm run prepare
```

Then add the `prepare` script and both packages back to `package.json`, run `npm install`, and commit the updated `package-lock.json`.

## Pull request checklist

- [ ] Branches off `dev`
- [ ] PR title follows Conventional Commits (`feat:`, `fix:`, etc.)
- [ ] `npm test` passes (all 185+ tests green)
- [ ] `npx tsc --noEmit` passes (no type errors)
- [ ] `npm run lint` passes (zero ESLint warnings)
- [ ] `npm run format:check` passes (Prettier clean)
- [ ] New functionality is covered by tests
- [ ] `CHANGELOG.md` updated under `[Unreleased]` if user-visible

## CI checks

Every PR into `dev` runs the following GitHub Actions jobs:

| Job | What it checks |
|---|---|
| Type-check, Lint, Format & Test | `tsc`, ESLint, Prettier, Vitest |
| Build extension | `vite build` — verifies the extension bundles |
| Dependency audit | `npm audit` at moderate+ severity (prod deps only) |

All jobs must be green before merging.
