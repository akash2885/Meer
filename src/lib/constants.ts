import type { Settings } from "./types";

export const DEFAULT_PRIORITY_KEYWORDS = {
  high: [
    "fix",
    "bug",
    "error",
    "breaking",
    "revert",
    "security",
    "blocker",
    "critical",
    "urgent",
    "vulnerability",
    "crash",
  ],
  medium: ["should", "consider", "refactor", "todo", "important", "concern", "wrong", "incorrect", "missing"],
  low: ["nit", "optional", "suggestion", "minor", "nitpick", "lgtm", "looks good", "nice", "great"],
};

export const DEFAULT_SETTINGS: Settings = {
  token: "",
  baseUrl: "https://api.github.com",
  repos: [],
  pollingInterval: 60,
  notifications: {
    ciCompletion: true,
    newComments: true,
    approvals: true,
    reviewRequests: true,
    mergeConflicts: true,
  },
  priorityKeywords: DEFAULT_PRIORITY_KEYWORDS,
};

export const POLLING_INTERVAL_OPTIONS = [
  { label: "30 seconds", value: 30 },
  { label: "1 minute", value: 60 },
  { label: "2 minutes", value: 120 },
  { label: "5 minutes", value: 300 },
];

export const PRIORITY_SCORE_THRESHOLDS = {
  high: 50,
  medium: 20,
};

// Score weights for the priority algorithm
export const SCORE_WEIGHTS = {
  review: {
    changes_requested: 30,
    commented: 10,
    approved: 5,
  },
  thread: {
    unresolved: 20,
    resolved: 0,
  },
  author: {
    codeowner: 15,
    contributor: 5,
  },
  keywords: {
    high: 20,
    medium: 10,
    low: -10,
  },
  recency: {
    under1h: 10,
    under4h: 7,
    under12h: 4,
    under24h: 2,
    older: 0,
  },
  mention: 15,
};

export const ALARM_NAME = "prdash-poll";

export const STORAGE_KEYS = {
  settings: "prdash_settings",
  pullRequests: "prdash_pull_requests",
  lastFetched: "prdash_last_fetched",
  currentUser: "prdash_current_user",
  seenNotifications: "prdash_seen_notifications",
  selectedRepo: "prdash_selected_repo",
} as const;

export const MAX_PRS_PER_QUERY = 30;
