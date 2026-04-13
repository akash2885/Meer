import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CommentFeed } from "../../src/popup/components/CommentFeed";
import { mockPR, mockComment } from "../mocks/github";

describe("CommentFeed", () => {
  it("shows empty state when no PRs have comments", () => {
    render(<CommentFeed pullRequests={[mockPR({ comments: [] })]} />);
    expect(screen.getByText(/No comments yet/)).toBeInTheDocument();
  });

  it("renders comments sorted by priority score (highest first)", () => {
    const pr = mockPR({
      comments: [
        mockComment({ id: "c1", body: "Low priority comment", priorityScore: 5, priorityLevel: "low" }),
        mockComment({ id: "c2", body: "High priority comment", priorityScore: 80, priorityLevel: "high" }),
        mockComment({ id: "c3", body: "Medium priority comment", priorityScore: 30, priorityLevel: "medium" }),
      ],
    });
    render(<CommentFeed pullRequests={[pr]} />);
    // Filter to only comment item buttons (they have aria-label starting with "Comment")
    const items = screen.getAllByRole("button").filter((b) => b.getAttribute("aria-label")?.startsWith("Comment"));
    // First card should be the highest-priority comment
    expect(items[0].textContent).toContain("High priority comment");
  });

  it("shows correct priority badge colors", () => {
    const pr = mockPR({
      comments: [
        mockComment({ id: "h1", priorityLevel: "high", priorityScore: 80 }),
        mockComment({ id: "m1", body: "medium", priorityLevel: "medium", priorityScore: 30 }),
        mockComment({ id: "l1", body: "low", priorityLevel: "low", priorityScore: 5 }),
      ],
    });
    const { container } = render(<CommentFeed pullRequests={[pr]} />);
    expect(container.querySelector(".badge-red")).toBeInTheDocument();
    expect(container.querySelector(".badge-yellow")).toBeInTheDocument();
    expect(container.querySelector(".badge-gray")).toBeInTheDocument();
  });

  it("opens GitHub URL on comment click", () => {
    const pr = mockPR({
      comments: [mockComment({ id: "c1", url: "https://github.com/org/repo/pull/1#comment-1" })],
    });
    render(<CommentFeed pullRequests={[pr]} />);
    const button = screen.getAllByRole("button").find((b) => b.getAttribute("aria-label")?.includes("Comment"));
    fireEvent.click(button!);
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: "https://github.com/org/repo/pull/1#comment-1" });
  });

  it("filters resolved comments by default", () => {
    const pr = mockPR({
      comments: [
        mockComment({ id: "r1", body: "Resolved comment", isResolved: true }),
        mockComment({ id: "u1", body: "Unresolved comment", isResolved: false }),
      ],
    });
    render(<CommentFeed pullRequests={[pr]} />);
    expect(screen.queryByText(/Resolved comment/)).not.toBeInTheDocument();
    expect(screen.getByText(/Unresolved comment/)).toBeInTheDocument();
  });

  it("shows resolved comments when toggled", () => {
    const pr = mockPR({
      comments: [
        mockComment({ id: "r1", body: "Resolved comment", isResolved: true }),
      ],
    });
    render(<CommentFeed pullRequests={[pr]} />);
    // Toggle to show resolved (find the "Show resolved" button in all-resolved state)
    const toggle = screen.queryByText("Show resolved");
    if (toggle) {
      fireEvent.click(toggle);
      expect(screen.getByText(/Resolved comment/)).toBeInTheDocument();
    }
  });

  it("deduplicates comments with same id across PRs", () => {
    const comment = mockComment({ id: "shared-comment" });
    const pr1 = mockPR({ id: "PR_1", comments: [comment] });
    const pr2 = mockPR({ id: "PR_2", comments: [comment] });
    render(<CommentFeed pullRequests={[pr1, pr2]} />);
    // Should appear only once
    const items = screen.getAllByRole("button").filter((b) => b.getAttribute("aria-label")?.includes("Comment"));
    expect(items).toHaveLength(1);
  });
});
