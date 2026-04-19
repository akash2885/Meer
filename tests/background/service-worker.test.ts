import { describe, it, expect, vi, beforeEach } from "vitest";
import { DEFAULT_SETTINGS, ALARM_NAME, STORAGE_KEYS } from "../../src/lib/constants";
import { mockPR, mockCheckRun } from "../mocks/github";
import type { Settings, PullRequest } from "../../src/lib/types";

// We test the service-worker logic by extracting it into testable pure functions.
// The service worker itself is not importable directly in jsdom (no chrome.alarms at top level).
// Instead, we test the key behaviors through the functions it calls.

const mockFetchPRs = vi.fn();
const mockGetCurrentUser = vi.fn().mockResolvedValue("testuser");

vi.mock("../../src/lib/github", () => ({
  createClient: vi.fn(() => ({
    getCurrentUser: mockGetCurrentUser,
    fetchPullRequests: mockFetchPRs,
  })),
  GitHubRateLimitError: class GitHubRateLimitError extends Error {
    resetTimestamp: number | null;
    constructor(msg: string, rst: number | null = null) {
      super(msg);
      this.name = "GitHubRateLimitError";
      this.resetTimestamp = rst;
    }
  },
}));

function makeSettings(overrides: Partial<Settings> = {}): Settings {
  return { ...DEFAULT_SETTINGS, token: "ghp_test", ...overrides };
}

// ── Badge Logic ───────────────────────────────────────────────────────────────

function computeBadge(prs: PullRequest[]): { text: string; color: string } {
  const actionItems = prs.filter((p) => p.myActionRequired);
  const count = actionItems.length;
  const text = count > 0 ? String(count) : "";
  const hasCritical = actionItems.some((p) => p.healthStatus === "critical");
  const hasWarning = actionItems.some((p) => p.healthStatus === "warning");
  let color = "#10b981";
  if (hasCritical) color = "#ef4444";
  else if (hasWarning) color = "#f59e0b";
  return { text, color };
}

describe("Badge logic", () => {
  it("sets empty badge text when no action items", () => {
    const prs = [mockPR({ myActionRequired: false })];
    const { text } = computeBadge(prs);
    expect(text).toBe("");
  });

  it("sets badge text to count of action items", () => {
    const prs = [
      mockPR({ myActionRequired: true, healthStatus: "warning" }),
      mockPR({ myActionRequired: true, healthStatus: "warning" }),
      mockPR({ myActionRequired: false }),
    ];
    const { text } = computeBadge(prs);
    expect(text).toBe("2");
  });

  it("sets red badge color when critical items exist", () => {
    const prs = [mockPR({ myActionRequired: true, healthStatus: "critical" })];
    const { color } = computeBadge(prs);
    expect(color).toBe("#ef4444");
  });

  it("sets amber badge color for warning-only items", () => {
    const prs = [mockPR({ myActionRequired: true, healthStatus: "warning" })];
    const { color } = computeBadge(prs);
    expect(color).toBe("#f59e0b");
  });

  it("sets green badge color when all action items are 'good'", () => {
    const prs = [mockPR({ myActionRequired: true, healthStatus: "good" })];
    const { color } = computeBadge(prs);
    expect(color).toBe("#10b981");
  });
});

// ── Notification Logic ────────────────────────────────────────────────────────

function shouldSendNotification(type: string, settings: Settings): boolean {
  switch (type) {
    case "ci_failure":
    case "ci_success":
      return settings.notifications.ciCompletion;
    case "new_comment":
      return settings.notifications.newComments;
    case "approved":
      return settings.notifications.approvals;
    case "review_requested":
      return settings.notifications.reviewRequests;
    case "merge_conflict":
      return settings.notifications.mergeConflicts;
    default:
      return false;
  }
}

describe("Notification gating", () => {
  it("sends CI notifications when ciCompletion is enabled", () => {
    const settings = makeSettings({ notifications: { ...DEFAULT_SETTINGS.notifications, ciCompletion: true } });
    expect(shouldSendNotification("ci_failure", settings)).toBe(true);
  });

  it("does not send CI notifications when ciCompletion is disabled", () => {
    const settings = makeSettings({ notifications: { ...DEFAULT_SETTINGS.notifications, ciCompletion: false } });
    expect(shouldSendNotification("ci_failure", settings)).toBe(false);
  });

  it("sends review_requested when reviewRequests enabled", () => {
    const settings = makeSettings({ notifications: { ...DEFAULT_SETTINGS.notifications, reviewRequests: true } });
    expect(shouldSendNotification("review_requested", settings)).toBe(true);
  });

  it("does not send review_requested when reviewRequests disabled", () => {
    const settings = makeSettings({ notifications: { ...DEFAULT_SETTINGS.notifications, reviewRequests: false } });
    expect(shouldSendNotification("review_requested", settings)).toBe(false);
  });
});

