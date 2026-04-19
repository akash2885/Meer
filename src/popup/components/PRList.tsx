import React, { useState } from "react";
import type { PullRequest } from "../../lib/types";
import { PRCard } from "./PRCard";
import { EmptyState } from "./EmptyState";

interface PRListProps {
  pullRequests: PullRequest[];
}

export function PRList({ pullRequests }: PRListProps) {
  const [expandedReviewCardId, setExpandedReviewCardId] = useState<string | null>(null);

  if (pullRequests.length === 0) {
    return <EmptyState icon="🎉" title="No open pull requests" subtitle="You have no open PRs right now" />;
  }

  // Sorted by updatedAt descending (already sorted from the store)
  return (
    <div className="p-3 space-y-2">
      {pullRequests.map((pr) => (
        <PRCard
          key={pr.id}
          pr={pr}
          expandedReviewCardId={expandedReviewCardId}
          setExpandedReviewCardId={setExpandedReviewCardId}
        />
      ))}
    </div>
  );
}
