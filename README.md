# PRDash

A developer-focused Chrome extension that gives you a clean pull request dashboard without opening GitHub. See exactly what needs your attention, track CI status, and manage review requests — all from the browser toolbar.

## Features

- **Action Items** — surfaces only the PRs that need something from you right now, sorted by severity
- **All PRs** — full list of PRs you authored or are asked to review
- **Comments** — unified feed of review comments across all PRs, ranked by priority
- **CI status** — per-check-run breakdown with colour-coded icons; re-run failed checks directly from the popup
- **Copy URL** — one-click copy of any PR URL to the clipboard
- **Quick Approve** — approve a PR without leaving the popup
- **Notifications** — desktop alerts for CI completions, new comments, approvals, review requests, and merge conflicts
- **Priority keywords** — customise which words in comments boost or lower their priority score
- **GitHub Enterprise** — works with any GitHub Enterprise Server instance

## Installation

The extension is loaded as an unpacked extension during development. There is no Chrome Web Store listing yet.

**Prerequisites:** Node.js 18+ and npm.

### 1. Clone and build

```bash
git clone https://github.com/akash2885/prdash.git
cd prdash
npm install
npm run build
```

This produces a `dist/` folder containing the built extension.

### 2. Load into Chrome

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `dist/` folder inside the cloned repo

The PRDash icon will appear in your Chrome toolbar. Pin it for easy access.

### Running in development mode

```bash
npm run dev
```

Vite starts a local dev server. Load the `dist/` folder as an unpacked extension the same way — CRXJS handles hot module replacement automatically.

## Setup

After installing, click the PRDash icon and then **Open Settings** (or right-click the icon → **Options**).

### GitHub Token

PRDash needs a **Classic Personal Access Token** (PATs, not fine-grained tokens).

1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. Click **Generate new token (classic)**
3. Give it a name (e.g. `prdash`) and select the following scopes:
   - `repo` — read PR data, CI checks, review status
   - `read:user` — look up your own username
4. Copy the token and paste it into the **Personal Access Token** field in PRDash Settings
5. Click **Validate** to confirm it works, then **Save Settings**

> The token is stored locally in Chrome storage and is never sent anywhere except GitHub's API.

### GitHub Enterprise

If your organisation uses GitHub Enterprise Server, change the **GitHub Base URL** field from `https://api.github.com` to your instance's URL (e.g. `https://github.acme.corp`). PRDash will automatically route API calls to `<base-url>/api/graphql` and `<base-url>/api/v3/...`.

## Using the Extension

Click the PRDash icon in your toolbar to open the popup. Three tabs are available:

### Actions tab

Shows only PRs that need something from you — failing CI on your PR, a review you've been asked for, changes requested, or a merge conflict. Items are sorted with the most critical first.

A summary bar at the top shows how many items are critical vs. warning at a glance.

### All PRs tab

Lists every open PR where you are the author or a requested reviewer. Each card shows:

- Repository and PR title
- Author avatar, last-updated time
- Approval count vs. requested reviewers
- Comment count
- Merge conflict indicator
- CI status icon (green passing, red failing, amber running)

Click **Show CI** on a card to expand the per-check breakdown. Failed checks have a re-run button. The **Copy URL** button copies the PR link to your clipboard. The **Approve** button lets you approve without opening the PR (only shown when you're a requested reviewer).

### Comments tab

A unified feed of review comments and thread replies across all your PRs, ranked by a priority score. High-priority keywords in the comment body (configurable in Settings) push items to the top.

Resolved threads are hidden by default — toggle **Show resolved** to see them.

## Settings Reference

| Setting | Description |
|---|---|
| Personal Access Token | Classic PAT with `repo` + `read:user` scopes |
| GitHub Base URL | Change this for GitHub Enterprise Server |
| Refresh Interval | How often PRDash polls the GitHub API (1 min – 1 hr) |
| CI check completed | Desktop notification when a check finishes |
| New review comments | Notification when someone comments on your PR |
| PR approved | Notification when your PR receives an approval |
| Review requested | Notification when someone requests your review |
| Merge conflict detected | Notification when a PR becomes un-mergeable |
| Priority Keywords | Words that increase (High, Medium) or decrease (Low) comment priority scores |

## Development

```bash
# Type-check
npx tsc --noEmit

# Run tests
npm test

# Watch mode
npm run test:watch

# Lint
npm run lint

# Check formatting
npm run format:check
```

### Tech stack

| Layer | Library |
|---|---|
| UI | React 18 + TypeScript |
| Styling | Tailwind CSS |
| State | Zustand (persisted to Chrome storage) |
| Build | Vite + CRXJS |
| Tests | Vitest + Testing Library |
| API | GitHub GraphQL + REST |

### Project structure

```
src/
  background/       Chrome service worker (polling, notifications)
  lib/              GitHub client, types, utilities, priority scoring
  options/          Settings page
  popup/
    components/     UI components (PRCard, CIStatus, ActionItems, …)
    hooks/          useChromeStorage, useStore
  styles/           Global CSS
tests/              Vitest unit + component tests
```

## CI Checks

Every pull request into `dev` runs:

- **Type-check, Lint, Format & Test** — `tsc`, ESLint, Prettier, and Vitest
- **Build extension** — `vite build` to verify the extension bundles cleanly
- **Check for typos** — `crate-ci/typos`
- **Dependency audit** — `npm audit` at high severity (prod deps only)
- **Validate conventional commit title** — enforces `type: Subject` format (e.g. `feat: Add X`)

## Contributing

1. Branch off `dev`
2. Follow [Conventional Commits](https://www.conventionalcommits.org/) for PR titles (`feat:`, `fix:`, `chore:`, etc.) with an uppercase first word in the subject
3. Run `npm test` and `npm run lint` before pushing
4. Open a PR targeting `dev`
