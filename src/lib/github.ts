import { PR_DASHBOARD_QUERY, VIEWER_QUERY } from "./queries";
import { scoreComment } from "./priority";
import { generateCommentId, deduplicateBy } from "./utils";
import { DEFAULT_PRIORITY_KEYWORDS, PRIORITY_SCORE_THRESHOLDS } from "./constants";
import type {
  PullRequest,
  Comment,
  CheckRun,
  Review,
  ReviewThread,
  RawPullRequest,
  RawReview,
  RawReviewThread,
  RawCheckRun,
  GraphQLResponse,
  PriorityKeywords,
  Settings,
} from "./types";

export class GitHubClient {
  private baseUrl: string;
  private token: string;

  constructor(token: string, baseUrl = "https://api.github.com") {
    this.token = token;
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private get graphqlUrl(): string {
    if (this.baseUrl === "https://api.github.com") {
      return "https://api.github.com/graphql";
    }
    // GitHub Enterprise: https://hostname/api/graphql
    return `${this.baseUrl}/api/graphql`;
  }

  private get restUrl(): string {
    if (this.baseUrl === "https://api.github.com") {
      return "https://api.github.com";
    }
    return `${this.baseUrl}/api/v3`;
  }

  async graphql<T = GraphQLResponse>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const response = await fetch(this.graphqlUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        "User-Agent": "Meer-Extension/1.0",
      },
      body: JSON.stringify({ query, variables }),
    });

    if (response.status === 401) {
      throw new GitHubAuthError("Invalid or expired GitHub token. Please update your token in settings.");
    }

    if (response.status === 403) {
      const remaining = response.headers.get("X-RateLimit-Remaining");
      const reset = response.headers.get("X-RateLimit-Reset");
      if (remaining === "0") {
        const resetDate = reset ? new Date(parseInt(reset) * 1000).toLocaleTimeString() : "soon";
        throw new GitHubRateLimitError(
          `GitHub API rate limit exceeded. Resets at ${resetDate}.`,
          reset ? parseInt(reset) : null
        );
      }
      throw new GitHubAuthError("Access forbidden. Check your token permissions.");
    }

    if (!response.ok) {
      throw new GitHubNetworkError(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as GraphQLResponse;

    if (data.errors && data.errors.length > 0) {
      // Deduplicate — GitHub returns one error object per failing field, often with identical messages
      const unique = [...new Set(data.errors.map((e) => e.message))];
      // Check all messages, not just the first — GitHub uses two different phrasings for scope errors
      const isScopeError = unique.some(
        (m) =>
          m.includes("Resource not accessible by personal access token") ||
          m.includes("not been granted the required scopes")
      );
      if (isScopeError) {
        throw new GitHubAuthError(
          "Token missing required scope. Use a Classic token with the 'repo' scope in Settings."
        );
      }
      throw new GitHubGraphQLError(unique.join("; "));
    }

    return data as T;
  }

  async getCurrentUser(): Promise<string> {
    const data = await this.graphql(VIEWER_QUERY);
    if (!data.data?.viewer?.login) {
      throw new GitHubAuthError("Could not fetch user information. Check your token.");
    }
    return data.data.viewer.login;
  }

  async fetchPullRequests(
    currentUser: string,
    keywords: PriorityKeywords = DEFAULT_PRIORITY_KEYWORDS
  ): Promise<PullRequest[]> {
    const data = await this.graphql(PR_DASHBOARD_QUERY);

    const authoredRaw: RawPullRequest[] = (data.data?.authored?.nodes ?? []).filter(isRawPR);
    const reviewRequestedRaw: RawPullRequest[] = (data.data?.reviewRequested?.nodes ?? []).filter(isRawPR);

    // Build a map by id, merging relationship
    const prMap = new Map<string, { raw: RawPullRequest; relationship: "authored" | "review_requested" | "both" }>();

    for (const raw of authoredRaw) {
      prMap.set(raw.id, { raw, relationship: "authored" });
    }
    for (const raw of reviewRequestedRaw) {
      const existing = prMap.get(raw.id);
      if (existing) {
        existing.relationship = "both";
      } else {
        prMap.set(raw.id, { raw, relationship: "review_requested" });
      }
    }

    const prs: PullRequest[] = [];
    for (const { raw, relationship } of prMap.values()) {
      prs.push(transformPR(raw, relationship, currentUser, keywords));
    }

    // Sort by most recently updated
    prs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return prs;
  }

  async rerequestCheckSuite(owner: string, repo: string, checkSuiteDatabaseId: number): Promise<void> {
    const url = `${this.restUrl}/repos/${owner}/${repo}/check-suites/${checkSuiteDatabaseId}/rerequest`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "User-Agent": "Meer-Extension/1.0",
        Accept: "application/vnd.github+json",
      },
    });
    if (!response.ok && response.status !== 201) {
      throw new GitHubNetworkError(`Failed to re-run check suite: ${response.status}`);
    }
  }

  async approvePR(owner: string, repo: string, pullNumber: number): Promise<void> {
    await this.submitReview(owner, repo, pullNumber, "APPROVE");
  }

  async submitReview(
    owner: string,
    repo: string,
    pullNumber: number,
    event: "APPROVE" | "COMMENT" | "REQUEST_CHANGES",
    body = ""
  ): Promise<void> {
    const url = `${this.restUrl}/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        "User-Agent": "Meer-Extension/1.0",
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({ event, body }),
    });
    if (!response.ok) {
      throw new GitHubNetworkError(`Failed to submit review: ${response.status}`);
    }
  }
}

// ─── Transform raw API response → typed PullRequest ──────────────────────────

function isRawPR(node: unknown): node is RawPullRequest {
  return typeof node === "object" && node !== null && "id" in node && "title" in node;
}

function transformPR(
  raw: RawPullRequest,
  relationship: "authored" | "review_requested" | "both",
  currentUser: string,
  keywords: PriorityKeywords
): PullRequest {
  const reviews = transformReviews(raw);
  const checkRuns = transformCheckRuns(raw);
  const reviewThreads = transformReviewThreads(
    raw,
    currentUser,
    keywords,
    raw.title,
    raw.url,
    raw.repository.nameWithOwner
  );
  const allComments = mergeAllComments(raw, reviewThreads, currentUser, keywords);

  const approvalCount = reviews.filter((r) => r.state === "APPROVED").length;
  const hasChangesRequested = reviews.some((r) => r.state === "CHANGES_REQUESTED");
  const hasFailingCI = checkRuns.some((c) => c.status === "COMPLETED" && c.conclusion === "FAILURE");
  const hasRunningCI = checkRuns.some((c) => c.status !== "COMPLETED");
  const isConflicting = raw.mergeable === "CONFLICTING";

  const { healthStatus, myActionRequired, actionReason } = computeHealth(
    relationship,
    hasChangesRequested,
    hasFailingCI,
    hasRunningCI,
    isConflicting,
    approvalCount,
    reviews
  );

  return {
    id: raw.id,
    number: raw.number,
    title: raw.title,
    url: raw.url,
    repo: raw.repository.nameWithOwner,
    repoUrl: raw.repository.url,
    author: {
      login: raw.author.login,
      avatarUrl: raw.author.avatarUrl,
    },
    isDraft: raw.isDraft,
    mergeable: raw.mergeable as PullRequest["mergeable"],
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    headBranch: raw.headRefName ?? "",
    baseBranch: raw.baseRefName ?? "",
    healthStatus,
    myActionRequired,
    actionReason,
    relationship,
    reviews,
    comments: allComments,
    reviewThreads,
    checkRuns,
    approvalCount,
    requestedReviewerCount: raw.reviewRequests?.nodes.length ?? 0,
  };
}

function transformReviews(raw: RawPullRequest): Review[] {
  return (raw.reviews?.nodes ?? []).map((r: RawReview) => ({
    author: r.author.login,
    state: r.state as Review["state"],
    body: r.body,
    createdAt: r.createdAt,
  }));
}

function transformCheckRuns(raw: RawPullRequest): CheckRun[] {
  const contexts = raw.commits?.nodes[0]?.commit.statusCheckRollup?.contexts.nodes ?? [];
  const runs: CheckRun[] = [];
  for (const ctx of contexts) {
    if ("name" in ctx && "checkSuite" in ctx) {
      const c = ctx as RawCheckRun;
      runs.push({
        name: c.name,
        status: c.status as CheckRun["status"],
        conclusion: c.conclusion as CheckRun["conclusion"],
        detailsUrl: c.detailsUrl,
        completedAt: c.completedAt,
        checkSuiteId: c.checkSuite.id,
        checkSuiteDatabaseId: c.checkSuite.databaseId,
      });
    }
  }
  return runs;
}

function transformReviewThreads(
  raw: RawPullRequest,
  currentUser: string,
  keywords: PriorityKeywords,
  prTitle: string,
  prUrl: string,
  repo: string
): ReviewThread[] {
  return (raw.reviewThreads?.nodes ?? []).map((thread: RawReviewThread) => ({
    isResolved: thread.isResolved,
    comments: thread.comments.nodes.map((c) => {
      const score = scoreComment({
        body: c.body,
        createdAt: c.createdAt,
        author: c.author.login,
        isInUnresolvedThread: !thread.isResolved,
        reviewState: undefined,
        isFromCodeowner: false,
        mentionsCurrentUser: c.body.toLowerCase().includes(`@${currentUser.toLowerCase()}`),
        keywords,
      });
      return {
        id: generateCommentId(c.url, c.body),
        body: c.body,
        author: c.author.login,
        createdAt: c.createdAt,
        url: c.url,
        prTitle,
        prUrl,
        repo,
        priorityScore: score.score,
        priorityLevel: getPriorityLevel(score.score),
        isResolved: thread.isResolved,
        isFromCodeowner: false,
        mentionsCurrentUser: c.body.toLowerCase().includes(`@${currentUser.toLowerCase()}`),
      } satisfies Comment;
    }),
  }));
}

function mergeAllComments(
  raw: RawPullRequest,
  reviewThreads: ReviewThread[],
  currentUser: string,
  keywords: PriorityKeywords
): Comment[] {
  const prTitle = raw.title;
  const prUrl = raw.url;
  const repo = raw.repository.nameWithOwner;

  const allComments: Comment[] = [];

  // Comments from review threads
  for (const thread of reviewThreads) {
    allComments.push(...thread.comments);
  }

  // Review body comments
  for (const review of raw.reviews?.nodes ?? []) {
    if (review.body?.trim()) {
      const score = scoreComment({
        body: review.body,
        createdAt: review.createdAt,
        author: review.author.login,
        isInUnresolvedThread: false,
        reviewState: review.state,
        isFromCodeowner: false,
        mentionsCurrentUser: review.body.toLowerCase().includes(`@${currentUser.toLowerCase()}`),
        keywords,
      });
      allComments.push({
        id: generateCommentId(`review-${review.author.login}-${review.createdAt}`, review.body),
        body: review.body,
        author: review.author.login,
        createdAt: review.createdAt,
        url: prUrl,
        prTitle,
        prUrl,
        repo,
        priorityScore: score.score,
        priorityLevel: getPriorityLevel(score.score),
        isResolved: false,
        reviewState: review.state,
        isFromCodeowner: false,
        mentionsCurrentUser: review.body.toLowerCase().includes(`@${currentUser.toLowerCase()}`),
      });

      // Review inline comments
      for (const ic of review.comments?.nodes ?? []) {
        const icScore = scoreComment({
          body: ic.body,
          createdAt: ic.createdAt,
          author: ic.author.login,
          isInUnresolvedThread: false,
          reviewState: review.state,
          isFromCodeowner: false,
          mentionsCurrentUser: ic.body.toLowerCase().includes(`@${currentUser.toLowerCase()}`),
          keywords,
        });
        allComments.push({
          id: generateCommentId(ic.url, ic.body),
          body: ic.body,
          author: ic.author.login,
          createdAt: ic.createdAt,
          url: ic.url,
          prTitle,
          prUrl,
          repo,
          priorityScore: icScore.score,
          priorityLevel: getPriorityLevel(icScore.score),
          isResolved: false,
          reviewState: review.state,
          isFromCodeowner: false,
          mentionsCurrentUser: ic.body.toLowerCase().includes(`@${currentUser.toLowerCase()}`),
        });
      }
    }
  }

  // General PR comments
  for (const c of raw.comments?.nodes ?? []) {
    const score = scoreComment({
      body: c.body,
      createdAt: c.createdAt,
      author: c.author.login,
      isInUnresolvedThread: false,
      reviewState: undefined,
      isFromCodeowner: false,
      mentionsCurrentUser: c.body.toLowerCase().includes(`@${currentUser.toLowerCase()}`),
      keywords,
    });
    allComments.push({
      id: generateCommentId(c.url, c.body),
      body: c.body,
      author: c.author.login,
      createdAt: c.createdAt,
      url: c.url,
      prTitle,
      prUrl,
      repo,
      priorityScore: score.score,
      priorityLevel: getPriorityLevel(score.score),
      isResolved: false,
      isFromCodeowner: false,
      mentionsCurrentUser: c.body.toLowerCase().includes(`@${currentUser.toLowerCase()}`),
    });
  }

  // Deduplicate by id, sort by priority score
  const deduped = deduplicateBy(allComments, (c) => c.id);
  deduped.sort((a, b) => b.priorityScore - a.priorityScore);
  return deduped;
}

function computeHealth(
  relationship: string,
  hasChangesRequested: boolean,
  hasFailingCI: boolean,
  hasRunningCI: boolean,
  isConflicting: boolean,
  approvalCount: number,
  _reviews: Review[]
): { healthStatus: "good" | "warning" | "critical"; myActionRequired: boolean; actionReason?: string } {
  if (hasChangesRequested || hasFailingCI || isConflicting) {
    let actionReason: string | undefined;
    if (hasFailingCI) actionReason = "Failing CI";
    else if (hasChangesRequested) actionReason = "Changes requested";
    else if (isConflicting) actionReason = "Merge conflict";

    return {
      healthStatus: "critical",
      myActionRequired: relationship === "authored" || relationship === "both",
      actionReason,
    };
  }

  if (hasRunningCI || (relationship === "review_requested" && approvalCount === 0)) {
    const actionReason = relationship === "review_requested" ? "Review requested" : "CI running";
    return {
      healthStatus: "warning",
      myActionRequired: relationship === "review_requested" || relationship === "both",
      actionReason,
    };
  }

  // All good
  return {
    healthStatus: "good",
    myActionRequired: false,
  };
}

function getPriorityLevel(score: number): "high" | "medium" | "low" {
  if (score >= PRIORITY_SCORE_THRESHOLDS.high) return "high";
  if (score >= PRIORITY_SCORE_THRESHOLDS.medium) return "medium";
  return "low";
}

// ─── Custom Errors ─────────────────────────────────────────────────────────────

export class GitHubAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubAuthError";
  }
}

export class GitHubRateLimitError extends Error {
  resetTimestamp: number | null;
  constructor(message: string, resetTimestamp: number | null = null) {
    super(message);
    this.name = "GitHubRateLimitError";
    this.resetTimestamp = resetTimestamp;
  }
}

export class GitHubNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubNetworkError";
  }
}

export class GitHubGraphQLError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubGraphQLError";
  }
}

export function createClient(settings: Settings): GitHubClient {
  return new GitHubClient(settings.token, settings.baseUrl);
}
