/**
 * PRDash Background Service Worker (Manifest V3)
 *
 * Responsibilities:
 * - Schedule periodic polling via chrome.alarms (NOT setInterval)
 * - Fetch PR data and store in chrome.storage.local
 * - Send desktop notifications for new events
 * - Update the extension badge with action item count
 *
 * IMPORTANT: MV3 service workers are ephemeral — never store state in variables.
 * Always read from / write to chrome.storage.local.
 */

import { createClient, GitHubRateLimitError } from "../lib/github";
import { ALARM_NAME, DEFAULT_SETTINGS, STORAGE_KEYS } from "../lib/constants";
import type { Settings, PullRequest, NotificationEvent } from "../lib/types";

// ─── Lifecycle ────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  scheduleAlarm(DEFAULT_SETTINGS.pollingInterval);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    handlePoll().catch(console.error);
  }
});

// Re-schedule alarm and clear cached user when settings change
chrome.storage.local.onChanged.addListener((changes) => {
  if (changes[STORAGE_KEYS.settings]) {
    const prev = changes[STORAGE_KEYS.settings].oldValue as Settings | undefined;
    const next = changes[STORAGE_KEYS.settings].newValue as Settings | undefined;
    if (next?.pollingInterval) {
      scheduleAlarm(next.pollingInterval);
    }
    // If the token changed, clear the cached current user so it gets re-fetched
    // with the new token on the next poll instead of using a potentially stale identity
    if (prev?.token !== next?.token) {
      chrome.storage.local.remove(STORAGE_KEYS.currentUser);
    }
  }
});

// ─── Alarm Scheduling ─────────────────────────────────────────────────────────

function scheduleAlarm(intervalSeconds: number): void {
  chrome.alarms.clear(ALARM_NAME, () => {
    chrome.alarms.create(ALARM_NAME, {
      delayInMinutes: intervalSeconds / 60,
      periodInMinutes: intervalSeconds / 60,
    });
  });
}

// ─── Main Poll Handler ────────────────────────────────────────────────────────

async function handlePoll(): Promise<void> {
  const settings = await getSettings();

  if (!settings.token) {
    // No token set — skip silently
    return;
  }

  try {
    const client = createClient(settings);

    // Resolve current user (cached in storage)
    let currentUser = await storageGet<string | null>(STORAGE_KEYS.currentUser, null);
    if (!currentUser) {
      currentUser = await client.getCurrentUser();
      await storageSet(STORAGE_KEYS.currentUser, currentUser);
    }

    const previousPRs = await storageGet<PullRequest[]>(STORAGE_KEYS.pullRequests, []);

    const freshPRs = await client.fetchPullRequests(currentUser, settings.priorityKeywords);

    // Detect changes and queue notifications
    const events = detectChanges(previousPRs, freshPRs, currentUser);

    await Promise.all([
      storageSet(STORAGE_KEYS.pullRequests, freshPRs),
      storageSet(STORAGE_KEYS.lastFetched, Date.now()),
    ]);

    updateBadge(freshPRs);

    if (events.length > 0) {
      await fireNotifications(events, settings);
    }
  } catch (err) {
    if (err instanceof GitHubRateLimitError) {
      // Back off — reschedule alarm to fire after rate limit resets
      const resetMs = err.resetTimestamp ? err.resetTimestamp * 1000 - Date.now() : 5 * 60 * 1000;
      const backoffMinutes = Math.max(1, Math.ceil(resetMs / 60000));
      chrome.alarms.create(ALARM_NAME, {
        delayInMinutes: backoffMinutes,
        periodInMinutes: (await getSettings()).pollingInterval / 60,
      });
      await storageSet("prdash_rate_limit_warning", err.message);
    } else {
      console.error("[PRDash SW] Poll error:", err);
    }
  }
}

// ─── Change Detection ─────────────────────────────────────────────────────────

function detectChanges(previous: PullRequest[], fresh: PullRequest[], currentUser: string): NotificationEvent[] {
  const events: NotificationEvent[] = [];
  const prevMap = new Map(previous.map((p) => [p.id, p]));

  for (const pr of fresh) {
    const prev = prevMap.get(pr.id);

    // New PR (review requested)
    if (!prev && pr.relationship !== "authored") {
      events.push({
        type: "review_requested",
        prId: pr.id,
        prTitle: pr.title,
        prUrl: pr.url,
        detail: `Review requested on ${pr.repo}`,
      });
      continue;
    }

    if (!prev) continue;

    // CI failure (new failure)
    const wasFailingCI = prev.checkRuns.some((c) => c.status === "COMPLETED" && c.conclusion === "FAILURE");
    const isFailingCI = pr.checkRuns.some((c) => c.status === "COMPLETED" && c.conclusion === "FAILURE");
    if (!wasFailingCI && isFailingCI && pr.relationship !== "review_requested") {
      const failedRun = pr.checkRuns.find((c) => c.conclusion === "FAILURE");
      events.push({
        type: "ci_failure",
        prId: pr.id,
        prTitle: pr.title,
        prUrl: pr.url,
        detail: failedRun?.name ?? "CI check failed",
      });
    }

    // CI success (just became all-passing)
    const wasAllPassing =
      prev.checkRuns.length > 0 &&
      prev.checkRuns.every(
        (c) =>
          c.status !== "COMPLETED" ||
          c.conclusion === "SUCCESS" ||
          c.conclusion === "NEUTRAL" ||
          c.conclusion === "SKIPPED"
      );
    const isAllPassing =
      pr.checkRuns.length > 0 &&
      pr.checkRuns.every(
        (c) =>
          c.status !== "COMPLETED" ||
          c.conclusion === "SUCCESS" ||
          c.conclusion === "NEUTRAL" ||
          c.conclusion === "SKIPPED"
      );
    const hadRunning = prev.checkRuns.some((c) => c.status !== "COMPLETED");
    if (!wasAllPassing && isAllPassing && hadRunning && pr.relationship !== "review_requested") {
      events.push({
        type: "ci_success",
        prId: pr.id,
        prTitle: pr.title,
        prUrl: pr.url,
        detail: "All checks passed",
      });
    }

    // New approval
    const prevApprovals = prev.approvalCount;
    if (pr.approvalCount > prevApprovals && pr.relationship !== "review_requested") {
      events.push({
        type: "approved",
        prId: pr.id,
        prTitle: pr.title,
        prUrl: pr.url,
        detail: `${pr.approvalCount} approval${pr.approvalCount !== 1 ? "s" : ""}`,
      });
    }

    // New merge conflict
    const wasConflicting = prev.mergeable === "CONFLICTING";
    if (!wasConflicting && pr.mergeable === "CONFLICTING") {
      events.push({
        type: "merge_conflict",
        prId: pr.id,
        prTitle: pr.title,
        prUrl: pr.url,
        detail: "Merge conflict detected",
      });
    }

    // New comments (compare comment count)
    const prevCommentCount = prev.comments.length;
    const freshCommentCount = pr.comments.length;
    if (freshCommentCount > prevCommentCount) {
      events.push({
        type: "new_comment",
        prId: pr.id,
        prTitle: pr.title,
        prUrl: pr.url,
        detail: `${freshCommentCount - prevCommentCount} new comment${freshCommentCount - prevCommentCount !== 1 ? "s" : ""}`,
      });
    }
  }

  return deduplicateEvents(events);
}

