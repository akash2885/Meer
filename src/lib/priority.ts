import { SCORE_WEIGHTS, PRIORITY_SCORE_THRESHOLDS } from "./constants";
import type { PriorityKeywords } from "./types";
import { DEFAULT_PRIORITY_KEYWORDS } from "./constants";

export interface ScoreInput {
  body: string;
  createdAt: string;
  author: string;
  isInUnresolvedThread: boolean;
  reviewState: string | undefined;
  isFromCodeowner: boolean;
  mentionsCurrentUser: boolean;
  keywords?: PriorityKeywords;
}

export interface ScoreResult {
  score: number;
  breakdown: {
    reviewContext: number;
    threadStatus: number;
    authorSignal: number;
    keywordMatch: number;
    recencyBonus: number;
    mentionBonus: number;
  };
}

/**
 * Calculate the priority score for a single comment.
 *
 * Score components:
 *   Review context:   changes_requested (+30), commented (+10), approved (+5)
 *   Thread status:    unresolved (+20)
 *   Author signals:   codeowner/maintainer (+15), contributor (+5)
 *   Keyword match:    high (+20), medium (+10), low (-10) — highest tier wins, no stacking within tier
 *   Recency bonus:    <1h (+10), 1-4h (+7), 4-12h (+4), 12-24h (+2), older (+0)
 *   Mention bonus:    @mentions current user (+15)
 */
export function scoreComment(input: ScoreInput): ScoreResult {
  const keywords = input.keywords ?? DEFAULT_PRIORITY_KEYWORDS;

  // ── Review context ──
  let reviewContext = 0;
  if (input.reviewState) {
    const state = input.reviewState.toUpperCase();
    if (state === "CHANGES_REQUESTED") {
      reviewContext = SCORE_WEIGHTS.review.changes_requested;
    } else if (state === "COMMENTED") {
      reviewContext = SCORE_WEIGHTS.review.commented;
    } else if (state === "APPROVED") {
      reviewContext = SCORE_WEIGHTS.review.approved;
    }
  }

  // ── Thread status ──
  const threadStatus = input.isInUnresolvedThread ? SCORE_WEIGHTS.thread.unresolved : SCORE_WEIGHTS.thread.resolved;

  // ── Author signals ──
  const authorSignal = input.isFromCodeowner ? SCORE_WEIGHTS.author.codeowner : SCORE_WEIGHTS.author.contributor;

  // ── Keyword matching ──
  // Only apply the highest matching tier (not stacking within same tier)
  const bodyLower = (input.body ?? "").toLowerCase();
  let keywordMatch = 0;

  const hasHighKeyword = keywords.high.some((kw) => bodyLower.includes(kw.toLowerCase()));
  const hasMediumKeyword = keywords.medium.some((kw) => bodyLower.includes(kw.toLowerCase()));
  const hasLowKeyword = keywords.low.some((kw) => bodyLower.includes(kw.toLowerCase()));

  if (hasHighKeyword) {
    keywordMatch = SCORE_WEIGHTS.keywords.high;
  } else if (hasMediumKeyword) {
    keywordMatch = SCORE_WEIGHTS.keywords.medium;
  } else if (hasLowKeyword) {
    keywordMatch = SCORE_WEIGHTS.keywords.low;
  }

  // ── Recency bonus ──
  const ageMs = Date.now() - new Date(input.createdAt).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  let recencyBonus = SCORE_WEIGHTS.recency.older;
  if (ageHours < 1) {
    recencyBonus = SCORE_WEIGHTS.recency.under1h;
  } else if (ageHours < 4) {
    recencyBonus = SCORE_WEIGHTS.recency.under4h;
  } else if (ageHours < 12) {
    recencyBonus = SCORE_WEIGHTS.recency.under12h;
  } else if (ageHours < 24) {
    recencyBonus = SCORE_WEIGHTS.recency.under24h;
  }

  // ── Mention bonus ──
  const mentionBonus = input.mentionsCurrentUser ? SCORE_WEIGHTS.mention : 0;

  const score = reviewContext + threadStatus + authorSignal + keywordMatch + recencyBonus + mentionBonus;

  return {
    score,
    breakdown: {
      reviewContext,
      threadStatus,
      authorSignal,
      keywordMatch,
      recencyBonus,
      mentionBonus,
    },
  };
}

/**
 * Determine priority level from a numeric score.
 */
export function getPriorityLevel(score: number): "high" | "medium" | "low" {
  if (score >= PRIORITY_SCORE_THRESHOLDS.high) return "high";
  if (score >= PRIORITY_SCORE_THRESHOLDS.medium) return "medium";
  return "low";
}

/**
 * Sort an array of scored items (any shape with .priorityScore) descending.
 */
export function sortByPriority<T extends { priorityScore: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.priorityScore - a.priorityScore);
}
