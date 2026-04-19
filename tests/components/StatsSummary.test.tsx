import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatsSummary } from "../../src/popup/components/StatsSummary";
import { mockPR, mockCheckRun } from "../mocks/github";

describe("StatsSummary", () => {
  it("shows zero stats for empty list", () => {
    render(<StatsSummary pullRequests={[]} />);
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBe(4);
  });

  it("shows open PR count", () => {
    render(<StatsSummary pullRequests={[mockPR(), mockPR({ id: "PR_2" })]} />);
    const pills = screen.getAllByText(/^\d+$/);
    expect(pills[0].textContent).toBe("2");
  });

  it("counts PRs that need review", () => {
    render(
      <StatsSummary
        pullRequests={[
          mockPR({ relationship: "authored" }),
          mockPR({ id: "PR_2", relationship: "review_requested" }),
          mockPR({ id: "PR_3", relationship: "both" }),
        ]}
      />
    );
    // 2 need review (review_requested + both), 3 open
    const nums = screen.getAllByText(/^\d+$/).map((el) => Number(el.textContent));
    expect(nums[0]).toBe(3); // open
    expect(nums[1]).toBe(2); // need review
  });

  it("counts failing CI", () => {
    render(
      <StatsSummary
        pullRequests={[
          mockPR({ checkRuns: [mockCheckRun({ conclusion: "FAILURE" })] }),
          mockPR({ id: "PR_2", checkRuns: [mockCheckRun({ conclusion: "SUCCESS" })] }),
        ]}
      />
    );
    const nums = screen.getAllByText(/^\d+$/).map((el) => Number(el.textContent));
    expect(nums[2]).toBe(1); // failingCI
  });

  it("counts stale PRs (updated > 7 days ago)", () => {
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    render(
      <StatsSummary
        pullRequests={[
          mockPR({ updatedAt: oldDate }),
          mockPR({ id: "PR_2" }), // recent
        ]}
      />
    );
    const nums = screen.getAllByText(/^\d+$/).map((el) => Number(el.textContent));
    expect(nums[3]).toBe(1); // stale
  });

  it("does not color need-review pill when count is 0", () => {
    const { container } = render(<StatsSummary pullRequests={[mockPR({ relationship: "authored" })]} />);
    // The need-review pill should not have amber color class
    const pills = container.querySelectorAll(".text-amber-400");
    expect(pills.length).toBe(0);
  });

  it("colors failing CI pill red when count > 0", () => {
    const { container } = render(
      <StatsSummary pullRequests={[mockPR({ checkRuns: [mockCheckRun({ conclusion: "FAILURE" })] })]} />
    );
    expect(container.querySelector(".text-red-400")).toBeInTheDocument();
  });

  it("colors need-review pill amber when count > 0", () => {
    const { container } = render(<StatsSummary pullRequests={[mockPR({ relationship: "review_requested" })]} />);
    expect(container.querySelector(".text-amber-400")).toBeInTheDocument();
  });
});
