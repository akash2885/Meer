import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReviewActions } from "../../src/popup/components/ReviewActions";
import { mockPR } from "../mocks/github";

vi.mock("../../src/popup/hooks/useStore", () => ({
  useStore: vi.fn(() => ({
    settings: { token: "ghp_test", baseUrl: "https://api.github.com" },
    fetchPRs: vi.fn(),
  })),
}));

vi.mock("../../src/lib/github", () => ({
  createClient: vi.fn(() => ({
    submitReview: vi.fn().mockResolvedValue(undefined),
  })),
}));

const pr = mockPR({ relationship: "review_requested", repo: "org/repo", number: 42 });

describe("ReviewActions", () => {
  it("shows Approve, Comment, and Request changes buttons", () => {
    render(<ReviewActions pr={pr} isOpen={false} onOpen={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: /approve pr/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /leave a comment/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /request changes/i })).toBeInTheDocument();
  });

  it("expands comment textarea when Comment button clicked", () => {
    const onOpen = vi.fn();
    render(<ReviewActions pr={pr} isOpen={false} onOpen={onOpen} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /leave a comment/i }));
    expect(onOpen).toHaveBeenCalled();
  });

  it("shows textarea when isOpen=true after mode is set", () => {
    const { rerender } = render(
      <ReviewActions pr={pr} isOpen={false} onOpen={vi.fn()} onClose={vi.fn()} />
    );
    fireEvent.click(screen.getByRole("button", { name: /leave a comment/i }));
    rerender(<ReviewActions pr={pr} isOpen={true} onOpen={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole("textbox", { name: /comment body/i })).toBeInTheDocument();
  });

  it("submit button disabled when textarea is empty", () => {
    const { rerender } = render(
      <ReviewActions pr={pr} isOpen={false} onOpen={vi.fn()} onClose={vi.fn()} />
    );
    fireEvent.click(screen.getByRole("button", { name: /leave a comment/i }));
    rerender(<ReviewActions pr={pr} isOpen={true} onOpen={vi.fn()} onClose={vi.fn()} />);
    const submitBtn = screen.getByRole("button", { name: /submit comment/i });
    expect(submitBtn).toBeDisabled();
  });

  it("enables submit when textarea has text", () => {
    const { rerender } = render(
      <ReviewActions pr={pr} isOpen={false} onOpen={vi.fn()} onClose={vi.fn()} />
    );
    fireEvent.click(screen.getByRole("button", { name: /leave a comment/i }));
    rerender(<ReviewActions pr={pr} isOpen={true} onOpen={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox", { name: /comment body/i }), {
      target: { value: "LGTM!" },
    });
    expect(screen.getByRole("button", { name: /submit comment/i })).not.toBeDisabled();
  });

  it("calls submitReview with COMMENT event on submit", async () => {
    const { createClient } = await import("../../src/lib/github");
    const submitMock = vi.fn().mockResolvedValue(undefined);
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue({ submitReview: submitMock });

    const { rerender } = render(
      <ReviewActions pr={pr} isOpen={false} onOpen={vi.fn()} onClose={vi.fn()} />
    );
    fireEvent.click(screen.getByRole("button", { name: /leave a comment/i }));
    rerender(<ReviewActions pr={pr} isOpen={true} onOpen={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox", { name: /comment body/i }), {
      target: { value: "Looks good!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit comment/i }));
    await waitFor(() => {
      expect(submitMock).toHaveBeenCalledWith("org", "repo", 42, "COMMENT", "Looks good!");
    });
  });

  it("shows request-changes textarea with correct placeholder", () => {
    const { rerender } = render(
      <ReviewActions pr={pr} isOpen={false} onOpen={vi.fn()} onClose={vi.fn()} />
    );
    fireEvent.click(screen.getByRole("button", { name: /request changes/i }));
    rerender(<ReviewActions pr={pr} isOpen={true} onOpen={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole("textbox", { name: /request changes body/i })).toBeInTheDocument();
  });

  it("calls onClose when Cancel is clicked", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <ReviewActions pr={pr} isOpen={false} onOpen={vi.fn()} onClose={onClose} />
    );
    fireEvent.click(screen.getByRole("button", { name: /leave a comment/i }));
    rerender(<ReviewActions pr={pr} isOpen={true} onOpen={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
