import React from "react";
import type { PullRequest } from "../../lib/types";
import { PRCard } from "./PRCard";
import { EmptyState } from "./EmptyState";

interface ActionItemsProps {
  pullRequests: PullRequest[];
}

// Pill showing a count with a severity colour
function SummaryPill({ label, count, colour }: { label: string; count: number; colour: string }) {
  if (count === 0) return null;
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colour}`}>
      {count} {label}
    </span>
  );
}

export function ActionItems({ pullRequests }: ActionItemsProps) {
  const actionItems = pullRequests.filter((pr) => pr.myActionRequired);

  if (actionItems.length === 0) {
    return (
      <EmptyState icon="✅" title="You're all caught up!" subtitle="No pull requests need your attention right now" />
    );
  }

  // Sort: critical first, then warning
  const sorted = [...actionItems].sort((a, b) => {
    const rank = (s: PullRequest["healthStatus"]) => (s === "critical" ? 0 : s === "warning" ? 1 : 2);
    return rank(a.healthStatus) - rank(b.healthStatus);
  });

  const criticalCount = actionItems.filter((pr) => pr.healthStatus === "critical").length;
  const warningCount  = actionItems.filter((pr) => pr.healthStatus === "warning").length;

  return (
    <div>
      {/* Summary bar — quick glance at severity breakdown */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-1">
        <span className="text-xs text-slate-500 mr-1">{actionItems.length} item{actionItems.length !== 1 ? "s" : ""}</span>
        <SummaryPill label="critical" count={criticalCount} colour="bg-red-900/60 text-red-300" />
        <SummaryPill label="warning"  count={warningCount}  colour="bg-amber-900/60 text-amber-300" />
      </div>

      <div className="p-3 space-y-2">
        {sorted.map((pr) => (
          <PRCard key={pr.id} pr={pr} showActionReason />
        ))}
      </div>
    </div>
  );
}
