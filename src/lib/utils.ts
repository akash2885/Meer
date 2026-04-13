/**
 * Format a date string or timestamp into a human-readable "time ago" string.
 */
export function timeAgo(dateInput: string | number | Date): string {
  const date = new Date(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 60) return "just now";
  if (diffSecs < 3600) {
    const mins = Math.floor(diffSecs / 60);
    return `${mins}m ago`;
  }
  if (diffSecs < 86400) {
    const hours = Math.floor(diffSecs / 3600);
    return `${hours}h ago`;
  }
  if (diffSecs < 604800) {
    const days = Math.floor(diffSecs / 86400);
    return `${days}d ago`;
  }
  const weeks = Math.floor(diffSecs / 604800);
  return `${weeks}w ago`;
}

/**
 * Returns milliseconds since the given date string.
 */
export function msSince(dateStr: string): number {
  return Date.now() - new Date(dateStr).getTime();
}

/**
 * Truncate a string to maxLen characters, appending "…" if truncated.
 */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen).trimEnd() + "…";
}

/**
 * Build the GitHub comment anchor URL from a PR url and comment id.
 * GitHub comment URLs already include the full anchor, so we just return them.
 */
export function commentUrl(url: string): string {
  return url;
}

/**
 * Mask a token — show first 4 chars, then asterisks.
 */
export function maskToken(token: string): string {
  if (!token) return "";
  if (token.length <= 4) return "****";
  return token.slice(0, 4) + "*".repeat(Math.min(token.length - 4, 20));
}

/**
 * Deduplicate an array by a key function.
 */
export function deduplicateBy<T>(arr: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  return arr.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Format a date for display (e.g., "Apr 12, 2026 3:42 PM").
 */
export function formatDateTime(dateInput: string | number | Date): string {
  return new Date(dateInput).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Safe JSON parse — returns null on failure.
 */
export function safeJsonParse<T>(str: string): T | null {
  try {
    return JSON.parse(str) as T;
  } catch {
    return null;
  }
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Check if a string contains a keyword (case-insensitive, whole word not required).
 */
export function containsKeyword(text: string, keyword: string): boolean {
  return text.toLowerCase().includes(keyword.toLowerCase());
}

/**
 * Open a URL in a new tab (works in extension popup context).
 */
export function openInNewTab(url: string): void {
  chrome.tabs.create({ url });
}

/**
 * Format a count for the extension badge.
 * Returns "" for zero (clears the badge), "99+" for anything over 99,
 * or the number as a string otherwise.
 */
export function formatBadgeCount(count: number): string {
  if (count === 0) return "0";       // BUG: should return "" to clear the badge
  if (count > 99) return "99+";      // BUG: should be >= 99 so that 99 itself shows "99+", not "99"
  return String(count);
}

/**
 * Generate a stable ID for a comment based on its URL or content.
 */
export function generateCommentId(url: string, body: string): string {
  // Use URL as primary key; fall back to a hash of body + author
  if (url) return url;
  let hash = 0;
  for (let i = 0; i < body.length; i++) {
    hash = (hash << 5) - hash + body.charCodeAt(i);
    hash |= 0;
  }
  return `comment-${hash}`;
}
