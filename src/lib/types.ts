// ─── Core Data Types ─────────────────────────────────────────────────────────

export interface User {
  login: string;
  avatarUrl: string;
}

export interface Review {
  author: string;
  state: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED" | "PENDING" | "DISMISSED";
  body: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  body: string;
  author: string;
  createdAt: string;
  url: string;
  prTitle: string;
  prUrl: string;
  repo: string;
  priorityScore: number;
  priorityLevel: "high" | "medium" | "low";
  isResolved: boolean;
  reviewState?: string;
  isFromCodeowner: boolean;
  mentionsCurrentUser: boolean;
}

export interface ReviewThread {
  isResolved: boolean;
  comments: Comment[];
}

export interface CheckRun {
  name: string;
  status: "QUEUED" | "IN_PROGRESS" | "COMPLETED";
  conclusion: "SUCCESS" | "FAILURE" | "NEUTRAL" | "CANCELLED" | "TIMED_OUT" | "SKIPPED" | null;
  detailsUrl: string;
  completedAt: string | null;
  checkSuiteId: string;
  checkSuiteDatabaseId: number;
}

export interface PullRequest {
  id: string;
  number: number;
  title: string;
  url: string;
  repo: string; // "org/repo"
  repoUrl: string;
  author: User;
  isDraft: boolean;
  mergeable: "MERGEABLE" | "CONFLICTING" | "UNKNOWN";
  createdAt: string;
  updatedAt: string;
  headBranch: string;
  baseBranch: string;
  healthStatus: "good" | "warning" | "critical";
  myActionRequired: boolean;
  actionReason?: string;
  relationship: "authored" | "review_requested" | "both";
  reviews: Review[];
  comments: Comment[];
  reviewThreads: ReviewThread[];
  checkRuns: CheckRun[];
  approvalCount: number;
  requestedReviewerCount: number;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface NotificationPreferences {
  ciCompletion: boolean;
  newComments: boolean;
  approvals: boolean;
  reviewRequests: boolean;
  mergeConflicts: boolean;
}

export interface PriorityKeywords {
  high: string[];
  medium: string[];
  low: string[];
}

export interface Settings {
  token: string;
  baseUrl: string; // default: "https://api.github.com"
  repos: string[]; // empty = all repos
  pollingInterval: number; // seconds, default: 60
  notifications: NotificationPreferences;
  priorityKeywords: PriorityKeywords;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export interface PRDashStore {
  // Settings
  settings: Settings;
  // Data
  pullRequests: PullRequest[];
  lastFetched: number | null;
  isLoading: boolean;
  error: string | null;
  currentUser: string | null;
  // Actions
  fetchPRs: () => Promise<void>;
  updateSettings: (settings: Partial<Settings>) => void;
  clearData: () => void;
  setCurrentUser: (login: string) => void;
}

// ─── GitHub API Raw Types ────────────────────────────────────────────────────

export interface RawUser {
  login: string;
  avatarUrl: string;
}

export interface RawReview {
  author: { login: string };
  state: string;
  body: string;
  createdAt: string;
  comments?: {
    nodes: Array<{
      body: string;
      createdAt: string;
      url: string;
      author: { login: string };
    }>;
  };
}

export interface RawReviewThread {
  isResolved: boolean;
  comments: {
    nodes: Array<{
      body: string;
      createdAt: string;
      url: string;
      author: { login: string };
    }>;
  };
}

export interface RawCheckRun {
  name: string;
  status: string;
  conclusion: string | null;
  detailsUrl: string;
  completedAt: string | null;
  checkSuite: {
    id: string;
    databaseId: number;
  };
}

export interface RawStatusContext {
  context: string;
  state: string;
  targetUrl: string;
}

export interface RawPullRequest {
  id: string;
  number: number;
  title: string;
  url: string;
  state: string;
  isDraft: boolean;
  mergeable: string;
  createdAt: string;
  updatedAt: string;
  headRefName?: string;
  baseRefName?: string;
  repository: {
    nameWithOwner: string;
    url: string;
  };
  author: {
    login: string;
    avatarUrl: string;
  };
  reviewRequests?: {
    nodes: Array<{
      requestedReviewer: { login?: string; name?: string };
    }>;
  };
  reviews?: {
    nodes: RawReview[];
  };
  reviewThreads?: {
    nodes: RawReviewThread[];
  };
  comments?: {
    nodes: Array<{
      body: string;
      createdAt: string;
      url: string;
      author: { login: string };
    }>;
  };
  commits?: {
    nodes: Array<{
      commit: {
        statusCheckRollup?: {
          state: string;
          contexts: {
            nodes: Array<RawCheckRun | RawStatusContext>;
          };
        };
      };
    }>;
  };
}

export interface GraphQLResponse {
  data?: {
    authored?: { nodes: RawPullRequest[] };
    reviewRequested?: { nodes: RawPullRequest[] };
    viewer?: { login: string };
  };
  errors?: Array<{ message: string }>;
}

// ─── Notification Event ───────────────────────────────────────────────────────

export type NotificationEventType =
  | "ci_failure"
  | "ci_success"
  | "new_comment"
  | "approved"
  | "review_requested"
  | "merge_conflict";

export interface NotificationEvent {
  type: NotificationEventType;
  prId: string;
  prTitle: string;
  prUrl: string;
  detail?: string;
}
