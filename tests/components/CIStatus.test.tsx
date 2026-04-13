import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CIStatus } from "../../src/popup/components/CIStatus";
import { mockPR, mockCheckRun } from "../mocks/github";

vi.mock("../../src/popup/hooks/useStore", () => ({
  useStore: vi.fn(() => ({
    settings: { token: "ghp_test", baseUrl: "https://api.github.com" },
    fetchPRs: vi.fn(),
  })),
}));

vi.mock("../../src/lib/github", () => ({
  createClient: vi.fn(() => ({
    rerequestCheckSuite: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe("CIStatus", () => {
  it("shows 'No CI checks found' when no check runs", () => {
    render(<CIStatus pr={mockPR({ checkRuns: [] })} />);
    expect(screen.getByText(/No CI checks found/)).toBeInTheDocument();
  });

  it("shows all check run names", () => {
    const pr = mockPR({
      checkRuns: [
        mockCheckRun({ name: "Build" }),
        mockCheckRun({ name: "Lint" }),
        mockCheckRun({ name: "Test" }),
      ],
    });
    render(<CIStatus pr={pr} />);
    expect(screen.getByText("Build")).toBeInTheDocument();
    expect(screen.getByText("Lint")).toBeInTheDocument();
    expect(screen.getByText("Test")).toBeInTheDocument();
  });

  it("shows ✓ icon for passing checks", () => {
    const pr = mockPR({ checkRuns: [mockCheckRun({ conclusion: "SUCCESS" })] });
    const { container } = render(<CIStatus pr={pr} />);
    expect(container.textContent).toContain("✓");
  });

  it("shows ✗ icon for failing checks", () => {
    const pr = mockPR({ checkRuns: [mockCheckRun({ conclusion: "FAILURE" })] });
    const { container } = render(<CIStatus pr={pr} />);
    expect(container.textContent).toContain("✗");
  });

  it("shows ⟳ icon for running checks", () => {
    const pr = mockPR({ checkRuns: [mockCheckRun({ status: "IN_PROGRESS", conclusion: null })] });
    const { container } = render(<CIStatus pr={pr} />);
    expect(container.textContent).toContain("⟳");
  });

  it("shows re-run button only for failing checks", () => {
    const pr = mockPR({
      checkRuns: [
        mockCheckRun({ name: "Passing", conclusion: "SUCCESS" }),
        mockCheckRun({ name: "Failing", conclusion: "FAILURE", checkSuiteId: "suite-fail" }),
      ],
    });
    render(<CIStatus pr={pr} />);
    const rerunButtons = screen.getAllByTitle("Re-run this check");
    expect(rerunButtons).toHaveLength(1);
  });

  it("calls rerequestCheckSuite when re-run button clicked", async () => {
    const { createClient } = await import("../../src/lib/github");
    const rerequestMock = vi.fn().mockResolvedValue(undefined);
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue({
      rerequestCheckSuite: rerequestMock,
    });

    const pr = mockPR({
      repo: "myorg/myrepo",
      checkRuns: [mockCheckRun({ conclusion: "FAILURE", checkSuiteDatabaseId: 9999 })],
    });
    render(<CIStatus pr={pr} />);
    fireEvent.click(screen.getByTitle("Re-run this check"));
    // Wait for async re-run to be triggered
    await waitFor(() => {
      expect(createClient).toHaveBeenCalled();
    });
  });

  it("shows 'All X checks passing' summary when all pass", () => {
    const pr = mockPR({
      checkRuns: [
        mockCheckRun({ name: "A", conclusion: "SUCCESS" }),
        mockCheckRun({ name: "B", conclusion: "SUCCESS" }),
      ],
    });
    render(<CIStatus pr={pr} />);
    expect(screen.getByText(/All 2 checks passing/)).toBeInTheDocument();
  });

  it("shows 'X of Y checks failing' when some fail", () => {
    const pr = mockPR({
      checkRuns: [
        mockCheckRun({ name: "Pass", conclusion: "SUCCESS" }),
        mockCheckRun({ name: "Fail", conclusion: "FAILURE", checkSuiteId: "s2" }),
      ],
    });
    render(<CIStatus pr={pr} />);
    expect(screen.getByText(/1 of 2 checks failing/)).toBeInTheDocument();
  });
});