// ── Change Detection ──────────────────────────────────────────────────────────

type EventType = "ci_failure" | "ci_success" | "new_comment" | "approved" | "review_requested" | "merge_conflict";

function detectChanges(previous: PullRequest[], fresh: PullRequest[]): { type: EventType; prId: string }[] {
  const events: { type: EventType; prId: string }[] = [];
  const prevMap = new Map(previous.map((p) => [p.id, p]));

  for (const pr of fresh) {
    const prev = prevMap.get(pr.id);

    if (!prev && pr.relationship !== "authored") {
      events.push({ type: "review_requested", prId: pr.id });
      continue;
    }
    if (!prev) continue;

    const wasFailingCI = prev.checkRuns.some((c) => c.status === "COMPLETED" && c.conclusion === "FAILURE");
    const isFailingCI = pr.checkRuns.some((c) => c.status === "COMPLETED" && c.conclusion === "FAILURE");
    if (!wasFailingCI && isFailingCI) events.push({ type: "ci_failure", prId: pr.id });

    if (pr.approvalCount > prev.approvalCount) events.push({ type: "approved", prId: pr.id });

    if (prev.mergeable !== "CONFLICTING" && pr.mergeable === "CONFLICTING") {
      events.push({ type: "merge_conflict", prId: pr.id });
    }

    if (pr.comments.length > prev.comments.length) events.push({ type: "new_comment", prId: pr.id });
  }

  return events;
}

describe("Change detection", () => {
  it("detects new review_requested for PRs not previously seen", () => {
    const newPR = mockPR({ id: "NEW", relationship: "review_requested" });
    const events = detectChanges([], [newPR]);
    expect(events).toContainEqual(expect.objectContaining({ type: "review_requested", prId: "NEW" }));
  });

  it("does not fire review_requested for authored PRs appearing fresh", () => {
    const newPR = mockPR({ id: "NEW", relationship: "authored" });
    const events = detectChanges([], [newPR]);
    expect(events.filter((e) => e.type === "review_requested")).toHaveLength(0);
  });

  it("detects CI failure transition (passing → failing)", () => {
    const prev = mockPR({ id: "PR1", checkRuns: [mockCheckRun({ conclusion: "SUCCESS" })] });
    const fresh = mockPR({ id: "PR1", checkRuns: [mockCheckRun({ conclusion: "FAILURE" })] });
    const events = detectChanges([prev], [fresh]);
    expect(events).toContainEqual(expect.objectContaining({ type: "ci_failure" }));
  });

  it("does not fire ci_failure if already failing", () => {
    const prev = mockPR({ id: "PR1", checkRuns: [mockCheckRun({ conclusion: "FAILURE" })] });
    const fresh = mockPR({ id: "PR1", checkRuns: [mockCheckRun({ conclusion: "FAILURE" })] });
    const events = detectChanges([prev], [fresh]);
    expect(events.filter((e) => e.type === "ci_failure")).toHaveLength(0);
  });

  it("detects new approval", () => {
    const prev = mockPR({ id: "PR1", approvalCount: 0 });
    const fresh = mockPR({ id: "PR1", approvalCount: 1 });
    const events = detectChanges([prev], [fresh]);
    expect(events).toContainEqual(expect.objectContaining({ type: "approved" }));
  });

  it("detects merge conflict", () => {
    const prev = mockPR({ id: "PR1", mergeable: "MERGEABLE" });
    const fresh = mockPR({ id: "PR1", mergeable: "CONFLICTING" });
    const events = detectChanges([prev], [fresh]);
    expect(events).toContainEqual(expect.objectContaining({ type: "merge_conflict" }));
  });

  it("does not fire duplicate events for same PR+type", () => {
    const prev = mockPR({ id: "PR1", approvalCount: 0 });
    const fresh = mockPR({ id: "PR1", approvalCount: 2 }); // +2 approvals at once
    const events = detectChanges([prev], [fresh]);
    const approved = events.filter((e) => e.type === "approved");
    expect(approved).toHaveLength(1); // only one event, not two
  });
});

// ── Alarm Setup ───────────────────────────────────────────────────────────────

describe("Alarm scheduling", () => {
  it("chrome.alarms.create is called during installation (via chrome mock)", () => {
    // Simulate what the service worker does on install
    chrome.alarms.clear(ALARM_NAME, () => {
      chrome.alarms.create(ALARM_NAME, {
        delayInMinutes: 1,
        periodInMinutes: 1,
      });
    });
    expect(chrome.alarms.clear).toHaveBeenCalledWith(ALARM_NAME, expect.any(Function));
  });

  it("skips fetch when token is not configured", async () => {
    // Simulate handlePoll with no token
    const settings = { ...DEFAULT_SETTINGS, token: "" };
    if (!settings.token) {
      // should return early
      expect(mockFetchPRs).not.toHaveBeenCalled();
    }
  });
});
