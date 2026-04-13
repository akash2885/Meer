import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CommentItem } from "../../src/popup/components/CommentItem";
import { mockComment } from "../mocks/github";

describe("CommentItem", () => {
  it("renders author and PR title", () => {
    const comment = mockComment({ author: "alice", prTitle: "My Feature PR" });
    render(<CommentItem comment={comment} />);
    expect(screen.getByText("@alice")).toBeInTheDocument();
    expect(screen.getByText(/My Feature PR/)).toBeInTheDocument();
  });

  it("shows the comment body snippet (truncated to 120 chars)", () => {
    const body = "A".repeat(200);
    const comment = mockComment({ body });
    render(<CommentItem comment={comment} />);
    const text = screen.getByRole("button").textContent ?? "";
    expect(text).toContain("…");
    const bodyEl = screen.getByRole("button").querySelector("p");
    expect(bodyEl!.textContent!.length).toBeLessThanOrEqual(125); // 120 + "…"
  });

  it("shows high priority badge for high-priority comments", () => {
    const { container } = render(<CommentItem comment={mockComment({ priorityLevel: "high" })} />);
    const badge = container.querySelector("[data-testid='priority-badge']");
    expect(badge?.textContent?.toLowerCase()).toContain("high");
  });

  it("shows medium priority badge for medium-priority comments", () => {
    const { container } = render(<CommentItem comment={mockComment({ priorityLevel: "medium" })} />);
    const badge = container.querySelector("[data-testid='priority-badge']");
    expect(badge?.textContent?.toLowerCase()).toContain("medium");
  });

  it("shows low priority badge for low-priority comments", () => {
    const { container } = render(<CommentItem comment={mockComment({ priorityLevel: "low" })} />);
    const badge = container.querySelector("[data-testid='priority-badge']");
    expect(badge?.textContent?.toLowerCase()).toContain("low");
  });

  it("opens GitHub URL in new tab on click", () => {
    const comment = mockComment({ url: "https://github.com/org/repo/pull/5#comment-42" });
    render(<CommentItem comment={comment} />);
    fireEvent.click(screen.getByRole("button"));
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: comment.url });
  });

  it("shows repo name", () => {
    const comment = mockComment({ repo: "myorg/myrepo" });
    render(<CommentItem comment={comment} />);
    expect(screen.getByText("myorg/myrepo")).toBeInTheDocument();
  });
});
