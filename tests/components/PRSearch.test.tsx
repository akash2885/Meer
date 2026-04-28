import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PRSearch } from "../../src/popup/components/PRSearch";
import { mockPR } from "../mocks/github";

const prs = [
  mockPR({ id: "p1", title: "Fix auth token refresh", repo: "org/backend", author: { login: "dan", avatarUrl: "" } }),
  mockPR({ id: "p2", title: "Add dark mode toggle", repo: "org/frontend", author: { login: "sara", avatarUrl: "" } }),
  mockPR({ id: "p3", title: "Update CI pipeline", repo: "org/infra", author: { login: "dan", avatarUrl: "" } }),
];

describe("PRSearch", () => {
  it("renders the search input", () => {
    render(<PRSearch pullRequests={prs} onFilter={vi.fn()} />);
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("filters by title", () => {
    const onFilter = vi.fn();
    render(<PRSearch pullRequests={prs} onFilter={onFilter} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "auth" } });
    expect(onFilter).toHaveBeenCalledWith([prs[0]]);
  });

  it("filters by repo", () => {
    const onFilter = vi.fn();
    render(<PRSearch pullRequests={prs} onFilter={onFilter} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "infra" } });
    expect(onFilter).toHaveBeenCalledWith([prs[2]]);
  });

  it("filters by author login", () => {
    const onFilter = vi.fn();
    render(<PRSearch pullRequests={prs} onFilter={onFilter} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "dan" } });
    expect(onFilter).toHaveBeenCalledWith([prs[0], prs[2]]);
  });

  it("returns all PRs when query is cleared", () => {
    const onFilter = vi.fn();
    render(<PRSearch pullRequests={prs} onFilter={onFilter} />);
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "auth" } });
    fireEvent.change(input, { target: { value: "" } });
    expect(onFilter).toHaveBeenLastCalledWith(prs);
  });

  it("is case-insensitive", () => {
    const onFilter = vi.fn();
    render(<PRSearch pullRequests={prs} onFilter={onFilter} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "AUTH" } });
    expect(onFilter).toHaveBeenCalledWith([prs[0]]);
  });
});
