import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PRCard } from "../../src/popup/components/PRCard";
import { mockPR, mockCheckRun } from "../mocks/github";

const NOW = new Date("2026-04-13T12:00:00Z").getTime();
beforeEach(() => {
  vi.setSystemTime(NOW);
});

// Mock useStore to avoid chrome.storage dependency
vi.mock("../../src/popup/hooks/useStore", () => ({
  useStore: vi.fn(() => ({
    settings: { token: "ghp_test", baseUrl: "https://api.github.com" },
    fetchPRs: vi.fn(),
  })),
}));

// Mock createClient
vi.mock("../../src/lib/github", () => ({
  createClient: vi.fn(() => ({
    approvePR: vi.fn().mockResolvedValue(undefined),
    rerequestCheckSuite: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe("PRCard", () => {
  it("displays repo name and PR title", () => {
    render(<PRCard pr={mockPR({ repo: "myorg/myrepo", title: "My awesome PR" })} />);
    expect(screen.getByText("myorg/myrepo")).toBeInTheDocument();
    expect(screen.getByText(/My awesome PR/)).toBeInTheDocument();
  });

  it("shows author login", () => {
    render(<PRCard pr={mockPR({ author: { login: "devauthor", avatarUrl: "" } })} />);
    expect(screen.getByText("devauthor")).toBeInTheDocument();
  });

  it("shows correct health badge for 'good' status", () => {
    const { container } = render(<PRCard pr={mockPR({ healthStatus: "good" })} />);
    const badge = container.querySelector(".badge-green");
    expect(badge).toBeInTheDocument();
  });

  it("shows red badge for 'critical' status", () => {
    const { container } = render(<PRCard pr={mockPR({ healthStatus: "critical" })} />);
    const badge = container.querySelector(".badge-red");
    expect(badge).toBeInTheDocument();
  });

  it("shows yellow badge for 'warning' status", () => {
    const { container } = render(<PRCard pr={mockPR({ healthStatus: "warning" })} />);
    const badge = container.querySelector(".badge-yellow");
    expect(badge).toBeInTheDocument();
  });

  it("shows approval count", () => {
    render(<PRCard pr={mockPR({ approvalCount: 2, requestedReviewerCount: 3 })} />);
    const approvals = screen.getByTitle("Approvals");
    expect(approvals.textContent).toContain("2/3");
  });

  it("truncates long titles", () => {
    const longTitle = "A".repeat(100);
    render(<PRCard pr={mockPR({ title: longTitle })} />);
    const titleEl = screen.getByTitle(longTitle);
    expect(titleEl.textContent!.length).toBeLessThan(100);
    expect(titleEl.textContent!.endsWith("…")).toBe(true);
  });

  it("shows merge conflict indicator", () => {
    render(<PRCard pr={mockPR({ mergeable: "CONFLICTING" })} />);
    expect(screen.getByText(/Conflict/)).toBeInTheDocument();
  });

  it("shows Draft indicator for draft PRs", () => {
    render(<PRCard pr={mockPR({ isDraft: true })} />);
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("opens PR in new tab on click", () => {
    render(<PRCard pr={mockPR({ url: "https://github.com/org/repo/pull/1" })} />);
    fireEvent.click(screen.getByText(/Add new feature/));
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: "https://github.com/org/repo/pull/1" });
  });

  it("shows action reason when showActionReason is true", () => {
    render(<PRCard pr={mockPR({ myActionRequired: true, actionReason: "Failing CI" })} showActionReason />);
    expect(screen.getByText(/Failing CI/)).toBeInTheDocument();
  });

  it("shows CI icon when check runs exist", () => {
    const pr = mockPR({ checkRuns: [mockCheckRun({ conclusion: "FAILURE" })] });
    render(<PRCard pr={pr} />);
    expect(screen.getByTitle("CI failing")).toBeInTheDocument();
  });

  it("shows CI button to expand CI details", () => {
    const pr = mockPR({ checkRuns: [mockCheckRun()] });
    render(<PRCard pr={pr} />);
    const ciButton = screen.getByRole("button", { name: /show ci/i });
    expect(ciButton).toBeInTheDocument();
    fireEvent.click(ciButton);
    expect(screen.getByRole("button", { name: /hide ci/i })).toBeInTheDocument();
  });

  describe("ReviewSLABadge", () => {
    it("shows no SLA indicator on draft PRs", () => {
      const pr = mockPR({
        isDraft: true,
        requestedReviewerCount: 2,
        approvalCount: 0,
        updatedAt: new Date(NOW - 30 * 3600 * 1000).toISOString(),
      });
      const { container } = render(<PRCard pr={pr} />);
      expect(container.querySelector("[data-sla-tier]")).toBeNull();
    });

    it("shows no SLA indicator when no reviewers are assigned", () => {
      const pr = mockPR({
        isDraft: false,
        requestedReviewerCount: 0,
        approvalCount: 0,
        updatedAt: new Date(NOW - 30 * 3600 * 1000).toISOString(),
      });
      const { container } = render(<PRCard pr={pr} />);
      expect(container.querySelector("[data-sla-tier]")).toBeNull();
    });

    it("shows no SLA indicator when PR is fully approved", () => {
      const pr = mockPR({
        isDraft: false,
        requestedReviewerCount: 2,
        approvalCount: 2,
        updatedAt: new Date(NOW - 30 * 3600 * 1000).toISOString(),
      });
      const { container } = render(<PRCard pr={pr} />);
      expect(container.querySelector("[data-sla-tier]")).toBeNull();
    });

    it("shows 'good' tier (no clock icon) when review is pending and updated < 4h ago", () => {
      const pr = mockPR({
        isDraft: false,
        requestedReviewerCount: 2,
        approvalCount: 0,
        updatedAt: new Date(NOW - 2 * 3600 * 1000).toISOString(),
      });
      const { container } = render(<PRCard pr={pr} />);
      const badge = container.querySelector("[data-sla-tier='good']");
      expect(badge).toBeInTheDocument();
      expect(badge!.querySelector("svg")).toBeNull();
    });

    it("shows 'warning' tier with clock icon at 4–24h", () => {
      const pr = mockPR({
        isDraft: false,
        requestedReviewerCount: 2,
        approvalCount: 0,
        updatedAt: new Date(NOW - 8 * 3600 * 1000).toISOString(),
      });
      const { container } = render(<PRCard pr={pr} />);
      const badge = container.querySelector("[data-sla-tier='warning']");
      expect(badge).toBeInTheDocument();
      expect(badge!.querySelector("svg")).toBeInTheDocument();
      expect(badge).toHaveClass("text-amber-400");
    });

    it("shows 'critical' tier with clock icon past 24h", () => {
      const pr = mockPR({
        isDraft: false,
        requestedReviewerCount: 2,
        approvalCount: 0,
        updatedAt: new Date(NOW - 36 * 3600 * 1000).toISOString(),
      });
      const { container } = render(<PRCard pr={pr} />);
      const badge = container.querySelector("[data-sla-tier='critical']");
      expect(badge).toBeInTheDocument();
      expect(badge!.querySelector("svg")).toBeInTheDocument();
      expect(badge).toHaveClass("text-red-400");
    });

    it("SLA badge shows correct relative time text", () => {
      const pr = mockPR({
        isDraft: false,
        requestedReviewerCount: 1,
        approvalCount: 0,
        updatedAt: new Date(NOW - 6 * 3600 * 1000).toISOString(),
      });
      render(<PRCard pr={pr} />);
      expect(screen.getByText("6h ago")).toBeInTheDocument();
    });
  });
});
