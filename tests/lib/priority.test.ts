import { describe, it, expect, beforeEach, vi } from "vitest";
import { scoreComment, getPriorityLevel, sortByPriority } from "../../src/lib/priority";
import { DEFAULT_PRIORITY_KEYWORDS } from "../../src/lib/constants";

// Pin "now" to a stable value for recency tests
const NOW = new Date("2026-04-13T12:00:00Z").getTime();

beforeEach(() => {
  vi.setSystemTime(NOW);
});

function ts(minsAgo: number) {
  return new Date(NOW - minsAgo * 60 * 1000).toISOString();
}

describe("scoreComment", () => {
  it("scores very high for changes_requested + unresolved + codeowner + high keyword + recent + mention", () => {
    const result = scoreComment({
      body: "This is a critical fix needed now",
      createdAt: ts(30), // 30 min ago → +10
      author: "codeowner",
      isInUnresolvedThread: true,  // +20
      reviewState: "CHANGES_REQUESTED", // +30
      isFromCodeowner: true,       // +15
      mentionsCurrentUser: true,   // +15
      keywords: DEFAULT_PRIORITY_KEYWORDS,
    });
    // 30 (CR) + 20 (unresolved) + 15 (codeowner) + 20 (high kw: critical) + 10 (recency) + 15 (mention) = 110
    expect(result.score).toBeGreaterThanOrEqual(95);
    expect(result.breakdown.reviewContext).toBe(30);
    expect(result.breakdown.threadStatus).toBe(20);
    expect(result.breakdown.authorSignal).toBe(15);
    expect(result.breakdown.keywordMatch).toBe(20);
    expect(result.breakdown.recencyBonus).toBe(10);
    expect(result.breakdown.mentionBonus).toBe(15);
  });

  it("scores very low for nit comment in approved review, resolved thread", () => {
    const result = scoreComment({
      body: "nit: add a comma here",
      createdAt: ts(2 * 24 * 60), // 2 days old → +0 recency
      author: "contributor",
      isInUnresolvedThread: false, // +0
      reviewState: "APPROVED",    // +5
      isFromCodeowner: false,     // +5
      mentionsCurrentUser: false, // +0
      keywords: DEFAULT_PRIORITY_KEYWORDS,
    });
    // 5 (approved) + 0 (resolved) + 5 (contributor) + (-10) (low kw: nit) + 0 (old) + 0 = 0
    expect(result.score).toBeLessThanOrEqual(5);
    expect(result.breakdown.keywordMatch).toBe(-10);
  });

  it("gives negative score for LGTM looks good comment", () => {
    const result = scoreComment({
      body: "LGTM looks good to me!",
      createdAt: ts(60 * 48), // 2 days old
      author: "contributor",
      isInUnresolvedThread: false,
      reviewState: undefined,
      isFromCodeowner: false,
      mentionsCurrentUser: false,
      keywords: DEFAULT_PRIORITY_KEYWORDS,
    });
    expect(result.breakdown.keywordMatch).toBe(-10);
  });

  it("scores very high for production break urgent keywords", () => {
    const result = scoreComment({
      body: "This will break production, urgent fix needed",
      createdAt: ts(10),
      author: "contributor",
      isInUnresolvedThread: true,
      reviewState: "CHANGES_REQUESTED",
      isFromCodeowner: false,
      mentionsCurrentUser: false,
      keywords: DEFAULT_PRIORITY_KEYWORDS,
    });
    // 30 (CR) + 20 (unresolved) + 5 (contributor) + 20 (high kw: breaking/urgent) + 10 (recency) = 85
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.breakdown.keywordMatch).toBe(20);
  });

  it("scores medium for unresolved thread, non-codeowner, no keywords, 2h old", () => {
    const result = scoreComment({
      body: "What do you think about this approach?",
      createdAt: ts(120), // 2 hours ago → recency +7
      author: "contributor",
      isInUnresolvedThread: true,  // +20
      reviewState: undefined,
      isFromCodeowner: false,      // +5
      mentionsCurrentUser: false,
      keywords: DEFAULT_PRIORITY_KEYWORDS,
    });
    // 0 + 20 + 5 + 0 + 7 + 0 = 32
    expect(result.score).toBeGreaterThanOrEqual(25);
    expect(result.breakdown.threadStatus).toBe(20);
  });

  it("adds +15 bonus when comment mentions current user", () => {
    const without = scoreComment({
      body: "Please check this",
      createdAt: ts(30),
      author: "reviewer",
      isInUnresolvedThread: false,
      reviewState: undefined,
      isFromCodeowner: false,
      mentionsCurrentUser: false,
      keywords: DEFAULT_PRIORITY_KEYWORDS,
    });
    const withMention = scoreComment({
      body: "Please check this",
      createdAt: ts(30),
      author: "reviewer",
      isInUnresolvedThread: false,
      reviewState: undefined,
      isFromCodeowner: false,
      mentionsCurrentUser: true,
      keywords: DEFAULT_PRIORITY_KEYWORDS,
    });
    expect(withMention.score - without.score).toBe(15);
  });

  it("keyword matching is case-insensitive", () => {
    const lower = scoreComment({ body: "critical bug", createdAt: ts(30), author: "a", isInUnresolvedThread: false, reviewState: undefined, isFromCodeowner: false, mentionsCurrentUser: false, keywords: DEFAULT_PRIORITY_KEYWORDS });
    const upper = scoreComment({ body: "CRITICAL BUG", createdAt: ts(30), author: "a", isInUnresolvedThread: false, reviewState: undefined, isFromCodeowner: false, mentionsCurrentUser: false, keywords: DEFAULT_PRIORITY_KEYWORDS });
    const mixed = scoreComment({ body: "Critical Bug", createdAt: ts(30), author: "a", isInUnresolvedThread: false, reviewState: undefined, isFromCodeowner: false, mentionsCurrentUser: false, keywords: DEFAULT_PRIORITY_KEYWORDS });
    expect(lower.breakdown.keywordMatch).toBe(upper.breakdown.keywordMatch);
    expect(lower.breakdown.keywordMatch).toBe(mixed.breakdown.keywordMatch);
    expect(lower.breakdown.keywordMatch).toBe(20);
  });

  it("does not stack multiple high-tier keywords (only applies highest tier)", () => {
    // "fix" and "bug" are both high — should still only be +20, not +40
    const result = scoreComment({
      body: "fix this bug immediately",
      createdAt: ts(30),
      author: "contributor",
      isInUnresolvedThread: false,
      reviewState: undefined,
      isFromCodeowner: false,
      mentionsCurrentUser: false,
      keywords: DEFAULT_PRIORITY_KEYWORDS,
    });
    expect(result.breakdown.keywordMatch).toBe(20);
  });

  it("medium keyword overrides low keyword when both present", () => {
    // "should" (medium) + "nit" (low) → medium should win (no high keywords in body)
    const result = scoreComment({
      body: "nit: you should consider this approach",
      createdAt: ts(30),
      author: "contributor",
      isInUnresolvedThread: false,
      reviewState: undefined,
      isFromCodeowner: false,
      mentionsCurrentUser: false,
      keywords: DEFAULT_PRIORITY_KEYWORDS,
    });
    // "nit" is low, "should" is medium → medium (+10) wins
    expect(result.breakdown.keywordMatch).toBe(10);
  });

  it("handles empty comment body without error", () => {
    const result = scoreComment({
      body: "",
      createdAt: ts(30),
      author: "contributor",
      isInUnresolvedThread: false,
      reviewState: undefined,
      isFromCodeowner: false,
      mentionsCurrentUser: false,
      keywords: DEFAULT_PRIORITY_KEYWORDS,
    });
    expect(result.score).toBeTypeOf("number");
    expect(result.breakdown.keywordMatch).toBe(0);
  });

  it("handles extremely long comment body", () => {
    const result = scoreComment({
      body: "a".repeat(10000),
      createdAt: ts(30),
      author: "contributor",
      isInUnresolvedThread: false,
      reviewState: undefined,
      isFromCodeowner: false,
      mentionsCurrentUser: false,
      keywords: DEFAULT_PRIORITY_KEYWORDS,
    });
    expect(result.score).toBeTypeOf("number");
  });

  describe("recency bonuses", () => {
    it("gives +10 for comment under 1 hour old", () => {
      const result = scoreComment({ body: "test", createdAt: ts(30), author: "a", isInUnresolvedThread: false, reviewState: undefined, isFromCodeowner: false, mentionsCurrentUser: false, keywords: DEFAULT_PRIORITY_KEYWORDS });
      expect(result.breakdown.recencyBonus).toBe(10);
    });
    it("gives +7 for comment 1-4 hours old", () => {
      const result = scoreComment({ body: "test", createdAt: ts(2 * 60), author: "a", isInUnresolvedThread: false, reviewState: undefined, isFromCodeowner: false, mentionsCurrentUser: false, keywords: DEFAULT_PRIORITY_KEYWORDS });
      expect(result.breakdown.recencyBonus).toBe(7);
    });
    it("gives +4 for comment 4-12 hours old", () => {
      const result = scoreComment({ body: "test", createdAt: ts(6 * 60), author: "a", isInUnresolvedThread: false, reviewState: undefined, isFromCodeowner: false, mentionsCurrentUser: false, keywords: DEFAULT_PRIORITY_KEYWORDS });
      expect(result.breakdown.recencyBonus).toBe(4);
    });
    it("gives +2 for comment 12-24 hours old", () => {
      const result = scoreComment({ body: "test", createdAt: ts(18 * 60), author: "a", isInUnresolvedThread: false, reviewState: undefined, isFromCodeowner: false, mentionsCurrentUser: false, keywords: DEFAULT_PRIORITY_KEYWORDS });
      expect(result.breakdown.recencyBonus).toBe(2);
    });
    it("gives +0 for comment older than 24h", () => {
      const result = scoreComment({ body: "test", createdAt: ts(30 * 60), author: "a", isInUnresolvedThread: false, reviewState: undefined, isFromCodeowner: false, mentionsCurrentUser: false, keywords: DEFAULT_PRIORITY_KEYWORDS });
      expect(result.breakdown.recencyBonus).toBe(0);
    });
  });
});

describe("getPriorityLevel", () => {
  it("returns 'high' for score >= 50", () => {
    expect(getPriorityLevel(50)).toBe("high");
    expect(getPriorityLevel(100)).toBe("high");
  });
  it("returns 'medium' for score 20-49", () => {
    expect(getPriorityLevel(20)).toBe("medium");
    expect(getPriorityLevel(49)).toBe("medium");
  });
  it("returns 'low' for score < 20", () => {
    expect(getPriorityLevel(0)).toBe("low");
    expect(getPriorityLevel(19)).toBe("low");
    expect(getPriorityLevel(-10)).toBe("low");
  });
});

describe("sortByPriority", () => {
  it("sorts items by priorityScore descending", () => {
    const items = [
      { priorityScore: 10 },
      { priorityScore: 80 },
      { priorityScore: 45 },
    ];
    const sorted = sortByPriority(items);
    expect(sorted.map((i) => i.priorityScore)).toEqual([80, 45, 10]);
  });

  it("does not mutate the original array", () => {
    const items = [{ priorityScore: 5 }, { priorityScore: 100 }];
    const sorted = sortByPriority(items);
    expect(items[0].priorityScore).toBe(5); // original unchanged
    expect(sorted[0].priorityScore).toBe(100);
  });
});
