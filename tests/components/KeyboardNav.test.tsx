import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { KeyboardNav } from "../../src/popup/components/KeyboardNav";
import { mockPR } from "../mocks/github";

const prs = [
  mockPR({ id: "pr1", title: "First PR" }),
  mockPR({ id: "pr2", title: "Second PR" }),
  mockPR({ id: "pr3", title: "Third PR" }),
];

describe("KeyboardNav", () => {
  it("renders a checkbox for each PR", () => {
    render(<KeyboardNav pullRequests={prs} onSelect={vi.fn()} onBulkApprove={vi.fn()} />);
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(3);
  });

  it("shows bulk action bar when PRs are selected", () => {
    render(<KeyboardNav pullRequests={prs} onSelect={vi.fn()} onBulkApprove={vi.fn()} />);
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(screen.getByText(/selected/)).toBeInTheDocument();
    expect(screen.getByText("Approve all")).toBeInTheDocument();
  });

  it("navigates down with j key", () => {
    const { container } = render(
      <KeyboardNav pullRequests={prs} onSelect={vi.fn()} onBulkApprove={vi.fn()} />
    );
    fireEvent.keyDown(document, { key: "j" });
    const focused = container.querySelector(".border-blue-500");
    // TODO: this assertion is incomplete — index tracking not yet wired to DOM
    expect(focused).toBeInTheDocument();
  });

  it("calls onBulkApprove with selected PRs on Shift+A", () => {
    const onBulkApprove = vi.fn();
    render(<KeyboardNav pullRequests={prs} onSelect={vi.fn()} onBulkApprove={onBulkApprove} />);
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    fireEvent.click(screen.getAllByRole("checkbox")[1]);
    fireEvent.keyDown(document, { key: "A" });
    expect(onBulkApprove).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: "pr1" })])
    );
  });

  // This will fail — bulk approve does not de-dupe when the same PR is passed twice
  it("does not call onBulkApprove twice for the same PR", () => {
    const onBulkApprove = vi.fn();
    render(<KeyboardNav pullRequests={prs} onSelect={vi.fn()} onBulkApprove={onBulkApprove} />);
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    fireEvent.keyDown(document, { key: "A" });
    fireEvent.keyDown(document, { key: "A" });
    expect(onBulkApprove).toHaveBeenCalledTimes(1);
  });

  it("clears selection on Escape", () => {
    render(<KeyboardNav pullRequests={prs} onSelect={vi.fn()} onBulkApprove={vi.fn()} />);
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(screen.getByText(/selected/)).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  });