/**
 * Prevent sending the same notification for the same PR+type twice in a row.
 */
function deduplicateEvents(events: NotificationEvent[]): NotificationEvent[] {
  const seen = new Set<string>();
  return events.filter((e) => {
    const key = `${e.type}-${e.prId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Badge Updates ────────────────────────────────────────────────────────────

function updateBadge(prs: PullRequest[]): void {
  const actionItems = prs.filter((p) => p.myActionRequired);
  const count = actionItems.length;

  chrome.action.setBadgeText({ text: count > 0 ? String(count) : "" });

  const hasCritical = actionItems.some((p) => p.healthStatus === "critical");
  const hasWarning = actionItems.some((p) => p.healthStatus === "warning");

  let color = "#10b981"; // emerald (green)
  if (hasCritical) {
    color = "#ef4444"; // red-500
  } else if (hasWarning) {
    color = "#f59e0b"; // amber-500
  }

  chrome.action.setBadgeBackgroundColor({ color });
}

// ─── Notifications ────────────────────────────────────────────────────────────

async function fireNotifications(events: NotificationEvent[], settings: Settings): Promise<void> {
  // Load which notifications have already been sent (deduplicate across polls)
  const seen = await storageGet<Record<string, number>>(STORAGE_KEYS.seenNotifications, {});
  const now = Date.now();
  const updated = { ...seen };
  const ONE_HOUR = 3600 * 1000;

  // Purge entries older than 1 hour
  for (const key of Object.keys(updated)) {
    if (now - updated[key] > ONE_HOUR) {
      delete updated[key];
    }
  }

  for (const event of events) {
    const key = `${event.type}-${event.prId}`;
    if (updated[key]) continue; // already notified recently

    const shouldNotify = shouldSendNotification(event.type, settings);
    if (!shouldNotify) continue;

    const { title, message } = buildNotificationContent(event);

    const notificationId = `prdash-${key}-${now}`;
    chrome.notifications.create(notificationId, {
      type: "basic",
      iconUrl: "icons/icon48.png",
      title,
      message,
      isClickable: true,
    });

    // Store URL so click handler can open it
    await storageSet(`prdash_notif_url_${notificationId}`, event.prUrl);
    updated[key] = now;
  }

  await storageSet(STORAGE_KEYS.seenNotifications, updated);
}

function shouldSendNotification(type: NotificationEvent["type"], settings: Settings): boolean {
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

function buildNotificationContent(event: NotificationEvent): { title: string; message: string } {
  const short = event.prTitle.length > 50 ? event.prTitle.slice(0, 50) + "…" : event.prTitle;

  switch (event.type) {
    case "ci_failure":
      return { title: "CI Failed", message: `${short}: ${event.detail ?? ""}` };
    case "ci_success":
      return { title: "CI Passed", message: `${short}: All checks passed` };
    case "new_comment":
      return { title: "New Comment", message: `${short}: ${event.detail ?? ""}` };
    case "approved":
      return { title: "PR Approved", message: `${short}: ${event.detail ?? ""}` };
    case "review_requested":
      return { title: "Review Requested", message: short };
    case "merge_conflict":
      return { title: "Merge Conflict", message: `${short}: Merge conflict detected` };
  }
}

// Open PR in new tab when notification is clicked
chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.storage.local.get(`prdash_notif_url_${notificationId}`, (result) => {
    const url = result[`prdash_notif_url_${notificationId}`] as string | undefined;
    if (url) {
      chrome.tabs.create({ url });
      chrome.notifications.clear(notificationId);
      chrome.storage.local.remove(`prdash_notif_url_${notificationId}`);
    }
  });
});

// ─── Storage Helpers ──────────────────────────────────────────────────────────

async function storageGet<T>(key: string, defaultValue: T): Promise<T> {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      resolve(key in result ? (result[key] as T) : defaultValue);
    });
  });
}

async function storageSet(key: string, value: unknown): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

async function getSettings(): Promise<Settings> {
  return storageGet<Settings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
}
