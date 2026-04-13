import type { PullRequest, Comment, CheckRun, Review } from "../../src/lib/types";

/** Build a realistic mock CheckRun */
export function mockCheckRun(overrides: Partial<CheckRun> = {}): CheckRun {
  return {
    name: "CI / test",
    status: "COMPLETED",
    conclusion: "SUCCESS",
    detailsUrl: "https://github.com/org/repo/actions/runs/123",
    completedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    checkSuiteId: "suite-1",
    checkSuiteDatabaseId: 1001,
    ...overrides,
  };
}

/** Build a realistic mock Review */
export function mockReview(overrides: Partial<Review> = {}): Review {
  return {
    author: "reviewer1",
    state: "COMMENTED",
    body: "Looks good overall",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

/** Build a realistic mock Comment */
export function mockComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: "comment-1",
    body: "Please fix this",
    author: "reviewer1",
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
    url: "https://github.com/org/repo/pull/1#discussion_r1",
    prTitle: "My PR title",
    prUrl: "https://github.com/org/repo/pull/1",
    repo: "org/repo",
    priorityScore: 45,
    priorityLevel: "medium",
    isResolved: false,
    isFromCodeowner: false,
    mentionsCurrentUser: false,
    ...overrides,
  };
}

/** Build a realistic mock PullRequest */
export function mockPR(overrides: Partial<PullRequest> = {}): PullRequest {
  return {
    id: "PR_1",
    number: 1,
    title: "Add new feature",
    url: "https://github.com/org/repo/pull/1",
    repo: "org/repo",
    repoUrl: "https://github.com/org/repo",
    author: {
      login: "testuser",
      avatarUrl: "https://avatars.githubusercontent.com/u/1",
    },
    isDraft: false,
    mergeable: "MERGEABLE",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    headBranch: "feature/my-feature",
    baseBranch: "main",
    healthStatus: "good",
    myActionRequired: false,
    relationship: "authored",
    reviews: [],
    comments: [],
    reviewThreads: [],
    checkRuns: [mockCheckRun()],
    approvalCount: 1,
    requestedReviewerCount: 2,
    ...overrides,
  };
}

/** A PR that needs attention (failing CI, authored) */
export function mockCriticalPR(overrides: Partial<PullRequest> = {}): PullRequest {
  return mockPR({
    id: "PR_critical",
    title: "Critical feature with failing CI",
    healthStatus: "critical",
    myActionRequired: true,
    actionReason: "Failing CI",
    checkRuns: [mockCheckRun({ conclusion: "FAILURE", name: "CI / test" })],
    ...overrides,
  });
}

/** A PR with a review requested */
export function mockReviewRequestedPR(overrides: Partial<PullRequest> = {}): PullRequest {
  return mockPR({
    id: "PR_review",
    title: "Please review this PR",
    relationship: "review_requested",
    healthStatus: "warning",
    myActionRequired: true,
    actionReason: "Review requested",
    reviews: [],
    approvalCount: 0,
    ...overrides,
  });
}

/** Mock GraphQL response for successful PR fetch */
export function mockGraphQLResponse(prs: { authored?: PullRequest[]; reviewRequested?: PullRequest[] } = {}) {
  return {
    data: {
      authored: { nodes: prs.authored ?? [] },
      reviewRequested: { nodes: prs.reviewRequested ?? [] },
    },
  };
}

/** Mock viewer response */
export function mockViewerResponse(login = "testuser") {
  return {
    data: {
      viewer: { login, avatarUrl: "https://avatars.githubusercontent.com/u/1" },
    },
  };
}
