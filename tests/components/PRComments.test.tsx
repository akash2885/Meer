import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PRComments } from "../../src/popup/components/PRComments";
import { mockPR, mockComment } from "../mocks/github";

vi.mock("../../src/popup/hooks/useStore", () => ({
  useStore: vi.fn(() => ({
    settings: { token: "ghp_test", baseUrl: "https://api.github.com" },
    fetchPRs: vi.fn(),
  })),
}));

vi.mock("../../src/lib/github", () => ({
  createClient: vi.fn(() => ({
    addPRComment: vi.fn().mockResolvedValue(undefined),
    replyToReviewComment: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe("PRComments", () => {
  it("shows 'No comments yet' when PR has no comments", () => {
    render(<PRComments pr={mockPR({ comments: [] })} />);
    expect(screen.getByText(/no comments yet/i)).toBeInTheDocument();
  });

  it("renders each comment body", () => {
    const pr = mockPR({
      comments: [
        mockComment({ id: "c1", body: "First comment here" }),
        mockComment({ id: "c2", body: "Second comment here" }),
      ],
    });
    render(<PRComments pr={pr} />);
    expect(screen.getByText("First comment here")).toBeInTheDocument();
    expect(screen.getByText("Second comment here")).toBeInTheDocument();
  });

  it("renders author and relative time for each comment", () => {
    const pr = mockPR({
      comments: [mockComment({ id: "c1", author: "alice", body: "Hello" })],
    });
    render(<PRComments pr={pr} />);
    expect(screen.getByText("@alice")).toBeInTheDocument();
  });

  it("shows Reply and View on GitHub buttons per comment", () => {
    const pr = mockPR({
      comments: [mockComment({ id: "c1", body: "Review me" })],
    });
    render(<PRComments pr={pr} />);
    expect(screen.getByRole("button", { name: /reply to comment/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open comment on github/i })).toBeInTheDocument();
  });

  it("expands reply textarea when Reply is clicked", () => {
    const pr = mockPR({ comments: [mockComment({ id: "c1", body: "Fix this" })] });
    render(<PRComments pr={pr} />);
    fireEvent.click(screen.getByRole("button", { name: /reply to comment/i }));
    expect(screen.getByRole("textbox", { name: /reply body/i })).toBeInTheDocument();
  });

  it("disables Send reply when textarea is empty", () => {
    const pr = mockPR({ comments: [mockComment({ id: "c1", body: "Fix this" })] });
    render(<PRComments pr={pr} />);
    fireEvent.click(screen.getByRole("button", { name: /reply to comment/i }));
    expect(screen.getByRole("button", { name: /send reply/i })).toBeDisabled();
  });

  it("enables Send reply when textarea has text", () => {
    const pr = mockPR({ comments: [mockComment({ id: "c1", body: "Fix this" })] });
    render(<PRComments pr={pr} />);
    fireEvent.click(screen.getByRole("button", { name: /reply to comment/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /reply body/i }), {
      target: { value: "Done!" },
    });
    expect(screen.getByRole("button", { name: /send reply/i })).not.toBeDisabled();
  });

  it("calls replyToReviewComment when comment URL contains #discussion_r", async () => {
    const { createClient } = await import("../../src/lib/github");
    const replyMock = vi.fn().mockResolvedValue(undefined);
    const addMock = vi.fn().mockResolvedValue(undefined);
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue({
      replyToReviewComment: replyMock,
      addPRComment: addMock,
    });

    const pr = mockPR({
      repo: "org/repo",
      number: 7,
      comments: [
        mockComment({
          id: "c1",
          body: "Fix this",
          url: "https://github.com/org/repo/pull/7#discussion_r9876543",
        }),
      ],
    });
    render(<PRComments pr={pr} />);
    fireEvent.click(screen.getByRole("button", { name: /reply to comment/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /reply body/i }), {
      target: { value: "Fixed!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reply/i }));
    await waitFor(() => {
      expect(replyMock).toHaveBeenCalledWith("org", "repo", 7, 9876543, "Fixed!");
      expect(addMock).not.toHaveBeenCalled();
    });
  });

  it("falls back to addPRComment for non-review (issue) comments", async () => {
    const { createClient } = await import("../../src/lib/github");
    const replyMock = vi.fn().mockResolvedValue(undefined);
    const addMock = vi.fn().mockResolvedValue(undefined);
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue({
      replyToReviewComment: replyMock,
      addPRComment: addMock,
    });

    const pr = mockPR({
      repo: "org/repo",
      number: 7,
      comments: [
        mockComment({
          id: "c1",
          body: "LGTM",
          url: "https://github.com/org/repo/pull/7#issuecomment-111222333",
        }),
      ],
    });
    render(<PRComments pr={pr} />);
    fireEvent.click(screen.getByRole("button", { name: /reply to comment/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /reply body/i }), {
      target: { value: "Thanks!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reply/i }));
    await waitFor(() => {
      expect(addMock).toHaveBeenCalledWith("org", "repo", 7, "Thanks!");
      expect(replyMock).not.toHaveBeenCalled();
    });
  });

  it("shows 'Reply sent' confirmation after successful submit", async () => {
    const pr = mockPR({
      repo: "org/repo",
      number: 7,
      comments: [mockComment({ id: "c1", body: "Fix this" })],
    });
    render(<PRComments pr={pr} />);
    fireEvent.click(screen.getByRole("button", { name: /reply to comment/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /reply body/i }), {
      target: { value: "Fixed!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reply/i }));
    await waitFor(() => {
      expect(screen.getByText(/reply sent/i)).toBeInTheDocument();
    });
  });

  it("hides resolved comments by default and shows toggle when some exist", () => {
    const pr = mockPR({
      comments: [
        mockComment({ id: "c1", body: "Active comment", isResolved: false }),
        mockComment({ id: "c2", body: "Resolved comment", isResolved: true }),
      ],
    });
    render(<PRComments pr={pr} />);
    expect(screen.getByText("Active comment")).toBeInTheDocument();
    expect(screen.queryByText("Resolved comment")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /show 1 resolved/i })).toBeInTheDocument();
  });

  it("shows resolved comments when toggle clicked", () => {
    const pr = mockPR({
      comments: [
        mockComment({ id: "c1", body: "Active", isResolved: false }),
        mockComment({ id: "c2", body: "Resolved one", isResolved: true }),
      ],
    });
    render(<PRComments pr={pr} />);
    fireEvent.click(screen.getByRole("button", { name: /show 1 resolved/i }));
    expect(screen.getByText("Resolved one")).toBeInTheDocument();
  });
});
