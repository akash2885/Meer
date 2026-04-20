import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Header } from "../../src/popup/components/Header";

const NOW = new Date("2026-04-13T12:00:00Z").getTime();

beforeEach(() => {
  vi.setSystemTime(NOW);
});

describe("Header", () => {
  it("shows app name", () => {
    render(<Header lastFetched={null} isLoading={false} onRefresh={vi.fn()} />);
    expect(screen.getByText("PRDash")).toBeInTheDocument();
  });

  it("shows last updated time when lastFetched is set", () => {
    const lastFetched = NOW - 5 * 60 * 1000; // 5 min ago
    render(<Header lastFetched={lastFetched} isLoading={false} onRefresh={vi.fn()} />);
    expect(screen.getByText(/5m ago/)).toBeInTheDocument();
  });

  it("does not show timestamp when lastFetched is null", () => {
    render(<Header lastFetched={null} isLoading={false} onRefresh={vi.fn()} />);
    expect(screen.queryByText(/ago/)).not.toBeInTheDocument();
  });

  it("calls onRefresh when refresh button is clicked", () => {
    const onRefresh = vi.fn();
    render(<Header lastFetched={null} isLoading={false} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByLabelText("Refresh pull requests"));
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("disables refresh button when loading", () => {
    render(<Header lastFetched={null} isLoading={true} onRefresh={vi.fn()} />);
    expect(screen.getByLabelText("Refresh pull requests")).toBeDisabled();
  });

  it("opens settings page when settings button is clicked", () => {
    render(<Header lastFetched={null} isLoading={false} onRefresh={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Open settings"));
    expect(chrome.runtime.openOptionsPage).toHaveBeenCalled();
  });

  it("shows spinning icon when loading", () => {
    const { container } = render(<Header lastFetched={null} isLoading={true} onRefresh={vi.fn()} />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });
});
