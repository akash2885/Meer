import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActionItems } from "../../src/popup/components/ActionItems";
import { mockPR, mockCriticalPR, mockReviewRequestedPR } from "../mocks/github";

vi.mock("../../src/popup/hooks/useStore", () => ({
  useStore: vi.fn(() => ({
    settings: { token: "ghp_test", baseUrl: "https://api.github.com" },
    fetchPRs: vi.fn(),
  })),
}));

vi.mock("../../src/lib/github", () => ({
  createClient: vi.fn(() => ({ approvePR: vi.fn(), rerequestCheckSuite: vi.fn() })),
}));

describe("ActionItems", () => {
  it("shows only PRs where myActionRequired is true", () => {
    const prs = [
      mockPR({ id: "1", title: "Fine PR", myActionRequired: false }),
      mockCriticalPR({ id: "2", title: "Needs attention" }),
    ];
    render(<ActionItems pullRequests={prs} />);
    expect(screen.queryByText("Fine PR")).not.toBeInTheDocument();
    expect(screen.getByText("Needs attention")).toBeInTheDocument();
  });

  it("shows empty state with 'all caught up' message when no action items", () => {
    render(<ActionItems pullRequests={[mockPR({ myActionRequired: false })]} />);
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
  });

  it("displays the action reason for each item", () => {
    render(<ActionItems pullRequests={[mockCriticalPR({ actionReason: "Failing CI" })]} />);
    expect(screen.getByText(/Failing CI/)).toBeInTheDocument();
  });

  it("sorts critical items before warning items", () => {
    const prs = [
      mockReviewRequestedPR({ id: "w1", title: "Warning PR" }),
      mockCriticalPR({ id: "c1", title: "Critical PR" }),
    ];
    render(<ActionItems pullRequests={prs} />);
    const cards = screen.getAllByText(/PR$/);
    // Critical should appear first
    expect(cards[0].textContent).toContain("Critical");
  });

  it("shows total item count in summary bar", () => {
    const prs = [
      mockCriticalPR({ id: "c1", title: "Critical PR" }),
      mockReviewRequestedPR({ id: "w1", title: "Warning PR" }),
    ];
    render(<ActionItems pullRequests={prs} />);
    expect(screen.getByText(/2 items/i)).toBeInTheDocument();
  });

  it("shows singular 'item' when only one action item", () => {
    render(<ActionItems pullRequests={[mockCriticalPR({ id: "c1" })]} />);
    expect(screen.getByText(/1 item$/i)).toBeInTheDocument();
  });

  it("shows critical and warning pill counts in summary bar", () => {
    const prs = [mockCriticalPR({ id: "c1" }), mockCriticalPR({ id: "c2" }), mockReviewRequestedPR({ id: "w1" })];
    render(<ActionItems pullRequests={prs} />);
    expect(screen.getByText(/2 critical/i)).toBeInTheDocument();
    expect(screen.getByText(/1 warning/i)).toBeInTheDocument();
  });

  it("omits the warning pill when there are no warning items", () => {
    render(<ActionItems pullRequests={[mockCriticalPR({ id: "c1" })]} />);
    expect(screen.queryByText(/warning/i)).not.toBeInTheDocument();
  });
});
