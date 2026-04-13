import { describe, it, expect, vi, beforeEach } from "vitest";
import { GitHubClient, GitHubAuthError, GitHubRateLimitError, GitHubNetworkError } from "../../src/lib/github";
import { mockViewerResponse } from "../mocks/github";

// Mock fetch globally
const fetchMock = vi.fn();
globalThis.fetch = fetchMock;

function mockFetchResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  fetchMock.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: { get: (k: string) => headers[k] ?? null },
    json: async () => body,
  });
}

describe("GitHubClient", () => {
  let client: GitHubClient;

  beforeEach(() => {
    fetchMock.mockReset();
    client = new GitHubClient("ghp_testtoken123", "https://api.github.com");
  });

  describe("getCurrentUser", () => {
    it("returns login on successful query", async () => {
      mockFetchResponse(mockViewerResponse("octocat"));
      const login = await client.getCurrentUser();
      expect(login).toBe("octocat");
    });

    it("throws GitHubAuthError on 401", async () => {
      mockFetchResponse({}, 401);
      await expect(client.getCurrentUser()).rejects.toBeInstanceOf(GitHubAuthError);
    });

    it("throws GitHubRateLimitError on 403 with X-RateLimit-Remaining: 0", async () => {
      mockFetchResponse({}, 403, { "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": "9999999999" });
      await expect(client.getCurrentUser()).rejects.toBeInstanceOf(GitHubRateLimitError);
    });

    it("throws GitHubNetworkError on non-200/non-401/non-403", async () => {
      mockFetchResponse({}, 500);
      await expect(client.getCurrentUser()).rejects.toBeInstanceOf(GitHubNetworkError);
    });

    it("includes bearer token in Authorization header", async () => {
      mockFetchResponse(mockViewerResponse("user"));
      await client.getCurrentUser();
      const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect((options.headers as Record<string, string>)["Authorization"]).toBe("Bearer ghp_testtoken123");
    });
  });

  describe("fetchPullRequests", () => {
    it("returns empty array when both searches return no results", async () => {
      mockFetchResponse({ data: { authored: { nodes: [] }, reviewRequested: { nodes: [] } } });
      const prs = await client.fetchPullRequests("testuser");
      expect(prs).toEqual([]);
    });

    it("deduplicates PRs appearing in both authored and reviewRequested", async () => {
      const rawPR = {
        id: "PR_1", number: 1, title: "My PR", url: "https://github.com/org/repo/pull/1",
        state: "OPEN", isDraft: false, mergeable: "MERGEABLE",
        createdAt: "2026-04-12T10:00:00Z", updatedAt: "2026-04-13T10:00:00Z",
        headRefName: "feature", baseRefName: "main",
        repository: { nameWithOwner: "org/repo", url: "https://github.com/org/repo" },
        author: { login: "testuser", avatarUrl: "https://avatars.githubusercontent.com/u/1" },
        reviewRequests: { nodes: [] }, reviews: { nodes: [] },
        reviewThreads: { nodes: [] }, comments: { nodes: [] },
        commits: { nodes: [{ commit: { statusCheckRollup: null } }] },
      };

      mockFetchResponse({
        data: {
          authored: { nodes: [rawPR] },
          reviewRequested: { nodes: [rawPR] }, // same PR
        },
      });

      const prs = await client.fetchPullRequests("testuser");
      expect(prs).toHaveLength(1);
      expect(prs[0].relationship).toBe("both");
    });

    it("surfaces GraphQL errors", async () => {
      mockFetchResponse({ errors: [{ message: "Not Found" }] });
      await expect(client.fetchPullRequests("user")).rejects.toThrow("Not Found");
    });

    it("uses enterprise base URL for graphql endpoint", async () => {
      const enterpriseClient = new GitHubClient("token", "https://github.acme.corp");
      mockFetchResponse({ data: { authored: { nodes: [] }, reviewRequested: { nodes: [] } } });
      await enterpriseClient.fetchPullRequests("user");
      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toBe("https://github.acme.corp/api/graphql");
    });
  });

  describe("rerequestCheckSuite", () => {
    it("calls the correct REST endpoint", async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({}) });
      await client.rerequestCheckSuite("org", "repo", 1234);
      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://api.github.com/repos/org/repo/check-suites/1234/rerequest");
      expect(options.method).toBe("POST");
    });
  });

  describe("approvePR", () => {
    it("calls the correct REST endpoint with APPROVE event", async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });
      await client.approvePR("org", "repo", 42);
      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://api.github.com/repos/org/repo/pulls/42/reviews");
      expect(options.method).toBe("POST");
      expect(JSON.parse(options.body as string).event).toBe("APPROVE");
    });
  });
});
