import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RepoFilter } from "../../src/popup/components/RepoFilter";
import { mockPR } from "../mocks/github";

const prs = [
  mockPR({ id: "1", repo: "org/alpha" }),
  mockPR({ id: "2", repo: "org/beta" }),
  mockPR({ id: "3", repo: "org/alpha" }),
];

describe("RepoFilter", () => {
  it("renders null when no PRs", () => {
    const { container } = render(<RepoFilter pullRequests={[]} selectedRepo={null} onSelect={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows 'All repositories' option with total count", () => {
    render(<RepoFilter pullRequests={prs} selectedRepo={null} onSelect={vi.fn()} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText(/All repositories \(3\)/)).toBeInTheDocument();
  });

  it("lists unique repos alphabetically with counts", () => {
    render(<RepoFilter pullRequests={prs} selectedRepo={null} onSelect={vi.fn()} />);
    const options = screen.getAllByRole("option");
    // All repos + alpha + beta = 3 options
    expect(options).toHaveLength(3);
    expect(options[1].textContent).toBe("org/alpha (2)");
    expect(options[2].textContent).toBe("org/beta (1)");
  });

  it("shows selected repo as current value", () => {
    render(<RepoFilter pullRequests={prs} selectedRepo="org/alpha" onSelect={vi.fn()} />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("org/alpha");
  });

  it("calls onSelect with repo name when option chosen", () => {
    const onSelect = vi.fn();
    render(<RepoFilter pullRequests={prs} selectedRepo={null} onSelect={onSelect} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "org/beta" } });
    expect(onSelect).toHaveBeenCalledWith("org/beta");
  });

  it("calls onSelect with null when 'All repositories' chosen", () => {
    const onSelect = vi.fn();
    render(<RepoFilter pullRequests={prs} selectedRepo="org/alpha" onSelect={onSelect} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "" } });
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("has accessible aria-label", () => {
    render(<RepoFilter pullRequests={prs} selectedRepo={null} onSelect={vi.fn()} />);
    expect(screen.getByRole("combobox", { name: /filter by repository/i })).toBeInTheDocument();
  });
});
