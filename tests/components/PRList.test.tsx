import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PRList } from "../../src/popup/components/PRList";
import { mockPR } from "../mocks/github";

vi.mock("../../src/popup/hooks/useStore", () => ({
  useStore: vi.fn(() => ({
    settings: { token: "ghp_test", baseUrl: "https://api.github.com" },
    fetchPRs: vi.fn(),
  })),
}));

vi.mock("../../src/lib/github", () => ({
  createClient: vi.fn(() => ({ approvePR: vi.fn(), rerequestCheckSuite: vi.fn() })),
}));

describe("PRList", () => {
  it("renders the correct number of PR cards", () => {
    const prs = [
      mockPR({ id: "1", title: "PR One" }),
      mockPR({ id: "2", title: "PR Two" }),
      mockPR({ id: "3", title: "PR Three" }),
    ];
    render(<PRList pullRequests={prs} />);
    expect(screen.getByText("PR One")).toBeInTheDocument();
    expect(screen.getByText("PR Two")).toBeInTheDocument();
    expect(screen.getByText("PR Three")).toBeInTheDocument();
  });

  it("shows empty state when no PRs", () => {
    render(<PRList pullRequests={[]} />);
    expect(screen.getByText(/No open pull requests/)).toBeInTheDocument();
  });
});
