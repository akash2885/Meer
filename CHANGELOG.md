# Changelog

All notable changes to Meer are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [1.2.0] - 2026-04-19

### Added

- **Quick Stats Summary Bar** — persistent bar between the header and tab nav showing open · need review · failing CI · stale counts at a glance; amber coloring when need-review or stale count > 0, red when failing CI count > 0; stale threshold is 7 days (`STALE_THRESHOLD_DAYS` constant)
- **Per-Repo Filtering** — dropdown above tab content lets users scope all three views (Actions, All PRs, Comments) to a single repository; repos listed alphabetically with PR counts; selection persisted to `chrome.storage.local`; filter auto-clears if the selected repo disappears from data on next fetch
- **Three-Action Review Panel** — replaces the single Approve button with Approve / Comment / Request Changes buttons on every reviewable PR card; Comment and Request Changes expand an inline textarea; only one card's panel can be open at a time; backed by new `GitHubClient.submitReview()` REST method

### Changed

- `GitHubClient.approvePR()` now delegates to `submitReview()`, eliminating duplicated fetch logic
- Tab badge counts (Actions, All PRs, Comments) reflect the active repo filter when one is selected

### Fixed

- Removed unused `transformComments` function (dead code since `mergeAllComments` handles all comment sources)
- Prefixed unused `currentUser` parameter in `detectChanges` and unused `reviews` parameter in `computeHealth` to satisfy the `no-unused-vars` lint rule

---

## [1.1.0] - 2026-04-14

### Added

- **Action Items tab** — filters to only PRs that need the current user's attention, sorted critical-first, with a severity summary bar showing critical/warning pill counts
- **CI breakdown panel** — expandable per-check-run list on every PR card with colour-coded status icons (green passing, red failing, amber spinning), timestamps, and re-run buttons for failed checks
- **Copy PR URL button** — one-click clipboard copy with a 1.5 s "Copied" confirmation on each PR card
- **Quick Approve button** — approve a review-requested PR directly from the popup without opening GitHub
- **Priority keyword system** — comment bodies are scored by configurable high/medium/low keyword tiers; scores drive the Comments tab sort order
- **Desktop notifications** — alerts for CI check completions, new review comments, PR approvals, review requests, and merge conflicts
- **Inline SVG icon library** (`Icons.tsx`) — 20+ zero-dependency Material Design icon components replacing all emoji indicators throughout the UI
- **README** — full setup guide, usage walkthrough, settings reference, dev commands, and contribution instructions
- **CI pipeline** (GitHub Actions) — type-check, ESLint, Prettier format check, Vitest test suite, Vite build, `crate-ci/typos` spell check, `npm audit`, and conventional-commit PR title validation
- **Dependabot** — automated dependency update PRs targeting the `dev` branch

### Changed

- Tab bar icons added to each tab label (Actions, All PRs, Comments)
- Empty states and welcome screen use icon components instead of emoji
- Card, badge, and button styles use consistent `rounded-md` corners for a cleaner look
- Approve button uses `DoneAllIcon`; CI toggle uses `ExpandMoreIcon`/`ExpandLessIcon`
- Comments tab "all resolved" empty state shows a green `CheckCircleFilledIcon`

### Fixed

- GraphQL error handler now checks **all** deduplicated error messages for scope errors (using `.some()`) instead of only `unique[0]` — previously the second GitHub phrasing ("not been granted the required scopes") leaked as a raw `GitHubGraphQLError`
- Cached `currentUser` is now cleared in the service worker whenever the stored token changes, preventing stale auth state across token rotations
- Removed `Team.name` from the `reviewRequests` GraphQL fragment — it required the `read:org` scope that Classic `repo`-only tokens don't have
- GraphQL errors are deduplicated before display (GitHub returns one error object per failing field, all with the same message)
- Added `http://localhost/*` to `host_permissions` — CRXJS beta.25 does not auto-inject this, so the service worker was blocked from fetching dev-server scripts
- Corrected `Authorization` header casing (`Bearer` not `bearer`)

---

## [1.0.0] - 2026-04-13

### Added

- Initial release of Meer Chrome extension (Manifest V3)
- Three-tab popup UI: **Action Items**, **All PRs**, **Comments**
- GitHub GraphQL API v4 integration — single-query fetch of authored + review-requested PRs including reviews, review threads, comments, CI check runs, and merge status
- Zustand store persisted to `chrome.storage.local`, kept in sync with `useChromeStorage` hook
- Background service worker with `chrome.alarms`-based polling loop
- Health status computation per PR (`good` / `warning` / `critical`)
- Action-required detection (`myActionRequired` + `actionReason`) covering failing CI, review requests, changes requested, and merge conflicts
- Settings page: GitHub Classic PAT with inline token validation, GitHub Enterprise base URL, polling interval (1 min – 1 hr), per-event notification toggles
- GitHub Enterprise Server support via configurable base URL
- Comment priority scoring from keyword matching and recency
- Unified comment feed across all PRs with resolved-thread toggle
