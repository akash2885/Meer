import React, { useMemo } from "react";
import type { PullRequest } from "../../lib/types";
import { STALE_THRESHOLD_DAYS } from "../../lib/constants";

interface StatsSummaryProps {
  pullRequests: PullRequest[];
}

function StatPill({
  value,
  label,
  colorClass,
}: {
  value: number;
  label: string;
  colorClass: string;
}) {
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${colorClass}`}>
      <span className="tabular-nums">{value}</span>
      <span className="text-slate-500">{label}</span>
    </span>
  );
}

export function StatsSummary({ pullRequests }: StatsSummaryProps) {
  const stats = useMemo(() => {
    const now = Date.now();
    const staleMs = STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

    const open = pullRequests.length;
    const needReview = pullRequests.filter(
      (p) => p.relationship === "review_requested" || p.relationship === "both"
    ).length;
    const failingCI = pullRequests.filter((p) =>
      p.checkRuns.some((c) => c.status === "COMPLETED" && c.conclusion === "FAILURE")
    ).length;
    const stale = pullRequests.filter(
      (p) => now - new Date(p.updatedAt).getTime() > staleMs
    ).length;

    return { open, needReview, failingCI, stale };
  }, [pullRequests]);

  return (
    <div className="flex items-center gap-4 px-3 py-2 border-b border-slate-700/60 bg-slate-800/40">
      <StatPill value={stats.open} label="open" colorClass="text-slate-300" />
      <StatPill
        value={stats.needReview}
        label="need review"
        colorClass={stats.needReview > 0 ? "text-amber-400" : "text-slate-500"}
      />
      <StatPill
        value={stats.failingCI}
        label="failing CI"
        colorClass={stats.failingCI > 0 ? "text-red-400" : "text-slate-500"}
      />
      <StatPill
        value={stats.stale}
        label="stale"
        colorClass={stats.stale > 0 ? "text-amber-400" : "text-slate-500"}
      />
    </div>
  );
}
