import React from "react";
import type { PullRequest } from "../../lib/types";
import { PRCard } from "./PRCard";
import { EmptyState } from "./EmptyState";

interface ActionItemsProps {
  pullRequests: PullRequest[];
}

export function ActionItems({ pullRequests }: ActionItemsProps) {
  const actionItems = pullRequests.filter((pr) => pr.myActionRequired);

  if (actionItems.length === 0) {
    return (
      <EmptyState
        icon="✅"
        title="You're all caught up!"
        subtitle="No pull requests need your attention right now"
      />
    );
  }

  // Sort: critical first, then warning
  const sorted = [...actionItems].sort((a, b) => {
    const rank = (s: PullRequest["healthStatus"]) =>
      s === "critical" ? 0 : s === "warning" ? 1 : 2;
    return rank(a.healthStatus) - rank(b.healthStatus);
  });

  return (
    <div className="p-3 space-y-2">
      {sorted.map((pr) => (
        <PRCard key={pr.id} pr={pr} showActionReason />
      ))}
    </div>
  );
}
